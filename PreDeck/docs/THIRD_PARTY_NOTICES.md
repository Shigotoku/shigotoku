# THIRD_PARTY_NOTICES

PreDeck で利用する第三者ソフトウェアと、関連ライセンス情報の管理一覧。

> **重要**: 本ファイルは雛形である。実際の OSS をインストール・同梱する段階で、各ライブラリの公式リポジトリから最新のライセンス文言を取得し、`docs/licenses/` 配下に全文を配置すること。最終的な表記内容は法務承認が必要（`docs/open_questions.md` Q-L-008）。

## 1. 同梱予定の OSS（標準配布候補）

仕様 §14 に基づくライセンス安全版構成。

| 区分 | ライブラリ | 想定バージョン | ライセンス | 商用利用 | 再配布 | 同梱 | 備考 |
|---|---|---|---|---|---|---|---|
| Desktop | Tauri 2 | 2.x | MIT / Apache-2.0 | OK | OK | OK | https://v2.tauri.app/blog/tauri-20/ |
| Frontend | React | 19.x | MIT | OK | OK | OK | https://react.dev/ |
| Frontend | TypeScript | 5.x | Apache-2.0 | OK | OK | OK | https://www.typescriptlang.org/ |
| Frontend | Vite | 6.x | MIT | OK | OK | OK | https://vitejs.dev/ |
| UI | Tailwind CSS | 4.x | MIT | OK | OK | OK | https://tailwindcss.com/blog/tailwindcss-v4 |
| UI | shadcn/ui | latest | MIT | OK | OK | OK | https://ui.shadcn.com/ |
| UI | lucide-react | latest | ISC | OK | OK | OK | https://lucide.dev/ |
| State | Zustand | 5.x | MIT | OK | OK | OK | https://github.com/pmndrs/zustand |
| State | TanStack Query | 5.x | MIT | OK | OK | OK | https://tanstack.com/query |
| Form | React Hook Form | 7.x | MIT | OK | OK | OK | https://react-hook-form.com/ |
| Validation | Zod | 3.x | MIT | OK | OK | OK | https://zod.dev/ |
| Backend | FastAPI | 0.115+ | MIT | OK | OK | OK | https://fastapi.tiangolo.com/ |
| Backend | Uvicorn | 0.30+ | BSD-3-Clause | OK | OK | OK | https://www.uvicorn.org/ |
| Backend | SQLModel | 0.0.22+ | MIT | OK | OK | OK | https://sqlmodel.tiangolo.com/ |
| Backend | Pydantic | 2.x | MIT | OK | OK | OK | https://docs.pydantic.dev/ |
| Backend | sse-starlette | latest | BSD-3-Clause | OK | OK | OK | https://github.com/sysid/sse-starlette |

## 2. 条件付き採用（個別ライセンス確認が必要）

| 区分 | ライブラリ / モデル | ライセンス | 採用条件 | 備考 |
|---|---|---|---|---|
| ASR | faster-whisper | MIT | OK | https://github.com/SYSTRAN/faster-whisper |
| ASR | whisper.cpp | MIT | OK | https://github.com/ggml-org/whisper.cpp |
| ASR モデル | Whisper weights (small/medium/turbo/large-v3) | MIT (OpenAI) | 配布元固定が必要 | Q-L-006 |
| LLM Runtime | Ollama | MIT | OK | https://docs.ollama.com/ |
| LLM Runtime | llama.cpp | MIT | OK | https://github.com/ggml-org/llama.cpp |
| LLM Model | Qwen3.5-9B | Apache-2.0（要確認） | 量子化版・ミラー版の同梱可否確認が必要 | Q-L-001 |
| LLM Model | Qwen3.6-35B-A3B | Apache-2.0（要確認） | 同上 | Q-L-002 |
| LLM Model | Gemma 4 系 | Gemma Terms of Use | 同梱・再配布条件を確認 | Q-L-003 |
| LLM Model | gpt-oss-20b | Apache-2.0（要確認） | 配布条件を確認 | Q-L-004 |
| LLM Model | Bonsai-8B (mlx-1bit) | 要確認 | Apple Silicon 限定の可能性 | Q-L-005 |
| Media | FFmpeg | LGPL ビルドのみ | `--enable-gpl`, `--enable-nonfree` を含めない | Q-L-007, ADR-019 |
| PDF | pypdf | BSD-3-Clause | OK | https://github.com/py-pdf/pypdf |

## 3. 標準配布から除外

| 対象 | 理由 |
|---|---|
| PyMuPDF 無償版 | AGPL または商用ライセンス（ADR-018） |
| GPL 有効 FFmpeg | 配布制約と衝突（ADR-019） |
| nonfree 有効 FFmpeg | 同上 |
| LibreOffice 同梱 | 同梱・再配布の通知義務が重い（ADR-020） |
| Microsoft Office 本体 | 再配布不可 |
| Web Speech API | 外部送信リスク（ADR-012） |
| OpenAI API / Google Speech / Azure Speech（Strict Local Mode） | 外部送信（ADR-014） |
| Llama 4 系の標準同梱 | Community License の追加条件管理が必要（ADR-022） |
| FunASR / SenseVoice | モデル単位ライセンス確認が必要 |
| ライセンス未確認モデル | 条件未確定 |

## 4. ライセンス全文の配置

各 OSS の LICENSE 全文は `docs/licenses/` 配下に配置する。

```
docs/licenses/
├─ tauri.txt              # MIT / Apache-2.0
├─ react.txt              # MIT
├─ typescript.txt         # Apache-2.0
├─ vite.txt               # MIT
├─ tailwindcss.txt        # MIT
├─ shadcn-ui.txt          # MIT
├─ lucide-react.txt       # ISC
├─ zustand.txt            # MIT
├─ tanstack-query.txt     # MIT
├─ react-hook-form.txt    # MIT
├─ zod.txt                # MIT
├─ fastapi.txt            # MIT
├─ uvicorn.txt            # BSD-3-Clause
├─ sqlmodel.txt           # MIT
├─ pydantic.txt           # MIT
├─ sse-starlette.txt      # BSD-3-Clause
├─ faster-whisper.txt     # MIT
├─ whisper-cpp.txt        # MIT
├─ ollama.txt             # MIT
├─ llama-cpp.txt          # MIT
└─ pypdf.txt              # BSD-3-Clause
```

> Phase 1 では `docs/licenses/` フォルダを用意するのみ。各ファイルは依存導入時に追加する。

## 5. アプリ内ライセンス画面

`/settings/about` 画面で以下を表示する。

- 本アプリのバージョン
- 本ファイル（THIRD_PARTY_NOTICES）の最新版へのリンク
- 同梱 OSS 一覧と各ライセンス
- モデルレジストリ（インポート済み ASR / LLM モデルとライセンス）

## 6. 更新運用

- 依存追加・更新時に必ず本ファイルを更新する。
- リリースゲートに `docs/licenses/` の網羅確認を入れる。
- 法務承認が下りるまで、本ファイルは「ドラフト」扱いとする。
