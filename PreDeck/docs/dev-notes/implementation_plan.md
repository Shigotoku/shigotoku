# PreDeck 実装計画書

最終更新日: 2026-05-08

参照元:
- `docs/要件定義書 Ver7.0（完全統合版）.md`
- `docs/AI開発指示書_20260508.md`
- `docs/設計判断記録_20260508.md`

本書はAIエージェントが上記3ファイルから読み取った確定仕様のみを基に作成した実装計画である。
3ファイルに明記されていない事項は確定仕様として扱わず、`docs/open_questions.md` に分離している。

---

## 0. 開発方針サマリ（ユーザー承認済み 2026-05-08）

| 項目 | 決定 |
|---|---|
| 外部ネットワーク通信（実行時） | 禁止（Strict Local Mode 既定） |
| 外部ネットワーク通信（開発時のパッケージレジストリ） | 都度承認制 |
| 新規依存追加 | 仕様3ファイルに明記された依存は事前承認済。それ以外は都度確認 |
| Git | ローカル `commit` まで許可。`push` は禁止 |
| 初期実装範囲 | MVP ローカルファースト版。実 ASR/LLM は抽象化と Mock のみ |
| Windows `.msi` 配布 | 後回し。設定雛形のみ用意し、ビルド検証はしない |

---

## 1. ゴール

### 1.1 MVP のゴール（本計画でカバー）

1. Tauri 2 + React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui で、5ステップ主導 + 2.5ペインのワークベンチ UI が静的に動作する。
2. Python FastAPI sidecar が `127.0.0.1` で起動し、SQLite（SQLModel）と `PreDeckData/` ディレクトリにデータを保存できる。
3. Strict Local Mode が既定 ON で、外部 URL への発信が起きない（ネットワークガード + 監査ログ）。
4. ASR / LLM が抽象化されており、Mock エンジンで「録音 → 文字おこし → 原稿改善 → 練習」の全ループが回る。
5. faster-whisper / whisper.cpp / Ollama / llama.cpp 用エンジンクラスはスタブとして配置され、モデルファイル未配置時はユーザーへインポートを案内する（自動ダウンロードはしない）。
6. 文字おこし（`transcripts.raw_text` / `transcripts.normalized_text`）と原稿（`scripts.user_script` / `scripts.ai_improved_script`）が分離されている。
7. ユニットテストでガード・ガイド条件・ネットワーク禁止を検証できる。
8. `THIRD_PARTY_NOTICES.md` 雛形と `licenses/` フォルダ、アプリ内ライセンス画面が用意されている。

### 1.2 MVP に含めない（Phase 2 以降）

- 実 ASR エンジンとの結線、実モデルでの文字おこし
- 実 LLM エンジンとの結線、実モデルでの原稿改善
- 構造診断・ピッチチェック・WPM・成長グラフの本実装（UI 雛形のみ）
- 圧迫ピッチモード、英語変換、Speakable English、テレプロンプター声追従
- Chrome 拡張、Next.js 管理画面、決済、共有レビュー
- Windows `.msi` のビルド検証と署名

### 1.3 2026-05-08 更新: Phase 2 ローカル AI 結線 完了

ユーザー指示により、Phase 2 のうち「実 ASR / LLM 結線（Mock からの切替路）」を一気に追加実装した。

- Ollama HTTP 結線 (ADR-026) と JSON Schema 強制 + リトライ (ADR-027)
- llama.cpp (`llama-cpp-python`) GGUF ロードと `response_format=json_object`
- faster-whisper を `local_files_only=True` で運用 (ADR-028)
- モデル登録 / 既定切替 / 削除の API + UI
- LLM プロンプト入力上限 (§7.4) を強制するビルダ
- Ollama base_url のループバック検証

コードは整備済みで、依存パッケージのインストールとモデル取得を伴う実機検証はユーザー承認後に実施する。

---

## 2. ディレクトリ構成

