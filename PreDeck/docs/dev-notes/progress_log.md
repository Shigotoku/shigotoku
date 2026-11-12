# PreDeck 進捗ログ

各大きな作業単位の後に、作業内容・変更ファイル・テスト結果・未決事項・安全上の注意を追記する。

形式は AI 開発指示書および本プロジェクトのオンボーディング指示に従う。

---

## 2026-05-08 04:30

### 実施内容

- 仕様3ファイル（要件定義書 Ver7.0、AI開発指示書、設計判断記録）を精読し、要点を整理した。
- 初回承認確認を実施し、ユーザーから次の方針を取得した。
  - ネットワーク: パッケージレジストリは都度承認、その他は禁止
  - 依存追加: 仕様3ファイル明記分は事前承認済、その他は都度承認
  - Git: ローカル commit まで（push 禁止）
  - 実装範囲: MVP ローカルファースト（実 ASR/LLM は抽象化と Mock のみ）
  - `.msi`: 後回し
- Phase 0-A として計画系ドキュメントを作成した。

### 変更ファイル

- `docs/implementation_plan.md`（新規）
- `docs/open_questions.md`（新規）
- `docs/safety_notes.md`（新規）
- `docs/progress_log.md`（新規）

### テスト結果

- 該当なし（ドキュメント作成のみ）

### 未決事項

- `docs/open_questions.md` に 33 項目を整理。特にライセンス（Q-L-001〜009）、個人情報（Q-P-001〜005）、価格（Q-B-001〜002）は人間承認必須。

### 安全上の注意

- プロジェクト外ファイルへのアクセスなし。
- 外部通信なし。
- 秘密情報の作成・参照なし。
- ロゴ PNG（`プレデキ_ロゴ .png`）は次のステップで `assets/logo/predeck_logo.png` にリネーム移動する。

---

## 2026-05-08 05:50

### 実施内容

- Phase 0-B〜D 完了。
  - ロゴ PNG を `assets/logo/predeck_logo.png` に移動・リネーム。
  - `docs/adr/` を作成し、ADR-001〜022 のインデックス、ADR-023〜025（MVP Mock 優先方針 / sidecar ポートとパス / ネットワークガード方式）、テンプレートを配置。
  - `.gitignore`、`.env.example`、`README.md`、`docs/THIRD_PARTY_NOTICES.md`、`docs/licenses/README.md`、`scripts/check_strict_local_mode.md`、`scripts/generate_license_inventory.md` を作成。
- Phase 1-A〜I 完了。
  - フロントエンド (Tauri 2 + React 19 + TS + Vite + Tailwind v4 + shadcn/ui 風 UI) 設定ファイルとコード一式。
    - `apps/desktop/package.json`、`tsconfig.json`、`vite.config.ts`、`postcss.config.cjs`、`index.html`、`.eslintrc.cjs`。
    - `src-tauri/tauri.conf.json`、`Cargo.toml`、`build.rs`、`src/main.rs`、`src/lib.rs`、`capabilities/default.json`。
    - UI primitives: Button / Card / Badge / Input / Textarea / Label / Progress / Tabs / Switch / Dialog / Separator。
    - レイアウト: `AppShell`、ナビ、Strict Local Mode バッジ。
    - 5ステップ ワークベンチ: `WorkbenchHeader`、`SlidePane`、`CenterStepPane`、`CoachPane`、`Step1Slides`〜`Step5Practice`。
    - ページ: `HomePage`、`OnboardingPage`、`SettingsPage`、`AboutPage`、`ModelManagementPage`、`SessionReviewPage`。
    - stores: `workflow-store`、`ui-store`。
    - api: `client`、`schemas (Zod)`、`queries (TanStack Query)`、`safe-fetch`、`workflow guards`、`ai-coach-visibility`。
    - frontend tests: `workflow.test.ts`、`ai-coach-visibility.test.ts`、`safe-fetch.test.ts`。
  - sidecar (Python FastAPI + SQLModel + ASR/LLM 抽象化 + Mock + ジョブマネージャ) 実装。
    - `pyproject.toml`、`README.md`。
    - `app/core/`: `config`（pydantic-settings）、`network_guard`（socket monkey-patch）、`logging`、`errors`。
    - `app/db/`: `models`（15 テーブル）、`engine`、`repository`（業務操作集約、文字おこし/原稿の分離を厳守）。
    - `app/engines/asr/`: `AsrEngine` 抽象、`MockAsrEngine`（決定的）、`FasterWhisperEngine`（スタブ・自動DL禁止）、`WhisperCppEngine`（スタブ）、`registry`。
    - `app/engines/llm/`: `LlmEngine` 抽象、`MockLlmEngine`（フィラー除去・弱気ワード言い切り化・JSON Schema 準拠）、`LocalOllamaEngine`/`LlamaCppEngine`/`CloudLlmEngine`（明示許可必須）スタブ、`registry`。
    - `app/jobs/job_manager.py`: メモリキュー + SSE。
    - `app/schemas/dto.py`: API 用 Pydantic モデル。
    - `app/api/`: `health`、`settings`、`sessions`、`transcripts`、`scripts`、`asr`、`llm`、`exports`。
    - `app/main.py`: 起動時に network_guard.install を **最初に** 実行、データディレクトリ確保、DB 初期化、CORS、グローバル例外ハンドラ。
  - sidecar tests (`tests/`):
    - `test_health`: ヘルスチェック・Strict Local Mode 反映確認。
    - `test_strict_local_mode`: `socket.connect` レベルで外部 IP/ホスト名/Hugging Face/OpenAI への接続が拒否されること。
    - `test_repository`: `raw_text`/`normalized_text`、`user_script`/`ai_improved_script` の分離、iteration 採番。
    - `test_mock_asr` / `test_mock_llm`: Mock エンジンが Strict Local Mode 下でも完結すること。
    - `test_settings`: `strict_local_mode=true` のときクラウド系フラグが強制 false、`switch-local-mode` が人間承認必須エラー、`test-asr/llm` が Mock 利用可。
    - `test_engines_listing`: ASR/LLM エンジン一覧、cloud LLM 指定時の拒否。
    - `test_workflow_e2e`: セッション作成 → ASR ジョブ → 文字おこし → LLM 改善 → 原稿確認 → 次ラウンド作成。

