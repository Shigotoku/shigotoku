# ShapeIt（シェイプイット）

気づいた瞬間に投稿するだけで、AIが整理・統合・優先順位付けし、開発Todoから修正確認までつなぐ **AI Product Feedback OS**。

ランウィズ / バジット / クリッピットと同一のモノレポ構成（Astro LP + React/Vite アプリ + Cloud Functions API）。

## フォルダ

| パス | 内容 | 技術 |
|------|------|------|
| `landing-page/` | LP（`shigotoku.com/shapeit/`） | Astro |
| `app/` | Web アプリ（`app.shapeit.shigotoku.com`） | React + Vite |
| `api/` | Feedback / AI Triage API | Cloud Functions |
| `extension/` | Chrome 拡張（画面キャプチャ報告） | Manifest V3 |
| `docs/` | 要件定義書 | — |

## 開発

```bash
# LP
cd shapeit/landing-page && npm install && npm run dev   # http://localhost:4321/shapeit/

# アプリ
cd shapeit/app && npm install && npm run dev            # http://localhost:5178

# Chrome 拡張
cd shapeit/extension && npm install && npm run build    # dist/ を Chrome に読み込み

# API（ビルド確認）
cd shapeit/api && npm install && npm run build
```

## 本番 URL（ClipIt と同型）

| URL | 内容 |
|-----|------|
| `https://shigotoku.com/shapeit/` | LP |
| `https://shigotoku.com/shapeit/pricing/` | 料金 |
| `https://shigotoku-shapeit-app.web.app/` | アプリ（暫定 Hosting） |
| `https://app.shapeit.shigotoku.com/` | アプリ（カスタムドメイン・設定後） |

## デプロイ

```bash
cd deploy
npm run deploy:shapeit        # API + アプリ
# または
npm run deploy:shapeit-app
npm run deploy:shapeit-api
```

Firebase Auth の Authorized domains に `shigotoku-shapeit-app.web.app` を追加してください（Google ログイン用）。


