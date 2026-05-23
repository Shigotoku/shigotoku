# ランウィズ Webアプリ

ランウィズ (Runwith) のメインアプリケーションです。

## 開発

```bash
npm install
npm run dev
```

http://localhost:5174 で起動します。

## 環境変数

`.env.example` を `.env` にコピーして設定してください。

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_LANDING_URL=http://localhost:5173
```

## Supabase

DB マイグレーションは [`../supabase/migrations/`](../supabase/migrations/) を参照してください。
