# PreDeck 安全運用メモ

最終更新日: 2026-05-08

本書は AI エージェントが PreDeck を実装・運用する上で守らねばならない安全境界を一覧する。
仕様3ファイル（要件定義書 Ver7.0、AI開発指示書、設計判断記録）と本プロジェクトの初期承認事項を起点に作成している。

---

## 1. 絶対遵守

### 1.1 ファイルシステム境界

- プロジェクトフォルダ（`プレデキ_ver2.0/`）外のファイルを読み書きしない。
- `~/`, `/`, `C:\Users\`, `Downloads`, `Documents`, 他プロジェクト、親ディレクトリには触れない。
- `PreDeckData/` を明示的にプロジェクト直下に置き、開発時は他のディレクトリへ書き出さない。

### 1.2 ネットワーク境界

- ランタイムでの実通信は `127.0.0.1` / `localhost` / `::1` のみ許可。
- 開発時のパッケージレジストリ通信（npm / pip / cargo registry）はユーザー承認のもとで都度実施する。
- Hugging Face Hub、Hugging Face Mirror、OpenAI、Gemini、Azure、Google Speech、その他外部 API へは送らない・取りに行かない。
- モデル自動ダウンロードは禁止。faster-whisper / whisper.cpp / Ollama 等を呼ぶ場合も、必ずローカルパス指定を強制する。

### 1.3 秘密情報

- `.env`、APIキー、認証情報、トークン、秘密鍵を作成・変更・表示・送信しない。
- `.env.example` のようなダミー設定ファイルのみ作成可。
- 取り違え事故防止のため、`.env*` を `.gitignore` に必ず追加する（`.env.example` は例外）。

### 1.4 破壊的コマンド

- `rm -rf`, `del /s`, `git reset --hard`, `git clean -fdx`, データベース全削除、マイグレーション破壊は人間承認なしに実行禁止。
- Windows `Remove-Item -Recurse -Force` も同様に禁止。
- 既存の Git 履歴を書き換えない（`git filter-branch`, `git rebase -i`, `git push --force`）。

### 1.5 ライセンス

- AGPL / GPL / 商用制約 / モデル再配布制約が疑われるライブラリ・モデルを勝手に追加しない。
- PyMuPDF 無償版、GPL 有効 FFmpeg、nonfree 有効 FFmpeg、LibreOffice 同梱、Microsoft Office 本体同梱、Web Speech API（ローカル ASR として）、Llama 4 系標準同梱、FunASR / SenseVoice 標準同梱は禁止。
- 「ライセンス未確認のモデル」は配布物に含めない。検証目的でユーザー個人 PC にダウンロードする場合も、人間承認後に行う。

### 1.6 外部送信機能

- ユーザー音声、原稿、スライド、ログを外部 LLM / API に送信する機能を MVP では実装しない。
- クラウド許可モードは「設定項目・警告 UI・スタブ」のみ実装し、`run()` は常にエラーを返す。
- 実送信を有効化するときは、ADR-014 の必須条件（送信データ・送信先・保存方針・課金・解除方法の表示、設定履歴、Strict Local Mode への戻り導線、人間承認）を満たす必要がある。

---

## 2. 実装上の安全装置

### 2.1 Strict Local Mode の実装位置

| 層 | 実装 |
|---|---|
| sidecar ネットワークガード | `socket.connect` フックで非ループバック宛先をブロック |
| sidecar HTTP クライアント | `httpx`, `requests` の使用箇所をテストで検出 |
| sidecar 設定 | `settings.strict_local_mode = true` を起動時に強制ロード |
| frontend fetch | `tauri://localhost` または `http://127.0.0.1:8765` 以外には fetch しない |
| Tauri 側 | `tauri.conf.json` の CSP / `allowlist` / `bundle.identifier` を最小権限に設定 |

### 2.2 モデル管理

- `asr_models` / `llm_models` テーブルにローカルパスを必須カラムとして持つ。
- ユーザーがモデルファイルを「インポート」操作で `PreDeckData/models/` に配置する設計。
- アプリは `PreDeckData/models/` 以外の場所を読まない。`os.path` の正規化と `Path.is_relative_to` でパスエスケープを防ぐ。

### 2.3 ジョブ実行

- 全ジョブはローカル `asyncio` で実行。外部キューや外部 DB は使わない。
- ジョブログは `PreDeckData/logs/jobs/` に保存。ローテーションは Phase 2 以降。

### 2.4 録音データ

- 録音は `PreDeckData/recordings/{session_id}/{iteration_id}.webm` に保存。
- ストリーミングや WebRTC で外部に出ないことを明示的にテストする。
- Tauri WebView での MediaRecorder API は OS マイクを使うが、録音バイトはアプリ内で完結する。

---

## 3. 開発フロー上の注意

### 3.1 依存追加

