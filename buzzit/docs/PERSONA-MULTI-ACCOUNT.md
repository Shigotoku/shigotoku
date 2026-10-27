# 配信ペルソナ（マルチキャラ）管理

Buzzit で **1社・複数キャラクター**（公式 / 院長 / キャラなど）を安全に分離運用するための設計と実装メモ。

## 概念

| エンティティ | 役割 |
|-------------|------|
| **Account** | 課金主体（法人・個人） |
| **Store** | 物理店舗・MEO・LINE CRM |
| **Persona** | 配信キャラ（SNSの「誰として話すか」） |

例（メディトク株式会社）:

- メディトク公式（`official`）
- むしゃら院長（`personal`）
- メディト君（`character`）

## データモデル

```
personas/{personaId}
  name, slug, type, brandProfile, ownerId, accountId, status
  # SNS 認証（ペルソナ単位）
  metaAccessToken, xApiKey, lineChannelAccessToken, gbpAccessToken, ...

personas/{personaId}/members/{uid}   # editor | approver | viewer
personas/{personaId}/auditLogs/      # 操作監査

users/{uid}
  personaIds[], activePersonaId

users/{uid}/scheduled/{jobId}        # personaId
users/{uid}/xSeries/{seriesId}       # personaId
users/{uid}/postInsights/{id}        # personaId
```

## API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/v1/personas` | 一覧・上限・ロール |
| POST | `/v1/personas` | 作成 |
| PUT | `/v1/personas/active` | 切替 |
| PATCH | `/v1/personas/:id` | 更新（SNS・トーン） |
| DELETE | `/v1/personas/:id` | アーカイブ |
| GET | `/v1/personas/:id/members` | メンバー |
| POST/PATCH/DELETE | `/v1/personas/:id/members/...` | 権限 |
| GET | `/v1/personas/:id/audit` | 監査ログ |

`GET/PUT /v1/settings` は **アクティブペルソナ** の SNS・`brandProfile` を読み書きします（プラン・Slack 等はユーザー単位）。

OAuth（Meta / GBP）はアクティブペルソナにトークンを保存します。

## 課金

- プラン込みペルソナ数: `INCLUDED_PERSONAS_BY_PLAN`（free/starter/pro=1, team=2, growth=3, enterprise=10）
- 追加枠: 既存 `extraSnsAccounts`（¥980/月/体）を **追加ペルソナ枠** として接続

## 安全設計

- SNS トークンはペルソナドキュメントに分離（API レスポンスはマスク）
- `official` タイプは予約投稿時に承認フロー（`approval`）をデフォルト適用
- ペルソナ単位のメンバー権限・監査ログ
- 投稿 UI にアクティブキャラ名を常時表示（PersonaSwitcher）

## 移行

初回アクセス時 `ensureDefaultPersona()` が既存ユーザー設定を「メインキャラ」1体にコピーします。旧データ（`personaId` なしの X シリーズ・予約）はアクティブペルソナに表示されます。

## UI

- ヘッダー: `PersonaSwitcher`（店舗スイッチャーと並列）
- 設定: タブ「配信キャラ」→ `PersonaManagementSection`
- SNS 連携タブ: 現在のキャラ名をバナー表示
- 解析: キャラ別 / 合算フィルタ
