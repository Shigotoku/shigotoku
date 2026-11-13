# Buzzit MCP（AI連携）

どの AI（ChatGPT / Claude / Gemini / Cursor など、MCP 対応ツール）からでも、バジットへ下書きを送れます。
承認・予約確定・投稿はできません（人がバジットで行います）。

## 使い方
- ChatGPT / Claude（Web）: コネクタ（カスタム）にURLだけ貼り、ログインして「許可」（OAuth・キー不要）
- Cursor / Claude Code / Gemini CLI: キーを発行して設定を貼る

バジット → 設定 → キャラ → 「AI連携」でキーを発行し、使うツールの設定をコピーして貼るだけ。
エンドポイント: `https://app.buzzit.shigotoku.com/api/v1/agent/mcp`（`Authorization: Bearer bzk_...`）

## ツール
- 確認: `overview` / `list_scheduled` / `get_post` / `search_posts` / `tag_report` / `check_duplicate`
- ネタ: `list_ideas` / `add_idea`
- メディア: `upload_media`（URL指定）/ `get_upload_url`（大きな動画）
- 計画・成果: `get_plan` / `plan_gaps`（投稿計画の空き枠）/ `performance_report`（伸びたタグ・曜日・時間帯）
- 作成: `create_draft`（tags・topic・画像/動画付き）/ `adapt_post`（他SNS形式へ変換して下書き化）

実装は `buzzit/api/src/services/mcpRemote.ts` / `agentApi.ts`。
