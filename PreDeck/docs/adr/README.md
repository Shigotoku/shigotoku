# Architecture Decision Records

PreDeck の設計判断記録（ADR）を管理する。

## ADR-001 〜 022

ADR-001 から ADR-022 までは `docs/設計判断記録_20260508.md` に集約されている。
新規 ADR を追加する場合は本フォルダに `ADR-XXX-...md` として作成し、`設計判断記録_20260508.md` 側でも索引を更新する。

| ID | 件名 | 状態 |
|---|---|---|
| ADR-001 | PreDeckの本質を「意思決定突破エンジン」とする | 採用 |
| ADR-002 | 初期GTMをVCピッチ×起業家コミュニティにする | 採用 |
| ADR-003 | 5ステップUIを主導線にする | 採用 |
| ADR-004 | 2.5ペイン・ワークベンチを採用する | 採用 |
| ADR-005 | Desktop RuntimeはTauri 2を採用する | 採用 |
| ADR-006 | FrontendはReact + TypeScript + Viteを採用する | 採用 |
| ADR-007 | UIはTailwind CSS v4 + shadcn/ui + lucide-reactを採用する | 採用 |
| ADR-008 | BackendはPython FastAPI sidecarを採用する | 採用 |
| ADR-009 | データ保存はSQLite + ローカルファイル保存にする | 採用 |
| ADR-010 | Strict Local Modeを既定にする | 採用 |
| ADR-011 | ASR標準はfaster-whisper、代替はwhisper.cppにする | 採用 |
| ADR-012 | Web Speech APIをローカルASRとして不採用にする | 不採用 |
| ADR-013 | ローカルLLMはPC性能別の段階構成にする | 採用 |
| ADR-014 | クラウドAI/BYOKは明示許可モードに限定する | 条件付き採用 |
| ADR-015 | Chrome拡張は初期MVPでは作らない | 採用 |
| ADR-016 | Next.jsは将来Web層に分離する | 採用 |
| ADR-017 | 初期スコアは勝率パーセントではなくチェックリスト形式にする | 採用 |
| ADR-018 | PyMuPDFは標準配布から除外する | 不採用 / 条件付き |
| ADR-019 | FFmpegはLGPLビルドのみ条件付き採用する | 条件付き採用 |
| ADR-020 | LibreOfficeは原則同梱せずユーザー環境を検出する | 条件付き採用 |
| ADR-021 | 相手の表情解析は実装しない | 不採用 |
| ADR-022 | ライセンス安全版構成を正式配布前提にする | 採用 |

## 新規 ADR

| ID | 件名 | 状態 |
|---|---|---|
| [ADR-023](./ADR-023-mvp-mock-first-implementation.md) | MVP は Mock 優先のスタブ実装で骨格を完成させる | 採用 |
| [ADR-024](./ADR-024-sidecar-port-and-paths.md) | sidecar の既定ポートと PreDeckData の配置 | 採用 |
| [ADR-025](./ADR-025-network-guard-implementation.md) | Strict Local Mode のネットワークガード実装方式 | 採用 |
| [ADR-026](./ADR-026-ollama-http-integration.md) | Ollama を HTTP API 経由で接続する | 採用 |
| [ADR-027](./ADR-027-llm-json-schema-and-retry.md) | LLM 出力の JSON Schema 強制と再試行戦略 | 採用 |
| [ADR-028](./ADR-028-faster-whisper-local-files-only.md) | faster-whisper を `local_files_only=True` で運用する | 採用 |

## テンプレート

新規 ADR は [`template.md`](./template.md) を雛形に作成する。
