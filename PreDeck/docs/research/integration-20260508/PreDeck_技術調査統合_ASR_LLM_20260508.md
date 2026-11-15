# PreDeck 技術調査統合版（ASR / LLM）

作成日: 2026-05-08  
対象: PreDeck（プレデキ）新規開発版  
統合対象: ローカル音声認識調査、ローカルLLM調査、最終技術選定・UI/UX設計決定書

---

## 0. 本書の位置付け

本書は、PreDeckの **ローカル音声認識（ASR）** と **ローカルLLM** に関する技術調査を統合した実装寄りの設計資料である。

統合時の優先順位は次の通り。

1. ローカル完結・外部送信禁止を優先する。
2. 添付原文にある候補・比較・リスク・実装案を欠落させない。
3. 外部確認できた事実と、PreDeck固有の推奨判断を分ける。
4. 実機検証前の性能値は「概算」「要検証」として扱う。

---

## 1. ASR選定

### 1.1 最終判断

| 用途 | 推奨エンジン | 採用判断 |
|---|---|---|
| MVPの正式文字起こし | faster-whisper | 第一候補 |
| 低スペックPC・配布安定性 | whisper.cpp | 代替候補 |
| リアルタイム字幕・声追従 | sherpa-onnx | Phase 2以降 |
| 日本語精度の追加検証 | FunASR / SenseVoice | 比較検証候補 |
| 軽量リアルタイム補助 | Vosk | 補助用途 |
| ローカル完結要件では不適 | Web Speech API | ローカル版では不採用 |
| ローカル完結要件では不適 | OpenAI API / Google / Azure等クラウドASR | ローカル版では不採用 |

### 1.2 faster-whisper

faster-whisper は、OpenAI Whisper を CTranslate2 上で高速実行する実装であり、Pythonから扱いやすいため FastAPI sidecar と相性が良い。

| 観点 | 評価 |
|---|---|
| ローカル完結 | ◎ |
| Python FastAPI sidecarとの相性 | ◎ |
| Windows配布 | ○ |
| 日本語認識 | ○〜◎ |
| 長尺音声 | ○ |
| タイムスタンプ | ◎ |
| リアルタイム性 | △ |
| 実装難易度 | ○ |

MVPでは録音完了後のバッチ文字起こしに使用する。

```python
from faster_whisper import WhisperModel

model = WhisperModel(
    "PreDeckData/models/faster-whisper-small",
    device="cpu",
    compute_type="int8",
)

segments, info = model.transcribe(
    audio_path,
    language="ja",
    beam_size=5,
    vad_filter=True,
    vad_parameters={"min_silence_duration_ms": 500},
    word_timestamps=True,
)
```

ローカル完結版では、モデル名指定による自動ダウンロードを禁止し、必ずローカルパスを指定する。

```python
# NG
WhisperModel("small")

# OK
WhisperModel("PreDeckData/models/faster-whisper-small")
```

### 1.3 whisper.cpp

whisper.cpp は Whisper の C/C++ 実装であり、Python依存を減らしたい場合やWindows配布安定性を優先する場合の代替候補にする。

| 観点 | 評価 |
|---|---|
| ローカル完結 | ◎ |
| Windows配布 | ◎ |
| Python依存なし | ◎ |
| FastAPI sidecarとの相性 | ○ |
| 日本語認識 | ○ |
| リアルタイム性 | △〜○ |
| 実装難易度 | △ |

実装方針:

```text
FastAPI sidecar
  └ AsrEngine interface
      ├ FasterWhisperEngine
      └ WhisperCppEngine
```

### 1.4 sherpa-onnx

sherpa-onnx は ONNX Runtime ベースの音声処理フレームワークであり、ASR、VAD、TTS、話者識別などをローカルで扱える。MVPの正式文字起こしではなく、Phase 2以降の声追従・リアルタイム補助に向ける。

用途:

- テレプロンプターの声追従
- 録音中の簡易リアルタイム字幕
- マイクテスト
- 音声区間検出
- 圧迫ピッチモードの即時応答

### 1.5 FunASR / SenseVoice

FunASR は ASR、VAD、句読点復元、話者分離などを含む音声処理ツールキットである。SenseVoice は日本語を含む多言語対応モデルとして比較候補になる。

PreDeckでの検証項目:

- 日本語プレゼン音声で faster-whisper と比較
- 句読点や短文分割の品質
- 日本語の固有名詞認識精度
- モデルライセンス
- 商用配布可否
- 同梱可否
- Windows配布難易度

### 1.6 Vosk

Vosk は軽量なオフライン音声認識エンジンであり、正式な本文文字起こしより補助機能に向く。

用途:

- マイクテスト
- 録音中の簡易字幕
- 音声コマンド
- 低スペックPC向け簡易モード

### 1.7 不採用: Web Speech API

Web Speech API はブラウザ実装依存が大きく、Windows/Tauri の WebView2/Edge 系ではクラウド音声認識に依存する可能性がある。Microsoft Edge 実装では Azure Cognitive Services が使われ、音声データが端末外に出ることが公式ドキュメントで確認できる。

PreDeckのローカル完結版では、Web Speech APIをローカルASRとして扱わない。

### 1.8 不採用: クラウドASR

OpenAI API、Google Speech、Azure Speech 等は、今回のローカル完結要件では不採用とする。

ただし、将来的にユーザーが明示的に許可する「クラウド高精度モード」として用意する余地はある。

```text
初期状態: クラウド音声認識 OFF
ローカルモード: 外部送信禁止
クラウド許可モード: ユーザーが明示的にONにした場合のみ利用
```

---

## 2. ASRアーキテクチャ

```text
Tauri 2
  └ React / TypeScript UI
      ├ 録音: MediaRecorder
      ├ 音量メーター
      ├ タイマー
      ├ 文字起こしジョブ投入
      └ SSEによる進捗表示

Python FastAPI sidecar
  ├ /api/asr/engines
  ├ /api/asr/models
  ├ /api/asr/transcribe
  ├ /api/asr/jobs/{job_id}
  ├ /api/asr/jobs/{job_id}/events
  └ ASR engines
      ├ faster-whisper
      ├ whisper.cpp wrapper
      ├ sherpa-onnx streaming
      └ FunASR optional
```