- 仕様3ファイルに明記された依存（Tauri 2 / React 19 / TypeScript / Vite / Tailwind v4 / shadcn-ui / lucide-react / Zustand / TanStack Query / Zod / React Hook Form / FastAPI / SQLModel または SQLAlchemy / faster-whisper / whisper.cpp / Ollama 接続 / llama.cpp 接続）は事前一括承認済。
- それ以外は本書 §1 と仕様 §14（ライセンス）に違反しない範囲で「追加候補リスト」を `docs/open_questions.md` に記録し、ユーザー承認を取る。
- 実 `npm install` / `pip install` / `cargo install` は実通信のため、ユーザーの「許可」コマンドが出るまで実施しない。

### 3.2 Git

- `git init` 実施可（ユーザー承認済）。
- `git commit` までは可（ユーザー承認済）。
- `git push` および `git remote add` は禁止。
- 仕様 PDF / 機密ファイルは `.gitignore` に明記。

### 3.3 リファクタ・削除

- 既存コードの大規模削除（100 行以上）はユーザー承認後。
- DB スキーマの破壊的変更（`DROP TABLE`, カラム削除）は人間承認必須。

### 3.4 テスト

- 全テストはローカルで完結。CI 連携・GitHub Actions・Codecov 等への接続は実装しない。

---

## 4. 禁止実装リスト（仕様 §11 + ADR からの抜粋）

| 禁止実装 | 理由 |
|---|---|
| ユーザー音声を外部 API へ送信する機能 | Strict Local Mode 違反 |
| 原稿・スライド・ログを外部 LLM へ送信する機能 | Strict Local Mode 違反 |
| Hugging Face Hub 等からの自動モデルダウンロード | Strict Local Mode 違反、再現性低下、ライセンス確認不能 |
| Web Speech API をローカル ASR として扱う実装 | Edge では Azure Cognitive Services を使うため外部送信される（Microsoft 公式ポリシー文書） |
| OpenAI API / Gemini API を既定で使う実装 | Strict Local Mode 違反 |
| PyMuPDF 無償版を前提にした商用配布向け PDF 処理 | AGPL / 商用ライセンス問題 |
| AGPL / GPL 依存を無確認で追加すること | 商用配布制約 |
| Chrome 拡張の先行実装 | ADR-015 で Phase 2 以降と確定 |
| 決済・共有・チーム管理の先行実装 | Phase 4 以降 |
| 本番配布インストーラの先行作成 | 今回のスコープ外（ユーザー承認済） |
| プロジェクト外ファイルへのアクセス | 安全境界違反 |
| 勝率を初期からパーセントで断定表示 | ADR-017。信頼性不足 |
| 相手の表情解析 | ADR-021。同意・規約・法規制リスク |

---

## 5. 監査・記録

- 大きな作業単位の終了ごとに `docs/dev-notes/progress_log.md` に追記。
- ADR 変更は `docs/adr/` を更新。
- ライセンス上の判断は `docs/THIRD_PARTY_NOTICES.md` と `docs/licenses/` に反映。
- 設計判断の追加は新規 ADR として `docs/adr/ADR-XXX-...md` を起こす（既存 ADR は上書きしない）。

---

## 6. 例外発生時の対応

エージェントは次のいずれかの状況に遭遇したら、即時停止しユーザーに確認を取る。

1. 仕様3ファイル間で重大な矛盾があり、解釈を選ぶと後戻りが大きい
2. 実装すると外部通信が必要になる
3. 仕様3ファイルにない依存追加が必要
4. ライセンスが不明な依存・モデルを使う必要がある
5. 既存コードを大きく削除する必要がある
6. DB スキーマを破壊的に変更する必要がある
7. 秘密情報の入力・保存が絡む
8. ユーザーデータを外部に出す可能性がある

---

## 7. 開発環境例外ポリシー（モデル取得）

### 7.1 アプリ本体への自動取得実装の禁止（再掲・厳守）

PreDeck アプリ本体には、いかなる経路でも**モデル自動ダウンロード機能を実装しない**。

- Hugging Face Hub / Hugging Face Mirror への直接通信は禁止。
- Ollama Library (`https://ollama.com/library` / `https://registry.ollama.ai`) への直接通信を、アプリの自動処理として実装することも禁止。
- ユーザーが自らホスト OS 上で `ollama pull` / `huggingface-cli download` 等を実行し、結果のローカルパスを **手動で** PreDeck の「モデル登録」UI に入力する設計に限定する。
- アプリ実行時はモデル ID やローカルパスのみを参照し、未登録ならジョブを `failed` で終了させる。`次のアクション` テキストとして「PreDeckData/models/ に手動配置 → モデル登録」を案内する。

### 7.2 開発者個人の検証用モデル取得の例外

開発エンジニア（ユーザー）が自分の開発機で実 LLM / 実 ASR の動作検証を行う目的で、以下を**例外的に**許容する。これは**ユーザー個人の権限と承認に基づく開発作業**であり、PreDeck のランタイム機能ではない。

