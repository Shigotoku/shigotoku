# PreDeck 本番セットアップ（Firebase）

ShapeIt / DeckIt と同様、**専用 Firebase プロジェクト**（目標 ID: `shigotoku-predeck-prod`）で運用します。
売却時にアプリ単位で切り出せるよう、他アプリとプロジェクトを共有しません。

| 項目 | 値 |
|------|-----|
| アプリコード | `PreDeck/app`（Web）、`PreDeck/api`（AI 中継） |
| 本番 URL（目標） | `https://app.predeck.shigotoku.com` |
| Hosting ターゲット | `predeck-app` → サイト `shigotoku-predeck-app` |
| Function | `predeckApi`（`asia-northeast1`、codebase `predeck-api`） |
| Firestore | `usage/` のみ（利用回数）。クライアントからの読み書きは全拒否（`deploy/firestore.predeck.rules`） |

## コード側（完了済み）
- `deploy/firebase.predeck.json` / `firestore.predeck.rules` / `.firebaserc`（`predeck` プロジェクト・ターゲット）
- `deploy/build.config.mjs` の `PREDECK_FIREBASE`・`projectEnv['predeck-app']`（キーは環境変数で渡す）
- `deploy/scripts/build-predeck-app.mjs` / `prepare-predeck-api.mjs`、`package.json` の `deploy:predeck*`

## ランディングページ（他アプリと同じ形）
- コード: `PreDeck/landing-page`（Astro、`base: /predeck/`）。`deploy/build.mjs` に `predeck-landing` を追加済みで、`npm run build` で `dist/web/predeck/` に出力され、既存の `shigotoku-web` サイトと一緒にデプロイされる（`https://shigotoku.com/predeck/`）。
- 現状は `noindex`・sitemap 非掲載・コーポレートサイトの製品一覧にも未掲載。権利関係（`PreDeck/docs/ASR-AND-LICENSE-REVIEW.md` §2.1）が整うまで公開宣伝しない方針。
- 公開時に行う: noindex を外す / `write-web-seo.mjs` に追加 / `corporate-site` の製品一覧へ追加 / `DEPLOY-STATUS.md` を更新。

## Console 側（人による作業）— チェックリスト
- [ ] Firebase プロジェクト `shigotoku-predeck-prod` を作成し、Blaze（従量）+ 請求先を設定
- [ ] 予算アラートを設定（AI の想定外の利用を検知するため必須）
- [ ] Authentication → **Google** と **メール/パスワード**の両方を有効化 / 承認済みドメインに `localhost`・`app.predeck.shigotoku.com`
- [ ] Firestore（default, `asia-northeast1`）を作成
- [ ] Hosting にサイト `shigotoku-predeck-app` を追加
- [ ] Web アプリを追加し、`firebaseConfig` を取得
- [ ] Secret Manager に `GEMINI_API_KEY` を登録（**有料・学習に使われない設定**の API キー）
- [ ] DNS: `app.predeck.shigotoku.com` を Hosting に接続

## プロジェクト作成（CLI で行う場合の例）
請求先アカウントの紐付けは費用が発生するため、内容を確認してから実行する。
```powershell
gcloud projects create shigotoku-predeck-prod --name="PreDeck"
gcloud billing projects link shigotoku-predeck-prod --billing-account=<請求先アカウントID>
firebase projects:addfirebase shigotoku-predeck-prod
```

## デプロイ

```powershell
$env:PREDECK_FIREBASE_API_KEY = "..."
$env:PREDECK_FIREBASE_APP_ID = "..."
$env:PREDECK_FIREBASE_STORAGE_BUCKET = "..."
$env:PREDECK_FIREBASE_MESSAGING_SENDER_ID = "..."
cd deploy
npm run deploy:predeck-rules
npm run deploy:predeck-api
npm run deploy:predeck-app
```

## ローカル開発
`PreDeck/app/.env.example` を `.env.local` にコピーして値を入れる。アプリの利用にはログインが必須。Firebase 未設定のときは、
pm run dev（開発環境）に限りログインなしで動作する。本番ビルドは未設定だとログイン不可のエラーを表示する。

## 注意
- API キー（`VITE_FIREBASE_API_KEY`）は公開前提の値だが、リポジトリには直書きしない方針（環境変数）。
- `usage/` 以外に利用者のデータを保存しない。ログにリクエスト本文を出さない。
