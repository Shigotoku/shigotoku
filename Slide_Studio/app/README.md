# DeckIt — Web App

Next.js App Router（コードは `Slide_Studio/app`）。

| モード | 環境変数 | 内容 |
|--------|----------|------|
| mock（デフォルト） | `NEXT_PUBLIC_DECKIT_DATA_MODE=mock` | UI + モック API（E2E もこれ） |
| firebase | `NEXT_PUBLIC_DECKIT_DATA_MODE=firebase` + Firebase キー + Admin | Google ログイン、Firestore `deckit_*` |

## 開発

```bash
npm install
npm run dev
```

## E2E

```bash
cd ../e2e && npm install && npx playwright install chromium && npm test
```

Firebase セットアップ: リポジトリ `docs/FIREBASE-DECKIT-SETUP.md`
