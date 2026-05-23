# BuzzIt（バジット）要件定義書

**版:** 3.0  
**最終更新:** 2026-05-23  
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
| DB | **Cloud Firestore** | ユーザー設定・KPI・投稿・Slackアイデア |
| ストレージ | **Cloud Storage** | 素材 `uploads/`（Functions 経由のみ書込） |
| AI | **Gemini API**（Google AI） | 台本生成・Repurpose |
| スケジュール | **Cloud Scheduler** + Functions | Auto Mode・朝昼夜通知 |
| 秘密情報 | Secret Manager / Functions 環境変数 | API キー管理 |
| 配信 | Firebase Hosting | SPA + API リライト |
| SNS投稿 | **Ayrshare API** | 公式API経由の一括予約投稿 |
| 組織連携 | **Slack Incoming Webhook / Events API** | ネタ会議・戦略的通知 |

### 2.2 非採用

- **Supabase** — 使用しない。認証・DB はすべて GCP（Firebase）で統一
- **スクレイピング** — 禁止。データ取得・投稿は公式API範囲内のみ

### 2.3 コスト最適化方針

- Functions: 256〜512MiB、min instances 0、東京リージョン
- Storage: Regional Standard、直接 write 禁止（API 経由）
- Gemini: プロンプトを短く構造化、失敗時はテンプレートフォールバック
- Artifact Registry: 7日で古いイメージ削除

### 2.4 環境変数（Cloud Functions）

| 変数 | 用途 |
|------|------|
| `GEMINI_API_KEY` | Gemini 台本生成 |
| `AYRSHARE_API_KEY` | SNS 予約投稿（未設定時は Firestore 保存のみ） |
| `SLACK_SIGNING_SECRET` | Slack Events 署名検証（任意） |

ユーザーごとの設定（Firestore `users/{uid}`）:

- `slackWebhookUrl` — 戦略的通知送先
- `ayrshareProfileKey` — Ayrshare プロファイルキー（Team 以上推奨）
- `autoModeEnabled` — Auto Mode オン/オフ
- `plan` — starter / pro / team / growth

---

## 3. 機能要件

### 3.1 経営コクピット（Dashboard）

- SNS **健康スコア**（0〜100）とトレンド
- **Today's Mission** — AI 処方的提案（承認ボタンでマジック・クリエイターへ）
- **売上ファネル** — 投稿 → リーチ → クリック → LINE友だち → 売上

データソース: Firestore `users/{uid}/metrics/summary`（投稿・手動入力・Ayrshare 連携で更新）

### 3.2 マジック・クリエイター

- 画像/動画ドロップ（10MB/50MB 上限）
- **GCP Storage** へ API 経由アップロード
- **Gemini** による Repurpose（Reels / IGカルーセル / X / LINE）
- ブランドセーフティ（医療・薬機法 NG ワード）
- Starter プラン: 透かし `Powered by BuzzIt`
- **Ayrshare** 一括予約

### 3.3 分析・売上（Analytics）

KPI 設計:

| 段階 | 指標 |
|------|------|
| 認知 | リーチ数 |
| 興味 | 保存率・シェア率 |
| 誘導 | URLクリック率 |
| 見込み客 | LINE友だち追加数 |
| 成果 | 売上・予約数（投稿別貢献度） |

### 3.4 Slack 連携（Team プラン以上）

**ネタ出し会議**

1. 社員が Slack チャンネルに投稿
2. Events API → BuzzIt API → Gemini で台本化 → スレッド返信
3. Firestore `slackIdeas` に保存
4. 管理画面で「採用」→ マジック・クリエイターのキューへ

**戦略的通知（朝/昼/夜）**

| 時間帯 | 内容 |
|--------|------|
| 朝 7:00 | 前日成果 + 今日のアドバイス |
| 昼 12:00 | 本日の投稿生成・承認依頼 |
| 夜 20:00 | バズ開始・全員いいね促進 |

送信: ユーザー設定の Incoming Webhook URL

### 3.5 Auto Mode（Growth OS）

Cloud Scheduler が毎日実行:

1. 過去 KPI・Slack アイデア・トレンドを参照
2. Gemini で投稿案生成
3. 承認待ちとして Mission に表示（または autoModeEnabled + 信頼度 high なら自動予約）
4. 結果を metrics に反映し次サイクルへ

### 3.6 設定

- プラン切替（UI + Firestore）
- SNS 連携状態（Ayrshare プロファイルキー）
- Slack Webhook URL
- Auto Mode トグル

---

## 4. プラン設計