```text
predeck/                       # ルート（既存ディレクトリをそのまま使用）
├─ apps/
│  └─ desktop/
│     ├─ src-tauri/            # Tauri 2 (Rust 側) 雛形のみ
│     │  ├─ tauri.conf.json
│     │  ├─ Cargo.toml
│     │  ├─ build.rs
│     │  └─ src/main.rs
│     ├─ src/
│     │  ├─ app/               # ルーティング・レイアウト
│     │  ├─ components/        # 共有 UI（shadcn/ui ベース）
│     │  ├─ features/
│     │  │  ├─ session/
│     │  │  ├─ slides/
│     │  │  ├─ recording/
│     │  │  ├─ transcript/
│     │  │  ├─ improve/
│     │  │  ├─ practice/
│     │  │  ├─ review/
│     │  │  ├─ settings/
│     │  │  └─ models/
│     │  ├─ stores/            # Zustand
│     │  ├─ api/               # TanStack Query + fetch wrapper
│     │  ├─ lib/               # workflow guards / utils
│     │  └─ styles/
│     ├─ index.html
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts
│     ├─ postcss.config.cjs
│     └─ tailwind.config.ts    # Tailwind v4 は @theme 中心だが互換のため最小限
├─ sidecar/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ api/
│  │  │  ├─ health.py
│  │  │  ├─ sessions.py
│  │  │  ├─ slides.py
│  │  │  ├─ recordings.py
│  │  │  ├─ transcripts.py
│  │  │  ├─ scripts.py
│  │  │  ├─ asr.py
│  │  │  ├─ llm.py
│  │  │  ├─ settings.py
│  │  │  └─ exports.py
│  │  ├─ core/
│  │  │  ├─ config.py
│  │  │  ├─ network_guard.py    # Strict Local Mode の実装
│  │  │  ├─ paths.py
│  │  │  └─ logging.py
│  │  ├─ db/
│  │  │  ├─ engine.py
│  │  │  ├─ models.py
│  │  │  ├─ migrations.py       # 起動時に CREATE TABLE IF NOT EXISTS
│  │  │  └─ repository.py
│  │  ├─ engines/
│  │  │  ├─ asr/
│  │  │  │  ├─ base.py
│  │  │  │  ├─ mock_engine.py
│  │  │  │  ├─ faster_whisper_engine.py
│  │  │  │  └─ whisper_cpp_engine.py
│  │  │  └─ llm/
│  │  │     ├─ base.py
│  │  │     ├─ mock_engine.py
│  │  │     ├─ ollama_engine.py
│  │  │     ├─ llama_cpp_engine.py
│  │  │     └─ cloud_engine.py
│  │  ├─ jobs/
│  │  │  └─ job_manager.py
│  │  └─ schemas/               # Pydantic
│  ├─ tests/
│  │  ├─ test_health.py
│  │  ├─ test_strict_local_mode.py
│  │  ├─ test_workflow_guard.py
│  │  ├─ test_mock_asr.py
│  │  ├─ test_mock_llm.py
│  │  └─ test_repository.py
│  ├─ pyproject.toml
│  └─ README.md
├─ assets/
│  └─ logo/
│     └─ predeck_logo.png       # ASCII 名にリネーム
├─ docs/
│  ├─ 要件定義書 Ver7.0（完全統合版）.md
│  ├─ AI開発指示書_20260508.md
│  ├─ 設計判断記録_20260508.md
│  ├─ implementation_plan.md
│  ├─ progress_log.md
│  ├─ open_questions.md
│  ├─ safety_notes.md
│  ├─ THIRD_PARTY_NOTICES.md
│  ├─ licenses/
│  └─ adr/
│     ├─ ADR-001-decision-breakthrough.md
│     ├─ ...
│     └─ ADR-022-license-safe-distribution.md
├─ scripts/
│  ├─ generate_license_inventory.md   # 手順書のみ
│  └─ check_strict_local_mode.md      # 手順書のみ
├─ .env.example
├─ .gitignore
└─ README.md
```

注: `apps/web/`, Chrome 拡張ディレクトリは Phase 2 以降で追加する。今回は作らない。

---

## 3. データモデル

### 3.1 SQLite テーブル一覧（仕様3ファイル準拠）