### 変更ファイル（主要）

- 設定/雛形: `.gitignore`、`.env.example`、`README.md`
- ドキュメント: `docs/THIRD_PARTY_NOTICES.md`、`docs/licenses/README.md`、`docs/adr/*.md`
- スクリプト: `scripts/check_strict_local_mode.md`、`scripts/generate_license_inventory.md`
- アセット: `assets/logo/predeck_logo.png`（移動）
- frontend: `apps/desktop/**` 約 35 ファイル
- sidecar: `sidecar/**` 約 35 ファイル

### テスト結果

- ローカルでの実行は **未実施**（依存パッケージは未インストール、レジストリ通信が都度承認のため）。
- コードレベルでは TypeScript / Python ともに linter エラーなしを確認。
- 単体テストは設計通り。`pnpm install && pnpm test` および `pip install -e ".[dev]" && pytest` で実行可能な状態。

### 未決事項

- ライセンス確認（Q-L-001〜009）、個人情報運用（Q-P-001〜005）、価格（Q-B-001〜002）は人間承認必須のまま。
- フロントエンドとバックエンドの依存実インストールはユーザー承認後に行う。
- 実 ASR / LLM 結線（faster-whisper / Ollama）は Phase 2 で実施予定。
- Tauri ビルド検証 / Windows `.msi` は今回スコープ外。

### 安全上の注意

- プロジェクト外ファイルへのアクセスなし。
- 外部通信なし（コード作成・移動のみ）。
- 秘密情報の作成・参照なし。
- `.env*` は `.gitignore` 済み。`.env.example` のみコミット可。
- Strict Local Mode が既定 ON。クラウド許可モード切替には `switch-local-mode` が常に `HUMAN_APPROVAL_REQUIRED` を返す実装。
- ASR/LLM のモデル自動ダウンロードは `FasterWhisperEngine.transcribe` が `model_local_path` 必須・`is_available()` が常に未導入を返す設計で防止。
- ネットワークガードは `socket.connect` モンキーパッチで `127.0.0.1`/`localhost`/ループバック以外を拒否。テストで Hugging Face Hub・OpenAI API 等の外部送信が拒否されることを確認。

---

## 2026-05-08 06:50

### 実施内容

ローカル LLM (Ollama / llama.cpp) と ローカル ASR (faster-whisper) を一気に本実装した。

