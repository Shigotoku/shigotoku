# ADR-024: sidecar の既定ポートと PreDeckData の配置

| 項目 | 内容 |
|---|---|
| 状態 | 採用（暫定） |
| 決定日 | 2026-05-08 |
| 起票者 | AI エージェント |
| 関連 | ADR-008, ADR-009, ADR-010、AI開発指示書 §3.1, §8 |

## 背景

仕様3ファイルには sidecar の具体的なポート番号や `PreDeckData/` の配置場所の指定がない。
MVP を立ち上げるには暫定の値が必要である。

## 判断

| 項目 | 暫定値 | 備考 |
|---|---|---|
| sidecar host | `127.0.0.1` | Strict Local Mode で許可される唯一のホスト群のひとつ |
| sidecar port | `8765` | 一般的に未使用。設定で変更可能 |
| `PreDeckData/` 開発時の配置 | プロジェクト直下 `PreDeckData/` | サブディレクトリは仕様 §9.2 のとおり |
| `PreDeckData/` 本番想定 | OS 別の標準ディレクトリ | `要確認` として open_questions Q-D-001 に記録 |
| DB ファイル | `PreDeckData/predeck.sqlite3` | SQLModel で `create_all` |
| ログファイル | `PreDeckData/logs/sidecar.log` | ローテーションは Phase 2 |

## 代替案

- ポートを `8000` にする案: 他の FastAPI 例と衝突しやすい。却下。
- `PreDeckData/` を `~/Documents/PreDeck/` に置く案: 開発中の権限・パス問題を避けるため、リリースまで保留。

## 影響

- フロントエンドの API ベース URL は `http://127.0.0.1:8765`。設定で変更可能。
- Tauri の CSP / `allowlist` で `http://127.0.0.1:8765` を許可する。

## 必須条件・後続タスク

- 本番リリース前に `PreDeckData/` の正式配置を決定（OS 別）。
- ポート競合検出と空きポート探索を Phase 2 で実装。

## 参照

- AI開発指示書 §3.1, §8
- 要件定義書 §9.2