### 2.1 ASR API

```text
GET  /api/asr/engines
GET  /api/asr/models
POST /api/asr/models/import
POST /api/asr/transcribe
GET  /api/asr/jobs/{job_id}
GET  /api/asr/jobs/{job_id}/events
POST /api/asr/jobs/{job_id}/cancel
```

### 2.2 文字起こし開始リクエスト

```json
{
  "session_id": "s_001",
  "iteration_id": "it_001",
  "audio_path": "PreDeckData/recordings/s_001/it_001.webm",
  "engine": "faster_whisper",
  "model_id": "fw_small_ja",
  "language": "ja",
  "vad": true,
  "word_timestamps": true
}
```

### 2.3 完了レスポンス

```json
{
  "job_id": "job_001",
  "status": "completed",
  "transcript_id": "tr_001",
  "text": "本日は新規事業の提案について説明します。",
  "segments": [
    {
      "start_sec": 0.0,
      "end_sec": 3.2,
      "text": "本日は新規事業の提案について説明します。",
      "slide_index": 1
    }
  ]
}
```

---

## 3. ASRデータ設計

```sql
CREATE TABLE asr_models (
  id TEXT PRIMARY KEY,
  engine TEXT NOT NULL,
  model_name TEXT NOT NULL,
  local_path TEXT NOT NULL,
  language TEXT,
  size_bytes INTEGER,
  installed_at TEXT,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE asr_jobs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  iteration_id TEXT NOT NULL,
  engine TEXT NOT NULL,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL,
  progress REAL DEFAULT 0,
  error_message TEXT,
  started_at TEXT,
  finished_at TEXT
);

CREATE TABLE transcript_segments (
  id TEXT PRIMARY KEY,
  transcript_id TEXT NOT NULL,
  start_sec REAL NOT NULL,
  end_sec REAL NOT NULL,
  text TEXT NOT NULL,
  avg_logprob REAL,
  no_speech_prob REAL,
  compression_ratio REAL,
  slide_index INTEGER
);
```

---

## 4. LLM選定

### 4.1 最終判断

PreDeckのローカルLLMは、1モデルで全ユーザーに配布せず、PC性能に応じた段階構成にする。

| 採用区分 | 推奨モデル | 位置づけ |
|---|---|---|
| 標準モデル | Qwen3.5-9B | 研究者・起業家の一般的なノートPC向け標準 |
| 軽量フォールバック | Gemma 4 E4B または Bonsai-8B | 低スペックPC、無料体験、短文改善 |
| 高品質オプション | Gemma 4 26B-A4B | 上位ユーザー、32GB RAM以上、GPU搭載PC向け |
| 推論・論理補助 | gpt-oss-20b | 圧迫質問、論理診断、チェックリスト補助 |
| 上級オプション | Qwen3.6-35B-A3B / Gemma 4 31B | S4以上の高性能PC向け |
| 非推奨: 標準搭載 | Llama 4 Scout / Maverick、Llama 3.3 70B | 一般ノートPC配布には重い |

### 4.2 重要な評価軸

| 評価軸 | 重要度 | 内容 |
|---|---:|---|
| 日本語原稿改善 | 高 | 口語の自然化、フィラー除去、弱気表現の言い換え |
| 論理構造診断 | 高 | 問題提起、WHY、根拠、CTA、ストーリーアーク |
| 指示追従 | 高 | 5分に短縮、VC向け、差分JSONなど |
| 英語変換 | 中〜高 | VC English、Academic English、Speakable English |
| 長文コンテキスト | 中〜高 | スライド全体、文字起こし、過去イテレーション |
| ローカル実行性 | 高 | MacBook Air/Pro、Windowsノートで動作すること |
| ライセンス | 高 | 商用アプリに組み込みやすいこと |
| マルチモーダル | 中 | 将来的なスライド画像、PDF、図表理解 |

---

## 5. PCクラス定義

| PCクラス | 想定ユーザー / 端末 | RAM / Unified Memory | VRAM | ストレージ空き | PreDeckでの扱い |
|---|---|---:|---:|---:|---|
| S0 | 古い事務用PC、メモリ不足端末 | 8GB未満 | なし〜4GB未満 | 10GB未満 | ローカルLLMを無理に使わせず、BYOK/APIへ誘導 |
| S1 | 一般的な薄型ノート、MacBook Air相当 | 8〜16GB | なし〜6GB | 10〜30GB | Free/Lite、1スライド改善、短文リライト |
| S2 | 標準的な仕事用ノートPC | 16〜32GB | 8〜12GB、またはApple Silicon 16〜24GB | 30〜80GB | PreDeck標準体験 |
| S3 | ProノートPC、GPUノート | 32〜64GB | 12〜16GB以上 | 80〜150GB | Smart/DIY上位、高品質診断 |
| S4 | モバイルワークステーション | 64GB以上 | 24GB以上 | 150GB以上 | 上級者・研究室・Enterprise前段 |
| S5 | サーバー/据置ワークステーション | 128GB以上 | 48GB以上 | 300GB以上 | Enterprise/検証用途 |

---

## 6. PCクラス別推奨モデル

| PCクラス | 主推奨モデル | 使用可能モデル | 避けるべきモデル | 推奨機能範囲 |
|---|---|---|---|---|
| S0 | なし | なし | ほぼ全ローカルLLM | ローカルLLM OFF、BYOK / Managed AI |
| S1 | Gemma 4 E4B / Bonsai-8B | Phi-4-mini-reasoning | Qwen3.5-9B以上、gpt-oss-20b以上 | 1スライド改善、フィラー除去、弱気表現検出 |
| S2 | Qwen3.5-9B | Phi-4 14B、DeepSeek-R1-Distill-Qwen-14B、gpt-oss-20b短文運用 | Gemma 4 31B、Qwen3.6-35B、Llama 70B以上 | 標準機能。原稿改善、構造診断、英語変換 |
| S3 | Gemma 4 26B-A4B / gpt-oss-20b | Qwen3.5-9B高速運用、Mistral Small 3.2 24B | Llama 4系、Llama 70B標準運用 | 高品質診断、勝率スコア補助、英語文化適応 |
| S4 | Qwen3.6-35B-A3B / Gemma 4 31B | Gemma 4 26B-A4B、Mistral Small 3.2、Llama 3.3 70B Q4 | Llama 4 Maverick | 高度な構造診断、研究発表レビュー |
| S5 | Llama 4 Scout / Maverick等 | Llama 3.3 70B、gpt-oss-120b級 | なし | Enterprise、研究室サーバー |

