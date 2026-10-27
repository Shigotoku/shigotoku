# RaiseIt カスタムドメイン `app.raiseit.shigotoku.com` と LP `shigotoku.com/raiseit/`

ClipIt / DeckIt と同じ構成です。アプリは **Firebase Hosting → Cloud Run `raiseit-app`** に転送し、LP は `shigotoku-web`（`shigotoku.com`）の `/raiseit/` に入ります。

| 用途 | URL | 配信 |
|------|-----|------|
| アプリ | https://app.raiseit.shigotoku.com | Hosting サイト `shigotoku-raiseit-app`（`shigotoku-raiseit-prod`）→ Cloud Run `raiseit-app` |
| LP | https://shigotoku.com/raiseit/ | `shigotoku-web`（`raiseit/landing-page/` を `dist/web/raiseit/` に配置） |

## 1. アプリ（実施済みの内容）

```powershell
cd deploy
npm run setup:raiseit-hosting     # サイト作成（冪等）
npm run deploy:raiseit-hosting    # 全パスを Cloud Run に転送する設定を公開
```

カスタムドメインは Hosting API で追加済み。Authentication の承認済みドメインにも追加済み。

## 2. DNS（Cloudflare・`shigotoku.com` ゾーン）

**プロキシはオフ（「DNS のみ」/ グレーの雲）** にする。オンのままだと証明書の発行が止まる。

| 種別 | 名前 | 値 |
|------|------|-----|
| CNAME | `app.raiseit` | `shigotoku-raiseit-app.web.app` |
| TXT | `_acme-challenge.app.raiseit` | Firebase が提示する値（下記の確認コマンドで取得） |

TXT の値は証明書の更新などで変わることがあるため、追加前に最新を取得する:

```powershell
$tok = (gcloud auth print-access-token).Trim()
$h = @{ Authorization = "Bearer $tok"; "X-Goog-User-Project" = "shigotoku-raiseit-prod" }
Invoke-RestMethod -Uri "https://firebasehosting.googleapis.com/v1beta1/projects/shigotoku-raiseit-prod/sites/shigotoku-raiseit-app/customDomains/app.raiseit.shigotoku.com" -Headers $h | ConvertTo-Json -Depth 10
```

`hostState` が `HOST_ACTIVE`、`cert.state` が `CERT_ACTIVE` になれば完了（数分〜最大48時間）。

## 3. LP

- ソース: `raiseit/landing-page/`（Astro, `base: '/raiseit/'`）
- ビルドは `deploy/build.mjs` / `deploy/scripts/build-clipit-web.mjs` に登録済み。`deploy/scripts/verify-web-dist.mjs` が `raiseit/index.html` の有無を確認する。
- 本番反映は **`shigotoku.com` 全体の再デプロイ**（`main` への merge で GitHub Actions が実行、または `npm run deploy:clipit-web`）。

## 4. 確認

- https://app.raiseit.shigotoku.com/ にログイン画面が出る（`/api/health` は未ログインだと 401）
- https://shigotoku.com/raiseit/ が開き、「ログイン」「導入のご相談」のリンクが正しい