| テーブル | 主目的 | 主キー |
|---|---|---|
| `sessions` | セッション基本情報 | `id` |
| `iterations` | 練習回ごとの履歴 | `id` |
| `slides` | スライド画像・ファイル参照 | `id` |
| `slide_timings` | スライド切替タイミング | `id` |
| `recordings` | 録音ファイルメタ | `id` |
| `transcripts` | 文字起こし本文（raw / normalized） | `id` |
| `transcript_segments` | セグメント・タイムスタンプ・スライド対応 | `id` |
| `scripts` | ユーザー原稿 / AI 改善原稿 | `id` |
| `analyses` | フィラー、WPM、構造診断、スコア | `id` |
| `asr_models` | ローカル ASR モデル管理 | `id` |
| `asr_jobs` | ASR ジョブ管理 | `id` |
| `llm_models` | ローカル LLM モデル管理 | `id` |
| `llm_jobs` | 原稿改善 / 診断ジョブ管理 | `id` |
| `settings` | Strict Local Mode、ASR、LLM、UI 設定 | `key` |
| `exports` | レポート出力履歴 | `id` |

### 3.2 文字起こしと原稿の分離（仕様 7.3）

```text
transcripts.raw_text         音声認識そのままのテキスト
transcripts.normalized_text  句読点・改行・表記ゆれを軽く整えたテキスト
scripts.user_script          ユーザーが編集した発表原稿
scripts.ai_improved_script   AI が改善した原稿
```

これらは別テーブルに分離して相互上書きを禁止する。

### 3.3 ローカルファイル構成（仕様 9.2）

```text
PreDeckData/
├─ recordings/{session_id}/{iteration_id}.webm
├─ slides/{session_id}/slide_001.png
├─ originals/{session_id}/source.pptx
├─ exports/reports/
├─ models/                      # ユーザーが手動でインポート
└─ logs/
```

`PreDeckData/` の場所はOS別に決定する。MVPではプロジェクト直下のまま開発。本番想定パスは `os.path.expanduser('~/Documents/PreDeckData')` 等を `要確認` として残す。

---

## 4. API 設計

仕様 5 章および 7.2 に基づく。エラーは仕様 5.4 の形式に統一する。

### 4.1 共通

- ベース URL: `http://127.0.0.1:8765`（暫定。設定で変更可）
- 認可: ローカル限定のため不要。ただし `Origin` 検証で `tauri://localhost` と `http://localhost:*` のみ許可。
- レスポンス形式: JSON。日付は ISO 8601 文字列。

### 4.2 ヘルス

- `GET /api/health` - sidecar 死活と Strict Local Mode 状態を返す。

### 4.3 設定

- `GET /api/settings`
- `PATCH /api/settings`
- `POST /api/settings/test-microphone`（MVP ではスタブ）
- `POST /api/settings/test-asr`（Mock のみ実動作）
- `POST /api/settings/test-llm`（Mock のみ実動作）
- `POST /api/settings/switch-local-mode`

### 4.4 セッション・スライド・録音・原稿

- `GET / POST /api/sessions`
- `GET /api/sessions/{id}`
- `PATCH /api/sessions/{id}`
- `POST /api/sessions/{id}/iterations`
- `GET / POST /api/slides`
- `POST /api/recordings`（multipart）
- `GET /api/transcripts/{id}`
- `PATCH /api/transcripts/{id}`（normalized 編集）
- `POST /api/scripts`
- `PATCH /api/scripts/{id}`

### 4.5 ASR

```text
GET  /api/asr/engines
GET  /api/asr/models
POST /api/asr/models/import
POST /api/asr/transcribe
GET  /api/asr/jobs/{job_id}
GET  /api/asr/jobs/{job_id}/events    # SSE
POST /api/asr/jobs/{job_id}/cancel
```

### 4.6 LLM

```text
GET  /api/llm/engines
GET  /api/llm/models
POST /api/llm/models/import
POST /api/llm/improve-script
POST /api/llm/diagnose-structure
POST /api/llm/generate-questions
GET  /api/llm/jobs/{job_id}
GET  /api/llm/jobs/{job_id}/events    # SSE
POST /api/llm/jobs/{job_id}/cancel
```

### 4.7 エクスポート

- `POST /api/exports`（雛形のみ）
- `GET /api/exports/{id}`

---

## 5. ASR / LLM 抽象化

### 5.1 AsrEngine（仕様 6.1）

```python
class AsrEngine(ABC):
    @abstractmethod
    def info(self) -> AsrEngineInfo: ...
    @abstractmethod
    def is_available(self) -> AvailabilityStatus: ...
    @abstractmethod
    def transcribe(
        self,
        audio_path: Path,
        language: str = 'ja',
        vad: bool = True,
        word_timestamps: bool = True,
        progress_callback: Callable[[float, str], None] | None = None,
    ) -> TranscriptionResult: ...
```

