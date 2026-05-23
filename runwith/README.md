# ランウィズ（Runwith）

スタートアップ創業支援プラットフォーム「ランウィズ」のプロジェクト群です。

## フォルダ構成

| フォルダ | 内容 |
|---------|------|
| [`landing-page/`](./landing-page/) | ランディングページ（Astro） |
| [`app/`](./app/) | Webアプリ（React + Vite + Supabase） |
| [`supabase/`](./supabase/) | DB マイグレーション |

## 開発

```bash
# ランディングページ（http://localhost:4321）
cd landing-page && npm install && npm run dev

# Webアプリ（http://localhost:5174）
cd app && npm install && npm run dev
```

## 環境変数

- **landing-page**: `PUBLIC_APP_URL` — アプリの URL（CTA のログインリンク先）
- **app**: `VITE_LANDING_URL` — LP の URL（ヘッダーの機能・料金リンク先）

本番例:

```
# landing-page/.env
PUBLIC_APP_URL=https://runwith-app.shigotoku.com

# app/.env
VITE_LANDING_URL=https://runwith.shigotoku.com
```

## デプロイ

| プロジェクト | 想定ドメイン |
|-------------|-------------|
| landing-page | `runwith.shigotoku.com` |
| app | `runwith-app.shigotoku.com` |