- **依存解放**: `pyproject.toml` の `[asr]`、`[llm]`、`[full]` に `faster-whisper` / `llama-cpp-python` を有効化。`httpx` を本体依存に昇格 (Ollama HTTP 呼出に使用)。`ollama` Python パッケージは追加せず HTTP 直叩き (ADR-026)。
- **JSON Schema 強制 (ADR-027)**: `app/engines/llm/schemas.py` を新規作成。`ImproveScriptOutput` / `DiagnoseStructureOutput` / `GenerateQuestionsOutput` を Pydantic で定義。`validate_output(task, parsed)` で全エンジン共通検証。
- **プロンプトビルダ**: `app/engines/llm/prompts.py` を新規作成。AI 開発指示書 §7.4 に準拠した文字数上限 (user_script 4000 / transcript 4000 / 隣接 600) を強制し、超過分はマーカー付きで切詰め。共通システムプロンプトでフィラー除去・弱気除去・JSON 強制を明示。
- **LocalOllamaEngine 本実装**: `httpx` で `/api/chat`、`format: "json"`、temperature 0.2、`num_ctx` 4096。最大 2 リトライ + JSON パース二段フォールバック + Pydantic 検証。`is_available()` は `/api/tags` を 1.5 秒タイムアウトでプローブ。base_url のホストがループバックでなければ未使用とする。
- **LlamaCppEngine 本実装**: `llama_cpp.Llama(model_path=..., n_ctx=4096, n_gpu_layers=0)` でローカル GGUF をロード。`response_format={"type": "json_object"}` で JSON 強制。プロセス内キャッシュで多重ロード防止。
- **FasterWhisperEngine 本実装 (ADR-028)**: `WhisperModel(local_files_only=True)` でローカル限定。モデルパス未指定時は RuntimeError。VAD・word_timestamps を引数化。進捗を 5% 単位で SSE 送出。
- **MockLlmEngine** も同じ Pydantic 検証経路に統合 (output が schema 準拠を保証)。
- **モデル管理 API**: `POST /api/asr/models` / `POST /api/llm/models` / `DELETE` / `POST /default` を追加。faster-whisper はパス存在チェック必須、llama_cpp は GGUF パス必須、ollama はパス不要。
- **設定拡張**: `SettingsOut` に `default_asr_model_id` / `default_llm_model_id` / `ollama_base_url` / `ollama_default_model` を追加。`PATCH /api/settings` で URL ループバック検証。
- **ジョブランナ更新**: `POST /api/asr/transcribe` および `POST /api/llm/improve-script` で `engine` 未指定時に Settings 既定エンジンへフォールバック、モデルパスを Repository で解決。faster-whisper は `model_local_path` を引数で渡す。
- **JSON Schema 公開**: `GET /api/llm/schema/{task}` でフロントから取得可能に。
- **フロント更新**: Zod スキーマに新フィールド追加、API client がエラー envelope の `{detail: {error}}` と `{error}` の両形式を吸収。SettingsPage に Ollama URL / 既定モデル名 / 既定エンジン UI、ModelManagementPage に登録フォーム / 既定切替 / 削除を実装。Step3/4 から `engine` 引数を外して既定エンジン参照に切替。

### 変更ファイル（主要）

- `sidecar/pyproject.toml`
- `sidecar/app/engines/llm/{schemas,prompts,ollama_engine,llama_cpp_engine,mock_engine}.py`
- `sidecar/app/engines/asr/faster_whisper_engine.py`
- `sidecar/app/api/{asr,llm,settings,settings_store}.py`
- `sidecar/app/db/repository.py` (モデル登録/削除/既定切替メソッドを追加)
- `sidecar/app/schemas/dto.py` (Settings/AsrModelImport/LlmModelImport 拡張)
- `sidecar/tests/{test_llm_schemas,test_llm_prompts,test_ollama_engine,test_engine_real_packages,test_settings_ollama_url,test_models_api}.py` 新規
- `apps/desktop/src/api/{schemas,queries,client}.ts`
- `apps/desktop/src/features/settings/SettingsPage.tsx` 拡張
- `apps/desktop/src/features/models/ModelManagementPage.tsx` 全面刷新
- `apps/desktop/src/features/steps/Step3Transcript.tsx` / `Step4Improve.tsx` 既定エンジン化
- `docs/adr/ADR-026-ollama-http-integration.md` / `ADR-027-llm-json-schema-and-retry.md` / `ADR-028-faster-whisper-local-files-only.md` 新規
- `docs/adr/README.md` / `README.md` 更新

### テスト結果

- ローカル実行未実施（依存未導入、レジストリ通信都度承認）。
- 追加テスト 6 ファイルは設計上 `client` フィクスチャ経由で動作する想定。
  - `test_llm_schemas.py`: Pydantic スキーマの境界条件 (1〜5 範囲、必須フィールド、未知タスク)
  - `test_llm_prompts.py`: 文字数上限・マーカー挿入・各タスクの構造
  - `test_ollama_engine.py`: `httpx.Client` を fake で差し替え、`format=json`、リトライ、ループバック制限
  - `test_engine_real_packages.py`: faster-whisper / llama-cpp-python 未導入時の `is_available=False` を確認
  - `test_settings_ollama_url.py`: Strict Local Mode 配下で外部 URL は 400 OLLAMA_URL_NOT_LOOPBACK
  - `test_models_api.py`: パス検証 / 既定切替 / 削除
