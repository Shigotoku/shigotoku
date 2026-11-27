# WrapIt 本番セットアップ（Firebase / Cloud Run / LP）

GitHub Actions は使わず、`deploy/` のスクリプトを手元から実行する。

| 項目 | 値 |
|------|-----|
| GCP/Firebase プロジェクト | `shigotoku-wrapit-prod`（番号 `389583286040`、請求先「PreDeck・DeckIt 用」） |
| アプリ（Cloud Run） | `wrapit-app`（`asia-northeast1`）→ https://wrapit-app-389583286040.asia-northeast1.run.app |
| Hosting サイト | `shigotoku-wrapit-app`（Cloud Run へプロキシ）→ https://shigotoku-wrapit-app.web.app |
| 本番 URL（目標） | https://app.wrapit.shigotoku.com |
| LP | https://shigotoku.com/wrapit/（`noindex`、robots で Disallow。商標確認まで非公開扱い） |
| Firestore | `deploy/firestore.wrapit.rules`（`wrapit_*`） |
| Admin SDK 鍵 | Secret Manager `wrapit-admin-sa`（SA `wrapit-admin@…`、`datastore.user` + `firebaseauth.admin`） |

## 更新デプロイ

```powershell
cd deploy
npm run deploy:wrapit-firestore   # ルール変更時
npm run deploy:wrapit             # アプリ（Cloud Build → Cloud Run）
npm run deploy:clipit-web         # LP（shigotoku.com 全体。Hosting は全 LP を含めて上げる必要あり）
```

※ firebase CLI は `meditoku.jp@gmail.com` でログインしている必要がある（`firebase login:use`）。

## 手動で必要な作業（Console / DNS）

- [ ] **Authentication → Sign-in method → Google を有効化**（API では client secret が必要なため Console で。サポートメールを選ぶだけ）
- [ ] **DNS**（`shigotoku.com` のゾーン）に以下を追加し、Firebase Hosting のカスタムドメイン `app.wrapit.shigotoku.com` を有効化
  - `CNAME  app.wrapit  →  shigotoku-wrapit-app.web.app`
  - `TXT  _acme-challenge.app.wrapit  →  Console / API が表示する値`（変わりうるので Hosting のカスタムドメイン画面を優先）
- [ ] Formspree で WrapIt 用フォームを作り `PUBLIC_WRAPIT_FORMSPREE_FORM_ID` を設定して LP を再デプロイ
- [ ] 公開前: J-PlatPat で商標確認 → `robots.txt` の Disallow / `noindex` を外し sitemap に追加

## 設定済み（API で実施）

- Authorized domains: `localhost`、`*.run.app`（上記 URL）、`app.wrapit.shigotoku.com`、`shigotoku-wrapit-app.web.app/.firebaseapp.com`
- Blaze 相当（請求先リンク済み）、Firestore（東京）、Web アプリ登録
