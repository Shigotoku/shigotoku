# クリッピット（ClipIt）本番セットアップ — 伴走チェックリスト

ランウィズと同様、**専用 Firebase プロジェクト `shigotoku-clipit-prod`** でアプリを運用します。  
LP（`shigotoku.com/clipit/`）は既存の `shigotoku-prod` の Hosting に同梱されます（`deploy:web` で自動反映）。

| 項目 | 内容 |
|------|------|
| 最終更新 | 2026-06-03 |
| 参照 | [FIREBASE-SPLIT.md](./FIREBASE-SPLIT.md)、[GCP-DEPLOY.md](./GCP-DEPLOY.md) |

---

## 前提の確認

### 使う Google アカウント（必須）

本番の **ランウィズ / バジット / コーポレート** は次のアカウントで運用しています。

| 項目 | 値 |
|------|-----|
| **正しいアカウント** | **`meditoku.jp@gmail.com`**（Firebase 上の表示名: メディトク） |
| 既存プロジェクト | `shigotoku-prod`、`shigotoku-runwith-prod` |

クリッピットの Firebase も **必ずこのアカウント** で作成・デプロイしてください。

> **注意:** ローカル CLI が `ryumatokunaga@gmail.com` など別アカウントのままだと、  
> プロジェクトが別アカウントに作られ、本番の `shigotoku-prod` と分離されたままになります。

### CLI を正しいアカウントに切り替える

```bash
cd deploy
npx firebase login:list
npx firebase login:add    # meditoku.jp@gmail.com を追加
npx firebase login:use meditoku.jp@gmail.com
npx firebase projects:list
# → shigotoku-prod / shigotoku-runwith-prod が表示されること
```

### 誤って別アカウントに `shigotoku-clipit-prod` を作った場合

プロジェクト ID は **全世界で1つだけ** です。別アカウントに同名プロジェクトがあると、  
`meditoku.jp@gmail.com` 側では **同じ ID で作成できません**。

対処:

1. 誤作成側（例: `ryumatokunaga@gmail.com`）の [Firebase Console](https://console.firebase.google.com/) で `shigotoku-clipit-prod` を削除する  
2. その後、**meditoku.jp@gmail.com** で同 ID のプロジェクトを新規作成する

（誤作成プロジェクトを使い続けないでください。CI の `FIREBASE_TOKEN` や DNS と整合しません。）

---

## Phase 1 — GCP / Firebase プロジェクト作成

**ログイン:** ブラウザ右上で **`meditoku.jp@gmail.com`** が選ばれていることを確認してから進めてください。

### 1-1. Firebase から作成（推奨・スクリーンショットと同じ画面）

1. [Firebase Console](https://console.firebase.google.com/) を開く（`meditoku.jp@gmail.com`）  
2. **「新しい Firebase プロジェクトを作成」** をクリック  
3. 設定:
   - プロジェクト名: `Shigotoku ClipIt`（表示名・任意）
   - **プロジェクト ID: `shigotoku-clipit-prod`**（利用可能な場合。取られていれば先に誤作成プロジェクトを削除）
4. Google Analytics は任意  
5. 作成完了後、**請求先** をランウィズと同じ GCP 請求先に紐付け（Blaze 推奨）

### 1-2. 代替: GCP Console から作成

1. [Google Cloud Console](https://console.cloud.google.com/)（**meditoku.jp@gmail.com**）  
2. プロジェクト ID **`shigotoku-clipit-prod`** で作成  
3. Firebase Console → **プロジェクトを追加** → 上記 GCP プロジェクトを選択

### 1-3. Blaze プラン（推奨）

Firestore / Storage の本格利用・将来の Cloud Functions 用に **Blaze（従量課金）** へアップグレード（ランウィズと同じ）。

- [ ] GCP プロジェクト ID = `shigotoku-clipit-prod`  
- [ ] Firebase プロジェクトが表示される  
- [ ] 請求先が紐付いている  

---

## Phase 2 — Authentication / Firestore / Storage

### 2-1. Authentication

Firebase Console → **Authentication** → **Sign-in method**

| 方式 | 設定 |
|------|------|
| Google | 有効化 |
| メール/パスワード | 有効化（任意・第2段階でも可） |

**Settings → Authorized domains** に追加:

- `app.clipit.shigotoku.com`（**ピリオド必須**。`appclipit.shigotoku.com` は誤り）
- `localhost`（ローカル開発用）

> よくあるミス: `appclipit`（ドットなし）と登録すると本番ログインが `auth/unauthorized-domain` で失敗します。
> 誤登録したドメインは一覧の ⋮ から削除し、正しい `app.clipit.shigotoku.com` を追加してください。

### 2-2. Firestore

1. **Firestore Database** → **データベースを作成**  
2. ロケーション: **`asia-northeast1`（東京）** 推奨（ランウィズと揃える）  
3. 本番モードで開始

### 2-3. Storage

1. **Storage** → **始める**  
2. 同じく東京リージョン  
3. ルールはリポジトリの `deploy/storage.clipit.rules` をデプロイで反映（Phase 4）

- [ ] Google ログイン有効  
- [ ] `app.clipit.shigotoku.com` が Authorized domains にある  
- [ ] Firestore 作成済み  
- [ ] Storage 作成済み  

---

## Phase 3 — Hosting とカスタムドメイン

### 3-1. Hosting サイト作成

Firebase Console → **Hosting** → **サイトを追加**

| サイト ID（必須） | 用途 |
|-------------------|------|
| `shigotoku-clipit-app-ad9ee` | クリッピット Web アプリ |

> リポジトリの `.firebaserc` は `clipit-app` → `shigotoku-clipit-app-ad9ee` のマッピング済みです。

**`shigotoku-clipit-app` が使えない理由:** Hosting のサイト ID は **全世界で一意** です。  
別アカウントなどに同名サイトがあると、Console は **`shigotoku-clipit-app-ad9ee` を使え** と表示します（プロジェクト ID の `-ad9ee` と揃える）。  
カスタムドメイン `app.clipit.shigotoku.com` はサイト ID とは無関係で、作成後にこのサイトへ紐付けます。

CLI で作成する場合（プロジェクト切り替え後）:

```bash
cd deploy
npx firebase use clipit
npx firebase hosting:sites:create shigotoku-clipit-app-ad9ee --project shigotoku-clipit-prod-ad9ee
```

### 3-2. カスタムドメイン `app.clipit.shigotoku.com`

1. Hosting → サイト `shigotoku-clipit-app-ad9ee` → **カスタムドメインを追加**  
2. `app.clipit.shigotoku.com` を入力  
3. 表示される **DNS レコード** をドメイン管理（お名前.com / Cloudflare 等）に追加  

**参考（ランウィズと同型）:** サブドメイン `app.clipit` → Firebase Hosting の A/CNAME 指示に従う。

4. SSL 証明書が「有効」になるまで待つ（数分〜48時間）

- [ ] Hosting サイト `shigotoku-clipit-app-ad9ee` 作成済み  
- [ ] DNS 設定済み  
- [ ] SSL 有効  

---

## Phase 4 — Web アプリ設定をリポジトリへ反映

### 4-1. Firebase から設定値をコピー

Firebase Console → **プロジェクトの設定**（歯車）→ **全般** → **マイアプリ**

1. **</> Web** を追加（ニックネーム例: `clipit-app`）  
2. 表示される `firebaseConfig` の各値を控える:

| キー | 環境変数 / build.config |
|------|-------------------------|
| apiKey | `CLIPIT_FIREBASE.apiKey` |
| authDomain | `authDomain`（通常 `shigotoku-clipit-prod.firebaseapp.com`） |
| projectId | `shigotoku-clipit-prod` |
| storageBucket | `...firebasestorage.app` |
| messagingSenderId | `messagingSenderId` |
| appId | `appId` |

### 4-2. `deploy/build.config.mjs` を更新

`CLIPIT_FIREBASE` をランウィズと同様に **直書き**（本番ビルド用）:

```js
export const CLIPIT_FIREBASE = {
  apiKey: 'AIza...',  // ここに貼る
  authDomain: 'shigotoku-clipit-prod.firebaseapp.com',
  projectId: 'shigotoku-clipit-prod',
  storageBucket: 'shigotoku-clipit-prod.firebasestorage.app',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:...',
};
```

ローカル開発用に `clipit/app/.env` も同じ値をコピー（`.env.example` 参照）。

### 4-3. 初回デプロイ（ルール + Hosting）

**前提:** Firestore と Storage を Console で「始める」まで、`deploy:clipit` は Storage で失敗します。

```text
Error: Firebase Storage has not been set up on project 'shigotoku-clipit-prod-ad9ee'
```

#### A. Console で先に完了（Phase 2）

1. [Storage を開始](https://console.firebase.google.com/project/shigotoku-clipit-prod-ad9ee/storage) → **始める**（東京）
2. [Firestore を作成](https://console.firebase.google.com/project/shigotoku-clipit-prod-ad9ee/firestore) → **データベースを作成**（東京・本番モード）

#### B. フルデプロイ（推奨・上記のあと）

```bash
cd deploy
npm run deploy:clipit
```

内容: Hosting + Firestore ルール + Storage ルール

#### C. Hosting だけ先に出す（Storage 未設定の間の暫定）

```bash
cd deploy
npm run deploy:clipit-app
```

→ `https://shigotoku-clipit-app-ad9ee.web.app` でログイン画面を確認できます（ルールは後から `deploy:clipit` で反映）。

- [ ] `build.config.mjs` に Web 設定を反映  
- [ ] Storage・Firestore を Console で開始済み  
- [ ] `npm run deploy:clipit` 成功  
- [ ] https://app.clipit.shigotoku.com/ が開く（ログイン画面・DNS 設定後）  

---

## Phase 4b — LP を `shigotoku.com/clipit/` に公開

アプリ（`app.clipit.shigotoku.com`）とは別に、**サービスサイト（LP）** は既存の **`shigotoku-prod`** Hosting に同梱されます。

| URL | 内容 |
|-----|------|
| https://shigotoku.com/clipit/ | LP トップ |
| https://shigotoku.com/clipit/pricing/ | 料金 |

### ローカルで LP を確認

```bash
cd clipit/landing-page
npm install
npm run dev
# http://localhost:4321/clipit/ （base: /clipit/）
```

### 本番デプロイ（meditoku + shigotoku-prod 権限）

```powershell
cd c:\Users\tokun\Desktop\shigotoku\deploy
npm run deploy:web
```

- コーポレートサイト + runwith/buzzit/**clipit** LP をまとめて `shigotoku-web` に反映します  
- **ClipIt アプリ本体は含みません**（アプリは `npm run deploy:clipit-app` または `deploy:clipit`）

公開後:

- [ ] https://shigotoku.com/clipit/ が開く  
- [ ] 「無料で始める」→ `https://app.clipit.shigotoku.com/login`  
- [ ] アプリの「サービスサイトへ」→ LP に戻れる  

---

## Phase 5 — 動作確認

### 5-1. ローカル

```bash
cd clipit/app
cp .env.example .env
# .env に VITE_FIREBASE_* を記入

npm run dev
# http://localhost:5176 → Googleログイン
```

### 5-2. 本番

1. https://app.clipit.shigotoku.com/login で Google ログイン  
2. ダッシュボード表示  
3. Firebase Console → Authentication にユーザーが増えているか確認  

- [ ] ローカルで Google ログイン成功  
- [ ] 本番で Google ログイン成功  

---

## Phase 6 — CI に組み込み（最後）

**Phase 4〜5 が成功してから** 実施してください（未作成プロジェクトのまま CI に入れると全体デプロイが失敗します）。

### 6-1. `deploy/package.json`

```json
"deploy:all-with-api": "npm run deploy:buzzit && npm run deploy:runwith && npm run deploy:clipit"
```

### 6-2. GitHub Actions

`FIREBASE_TOKEN` が `shigotoku-clipit-prod` へのデプロイ権限を持っているか確認。  
別アカウントの場合は、そのプロジェクトにデプロイ権限を付与したトークンを再発行。

### 6-3. ドキュメント更新

- [FIREBASE-SPLIT.md](./FIREBASE-SPLIT.md) に clipit 行を追加  
- [DEPLOY-STATUS.md](./DEPLOY-STATUS.md) に URL を追記  

- [ ] `deploy:all-with-api` に clipit を追加  
- [ ] main へ merge 後、Actions が成功  

---

## Hosting 403 が出たとき（`shigotoku-clipit-app-ad9ee`）

Storage / Firestore ルールは成功し、Hosting だけ失敗する場合:

```text
HTTP Error: 403 ... sites/shigotoku-clipit-app-ad9ee/versions ... caller does not have permission
```

**原因:** Firebase Console で Hosting サイト **`shigotoku-clipit-app-ad9ee` がまだ無い**（名前が1文字でも違うと同じエラー）。

### 対処 A — Console（推奨）

1. [Hosting](https://console.firebase.google.com/project/shigotoku-clipit-prod-ad9ee/hosting) を開く（**meditoku.jp@gmail.com**）
2. **「サイトを追加」** または初回の **「始める」** から進む
3. サイト ID に **`shigotoku-clipit-app-ad9ee`** を指定（リポジトリの `.firebaserc` と一致させる）
4. 作成後、PowerShell で再実行:

```powershell
cd c:\Users\tokun\Desktop\shigotoku\deploy
npm run deploy:clipit
```

### 対処 B — CLI

```powershell
cd c:\Users\tokun\Desktop\shigotoku\deploy
npx firebase login:use meditoku.jp@gmail.com
npx firebase hosting:sites:create shigotoku-clipit-app-ad9ee --project shigotoku-clipit-prod-ad9ee
npm run deploy:clipit
```

### ルールだけ先に反映したい場合

```powershell
npx firebase deploy --project clipit --config firebase.clipit.json --only storage,firestore
```

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `auth/unauthorized-domain` | Authorized domains に **`app.clipit.shigotoku.com`**（ドットあり）があるか確認。`appclipit...` は誤り |
| `firebase projects:list` に clipit がない | ログインアカウントを本番と同じにする |
| Hosting デプロイで target エラー | `.firebaserc` の `shigotoku-clipit-app-ad9ee` と Console のサイト ID が一致しているか確認 |
| ビルド後ログインできない | `CLIPIT_FIREBASE` の apiKey / appId が空でないか `npm run build` ログを確認 |
| `Firebase Storage has not been set up` | Console → Storage → **始める** 後に `npm run deploy:clipit` を再実行 |
| Hosting `403` / `caller does not have permission` | Hosting サイト **`shigotoku-clipit-app-ad9ee` が未作成**のことが多い。下記「Hosting 403」を参照 |
| `Firestore has not been set up` | Console → Firestore → **データベースを作成** 後に再デプロイ |
| DNS が通らない | `app.runwith` と同じ DNS プロバイダで CNAME/A を比較 |

---

## 次の開発フェーズ（本番基盤の後）

1. `clipit/api/` — Cloud Functions（AI・PDF・共有トークン）  
2. `clipit/extension/` — Chrome 拡張（Manifest V3）  
3. Stripe 課金（Phase 3）

詳細: [`clipit/docs/クリッピット要件定義書.md`](../clipit/docs/クリッピット要件定義書.md)