- ユーザー自身が PowerShell から `ollama pull <tag>` を実行する。
- ユーザー自身が `huggingface_hub` Python ライブラリを使い、特定モデルをローカルに `snapshot_download` する。

例外を適用する条件：

1. **AIエージェントは事前に必ず以下を提示**して、ユーザーの**明示承認**を得る。
   - 実行コマンド（完全な文字列）
   - モデルタグ／リポジトリ ID
   - ダウンロードサイズと推定ディスク使用量
   - 推定 RAM / VRAM 要件
   - ライセンス上の注意（再配布可否は別問題）
   - 仕様書上のどのモデル区分（標準 / 軽量 / 高品質 / 推論診断 / 上級）に対応するか
2. ユーザーが「承認」と明言したコマンドのみ実行する。
3. 取得後、**そのモデルファイルを `git` 管理下に絶対に置かない**（`.gitignore` で `*.gguf`, `*.bin`, `*.safetensors`, `*.ct2`, `PreDeckData/`, `~/.ollama/` 配下を除外）。
4. ライセンス文書を `docs/licenses/<model_name>/` 配下にコピーまたは参照リンクで残す。
5. `docs/dev-notes/progress_log.md` に「実行コマンド・取得モデル・取得日時・取得目的・サイズ・ライセンス」を記録する。
6. 本ポリシーが適用されたモデルは `THIRD_PARTY_NOTICES.md` に「**ユーザー個人取得 / 配布物には含めない**」のラベルを付与する。

### 7.3 Bonsai-8B-mlx-1bit に関する追加注意

仕様書の軽量モデル候補のうち `prism-ml/Bonsai-8B-mlx-1bit` は **MLX 1bit 量子化版で Apple Silicon 限定の可能性** がある（`docs/open_questions.md` Q-L-005）。Windows / x86_64 / ARM64 環境では実行不能と扱い、対応プラットフォームが Apple Silicon に確定するまで開発機への取得提案を行わない。

### 7.4 Qwen / Gemma / gpt-oss 系モデルのタグ確定状況

仕様書（要件定義書 §3.7、AI開発指示書 §13.1、設計判断記録）に記載されている `Qwen3.5-9B`, `Qwen3.6-35B-A3B`, `Gemma 4 E4B`, `Gemma 4 26B-A4B`, `Gemma 4 31B`, `gpt-oss-20b` のすべての **Ollama 公式タグの実在性は 2026-05-08 にユーザー承認のもと確認済**。詳細は `docs/dev-notes/open_questions.md` Q-L-001〜004 と `docs/dev-notes/progress_log.md` 2026-05-08 07:50 の節を参照。

確認済タグ:

| 仕様書名 | Ollama タグ | サイズ | 量子化 | ライセンス | コンテキスト |
|---|---|---|---|---|---|
| Qwen3.5-9B | `qwen3.5:9b` | 6.6 GB | Q4_K_M | Apache-2.0 | 256K |
| Qwen3.6-35B-A3B | `qwen3.6:35b-a3b-coding-nvfp4` (など) | 22 GB〜 | NVFP4/MXFP8/BF16 | Apache-2.0 | 256K |
| Gemma 4 E4B | `gemma4:e4b` | 9.6 GB | Q4_K_M | Apache-2.0 | 128K |
| Gemma 4 26B-A4B | `gemma4:26b` (= `26b-a4b-it-q4_K_M`) | 18 GB | Q4_K_M | Apache-2.0 | 256K |
| Gemma 4 31B | `gemma4:31b` | 20 GB | Q4_K_M | Apache-2.0 | 256K |
| gpt-oss-20b | `gpt-oss:20b` | 14 GB | MXFP4 | Apache-2.0 | 128K |
| Bonsai-8B (mlx-1bit) | Ollama 配布なし | — | — | — | — |

引き続き AIエージェントは以下を遵守する：

- 仕様書の正式モデル名はそのまま PreDeck UI / カタログ API に記録する（書き換え禁止）。
- `qwen2.5`, `gemma2`, `gemma3`, `qwen3`, `llama3` 等の **類似モデル名で代替表示してはならない**。
- 再配布可否（Q-L-001〜005）は実在性が確認できても**別問題**。配布物への同梱は依然として人間承認必須。
- Ollama 公式ライブラリ (`https://ollama.com/library/<name>:<tag>`) への HTTP GET は外部通信に該当するため、**メタデータ確認目的に限り**、ユーザー個別承認のもとで AIエージェントが実行する。pull 自体は別承認。
- 過去に AIエージェントが「実在しない」と誤断した場合は、必ず複数の URL パターン（`/library/<name>`, `/library/<name>/tags`, `/library/<name>:<tag>`）でクロスチェックし、結論を得る前にユーザーへ提示する。
