# クリッピット（ClipIt）

操作するだけで、スクショ付き業務マニュアルが完成する SaaS。
ランウィズ / バジットと同一スタック（Astro LP + React/Vite アプリ + Firebase）。

## フォルダ

| パス | 内容 | 技術 |
|------|------|------|
| `landing-page/` | LP（`shigotoku.com/clipit/`） | Astro |
| `app/` | Web アプリ（`app.clipit.shigotoku.com`） | React + Vite |
| `api/` | AI生成・PDF・ingest API | Cloud Functions |
| `extension/` | 操作記録 Chrome 拡張 | Manifest V3 |
| `docs/` | 要件定義書ほか | — |
| `scripts/` | アセット生成など | — |

## 開発

```bash
# アイコン（clipit/extension/public/icon.png を正とし各所へコピー）
node clipit/scripts/generate-assets.mjs

# LP
cd clipit/landing-page && npm install && npm run dev   # http://localhost:4321/clipit/

# アプリ
cd clipit/app && npm install && npm run dev            # http://localhost:5176

# 拡張
cd clipit/extension && npm install && npm run build    # dist/ を Chrome に読み込み
```

## 本番 URL

| URL | 内容 |
|-----|------|
| `https://shigotoku.com/clipit/` | LP |
| `https://shigotoku.com/clipit/pricing/` | 料金 |
| `https://app.clipit.shigotoku.com/` | アプリ |
| `https://app.clipit.shigotoku.com/m/{token}` | 共有マニュアル閲覧（認証不要） |
| `https://app.clipit.shigotoku.com/extension/install` | Chrome拡張インストール手順 |

## デプロイ

```bash
cd deploy
npm run deploy:web          # LP + コーポレート
npm run deploy:clipit-app   # アプリのみ
npm run deploy:clipit-api   # API のみ
npm run deploy:clipit       # hosting + functions + firestore + storage
```

> **実装済み:** Firestore CRUD / 共有・QR / 公開閲覧 / Cloud Functions API / Chrome拡張（記録）/ 初回オンボーディング / メール新規登録  
> **残タスク:** Chrome ウェブストア公開 / Stripe 課金 / 招待メール自動送信

詳細は [`docs/クリッピット要件定義書.md`](./docs/クリッピット要件定義書.md)、Firebase セットアップは [`docs/FIREBASE-CLIPIT-SETUP.md`](../docs/FIREBASE-CLIPIT-SETUP.md)。
