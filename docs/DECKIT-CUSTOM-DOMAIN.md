# DeckIt カスタムドメイン `app.deckit.shigotoku.com`

ClipIt / Runwith と同様、**Firebase Hosting** で SSL・DNS を管理し、バックエンドは **Cloud Run `deckit-app`** にプロキシします。

## 前提

- Cloud Run `deckit-app` がデプロイ済み（`npm run deploy:deckit-cloudrun`）
- `shigotoku.com` の DNS を編集できる（お名前.com / Cloudflare 等）

---

## 1. Hosting サイトとプロキシ設定

```powershell
cd c:\Users\mappy\Desktop\shigotoku\deploy
npm run setup:deckit-hosting
npm run deploy:deckit-hosting
```

- サイト ID: **`shigotoku-deckit-app`**
- すべてのパス `**` → Cloud Run `deckit-app`（`asia-northeast1`）

---

## 2. Firebase Console でカスタムドメイン

1. [Firebase Console](https://console.firebase.google.com/) → **shigotoku-deckit-prod**
2. **Hosting** → サイト **`shigotoku-deckit-app`**
3. **カスタムドメインを追加** → `app.deckit.shigotoku.com`
4. 表示される **A レコード / TXT（所有確認）** を DNS に追加

### DNS の例（Console の指示を優先）

| 種別 | ホスト | 値 |
|------|--------|-----|
| A | `app.deckit` | Firebase が提示する IP（複数ある場合はすべて） |
| TXT | `app.deckit` または `_acme-challenge...` | 所有確認用（表示どおり） |

`shigotoku.com` のゾーンで **`app.deckit`** サブドメインを切るイメージ（`app.deckit.shigotoku.com`）。

5. SSL が **有効** になるまで待つ（数分〜最大 48 時間）

---

## 3. Firebase Authentication

**Authentication → Settings → Authorized domains** に追加:

```text
app.deckit.shigotoku.com
```

---

## 4. 本番アプリの正規 URL（任意・DNS 有効後）

DNS と SSL が通ったら、Cloud Run を再デプロイ（`CANONICAL_HOST` は `app.deckit.shigotoku.com` に設定済み）。

`*.run.app` からカスタムドメインへ寄せたいときだけ、Cloud Run の環境変数に追加:

```text
CANONICAL_REDIRECT_RUN_APP=true
```

（未設定のままだと `run.app` URL も引き続き利用可能）

---

## 5. 確認

- https://app.deckit.shigotoku.com/login が開く
- Google ログイン（ポップアップ）でアプリ本体に入れる
- `/api/health` で `firebaseAdmin: true`

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| DNS が通らない | ClipIt の `app.clipit.shigotoku.com` 設定と並べて比較 |
| `auth/unauthorized-domain` | Authorized domains に `app.deckit.shigotoku.com` |
| Hosting 502 | Cloud Run が稼働しているか、`setup:deckit-hosting` の Run Invoker |
| まだ run.app しか使えない | DNS 反映待ち。SSL「有効」後に再試行 |

関連: [FIREBASE-DECKIT-SETUP.md](./FIREBASE-DECKIT-SETUP.md)、[FIREBASE-CLIPIT-SETUP.md](./FIREBASE-CLIPIT-SETUP.md) §3-2
