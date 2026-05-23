# ランウィズ ランディングページ

ランウィズ (Runwith) のマーケティングサイト（Astro）です。

## 開発

```bash
npm install
npm run dev
```

http://localhost:4321 で起動します（Astro デフォルト）。

## 環境変数

`.env.example` を `.env` にコピーし、アプリ URL を設定してください。

```
PUBLIC_APP_URL=http://localhost:5174
```

CTA ボタン（「無料で始める」等）はこの URL の `/login` へリンクします。

## ビルド

```bash
npm run build
npm run preview
```

静的サイトとして `dist/` に出力されます。Cloud Storage + CDN や CloudFront 等へのデプロイに適しています。