- 既存テストへの破壊変更:
  - `test_engines_listing.py` の cloud LLM 期待値を `CLOUD_LLM_BLOCKED` も許容するよう緩和。

### 未決事項

- 各モデル (Qwen / Gemma / gpt-oss / Bonsai / Whisper) の **再配布可否** はモデルごとに人間承認が必要 (`docs/open_questions.md` Q-L-001〜009)。
- llama-cpp-python の Windows ビルド要件（CMake / VS Build Tools）は要確認 (Q-A-001 系)。
- Ollama 経由での Strict Local Mode テストは `ollama serve` を起動した環境で別途実機確認が必要。

### 安全上の注意

- 外部通信なし（実装段階）。Ollama 接続先は `127.0.0.1`/`localhost`/`::1` 以外を `OLLAMA_URL_NOT_LOOPBACK` で拒否、Settings 永続化前に検証。
- faster-whisper は `local_files_only=True` で初期化。`socket.connect` モンキーパッチが万一の保険。
- llama.cpp は GGUF のローカルパス必須、外部 URL 取得経路なし。
- Ollama 用パッケージは追加せず、HTTP 直叩きで依存最小化。
- `format: "json"` + Pydantic 検証 + 最大 2 リトライ。失敗時は `LLM_VALIDATION_FAILED` 相当としてジョブを `failed` 化。
- LLM への入力文字数を AI 開発指示書 §7.4 の上限で必ずトリミング。原稿全量・録音全量を投入する経路を作らない。

---

## 2026-05-08 06:35

### 実施内容

- 環境検出: ユーザー環境に Ollama 0.23.1 / Node 24.15 / npm 11.13 / Python 3.13.2 / uv 0.9.16 / Git 2.53 / FFmpeg 8.1 / WebView2 が揃っていることを確認。Rust / MSVC / CMake / .NET / Tauri CLI / pnpm / pipx は未導入。
- ユーザー承認のもと、レジストリ通信が必要な以下を実施：
  - `uv venv .venv --python 3.13` で sidecar 用 venv 作成
  - `uv pip install -e ".[dev,asr]"` で FastAPI / SQLModel / pytest / faster-whisper / ctranslate2 を導入（faster-whisper 1.2.1 / ctranslate2 4.7.1 が Python 3.13 のホイールで導入成功）
  - `apps/desktop/npm install` で React / Vite / TanStack Query / Zod 等 386 パッケージを導入
- llama-cpp-python は MSVC/CMake 不在のため後回しの方針（Ollama 代替で要件を満たす）
- Tauri 2 デスクトップビルド用の Rust も後回し（Vite dev http://127.0.0.1:5173 で動作確認）
- 既存テストの修正:
  - `tests/test_engines_listing.py`: faster-whisper 導入有無を `importlib.util.find_spec` で動的判定し、`available` の期待値を分岐
  - `app/engines/llm/mock_engine.py`: `_HEDGE_PATTERNS` に「と思います」「思います」を追加し、フィラー除去後の文末整形を強化
- 既存型エラーの修正:
  - `apps/desktop/vite.config.ts` から `test` セクションを削除し、Vitest 用に `apps/desktop/vitest.config.ts` を新規作成（Vitest 内蔵 Vite と外側 Vite の型衝突を回避）
  - `ModelManagementPage.tsx` の `setForm` キャストを `as AsrModelImport` / `as LlmModelImport` で明示
- 動作確認:
  - sidecar `uvicorn app.main:app` で 127.0.0.1:8765 起動成功（`strict_local_mode=true`）
  - `GET /api/health` `GET /api/llm/engines` `GET /api/asr/engines` `GET /api/llm/schema/improve_script` を確認
  - `scripts/smoke_e2e.py` を新規作成し、セッション作成 → iteration 取得 → Mock improve-script → ジョブ完了 → script 取得まで一気通貫で完走
  - フロント Vite dev http://127.0.0.1:5173 起動成功

### 変更ファイル

- `sidecar/.venv/`（uv venv で生成、git 追跡対象外）
- `sidecar/tests/test_engines_listing.py`
- `sidecar/app/engines/llm/mock_engine.py`
- `sidecar/scripts/smoke_e2e.py`（新規）
- `apps/desktop/vite.config.ts`
- `apps/desktop/vitest.config.ts`（新規）
- `apps/desktop/src/features/models/ModelManagementPage.tsx`

### テスト結果

- sidecar pytest: **63 passed, 1 skipped**（llama-cpp-python 未導入による意図的 skip）
- frontend `tsc --noEmit`: **エラーなし**
- frontend `vitest run`: **25 tests passed**
- E2E smoke test: Mock improve-script ラウンド完走、`changes` 4 件、`ai_improved_script` が schema 適合

