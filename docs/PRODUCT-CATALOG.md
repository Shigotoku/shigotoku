# 製品カタログ

> 2026-11-27 作成。リポジトリ上の事実(フォルダ・`deploy/.firebaserc`・`deploy/build.config.mjs`・各 README)に基づく。
> 「要確認」は、コード・ドキュメントから断定できない項目。更新担当は変更時にこの表を直すこと。

## 1. 製品一覧

| 製品 | フォルダ | 構成 | Firebase プロジェクト | アプリ URL | 備考 |
|------|----------|------|----------------------|------------|------|
| コーポレート | `corporate-site/` | Astro | `shigotoku-prod`(`shigotoku-web`) | shigotoku.com | 各 LP を同一 Hosting に同梱 |
| BuzzIt(バジット) | `buzzit/` | LP(Astro)+ App(React/Vite)+ API(Functions/Express) | `shigotoku-prod` | app.buzzit.shigotoku.com | SNS 運用・LINE CRM。店舗単位課金 |
| RunWith(ランウィズ) | `runwith/` | LP + App(React/Vite) | `shigotoku-runwith-prod` | app.runwith.shigotoku.com | 創業支援。会社+席課金。Stripe 未実装(2026-06 時点の仕様書) |
| ClipIt(クリッピット) | `clipit/` | LP + App + API + Chrome 拡張 | `shigotoku-clipit-prod-ad9ee` | app.clipit.shigotoku.com | 操作記録型マニュアル |
| ShapeIt(シェイプイット) | `shapeit/` | LP + App + API + 拡張 | `shigotoku-shapeit-prod` | app.shapeit.shigotoku.com | プロダクトフィードバック OS |
| DeckIt(デキット) | `deckit/` | LP + App(**Next.js**)+ packages/domain, google-adapters | `shigotoku-deckit-prod` | app.deckit.shigotoku.com | Slides 生成。Phase A(mock)から段階実装。Cloud Run 想定 |
| PreDeck(プレデキ) | `PreDeck/` | LP + App + API | `shigotoku-predeck-prod` | app.predeck.shigotoku.com | プレゼン練習・音声 |
| RaiseIt(レイズイット) | `raiseit/` | LP + App + スクリプト(Cloud Run Job 想定) | `shigotoku-raiseit-prod` | app.raiseit.shigotoku.com | 競合調査・医療広告チェック等 |
| (構想)Reelit | `reelit/`(未作成) | — | `shigotoku-reelit-prod`(未作成) | — | 動画版 DeckIt。[`docs/reelit/DESIGN.md`](./reelit/DESIGN.md) |

## 2. 横断ルール(現状の事実)

- **データ分離**: 製品ごとに別 Firebase プロジェクト・別 Auth。同じメールでも製品間は別アカウント。ADR-0001 参照。
- **デプロイ**: `main` への push で `.github/workflows/deploy.yml` が走る(全体)。PR 用の検証は `.github/workflows/ci.yml`(本番に触れない)。
- **テスト**: `npm run test:billing`(ルート)で BuzzIt / RunWith の課金計算を検証。`shapeit/app`・`PreDeck/app` は vitest、`raiseit/scripts` は node テスト、`deckit/e2e` は Playwright。
- **課金実装**: BuzzIt `buzzit/api/src/services/billing.ts`、RunWith `runwith/app/src/lib/billing.ts`、ClipIt は `clipit/docs/BILLING-RULES.md`。決済連携(Stripe 等)の状況は製品ごとに要確認。

## 3. 要確認(担当者が埋める)

| 項目 | 確認内容 |
|------|----------|
| 名義 | GCP/Firebase・ドメイン・AI API 契約の名義(法人/個人/メディトク) |
| IP | メディトク由来コード(DeckIt の GAS 版など)の権利関係 |
| 本番/開発 | 各製品が本番公開済みか、ベータか |
| 決済 | 各製品の Stripe / PAY.JP 導入状況 |
| 顧客数 | 製品別の有料契約数・MRR(まだ計測基盤なし) |
