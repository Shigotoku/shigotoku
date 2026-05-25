# BuzzIt（バジット）要件定義書

**版:** 4.0  
**最終更新:** 2026-05-25  
**インフラ方針:** Google Cloud Platform（Firebase）統一 — Supabase は使用しない

---

## 1. プロダクト概要

### 1.1 名称・コンセプト

| 項目 | 内容 |
|------|------|
| プロダクト名 | **BuzzIt（バジット）** |
| コンセプト | SNSツールではなく、**組織を動かし売上を作る経営OS** |
| ビジョン | SNS運用を毎朝5分のルーティンで終わらせ、担当者の孤独をなくし全社員を巻き込む |

### 1.2 ターゲット

- **初期（ボウリングピン）:** 美容室・サロン（1〜数名〜多店舗）
- **拡張:** 飲食、パーソナルジム、小規模EC、教育系 BtoC
- **ペルソナ:** 時間がない経営者・店長、ネタ出しに疲弊するSNS担当者

### 1.3 提供価値

1. **思考ゼロUX** — AIが「今日やること」だけ提示
2. **一気通貫自動化** — 1素材から全SNSへ Repurpose、Auto Mode で改善サイクル
3. **全社巻き込み** — Slack ネタ会議・戦略的通知で現場の知見を吸い上げる
4. **売上可視化** — 投稿→LINE→来店→売上のファネルを経営判断に使える形で表示

---

## 2. 技術アーキテクチャ（GCP 統一）

### 2.1 スタック

| レイヤ | 技術 | 用途 |
|--------|------|------|
| フロント | React + Vite | Webアプリ `app.buzzit.shigotoku.com` |
| LP | Astro | `shigotoku.com/buzzit/` |
| API | Cloud Functions v2 (Express) | REST API `/api/**` |
| 認証 | **Firebase Authentication** | Google / メール / 匿名（デモ） |
| DB | **Cloud Firestore** | ユーザー設定・KPI・投稿・予約ジョブ |
| ストレージ | **Cloud Storage** | 素材 `uploads/`（Functions 経由のみ書込） |
| AI | **Gemini API**（Google AI） | 台本生成・Repurpose |
| スケジュール | **Cloud Scheduler** + Functions | Auto Mode・朝昼夜通知・**5分ごとPublish Worker** |
| 秘密情報 | Secret Manager / Functions 環境変数 | API キー管理 |
| 配信 | Firebase Hosting | SPA + API リライト |
| SNS投稿 | **Meta Graph API（BYO OAuth）** + LINE Messaging API + Slack 通知 | 店舗アカウント直結 |
| SNS投稿（任意） | **Ayrshare API** | レガシーアダプタ（オプション） |
| 組織連携 | **Slack Incoming Webhook / Events API** | ネタ会議・戦略的通知 |

### 2.2 投稿パイプライン（v4）

```
Magic Creator / Auto Mode
        ↓
Firestore users/{uid}/scheduled/{jobId}
  publishMode: notify | approval | meta | line | auto | ayrshare
  status: pending_approval → pending → processing → published | notified | failed
        ↓
buzzitPublishWorker（5分ごと）
        ↓
executePublish()
  ├─ notify  → Slack Webhook + LINE broadcast（文案リマインダー）
  ├─ meta    → Meta Graph API（IG / FB Page / Threads）
  ├─ line    → LINE Messaging API broadcast
  ├─ approval→ ダッシュボード承認後 pending へ
  ├─ auto    → 接続状況に応じて meta / line / notify
  └─ ayrshare→ Ayrshare API（任意・フォールバック）
```

**設計方針:** Ayrshare 依存をやめ、Meta 直結 + 自前 Scheduler + BYO モデルを主軸とする。X 自動投稿は後回し。

### 2.3 非採用

- **Supabase** — 使用しない
- **スクレイピング** — 禁止。公式API範囲内のみ

### 2.4 環境変数（Cloud Functions）

| 変数 | 用途 |
|------|------|
| `GEMINI_API_KEY` | Gemini 台本生成 |
| `META_APP_ID` / `META_APP_SECRET` | Meta OAuth（店舗 BYO トークン取得） |
| `AYRSHARE_API_KEY` | レガシー予約（任意） |
| `SLACK_SIGNING_SECRET` | Slack Events 署名検証（任意） |
| `BUZZIT_APP_ORIGIN` | OAuth コールバック元（既定: `https://app.buzzit.shigotoku.com`） |