### 未決事項

- Ollama 用モデルが未取得（`/api/tags` が空）。実 LLM 検証には `ollama pull <model>` を行うか、ユーザーが既存 GGUF を流用するかを選択する必要あり（Q-L-001 系の人間承認が前提）。
- faster-whisper 用モデルも未取得。`PreDeckData/models/faster-whisper/<name>` への配置が必要。HuggingFace Hub からの取得は `huggingface_hub` Python ライブラリで CLI なしで可能だが、外部通信のため都度承認。
- Tauri 2 ビルドは未着手（Rust + MSVC 未導入。`.msi` 配布は仕様上後回し）。
- Git 初期化 / 初回 commit は未実施（ローカル commit 都度承認方針のため、ユーザーの明示確認待ち）。

### 安全上の注意

- 外部通信は次の 3 件のみ（いずれもユーザー承認済の事前合意レジストリ）：
  - `pypi.org` / `files.pythonhosted.org`（uv pip install）
  - `registry.npmjs.org`（npm install）
- Strict Local Mode は sidecar 起動ログで `strict=True allowed_hosts=['127.0.0.1', 'localhost']` を確認済。
- Ollama URL の入力検証は未実機テストだがユニットテスト経由で挙動を確認済。
- 取得した依存にライセンス問題のあるパッケージは含まれず（faster-whisper: MIT, ctranslate2: MIT, av: BSD-3, onnxruntime: MIT, huggingface-hub: Apache-2.0）。
- バイナリやモデルファイルはアプリ起動経路では一切ダウンロードしていない。

---

## 2026-05-08 07:15

### 実施内容

- ユーザーフィードバックに基づき、AIエージェントが Cursor 上で **qwen2.5 / gemma2 / llama3 等の代替モデル名を「PreDeck 推奨モデル」として扱わない** よう、ガードを実装し直した。
  - 仕様書 §3.7 / §13.1 / 設計判断記録 §13 で固定されている **正式モデル名（Qwen3.5-9B / Gemma 4 E4B / Bonsai-8B / Gemma 4 26B-A4B / gpt-oss-20b / Qwen3.6-35B-A3B / Gemma 4 31B）** を一次ソースとし、AIエージェントが書き換えない設計を文書とテストで強制。
- `docs/safety_notes.md` §7「開発環境例外ポリシー（モデル取得）」を新設し、以下を明文化：
  - アプリ本体への自動 pull / HF Hub 自動取得は厳禁（再掲）。
  - 開発エンジニア個人の検証用には、**事前情報提示 + 明示承認 + ログ記録** をフルセットで満たす場合に限り `ollama pull` 等を例外的に許容。
  - Bonsai-8B-mlx-1bit は Apple Silicon 限定の可能性として Windows 機への提案を停止（Q-L-005）。
  - Qwen 3.5/3.6 / Gemma 4 / gpt-oss-20b の Ollama 公式タグは未検証 → UI ラベル「Ollama タグ要確認」「未インストール」「手動セットアップが必要」で表示。代替モデル名で書き換えない。
- 環境調査結果をユーザーへ提示:
  - RAM 15.4 GB / VRAM 共有 0.5 GB / AMD Ryzen 5 5500U / 空きディスク約 160 GB / Ollama インストール済みモデルなし。
  - 仕様書のハードウェアテーブルに従えば「軽量モード」枠 (RAM 8〜16 GB / GPU なし)。
  - 軽量候補のうち Bonsai-8B は除外、残るは Gemma 4 E4B のみ（タグ未確認）。
- 実装:
  - sidecar API に `GET /api/llm/ollama/installed` を追加。`ollama_base_url` の loopback 検証 + Ollama HTTP `/api/tags` への 1 回限り GET。
  - sidecar API に `GET /api/llm/recommended-catalog` を追加。要件定義書 §3.7 / 設計判断記録 §13 の正式モデル一覧を返す（Qwen3.5-9B、Gemma 4 系、gpt-oss-20b、Bonsai-8B、Qwen3.6-35B-A3B など）。各エントリに tier / RAM 要件 / VRAM 要件 / 想定 Q4 サイズ / Ollama タグ候補 / `ollama_tag_status: 'unverified' | 'platform_restricted'` / ライセンス注記を含める。
  - フロントに `useOllamaInstalledQuery` / `useRecommendedCatalogQuery` フックと、`RecommendedCatalogSection` コンポーネントを追加。Ollama インストール済みかつ DB 登録済みなら「インストール済み」、それ以外は「未インストール」「手動セットアップが必要」と表示。
  - `ModelManagementPage` に推奨カタログ表示を追加し、ハードコードされていた `qwen2.5:7b-instruct` 例示を削除して `<tag>` プレースホルダ化。