| プラン | 月額 | 主要機能 |
|--------|------|----------|
| Starter | ¥0 | AI台本、健康診断、透かしあり |
| Pro | ¥4,980 | 全SNS自動予約、透かし削除、処方的提案 |
| Team | ¥9,800 | Slack連携、戦略的通知、チーム承認 |
| Growth OS | ¥29,800 | 深い売上トラッキング、Auto Mode |

---

## 5. API 一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| POST | `/v1/upload` | 素材アップロード → GCS |
| POST | `/v1/repurpose` | Gemini Repurpose |
| POST | `/v1/schedule` | Ayrshare 予約 |
| GET | `/v1/dashboard` | コクピットデータ |
| GET | `/v1/analytics` | 分析 KPI |
| GET/PUT | `/v1/settings` | ユーザー設定 |
| POST | `/v1/metrics/event` | KPI イベント記録 |
| POST | `/v1/slack/events` | Slack Events 受信 |
| POST | `/v1/slack/ideas/:id/approve` | アイデア採用 |
| GET | `/v1/slack/ideas` | アイデア一覧 |
| POST | `/v1/auto-mode/run` | Auto Mode 手動実行 |

認証: `Authorization: Bearer {Firebase ID Token}`

---

## 6. Firestore スキーマ

```
users/{uid}
  plan, email, displayName, slackWebhookUrl, ayrshareProfileKey,
  autoModeEnabled, industry, createdAt, updatedAt

users/{uid}/metrics/summary
  healthScore, healthTrend, reach, saveRate, shareRate, clickRate,
  lineFriends, estimatedRevenue, funnel, mission, updatedAt

users/{uid}/posts/{postId}
  title, platform, content, reach, clicks, lineSignups, revenue, createdAt

users/{uid}/slackIdeas/{ideaId}
  text, author, scriptPreview, status, createdAt

users/{uid}/scheduled/{jobId}
  contents, scheduledAt, status, ayrshareResponse
```

---

## 7. ロードマップと実装状況

### Phase 1 — MVP ✅

- [x] BuzzIt ブランド統一
- [x] マジック・クリエイター（素材ドロップ）
- [x] GCP Storage アップロード
- [x] Repurpose API（Gemini + フォールバック）
- [x] ブランドセーフティ
- [x] 本番デプロイ

### Phase 2 — 組織化 & PLG 🔄 本リリース対象

- [x] Firebase Authentication
- [x] Firestore KPI / ダッシュボード
- [x] Slack Webhook 通知・Events ネタ会議
- [x] Ayrshare 予約投稿連携
- [x] 設定画面（連携キー入力）

### Phase 3 — 経営OS化

- [x] Auto Mode（Scheduler）
- [x] 投稿別売上貢献度
- [ ] UTM / LINE 公式 Webhook による自動 CV 計測（要外部連携）
- [ ] トレンド波乗りエンジン
- [ ] ABテスト自動化

### Phase 4 — エコシステム

- [ ] 勝ちテンプレ市場
- [ ] 代理店ホワイトラベル
- [ ] SLM ファインチューニング・プロンプトキャッシュ

---

## 8. 非機能要件

- **UI/UX:** 思考コストゼロ。次のアクションを常に1つ提示
- **セキュリティ:** Firebase Auth、Storage write 禁止、API トークン検証
- **可用性:** Functions 東京、Hosting CDN
- **ブランドセーフティ:** NG ワードフィルター（生成前後）

---

## 9. セットアップ手順（運用者向け）

### 9.1 Firebase Console

1. **Authentication** を有効化（Google、メール、匿名）
2. **Firestore** を作成（asia-northeast1）
3. **Web アプリ** を追加し、設定値を `buzzit/app/.env` に設定

### 9.2 Cloud Functions 環境変数

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set AYRSHARE_API_KEY
firebase functions:secrets:set SLACK_SIGNING_SECRET
```

### 9.3 Slack App（Team 利用時）

1. Slack App 作成 → Event Subscriptions URL: `https://app.buzzit.shigotoku.com/api/v1/slack/events`
2. `message.channels` 購読
3. Signing Secret を Functions に設定

### 9.4 デプロイ

```bash
cd deploy
npm run deploy:all-with-api   # Hosting + Functions + Storage + Firestore rules
```

---

## 10. URL

| 環境 | URL |
|------|-----|
| LP | https://shigotoku.com/buzzit/ |
| アプリ | https://app.buzzit.shigotoku.com/ |
| API | https://app.buzzit.shigotoku.com/api/ |
| GCP プロジェクト | shigotoku-prod |
