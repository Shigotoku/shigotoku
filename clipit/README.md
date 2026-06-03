# クリッピット（ClipIt）

操作するだけで、スクショ付き業務マニュアルが完成する SaaS。
ランウィズ / バジットと同一スタック（Astro LP + React/Vite アプリ + Firebase）。

## フォルダ

| パス | 内容 | 技術 |
|------|------|------|
| `landing-page/` | LP（`shigotoku.com/clipit/`） | Astro |
| `app/` | Web アプリ（`app.clipit.shigotoku.com`） | React + Vite |
| `docs/` | 要件定義書ほか | — |
| `api/`（予定） | AI生成・PDF・共有トークン | Cloud Functions |
| `extension/`（予定） | 操作記録 Chrome 拡張 | Manifest V3 |

## 開発

```bash
# LP
cd clipit/landing-page && npm install && npm run dev   # http://localhost:4321/clipit/

# アプリ
cd clipit/app && npm install && npm run dev            # http://localhost:5176
```

## 本番 URL

| URL | 内容 |
|-----|------|
| `https://shigotoku.com/clipit/` | LP |
| `https://shigotoku.com/clipit/pricing/` | 料金 |
| `https://app.clipit.shigotoku.com/` | アプリ |
| `https://app.clipit.shigotoku.com/m/{token}` | 共有マニュアル閲覧（認証不要） |

## デプロイ

LP は既存 `shigotoku-web`（`shigotoku-prod`）にサブパスで同梱。
アプリは専用プロジェクト `shigotoku-clipit-prod-ad9ee` へ（meditoku.jp@gmail.com）。

```bash
cd deploy
npm run deploy:web          # LP を含むコーポレート + 各 LP
npm run deploy:clipit-app   # クリッピット アプリのみ
npm run deploy:web          # LP（shigotoku.com/clipit/）+ コーポレート（shigotoku-prod）
npm run deploy:clipit       # アプリ一式（hosting + storage + firestore）
```

> **MVP 実装済み:** Firestore CRUD / 共有・QR / 公開閲覧 / **Cloud Functions API**（AI・ingest）/ **Chrome拡張（記録）** / マスキングUI（編集画面）  
> **残タスク:** 拡張のウェブストア公開 / サーバーPDF / Stripe / スタッフ招待メール
> `npm run deploy:clipit`（CLI は `meditoku.jp@gmail.com` でログイン）、CI への組み込み。

詳細は [`docs/クリッピット要件定義書.md`](./docs/クリッピット要件定義書.md)。
