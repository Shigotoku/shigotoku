# ShapeIt 実装ステータス

| 領域 | 状態 | メモ |
|------|------|------|
| LP | 公開済 | Privacy（CMP-004） |
| アプリ | 公開済 | https://app.shapeit.shigotoku.com |
| 組織共有 | 実装済 | 会社ごとに org 分離 · 管理者 signup · 招待制メンバー |
| Members / Projects | 実装済 | `/signup` `/setup` `/invite/:token` · **招待リンクのコピー共有**（メール自動送信なし・無料運用） |
| Fix Packs | 強化 | URL集約 · サブパック · 組織共有メタ · 一括プロンプト · Board/Issue導線 |
| Closed Loop | 強化 | Done→投稿者通知(uid) · Changelog冪等+編集 · 公開ページ(CL-002) |
| Changelog | 強化 | cloud 編集/visibility · 公開読取ルール · 複合インデックス |
| Digest | 強化 | cloud 集計対応 · **週次改善サマリー（全社員通知 + Slack）** |
| Feature flags | 強化 | ルートゲート + Nav 連動 |
| Ideas / Roadmap | 強化 | ARR・ソート · Unassigned · ←→ |
| Hotkeys / Search | 強化 | 主要画面ショートカット · Changelog/ナビ検索 |
| Board a11y | 強化 | フォーカス + ←→ 列移動 · カードから修正パック |
| 通知 | 強化 | Due / Assignee / @mention / SLA · Doneは投稿者へ |
| CSV | 強化 | プレビュー → 取込 |
| Legal / Golden | 強化 | チェック可 · スコア履歴 |
| PWA / モバイル | 強化 | ボトムナビ · Safari ホーム追加 · Share Target · スクショ貼付 · 音声認識ハイブリッド |
| Extension | 強化 | privacyHints 配線 · 携帯では非対応を明示 |
| Tests | 8件+ | vitest |

## Dogfooding

1. デモ開始 → 設定でリセット再シード
2. Board カード「修正パック」→ プロンプトコピー → Done
3. 別ユーザー投稿の Done 通知が投稿者に届くこと
4. Changelog 公開切替 → `/public/changelog`
5. Ideas で ARR · Roadmap Unassigned

## 外部依存で未着手

メール自動送信（任意・Resend/SMTP 設定時のみ。既定は招待リンクを Slack 等で手動共有）、SSO/SAML、本課金、専用 GCP、Session replay 本実装、Changelog embed Widget、Customer Portal 本実装