ユーザーごとの設定（Firestore `users/{uid}`）:

- `slackWebhookUrl` — 戦略的通知・投稿リマインダー
- `lineChannelAccessToken` — LINE 配信・通知
- `metaAccessToken`, `metaIgUserId`, `metaPageId` — Meta OAuth 連携
- `defaultPublishMode` — notify / approval / meta / line / auto
- `autoModeEnabled` — Auto Mode オン/オフ
- `plan` — starter / pro / team / growth

---

## 3. 機能要件

### 3.1 経営コクピット（Dashboard）

- SNS **健康スコア**（0〜100）とトレンド
- **Today's Mission** — AI 処方的提案
- **承認待ちキュー** — `pending_approval` ジョブの一覧・ワンクリック承認
- **売上ファネル** — 投稿 → リーチ → クリック → LINE友だち → 売上

### 3.2 マジック・クリエイター

- 画像/動画ドロップ → GCP Storage
- Gemini Repurpose
- **投稿モード選択:** 通知 / 承認後 / Meta 自動 / LINE / 自動
- 予約登録 → Firestore + Worker 処理

### 3.3 設定

- Meta OAuth 連携ボタン
- LINE Channel Access Token 入力
- デフォルト投稿モード
- Slack / Ayrshare（任意）

### 3.4 Auto Mode（Growth OS）

1. Gemini で投稿案生成
2. デフォルトは **承認待ちキュー** に登録
3. `defaultPublishMode=auto|meta` 時は自動予約

---

## 4. プラン設計

| プラン | 月額 | 主要機能 |
|--------|------|----------|
| Starter | ¥0 | AI台本、健康診断、透かしあり、通知リマインダー |
| Pro | ¥4,980 | Meta/LINE 自動投稿、透かし削除 |
| Team | ¥9,800 | Slack連携、承認フロー、戦略的通知 |
| Growth OS | ¥29,800 | Auto Mode、深い売上トラッキング |

---

## 5. API 一覧（v4 追加分）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/v1/schedule` | 予約登録（`publishMode` 対応） |
| GET | `/v1/scheduled` | 予約ジョブ一覧 |
| POST | `/v1/scheduled/:id/approve` | 承認待ち → pending |
| GET | `/v1/oauth/meta/start` | Meta OAuth URL 取得 |
| GET | `/v1/oauth/meta/callback` | Meta OAuth コールバック |

既存 API（upload, repurpose, dashboard, analytics, settings, slack, trends, ab-tests, auto-mode 等）は v3 と同様。

---

## 6. Firestore スキーマ（v4）

```
users/{uid}
  plan, slackWebhookUrl, lineChannelAccessToken, metaAccessToken, metaIgUserId,
  metaPageId, defaultPublishMode, autoModeEnabled, ...

users/{uid}/scheduled/{jobId}
  contents, scheduledAt, publishMode, status, mediaUrls,
  trackingLinks, publishResults, errorMessage, createdAt, updatedAt

oauthStates/{state}
  uid, provider, expiresAt
```

**collectionGroup インデックス:** `scheduled` — `status` + `scheduledAt`

---

## 7. ロードマップと実装状況

### Phase 0 — 半自動（notify） ✅

- Firestore 予約 + Slack/LINE 文案通知

### Phase 1 — Meta 直結 + Worker ✅

- Meta OAuth、Graph API 投稿、5分 Worker

### Phase 2 — LINE ブロードキャスト ✅

- Messaging API broadcast

### Phase 3 — 承認キュー + Auto Mode 連携 ✅

- `pending_approval` → ダッシュボード承認

### Phase 4 — AI エージェント層（将来）

- Gemini 従量のみ

---

## 8. セットアップ（運用者向け）

### Meta App

1. developers.facebook.com でアプリ作成
2. Instagram Graph API / Pages API を有効化
3. OAuth リダイレクト: `https://app.buzzit.shigotoku.com/api/v1/oauth/meta/callback`
4. Secret Manager に `META_APP_ID`, `META_APP_SECRET` を設定

### デプロイ

```bash
cd deploy
npm run deploy:buzzit
```

---

## 9. URL

| 環境 | URL |
|------|-----|
| LP | https://shigotoku.com/buzzit/ |
| アプリ | https://app.buzzit.shigotoku.com/ |
| API | https://app.buzzit.shigotoku.com/api/ |
| GCP プロジェクト | shigotoku-prod |
