# GCP / Firebase デプロイ手順

シゴトクの公開サイトとアプリを **Firebase Hosting（GCP）** に載せる手順です。

## URL 構成（本番）

| URL | 内容 | Firebase サイト |
|-----|------|-----------------|
| `https://shigotoku.com/` | コーポレートサイト | `shigotoku-web` |
| `https://shigotoku.com/runwith/` | ランウィズ LP | 同上（サブパス） |
| `https://shigotoku.com/buzzit/` | バジット LP | 同上（サブパス） |
| `https://app.runwith.shigotoku.com/` | ランウィズ アプリ | `runwith-app` |
| `https://app.buzzit.shigotoku.com/` | バジット アプリ | `shigotoku-buzzit-app` |

> 進捗の詳細は [`DEPLOY-STATUS.md`](./DEPLOY-STATUS.md) を参照。

---

## 前提

- Node.js 20 以上
- Google アカウント（GCP 請求先の設定が必要）
- ドメイン `shigotoku.com` の DNS 管理権限

---

## 1. GCP プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. **新しいプロジェクト** を作成（例: `shigotoku-prod`）
3. **請求先アカウント** をプロジェクトに紐付け

---

## 2. Firebase プロジェクトを有効化

1. [Firebase Console](https://console.firebase.google.com/) を開く
2. **プロジェクトを追加** → 先ほどの GCP プロジェクトを選択
3. Google Analytics は任意（オフでも可）

---

## 3. Firebase CLI のセットアップ

```bash
cd deploy
npm install
npx firebase login
```

`.firebaserc.example` を `.firebaserc` にコピーし、`YOUR_GCP_PROJECT_ID` を実際のプロジェクト ID に置き換えます。

```bash
cp .firebaserc.example .firebaserc
# .firebaserc を編集
```

---

## 4. Hosting サイトを 3 つ作成

Firebase Console → **Hosting** → **サイトを追加** で以下を作成します。

| サイト ID | 用途 |
|-----------|------|
| `shigotoku-web` | コーポレート + LP 統合 |
| `runwith-app` | ランウィズ アプリ |
| `buzzit-app` | バジット アプリ | ※ サイト ID は `shigotoku-buzzit-app`（`buzzit-app` はグローバル予約済み） |

CLI で作成する場合:

```bash
cd deploy
npx firebase hosting:sites:create shigotoku-web
npx firebase hosting:sites:create runwith-app
npx firebase hosting:sites:create buzzit-app
```

`.firebaserc` の `targets` がサイト ID と一致していることを確認してください。

---

## 5. 統合ビルド

```bash
cd deploy
npm run build
```

出力先:

```
deploy/dist/
├── web/              # shigotoku.com 用（corporate + runwith LP + buzzit LP）
├── runwith-app/      # app.runwith.shigotoku.com 用
└── buzzit-app/       # app.buzzit.shigotoku.com 用
```

---

## 6. 初回デプロイ

```bash
cd deploy

# すべてデプロイ
npm run deploy:all

# 個別デプロイ
npm run deploy:web
npm run deploy:runwith-app
npm run deploy:buzzit-app
```

初回は `*.web.app` のデフォルト URL で表示確認できます。

---

## 7. カスタムドメイン設定

Firebase Console → **Hosting** → 各サイト → **カスタムドメインを追加**

### shigotoku-web

- `shigotoku.com`
- `www.shigotoku.com`（任意、メインへリダイレクト推奨）

### runwith-app

- `app.runwith.shigotoku.com`

### buzzit-app

- `app.buzzit.shigotoku.com`

Firebase が提示する **TXT / A レコード** を DNS に追加します。SSL 証明書は Firebase が自動発行します（反映まで数時間かかることがあります）。

---

## 8. 本番ビルドの環境変数

`deploy/build.config.mjs` に本番 URL を集約しています。`npm run build` 実行時に各プロジェクトへ自動で渡されます。

```javascript
// deploy/build.config.mjs（抜粋）
export const RUNWITH_APP_URL = 'https://app.runwith.shigotoku.com';
export const BUZZIT_APP_URL = 'https://app.buzzit.shigotoku.com';
```

ローカル開発用は各プロジェクトの `.env.example` を参照してください。

---

## 9. デプロイ後チェックリスト

- [x] `https://shigotoku.com/` が表示される
- [x] `https://shigotoku.com/runwith/` / `pricing/` が表示される
- [x] `https://shigotoku.com/buzzit/` が表示される
- [x] LP の「ログイン」が各アプリ URL に飛ぶ
- [x] `app.runwith.shigotoku.com` / `app.buzzit.shigotoku.com` でアプリが開く
- [x] アプリドメインが検索エンジンにインデックスされない（`noindex` + `X-Robots-Tag`）

---

## トラブルシューティング

### 404 が出る（サブパス LP）

Astro の `base` 設定を確認:

- `runwith/landing-page/astro.config.mjs` → `base: '/runwith/'`
- `buzzit/landing-page/astro.config.mjs` → `base: '/buzzit/'`

### アプリのルーティングが 404

`firebase.json` の SPA rewrite（`**` → `/index.html`）が有効か確認。

### ビルドエラー（Tailwind / vite）

Astro プロジェクトは `vite@7.3.3` 固定（`package.json` の `overrides`）が必要です。

### SSL 証明書が「作成中」のまま（サブドメイン）

DNS（CNAME + `hosting-site=...` TXT）が正しくても Firebase 側で停滞することがあります。

1. カスタムドメインを削除 → 10 分待つ → 再追加  
2. CNAME の代わりに A レコード（`199.36.158.100`）+ TXT を試す  
3. 24 時間以上変わらなければ Firebase サポートへ  
4. 暫定 URL（`runwith-app.web.app`）は `deploy/build.config.mjs` で設定済み

---

## 次のステップ（任意）

- GitHub Actions で `deploy/` から CI デプロイ
- Cloud CDN / Firebase Performance Monitoring
- Formspree ID の本番設定（`corporate-site` お問い合わせフォーム）