---

## 7. 主要LLM比較

メモリ・VRAM目安は、主にQ4量子化、8K〜32K程度の実用コンテキストを前提にした概算である。128K以上の長文コンテキストではKVキャッシュにより必要メモリが増える。

| モデル | 開発元 | ライセンス | 規模 / 構造 | コンテキスト | 推奨PC | PreDeck適性 |
|---|---|---|---|---:|---|---|
| Qwen3.5-9B | Alibaba / Qwen | Apache 2.0 | 9B | 262K、YaRNで最大1.01M | S2 / S3 | 最有力標準。日本語・英語・構造改善・長文・画像理解のバランス |
| Gemma 4 E4B | Google DeepMind | Apache 2.0 | 8B total / 4.5B effective | 128K | S1 / S2 | 軽量モード。短文改善、1スライド改善 |
| Bonsai-8B 1bit | PrismML | Apache 2.0 | 8B、1-bit | 約65K | S1 | 超軽量フォールバック。品質は標準にはしない |
| gpt-oss-20b | OpenAI | Apache 2.0 | 21B total / 3.6B active MoE | 128K | S3、S2短文 | 推論・診断補助。圧迫質問、論理チェック |
| Phi-4 14B | Microsoft | MIT | 14B Dense | 16K | S2 / S3 | 研究者向け論理・数理補助。標準改善AIにはしない |
| Phi-4-mini-reasoning | Microsoft | MIT | 3.8B | 128K | S1 / S2 | 数学・論理補助。汎用改善AIにはしない |
| Gemma 4 26B-A4B | Google DeepMind | Apache 2.0 | 25.2B total / 3.8B active MoE | 256K | S3 | 高品質ローカルオプション |
| Gemma 4 31B | Google DeepMind | Apache 2.0 | 30.7B Dense | 256K | S4 | 上位PC向け。標準配布には重い |
| Qwen3.6-35B-A3B | Alibaba / Qwen | Apache 2.0 | 35B級 / 3B active級 MoE | 262K、最大1.01M | S4 | 上位版、高度診断・想定問答 |
| Mistral Small 3.2 24B | Mistral AI | Apache 2.0 | 24B Dense | 128K | S3 | 英語・欧州言語・関数呼び出し向け |
| DeepSeek-R1-Distill-Qwen-14B | DeepSeek | MIT | 14B Dense distill | 実装依存 | S2 / S3 | 想定質問・反論生成。原稿改善では冗長に注意 |
| Llama 4 Scout | Meta | Llama 4 Community License | 109B total / 17B active MoE | 10M | S5 | 一般ノートPC標準には不向き |
| Llama 4 Maverick | Meta | Llama 4 Community License | 400B total / 17B active MoE | 1M | S5 | サーバー専用。標準搭載対象外 |
| Llama 3.3 70B | Meta | Llama License | 70B Dense | 128K級 | S4〜S5 | 重い。新規標準採用ではQwen/Gemma優先 |

---

## 8. LLM実装方針

### 8.1 実行系

| 実行環境 | 推奨 |
|---|---|
| Windows + NVIDIA GPU | Ollama / LM Studio / llama.cpp CUDA |
| Mac Apple Silicon | MLX / Ollama / llama.cpp Metal |
| CPU中心 | llama.cpp GGUF。Qwen3.5-9Bは重いためBonsaiまたはGemma E4B優先 |
| 将来のサーバー版 | vLLM / SGLang |

### 8.2 コンテキスト設計

長文コンテキストを持つモデルでも、PreDeckでは全量投入を避ける。

```text
現在スライド原稿: 詳細入力
前後スライド: 要約入力
全体構成: JSON要約
過去イテレーション: 弱点・スコア履歴のみ
録音文字起こし: 現在セッション部分のみ
```

理由:

- 262Kや1MコンテキストはKVキャッシュでメモリを消費する。
- 一般ユーザーPCでは8K〜32Kに抑えた方が安定する。
- PreDeckでは「全量投入」より「スライド単位 + 全体要約」の方がUXが良い。

### 8.3 JSON Schema出力

```json
{
  "improved_script": "...",
  "changes": [
    {"type": "delete_filler", "before": "えー", "after": ""},
    {"type": "strengthen_claim", "before": "だと思います", "after": "です"}
  ],
  "structure_diagnosis": {
    "problem_clarity": 4,
    "why_strength": 3,
    "evidence_density": 2,
    "cta_clarity": 3
  },
  "priority_actions": [
    "市場規模の根拠を1つ追加",
    "冒頭で結論を先に述べる"
  ]
}
```

---

## 9. 設定画面

### 9.1 ASR設定

| 設定 | 値 |
|---|---|
| 音声認識モード | ローカルのみ / クラウド許可 |
| ASRエンジン | faster-whisper / whisper.cpp / sherpa-onnx / FunASR |
| モデル | small / medium / large-v3 / turbo / custom |
| 実行デバイス | auto / cpu / cuda |
| compute type | int8 / int8_float16 / float16 / float32 |
| 言語 | 日本語 / 英語 / 自動判定 |
| VAD | on / off |
| 単語タイムスタンプ | on / off |
| モデル保存先 | PreDeckData/models/ |
| 自動ダウンロード | ローカル版では off |
| クラウド音声認識 | ローカル版では off |

### 9.2 LLM設定

```text
AIモデル設定

[自動選択 推奨]
  PC性能を見て自動で選びます

[軽量]
  Gemma 4 E4B / Bonsai-8B
  低スペックPC向け。短い原稿改善に最適。

[標準]
  Qwen3.5-9B
  推奨。原稿改善、構造診断、英語変換に対応。

[高品質]
  Gemma 4 26B-A4B
  高性能PC向け。スライド全体診断に最適。

[推論診断]
  gpt-oss-20b
  圧迫質問、論理チェック、想定反論生成に使用。
```