実装:

- `MockAsrEngine` - 固定テキスト + 擬似セグメントを返す。MVP の正式エンジン。
- `FasterWhisperEngine` - スタブ。`is_available()` でモジュール未導入を検出して `next_action` を返す。
- `WhisperCppEngine` - スタブ。

### 5.2 LlmEngine（仕様 7.1）

```python
class LlmEngine(ABC):
    @abstractmethod
    def info(self) -> LlmEngineInfo: ...
    @abstractmethod
    def is_available(self) -> AvailabilityStatus: ...
    @abstractmethod
    def run(self, request: LlmRequest) -> LlmResult: ...
```

実装:

- `MockLlmEngine` - JSON Schema に沿った固定的な改善案を返す。
- `LocalOllamaEngine` - スタブ。Ollama API は `http://localhost:11434`。Strict Local Mode の許可ホスト範囲内なので将来結線可。
- `LlamaCppEngine` - スタブ。
- `CloudLlmEngine` - 明示許可モード用スタブ。`run()` は常に「明示許可されていません」エラーを返す。

### 5.3 JobManager

- メモリ上のジョブテーブル + SQLite の `asr_jobs` / `llm_jobs` に二重管理。
- `asyncio.Queue` で背景実行。Mock は短時間で完了する。
- SSE は `EventSourceResponse` で進捗イベントを送信。

---

## 6. Strict Local Mode 実装

### 6.1 設計

`sidecar/app/core/network_guard.py` で以下を実装する。

1. `socket.socket.connect` を monkey-patch し、宛先が許可ホスト（`127.0.0.1`, `localhost`, `::1`, ループバック範囲）以外の場合は `StrictLocalModeViolation` を送出する。
2. `urllib.request`, `httpx`, `requests` 等を import 時に「使用禁止」フラグを建てるテストフックも用意（テスト時に有効化）。
3. `settings.strict_local_mode = false` のときも、`allow_cloud_*` が個別に true になっていない限りブロックする。

### 6.2 設定

```json
{
  "strict_local_mode": true,
  "allow_cloud_asr": false,
  "allow_cloud_llm": false,
  "allow_model_download": false,
  "allowed_hosts": ["127.0.0.1", "localhost"]
}
```

これを `settings` テーブルに格納し、起動時にロードする。

### 6.3 UI 上の表示

- 全画面の左上に常時 `Strict Local Mode` バッジを表示。
- クラウド許可モードを有効化するときはモーダル + 確認 + 監査ログ。
- 設定画面で「クラウド機能はスタブのため、本実装はAI開発指示書 §1.2 と ADR-014 に従って人間承認後に有効化される」旨を明記。

---

## 7. UI / UX 実装計画

### 7.1 全体ナビゲーション

| ルート | 画面 |
|---|---|
| `/` | ホーム（セッション一覧 + 新規作成） |
| `/onboarding` | オンボーディング（初回のみ） |
| `/settings` | 設定 |
| `/settings/models` | モデル管理 |
| `/sessions/:id` | ワークベンチ（5ステップ） |
| `/sessions/:id/review` | 振り返り |

### 7.2 ワークベンチ 2.5 ペイン

- 左: スライド一覧 + 現在スライドプレビュー（仕様 5.2）。MVP では仮スライドを描画。
- 中央: 5ステップのアクティブステップに応じて `Step1Slides` / `Step2Recording` / `Step3Transcript` / `Step4Improve` / `Step5Practice` を切替。
- 右: AI コーチ。状態別表示制御を `useAiCoachVisibility(step, isRecording)` で実装。

### 7.3 5 ステップガード

仕様 4.3（AI開発指示書）の `canEnter()` を TypeScript で実装し、Zustand の `workflowStore` から参照する。

### 7.4 Round 表示

主導線は 5 ステップ。Round は補助情報として中央上部のサブ見出しに表示する。
仕様 3.1 に従い、5 ステップを 1 ラウンドとして繰り返す。

### 7.5 アクセシビリティ

- shadcn/ui の Radix プリミティブを基盤にし、キーボード操作を確保。
- 色覚多様性: 色だけに依存せずアイコン/テキストを併用（仕様 11.3）。
- 高コントラストモード: Tailwind の `data-theme` で切替（雛形のみ）。

