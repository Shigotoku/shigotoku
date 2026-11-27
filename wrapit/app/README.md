# WrapIt(ラップイット)— Web App

DeckIt のアプリ構成をコピーして作った、会社のブランドルールを守るショート動画制作アプリ。
設計は `docs/wrapit/DESIGN.md`、名称は `docs/adr/0003-product-name-wrapit.md`。

Next.js App Router（コードは `wrapit/app`）。現状は **Phase A（モック）**。動画レンダリング方式は R0 の PoC 後に決定する。

| モード | 環境変数 | 内容 |
|--------|----------|------|
| mock（デフォルト） | `NEXT_PUBLIC_WRAPIT_DATA_MODE=mock` | UI + モック API（E2E もこれ） |
| firebase | `NEXT_PUBLIC_WRAPIT_DATA_MODE=firebase` + Firebase キー + Admin | Google ログイン、Firestore `wrapit_*` |

## 開発

```bash
npm install
npm run dev
```

## E2E

```bash
cd ../e2e && npm install && npx playwright install chromium && npm test
```

## Firebase / デプロイ

本番は `shigotoku-wrapit-prod`。手順と手動作業は `docs/FIREBASE-WRAPIT-SETUP.md` を参照。