- 既存テスト 1 件 (`test_engines_listing.py`) を `faster_whisper` 導入有無で動的判定するよう修正。Mock LLM の弱気ワード除去パターンを「と思います」「思います」まで拡張。Vitest 設定を `vitest.config.ts` へ分離して TypeScript 型衝突を解消。
- 新規テスト `tests/test_recommended_catalog.py` を 5 件追加：
  - 公式モデル名の集合テスト
  - `qwen2 / gemma2 / llama2` 等の代替名で書き換えられていないことの検査
  - 必須キーの存在確認
  - Bonsai が `platform_restricted` 扱いになっていることの確認
  - `/api/llm/ollama/installed` の応答スキーマ確認

### 変更ファイル

- `docs/safety_notes.md`（§7 を追加）
- `sidecar/app/api/llm.py`（`/ollama/installed` と `/recommended-catalog` を追加）
- `sidecar/tests/test_recommended_catalog.py`（新規）
- `apps/desktop/src/api/schemas.ts`（`OllamaInstalledStatus`, `RecommendedModel` を追加）
- `apps/desktop/src/api/queries.ts`（`useOllamaInstalledQuery`, `useRecommendedCatalogQuery` を追加）
- `apps/desktop/src/features/models/ModelManagementPage.tsx`（`RecommendedCatalogSection` を追加、qwen2.5 例示を削除）

### テスト結果

- sidecar pytest: **68 passed, 1 skipped**
- frontend `tsc --noEmit`: **エラーなし**
- frontend `vitest run`: **25 passed**
- E2E smoke test (Mock LLM): 完走、4 件改善
- sidecar 起動時 + Ollama 0.23.1 稼働中状態で `GET /api/llm/ollama/installed` が `available=true, models=[]` を返すことを実機確認

### 未決事項

- **Q-L-001〜005**（Qwen 3.5 / 3.6 / Gemma 4 系 / gpt-oss-20b / Bonsai-8B のライセンスと Ollama 公式タグ実在性）は依然として人間承認待ち。
- 仕様書記載の Qwen 3.5 / Qwen 3.6 / Gemma 4 系の **Ollama 公式タグ実在性** を確認するため、`https://ollama.com/library/<name>` への HTTP GET（メタデータのみ、ユーザーデータの送出なし）を**ユーザー承認のもと** AIエージェントが行えるよう新規承認が必要。
- 開発機 (RAM 15.4 GB / iGPU のみ) で軽量モードを実機検証するための具体的モデルタグ・サイズ・ライセンス情報の確定。
- `Bonsai-8B` を **このユーザーの環境では非対象** として扱う旨の ADR 化。

### 安全上の注意

- AIエージェントが「PreDeck 推奨モデル」として `qwen2.5` 等の類似名を提案することを明確に禁止し、テスト (`test_recommended_catalog_no_silent_substitution`) で機械的にガード。
- Ollama のインストール済みモデル取得は `ollama_base_url` のループバック検証を経由し、外部ホスト接続を `OLLAMA_URL_NOT_LOOPBACK` でブロック。
- 推奨カタログ API は静的データを返すのみで外部通信なし。
- 仕様書の正式モデル名はそのまま JSON で返却し、フロントもそのまま表示する（書き換えなし）。

---

## 2026-05-08 07:35

### 実施内容（モデル取得とライブラリ実態調査）

ユーザー承認のもと、`docs/safety_notes.md §7` の開発環境例外ポリシー適用範囲で外部リクエストを 2 種類実施：

1. **faster-whisper-small ダウンロード（HF）**
   - スクリプト: `sidecar/scripts/download_faster_whisper_small.py`
   - リポジトリ: `Systran/faster-whisper-small`
   - 配置先: `PreDeckData/models/faster-whisper/small/`
   - 内訳: `model.bin` 461.15 MB / `tokenizer.json` 2.1 MB / `vocabulary.txt` 0.44 MB / その他メタファイル
   - 合計: 486 MB（実測 486,216,691 bytes）
   - 経過時間: 約 20 秒
   - ライセンス: MIT
   - Windows cp932 出力エラーを回避するため `sys.stdout.reconfigure(encoding='utf-8')` を script 冒頭に追加

2. **Ollama 公式ライブラリのタグ実在性確認（HTTP GET のみ、ユーザーデータ送出なし）**
   - 取得 URL: `https://ollama.com/library/{qwen, qwen3, gemma, gemma3, gpt-oss}`
   - 結果サマリ:

