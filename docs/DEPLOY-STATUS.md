# デプロイ状況（2026-05-22 更新）

## 完了

| 項目 | URL / 備考 |
|------|------------|
| GCP プロジェクト | `shigotoku-prod` |
| Firebase Hosting | 3 サイトすべてデプロイ済み |
| コーポレート + LP | https://shigotoku.com/ |
| ランウィズ LP | https://shigotoku.com/runwith/ |
| バジット LP | https://shigotoku.com/buzzit/ |
| ランウィズ アプリ | https://app.runwith.shigotoku.com/（接続済み） |
| バジット アプリ | https://app.buzzit.shigotoku.com/（接続済み） |

## 次にやるとよいこと（任意）

### 1. Cloudflare の古い DNS を整理

使っていない Cloudflare Pages 向けレコードを削除:

| Name | 向き先（削除候補） |
|------|-------------------|
| `runwith` | `startup-builder-app.pages.dev` |
| `runwith-app` | `startup-builder-app.pages.dev` |
| `startup-builder` | `startup-builder-app.pages.dev` |
| `startup-builder-app` | `startup-builder-app.pages.dev` |

**MX / SPF / DKIM（メール）は削除しないでください。**

### 2. お問い合わせフォーム（Formspree）

`corporate-site/src/components/ContactSection.astro` の  
`REPLACE_WITH_YOUR_ID` を Formspree のフォーム ID に置き換え → `npm run deploy:web`

### 3. Supabase プロジェクト削除

開発用のみなら [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → Delete project。

### 4. その他

- `www.shigotoku.com` → `shigotoku.com` リダイレクト  
- GitHub Actions による CI デプロイ  