---

## 8. テスト計画

### 8.1 sidecar

- `pytest` ベース。
- Mock ASR / LLM を使った E2E 相当のフロー: セッション作成 → 録音メタ登録 → ASR ジョブ → transcript 保存 → LLM 改善 → script 保存。
- `test_strict_local_mode`: `httpx.get("https://example.com")` のような呼び出しが `StrictLocalModeViolation` で拒否されること。
- `test_workflow_guard`: 各ステップの遷移可否が仕様通りであること。
- `test_repository`: DB 読み書きと文字起こし/原稿の分離。

### 8.2 frontend

- `vitest`（雛形のみ）+ `@testing-library/react`。
- `canEnter()` のユニットテスト。
- `useAiCoachVisibility()` のユニットテスト。

### 8.3 ローカル限定

- 全テストは `127.0.0.1` 内で完結。CI 連携は今回作らない（push 禁止のため）。

---

## 9. ライセンス・配布

- `THIRD_PARTY_NOTICES.md` 雛形を作成し、依存導入時に更新する運用にする。
- `docs/licenses/` フォルダに各 OSS のライセンス全文を配置（実 OSS 導入時に追記）。
- アプリ内ライセンス画面 `/settings/about` を雛形として用意。
- モデルレジストリは `asr_models` / `llm_models` のカラム + JSON 設定（`docs/model_registry.md` を後日作成、本MVPでは未着手）。

---

## 10. 実装ステップ

### Phase 0（本ターン内）

- [x] 計画ドキュメント作成
- [x] open_questions / safety_notes / progress_log 作成
- [x] ロゴ移動
- [x] ADR コピー
- [x] ディレクトリ骨格

### Phase 1（本ターン内）

1. フロントエンド設定ファイル雛形（package.json, vite.config.ts, tsconfig, tailwind, postcss, index.html）
2. Tauri 設定ファイル雛形（tauri.conf.json, Cargo.toml, src/main.rs）
3. UI primitives（Button/Card/Input/Badge/Tabs/Dialog 等の薄いラッパー、shadcn/ui のスタイル準拠）
4. レイアウト・ルーティング・5ステップシェル
5. Step1〜5 各画面の雛形
6. オンボーディング・設定・モデル管理・振り返り画面雛形
7. Zustand store（workflow / settings / sessions）
8. TanStack Query フック
9. sidecar pyproject.toml + main.py + 設定ファイル雛形
10. SQLModel スキーマ + マイグレーション（CREATE TABLE）
11. リポジトリ層
12. API ルータ
13. ASR/LLM 抽象化 + Mock + スタブ
14. JobManager + SSE
15. ネットワークガード
16. テスト雛形
17. THIRD_PARTY_NOTICES + README + .env.example + .gitignore

### Phase 2 以降（本ターン外）

- 実 ASR エンジン結線（faster-whisper のローカルモデル動作）
- 実 LLM エンジン結線（Ollama 結線）
- 構造診断、ピッチチェック、WPM、成長グラフ
- 圧迫モード、英語変換、テレプロンプター
- Tauri ビルド検証 → Windows `.msi`

---

## 11. リスク・前提

- 仕様3ファイルは内部で大きな矛盾なし。`Round表示` と `5ステップ主導` の整合性は ADR-003 で 5 ステップ主導と確定済。
- React 19.2 / Tailwind v4 / Tauri 2 は外部確認ログで採用確定。最新バージョン詳細はインストール時に再確認。
- `Qwen3.5-9B`, `Qwen3.6-35B-A3B`, `Gemma 4 26B-A4B`, `Gemma 4 31B`, `Gemma 4 E4B`, `Bonsai-8B`, `gpt-oss-20b` は仕様に明記された候補名のまま記録する。実在性・精度・ライセンスは未確認のため `要確認`（人間承認必須）として `open_questions.md` に記載。
- PyMuPDF / GPL FFmpeg / nonfree FFmpeg / LibreOffice 同梱 / Llama 4 系標準同梱 / FunASR・SenseVoice 標準同梱 / Web Speech API（ローカル ASR として）は不採用または条件付き。

---

## 12. 参照

- 要件定義書 Ver7.0: 全章
- AI開発指示書: §1〜13
- 設計判断記録: ADR-001〜022