| 仕様書記載 | Ollama 実態（2026-05-08 時点） | 判定 |
|---|---|---|
| Qwen3.5-9B | **存在せず**。`qwen3:8b`（5.2GB / 40K context）が最近似 | Q-L-001 要再判断 |
| Qwen3.6-35B-A3B | **存在せず**。`qwen3:30b`（19GB / 256K / MoE）が近似 | Q-L-002 要再判断 |
| Gemma 4 E4B | **存在せず**。`gemma3:4b-it-qat` または `gemma3:1b-it-qat` が近似 | Q-L-003 要再判断 |
| Gemma 4 26B-A4B | **存在せず**。`gemma3:27b`（17GB / 128K / multimodal）が近似 | Q-L-003 要再判断 |
| Gemma 4 31B | **存在せず**。なし | Q-L-003 要再判断 |
| **gpt-oss-20b** | **`gpt-oss:20b` 完全一致**。14GB / 128K / MXFP4 / Apache 2.0、最低 16GB RAM | Q-L-004 確認可、本機 (15.4GB) はギリギリ未達 |
| Bonsai-8B (mlx-1bit) | Ollama に該当なし。MLX は Ollama 形式と非互換 | Q-L-005 要再判断 |

3. **`docs/open_questions.md` を更新**: Q-L-001〜005 に「2026-05-08 調査」結果を追記。新規 Q-L-010（仕様書モデル名と公式タグの不一致をどう運用するか）を追加し、人間承認必須として記録。

### 変更ファイル

- `sidecar/scripts/download_faster_whisper_small.py`（新規 + UTF-8 出力対応）
- `PreDeckData/models/faster-whisper/small/`（**git 追跡対象外**。`.gitignore` の `*.bin` / `PreDeckData/` で除外）
- `docs/open_questions.md`（Q-L-001〜005 更新、Q-L-010 新規）

### テスト結果

- ダウンロード後の整合性: 6 ファイル取得完了。`model.bin` のサイズ 461.15 MB は HF 上の公開サイズと一致。
- 後で実 ASR ジョブを動かして CT2 ロードできることを別途確認予定（`PreDeck > モデル管理 > ASR モデル登録` 経由）。

### 未決事項

- **Q-L-010（最重要）**: 仕様書記載の forward-looking モデル名 (Qwen 3.5/3.6, Gemma 4 系) が Ollama 上で実在しない件をどう運用するか、人間判断が必要。
  - 案 A: 仕様書を現実の公開タグ (Qwen 3 系 / Gemma 3 系) に更新する → 文書のメンテナの承認要
  - 案 B: 仕様書通り「未提供」として扱い、MVP は **Mock + gpt-oss:20b のみ** で運用 → 本機 RAM 15.4GB なので gpt-oss:20b はギリギリ動作未保証
  - 案 C: ADR を起こして、Qwen 3.5 → qwen3:8b 等のサブスティチューションを「暫定対応」として明文化
- 開発機 (RAM 15.4GB) で実際に動作させる軽量候補の確定 (案 C を採用するなら `qwen3:4b` ≈ 2.5GB 等が現実的)。
- gpt-oss:20b（14GB ダウンロード）を pull するかどうかは、上記 Q-L-010 の判断と同時に。

### 安全上の注意

- ダウンロードは開発者個人 PC 上で完結。アプリ本体は依然として一切の自動取得を行わない。
- HF リクエストは未認証で送信（HF_TOKEN を使用しない）。User-Agent は huggingface_hub の既定。
- Ollama ライブラリへの GET はメタデータ HTML 取得のみで、ユーザーデータ・原稿・ログ・録音・秘密情報は一切送出していない。
- 取得モデルファイルは `.gitignore` の `*.bin`, `PreDeckData/`, `**/*.gguf` で除外済（commit 対象外）。
- ライセンス記録: faster-whisper-small は MIT、`Systran/faster-whisper-small` のリポジトリ README にも明記。`docs/THIRD_PARTY_NOTICES.md` への正式記録は次回更新で実施。

---

## 2026-05-08 13:30（プロジェクトフォルダ名の正規化）

### 実施内容

- ルートフォルダ名を、区切りに Unicode U+2017（DOUBLE LOW LINE）を使っていた旧表記から、ASCII `_` のみの `プレデキ_ver2.0` に変更（ユーザー作業に追随）。
- ドキュメント・venv 内の絶対パス・editable install を新パスに整合。

### 変更ファイル

- `README.md`、`docs/safety_notes.md`、`docs/open_questions.md`（Q-Z-001・解決ログ）
- `sidecar/.venv/Scripts/activate*`（`VIRTUAL_ENV` の絶対パス）
- `sidecar/.venv/Lib/site-packages/__editable___predeck_sidecar_0_0_1_finder.py`（`uv pip install -e` で最終同期）

