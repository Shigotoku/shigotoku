# Lステップ完全代替戦略（LINE Messaging API 直結による内製）

**版:** 1.0 / 2026-05-26  
**結論:** **Lステップは BuzzIt 内に完全に再現可能**。Lステップ自体が LINE Messaging API + Webhook + Narrowcast の "業務ロジック+UI ラッパー" であり、BuzzIt は既に直結インフラを保有している。

---

## 1. 結論サマリ

| 項目 | 内容 |
|------|------|
| 代替可否 | **可能（フル機能）** |
| 必要追加コスト | LINE API は基本無料（配信通数のみ従量） |
| 開発規模 | API: 7エンドポイント / UI: 1ページ（LINE CRM） / Phase 5〜6 で完成 |
| 価格優位性 | Lステップ ¥21,780（税込）→ BuzzIt Growth OS ¥24,800 に**内包**（SNS+MEO+HPB込み） |
| ライセンス・規約 | LINE Messaging API は **公式・商用利用可**、スクレイピング無し |

---

## 2. Lステップ機能対応マトリックス

| Lステップ機能 | LINE Messaging API での実現方法 | BuzzIt 既存 | 追加実装 |
|--------------|------------------------------|------------|---------|
| **友だち管理** | `Webhook (follow)` + Firestore | ✅ | — |
| **タグ管理** | Firestore `users/{uid}/lineFriends/{userId}.tags[]` | 🔵 骨組み | タグ CRUD API |
| **流入経路分析** | 友だち追加URL `?openExternalBrowser=1&liff.state=src=X` パラメータ + `follow` イベント | 🔵 一部 | 経路別カウント・ダッシュボード |
| **シナリオ（ステップ）配信** | Cloud Scheduler + Firestore queue + `push` API | ❌ | Phase 5 で実装 |
| **セグメント配信** | `Narrowcast Message API`（属性 / カスタムオーディエンス） | ❌ | Phase 5 で実装 |
| **リッチメニュー** | `Rich Menu API`（作成・切替・ユーザー別割当） | ❌ | Phase 5 で実装 |
| **クイックリプライ / カルーセル** | `message.quickReply` + `template message` / `flex message` | ❌ | メッセージビルダー |
| **回答収集（アンケート）** | `quick reply postback` → Webhook で Firestore 保存 | ❌ | Phase 5 で実装 |
| **顧客スコアリング** | Webhook イベントで自前ロジック | ❌ | Phase 5 で実装 |
| **1:1 チャット** | `reply API` + `LINE Public Chat`（必要なら `Inbox UI`） | ❌ | Phase 6 |
| **クロス分析** | Firestore 集計 + BigQuery（任意） | ❌ | Phase 6 |
| **A/B 配信** | `Narrowcast` で 2グループ作成 → 反応差を比較 | 🔵 既存 A/B あり | LINE 拡張 |
| **再アプローチ（離脱顧客）** | `lastSeenAt` でタグ自動更新 → セグメント配信 | ❌ | Phase 5 で実装 |
| **流入経路別スコアリング** | 上記 + Funnel 統合 | ❌ | Phase 6 |
| **オペレーター追加（メンバー管理）** | BuzzIt の既存「Team」プラン Firebase Auth で代替 | ✅ | — |

---

## 3. 使用する LINE Messaging API エンドポイント

### 3.1 配信系
- `POST /v2/bot/message/push` — 個別配信
- `POST /v2/bot/message/multicast` — 複数配信（最大500人）
- `POST /v2/bot/message/broadcast` — 全員配信
- `POST /v2/bot/message/narrowcast` — **セグメント配信（Lステップの中核）**

### 3.2 オーディエンス（セグメント基盤）
- `POST /v2/bot/audienceGroup/upload` — カスタムオーディエンス作成
- `POST /v2/bot/audienceGroup/upload/byFile` — ファイルアップロード
- `GET /v2/bot/audienceGroup/list` — 一覧取得
- `DELETE /v2/bot/audienceGroup/{audienceGroupId}` — 削除

### 3.3 友だち情報
- `GET /v2/bot/profile/{userId}` — プロフィール取得（displayName, language, etc.）
- `GET /v2/bot/followers/ids` — 友だちUID一覧
- `GET /v2/bot/insight/demographic` — 性別・年代分布
- `GET /v2/bot/insight/followers` — 友だち推移
- `GET /v2/bot/insight/message/delivery` — 配信実績

### 3.4 リッチメニュー
- `POST /v2/bot/richmenu` — リッチメニュー作成
- `POST /v2/bot/richmenu/{richMenuId}/content` — 画像アップロード
- `POST /v2/bot/user/{userId}/richmenu/{richMenuId}` — 個別割当
- `POST /v2/bot/user/all/richmenu/{richMenuId}` — デフォルト割当

