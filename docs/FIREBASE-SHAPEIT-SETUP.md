# ShapeIt 本番セットアップ — 伴走チェックリスト

ClipIt / RunWith と同様、**専用 Firebase プロジェクト `shigotoku-shapeit-prod`** でアプリを運用します。  
LP（`shigotoku.com/shapeit/`）は既存の `shigotoku-prod` Hosting に同梱（`deploy:web`）。

| 項目 | 内容 |
|------|------|
| 最終更新 | 2026-08-11 |
| 参照 | [FIREBASE-SPLIT.md](./FIREBASE-SPLIT.md)、[shapeit/docs/FIREBASE-SHAPEIT-SETUP.md](../shapeit/docs/FIREBASE-SHAPEIT-SETUP.md) |

---

## 前提

| 項目 | 値 |
|------|-----|
| **正しいアカウント** | **`meditoku.jp@gmail.com`** |
| プロジェクト ID（目標） | `shigotoku-shapeit-prod` |
| Hosting サイト ID（目標） | `shigotoku-shapeit-app` |
| 本番 URL | `https://app.shapeit.shigotoku.com` |

> プロジェクト ID / サイト ID が取られている場合、Console が別名（例: `-ad9ee` 付き）を提案します。  
> **実際に作成した ID を `.firebaserc` と `build.config.mjs` に合わせてください。**

---

## Phase 1 — Firebase プロジェクト作成（今ここ）

**ログイン:** ブラウザ右上で **`meditoku.jp@gmail.com`** を確認。

1. [Firebase Console](https://console.firebase.google.com/) → **新しい Firebase プロジェクトを作成**
2. 設定:
   - プロジェクト名: `Shigotoku ShapeIt`（表示名・任意）
   - **プロジェクト ID: `shigotoku-shapeit-prod`**（利用可能ならこの ID）
3. Google Analytics は任意
4. 作成後、**請求先** を ClipIt / RunWith と同じ GCP 請求先に紐付け
5. **Blaze（従量課金）** にアップグレード（Functions / Storage 用）

- [ ] プロジェクト `shigotoku-shapeit-prod`（または実際の ID）が一覧に表示される
- [ ] Blaze プラン
- [ ] 請求先紐付け済み

---

## Phase 2 — Authentication / Firestore / Storage

### 2-1. Authentication

**Sign-in method**

| 方式 | 設定 |
|------|------|
| Google | 有効化 |

**Settings → Authorized domains** に追加:

- `app.shapeit.shigotoku.com`（**ドット必須**）
- `localhost`（ローカル開発）
- 暫定: `shigotoku-shapeit-app.web.app`（Hosting デプロイ後の default ドメイン）

### 2-2. Firestore

1. **Firestore Database** → **データベースを作成**
2. ロケーション: **`asia-northeast1`（東京）**
3. 本番モードで開始

### 2-3. Storage

1. **Storage** → **始める**
2. 同じく東京リージョン

- [ ] Google ログイン有効
- [ ] Authorized domains 設定済み
- [ ] Firestore 作成済み
- [ ] Storage 作成済み

---

## Phase 3 — Hosting サイト

Firebase Console → **Hosting** → **サイトを追加**

| サイト ID | 用途 |
|-----------|------|
| `shigotoku-shapeit-app` | ShapeIt Web アプリ |

CLI の場合:

```powershell
cd deploy
npx firebase login:use meditoku.jp@gmail.com
npx firebase hosting:sites:create shigotoku-shapeit-app --project shigotoku-shapeit-prod
```

> サイト ID が使えない場合は Console の提案名を使い、`deploy/.firebaserc` の `targets` を更新。

---

## Phase 4 — Web アプリ設定をリポジトリへ反映

### 4-1. Firebase Console で Web アプリを追加

1. **プロジェクトの設定**（歯車）→ **全般** → **マイアプリ**
2. **</> Web** を追加（ニックネーム: `shapeit-app`）
3. `firebaseConfig` の値を控える

### 4-2. `deploy/build.config.mjs` を更新

`SHAPEIT_FIREBASE` に貼り付け（または環境変数 `SHAPEIT_FIREBASE_API_KEY` 等）:

```js
export const SHAPEIT_FIREBASE = {
  apiKey: 'AIza...',
  authDomain: 'shigotoku-shapeit-prod.firebaseapp.com',
  projectId: 'shigotoku-shapeit-prod',
  storageBucket: 'shigotoku-shapeit-prod.firebasestorage.app',
  messagingSenderId: '...',
  appId: '1:...:web:...',
};
```

ローカル: `shapeit/app/.env.example` を `.env` にコピーして同じ値を記入。

### 4-3. 初回デプロイ

```powershell
cd c:\Users\mappy\Desktop\shigotoku\deploy
npm run deploy:shapeit
```

内容: Hosting + Functions + Firestore ルール + Storage ルール

Hosting だけ先に:

```powershell
npm run deploy:shapeit-app
```

- [ ] `build.config.mjs` に Web 設定を反映
- [ ] `npm run deploy:shapeit` 成功
- [ ] `https://shigotoku-shapeit-app.web.app` でアプリが開く

---

## Phase 5 — カスタムドメイン

1. Hosting → `shigotoku-shapeit-app` → **カスタムドメインを追加**
2. `app.shapeit.shigotoku.com` を入力
3. DNS レコードをドメイン管理に追加（RunWith / ClipIt と同型）
4. SSL が有効になるまで待つ
5. Authorized domains に `app.shapeit.shigotoku.com` があることを再確認

---

## Phase 6 — GEMINI_API_KEY（任意）

AI トリアージ用:

```powershell
cd deploy
firebase functions:secrets:set GEMINI_API_KEY --project shigotoku-shapeit-prod
npm run deploy:shapeit-api
```

未設定でもルールベースのフォールバックで動作します。

---

## Phase 7 — 動作確認

1. https://app.shapeit.shigotoku.com（または `.web.app`）で Google ログイン
2. Capture → Inbox にデータが入る
3. Firebase Console → Authentication にユーザーが増える

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `auth/unauthorized-domain` | Authorized domains に正しいドメイン（ドットあり）があるか |
| Hosting 403 | Hosting サイト ID が `.firebaserc` と一致しているか |
| Storage 未設定エラー | Console で Storage を開始後に再デプロイ |
| ビルド後ログイン不可 | `SHAPEIT_FIREBASE` の apiKey / appId が空でないか |

---

## 旧 `shigotoku-prod` からの移行メモ

以前 `shigotoku-prod` の `shigotoku-shapeit-app` にデプロイしていた場合:

- 新プロジェクトへデプロイ後、旧 Hosting のカスタムドメインを解除（任意）
- 旧 `shapeit_*` Firestore データはデモ用のみなら削除可（本番データがある場合は移行が必要）