### テスト結果

- `uv pip install -e ".[dev,asr]"`（sidecar）成功。旧 URL 表記から `…プレデキ_ver2.0/sidecar` へ入れ替わりを確認。

### 未決・フォロー

- **モデル管理に登録済みの `local_path`** に旧パスが残っている場合は、UI で編集するか API で再登録し、`PreDeckData\models\faster-whisper\small` へ **`…\プレデキ_ver2.0\…`** の絶対パスに揃える。

---

## 2026-05-09（MVP: スライド PNG 手動アップロード結線）

### 実施内容

- 仕様 `open_questions.md` Q-T-008（MVP で PNG 手動アップロード）に沿い、**スライド API と UI を結線**した。
- sidecar: `GET/POST /api/sessions/{id}/slides`、`DELETE .../slides/{slide_id}`、`GET .../slides/{slide_id}/file`（画像返却・パストラバーサル防止）。
- `repository.add_slide_png` / `list_slides` / `delete_slide` で `PreDeckData/slides/{session_id}/{slide_id}.png` に保存。
- desktop: `Step1Slides` で PNG 選択→アップロード、`SlidePane` で一覧・サムネ・削除。`client.slideImageFileUrl` でビルドモード別の画像 URL を統一。
- `ErrorBoundary` に TS `override` を付与し **`tsc --noEmit` を通過**させた。

### 変更ファイル（主要）

- `sidecar/app/db/repository.py`、`sidecar/app/schemas/dto.py`、`sidecar/app/api/sessions.py`
- `sidecar/tests/test_slides_api.py`（新規）
- `apps/desktop/src/api/client.ts`、`schemas.ts`、`queries.ts`
- `apps/desktop/src/features/steps/Step1Slides.tsx`、`workbench/SlidePane.tsx`
- `apps/desktop/src/app/ErrorBoundary.tsx`

### テスト結果

- sidecar: `pytest` 全件 **緑**（1 skip 維持）、`test_slides_api.py` 追加
- frontend: `vitest run` **25 passed**、`tsc --noEmit` **エラーなし**

### 残リスク・未決

- PowerPoint / PDF 自動変換は引き続きスコープ外（要件どおり）。
- 画像以外フォーマット、多数ページの一括投入は未対応（PNG のみ・追加順に `slide_index` 採番）。

---

## 2026-05-09（Tauri: sidecar 自動起動・ネイティブ PNG 選択・CSP）

### 実施内容

- **Tauri 2**: `tauri-plugin-dialog` を登録し capabilities に `dialog:default` を追加。
- **sidecar**: `127.0.0.1:8765` が空いているときだけ `python -m app`（失敗時は `py -3 -m app`）を **自動起動**；既にポートが開いている場合はスキップ。終了時は **自前で起動した子プロセスのみ** `kill`。
- sidecar パス: 環境変数 `PREDECK_SIDECAR_DIR`、未設定時は `src-tauri/../../../sidecar`（リポジトリ標準レイアウト）を探索。
- **invoke `read_png_file`**: OS ダイアログで選んだ PNG を Base64 で返却（検証は API と同等）。
- フロント: `tauri-slide-import.ts` で Tauri 時はネイティブ複数選択→読み込み→既存アップロード API。Web 時は `<input multiple>`。
- **CSP**: `img-src` / `connect-src` / `ws:` に `localhost:8765` を追加（sidecar 画像・SSE）。
- **dev build**: `beforeDevCommand` / `beforeBuildCommand` を `npm run dev` / `npm run build` に統一（package-lock ベース）。
- `src-tauri/icons/icon.png` を最小 PNG で配置（バンドルアイコン用）。

### 変更ファイル（主要）

- `apps/desktop/src-tauri/Cargo.toml`, `src/lib.rs`, `src/main.rs`, `tauri.conf.json`, `capabilities/default.json`, `icons/icon.png`
- `apps/desktop/package.json`, `package-lock.json`, `src/lib/tauri-slide-import.ts`, `src/features/steps/Step1Slides.tsx`

### テスト結果

- `tsc --noEmit` / `vitest run`: **成功**
- 本環境に **Rust (cargo) 未導入** のため `cargo check` は未実行。導入後に `apps/desktop/src-tauri` で検証すること。

### 残リスク

- 自動起動は **PATH 上の Python** に依存。仮想環境のみの場合は `PREDECK_SIDECAR_DIR` と venv 有効化済みシェルから `tauri dev` するか、手動で sidecar を先に起動する運用が必要な場合あり。
- Base64 経由の大きな PNG はメモリを消費（MVP 上限 25MB）。
