# BuzzIt API（GCP Cloud Functions）

Firebase Cloud Functions + Cloud Storage による BuzzIt バックエンド。

## エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| POST | `/v1/upload/signed-url` | GCS 署名付きアップロード URL 発行 |
| POST | `/v1/repurpose` | Repurpose（1→多変換） |
| POST | `/v1/schedule` | SNS 予約投稿（Ayrshare 連携予定） |

本番では `app.buzzit.shigotoku.com/api/**` 経由で同一オリインアクセス。

## ローカル開発

```bash
cd buzzit/api
npm install
npm run build

# 別ターミナルでエミュレータ（deploy ディレクトリから）
cd deploy
npx firebase emulators:start --only functions,storage

# アプリ（Vite が /api をエミュレータへプロキシ）
cd buzzit/app
npm run dev
```

## デプロイ

```bash
cd deploy
npm run deploy:buzzit-api   # API + Storage ルールのみ
npm run deploy:buzzit-app   # アプリ + API + Storage
```

初回デプロイ前に Firebase Console で **Storage** を有効化してください。
