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
| **ランウィズ** | GCP（Firebase Hosting） | **Firebase Auth + Firestore + Storage** | `runwith_users`, `runwith_companies` コレクション |
| **BuzzIt** | GCP（Firebase Hosting） | Firebase Auth + Firestore + Cloud Functions + Storage | `/api/**` → `buzzitApi` |

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

**Firebase Auth + Firestore へ移行済み**（2026-05-22）。

Firebase Console で以下を確認:

- Authentication → Email/Password 有効化
- Authorized domains に `app.runwith.shigotoku.com` 追加
- Firestore Database 有効化

機能データ（ジャーニー進捗・KPI 等）は引き続き localStorage。クラウド同期は今後の拡張。

### 4. その他

- `www.shigotoku.com` → `shigotoku.com` リダイレクト（不要と判断済み）
