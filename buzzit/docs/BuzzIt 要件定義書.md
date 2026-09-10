# BuzzIt（バジット）要件定義書

**版:** 5.0  
**最終更新:** 2026-05-26  
**インフラ方針:** Google Cloud Platform（Firebase）統一 — Supabase は使用しない

> 本版（v5）は競合分析（`buzzit/docs/競合アプリの機能・費用調査.md`）と価格戦略（`PRICING-STRATEGY.md`）、ロードマップ（`COMPETITIVE-ROADMAP.md`）に基づき、プラン体系・機能要件を全面刷新。

---

## 1. プロダクト概要

### 1.1 名称・コンセプト

| 項目 | 内容 |
|------|------|
| プロダクト名 | **BuzzIt（バジット）** |
| コンセプト | SNSツールではなく、**店舗の "経営OS" — SNS・LINE・GBP・HPB を1本化** |
| ビジョン | SNS運用を毎朝5分のルーティンで終わらせ、担当者の孤独をなくし全社員を巻き込む |
| 経済合理性 | **3本契約から1本へ。** AI-BOUZ + AI-LINE + Lステップ ≒ ¥58,560 → BuzzIt Growth OS **¥24,800**（月¥33,760 削減） |

### 1.2 ターゲット

- **初期（ボウリングピン）:** 美容室・サロン（1〜数名〜多店舗）
- **拡張:** 飲食、パーソナルジム、小規模EC、教育系 BtoC
- **Enterprise:** 50店舗〜のチェーン（カンリー対抗）
- **ペルソナ:** 時間がない経営者・店長、ネタ出しに疲弊するSNS担当者

### 1.3 提供価値（v5 拡張）

1. **思考ゼロUX** — AIが「今日やること」だけ提示（5分ルーティン）
2. **音声→全媒体** — ボイスドラフトで AI-BOUZ を超える UX
3. **一気通貫自動化** — 1素材から Meta（IG/FB/Threads）・LINE・**GBP**・**HPB** へ Repurpose
4. **全社巻き込み** — Slack ネタ会議・戦略的通知
5. **売上可視化** — 投稿 → SNS → LINE → **HPB予約** → 売上のファネル
6. **LINE料金改定対策** — セグメント配信で配信コスト 40〜60% 削減
7. **PWAファースト** — アプリストア依存ゼロ、商標リスク回避

---

## 2. 技術アーキテクチャ（GCP 統一）

### 2.1 スタック

| レイヤ | 技術 | 用途 |
|--------|------|------|
| フロント | React + Vite | Webアプリ `app.buzzit.shigotoku.com`（PWA対応） |
| LP | Astro | `shigotoku.com/buzzit/` |
| API | Cloud Functions v2 (Express) | REST API `/api/**` |
| 認証 | **Firebase Authentication** | Google / メール / 匿名（デモ） |
| DB | **Cloud Firestore** | ユーザー設定・KPI・投稿・予約ジョブ・**顧客タグ**・**HPBトラッキング** |
| ストレージ | **Cloud Storage** | 素材 `uploads/`・**音声素材** `voice/` |
| AI | **Gemini API**（Google AI） | 台本生成・Repurpose・**音声→テキスト** |
| スケジュール | **Cloud Scheduler** + Functions | Auto Mode・通知・5分Publish Worker・**LINEステップ配信** |
| 秘密情報 | Secret Manager | API キー管理 |
| 配信 | Firebase Hosting | SPA + API リライト |
| SNS投稿 | **Meta Graph API** + LINE Messaging API + **GBP API**（Phase 4）+ Slack 通知 | 店舗アカウント直結 |
| HPB連携 | UTMトラッキング + 任意のサーバー側集計（Phase 5） | 売上ファネル |
| 組織連携 | **Slack Incoming Webhook / Events API** | ネタ会議・戦略的通知 |

### 2.2 投稿パイプライン（v5）