---

## 10. PreDeck独自ベンチマーク

第三者ベンチマークだけではPreDeck品質を判断できないため、独自評価セットを作る。

| 評価セット | 内容 | 評価指標 |
|---|---|---|
| 日本語VCピッチ10本 | 起業家向け3〜5分原稿 | 論理、説得力、短縮品質、弱気表現除去 |
| 学会発表10本 | 研究背景、方法、結果、考察 | 正確性、専門性、簡潔性 |
| 英語変換10本 | 日本語原稿→VC English / Academic English | 文化適応、話しやすさ、自然さ |
| 圧迫質問生成20本 | 市場規模、競合、技術優位性など | 質問の鋭さ、重複の少なさ |
| JSON安定性100件 | 決めたSchemaで返せるか | パース成功率、再試行率 |

推奨評価指標:

```text
- 改善後原稿の人間評価: 5段階
- 指定時間内に収まる率
- JSON parse成功率
- 弱気表現検出F1
- フィラー削除精度
- 起業家/研究者による好み評価
```

---

## 11. 外部確認ソース

- Tauri 2.0 Stable Release: https://v2.tauri.app/blog/tauri-20/ — Tauri 2 が正式リリース済みであること。
- Tauri Windows Installer: https://v2.tauri.app/distribute/windows-installer/ — Windows 向け MSI ビルド要件と配布方式。
- React 19.2 Release: https://react.dev/blog/2025/10/01/react-19-2 — React 19 系が利用可能であること。
- Tailwind CSS v4.0: https://tailwindcss.com/blog/tailwindcss-v4 — Tailwind CSS v4 系が正式リリース済みであること。
- faster-whisper GitHub: https://github.com/SYSTRAN/faster-whisper — faster-whisper が CTranslate2 ベースの Whisper 実装であること。
- OpenAI Whisper GitHub: https://github.com/openai/whisper — Whisper / large-v3 / turbo の存在。
- whisper.cpp GitHub: https://github.com/ggml-org/whisper.cpp — Whisper の C/C++ 実装、量子化、Windows 対応。
- Microsoft Edge SpeechRecognitionEnabled policy: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/speechrecognitionenabled — Edge の Web Speech API 実装では Azure Cognitive Services が使われ、音声データが端末外に出ること。
- Web Speech API MDN: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API — Web Speech API の概要。ブラウザ実装依存であること。
- sherpa-onnx GitHub: https://github.com/k2-fsa/sherpa-onnx — ONNX ベースの音声処理、オフライン ASR/ストリーミング用途。
- FunASR GitHub: https://github.com/modelscope/FunASR — ASR、VAD、句読点復元、話者関連機能を含む音声処理ツールキット。
- Vosk API GitHub: https://github.com/alphacep/vosk-api — オフライン音声認識、軽量モデル、ストリーミング対応。
- Ollama Docs: https://docs.ollama.com/ — ローカル LLM 実行・API 連携の実装候補。
- Ollama New App: https://ollama.com/blog/new-app — Windows/macOS 向け GUI アプリの提供。
- Qwen3.5-9B Hugging Face: https://huggingface.co/Qwen/Qwen3.5-9B — Qwen3.5-9B の存在、Apache 2.0、Transformers/vLLM/SGLang 互換。
- Qwen3.6-35B-A3B Hugging Face: https://huggingface.co/Qwen/Qwen3.6-35B-A3B — Qwen3.6-35B-A3B の存在。
- Gemma 4 Model Card: https://ai.google.dev/gemma/docs/core/model_card_4 — Gemma 4 E2B/E4B/26B-A4B/31B、Apache 2.0、コンテキスト、モダリティ。
- Gemma 4 26B-A4B Hugging Face: https://huggingface.co/google/gemma-4-26B-A4B — Gemma 4 26B-A4B のモデルカード。
- OpenAI Introducing gpt-oss: https://openai.com/index/introducing-gpt-oss/ — gpt-oss 系が Apache 2.0 で公開され、ローカル実行向けであること。
- openai/gpt-oss-20b Hugging Face: https://huggingface.co/openai/gpt-oss-20b — gpt-oss-20b のモデルカード、Apache 2.0。
- PrismML Bonsai-8B Hugging Face: https://huggingface.co/prism-ml/Bonsai-8B-mlx-1bit — Bonsai-8B 1bit、Apache 2.0、Apple Silicon/MLX、サイズ情報。
---

## 16. サブスク配布におけるライセンス評価

作成日: 2026-05-08  
対象: PreDeck を有料サブスクリプション型デスクトップアプリとして配布する場合の技術要件ライセンス確認  
前提: 本節は技術選定上のライセンスリスク整理であり、最終的な法的判断は弁護士・知財担当による確認を行う。

### 16.1 結論

PreDeck は、現在の技術方針で **サブスク配布は概ね可能**である。  
ただし、以下の5点はそのまま同梱・商用配布するとリスクがあるため、正式リリース前に対応を必須とする。

| 区分 | 判断 | 理由 | 対応方針 |
|---|---|---|---|
| PyMuPDF | **要注意 / 原則避けるか商用ライセンス** | PyMuPDF / MuPDF は AGPL または商用ライセンス。クローズドソースのサブスクアプリに組み込む場合、AGPL条件を満たせない可能性が高い。 | PDF処理は別ライブラリへ変更、または Artifex 商用ライセンスを取得する。 |
| FFmpeg | **条件付き可** | FFmpeg は原則 LGPL だが、GPL / nonfree オプションを有効化したビルドは配布条件が大きく変わる。 | LGPLビルドのみ使用。`--enable-gpl`、`--enable-nonfree`、GPL系コーデック同梱を避ける。ライセンス表示と差し替え可能性を確保する。 |
| LibreOffice headless | **条件付き可** | LibreOffice は MPL v2 / LGPL v3+ 系。商用利用自体は可能だが、同梱・改変・再配布時の通知義務とライセンス文書同梱が必要。 | 可能ならユーザー環境のLibreOfficeを利用。アプリに同梱する場合はライセンス文書、NOTICE、改変有無管理を行う。 |
| FunASR / SenseVoice | **標準同梱は保留** | ツール本体と各モデルでライセンスが分かれる。モデルごとに商用利用・再配布・同梱可否を確認する必要がある。 | 比較検証候補に留め、標準同梱前にモデル単位でライセンス台帳を作る。 |
| Llama 4系 | **標準同梱非推奨** | Llama 4 Community License は Apache/MIT ではなく、追加条件・利用制限・地域制限等がある。 | Enterprise / 研究室サーバーなど個別契約・個別確認枠に限定する。 |

