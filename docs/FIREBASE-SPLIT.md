# Firebase プロジェクト分割ガイド

BuzzIt とランウィズを **別 Firebase プロジェクト** で運用します。

## プロジェクト構成

| プロジェクト ID | 用途 | Hosting サイト |
|----------------|------|----------------|
| `shigotoku-prod` | コーポレート + BuzzIt LP + BuzzIt アプリ + API | `shigotoku-web`, `shigotoku-buzzit-app` |
| `shigotoku-runwith-prod` | ランウィズ アプリ専用 | `shigotoku-runwith-app` |

| URL | プロジェクト |
|-----|-------------|
| https://shigotoku.com/ | shigotoku-prod |
| https://app.buzzit.shigotoku.com/ | shigotoku-prod |
| https://app.runwith.shigotoku.com/ | **shigotoku-runwith-prod** |

---

## デプロイコマンド

```bash
cd deploy

# 両方デプロイ（CI と同じ）
npm run deploy:all-with-api

# 個別
npm run deploy:buzzit    # shigotoku-prod
npm run deploy:runwith   # shigotoku-runwith-prod
```

設定ファイル:

- `firebase.buzzit.json` + `firestore.buzzit.rules` + `storage.buzzit.rules`
- `firebase.runwith.json` + `firestore.runwith.rules` + `storage.runwith.rules`

---

## 手動セットアップ（初回のみ）

### shigotoku-runwith-prod

- [x] Blaze プランへアップグレード
- [x] **Authentication** → メール/パスワード + Google 有効化
- [x] **Authorized domains** に `app.runwith.shigotoku.com` 追加
- [x] **Hosting** → `app.runwith.shigotoku.com` を `shigotoku-runwith-app` に接続
- [x] **Firestore** / **Storage** 有効化 + ルールデプロイ

未実施（任意）:

1. 旧 `shigotoku-prod` の `runwith_*` Firestore データ削除
2. 旧プロジェクトのランウィズ専用 Auth ユーザー削除

### 請求先

新プロジェクトにも GCP 請求先アカウントを紐付けてください（Blaze プラン推奨）。

---

## ユーザー・アカウントについて

- **Auth は完全に分離** — 同じメールでも BuzzIt とランウィズで別アカウントになります
- 旧 `shigotoku-prod` に登録済みのランウィズユーザーは、**新プロジェクトで再登録** が必要です
- BuzzIt の匿名ユーザー（デモ）は `shigotoku-prod` のみ — 削除して問題ありません

---

## 旧プロジェクトの整理（任意）

`shigotoku-prod` からランウィズ関連を削除:

1. Hosting → `runwith-app` サイトのカスタムドメイン解除
2. Firestore → `runwith_*` コレクション削除（移行不要なら）
3. Authentication → ランウィズ専用ユーザー削除（BuzzIt でも使うメールは残す）

---

## ローカル開発

`runwith/app/.env.example` を `.env` にコピーし、Web App の設定を入力（本番値は `deploy/build.config.mjs` の `RUNWITH_FIREBASE` を参照）。
