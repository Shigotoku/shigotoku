# DeckIt 本番セットアップ

ShapeIt / ClipIt と同様、**専用 Firebase プロジェクト**（目標 ID: `shigotoku-deckit-prod`）で運用します。

| 項目 | 値 |
|------|-----|
| 製品名 | **DeckIt**（読み: デキット） |
| 本番 URL（目標） | `https://app.deckit.shigotoku.com`（手順 [DECKIT-CUSTOM-DOMAIN.md](./DECKIT-CUSTOM-DOMAIN.md)） |
| アプリコード | `Slide_Studio/app`（リポジトリ内パスは歴史的名称） |
| Firestore ルール | `deploy/firestore.deckit.rules`（コレクション `deckit_*`） |

## 伴走チェックリスト（推奨）

手順を1つずつ: **[DECKIT-FIREBASE-WALKTHROUGH.md](./DECKIT-FIREBASE-WALKTHROUGH.md)**

## Phase 1 — Firebase プロジェクト

- [x] プロジェクト `shigotoku-deckit-prod` 作成（2026-10-01）
- [x] Firestore（default）+ ルール `firestore.deckit.rules` デプロイ済み（`npm run deploy:deckit-firestore`）
- [ ] Blaze + 請求先
- [ ] **Authentication** → Google を有効化
- [ ] **Authorized domains:** `localhost`, 後で `app.deckit.shigotoku.com`
- [ ] **Web アプリ**を追加（`firebaseConfig` を `.env.local` に）
## Phase 2 — リポジトリへ Web 設定を反映

1. Console → プロジェクトの設定 → マイアプリ → Web アプリ追加
2. `deploy/build.config.mjs` の `DECKIT_FIREBASE` と `projectEnv['deckit-app']` にキーを貼る（ShapeIt の `SHAPEIT_FIREBASE` と同型）
3. `Slide_Studio/app/.env.local` に同じ `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_DECKIT_DATA_MODE=firebase`
4. Cloud Run（またはローカル API）に Admin SDK 用サービスアカウント

## Phase 3 — 本番デプロイ（Cloud Run）

ローカル `npm run dev` より **本番 URL で開発**する流れ:

1. **Secret Manager**（初回のみ）  
   `Slide_Studio/app/secrets/deckit-admin.json` をシークレット `deckit-admin-sa` として登録。
2. **ビルド + デプロイ**

```powershell
cd deploy
npm run deploy:deckit-firestore
npm run deploy:deckit
```

`deploy:deckit` = `build:deckit-app`（`build.config.mjs` の Firebase 公開キーを埋め込み）→ Docker → Cloud Run `deckit-app`（`asia-northeast1`）。

3. **Firebase Console** → Authentication → Authorized domains  
   Cloud Run の URL（`*.run.app`）と `app.deckit.shigotoku.com` を追加。
4. **Cloud Run** → カスタムドメインで `app.deckit.shigotoku.com` をマッピング（DNS は社内手順）。

本番では Google ログインは **リダイレクト方式**（COOP エラー回避）。localhost のみポップアップ可。

## ローカル開発

```powershell
cd Slide_Studio/app
# .env なし → mock（E2E も mock）
npm run dev
```

関連: [DECKIT-BRAND.md](../Slide_Studio/docs/DECKIT-BRAND.md)、[FIREBASE-SPLIT.md](./FIREBASE-SPLIT.md)
