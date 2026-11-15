"""
プレゼン練習アプリ - バックエンドサーバー
FastAPI + openai-whisper + OpenAI/Ollama API
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import json
import uuid
import platform
import subprocess
import sys
import ctypes
from pathlib import Path
from datetime import datetime
import httpx

app = FastAPI(title="PreDeck（プレデキ）")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ディレクトリ設定
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
RECORDING_DIR = BASE_DIR / "recordings"
SESSION_DIR = BASE_DIR / "sessions"
STATIC_DIR = BASE_DIR / "static"

for d in [UPLOAD_DIR, RECORDING_DIR, SESSION_DIR, STATIC_DIR]:
    d.mkdir(exist_ok=True)

# Whisper モデル（遅延ロード）
# openai-whisper（公式・既存）
_whisper_model = None
_whisper_available = None
# faster-whisper（CTranslate2、約4倍速。同じ精度）
_faster_whisper_models: dict[str, object] = {}
_faster_whisper_available = None


def get_whisper_model(model_size: str = "base"):
    global _whisper_model, _whisper_available

    if _whisper_available is None:
        try:
            import whisper  # noqa: F401
            _whisper_available = True
            print("[Whisper] import OK")
        except ImportError as e:
            _whisper_available = False
            print(f"[Whisper] import FAILED: {e}")

    if not _whisper_available:
        return None

    global _whisper_model
    if _whisper_model is None:
        import whisper
        print(f"[Whisper] Model '{model_size}' loading (first time takes a while)...")
        try:
            _whisper_model = whisper.load_model(model_size)
            print("[Whisper] Model loaded OK")
        except Exception as e:
            print(f"[Whisper] Model load FAILED: {type(e).__name__}: {e}")
            import traceback; traceback.print_exc()
            raise

    return _whisper_model


def _faster_whisper_importable() -> bool:
    global _faster_whisper_available
    if _faster_whisper_available is None:
        try:
            import faster_whisper  # noqa: F401
            _faster_whisper_available = True
            print("[faster-whisper] import OK")
        except ImportError as e:
            _faster_whisper_available = False
            print(f"[faster-whisper] import FAILED: {e}")
    return _faster_whisper_available


def get_faster_whisper_model(model_size: str = "base"):
    """faster-whisper モデルを遅延ロード。サイズ別にキャッシュ。"""
    if not _faster_whisper_importable():
        return None

    if model_size in _faster_whisper_models:
        return _faster_whisper_models[model_size]

    from faster_whisper import WhisperModel

    # デバイス/精度の自動選択
    device = "auto"
    compute_type = "int8"   # CPU でも GPU でも妥当な既定
    try:
        # CUDA があれば float16 に切り替えるとさらに速い
        import ctranslate2
        if ctranslate2.get_cuda_device_count() > 0:
            device = "cuda"
            compute_type = "float16"
    except Exception:
        pass

    print(f"[faster-whisper] Model '{model_size}' loading (device={device}, compute={compute_type})...")
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
        _faster_whisper_models[model_size] = model
        print("[faster-whisper] Model loaded OK")
        return model
    except Exception as e:
        print(f"[faster-whisper] Model load FAILED: {type(e).__name__}: {e}")
        # CPU + int8 へフォールバック
        try:
            model = WhisperModel(model_size, device="cpu", compute_type="int8")
            _faster_whisper_models[model_size] = model
            print("[faster-whisper] Model loaded OK (CPU fallback)")
            return model
        except Exception as e2:
            print(f"[faster-whisper] CPU fallback FAILED: {type(e2).__name__}: {e2}")
            return None


def _run_faster_whisper(model, audio_input, language: str, want_word_timestamps: bool,
                        initial_prompt: str | None = None) -> dict:
    """openai-whisper の transcribe() と同じ形式の dict を返すヘルパ。"""
    segments_iter, info = model.transcribe(
        audio_input,
        language=language if language and language != "auto" else None,
        word_timestamps=want_word_timestamps,
        initial_prompt=initial_prompt,
        condition_on_previous_text=False,
        vad_filter=False,
    )
    out_segments = []
    full_text_parts = []
    for i, seg in enumerate(segments_iter):
        txt = (seg.text or "").strip()
        full_text_parts.append(seg.text or "")
        out_segments.append({
            "id": i,
            "start": round(float(seg.start or 0.0), 2),
            "end": round(float(seg.end or 0.0), 2),
            "text": txt,
        })
    return {
        "text": "".join(full_text_parts).strip(),
        "segments": out_segments,
        "language": getattr(info, "language", language),
    }


@app.on_event("startup")
async def _preload_whisper_model():
    """サーバー起動時に Whisper モデルをバックグラウンドで先読みする。
    こうしておくと、ユーザーが録音を終えて文字起こしを開始する頃には
    モデルが既にメモリ展開済みのため、"初回の遅延" が発生しない。
    faster-whisper があれば優先してプリロードする。"""
    import asyncio, time

    def _load():
        # 1) faster-whisper を優先（あれば）
        try:
            if _faster_whisper_importable():
                t0 = time.time()
                m = get_faster_whisper_model("base")
                if m is not None:
                    print(f"[faster-whisper] preload 完了（{time.time() - t0:.1f}s）")
        except Exception as e:
            print(f"[faster-whisper] preload 失敗: {type(e).__name__}: {e}")
        # 2) openai-whisper（フォールバック用）
        try:
            t0 = time.time()
            m = get_whisper_model("base")
            if m is not None:
                print(f"[Whisper] preload 完了（{time.time() - t0:.1f}s）")
        except Exception as e:
            print(f"[Whisper] preload 失敗: {type(e).__name__}: {e}")

    # サーバー起動をブロックしないよう別スレッドで実行
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _load)


# ============================================================
# ルート
# ============================================================

@app.get("/")
async def root():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/local-ip")
async def get_local_ip():
    """ローカルIPアドレスを返す（QRコード生成用）"""
    import socket
    try:
        # ダミー接続でローカルIPを取得
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return {"ip": ip}
    except Exception:
        return {"ip": "127.0.0.1"}


@app.get("/api/status")
async def status():
    whisper_ok = False
    try:
        import whisper  # noqa: F401
        whisper_ok = True
    except ImportError:
        pass

    return {
        "whisper_available": whisper_ok,
        "version": "1.0.0",
    }


@app.get("/api/open-app-folder")
async def open_app_folder():
    """アプリフォルダをエクスプローラーで開く（Windows）"""
    import subprocess, sys
    folder = BASE_DIR  # main.py があるフォルダ
    try:
        if sys.platform == "win32":
            subprocess.Popen(["explorer", str(folder)])
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(folder)])
        else:
            subprocess.Popen(["xdg-open", str(folder)])
        return {"ok": True, "path": str(folder)}
    except Exception as e:
        raise HTTPException(500, f"フォルダを開けませんでした: {e}")


@app.post("/api/open-pptx")
async def open_pptx(request: Request):
    """元のPPTXファイルをPowerPointで開く"""
    import subprocess, sys
    body = await request.json()
    filename = body.get("filename", "")

    if not filename:
        raise HTTPException(400, "ファイル名が指定されていません")

    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(404, f"ファイルが見つかりません: {filename}")

    # 拡張子チェック
    if filepath.suffix.lower() not in [".pptx", ".ppt"]:
        raise HTTPException(400, "PPTXファイルではありません")

    try:
        if sys.platform == "win32":
            import os
            os.startfile(str(filepath.resolve()))
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(filepath)])
        else:
            subprocess.Popen(["xdg-open", str(filepath)])
        return {"ok": True, "path": str(filepath)}
    except Exception as e:
        raise HTTPException(500, f"ファイルを開けませんでした: {e}")


@app.get("/api/ollama-version")
async def ollama_version():
    """Ollamaの現在バージョン＆GitHubの最新バージョンを取得"""
    current = None
    latest = None
    update_available = False

    # 現在のバージョン
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get("http://localhost:11434/api/version")
            if r.status_code == 200:
                current = r.json().get("version", "不明")
    except Exception:
        pass

    # GitHub最新バージョン
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://api.github.com/repos/ollama/ollama/releases/latest",
                headers={"Accept": "application/vnd.github+json"},
            )
            if r.status_code == 200:
                tag = r.json().get("tag_name", "")
                latest = tag.lstrip("v")
    except Exception:
        pass

    if current and latest:
        update_available = current != latest

    return {
        "current": current,
        "latest": latest,
        "update_available": update_available,
        "download_url": "https://ollama.com/download",
    }


@app.get("/api/setup-check")
async def setup_check():
    """セットアップ全項目チェック"""
    import shutil

    # ffmpeg
    ffmpeg_ok = shutil.which("ffmpeg") is not None

    # openai-whisper（サーバー自身のPythonで確認）
    whisper_ok = False
    try:
        import sys, subprocess as _sp
        # 方法1: find_spec（高速・同一プロセス内）
        import importlib.util
        if importlib.util.find_spec("whisper") is not None:
            whisper_ok = True
        else:
            # 方法2: 同じPython実行ファイルで pip show（venv切替後などに対応）
            result = _sp.run(
                [sys.executable, "-m", "pip", "show", "openai-whisper"],
                capture_output=True, text=True, timeout=10
            )
            whisper_ok = result.returncode == 0
    except Exception:
        pass

    # faster-whisper
    faster_whisper_ok = False
    try:
        import importlib.util
        faster_whisper_ok = importlib.util.find_spec("faster_whisper") is not None
    except Exception:
        pass

    # Ollama 起動確認
    ollama_running = False
    ollama_models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get("http://localhost:11434/api/tags")
            if r.status_code == 200:
                ollama_running = True
                data = r.json()
                ollama_models = [m["name"] for m in data.get("models", [])]
    except Exception:
        pass

    return {
        "ffmpeg": ffmpeg_ok,
        "whisper": whisper_ok,
        "faster_whisper": faster_whisper_ok,
        "ollama_running": ollama_running,
        "ollama_models": ollama_models,
    }


@app.get("/api/whisper-model-check")
async def whisper_model_check(model: str = "base", engine: str = "openai"):
    """選択中の Whisper モデル重みがキャッシュにあるか（ダウンロードはしない）。
    engine='openai' なら ~/.cache/whisper/*.pt を、'faster' なら
    HuggingFace Hub のキャッシュを確認する。"""
    allowed = ("tiny", "base", "small", "medium")
    m = (model or "base").strip().lower()
    if m not in allowed:
        raise HTTPException(400, f"対応モデル: {', '.join(allowed)}")

    eng = (engine or "openai").lower()
    if eng == "faster":
        return _faster_whisper_model_check(m)

    # 既存：openai-whisper
    whisper_ok = False
    try:
        import importlib.util
        whisper_ok = importlib.util.find_spec("whisper") is not None
    except Exception:
        pass

    if not whisper_ok:
        return {
            "whisper_installed": False,
            "model_ready": False,
            "model": m,
            "engine": "openai",
            "detail": "openai-whisper が未インストールです",
        }

    cache_parent = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache"))
    cache_root = Path(os.environ.get("WHISPER_CACHE_DIR", cache_parent / "whisper"))
    weights = cache_root / f"{m}.pt"
    try:
        ready = weights.is_file() and weights.stat().st_size > 0
    except OSError:
        ready = False

    return {
        "whisper_installed": True,
        "model_ready": ready,
        "model": m,
        "engine": "openai",
        "detail": None
        if ready
        else f"モデルファイルがまだありません（初回ローカル文字起こし時に自動ダウンロード）: {weights.name}",
    }


def _faster_whisper_model_check(m: str) -> dict:
    """faster-whisper（CTranslate2変換済み）モデルが HuggingFace Hub キャッシュにあるかを確認。"""
    if not _faster_whisper_importable():
        return {
            "whisper_installed": False,
            "model_ready": False,
            "model": m,
            "engine": "faster",
            "detail": "faster-whisper が未インストールです",
        }

    # HuggingFace Hub のキャッシュ（既定 ~/.cache/huggingface/hub）
    hf_cache = Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface")) / "hub"
    candidates = [
        hf_cache / f"models--Systran--faster-whisper-{m}",
        hf_cache / f"models--guillaumekln--faster-whisper-{m}",
    ]
    ready = False
    for repo_dir in candidates:
        try:
            snap = repo_dir / "snapshots"
            if snap.is_dir():
                for d in snap.iterdir():
                    if d.is_dir() and any(p.name == "model.bin" for p in d.iterdir()):
                        ready = True
                        break
            if ready:
                break
        except OSError:
            pass

    return {
        "whisper_installed": True,
        "model_ready": ready,
        "model": m,
        "engine": "faster",
        "detail": None
        if ready
        else "モデルファイルがまだありません（初回ローカル文字起こし時に自動ダウンロード）",
    }


def _get_total_ram_gb() -> float:
    """物理メモリ総量（GB）。Windows / macOS / Linux を stdlib のみで試行。"""
    try:
        if sys.platform == "win32":

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):  # type: ignore[attr-defined]
                return 0.0
            return round(stat.ullTotalPhys / (1024**3), 2)

        if sys.platform == "darwin":
            out = subprocess.run(
                ["sysctl", "-n", "hw.memsize"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if out.returncode == 0 and out.stdout.strip().isdigit():
                return round(int(out.stdout.strip()) / (1024**3), 2)

        if sys.platform.startswith("linux"):
            with open("/proc/meminfo", encoding="utf-8") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        kb = int(line.split()[1])
                        return round(kb / (1024**2), 2)
    except Exception:
        pass
    return 0.0


def _list_nvidia_gpus() -> list[dict]:
    """nvidia-smi が使える場合のみ GPU 名と VRAM(MB) を返す。"""
    try:
        kw: dict = {"capture_output": True, "text": True, "timeout": 5}
        if sys.platform == "win32" and hasattr(subprocess, "CREATE_NO_WINDOW"):
            kw["creationflags"] = subprocess.CREATE_NO_WINDOW  # type: ignore[assignment]
        r = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total",
                "--format=csv,noheader,nounits",
            ],
            **kw,
        )
        if r.returncode != 0 or not (r.stdout or "").strip():
            return []
        gpus = []
        for line in r.stdout.strip().splitlines():
            line = line.strip()
            if not line or "," not in line:
                continue
            name, mem_s = [x.strip() for x in line.split(",", 1)]
            try:
                mem_mb = int(float(mem_s))
            except ValueError:
                continue
            gpus.append({"name": name, "memory_mb": mem_mb})
        return gpus
    except Exception:
        return []


def _pc_level_from_spec(ram_gb: float, vram_max_gb: float) -> int:
    """内部レベル 0〜4。docs/research/ローカルLLM‗調査資料‗20260507.md §3.3 に準拠。"""
    if ram_gb < 8:
        return 0
    level = 1
    if ram_gb >= 16 or vram_max_gb >= 8:
        level = 2
    if ram_gb >= 32 or vram_max_gb >= 16:
        level = 3
    if ram_gb >= 64 or vram_max_gb >= 24:
        level = 4
    return level


def _pc_class_labels(level: int) -> tuple[str, str]:
    mapping = {
        0: ("S0", "クラウド/API推奨（ローカルLLM非推奨）"),
        1: ("S1", "軽量モード向け（8〜16GB級・VRAM小）"),
        2: ("S2", "標準ノート向け（16GB+ または VRAM 8GB+）"),
        3: ("S3", "高品質向け（32GB+ または VRAM 16GB+）"),
        4: ("S4", "上級・ワークステーション向け（64GB+ または VRAM 24GB+）"),
    }
    return mapping.get(level, ("?", "不明"))


def _build_llm_recommendation(level: int) -> dict:
    """Ollama レジストリ名はセットアップガイド（qwen3 系）と整合。"""
    doc_ref = "docs/research/ローカルLLM‗調査資料‗20260507.md §3.2〜3.3"
    if level <= 0:
        return {
            "mode_label": "API推奨",
            "summary": (
                "RAM が 8GB 未満のため、ドキュメント上ローカルLLMは非推奨（S0）です。"
                "文字起こしと併用すると不安定になりやすいため、OpenAI API の利用を検討してください。"
            ),
            "primary_ollama_model": None,
            "pull_command": None,
            "alternatives": [],
            "doc_ref": doc_ref,
        }
    if level == 1:
        return {
            "mode_label": "軽量モード",
            "summary": "S1: メモリに余裕が少ない環境向け。qwen3:4b など軽量モデルから始めてください。",
            "primary_ollama_model": "qwen3:4b",
            "pull_command": "ollama pull qwen3:4b",
            "alternatives": [
                {"model": "qwen3:4b", "note": "ガイド掲載・日本語バランス重視の軽量候補"},
            ],
            "doc_ref": doc_ref,
        }
    if level == 2:
        return {
            "mode_label": "標準モード",
            "summary": "S2: 一般的なノートPCでの推奨帯。qwen3:8b がバランス良いです。",
            "primary_ollama_model": "qwen3:8b",
            "pull_command": "ollama pull qwen3:8b",
            "alternatives": [
                {"model": "qwen3:4b", "note": "動作が重い場合の軽量化"},
            ],
            "doc_ref": doc_ref,
        }
    if level == 3:
        return {
            "mode_label": "高品質モード",
            "summary": "S3: 余裕ある環境向け。より大きなモデルで診断品質を上げられます。",
            "primary_ollama_model": "qwen3:30b",
            "pull_command": "ollama pull qwen3:30b",
            "alternatives": [
                {"model": "qwen3:8b", "note": "速さ優先・省メモリ"},
                {"model": "qwen3:30b", "note": "ガイド掲載の大型候補"},
            ],
            "doc_ref": doc_ref,
        }
    return {
        "mode_label": "上級モード",
        "summary": "S4: 大容量メモリ/VRAM 向け。qwen3:30b を前提に、必要に応じてより大型モデルを検討できます。",
        "primary_ollama_model": "qwen3:30b",
        "pull_command": "ollama pull qwen3:30b",
        "alternatives": [
            {"model": "qwen3:30b", "note": "ローカルでの高品質寄り"},
            {"model": "qwen3:8b", "note": "レイテンシ優先時"},
        ],
        "doc_ref": doc_ref,
    }


def collect_system_spec_bundle() -> dict:
    ram_gb = _get_total_ram_gb()
    gpus = _list_nvidia_gpus()
    vram_max_gb = round(max((g["memory_mb"] for g in gpus), default=0) / 1024.0, 2)
    level = _pc_level_from_spec(ram_gb, vram_max_gb)
    pc_id, pc_label = _pc_class_labels(level)
    rec = _build_llm_recommendation(level)

    uname = platform.uname()
    if vram_max_gb > 0 and gpus:
        gpu_summary = ", ".join(f'{g["name"]} ({g["memory_mb"]}MiB)' for g in gpus)
    elif gpus:
        gpu_summary = ", ".join(g["name"] for g in gpus)
    else:
        gpu_summary = ""

    return {
        "os": f"{platform.system()} {platform.release()}",
        "machine": uname.machine,
        "processor": (platform.processor() or uname.processor or "").strip() or None,
        "cpu_logical": os.cpu_count(),
        "ram_total_gb": ram_gb,
        "gpus": gpus,
        "vram_max_gb": vram_max_gb,
        "gpu_summary": gpu_summary or None,
        "pc_level": level,
        "pc_class": pc_id,
        "pc_class_label": pc_label,
        "recommendation": rec,
    }


@app.get("/api/system-spec")
async def api_system_spec():
    """PCスペック（RAM・NVIDIA GPU）と、ドキュメント基準のローカルLLM提案。"""
    return collect_system_spec_bundle()


@app.get("/api/ollama-models")
async def ollama_models():
    """Ollama インストール済みモデル一覧"""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get("http://localhost:11434/api/tags")
            if r.status_code == 200:
                data = r.json()
                models = [
                    {
                        "name": m["name"],
                        "size_gb": round(m.get("size", 0) / 1e9, 1),
                    }
                    for m in data.get("models", [])
                ]
                return {"running": True, "models": models}
    except Exception:
        pass
    return {"running": False, "models": []}


@app.post("/api/test-ai")
async def test_ai(request: Request):
    """AI 接続テスト（短文送信）"""
    body = await request.json()
    use_ollama = body.get("use_ollama", False)
    ollama_model = body.get("ollama_model", "llama3.2")
    api_key = body.get("api_key", "")
    model = body.get("model", "gpt-4o-mini")

    test_prompt = "「プレゼン練習」と一言だけ返答してください。それ以外は不要です。"

    try:
        if use_ollama:
            result = await _call_ollama(test_prompt, ollama_model)
        elif api_key:
            result = await _call_openai(test_prompt, api_key, model)
        else:
            raise HTTPException(400, "APIキーまたはOllama設定が必要です")
        return {"ok": True, "response": result[:80]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ============================================================
# スライド管理
# ============================================================

@app.post("/api/upload-slides")
async def upload_slides(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    allowed = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".pptx", ".ppt"]
    if ext not in allowed:
        raise HTTPException(400, f"サポートされていないファイル形式: {ext}（対応: PDF, PNG, JPG, PPTX）")

    filename = f"{uuid.uuid4()}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # PPTX / PPT → PDF 変換してから返す
    if ext in [".pptx", ".ppt"]:
        pdf_filename = await _convert_pptx_to_pdf(filepath)
        if pdf_filename:
            return {
                "filename": pdf_filename,
                "original_name": file.filename,
                "type": "pdf",
                "converted_from": "pptx",
                "pptx_source": filename,   # 元のPPTXファイル名（並列起動用）
            }
        else:
            # 変換失敗でも元のPPTXは保存済み → 並列起動だけ案内
            return {
                "filename": filename,
                "original_name": file.filename,
                "type": "pptx_only",       # PDF変換できなかったが元ファイルは有効
                "converted_from": "pptx",
                "pptx_source": filename,
                "convert_failed": True,
            }

    file_type = "pdf" if ext == ".pdf" else "image"
    return {
        "filename": filename,
        "original_name": file.filename,
        "type": file_type,
    }


async def _convert_pptx_to_pdf(pptx_path: Path) -> str | None:
    """PPTX/PPT を PDF に変換して PDF ファイル名を返す"""
    import asyncio, shutil, traceback

    pdf_filename = pptx_path.stem + "_converted.pdf"
    pdf_path = UPLOAD_DIR / pdf_filename

    # 方法1: Windows COM (PowerPoint) を使用
    try:
        import comtypes.client  # noqa
        def _com_convert():
            # ワーカースレッドでCOMを使うには CoInitialize が必要
            import comtypes
            comtypes.CoInitialize()
            try:
                import comtypes.client
                powerpoint = comtypes.client.CreateObject("Powerpoint.Application")
                # PowerPoint は不可視ウィンドウを許可しないため Visible=1 必須
                powerpoint.Visible = 1
                deck = powerpoint.Presentations.Open(str(pptx_path.resolve()))
                deck.SaveAs(str(pdf_path.resolve()), 32)  # 32 = ppSaveAsPDF
                deck.Close()
                powerpoint.Quit()
            finally:
                comtypes.CoUninitialize()
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _com_convert)
        if pdf_path.exists():
            print(f"[PPTX] COM変換成功: {pdf_filename}")
            return pdf_filename
        print("[PPTX] COM変換: PDFが生成されませんでした")
    except ImportError as e:
        print(f"[PPTX] COM変換スキップ（comtypes未インストール）: {e}")
    except Exception as e:
        print(f"[PPTX] COM変換失敗: {type(e).__name__}: {e}")
        traceback.print_exc()

    # 方法2: LibreOffice headless
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if soffice:
        try:
            proc = await asyncio.create_subprocess_exec(
                soffice, "--headless", "--convert-to", "pdf",
                "--outdir", str(UPLOAD_DIR),
                str(pptx_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=60)
            # LibreOffice は元ファイル名.pdf で出力
            lo_pdf = UPLOAD_DIR / (pptx_path.stem + ".pdf")
            if lo_pdf.exists():
                lo_pdf.rename(pdf_path)
                print(f"[PPTX] LibreOffice変換成功: {pdf_filename}")
                return pdf_filename
        except Exception as e:
            print(f"[PPTX] LibreOffice変換失敗: {type(e).__name__}: {e}")

    print("[PPTX] すべての変換方法が失敗しました")
    return None


@app.post("/api/convert-pdf")
async def convert_pdf(request: Request):
    """PDFを各ページ画像に変換して返す"""
    body = await request.json()
    filename = body.get("filename", "")
    filepath = UPLOAD_DIR / filename

    if not filepath.exists():
        raise HTTPException(404, "ファイルが見つかりません")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(503, "PyMuPDFがインストールされていません。pip install PyMuPDF を実行してください。")

    doc = fitz.open(str(filepath))
    image_files = []
    base_name = Path(filename).stem

    for page_num in range(len(doc)):
        page = doc[page_num]
        mat = fitz.Matrix(2.0, 2.0)  # 2倍解像度
        pix = page.get_pixmap(matrix=mat)
        img_filename = f"{base_name}_p{page_num + 1}.png"
        img_path = UPLOAD_DIR / img_filename
        pix.save(str(img_path))
        image_files.append(img_filename)

    doc.close()
    return {"pages": image_files, "total": len(image_files)}


@app.get("/api/slides/{filename}")
async def get_slide(filename: str):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(404, "ファイルが見つかりません")
    return FileResponse(filepath)


# ============================================================
# 音声文字起こし
# ============================================================

def _load_wav_as_numpy(path: Path):
    """WAVファイルをnumpy配列として読み込む（ffmpeg不要）"""
    import wave
    import numpy as np
    with wave.open(str(path), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
    if sampwidth == 2:
        audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 4:
        audio = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise ValueError(f"非対応のサンプル幅: {sampwidth}")
    if n_channels > 1:
        audio = audio.reshape(-1, n_channels).mean(axis=1)
    if framerate != 16000:
        target_len = int(len(audio) * 16000 / framerate)
        audio = np.interp(
            np.linspace(0, len(audio) - 1, target_len),
            np.arange(len(audio)),
            audio,
        )
    return audio.astype(np.float32)


@app.post("/api/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("ja"),
    api_key: str = Form(""),
    use_api: str = Form("false"),
    model_size: str = Form("base"),
    engine: str = Form("faster"),   # 'faster' | 'openai'（ローカル時のみ意味あり）
):
    # 音声ファイルを保存
    ext = Path(audio.filename or "recording").suffix or ".wav"
    audio_filename = f"{uuid.uuid4()}{ext}"
    audio_path = RECORDING_DIR / audio_filename

    content = await audio.read()
    with open(audio_path, "wb") as f:
        f.write(content)
    print(f"[Transcribe] received {audio_filename} ({len(content)} bytes) use_api={use_api} engine={engine} model_size={model_size} language={language}")

    try:
        if use_api.lower() == "true" and api_key:
            result = await _transcribe_with_openai_api(audio_path, api_key, language)
        else:
            # WAVはffmpeg不要で直接読み込む。失敗時はファイルパスで試行（ffmpegが必要）
            try:
                audio_input = _load_wav_as_numpy(audio_path)
                print(f"[Transcribe] WAV直接読み込み成功")
            except Exception as e:
                audio_input = str(audio_path)
                print(f"[Transcribe] WAV読み込み不可→ファイルパス渡し（ffmpeg経由）: {e}")

            chosen_engine = (engine or "faster").lower()
            # faster-whisper 希望でも未導入なら openai-whisper にフォールバック
            if chosen_engine == "faster" and not _faster_whisper_importable():
                chosen_engine = "openai"

            if chosen_engine == "faster":
                model = get_faster_whisper_model(model_size)
                if model is None:
                    raise HTTPException(
                        503,
                        "faster-whisper の初期化に失敗しました。\n"
                        "① pip install faster-whisper を実行する\n"
                        "② または設定でエンジンを openai-whisper に切り替える",
                    )
                print(f"[Transcribe] faster-whisper.transcribe 開始")
                result = _run_faster_whisper(model, audio_input, language, want_word_timestamps=True)
                print(f"[Transcribe] faster-whisper.transcribe 完了 ({len(result.get('segments', []))} segments)")
            else:
                model = get_whisper_model(model_size)
                if model is None:
                    raise HTTPException(
                        503,
                        "ローカルWhisperが利用できません。\n"
                        "① pip install openai-whisper を実行する\n"
                        "② または設定でOpenAI Whisper APIを選択してAPIキーを入力する",
                    )
                print(f"[Transcribe] whisper.transcribe 開始")
                raw = model.transcribe(
                    audio_input,
                    language=language if language != "auto" else None,
                    word_timestamps=True,
                    verbose=False,
                )
                print(f"[Transcribe] whisper.transcribe 完了 ({len(raw.get('segments', []))} segments)")
                result = {
                    "text": raw["text"].strip(),
                    "segments": [
                        {
                            "id": seg["id"],
                            "start": round(seg["start"], 2),
                            "end": round(seg["end"], 2),
                            "text": seg["text"].strip(),
                        }
                        for seg in raw.get("segments", [])
                    ],
                    "language": raw.get("language", language),
                }

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"文字起こしエラー: {str(e)}")


async def _transcribe_with_openai_api(audio_path: Path, api_key: str, language: str) -> dict:
    async with httpx.AsyncClient(timeout=120) as client:
        with open(audio_path, "rb") as f:
            resp = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": (audio_path.name, f, "audio/wav")},
                data={
                    "model": "whisper-1",
                    "language": language if language != "auto" else "",
                    "response_format": "verbose_json",
                    "timestamp_granularities[]": "segment",
                },
            )

    if resp.status_code != 200:
        raise Exception(f"OpenAI Whisper API エラー: {resp.text}")

    data = resp.json()
    return {
        "text": data.get("text", "").strip(),
        "segments": [
            {
                "id": i,
                "start": round(seg.get("start", 0), 2),
                "end": round(seg.get("end", 0), 2),
                "text": seg.get("text", "").strip(),
            }
            for i, seg in enumerate(data.get("segments", []))
        ],
        "language": language,
    }


# ============================================================
# リアルタイム（チャンク）文字起こし
# ============================================================

# 直前のチャンク文字起こし結果（ハルシネーション抑制用に短い文脈として渡す）
_chunk_prompt_cache: dict[str, str] = {}


@app.post("/api/transcribe-chunk")
async def transcribe_chunk(
    audio: UploadFile = File(...),
    language: str = Form("ja"),
    session_id: str = Form(""),
    engine: str = Form("faster"),   # 'faster' | 'openai'
    model_size: str = Form("base"),
):
    """録音中の短い音声チャンク（数秒）を受け取り、テキストを返す。

    - 完全ローカル処理（OpenAI APIへは送らない）
    - 速度優先：word_timestamps=False、verbose=False
    - Strict Local Mode を破らないため、常にローカル Whisper を使用する
    """
    chosen_engine = (engine or "faster").lower()
    if chosen_engine == "faster" and not _faster_whisper_importable():
        chosen_engine = "openai"

    if chosen_engine == "faster":
        model = get_faster_whisper_model(model_size or "base")
    else:
        model = get_whisper_model(model_size or "base")

    if model is None:
        # 静かに失敗（リアルタイム文字起こしは任意機能）
        raise HTTPException(503, "ローカルWhisperが未利用可。リアルタイム文字起こしは無効です。")

    ext = Path(audio.filename or "chunk").suffix or ".webm"
    chunk_path = RECORDING_DIR / f"chunk_{uuid.uuid4()}{ext}"
    content = await audio.read()
    if len(content) < 256:
        # 中身が薄すぎる（ほぼ無音）
        return {"text": ""}
    with open(chunk_path, "wb") as f:
        f.write(content)

    try:
        # WAVなら直接、それ以外（webm等）は ffmpeg 経由
        try:
            audio_input = _load_wav_as_numpy(chunk_path)
        except Exception:
            audio_input = str(chunk_path)

        # 直前のチャンクを文脈ヒントとして与える（ハルシネーションを抑える）
        prev = _chunk_prompt_cache.get(session_id or "_", "") if session_id else ""
        prompt = prev[-200:] if prev else None

        if chosen_engine == "faster":
            result = _run_faster_whisper(model, audio_input, language, want_word_timestamps=False, initial_prompt=prompt)
            text = result.get("text", "").strip()
        else:
            raw = model.transcribe(
                audio_input,
                language=language if language != "auto" else None,
                word_timestamps=False,
                verbose=False,
                initial_prompt=prompt,
                condition_on_previous_text=False,
            )
            text = (raw.get("text") or "").strip()

        # 文脈キャッシュを更新（セッション別）
        if session_id:
            _chunk_prompt_cache[session_id or "_"] = (prev + " " + text).strip()

        return {"text": text}
    except Exception as e:
        # チャンク失敗はクライアント側で握りつぶせるよう200で空文字を返す
        print(f"[TranscribeChunk] エラー: {type(e).__name__}: {e}")
        return {"text": ""}
    finally:
        try:
            chunk_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.post("/api/transcribe-chunk/reset")
async def transcribe_chunk_reset(session_id: str = Form("")):
    """新しい録音開始時に文脈キャッシュをクリア。"""
    if session_id:
        _chunk_prompt_cache.pop(session_id, None)
    else:
        _chunk_prompt_cache.clear()
    return {"ok": True}


# ============================================================
# AI スクリプト改善
# ============================================================

@app.post("/api/improve-script")
async def improve_script(request: Request):
    body = await request.json()

    transcript = body.get("transcript", "").strip()
    slide_timings = body.get("slide_timings", [])
    total_slides = int(body.get("total_slides", 0))
    api_key = body.get("api_key", "")
    model = body.get("model", "gpt-4o-mini")
    use_ollama = body.get("use_ollama", False)
    ollama_model = body.get("ollama_model", "llama3")
    iteration = body.get("iteration", 1)
    previous_script = body.get("previous_script", "")
    target_type = body.get("target_type", "general")
    target_duration = int(body.get("target_duration", 0))
    # managed = 運営提供モード（GPT-4o + 強化プロンプト）
    managed_key = os.getenv("MANAGED_OPENAI_KEY", "")
    use_managed = body.get("use_managed", False) and bool(managed_key)

    if not transcript:
        raise HTTPException(400, "文字起こしテキストが必要です")

    # managed モードは GPT-4o + 構造診断付き強化プロンプト
    if use_managed:
        prompt = _build_managed_prompt(transcript, slide_timings, iteration, previous_script, target_type, target_duration, total_slides)
        effective_key = managed_key
        effective_model = "gpt-4o"
    else:
        prompt = _build_prompt(transcript, slide_timings, iteration, previous_script, target_type, target_duration, total_slides)
        effective_key = api_key
        effective_model = model

    print(f"[ImproveScript] use_ollama={use_ollama} ollama_model={ollama_model} use_managed={use_managed} api_key_set={bool(effective_key)} transcript_len={len(transcript)}")
    try:
        if use_managed or (not use_ollama and effective_key):
            result = await _call_openai(prompt, effective_key, effective_model)
        elif use_ollama:
            result = await _call_ollama(prompt, ollama_model)
        else:
            raise HTTPException(
                400,
                "設定でOpenAI APIキーを入力するか、Ollamaを選択してください。",
            )

        return {"improved_script": result}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ImproveScript] エラー: {type(e).__name__}: {e}", file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(500, f"スクリプト改善エラー: {str(e)}")


def _build_managed_prompt(
    transcript: str,
    slide_timings: list,
    iteration: int,
    previous_script: str,
    target_type: str = "vc",
    target_duration: int = 0,
    total_slides: int = 0,
) -> str:
    """
    GPT-4o Managed モード専用プロンプト。
    「構造診断 → 弱点指摘 → 改善原稿 → 成長コメント」を一括出力。
    ユーザーが数回で「全然違う」と実感できる設計。
    """
    target_instructions = {
        "vc":       "VCや投資家。数字・市場規模・競合優位性・成長ストーリーが命。5分以内に「信じさせる」こと。",
        "ringi":    "社内役員・稟議審査官。ROI・リスク対策・意思決定の根拠が明確でないと通らない。",
        "academic": "学会審査員・研究者。方法論・先行研究との差異・再現性が問われる。",
        "interview":"採用面接官。具体的エピソード・成果数値・入社後の貢献イメージを伝える。",
        "general":  "一般聴衆。わかりやすさ・ストーリー性・記憶に残るメッセージを重視。",
    }
    target_note = target_instructions.get(target_type, target_instructions["general"])

    duration_note = ""
    if target_duration > 0:
        mins = target_duration // 60
        secs = target_duration % 60
        label = f"{mins}分{secs}秒" if secs else f"{mins}分"
        duration_note = f"\n目標時間: {label}（この時間に収まるよう分量を調整すること）"

    timing_info = ""
    if slide_timings:
        timing_info = "\n\n【スライド別発表時間】\n" + "".join(
            f"スライド{t['slide']}: {t.get('duration',0):.0f}秒\n" for t in slide_timings
        )

    is_first = iteration == 1 or not previous_script
    iteration_context = ""
    if not is_first:
        iteration_context = f"""
【前回の改善原稿（参考）】
{previous_script}

前回から今回の変化を分析し、成長した点を必ず冒頭で褒めること。"""

    return f"""あなたは世界トップクラスのプレゼンテーション戦略コーチです。
以下の発表録音テキストを分析し、「聴衆の意思決定を動かす」プロ品質の原稿に生まれ変わらせてください。

【発表の目的・想定聴衆】
{target_note}{duration_note}

【録音の書き起こし】
{transcript}{timing_info}{iteration_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
出力形式（必ずこの順番で出力すること）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📊 診断サマリー

**構造スコア:** X/10  
**弱点TOP3:**
1. （最も改善が必要な点）
2. （2番目）
3. （3番目）

**フィラー・弱気ワード検出:** （「えー」「だと思います」などの具体例を列挙）

---

## ✨ 改善原稿

（以下のルールを厳守して原稿を書く）
- 話し言葉・自然な発話リズムで書く（書き言葉禁止）
- **重要な主張は太字**で強調
- [間] で効果的な間を示す
- 弱気ワードを完全に排除し、すべて言い切りに変換
- フィラーを完全除去
- 導入（フック）→ 問題提起 → 解決策 → 根拠 → CTA の構造を厳守
- 各スライドの区切りは「【スライドN】」で必ず明示{f"（スライドは{total_slides}枚あるので必ず【スライド1】〜【スライド{total_slides}】まで記載）" if total_slides > 0 else "（スライドタイミング情報がある場合は特に厳守）"}
- 句読点（「、」「。」）を適切に補完し、自然な読み上げリズムに調整
- 音声認識の誤字・脱字・誤変換を修正（例：「消化器芸会」→「消化器外科医」）
- 数字・固有名詞の表記を統一

---

## 💡 コーチングメモ

次回練習時に意識すべき1〜2点を具体的に伝える。
「〇〇のスライドで△△と言い切れるようになると、聴衆の反応が変わります」のような具体的なアドバイス。
{"改善率を褒めるコメントも追加。" if not is_first else ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""


def _build_prompt(
    transcript: str,
    slide_timings: list,
    iteration: int,
    previous_script: str,
    target_type: str = "general",
    target_duration: int = 0,
    total_slides: int = 0,
) -> str:
    # 目的別指示
    target_instructions = {
        "vc":       "VCや投資家向け。数字・成長ストーリー・差別化を重視。言い切りで断定的に話す。",
        "ringi":    "社内稟議・役員向け。リスクと対策、ROI、意思決定の根拠を明確に。",
        "academic": "学会・研究発表向け。方法論、根拠、先行研究との差異を明確に。専門用語OK。",
        "interview":"採用面接向け。自己アピール・具体的エピソード・熱意を自然に伝える。",
        "general":  "一般的なプレゼン向け。わかりやすさと説得力のバランスを重視。",
    }
    target_note = target_instructions.get(target_type, target_instructions["general"])

    # 時間制約
    duration_note = ""
    if target_duration > 0:
        mins = target_duration // 60
        secs = target_duration % 60
        label = f"{mins}分{secs}秒" if secs else f"{mins}分"
        duration_note = f"\n\n【目標発表時間】{label}に収まるよう全体の分量を調整してください。"

    # スライドタイミング
    timing_info = ""
    if slide_timings:
        timing_info = "\n\n【各スライドの発表時間（参考）】\n"
        for i, t in enumerate(slide_timings):
            duration = t.get("duration", 0)
            timing_info += f"スライド{i + 1}: {duration:.0f}秒\n"

    # スライド数に基づくマーカー指示
    if total_slides > 0:
        slide_marker_note = f"""
【★最重要：スライドマーカーの挿入（必須）★】
このプレゼンはスライドが{total_slides}枚あります。
必ず原稿を{total_slides}つのセクションに分割し、各セクションの冒頭に「【スライドN】」（N=1〜{total_slides}）を付けてください。
例：
【スライド1】
（スライド1の内容）
【スライド2】
（スライド2の内容）
...【スライド{total_slides}】
（スライド{total_slides}の内容）
※ このマーカーがないと画面のスライド別表示が機能しません。絶対に省略しないでください。"""
    elif slide_timings:
        n = len(slide_timings)
        slide_marker_note = f"""
【★重要：スライドマーカーの挿入★】
スライド切り替えタイミングが{n}回記録されています。
原稿を{n}つのセクションに分割し「【スライドN】」マーカーを必ず付けてください。"""
    else:
        slide_marker_note = """
【スライドマーカー】内容の流れに合わせて「【スライドN】」で区切ってください（任意）。"""

    common_fixes = """
【必須の日本語修正】
A. 句読点を適切に挿入（読みやすい位置に「、」「。」を補完）
B. 読点の省略・誤脱を修正（息継ぎの自然な位置に補完）
C. 明らかな誤字・脱字を修正（音声認識の誤変換を含む。例：「消化器芸会」→「消化器外科医」、「内閣会業員」→「内科開業医」）
D. 数字・固有名詞の表記を統一
E. 文末を断言形に（「〜だと思います」→「〜です」「〜があります」）
F. 音声認識特有の連続文字（「ですですが」等）を整理"""

    if iteration == 1 or not previous_script:
        return f"""あなたはプロのプレゼンテーションコーチ兼日本語校正者です。発表者の音声書き起こしを、効果的な発表原稿に仕上げてください。
{slide_marker_note}

【発表の目的・想定聴衆】
{target_note}

【音声書き起こし（音声認識のため誤りを含む）】
{transcript}{timing_info}{duration_note}

【改善の指針】
1. 聴衆が理解しやすい明確な構成と言葉
2. 自然な話し言葉（書き言葉ではなく）
3. 重要ポイントは **太字** で強調
4. 間（ポーズ）が必要な箇所は [間] と記載
5. 導入・展開・まとめの流れを意識
6. フィラー（えー、あのー、まあ等）を自然な言葉に置き換え
{common_fixes}

発表者の意図と内容を尊重しながら、プロフェッショナルな発表原稿を作成してください。"""

    else:
        return f"""あなたはプロのプレゼンテーションコーチ兼日本語校正者です。発表者が練習を重ねています。前回の改善原稿と今回の新しい録音を比較して、さらに洗練された原稿を作成してください。
{slide_marker_note}

【発表の目的・想定聴衆】
{target_note}

【前回の改善原稿】
{previous_script}

【今回の新しい音声書き起こし】
{transcript}{timing_info}{duration_note}

【改善の指針】
1. 前回原稿からの発表者の改善点を認識・反映
2. 今回の録音で良かった表現は積極的に取り入れる
3. 前回原稿の良い部分は維持する
4. さらに自然で説得力のある表現に磨く
5. 重要ポイントは **太字** で強調
6. 間（ポーズ）は [間] と記載
{common_fixes}

両方の良い点を組み合わせた最高の発表原稿を作成してください。"""


async def _call_openai(prompt: str, api_key: str, model: str) -> str:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "あなたはプロのプレゼンテーションコーチです。日本語で回答してください。",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 4000,
            },
        )

    if resp.status_code != 200:
        err = resp.json().get("error", {}).get("message", resp.text)
        raise Exception(f"OpenAI APIエラー: {err}")

    return resp.json()["choices"][0]["message"]["content"]


async def _call_ollama(prompt: str, model: str) -> str:
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"あなたはプロのプレゼンテーションコーチです。日本語で回答してください。\n\n{prompt}",
                "stream": False,
            },
        )

    if resp.status_code != 200:
        raise Exception(f"Ollamaエラー: {resp.text}")

    return resp.json().get("response", "")


# ============================================================
# AI ストリーミング改善（リアルタイム表示）
# ============================================================

@app.post("/api/improve-script-stream")
async def improve_script_stream(request: Request):
    body = await request.json()

    transcript = body.get("transcript", "").strip()
    slide_timings = body.get("slide_timings", [])
    total_slides = int(body.get("total_slides", 0))
    api_key = body.get("api_key", "")
    model = body.get("model", "gpt-4o")
    use_ollama = body.get("use_ollama", False)
    ollama_model = body.get("ollama_model", "qwen3:8b")
    iteration = body.get("iteration", 1)
    previous_script = body.get("previous_script", "")
    target_type = body.get("target_type", "general")
    target_duration = int(body.get("target_duration", 0))
    managed_key = os.getenv("MANAGED_OPENAI_KEY", "")
    use_managed = body.get("use_managed", False) and bool(managed_key)

    if not transcript:
        raise HTTPException(400, "文字起こしテキストが必要です")

    if use_managed:
        prompt = _build_managed_prompt(transcript, slide_timings, iteration, previous_script, target_type, target_duration, total_slides)
        effective_key = managed_key
        effective_model = "gpt-4o"
    else:
        prompt = _build_prompt(transcript, slide_timings, iteration, previous_script, target_type, target_duration, total_slides)
        effective_key = api_key
        effective_model = model

    # Ollama ブランチ（ローカルLLMをストリーミング）
    if use_ollama and not use_managed:
        # 事前ヘルスチェック：Ollamaが起動しているか確認
        try:
            async with httpx.AsyncClient(timeout=5) as health_client:
                hr = await health_client.get("http://localhost:11434/api/tags")
                if hr.status_code != 200:
                    raise HTTPException(503, f"Ollamaが応答しません（status={hr.status_code}）")
        except httpx.ConnectError:
            raise HTTPException(503, "Ollamaが起動していません。タスクトレイのラマアイコンを確認してください。")
        except httpx.TimeoutException:
            raise HTTPException(503, "Ollama接続タイムアウト")

        print(f"[ImproveScriptStream] Ollama使用 model={ollama_model} transcript_len={len(transcript)}")

        full_prompt = f"あなたはプロのプレゼンテーションコーチです。日本語で回答してください。\n\n{prompt}"

        async def generate_ollama():
            # 読み込みは時間がかかる可能性があるためread=Noneで無制限。接続だけ短めにタイムアウト
            stream_timeout = httpx.Timeout(connect=30.0, read=None, write=30.0, pool=30.0)
            try:
                async with httpx.AsyncClient(timeout=stream_timeout) as client:
                    async with client.stream(
                        "POST",
                        "http://localhost:11434/api/generate",
                        json={
                            "model": ollama_model,
                            "prompt": full_prompt,
                            "stream": True,
                        },
                    ) as resp:
                        if resp.status_code != 200:
                            err_bytes = await resp.aread()
                            err_text = err_bytes.decode(errors="replace")
                            yield f"data: {json.dumps({'text': f'⚠️ Ollamaエラー: {err_text}'})}\n\n"
                            yield "data: [DONE]\n\n"
                            return
                        async for line in resp.aiter_lines():
                            if not line or not line.strip():
                                continue
                            try:
                                chunk = json.loads(line)
                            except json.JSONDecodeError:
                                continue
                            delta = chunk.get("response", "")
                            if delta:
                                yield f"data: {json.dumps({'text': delta})}\n\n"
                            if chunk.get("done"):
                                yield "data: [DONE]\n\n"
                                return
            except Exception as e:
                print(f"[ImproveScriptStream] Ollamaストリーミングエラー: {type(e).__name__}: {e}", file=sys.stderr)
                yield f"data: {json.dumps({'text': f'⚠️ ストリーミングエラー: {type(e).__name__}: {e}'})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(generate_ollama(), media_type="text/event-stream")

    # OpenAI ブランチ（既存）
    if not effective_key:
        raise HTTPException(400, "APIキーが必要です")

    async def generate():
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {effective_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": effective_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True,
                    "temperature": 0.7,
                    "max_tokens": 4000,
                },
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield f"data: {json.dumps({'text': delta})}\n\n"
                        except Exception:
                            pass

    return StreamingResponse(generate(), media_type="text/event-stream")


# ============================================================
# 弱気ワード辞書
# ============================================================

WEAK_WORDS_JP = [
    ("と思います",       "です"),
    ("だと思います",     "です"),
    ("かもしれません",   "です"),
    ("かもしれない",     ""),
    ("たぶん",           "確実に"),
    ("おそらく",         "確実に"),
    ("一応",             ""),
    ("なんとなく",       "明確に"),
    ("ような気がします", "です"),
    ("できるだけ",       "必ず"),
    ("よろしければ",     "ぜひ"),
    ("もしよければ",     "ぜひ"),
    ("なんですが",       ""),
    ("なんですけど",     ""),
    ("みたいな感じ",     ""),
    ("という感じ",       ""),
    ("と思うんですけど", "ですが"),
    ("どちらかというと", ""),
    ("ちょっと難しい",   "課題があります"),
    ("あれですね",       ""),
    ("えっとね",         ""),
    ("うまくいえない",   ""),
    ("わからないけど",   ""),
    ("よくわからない",   ""),
]

# ============================================================
# フィラー解析
# ============================================================

FILLERS_JP = [
    "えー", "えーと", "えっと", "あー", "あのー", "あの", "うーん", "うん",
    "まあ", "まー", "ちょっと", "なんか", "みたいな", "っていうか",
    "そのー", "そのう", "というか", "とか", "っていう", "ですね", "ですよね",
    "ええと", "あのう", "あのあの", "ね", "ほら", "ちょっとその",
    "えーとね", "まあその", "なんていうか", "まあね",
    "いや", "いやいや",
]

@app.post("/api/analyze-fillers")
async def analyze_fillers(request: Request):
    body = await request.json()
    text = body.get("text", "")
    if not text:
        return {"fillers": [], "filler_count": 0, "filler_rate": 0.0}

    found = []
    text_lower = text.lower()
    for filler in FILLERS_JP:
        idx = 0
        while True:
            pos = text_lower.find(filler, idx)
            if pos == -1:
                break
            found.append({"word": filler, "position": pos})
            idx = pos + len(filler)

    found.sort(key=lambda x: x["position"])
    total_chars = len(text.replace(" ", "").replace("\n", ""))
    rate = round(len(found) / max(total_chars, 1) * 100, 2)

    # フィラー別集計
    from collections import Counter
    counter = Counter(f["word"] for f in found)
    summary = [{"word": w, "count": c} for w, c in counter.most_common()]

    return {
        "fillers": found,
        "filler_count": len(found),
        "filler_rate": rate,
        "summary": summary,
    }


# ============================================================
# 構造診断エンジン
# ============================================================

@app.post("/api/analyze-structure")
async def analyze_structure(request: Request):
    import re
    body = await request.json()
    text = body.get("text", "")
    target_type = body.get("target_type", "general")

    if not text:
        raise HTTPException(400, "テキストが必要です")

    checks: list[dict] = []
    score = 0

    def chk(item: str, ok: bool, weight: int, hint: str = "", icon: str = ""):
        nonlocal score
        if ok:
            score += weight
        checks.append({"item": item, "ok": ok, "weight": weight, "hint": hint, "icon": icon})

    # ストーリーアーク（導入→問題提起→解決策→根拠→CTA）
    has_intro    = any(k in text for k in ["はじめに", "今日は", "本日は", "紹介します", "について", "お話しします", "まず", "最初に", "今回は"])
    has_problem  = any(k in text for k in ["課題", "問題", "悩み", "困っ", "難し", "現状", "ペイン", "不満", "困難", "課題感"])
    has_solution = any(k in text for k in ["解決", "実現", "提供", "できます", "改善", "解消", "提案", "開発しました", "作りました"])
    has_evidence = bool(re.search(r'\d+', text)) and any(k in text for k in ["%", "％", "億", "万", "千", "人", "件", "倍", "分", "秒", "円"])
    has_cta      = any(k in text for k in ["ぜひ", "お願い", "一緒に", "ご検討", "次のステップ", "始め", "ご連絡", "よろしく", "お声がけ"])

    arc_count = sum([has_intro, has_problem, has_solution, has_evidence, has_cta])
    missing = [n for flag, n in [
        (has_intro,    "導入"),
        (has_problem,  "問題提起"),
        (has_solution, "解決策"),
        (has_evidence, "根拠データ"),
        (has_cta,      "CTA"),
    ] if not flag]

    chk(
        f"ストーリーアーク ({arc_count}/5要素)",
        arc_count >= 4,
        20,
        f"不足要素: {', '.join(missing)}" if missing else "完璧な構成です！",
        "🏗️",
    )

    # WHYの強度
    has_why = any(k in text for k in ["なぜなら", "理由は", "なぜ", "背景", "動機", "目的", "ために", "想い", "きっかけ", "始めた理由"])
    chk("WHYの強度（動機・理由）", has_why, 15,
        "「なぜこれに取り組むのか」という動機を冒頭に入れると共感を生みます", "❓")

    # 定量的根拠
    numbers = re.findall(r'\d+[\.,]?\d*\s*[%％億万千円人個件倍]', text)
    chk(f"定量的根拠 ({len(numbers)}個の数値)", len(numbers) >= 2, 15,
        "市場規模・改善率・実績などの具体的な数値を2つ以上入れましょう", "📊")

    # 差別化
    has_diff = any(k in text for k in ["競合", "他社", "差別化", "違い", "優位", "比較", "既存", "従来", "独自", "強み", "特徴"])
    diff_weight = 15 if target_type in ["vc", "ringi"] else 10
    chk("差別化・独自性", has_diff, diff_weight,
        "「なぜあなたの提案でなければならないか」を明示しましょう", "⚔️")

    # 将来ビジョン
    has_vision = any(k in text for k in ["将来", "未来", "ビジョン", "目指", "実現したい", "展望", "社会", "世界", "これから"])
    chk("将来ビジョン", has_vision, 10,
        "聴衆が「未来」を想像できる一言を加えると印象に残ります", "🔮")

    # 共感訴求
    has_empathy = any(k in text for k in ["皆さん", "みなさん", "あなた", "誰でも", "多くの方", "経験したこと", "感じたこと"])
    chk("聴衆への共感訴求", has_empathy, 10,
        "「皆さんも〇〇を経験したことがありますよね」と聴衆を引き込みましょう", "🤝")

    # 言い切り度
    weak_count = sum(text.count(w) for w, _ in WEAK_WORDS_JP)
    chk(f"言い切り度（弱気ワード: {weak_count}個）", weak_count < 5, 15,
        "「〜と思います」→「〜です」に変えると自信が伝わります", "💪")

    rank = "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D"
    failed = sorted([c for c in checks if not c["ok"]], key=lambda x: -x["weight"])

    return {
        "score": score,
        "rank": rank,
        "checks": checks,
        "top_improvements": failed[:3],
        "arc": {
            "intro":    has_intro,
            "problem":  has_problem,
            "solution": has_solution,
            "evidence": has_evidence,
            "cta":      has_cta,
        },
    }


# ============================================================
# スピーチ総合解析（WPM・弱気ワード・ピッチスコア）
# ============================================================

@app.post("/api/analyze-speech")
async def analyze_speech(request: Request):
    import re
    body = await request.json()
    text = body.get("text", "")
    duration_seconds = float(body.get("duration_seconds", 0))
    target_type = body.get("target_type", "general")

    if not text:
        raise HTTPException(400, "テキストが必要です")

    # 文字数・話速
    clean = text.replace(" ", "").replace("\n", "")
    char_count = len(clean)
    cpm = round(char_count / (duration_seconds / 60)) if duration_seconds > 0 else 0

    pace_status = "good"
    if cpm > 0:
        if cpm < 150:
            pace_status = "slow"
        elif cpm > 450:
            pace_status = "fast"

    # 弱気ワード検出
    detected_weak = []
    for word, replacement in WEAK_WORDS_JP:
        count = text.count(word)
        if count > 0:
            detected_weak.append({"word": word, "replacement": replacement, "count": count})

    # フィラー数
    filler_count = sum(text.count(f) for f in FILLERS_JP)

    # ピッチスコア（チェックリスト方式）
    checks: list[dict] = []
    score = 0

    def chk(item: str, ok: bool, weight: int, hint: str = ""):
        nonlocal score
        if ok:
            score += weight
        checks.append({"item": item, "ok": ok, "weight": weight, "hint": hint})

    chk(
        "数字・データがある",
        bool(re.search(r'\d+', text)),
        15,
        "具体的な数値（例: 市場規模○億円、改善率○%）を加えると説得力が増します",
    )
    chk(
        "課題・問題の提起がある",
        any(k in text for k in ["課題", "問題", "悩み", "困っ", "難し", "課題感", "ペイン", "現状"]),
        20,
        "「現状の課題は○○です」という明確な問題提起を加えましょう",
    )
    chk(
        "解決策・提案が明確",
        any(k in text for k in ["解決", "実現", "提供", "できる", "改善", "解消", "対応", "提案"]),
        20,
        "「この課題を○○で解決します」という解決策を明示しましょう",
    )
    chk(
        "行動喚起（CTA）がある",
        any(k in text for k in ["ぜひ", "お願い", "一緒に", "ご検討", "次のステップ", "まず", "始め", "ご連絡"]),
        15,
        "「ぜひ○○してください」という具体的なアクションで締めくくりましょう",
    )
    chk(
        f"フィラーが少ない（{filler_count}個検出）",
        filler_count < 5,
        15,
        "「えー」「あのー」などを意識して減らしましょう",
    )
    chk(
        f"弱気ワードが少ない（{len(detected_weak)}種検出）",
        len(detected_weak) < 3,
        15,
        "「〜と思います」→「〜です」、「たぶん」→「確実に」と言い換えましょう",
    )

    rank = "A" if score >= 80 else "B" if score >= 60 else "C" if score >= 40 else "D"

    return {
        "char_count": char_count,
        "duration_seconds": duration_seconds,
        "cpm": cpm,
        "pace_status": pace_status,
        "weak_words": detected_weak,
        "filler_count": filler_count,
        "pitch_score": score,
        "pitch_rank": rank,
        "pitch_checks": checks,
    }


# ============================================================
# 英語変換
# ============================================================

@app.post("/api/convert-english")
async def convert_english(request: Request):
    """日本語プレゼン原稿を英語に変換（文化的適応付き）"""
    body = await request.json()
    text = body.get("text", "").strip()
    target_type = body.get("target_type", "general")
    api_key = body.get("api_key", "")
    model = body.get("model", "gpt-4o-mini")
    use_ollama = body.get("use_ollama", False)
    ollama_model = body.get("ollama_model", "qwen3:8b")

    if not text:
        raise HTTPException(400, "テキストが必要です")

    style_map = {
        "vc":       "VC/Investor pitch English (assertive, metrics-driven, growth story, clear ask)",
        "ringi":    "Corporate proposal English (formal, ROI-focused, risk-aware, decision-oriented)",
        "academic": "Academic presentation English (precise, methodology-focused, evidence-based)",
        "interview": "Professional interview English (confident, STAR method, achievement-focused)",
        "general":  "Business presentation English (engaging, clear, natural spoken language)",
    }
    style = style_map.get(target_type, style_map["general"])

    prompt = f"""You are a world-class Japanese-to-English presentation translator specializing in cultural adaptation.

Convert the following Japanese presentation script to professional English.

Requirements:
1. Style: {style}
2. Culturally ADAPT (not just translate) - convert indirect/humble Japanese into assertive English
3. Keep natural spoken language rhythm (not stiff writing)
4. Mark pauses as [pause], key emphasis as **bold**
5. Keep slide markers like [Slide N] if present
6. Be direct and confident - avoid excessive hedging

Japanese Script:
{text}

Output ONLY the English presentation script. No explanations."""

    try:
        if use_ollama:
            result = await _call_ollama(prompt, ollama_model)
        elif api_key:
            result = await _call_openai(prompt, api_key, model)
        else:
            raise HTTPException(400, "APIキーまたはOllama設定が必要です")
        return {"english_script": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"英語変換エラー: {str(e)}")


# ============================================================
# 文字おこし翻訳（英語プレゼンモード）
# ============================================================

@app.post("/api/translate-transcript")
async def translate_transcript(request: Request):
    """日本語文字おこしを指定スタイルで英語に翻訳"""
    body = await request.json()
    text = body.get("text", "").strip()
    style = body.get("style", "formal")
    api_key = body.get("api_key", "")
    model = body.get("model", "gpt-4o-mini")
    use_ollama = body.get("use_ollama", False)
    ollama_model = body.get("ollama_model", "qwen3:8b")

    if not text:
        raise HTTPException(400, "テキストが必要です")

    style_desc_map = {
        "formal":   "Professional, polished, business-formal English. No contractions, assertive and confident tone.",
        "casual":   "Conversational, friendly English. Use natural contractions (it's, we've). Approachable and engaging.",
        "academic": "Academic English with precise terminology, passive voice where appropriate, evidence-based and methodology-focused.",
        "accented": "Natural spoken English with personality and flair. Include rhetorical questions, vivid metaphors, charismatic delivery cues.",
    }
    style_desc = style_desc_map.get(style, style_desc_map["formal"])

    prompt = f"""You are a professional Japanese-to-English presentation translator specializing in spoken-word scripts.

Translate the following Japanese presentation transcript to English.

Translation style: {style_desc}

Requirements:
1. Keep slide section markers like 【スライドN】 unchanged (or convert to [Slide N] format)
2. Use natural spoken language rhythm suitable for live presentations
3. Culturally ADAPT phrases (not literal translation) - convert humble/indirect Japanese into confident English
4. Mark key emphasis with **bold**
5. Mark breathing pauses as [pause] where natural

Japanese Transcript:
{text}

Output ONLY the translated English script. No explanations or preamble."""

    try:
        if use_ollama:
            result = await _call_ollama(prompt, ollama_model)
        elif api_key:
            result = await _call_openai(prompt, api_key, model)
        else:
            raise HTTPException(400, "APIキーまたはOllama設定が必要です")
        return {"translated": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"翻訳エラー: {str(e)}")


# ============================================================
# つまずき検知
# ============================================================

@app.post("/api/analyze-stumbles")
async def analyze_stumbles(request: Request):
    """発表テキストからつまずき（言い直し・繰り返し・中断）を検出"""
    import re
    body = await request.json()
    text = body.get("text", "")
    if not text:
        return {"stumbles": [], "stumble_count": 0, "score": 100}

    stumbles = []

    # パターン1: 直近繰り返し（同じ単語が2回連続）
    repeat_pattern = re.compile(r'([^\s]{2,})\s+\1')
    for m in repeat_pattern.finditer(text):
        stumbles.append({
            "type": "repeat",
            "text": m.group(0),
            "position": m.start(),
            "label": f"繰り返し: 「{m.group(1)}」",
        })

    # パターン2: 言い直し（〜じゃなくて/ではなく/ではなくて）
    rephrase = re.compile(r'.{1,10}(?:じゃなくて|ではなく(?:て)?|ちがい[まっ]す|違い[まっ]す|いや|あ、いや).{1,20}')
    for m in rephrase.finditer(text):
        stumbles.append({
            "type": "rephrase",
            "text": m.group(0),
            "position": m.start(),
            "label": f"言い直し: 「{m.group(0)[:20]}…」",
        })

    # パターン3: フィラー連続（えーあのー などが3つ以上連続）
    filler_seq = re.compile(r'(?:えー|えーと|えっと|あー|あのー|あの|うーん){3,}')
    for m in filler_seq.finditer(text):
        stumbles.append({
            "type": "filler_burst",
            "text": m.group(0),
            "position": m.start(),
            "label": f"フィラー連発: 「{m.group(0)}」",
        })

    # パターン4: 文の中断（。の後に短い断片→また文が続く）
    broken = re.compile(r'[^。]{1,8}[、。…]{0,1}(?:えー|えっと|あのー|うーん).{5,}')
    for m in broken.finditer(text):
        stumbles.append({
            "type": "broken_sentence",
            "text": m.group(0)[:30],
            "position": m.start(),
            "label": f"文の中断: 「{m.group(0)[:20]}…」",
        })

    # 重複除去（同じpositionの近いものを除去）
    seen_positions: list[int] = []
    unique_stumbles = []
    for s in sorted(stumbles, key=lambda x: x["position"]):
        if any(abs(s["position"] - p) < 15 for p in seen_positions):
            continue
        seen_positions.append(s["position"])
        unique_stumbles.append(s)

    count = len(unique_stumbles)
    score = max(0, 100 - count * 10)

    return {
        "stumbles": unique_stumbles[:20],
        "stumble_count": count,
        "score": score,
    }


# ============================================================
# メタファー提案（つまずき箇所への比喩提案）
# ============================================================

METAPHOR_TEMPLATES = [
    ("例えば、{topic}は{metaphor}のようなものです。", ["ビジネスモデル", "成長戦略", "競合優位性", "課題解決", "市場機会"]),
]

# トピック → メタファーのマッピング
TOPIC_METAPHORS = {
    "市場": ["広大な海を最初に航行する船", "まだ誰も耕していない肥沃な農地", "夜明け前の金鉱"],
    "競合": ["百メートル競走ではなく、マラソン", "チェスの盤面", "生態系の中のニッチ"],
    "成長": ["雪だるまが坂を転がり落ちるような加速", "種が大樹に育つプロセス", "複利の力"],
    "課題": ["岩を押し上げるシーシュポス", "燃え盛る建物の中の貴重品", "穴の開いたバケツ"],
    "解決": ["地図を手に入れた探検家", "処方箋を見つけた医者", "鍵を見つけた錠前"],
    "チーム": ["交響楽団の演奏者", "サッカーチームのポジション", "筋肉の束"],
    "資金": ["ロケットの燃料", "植物への水やり", "エンジンのオイル"],
    "ユーザー": ["北極星", "設計図の中心", "会話の相手"],
    "技術": ["縁の下の力持ち", "舞台裏の職人", "見えないインフラ"],
    "ビジョン": ["遠くに見える灯台", "登山の頂上", "地平線の夜明け"],
}

@app.post("/api/suggest-metaphors")
async def suggest_metaphors(request: Request):
    """つまずき箇所や難解な概念にメタファーを提案"""
    body = await request.json()
    text = body.get("text", "")
    stumble_positions = body.get("stumble_positions", [])  # つまずき検知の位置情報
    target_type = body.get("target_type", "general")

    if not text:
        return {"suggestions": []}

    suggestions = []

    # テキストからトピックを検出してメタファーを提案
    for topic, metaphors in TOPIC_METAPHORS.items():
        if topic in text:
            import random
            metaphor = random.choice(metaphors)
            # そのトピックが出現する位置を特定
            pos = text.find(topic)
            suggestions.append({
                "topic": topic,
                "metaphor": metaphor,
                "position": pos,
                "example": f"例えば、{topic}は「{metaphor}」のようなものです。",
                "usage_hint": f"「{topic}」を説明する際、この比喩を使うと聴衆が視覚的にイメージしやすくなります",
            })

    # つまずき箇所周辺のテキストにも提案
    for pos in stumble_positions[:3]:  # 最大3箇所
        chunk = text[max(0, pos - 30):min(len(text), pos + 50)]
        if chunk and len(chunk) > 10:
            suggestions.append({
                "topic": "つまずき箇所",
                "metaphor": "シンプルな比喩",
                "position": pos,
                "example": f"この箇所（「{chunk[:20]}…」）で詰まるなら、「例えば〇〇に例えると…」と一言添えると流れを作れます",
                "usage_hint": "つまずいたら比喩で時間を稼ぎながら言い直しましょう",
            })

    # 目的タイプ別の特化メタファー追加
    type_metaphors = {
        "vc": {
            "topic": "ビジネス全体像",
            "example": "このビジネスを一言で言えば「○○業界のAmazon」です。既存の複雑なプロセスをワンストップで解決します。",
            "usage_hint": "VCには「〇〇のXX版」という既知サービスへのアナロジーが刺さります",
        },
        "ringi": {
            "topic": "投資対効果",
            "example": "この投資は「節約のための節約」です。今の非効率を放置するコストと比較してください。",
            "usage_hint": "役員には「やらないリスク」を数値で示す比喩が有効です",
        },
        "academic": {
            "topic": "研究の位置づけ",
            "example": "先行研究がパズルの外枠なら、本研究はその中の最後のピースです。",
            "usage_hint": "学会では先行研究との関係を地図的に示す比喩が有効です",
        },
        "interview": {
            "topic": "自己PR",
            "example": "私の強みを一言で言えば「逆境で燃えるエンジン」です。困難があるほど本領を発揮します。",
            "usage_hint": "面接では記憶に残るシンプルなキャッチフレーズが効果的です",
        },
    }

    if target_type in type_metaphors:
        m = type_metaphors[target_type]
        suggestions.append({
            "topic": m["topic"],
            "metaphor": "目的特化型",
            "position": -1,
            "example": m["example"],
            "usage_hint": m["usage_hint"],
        })

    return {"suggestions": suggestions[:8]}  # 最大8件


# ============================================================
# 熱量ヒートマップ解析
# ============================================================

ENERGY_HIGH_KEYWORDS = [
    "革命", "破壊", "圧倒", "最高", "完璧", "必ず", "確実に", "絶対", "世界一",
    "唯一", "初めて", "史上", "驚異", "爆発", "急成長", "飛躍", "変革", "実現",
    "達成", "成功", "証明", "勝利", "突破", "超える", "上回る", "倍増",
]
ENERGY_MED_KEYWORDS = [
    "重要", "必要", "効果", "改善", "提案", "解決", "実現", "目指", "取り組",
    "強み", "優位", "差別化", "価値", "貢献", "向上", "拡大", "展開", "推進",
]
ENERGY_LOW_KEYWORDS = [
    "と思います", "かもしれ", "たぶん", "おそらく", "一応", "なんとなく",
    "えー", "あのー", "まあ", "なんか", "ちょっと", "みたいな",
]

@app.post("/api/analyze-energy")
async def analyze_energy(request: Request):
    """発表テキストの熱量（エネルギー密度）をセグメント別に解析"""
    body = await request.json()
    text = body.get("text", "")
    segments = body.get("segments", [])  # Whisperセグメント情報（任意）

    if not text:
        return {"energy_map": [], "overall_energy": 0}

    # テキストを文単位に分割
    import re
    sentences = re.split(r'(?<=[。！？\.\!\?])', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 3]

    energy_map = []
    for i, sentence in enumerate(sentences):
        score = 50  # ベーススコア

        # 高エネルギーキーワード検出
        high_hits = [kw for kw in ENERGY_HIGH_KEYWORDS if kw in sentence]
        score += len(high_hits) * 15

        # 中エネルギーキーワード検出
        med_hits = [kw for kw in ENERGY_MED_KEYWORDS if kw in sentence]
        score += len(med_hits) * 8

        # 低エネルギーキーワード検出（マイナス）
        low_hits = [kw for kw in ENERGY_LOW_KEYWORDS if kw in sentence]
        score -= len(low_hits) * 12

        # 文末の断定度
        if sentence.endswith(('です。', 'ます。', 'した。', 'です！', 'ます！')):
            score += 5
        elif sentence.endswith(('と思います。', 'かもしれません。', 'でしょう。')):
            score -= 8

        # 数値があるとエネルギー UP
        if re.search(r'\d+[\.,]?\d*\s*[%％億万千円人個件倍]', sentence):
            score += 10

        # 感嘆符・強調
        if '！' in sentence or '!' in sentence:
            score += 10

        score = max(10, min(100, score))

        level = "high" if score >= 70 else "medium" if score >= 40 else "low"

        energy_map.append({
            "index": i,
            "text": sentence[:60] + ("…" if len(sentence) > 60 else ""),
            "full_text": sentence,
            "score": score,
            "level": level,
            "high_hits": high_hits[:3],
            "low_hits": low_hits[:3],
        })

    overall = round(sum(e["score"] for e in energy_map) / max(len(energy_map), 1))
    low_energy_sections = [e for e in energy_map if e["level"] == "low"]
    peak_section = max(energy_map, key=lambda x: x["score"]) if energy_map else None

    return {
        "energy_map": energy_map,
        "overall_energy": overall,
        "overall_level": "high" if overall >= 70 else "medium" if overall >= 40 else "low",
        "low_energy_count": len(low_energy_sections),
        "peak_section": peak_section,
        "sentence_count": len(sentences),
    }


# ============================================================
# Speakable English（話せる英語に変換）
# ============================================================

@app.post("/api/speakable-english")
async def speakable_english(request: Request):
    """英語原稿を「実際に声に出しやすい」形式にブレイクダウン"""
    body = await request.json()
    text = body.get("text", "")
    api_key = body.get("api_key", "")
    model = body.get("model", "gpt-4o-mini")
    use_ollama = body.get("use_ollama", False)
    ollama_model = body.get("ollama_model", "qwen3:8b")

    if not text:
        raise HTTPException(400, "テキストが必要です")

    # 英語原稿かどうか判定（日本語が多い場合は先に英語変換が必要）
    import re
    jp_chars = len(re.findall(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]', text))
    is_japanese = jp_chars > len(text) * 0.2

    if is_japanese:
        raise HTTPException(400, "英語原稿を入力してください。先に「英語版」タブで変換してください。")

    prompt = """You are an English pronunciation and speaking coach for non-native speakers.

Transform the following English presentation script into a "Speakable" format optimized for Japanese speakers.

Rules:
1. **Break long sentences** into shorter chunks (max 15 words per chunk)
2. **Add breathing markers**: [breath] where natural pauses should occur  
3. **Add stress markers**: *WORD* for words that should be emphasized (1-2 per sentence)
4. **Add pronunciation hints** in [brackets] for difficult words (e.g., "entrepreneur [on-treh-preh-NEUR]")
5. **Add delivery notes** sparingly: (slow down), (pause), (strong), (smile in voice)
6. Keep the original meaning intact
7. Number each speaking unit

Format each unit as:
[N] Text with markers
   → Note if needed

English Script:
""" + text + """

Output the Speakable version only."""

    try:
        if use_ollama:
            result = await _call_ollama(prompt, ollama_model)
        elif api_key:
            result = await _call_openai(prompt, api_key, model)
        else:
            raise HTTPException(400, "APIキーまたはOllama設定が必要です")
        return {"speakable_script": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Speakable変換エラー: {str(e)}")


# ============================================================
# 圧迫ピッチモード（AI役を演じてQ&A）
# ============================================================

@app.post("/api/pressure-pitch")
async def pressure_pitch(request: Request):
    """圧迫ピッチモード: AIが厳しい投資家・審査員に扮して質問する"""
    body = await request.json()
    script = body.get("script", "")
    history = body.get("history", [])  # [{"role":"ai","text":"..."}, {"role":"user","text":"..."}]
    target_type = body.get("target_type", "vc")
    api_key = body.get("api_key", "")
    model = body.get("model", "gpt-4o-mini")
    use_ollama = body.get("use_ollama", False)
    ollama_model = body.get("ollama_model", "qwen3:8b")

    persona_map = {
        "vc":       "あなたは厳しいベンチャーキャピタリスト（VC）です。数字に厳しく、甘い見通しに突っ込みます。",
        "ringi":    "あなたは厳格な社内役員です。ROIとリスク対策を徹底的に問い詰めます。",
        "academic": "あなたは批判的な学会審査員です。方法論の穴を指摘します。",
        "interview":"あなたは高圧的な面接官です。自己PRの具体性を追及します。",
        "general":  "あなたは懐疑的な聴衆代表です。「本当に？」と疑ってかかります。",
    }
    persona = persona_map.get(target_type, persona_map["vc"])

    # 会話履歴をテキストに変換
    hist_text = ""
    for h in history[-6:]:  # 直近6ターン
        role = "AI審査員" if h.get("role") == "ai" else "発表者"
        hist_text += f"{role}: {h.get('text', '')}\n"

    is_first = len(history) == 0
    if is_first:
        instruction = f"""以下のプレゼン原稿を読んで、最初の鋭い質問を1つだけ日本語で投げかけてください。
質問は短く、核心をついたものにしてください。(2行以内)

原稿:
{script[:800]}"""
    else:
        instruction = f"""以下の会話の続きとして、発表者の回答に対するフォローアップ質問または鋭いツッコミを1つだけ日本語で返してください。
質問/ツッコミは短く(2行以内)、容赦なくしてください。

会話履歴:
{hist_text}"""

    system_prompt = f"{persona}\n返答は必ず日本語で、2行以内の短い質問/ツッコミのみ。挨拶・説明不要。"

    try:
        if use_ollama:
            full_prompt = f"{system_prompt}\n\n{instruction}"
            result = await _call_ollama(full_prompt, ollama_model)
        elif api_key:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": instruction},
                        ],
                        "temperature": 0.8,
                        "max_tokens": 150,
                    },
                )
            if resp.status_code != 200:
                raise Exception(f"OpenAI APIエラー: {resp.text}")
            result = resp.json()["choices"][0]["message"]["content"]
        else:
            raise HTTPException(400, "APIキーまたはOllama設定が必要です")

        return {"question": result.strip()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"圧迫ピッチエラー: {str(e)}")


# ============================================================
# セッション管理
# ============================================================

@app.get("/api/sessions")
async def list_sessions():
    sessions = []
    for path in sorted(SESSION_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            iters = data.get("iterations", [])
            # 最新イテレーションのスコアを取得
            latest_score = None
            latest_rank  = None
            for it in reversed(iters):
                analysis = it.get("analysis") or {}
                if analysis.get("pitch_score") is not None:
                    latest_score = analysis["pitch_score"]
                    latest_rank  = analysis.get("pitch_rank")
                    break
            sessions.append(
                {
                    "id": data.get("id"),
                    "title": data.get("title", "無題"),
                    "created_at": data.get("created_at"),
                    "updated_at": data.get("updated_at"),
                    "iterations": len(iters),
                    "latest_score": latest_score,
                    "latest_rank":  latest_rank,
                }
            )
        except Exception:
            pass
    return sessions


@app.post("/api/sessions")
async def create_session(request: Request):
    body = await request.json()
    session_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    data = {
        "id": session_id,
        "title": body.get("title", f"セッション {datetime.now().strftime('%Y/%m/%d %H:%M')}"),
        "slides_file": body.get("slides_file", ""),
        "slides_type": body.get("slides_type", ""),
        "slides_pages": body.get("slides_pages", []),
        "pptx_file": body.get("pptx_file", ""),   # 元のPPTXファイル名（並列起動用）
        "created_at": now,
        "updated_at": now,
        "iterations": [],
    }
    _save_session(session_id, data)
    return data


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    path = SESSION_DIR / f"{session_id}.json"
    if not path.exists():
        raise HTTPException(404, "セッションが見つかりません")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@app.put("/api/sessions/{session_id}")
async def update_session(session_id: str, request: Request):
    path = SESSION_DIR / f"{session_id}.json"
    if not path.exists():
        raise HTTPException(404, "セッションが見つかりません")

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    body = await request.json()
    data.update(body)
    data["updated_at"] = datetime.now().isoformat()
    _save_session(session_id, data)
    return data


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    path = SESSION_DIR / f"{session_id}.json"
    if path.exists():
        path.unlink()
    return {"message": "削除しました"}


def _save_session(session_id: str, data: dict):
    path = SESSION_DIR / f"{session_id}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ============================================================
# 静的ファイル配信
# ============================================================

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ============================================================
# エントリポイント
# ============================================================

if __name__ == "__main__":
    import sys
    # Windows コンソールの文字化け対策
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    # uvicorn の reload モードで main モジュールが見つかるよう sys.path に追加
    sys.path.insert(0, str(Path(__file__).parent))
    print("=" * 55)
    print("  [MIC]  プレゼン練習アプリ")
    print("=" * 55)
    print("  ブラウザで http://localhost:8000 を開いてください")
    print("  終了するには Ctrl+C を押してください")
    print("=" * 55)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
