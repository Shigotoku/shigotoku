# デプロイ状況（2026-05-22 更新）

## 完了

| 項目 | URL / 備考 |
|------|------------|
| GCP プロジェクト | `shigotoku-prod` |
| Firebase Hosting | 3 サイトすべてデプロイ済み |
| コーポレート + LP | https://shigotoku.com/ |
| ランウィズ LP | https://shigotoku.com/runwith/ |
| バジット LP | https://shigotoku.com/buzzit/ |
| ランウィズ アプリ | https://app.runwith.shigotoku.com/（Hosting のみ GCP） |
| バジット アプリ | https://app.buzzit.shigotoku.com/（Firebase Auth + Firestore + API） |
| GA4 | コーポレート / LP に計測タグ反映済み（`G-3T67LD7FT9`） |
| Search Console | sitemap 送信済み（8 ページ検出） |
| GitHub Actions | `main` push → Firebase デプロイ（Hosting + BuzzIt API） |

---

## バックエンド構成（重要）

| サービス | Hosting | 認証・DB | 備考 |
|----------|---------|----------|------|
| **ランウィズ** | GCP（Firebase Hosting） | **Supabase コードのまま** | 本番ビルドは Supabase キーを空にし **デモモード**（localStorage）。Supabase プロジェクト削除済みのため、本番ログイン・永続 DB は未接続 |
| **BuzzIt** | GCP（Firebase Hosting） | **GCP**（Firebase Auth + Firestore + Cloud Functions + Storage） | `/api/**` → `buzzitApi`（asia-northeast1） |

ランウィズを GCP バックエンド（Firebase Auth / Firestore 等）へ移行する場合は、別途マイグレーション作業が必要です。

---

## BuzzIt API 本番運用

### デプロイコマンド

```bash
cd deploy
npm run deploy:all-with-api
```

CI（`.github/workflows/deploy.yml`）も同コマンドを使用します。

### 必要な Secret（Firebase Secret Manager）

```bash
cd deploy
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set AYRSHARE_API_KEY      # 予約投稿を使う場合
firebase functions:secrets:set SLACK_SIGNING_SECRET  # Slack Events を使う場合
```

| Secret | 用途 |
|--------|------|
| `GEMINI_API_KEY` | AI 台本生成・トレンド・A/B テスト |
| `AYRSHARE_API_KEY` | SNS 予約投稿（Ayrshare） |
| `SLACK_SIGNING_SECRET` | Slack Events API 署名検証 |

### デプロイ後の確認

```bash
curl https://app.buzzit.shigotoku.com/api/health
# → {"ok":true,"service":"buzzit-api",...}
```

Firebase Console で以下も有効化済みか確認:

- Authentication（Email / Google 等）
- Firestore Database
- Cloud Storage
- Cloud Scheduler（`buzzitScheduler` 用）

---

## 次にやるとよいこと（任意）

### 1. Cloudflare の古い DNS を整理

使っていない Cloudflare Pages 向けレコードを削除:

| Name | 向き先（削除候補） |
|------|-------------------|
| `runwith` | `startup-builder-app.pages.dev` |
| `runwith-app` | `startup-builder-app.pages.dev` |
| `startup-builder` | `startup-builder-app.pages.dev` |
| `startup-builder-app` | `startup-builder-app.pages.dev` |

**MX / SPF / DKIM（メール）は削除しないでください。**

### 2. お問い合わせフォーム

Formspree ではなく、自社リード管理アプリ連携予定（保留）。

### 3. ランウィズ本番 DB / 認証

方針決定後に実装:

- **A.** Supabase プロジェクトを再作成してキーを本番注入
- **B.** Firebase Auth + Firestore へ移行（BuzzIt と同様の GCP 構成）

### 4. その他

- `www.shigotoku.com` → `shigotoku.com` リダイレクト（不要と判断済み）