したがって、PreDeck のサブスク配布における安全な初期構成は次の通りとする。

```text
安全な初期配布構成:
  Desktop: Tauri 2 + React + TypeScript + Vite
  UI: Tailwind CSS v4 + shadcn/ui + lucide-react
  State: Zustand + TanStack Query
  Backend: Python FastAPI sidecar
  DB: SQLite + SQLModel / SQLAlchemy
  ASR: faster-whisper + OpenAI Whisper系モデル、または whisper.cpp
  LLM Runtime: Ollama / llama.cpp
  LLM Models: Qwen3.5-9B, Gemma 4 E4B, Gemma 4 26B-A4B, gpt-oss-20b, Bonsai-8B のうち Apache 2.0 / MIT 確認済みモデル
  PDF/PPTX: PyMuPDFは避ける。LibreOffice同梱は条件付き。PowerPointはユーザー所有インストールを利用。
```

### 16.2 フロントエンド / デスクトップ基盤

| 技術 | 確認ライセンス | サブスク配布判断 | 必要対応 |
|---|---|---|---|
| Tauri 2 | MIT / Apache 2.0系 | **可** | ライセンス文書・NOTICEを同梱。 |
| React | MIT | **可** | 著作権表示・ライセンス文書を同梱。 |
| TypeScript | Apache 2.0 | **可** | ライセンス文書を同梱。 |
| Vite | MIT | **可** | ライセンス文書を同梱。 |
| Tailwind CSS v4 | MIT | **可** | ライセンス文書を同梱。Tailwind Plus / Tailwind UI を使う場合は別途有償ライセンスを確認。 |
| shadcn/ui | MIT | **可** | コピーしたコンポーネントもライセンス表示対象として管理。 |
| lucide-react | ISC | **可** | 著作権表示・ライセンス文書を同梱。 |
| Zustand | MIT | **可** | ライセンス文書を同梱。 |
| TanStack Query | MIT | **可** | ライセンス文書を同梱。 |
| React Hook Form | MIT | **可** | ライセンス文書を同梱。 |
| Zod | MIT | **可** | ライセンス文書を同梱。 |
| Recharts | MIT | **可** | ライセンス文書を同梱。 |
| diff-match-patch | Apache 2.0 | **可** | ライセンス文書・NOTICEがあれば保持。 |
| jsdiff | BSD 3-Clause | **可** | 著作権表示、ライセンス、名称利用制限を遵守。 |
| TipTap OSS | MIT | **可** | OSS部分のみ利用。Tiptap Cloud / Pro / AI系の有償機能は別契約。 |
| sonner | MIT | **可** | ライセンス文書を同梱。 |
| hotkeys-js | MIT | **可** | ライセンス文書を同梱。 |

### 16.3 バックエンド / DB / 配布ツール

| 技術 | 確認ライセンス | サブスク配布判断 | 必要対応 |
|---|---|---|---|
| FastAPI | MIT | **可** | ライセンス文書を同梱。 |
| SQLModel | MIT | **可** | ライセンス文書を同梱。 |
| SQLAlchemy | MIT | **可** | ライセンス文書を同梱。 |
| SQLite | Public Domain | **可** | ライセンス不要だが、企業法務上はSQLiteのpublic domain説明または保証文書購入要否を確認。 |
| PyInstaller | GPL 2.0 + 商用利用を許す例外 / 一部Apache 2.0 | **可** | PyInstallerで商用製品をビルドできる例外がある。ただし同梱される依存物のライセンスは別途管理。 |
| Nuitka | AGPLv3 + runtime exception / 商用ライセンスあり | **要確認** | 初期は PyInstaller 優先。Nuitka採用時は runtime exception と商用ライセンス要否を確認する。 |
| FFmpeg | LGPL 2.1+中心、GPL部品あり、nonfreeあり | **条件付き可** | LGPLビルドのみ採用。GPL/nonfree有効ビルド、x264/x265等のGPL系同梱、特許コーデック利用を避ける。 |
| LibreOffice headless | MPL v2 / LGPL v3+ | **条件付き可** | 同梱する場合はライセンス文書・NOTICE・改変管理。可能ならユーザー環境の既存インストールを使う。 |
| PowerPoint連携 | Microsoft Officeのユーザーライセンスに依存 | **条件付き可** | PowerPoint本体・Office素材・フォント等をPreDeckに同梱しない。ユーザーが正規ライセンスでインストール済みのOfficeを自動操作する設計にする。 |
| PyMuPDF | AGPL / 商用ライセンス | **原則非推奨** | クローズドソースのサブスクアプリに組み込むなら Artifex 商用ライセンスを取得。代替PDF処理を優先検討。 |

### 16.4 ASR / 音声認識

