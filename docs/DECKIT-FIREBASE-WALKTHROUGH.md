# DeckIt Firebase 伴走チェックリスト

**プロジェクト:** Shigotoku DeckIt  
**プロジェクト ID:** `shigotoku-deckit-prod`（リポジトリの `deploy/.firebaserc` と一致済み）  
**いまの画面:** プロジェクトのトップ → 「アプリを追加」の前後

チェックは Console で終わったら `[x]` にしてください。

---

## Phase 0 — 完了

- [x] Firebase プロジェクト作成（`shigotoku-deckit-prod`）

---

## Phase 1 — プランと基本サービス（いまここ）

### 1-1. Blaze（従量課金）にアップグレード

Spark（無料）のままだと、のちの **Cloud Run / 一部連携** で困ることがあります。ClipIt / ShapeIt と同じ請求先で OK です。

1. Console 左下 **「Spark プラン」** または ⚙ **プロジェクトの設定** → **使用状況と請求**
2. **プランを変更** → **Blaze**
3. 既存の GCP 請求先アカウントを選択

- [ ] Blaze に変更した

### 1-2. Authentication（Google ログイン）

1. 左メニュー **構築** → **Authentication** → **始める**
2. **Sign-in method** → **Google** → **有効** → 保存  
   （サポートメールは `meditoku.jp@gmail.com` など代表アドレス）
3. **Settings** タブ → **Authorized domains** に次を追加（まだ無ければ）:
   - `localhost`
   - （後で）`app.deckit.shigotoku.com`

- [ ] Google ログインを有効化した
- [ ] `localhost` を Authorized domains に入れた

### 1-3. Firestore Database

1. 左メニュー **Firestore Database** → **データベースを作成**
2. ロケーション: **`asia-northeast1`（東京）**
3. **本番環境モード**で開始（ルールはリポジトリからデプロイします）

- [ ] Firestore を東京で作成した

### 1-4. Firestore ルールをリポジトリから反映

Firestore 作成後、PC で:

```powershell
cd c:\Users\mappy\Desktop\shigotoku\deploy
npm run deploy:deckit-firestore
```

成功すると `deckit_*` コレクション用のセキュリティルールが本番に載ります。

- [ ] 上記コマンドが成功した

---

## Phase 2 — Web アプリ登録（「+ アプリを追加」）

画面中央の **「+ アプリを追加」** → **Web（</>）**

1. アプリのニックネーム: `DeckIt Web`（任意）
2. **Firebase Hosting は今はチェックしなくて OK**（のちに Cloud Run または Hosting を選べます）
3. 登録後に表示される `firebaseConfig` をコピー

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "shigotoku-deckit-prod.firebaseapp.com",
  projectId: "shigotoku-deckit-prod",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 2-1. ローカル用（Git にコミットしない）

`Slide_Studio/app/.env.local` を新規作成:

```env
NEXT_PUBLIC_DECKIT_DATA_MODE=firebase
NEXT_PUBLIC_FIREBASE_API_KEY=（apiKey）
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=（authDomain）
NEXT_PUBLIC_FIREBASE_PROJECT_ID=shigotoku-deckit-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=（storageBucket）
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=（messagingSenderId）
NEXT_PUBLIC_FIREBASE_APP_ID=（appId）
```

### 2-2. 本番ビルド用（後で）

`deploy/build.config.mjs` の `DECKIT_FIREBASE` に同じ値を入れるか、CI 用シークレットに設定。

- [ ] Web アプリを追加した
- [ ] `.env.local` を作成した（Cursor に「設定した」と伝えれば動作確認手順を案内します）

---

## Phase 3 — ローカルで Google ログイン試す

```powershell
cd c:\Users\mappy\Desktop\shigotoku\Slide_Studio\app
npm run dev
```

1. http://localhost:3000/login を開く
2. **Google でログイン**（`.env.local` 設定後）
3. 初回ログインで Firestore に `deckit_users` / 個人 org / スタイルが自動作成されます

**注意:** サーバー API（Firestore 書き込み）には **Firebase Admin** が必要です。ローカルでは次のいずれか:

- サービスアカウント JSON をダウンロードし、`.env.local` に  
  `GOOGLE_APPLICATION_CREDENTIALS=パス\to\key.json`  
  `FIREBASE_PROJECT_ID=shigotoku-deckit-prod`
- または Phase 3b（下）を先に済ませる

- [ ] ログイン〜ホーム表示まで試した

### Phase 3b — Admin SDK（開発用）

1. Console → ⚙ **プロジェクトの設定** → **サービス アカウント**
2. **新しい秘密鍵の生成** → JSON を保存（**Git に入れない**）
3. JSON を **`Slide_Studio/app/secrets/deckit-admin.json`** に置く（フォルダはリポジトリ内・`*.json` は gitignore）
4. `.env.local` に **相対パス**（どの PC でも同じ）:

```env
GOOGLE_APPLICATION_CREDENTIALS=./secrets/deckit-admin.json
FIREBASE_PROJECT_ID=shigotoku-deckit-prod
```

#### 別の PC で続けるとき

| 持ち運ぶ | 持ち運ばない（各 PC で用意） |
|----------|------------------------------|
| リポジトリ（git clone） | `.env.local`（手でコピー or 再作成） |
| | `secrets/deckit-admin.json`（同じ JSON を **安全な経路**でコピー。または Console で再生成） |

**ポイント:** `C:\Users\mappy\...` のような **ユーザー名入りの絶対パスは使わない**。  
`.env.local` 自体は Git に載らないので、**PC ごとに1ファイル**持つのが正常です。Firebase の Web 設定（apiKey 等）も各 PC の `.env.local` に同じ内容を写せば OK。

---

## Phase 4 — 本番 URL（名前決定済みなので後日で OK）

1. DNS: `app.deckit.shigotoku.com`（お名前.com 等）
2. Authorized domains に `app.deckit.shigotoku.com` を追加
3. Cloud Run または Firebase Hosting でデプロイ

---

## 困ったとき

| 症状 | 対処 |
|------|------|
| `auth/unauthorized-domain` | Authorized domains に `localhost` を追加 |
| ログイン後 API 503 / Admin | サービスアカウント JSON + `GOOGLE_APPLICATION_CREDENTIALS` |
| deploy:deckit-firestore 失敗 | Firestore が未作成 → Phase 1-3 先に |

次の一手は **Phase 1-1〜1-3 を Console で完了** → **1-4 の deploy** → **Phase 2 の Web アプリ** の順がおすすめです。