### 3.5 Webhook（顧客行動の取得）
- `follow` イベント — 友だち追加（流入経路パラメータ取得可）
- `unfollow` — ブロック・解除
- `postback` — ボタン応答（タグ自動付与のトリガー）
- `message` — 顧客からのメッセージ

### 3.6 Insights（分析）
- `GET /v2/bot/insight/message/event` — メッセージごとの効果
- `GET /v2/bot/message/quota/consumption` — 配信通数残量

---

## 4. データモデル拡張（Firestore）

```
users/{uid}/lineFriends/{lineUserId}
  displayName, pictureUrl, language,
  followedAt, unfollowedAt, lastSeenAt,
  tags: string[],                       // 顧客タグ
  source: string,                       // 流入経路（"insta_bio", "qr_a4_chirashi" 等）
  score: number,                        // 自前スコアリング
  attributes: {                         // 自前収集（postback で回答）
    age?: string, gender?: string, interest?: string[], ...
  }

users/{uid}/lineTags/{tagId}
  name, color, ruleType: "manual" | "auto",
  autoRule?: { event: "follow" | "postback" | "click_tracking", match: string }

users/{uid}/lineSegments/{segmentId}
  name, conditions: Array<{ field: "tag"|"source"|"score"|"attr.xxx", op: "in"|"gt"|"lt", value: any }>,
  estimatedReach, estimatedCost, audienceGroupId?  // LINE Narrowcast の Audience Group ID

users/{uid}/lineSteps/{stepId}
  name, segmentId, status: "active"|"paused",
  triggers: Array<{ kind: "follow"|"tag_added"|"date"|"manual", dayOffset?: number, time?: "10:00" }>,
  messages: Array<{ delayMinutes: number, message: LineMessage }>,
  // 進行中の友だち
  inProgress: subcollection /lineStepProgress/{lineUserId} {
    stepId, currentMessageIndex, nextSendAt
  }

users/{uid}/lineRichMenus/{richMenuId}
  name, imageUrl, areas, defaultForSegmentId?, lineRichMenuId  // LINE 側ID

users/{uid}/lineSources/{sourceId}
  label, addFriendUrl, trackingParam, followsCount, blocksCount, ...

users/{uid}/lineDeliveries/{deliveryId}
  segmentId, messageType, recipients, cost, clicks, conversions, sentAt
```

---

## 5. ワーカー設計

### 5.1 ステップ配信ワーカー（5分ごと）

```
buzzitLineStepWorker (Cloud Scheduler, every 5min)
  ↓
collectionGroup('lineStepProgress')
  .where('nextSendAt', '<=', now)
  ↓
for each progress:
  - settings = getUserSettings(progress.uid)
  - step = getStep(progress.uid, progress.stepId)
  - message = step.messages[progress.currentMessageIndex]
  - sendLinePush(settings.lineChannelAccessToken, lineUserId, message)
  - increment currentMessageIndex, set nextSendAt += delayMinutes
  - if last → mark completed
```

### 5.2 Narrowcast 配信

```
POST /v1/line/narrowcast
  body: { segmentId, message }
  ↓
1. オーディエンス生成（LINE Audience Group）
   POST https://api.line.me/v2/bot/audienceGroup/upload
2. Narrowcast 送信
   POST https://api.line.me/v2/bot/message/narrowcast
   {
     messages: [...],
     recipient: { type: "audience", audienceGroupId }
   }
3. Firestore に delivery 記録
```

### 5.3 流入経路トラッキング

```
友だち追加URL:
  https://line.me/R/ti/p/@{basicId}?src=SOURCE_ID

実装方法 (LINE には公式 src パラメータ無いので、LIFF 経由 or 短縮URL経由):
  1. BuzzIt が短縮URL を発行:
       https://app.buzzit.shigotoku.com/r/line/{sourceId}
  2. ユーザーをクッキー設定後 → LINE 公式 URL へリダイレクト
  3. follow Webhook 受信時、直近のクッキー → Firestore に保存

または:
  - LIFF アプリを 1 つ用意し、source パラメータ付きで遷移
  - LIFF → 友だち追加 → context.userId → サーバーに POST
```

---

## 6. UI 設計（LINE CRM ページ）

`/line-crm` の単一ページに 6タブ:

1. **友だち** — タグ管理、属性フィルタ、検索
2. **流入経路** — ソース別追加URL生成、追加・ブロック数
3. **ステップ配信** — シナリオビルダー（時系列・分岐）
4. **セグメント配信** — 条件ビルダー → コスト試算 → 配信
5. **リッチメニュー** — 画像アップロード、エリア設定、セグメント別割当
6. **配信履歴** — 過去配信の効果分析