| 技術 / モデル | 確認ライセンス | サブスク配布判断 | 必要対応 |
|---|---|---|---|
| faster-whisper | MIT | **可** | ライセンス文書を同梱。依存する CTranslate2 もMIT。 |
| CTranslate2 | MIT | **可** | ライセンス文書を同梱。 |
| OpenAI Whisper OSS / Whisper weights | MIT | **可** | ライセンス文書を同梱。モデルをローカル同梱する場合はモデル配布元を固定する。 |
| whisper.cpp | MIT | **可** | ライセンス文書を同梱。GGUF等の変換済みモデルは変換元ライセンスも確認。 |
| sherpa-onnx | Apache 2.0 | **可** | ライセンス文書・NOTICEを同梱。使用するONNXモデルごとのライセンスを確認。 |
| Vosk API | Apache 2.0 | **可** | API本体は可。使用するVoskモデルごとのライセンス・再配布可否を確認。 |
| FunASR | Apache 2.0系として確認対象 | **条件付き可** | 本体だけでなく、SenseVoice等を含む各モデルのライセンス・再配布可否をモデル単位で確認する。 |
| Web Speech API | ブラウザAPI。実装依存 | **ローカル完結版では不採用** | ライセンス問題よりも外部送信リスクが問題。MDNでは一部ブラウザでサーバーベース認識、EdgeではAzure Cognitive Services利用が明記されている。 |
| OpenAI API / Google Speech / Azure Speech | 各社API規約 | **クラウド許可モードのみ可** | 音声・原稿の外部送信についてユーザーの明示同意、利用規約、データ処理契約、ログを整備する。 |

### 16.5 ローカルLLM / 推論ランタイム / モデル

| 技術 / モデル | 確認ライセンス | サブスク配布判断 | 必要対応 |
|---|---|---|---|
| Ollama | MIT | **可** | Ollama本体とモデルを分けて管理。Ollamaで取得する各モデルのライセンスをモデル単位で確認。 |
| llama.cpp | MIT | **可** | ライセンス文書を同梱。GGUFモデルは元モデルのライセンスを継承するため個別確認。 |
| Qwen3.5-9B | Apache 2.0 | **可** | 標準LLM候補として可。量子化版・ミラー配布版は配布元と変換元のライセンスを確認。 |
| Qwen3.6-35B-A3B | Apache 2.0 | **可** | 上級LLM候補として可。高スペックPC向け。 |
| Gemma 4 E4B / 26B-A4B / 31B | Apache 2.0 | **可** | 軽量・高品質候補として可。モデルカードの利用制限・安全注意をUIと規約に反映。 |
| gpt-oss-20b | Apache 2.0 | **可** | 推論診断候補として可。OpenAI公式モデルカードとHugging Face配布物を参照する。 |
| Bonsai-8B 1bit | Apache 2.0 | **可** | 超軽量候補として可。PrismMLのMLX/llama.cpp fork等、実行に必要な派生ランタイムのライセンスも確認。 |
| Phi-4 / Phi-4-mini-reasoning | MIT | **可** | 研究・論理補助候補として可。ただし日本語改善品質は実機評価が必要。 |
| Mistral Small 3.2 24B | Apache 2.0 | **可** | 英語・関数呼び出し候補として可。サイズが重いため標準同梱は避ける。 |
| DeepSeek-R1-Distill-Qwen-14B | MIT | **可** | 推論・想定質問候補として可。ただし出力冗長性と日本語混在は実機評価が必要。 |
| Llama 4 Scout / Maverick | Llama 4 Community License | **標準同梱非推奨** | Apache/MITではない。追加商用条件、利用制限、地域制限等を確認し、Enterprise個別枠に限定する。 |

### 16.6 サブスク配布時の必須運用

1. **OSSライセンス台帳を作る**  
   `package.json`、`pyproject.toml`、`requirements.txt`、Rust crate、sidecar同梱物、モデルファイルを対象に、名称・バージョン・ライセンス・配布元URL・同梱有無を管理する。

2. **アプリ内にライセンス表示画面を用意する**  
   設定画面に「オープンソースライセンス」を設け、MIT / Apache / BSD / ISC / LGPL / MPL 等のライセンス全文と著作権表示を表示できるようにする。

3. **インストーラーに `THIRD_PARTY_NOTICES.md` を同梱する**  
   Windows `.msi` に、第三者OSS、モデル、フォント、アイコン、同梱バイナリのライセンス文書を入れる。

4. **モデルレジストリ方式にする**  
   モデルID、配布元、ライセンス、商用利用可否、再配布可否、同梱可否、最終確認日をSQLiteまたはJSONで管理する。

5. **クラウドAPIは既定OFFにする**  
   OpenAI API、Gemini API、Azure Speech、Google Speech等は、サブスクプランに含める場合でも、Strict Local Modeでは使わない。ユーザーが明示的に有効化した場合のみ、送信対象データ・送信先・課金・保存方針を表示する。

6. **PyMuPDFは初期採用から外す**  
   PDF処理が必要な場合は、まずライセンス上扱いやすい代替を検討する。PyMuPDFが必要な場合は、商用ライセンス取得を前提にする。

7. **FFmpegは配布ビルドを固定する**  
   自社で使用するFFmpegバイナリの `ffmpeg -version` 出力を保存し、`License: LGPL` であること、`--enable-gpl` / `--enable-nonfree` がないことをリリースごとに確認する。

8. **Office / PowerPointを同梱しない**  
   PowerPoint連携は、ユーザーが正規にインストール済みのOfficeを操作する方式に限定する。Office本体、テンプレート、フォント、アイコン、素材の再配布は行わない。

### 16.7 最終判断

PreDeck は、**MIT / Apache 2.0 / BSD / ISC / Public Domain 中心の構成に寄せれば、サブスク型デスクトップアプリとして配布可能**である。  
初期MVPでは、以下をライセンス上の正式方針とする。

```text
正式方針:
  - PyMuPDFは使わない、または商用ライセンス取得まで同梱しない
  - FFmpegはLGPLビルドのみ許可
  - LibreOfficeは同梱せず、ユーザー環境利用を優先
  - ASRは faster-whisper / whisper.cpp / sherpa-onnx / Vosk を中心にする
  - LLMは Apache 2.0 / MIT 確認済みモデルだけを標準モデルにする
  - Llama 4系は標準同梱しない
  - Web Speech APIとクラウドASR/LLMはStrict Local Modeでは使わない
  - アプリ内ライセンス表示とTHIRD_PARTY_NOTICESを必ず実装する
```



### 16.8 採用決定: ライセンス安全版の配布予定構成

本設計では、PreDeck のサブスク型デスクトップアプリ配布において、ライセンス違反リスクを避けるため、以下の **ライセンス安全版構成** を正式な配布予定構成として採用する。

この採用決定は、以下の前提に基づく。

