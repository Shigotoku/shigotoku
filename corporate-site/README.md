# シゴトク コーポレートサイト

株式会社シゴトクの公式ホームページ（Astro）です。

## 開発

```bash
npm install
npm run dev
```

http://localhost:4321 で起動します。

## 環境変数

`.env.example` を `.env` にコピーして、プロダクト URL を設定してください。

```
PUBLIC_RUNWITH_LP_URL=/runwith/
PUBLIC_RUNWITH_APP_URL=https://app.runwith.shigotoku.com
```

## 推奨 URL 構成

| URL | 用途 |
|-----|------|
| `shigotoku.com/` | コーポレートサイト（このプロジェクト） |
| `shigotoku.com/runwith/` | ランウィズ LP |
| `shigotoku.com/runwith/pricing/` | ランウィズ 料金 |
| `app.runwith.shigotoku.com` | ランウィズ アプリ |
| `shigotoku.com/buzzit/` | バジット LP |
| `app.buzzit.shigotoku.com` | バジット アプリ |

## 主なページ

- `/` トップページ
- `/news/` お知らせ一覧
- `/news/{slug}/` お知らせ詳細
- `/privacy` プライバシーポリシー
- `/terms` 利用規約
- `/tokushoho` 特定商取引法
- `/security` 情報セキュリティ方針

## お知らせの追加方法

`src/content/news/` に Markdown ファイルを追加します。

```markdown
---
title: お知らせのタイトル
pubDate: 2026-07-26
category: Product
draft: false
---

本文を Markdown で記述します。
```

- **category**: `Product` / `Company` / `Media`
- **draft**: `true` にすると一覧・詳細に表示されません
- ファイル名が URL になります（例: `2026-07-26-example.md` → `/news/2026-07-26-example/`）

## お問い合わせ（メール受信）の設定

[Formspree](https://formspree.io/) でフォームを作成し、通知先を `support@shigotoku.com` に設定します。

1. Formspree で新規フォーム作成
2. フォーム ID（例: `abcxyzde`）をコピー
3. `.env` に `PUBLIC_FORMSPREE_FORM_ID=abcxyzde` を設定
4. 本番は GitHub Secret `PUBLIC_FORMSPREE_FORM_ID` に同じ値を登録

未設定の場合、フォームは無効化され `support@shigotoku.com` への直接連絡を案内します。