---

## 7. プラン上の機能配置

| 機能 | Free | Starter | Pro | Growth OS | Enterprise |
|------|------|---------|-----|-----------|-----------|
| LINE broadcast | — | ✅ | ✅ | ✅ | ✅ |
| 友だちタグ管理 | — | 〜10タグ | 〜50タグ | 無制限 | 無制限 |
| 流入経路分析 | — | 〜3経路 | 〜20経路 | 無制限 | 無制限 |
| セグメント配信 | — | — | ✅ 基本 | ✅ 高度 | ✅ 高度 |
| ステップ配信 | — | — | 〜3シナリオ | 無制限 | 無制限 |
| リッチメニュー | — | 1個 | 5個 | 無制限・セグメント別 | 無制限 |
| Narrowcast オーディエンス | — | — | ✅ | ✅ | ✅ |
| 配信効果分析 | — | 簡易 | ✅ | ✅ 詳細 | ✅ |
| 1:1 チャット | — | — | — | ✅ Phase 6 | ✅ |

→ **Pro（¥9,800）以上で Lステップ・スタンダード（¥21,780）相当**を含み、**Growth OS で Lステップ・プロ（¥32,780）相当を超える**配置。

---

## 8. 経済比較

| 利用シナリオ | Lステップ | BuzzIt Pro | BuzzIt Growth OS |
|------------|----------|-----------|-----------------|
| LINE のみ運用 | ¥21,780 | **¥9,800** | ¥24,800 |
| LINE + SNS | ¥21,780 + SocialDog/アピる ¥4,980 ≈ **¥26,760** | **¥9,800** | ¥24,800 |
| LINE + SNS + GBP + HPB | ¥21,780 + AI-LINE ¥14,800 + AI-BOUZ ¥22,000 ≈ **¥58,580** | — | **¥24,800** |

**Growth OS の優位:** Lステップ + AI-LINE + AI-BOUZ の3本契約 ¥58,580 を BuzzIt 1本 ¥24,800 に集約。

---

## 9. 段階的実装計画（Phase 5 詳細）

### Phase 5.1（2週間）— タグ・流入経路
- [ ] `POST /v1/line/tags` `GET/DELETE` — タグ CRUD
- [ ] `POST /v1/line/sources` `GET` — 流入経路URL発行
- [ ] `GET /r/line/{sourceId}` — リダイレクト + クッキー設定
- [ ] Webhook `follow` の拡張（クッキー → source 解決）
- [ ] UI: 友だちタブ + 流入経路タブ

### Phase 5.2（2週間）— セグメント配信
- [ ] `POST /v1/line/segments` `GET/DELETE` — セグメント CRUD
- [ ] `POST /v1/line/narrowcast` — Audience Group 生成 + Narrowcast 送信
- [ ] `GET /v1/line/cost-estimate?segmentId=...` — 試算精度向上
- [ ] UI: セグメント条件ビルダー（GUI）

### Phase 5.3（2週間）— ステップ配信
- [ ] `POST /v1/line/steps` `GET/PUT/DELETE` — シナリオ CRUD
- [ ] `buzzitLineStepWorker`（Cloud Scheduler 5分ごと）
- [ ] UI: シナリオビルダー（時系列）

### Phase 5.4（2週間）— リッチメニュー
- [ ] `POST /v1/line/richmenu` — 作成・アップロード・割当
- [ ] UI: リッチメニュー編集（画像 + エリア）

### Phase 5.5（1週間）— Insights
- [ ] `GET /v1/line/insights` — `demographic`, `followers`, `delivery` の集約
- [ ] UI: 配信履歴・効果分析

---

## 10. LP / 営業メッセージ

### キャッチコピー候補

> **「Lステップが、BuzzIt に内包されました。」**

> **「LINE公式 + SNS + MEO + HPB をひとつに。Lステップ ¥21,780 がいらない理由。」**

### LP 訴求セクション
- 「Lステップ vs BuzzIt」比較表（機能 + 価格）
- 「3本→1本」バナーに **Lステップを追加** して 4本→1本に拡張
- LINE料金改定対策バナーで **「セグメント配信が必須化 → BuzzIt の Narrowcast で対応」** を強調

---

## 11. 法的・規約上の注意

- LINE Messaging API は **商用利用可・公式**（スクレイピング無し）
- Narrowcast の **オーディエンスサイズ最小 100** 制約あり（プライバシー保護）
- LINE Business ID 経由でユーザーが自社アカウントを連携する **BYO モデル**を採用
- LINE が定める **「友だち追加時の同意事項」テンプレ**をシナリオに組み込み（オプトアウト案内必須）
