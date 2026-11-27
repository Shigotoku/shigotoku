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

## Firebase

`shigotoku-wrapit-prod` は**未作成**。作成後、`docs/FIREBASE-DECKIT-SETUP.md` を参考に
`docs/FIREBASE-WRAPIT-SETUP.md` を追加する。本番デプロイ設定（`deploy/`）も未追加。
