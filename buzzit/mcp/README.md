# Buzzit MCP（AI連携）

AI から「ネタ追加・重複チェック・下書き作成・予定確認」ができます。承認・予約・投稿はできません（人がバジットで行います）。

## 推奨: リモート MCP（インストール不要）
バジット → 設定 → キャラ → 「AI連携」でキーを発行し、使うAIツール（Cursor / Claude Code / Gemini CLI）の設定をコピーして貼るだけ。
エンドポイント: `https://app.buzzit.shigotoku.com/api/v1/agent/mcp`（`Authorization: Bearer bzk_...`）

## ローカル版（`server.mjs`、予備）
API 未デプロイ環境や開発用。`npm install` のうえ、環境変数 `BUZZIT_API_KEY` を付けて `node server.mjs` を stdio MCP として登録します。

ツール: `list_scheduled` / `list_ideas` / `check_duplicate` / `add_idea` / `create_draft`
キーはキャラごとに別発行。漏れたら設定画面で「無効にする」で即停止できます。
