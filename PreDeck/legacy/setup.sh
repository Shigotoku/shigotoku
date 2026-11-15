#!/usr/bin/env bash
# PreDeck 初回セットアップ (WSL / Linux)
# Windows版 install.bat の WSL 移植

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR="$SCRIPT_DIR/.venv"
PY="${PYTHON:-python3}"

echo
echo "================================================"
echo "   PreDeck  初回セットアップ (WSL)"
echo "================================================"
echo

# -------- システム依存の事前チェック --------
NEED_APT=()
if ! "$PY" -c "import ensurepip" 2>/dev/null; then
    NEED_APT+=("python3-venv")
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
    NEED_APT+=("ffmpeg")
fi
# LibreOffice は PPTX→PDF 変換のフォールバック（任意）
if ! command -v soffice >/dev/null 2>&1 && ! command -v libreoffice >/dev/null 2>&1; then
    echo "[情報] libreoffice 未検出 (PPTX変換のフォールバック用・任意)"
    echo "       必要なら:  sudo apt install libreoffice"
    echo
fi

if [ ${#NEED_APT[@]} -gt 0 ]; then
    echo "[必須] 以下のシステムパッケージが必要です:"
    for p in "${NEED_APT[@]}"; do echo "   - $p"; done
    echo
    echo "次のコマンドで先にインストールしてください:"
    echo "   sudo apt update && sudo apt install -y ${NEED_APT[*]}"
    echo
    exit 1
fi

# -------- Step 1: venv 作成 --------
if [ ! -d "$VENV_DIR" ]; then
    echo "[Step 1/4] 仮想環境を作成中..."
    "$PY" -m venv "$VENV_DIR"
    echo "[Step 1/4] 完了。"
    echo
else
    echo "[Step 1/4] 仮想環境はすでに存在します。スキップ。"
    echo
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# -------- Step 2: pip 更新 --------
echo "[Step 2/4] pip を更新中..."
python -m pip install --upgrade pip
echo

# -------- Step 3: 基本ライブラリ --------
MARKER_BASE="$VENV_DIR/.libs_installed"
if [ ! -f "$MARKER_BASE" ]; then
    echo "[Step 3/4] 基本ライブラリをインストール中..."
    echo "   (fastapi, uvicorn, httpx, PyMuPDF, ...)"
    python -m pip install -r requirements.txt
    touch "$MARKER_BASE"
    echo "[Step 3/4] 完了。"
    echo
else
    echo "[Step 3/4] 基本ライブラリは導入済み。スキップ。"
    echo "   再インストールしたい場合: rm $MARKER_BASE"
    echo
fi

# -------- Step 4: Whisper エンジン --------
MARKER_OW="$VENV_DIR/.whisper_installed"
MARKER_FW="$VENV_DIR/.faster_whisper_installed"

if [ ! -f "$MARKER_FW" ]; then
    echo "[Step 4/4] faster-whisper をインストール中..."
    echo "   ※ CTranslate2 ベースの高速実装 (推奨)"
    if python -m pip install faster-whisper; then
        touch "$MARKER_FW"
        echo "[Step 4/4] faster-whisper 完了。"
    else
        echo "[警告] faster-whisper のインストールに失敗しました。"
    fi
    echo
else
    echo "[Step 4/4] faster-whisper は導入済み。スキップ。"
    echo
fi

if [ ! -f "$MARKER_OW" ]; then
    echo "[Step 4+/4] openai-whisper をインストール中..."
    echo "   ※ PyTorch を含むため数百MB・5〜20分かかります"
    if python -m pip install openai-whisper; then
        touch "$MARKER_OW"
        echo "[Step 4+/4] openai-whisper 完了。"
    else
        echo "[警告] openai-whisper のインストールに失敗しました。"
        echo "       faster-whisper が動いていれば問題ありません。"
    fi
    echo
else
    echo "[Step 4+/4] openai-whisper は導入済み。スキップ。"
    echo
fi

echo "================================================"
echo "   セットアップ完了！"
echo "   次回からは ./start.sh で起動できます。"
echo "================================================"