```
Magic Creator / Auto Mode / ボイスドラフト
        ↓
Firestore users/{uid}/scheduled/{jobId}
  publishMode: notify | approval | meta | line | gbp | auto | ayrshare
  status: pending_approval → pending → processing → published | notified | failed
        ↓
buzzitPublishWorker（5分ごと）
        ↓
executePublish()
  ├─ notify  → Slack Webhook + LINE broadcast（文案リマインダー）
  ├─ meta    → Meta Graph API（IG / FB Page / Threads）
  ├─ line    → LINE Messaging API（broadcast / セグメント / ステップ）
  ├─ gbp     → Google Business Profile API（Phase 4）
  ├─ approval→ ダッシュボード承認後 pending へ
  ├─ auto    → 接続状況・対象セグメントに応じて meta / line / gbp / notify
  └─ ayrshare→ Ayrshare API（任意・フォールバック）
```

### 2.3 非採用

- **Supabase** — 使用しない
- **スクレイピング** — 禁止。公式API範囲内のみ
- **ネイティブアプリ初期投入** — 商標重複リスクのため、**PWA を主軸**

### 2.4 環境変数（Cloud Functions）

| 変数 | 用途 |
|------|------|
| `GEMINI_API_KEY` | Gemini 台本生成・音声処理 |
| `META_APP_ID` / `META_APP_SECRET` | Meta OAuth |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | GBP OAuth（Phase 4） |
| `AYRSHARE_API_KEY` | レガシー（任意） |
| `SLACK_SIGNING_SECRET` | Slack Events 署名検証 |
| `BUZZIT_APP_ORIGIN` | OAuth コールバック元 |
| `LINE_PRICE_PER_MSG` | 配信コスト推定（既定 3.0） |

ユーザーごとの設定（Firestore `users/{uid}`）:

```
plan, slackWebhookUrl, lineChannelAccessToken,
metaAccessToken, metaIgUserId, metaPageId,
gbpAccessToken, gbpLocationName,
hpbStoreUrl, hpbTrackingEnabled,
defaultPublishMode, autoModeEnabled,
defaultDestinationUrl, lineCustomerTags[]
```

---

## 3. 機能要件

### 3.1 経営コクピット（Dashboard）

- **5分ルーティン カード** — 今日のミッション + 承認待ち + 配信結果
- SNS健康スコア（0〜100）とトレンド
- **売上ファネル** — リーチ → LINE友だち → **HPB予約** → 推計売上
- 承認待ちキューのワンクリック承認
- LINE配信コスト見積りカード（2026秋料金改定対応）

### 3.2 マジック・クリエイター

- 画像/動画ドロップ → GCP Storage
- **ボイスドラフト** — Web 上で録音 → Gemini で文字起こし & 4種類の下書き生成
- Gemini Repurpose
- 投稿モード選択: 通知 / 承認後 / Meta / LINE / **GBP** / 自動
- 予約登録 → Firestore + Worker 処理

### 3.3 設定

- Meta / Google（GBP）OAuth 連携
- LINE Channel Access Token / Webhook
- **HPB店舗URL** + トラッキング有効化
- デフォルト投稿モード
- Slack / Ayrshare（任意）
- 顧客タグ管理 / セグメント条件ビルダー（Pro〜）

### 3.4 Auto Mode（Growth OS）

1. Gemini で投稿案生成
2. 既定は承認待ちキュー
3. `defaultPublishMode=auto|meta|gbp` 時は自動予約
4. **配信モード自動最適化** — リーチ重視は Meta+GBP、CV重視は LINE セグメント

### 3.5 LINE CRM（Lステップ完全代替・Pro / Growth OS）

LINE Messaging API + Narrowcast + Audience Group + Rich Menu API を直結し、
Lステップ ¥21,780 / Liny ¥43,780 を **BuzzIt 内に内包**。詳細は `docs/LSTEP-REPLACEMENT.md`。

- **顧客タグ管理** — 手動 + 自動付与ルール（follow / postback / クリック計測）
- **流入経路分析** — `/r/line/{sourceId}` 短縮URL + Webhook で経路別追加数を計測
- **セグメント配信** — Narrowcast Audience Group で属性 / タグ / スコア別配信
- **ステップ配信** — Cloud Scheduler `buzzitLineStepWorker` でシナリオ実行
- **リッチメニュー** — 画像 + エリア定義、セグメント別自動切替
- **クイックリプライ / Flex / カルーセル** — メッセージビルダー
- **アンケート（postback 回答収集）** — タグ自動付与
- **配信効果分析** — `/v2/bot/insight/*` を集約
- **配信前コスト推定** — 2026秋料金改定対応

