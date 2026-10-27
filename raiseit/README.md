# レイジット (RaiseIt)(raiseit)

SEO・GEO(生成AI検索)・MEO・SNS の集患施策を、「データで見つける → 安全に直す → 効果を測る」運用として自動化するアプリ。

- 引き渡し・セットアップ手順: [`HANDOVER.md`](./HANDOVER.md)
- 要件: [`docs/要件定義書.md`](./docs/要件定義書.md)
- 競合機能と提案: [`docs/競合機能カタログと提案.md`](./docs/競合機能カタログと提案.md)
- 移管チェックリスト: [`docs/別会社への移管チェックリスト.md`](./docs/別会社への移管チェックリスト.md)

## 主なコマンド(すべて `--site <id>` 対応)

| コマンド | 内容 |
| --- | --- |
| `npm run check:auth` | Google 認証の確認 |
| `npm run fetch:gsc` / `fetch:ga4` / `fetch:src` / `fetch:events` | Search Console / GA4(全体・流入元・イベント)の取得 |
| `npm run fetch:psi` | PageSpeed Insights(実ユーザーデータ含む) |
| `npm run import:social` | SNS 指標の CSV 取り込み |
| `npm run report` | `reports/<id>/latest.html` と `issues.json` を生成 |
| `npm run action:add -- --url ... --note "..."` | 実施した施策を記録(効果測定用) |
| `npm run ai:propose` / `ai:review` | AI 修正案の作成と承認 |
| `npm run check:ad` / `npm test` | 医療広告ガイドラインチェッカー |

設定: `.env`(`env.example` を参照)と `config/sites.json`(`config/sites.example.json` を参照)。