- クローズドソースの商用サブスクアプリとして配布する。
- ユーザーのローカルPCで動作するデスクトップアプリを主対象にする。
- Strict Local Mode では、音声・原稿・スライド・分析データを外部APIへ送信しない。
- 同梱するOSS、モデル、バイナリ、フォント、アイコンについて、ライセンス表記と第三者通知を行う。
- GPL / AGPL / nonfree 条件により、クローズドソース配布と衝突し得るものは標準同梱しない。

#### 16.8.1 正式採用する配布予定構成

```text
Desktop Runtime:
  - Tauri 2

Frontend:
  - React + TypeScript + Vite
  - Tailwind CSS
  - shadcn/ui
  - lucide-react

State / Data Fetching / Form:
  - Zustand
  - TanStack Query
  - React Hook Form
  - Zod

Backend Sidecar:
  - Python FastAPI
  - SQLite
  - SQLModel または SQLAlchemy

Packaging:
  - Windows .msi 先行
  - Python sidecar は PyInstaller または Nuitka で検証

ASR:
  - faster-whisper を標準
  - whisper.cpp を代替候補
  - sherpa-onnx は将来リアルタイム用途
  - Vosk は軽量補助用途

LLM Runtime:
  - Ollama
  - llama.cpp
  - Mac では MLX も候補

Local LLM Models:
  - Qwen3.5-9B
  - Gemma 4 E4B
  - Gemma 4 26B-A4B
  - gpt-oss-20b
  - Bonsai-8B

PDF / PPTX / Media:
  - PDFの基本処理は pypdf 中心
  - FFmpeg は LGPL ビルドのみ許可
  - LibreOffice は原則同梱せず、ユーザー環境の既存インストールを検出
  - PowerPoint 本体は同梱せず、ユーザーの正規インストール済み環境と連携

Compliance:
  - THIRD_PARTY_NOTICES.md を同梱
  - licenses/ フォルダを同梱
  - アプリ内に「オープンソースライセンス」画面を設置
  - モデルレジストリにライセンス・取得元・同梱可否・確認日を記録
```

#### 16.8.2 標準配布から除外するもの

以下は、ライセンス違反または利用条件違反のリスクを避けるため、PreDeck の標準配布構成には含めない。

| 対象 | 標準配布判断 | 理由 | 代替方針 |
|---|---|---|---|
| PyMuPDF 無償版 | 除外 | AGPLまたは商用ライセンス前提。クローズドソース配布と衝突し得る | pypdfを優先。必要ならPyMuPDF商用ライセンスを取得 |
| GPL有効FFmpeg | 除外 | GPL条件がアプリ配布方針と衝突し得る | LGPLビルドのみ使用 |
| nonfree有効FFmpeg | 除外 | 再配布に不向き | nonfreeなしのLGPLビルドに固定 |
| LibreOffice同梱 | 原則除外 | 同梱配布時の通知・ライセンス・更新管理が重い | ユーザー環境のLibreOfficeを検出して利用 |
| Microsoft Office / PowerPoint本体 | 除外 | Microsoft製品の再配布不可 | ユーザーの正規インストール済みOfficeと連携 |
| Web Speech API | 除外 | ブラウザ実装により外部送信を排除できず、Strict Local Modeに合わない | faster-whisper / whisper.cppを使用 |
| OpenAI API / Google Speech / Azure Speech | Strict Local Modeでは除外 | ユーザーデータを外部送信するため | ユーザーが明示許可したクラウド許可モードのみ |
| Llama 4系 | 標準同梱しない | Community Licenseの追加条件があり、Apache 2.0系より管理リスクが高い | Qwen / Gemma / gpt-oss / Bonsaiを優先 |
| FunASR / SenseVoice | 標準同梱保留 | モデル単位のライセンス・再配布可否確認が必要 | 比較検証候補に留める |
| ライセンス未確認モデル | 除外 | モデル配布・商用利用・再配布条件が未確定 | モデルレジストリで確認後に追加 |

#### 16.8.3 条件付き採用するもの

| 対象 | 採用条件 |
|---|---|
| FFmpeg | `--enable-gpl` と `--enable-nonfree` を含まない LGPL ビルドに限定する。リリースごとに `ffmpeg -version` を保存する。 |
| LibreOffice headless | 原則として同梱しない。ユーザー環境にインストール済みの場合のみ検出して利用する。将来同梱する場合は、MPL / LGPL に基づく通知・ライセンス文・更新方針を整理する。 |
| PyMuPDF | 標準では使わない。必要になった場合は商用ライセンス取得後に採用する。 |
| クラウドAI / クラウドASR | Strict Local Modeでは無効。ユーザーが明示的にONにした場合のみ、送信データ、送信先、保存方針、課金、API利用規約を表示して利用する。 |
| Llama系モデル | Llama 4系は標準同梱しない。Enterprise個別案件で、利用条件・ユーザー数・売上条件・再配布条件を確認した場合のみ検討する。 |

#### 16.8.4 採用しない代わりの実装案

| 機能領域 | 危険または重い候補 | 採用する代替案 |
|---|---|---|
| PDFテキスト抽出 | PyMuPDF | pypdf |
| PDF画像化 | PyMuPDF | PDFium系、Poppler系、または外部ツール分離を検討 |
| 音声変換 | GPL/nonfree FFmpeg | LGPL FFmpegビルド |
| PPTX変換 | LibreOffice同梱 | ユーザー環境のLibreOffice検出、PowerPoint連携、または画像/PDF入力優先 |
| 標準ASR | Web Speech API / OpenAI API | faster-whisper |
| 軽量ASR | Web Speech API | whisper.cpp / Vosk |
| リアルタイムASR | Web Speech API | sherpa-onnx |
| 標準LLM | Llama 4系 | Qwen3.5-9B |
| 軽量LLM | ライセンス未確認モデル | Gemma 4 E4B / Bonsai-8B |
| 高品質LLM | Llama 70B / Llama 4 | Gemma 4 26B-A4B / gpt-oss-20b |

#### 16.8.5 リリース前必須チェックリスト

PreDeck をサブスク配布する前に、以下をリリースゲートにする。

