# ランウィズ Webアプリ

ランウィズ (Runwith) のメインアプリケーションです（React + Vite + Firebase）。

## 開発

```bash
npm install
npm run dev
```

http://localhost:5174 で起動します。

## 環境変数

`.env.example` を `.env` にコピーして設定してください。

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
# 以下は未設定ならコード内の既定値（本番プロジェクト）を使用
# VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_STORAGE_BUCKET / VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_LANDING_URL=http://localhost:5173
```

Firebase の設定が無い場合はデモモード（ローカル保存）で動作します。

## 補足

`../supabase/migrations/` は旧Supabase構成の参照用です。現在のアプリはFirebaseを使用しています。