### 3.6 LINE セグメント配信（Pro / Growth OS）— v5.4 統合

> v5.4 以降、本機能は §3.5 LINE CRM に統合。

### 3.7 HPB トラッキング（Growth OS）

- 計測リンク生成時に HPB予約UTM 自動付与
- 投稿別「HPB予約寄与度」可視化
- 売上ファネルに HPB予約数を統合

### 3.8 MEOダッシュボード（Growth OS / Enterprise）

- GBP閲覧・経路・順位
- クチコミ集約・AI返信ドラフト
- 写真投稿の自動同期

### 3.9 多店舗統合（Enterprise）

- 親→子店舗階層
- 横断KPI集計
- テンプレ一括配信
- 改ざん検知 / SSO

---

## 4. プラン設計（v5・5プラン構成）

| プラン | 月額 | 主要機能 |
|--------|------|----------|
| **Free** | ¥0 | AI台本、健康診断、月5投稿、透かしあり、**ボイスドラフト** |
| **Starter** | ¥4,980 | 無制限投稿、Meta/LINE自動、トレンド波乗り、**GBP自動投稿**、透かし削除 |
| **Pro** | ¥9,800 | Slack連携、承認フロー、戦略的通知、**LINEセグメント（基本）**、A/Bテスト |
| **Growth OS** | ¥24,800 | Auto Mode、**HPB連携**、**LINEセグメント（高度）+ ステップ配信**、**MEOダッシュ**、売上ファネル詳細 |
| **Enterprise** | 要見積 | 多店舗（〜100店舗）、専任CSM、SLA、SSO |

### 年払い

- 年払いで **2ヶ月分無料**（実質約17%OFF）

### 紹介・割引

- 紹介プログラム: 紹介者・被紹介者ともに 1ヶ月無料
- スタートアップ割引: 創業3年未満は初年度30%OFF

---

## 5. API 一覧（v5 追加分）

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/v1/schedule` | 予約登録（`publishMode` 対応） |
| GET | `/v1/scheduled` | 予約ジョブ一覧 |
| POST | `/v1/scheduled/:id/approve` | 承認待ち → pending |
| GET | `/v1/oauth/meta/start` `/callback` | Meta OAuth |
| GET | `/v1/oauth/google/start` `/callback` | **GBP OAuth（Phase 4）** |
| POST | `/v1/voice-draft` | **音声→4種下書き生成（Phase 4）** |
| GET/POST/DELETE | `/v1/line/tags` | **顧客タグ CRUD（Phase 5）** |
| GET/POST | `/v1/line/sources` | **流入経路URL発行・分析（Phase 5）** |
| GET | `/r/line/:sourceId` | **流入経路リダイレクト（公開）** |
| GET/POST | `/v1/line/segments` | **セグメント CRUD（Phase 5）** |
| POST | `/v1/line/narrowcast` | **Narrowcast 配信実行（Phase 5）** |
| GET/POST | `/v1/line/steps` | **ステップ配信 CRUD（Phase 5）** |
| GET/POST | `/v1/line/richmenu` | **リッチメニュー（Phase 5）** |
| GET | `/v1/line/insights` | **配信インサイト（Phase 5）** |
| GET | `/v1/line/cost-estimate` | **配信コスト推定** |
| GET | `/v1/hpb/conversions` | **HPB予約寄与度（Phase 5）** |

---

## 6. Firestore スキーマ（v5）

```
users/{uid}
  plan, slackWebhookUrl, lineChannelAccessToken,
  metaAccessToken, metaIgUserId, metaPageId,
  gbpAccessToken, gbpLocationName,
  hpbStoreUrl, hpbTrackingEnabled,
  defaultPublishMode, autoModeEnabled, ...

users/{uid}/scheduled/{jobId}
  contents, scheduledAt, publishMode, status, mediaUrls,
  trackingLinks, publishResults, errorMessage, createdAt, updatedAt
  // v5 追加:
  gbpPostId, hpbReservationCount

users/{uid}/customerTags/{tagId}
  name, color, friendCount, createdAt

users/{uid}/lineSegments/{segmentId}
  name, conditions[], estimatedReach, estimatedCost