- [ ] `THIRD_PARTY_NOTICES.md` を作成し、インストーラーに同梱する。
- [ ] `licenses/` フォルダに、OSSとモデルのライセンス全文を同梱する。
- [ ] npm依存のライセンス一覧を生成し、GPL / AGPL / commercial / unknown を検出する。
- [ ] Python依存のライセンス一覧を生成し、GPL / AGPL / commercial / unknown を検出する。
- [ ] 同梱バイナリ一覧を作成する。
- [ ] FFmpegを同梱する場合は、LGPLビルドであることを `ffmpeg -version` で確認する。
- [ ] PyMuPDFが依存関係に入っていないことを確認する。入る場合は商用ライセンス取得状況を記録する。
- [ ] モデルレジストリに、モデル名、配布元、ライセンス、商用利用可否、再配布可否、同梱可否、確認日を記録する。
- [ ] Llama 4系、FunASR / SenseVoice、その他未確認モデルが標準同梱に入っていないことを確認する。
- [ ] Strict Local Modeで外部通信が発生しないことをテストする。
- [ ] クラウドAI / クラウドASRは、ユーザー明示許可時のみ有効化されることを確認する。
- [ ] アプリ内の「オープンソースライセンス」画面から第三者ライセンスを確認できるようにする。

#### 16.8.6 最終採用文

PreDeck のサブスク配布では、上記の **ライセンス安全版構成** を正式採用する。  
この構成では、標準同梱物を MIT / Apache 2.0 / BSD / ISC / Public Domain および条件整理済みの LGPL / MPL 系に限定し、GPL / AGPL / nonfree / ライセンス未確認モデルを標準配布から除外する。

したがって、初期MVPの配布予定構成は以下とする。

```text
PreDeck MVP 配布予定構成:
  - ローカルファーストのTauriデスクトップアプリ
  - React + TypeScript + Vite フロントエンド
  - Python FastAPI sidecar
  - SQLite + ローカルファイル保存
  - ASRは faster-whisper 標準、whisper.cpp 代替
  - LLMは Ollama / llama.cpp 経由で Qwen / Gemma / gpt-oss / Bonsai を利用
  - PDFは pypdf 中心
  - FFmpegはLGPLビルドのみ
  - PyMuPDF、GPL/nonfree FFmpeg、Llama 4系、ライセンス未確認モデルは標準同梱しない
  - クラウドAPIはStrict Local ModeではOFF、ユーザー明示許可時のみON
  - THIRD_PARTY_NOTICES.md、licenses/、アプリ内ライセンス画面を必須実装
```

この方針を、PreDeck の初期MVPおよびサブスク配布時のライセンス前提として固定する。

### 追加確認ソース: ライセンス

- Tauri GitHub License: https://github.com/tauri-apps/tauri
- React GitHub License: https://github.com/facebook/react/blob/main/LICENSE
- TypeScript GitHub License: https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt
- Vite GitHub License: https://github.com/vitejs/vite/blob/main/LICENSE
- Tailwind CSS GitHub License: https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE
- shadcn/ui GitHub License: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md
- Lucide License: https://lucide.dev/license
- Zustand GitHub License: https://github.com/pmndrs/zustand/blob/main/LICENSE
- TanStack Query GitHub License: https://github.com/TanStack/query/blob/main/LICENSE
- FastAPI GitHub License: https://github.com/fastapi/fastapi/blob/master/LICENSE
- SQLModel GitHub License: https://github.com/fastapi/sqlmodel/blob/main/LICENSE
- SQLAlchemy GitHub License: https://github.com/sqlalchemy/sqlalchemy/blob/main/LICENSE
- SQLite Copyright: https://sqlite.org/copyright.html
- PyInstaller License: https://pyinstaller.org/en/stable/license.html
- Nuitka GitHub License note: https://github.com/Nuitka/Nuitka
- FFmpeg Legal: https://ffmpeg.org/legal.html
- PyMuPDF License and Copyright: https://pymupdf.readthedocs.io/en/latest/about.html
- LibreOffice Licenses: https://www.libreoffice.org/about-us/licenses/
- faster-whisper GitHub License: https://github.com/SYSTRAN/faster-whisper/blob/master/LICENSE
- CTranslate2 GitHub License: https://github.com/OpenNMT/CTranslate2/blob/master/LICENSE
- OpenAI Whisper GitHub License: https://github.com/openai/whisper/blob/main/LICENSE
- whisper.cpp GitHub License: https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE
- sherpa-onnx GitHub License: https://github.com/k2-fsa/sherpa-onnx/blob/master/LICENSE
- Vosk API GitHub License: https://github.com/alphacep/vosk-api/blob/master/COPYING
- Web Speech API SpeechRecognition MDN: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Microsoft Edge SpeechRecognitionEnabled Policy: https://learn.microsoft.com/en-us/deployedge/microsoft-edge-browser-policies/speechrecognitionenabled
- Ollama GitHub License: https://github.com/ollama/ollama/blob/main/LICENSE
- llama.cpp GitHub License: https://github.com/ggml-org/llama.cpp/blob/master/LICENSE
- Qwen3.5-9B Hugging Face License: https://huggingface.co/Qwen/Qwen3.5-9B/blob/main/LICENSE
- Qwen3.6-35B-A3B Hugging Face: https://huggingface.co/Qwen/Qwen3.6-35B-A3B
- Gemma 4 Model Card: https://ai.google.dev/gemma/docs/core/model_card_4
- OpenAI gpt-oss announcement: https://openai.com/index/introducing-gpt-oss/
- openai/gpt-oss-20b Hugging Face: https://huggingface.co/openai/gpt-oss-20b
- Bonsai-8B Hugging Face: https://huggingface.co/prism-ml/Bonsai-8B-mlx-1bit
- Microsoft Phi-4 Hugging Face: https://huggingface.co/microsoft/phi-4
- Mistral Small 3.2 Hugging Face: https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506
- DeepSeek-R1-Distill-Qwen-14B Hugging Face: https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B
- Llama 4 Community License: https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE
- Llama 4 Model Card: https://github.com/meta-llama/llama-models/blob/main/models/llama4/MODEL_CARD.md

