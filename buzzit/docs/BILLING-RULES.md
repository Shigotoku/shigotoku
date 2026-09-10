# BuzzIt 課金ルール

最終更新: 2026-05-26

## 概要

BuzzIt は **店舗（ロケーション）単位** で課金します。RunWith の「席課金（2人無料 + 追加¥980）」とは異なり、美容サロン・小規模店舗の利用形態に合わせたモデルです。

## 月額計算式

```
月額 = 1店舗目のプラン基本料 + 2店舗目以降 × 基本料 × 0.8（20% OFF）
```

例: Pro（¥9,800）で3店舗の場合  
→ ¥9,800 + ¥9,800×0.8 + ¥9,800×0.8 = **¥25,480/月**

## プラン一覧

| プラン | 1店舗目 | 最大店舗 | スタッフ上限 |
|--------|---------|----------|--------------|
| Free | ¥0 | 1 | 1（オーナーのみ） |
| LINE管理ライト | ¥980 | 1 | 1 |
| LINE管理プロ | ¥4,980 | 1 | 3 |
| Starter | ¥4,980 | 1 | 3 |
| Pro | ¥9,800 | 2 | 10 |
| Growth OS | ¥24,800 | 5 | 無制限 |
| Enterprise | 要見積 | 100 | 無制限 |

※ `team` プランは Pro と同等（レガシー互換）

## スタッフ（メンバー）

- ロール: **owner** / **manager** / **staff**
- スタッフ上限は **店舗オーナーのプラン** で判定
- 席追加課金はなし（プラン上限内は追加料金なし）
- 上限超過時はプランアップグレードが必要

### 権限

| 操作 | owner | manager | staff |
|------|-------|---------|-------|
| プラン変更・店舗追加 | ✓ | — | — |
| メンバー招待 | ✓ | ✓ | — |
| メンバー削除 | ✓ | ✓ | — |
| ロール変更 | ✓ | staffのみ | — |
| オーナー移譲 | ✓ | — | — |

## アカウント（課金主体）

詳細: [ACCOUNT-BILLING-MODEL.md](./ACCOUNT-BILLING-MODEL.md)

```
accounts/{accountId}
  accountType: individual | business
  billingStatus: monitor | trial | active | past_due | cancelled
  plan, billingExempt, companyName, seatCount, paymentProvider, paymentCustomerId
accounts/{accountId}/members/{uid}
  role: owner | admin | member
users/{uid}
  accountId, accountType, accountSetupComplete
```

- 個人: アカウント1つまで、追加メンバー不可
- 法人: メンバー追加可（2人目以降 +¥1,980/月）
- 決済: Stripe / PAY.JP 抽象化（`paymentProvider.ts`）

## データモデル（Firestore）

```
stores/{storeId}
  name, ownerId, industry, createdAt
stores/{storeId}/members/{uid}
  role, email, displayName
stores/{storeId}/invitations/{id}
  email, role, token, expiresAt, acceptedAt
buzzit_invitation_tokens/{token}
  storeId, invitationId, storeName, role, expiresAt
users/{uid}
  plan, storeIds[], activeStoreId
```

## API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /v1/stores | 店舗一覧 |
| POST | /v1/stores | 店舗追加 |
| PUT | /v1/stores/active | アクティブ店舗切替 |
| GET | /v1/billing | 請求サマリー |
| GET | /v1/stores/:id/members | メンバー・招待一覧 |
| POST | /v1/stores/:id/invitations | 招待作成 |
| POST | /v1/invitations/:token/accept | 招待承認 |

## 実装済み（2026-09-10）

- Stripe Checkout `/v1/billing/checkout` + Webhook `/v1/billing/webhook`（`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` 必須）
- ダウングレード時の店舗数ガード（`PUT /v1/settings` で `plan` 変更時）
- Firestore Security Rules（`deploy/firestore.buzzit.rules` — 店舗メンバー）
- 紹介コード（`referralCode` 自動発行 + `/v1/billing/referral/apply`）
- 年払い（Checkout で `interval: annual`、10ヶ月分請求）

## 未実装（次フェーズ）

- ダウングレード時のスタッフ数ガード（UI）
- Stripe Subscription による自動更新（現状は Checkout 単発決済）
- プランは現状 `users/{uid}.plan` に保存（オーナーUID基準）

## 関連ファイル

- `buzzit/api/src/services/billing.ts` — 料金定数・計算
- `buzzit/api/src/services/stores.ts` — 店舗・メンバー・招待
- `buzzit/app/src/lib/billing.ts` — フロント用定数
- `buzzit/app/src/components/StoreBillingSection.tsx` — 設定画面
- `buzzit/app/src/pages/TeamPage.tsx` — スタッフ管理