users/{uid}/lineSteps/{stepId}
  trigger, dayOffset, messageTemplate, segmentId

oauthStates/{state}
  uid, provider, expiresAt
```

**collectionGroup インデックス:** `scheduled` — `status` + `scheduledAt`

---

## 7. ロードマップと実装状況

### Phase 0 — 半自動（notify） ✅
### Phase 1 — Meta直結 + Worker ✅
### Phase 2 — LINE ブロードキャスト ✅
### Phase 3 — 承認キュー + Auto Mode ✅

### Phase 4 — ボイスドラフト + GBP連携 ✅

- アプリ内 MediaRecorder 録音 UI ✅
- `/v1/voice-draft` API（Gemini マルチモーダル） ✅
- GBP OAuth（`/v1/oauth/google/start` + `callback`） ✅
- GBP 投稿 API（`publishGbpLocalPost`） ✅ — `GOOGLE_OAUTH_*` 必須
- 設定ページ（GBP / HPB / セグメント） ✅

### Phase 5 — HPB連携 + LINEセグメント高度化 ✅（UI 一部改善余地）

- HPB 店舗URL + `hpbTrackingEnabled` ✅
- HPB 専用 UTM + クリック時寄与集計 ✅
- LINE CRM（タグ・流入・セグメント・ステップ・リッチメニュー） ✅
- セグメント条件ビルダー UI ✅
- 自動タグルール UI ✅
- アンケート（postback）UI ✅

### Phase 6 — MEOダッシュボード + クチコミ管理 ✅

- `/meo` ページ（閲覧数・クチコミ・AI返信ドラフト） ✅
- `/v1/gbp/insights` ✅

### Phase 7 — 多店舗統合 / Enterprise 🔵 基盤

- 店舗・メンバー・招待 ✅
- 横断 KPI `/v1/enterprise/kpis` ✅
- テンプレ一括配信 `/v1/enterprise/bulk-distribute` ✅
- 改ざん検知（GBP スナップショット比較） ✅
- SSO / SLA — ⚪ 未着手

### Phase 8 — AIエージェント（Gemini Live） 🔵 スキャフォールド

- `/agent` チャット UI ✅
- `/v1/agent/chat`（Gemini + 店舗メトリクスコンテキスト） ✅
- Gemini Live 音声対話 — ⚪ 未着手

### 横断 — 決済・プラン制限

- Free 月5投稿エンフォース ✅
- 透かし（Free=あり / Starter以上=なし） ✅
- Stripe Checkout + Webhook ✅ — `STRIPE_*` 必須
- 紹介コード ✅
- Enterprise 問い合わせフォーム ✅
- Firestore Security Rules（店舗メンバー） ✅
- SEO ブログ `/buzzit/blog/` ✅（3記事）
- Lステップ CSV インポート `/v1/line/import/lstep` ✅
- リッチメニュー セグメント別自動切替ワーカー ✅
- スタートアップ割引 30%OFF（Stripe Checkout） ✅
- Enterprise 横断ダッシュ `/enterprise` ✅

---

## 8. セットアップ（運用者向け）

### Meta App

1. developers.facebook.com でアプリ作成
2. Instagram Graph API / Pages API を有効化
3. OAuth リダイレクト: `https://app.buzzit.shigotoku.com/api/v1/oauth/meta/callback`
4. Secret Manager に `META_APP_ID`, `META_APP_SECRET` を設定

### Google Business Profile（Phase 4）

1. Google Cloud Console で GBP API を有効化
2. OAuth クライアントを作成
3. リダイレクト: `https://app.buzzit.shigotoku.com/api/v1/oauth/google/callback`
4. `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` を Secret Manager 登録

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

---

## 10. 関連ドキュメント

- 競合分析: `buzzit/docs/競合アプリの機能・費用調査.md`
- 価格戦略: `buzzit/docs/PRICING-STRATEGY.md`
- 競合対抗ロードマップ: `buzzit/docs/COMPETITIVE-ROADMAP.md`
- **Lステップ代替戦略: `buzzit/docs/LSTEP-REPLACEMENT.md`**
- GSC対応: `buzzit/docs/GSC-対応チェックリスト.md`
