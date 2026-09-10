# BuzzIt アカウント・課金モデル

最終更新: 2026-09-10

## 概要

BuzzIt は **User（人）** と **Account（課金主体）** を分離します。  
決済は Stripe / PAY.JP どちらでも接続可能な抽象レイヤーを用意しています。

## 3層構造

| 層 | Firestore | 役割 |
|----|-----------|------|
| User | `users/{uid}` | ログインする個人 |
| Account | `accounts/{accountId}` | 課金・プラン・モニター判定 |
| Store | `stores/{storeId}` | 店舗（運用単位） |

## アカウント種別

| accountType | 説明 | 制限 |
|-------------|------|------|
| `individual` | 個人オーナー | アカウント1つまで。メンバー追加不可 |
| `business` | 法人・会社 | 会社名必須。メンバー追加可（追加席課金） |

## 課金ステータス

| billingStatus | 意味 |
|---------------|------|
| `monitor` | モニター（課金なし） |
| `trial` | トライアル |
| `active` | 課金中 |
| `past_due` | 支払い遅延 |
| `cancelled` | 解約済み |

`billingExempt: true` の場合も課金チェックをスキップします。

## 料金（アカウント単位）

```
月額 = プラン基本料 + 追加ユーザー席 × ¥1,980
```

- 法人アカウント: 1席目込み、2人目以降 +¥1,980/月
- 個人アカウント: 追加席なし
- 店舗数・SNS追加枠は既存の `billing.ts` ロジックに加算

## 決済プロバイダ

| 環境変数 | プロバイダ |
|----------|-----------|
| `STRIPE_SECRET_KEY` | Stripe |
| `PAYJP_SECRET_KEY` | PAY.JP |

`paymentProvider.ts` が抽象化。課金開始時に `accounts.paymentCustomerId` を保存。

## 登録フロー

1. ログイン（Google / メール）
2. `/account-setup` — 個人 or 法人を必ず選択
3. `/onboarding` — 業種・目的
4. ダッシュボード利用

## 管理画面

- パス: `/admin/accounts`
- 権限: `BUZZIT_ADMIN_EMAILS`（デフォルト: `r.tokunaga@meditoku.com`）
- 機能: 一覧、モニター/課金フィルタ、プラン・ステータス編集

## API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/v1/account` | 自分のアカウント |
| POST | `/v1/account/setup` | 初回アカウント作成 |
| GET | `/v1/account/members` | 会社メンバー一覧 |
| POST | `/v1/account/members` | メールでメンバー追加（要登録済み） |
| DELETE | `/v1/account/members/:userId` | メンバー削除 |
| GET | `/v1/admin/accounts` | 管理者: 一覧 |
| PATCH | `/v1/admin/accounts/:id` | 管理者: 更新 |

## 会社メンバー招待（UI + メール）

設定 → **スタッフ** タブ上部の「会社アカウント」セクション（法人のみ表示）。

| ケース | 動作 |
|--------|------|
| 既に BuzzIt 登録済み | 即時メンバー追加 |
| 未登録 | 招待メール送信（`RESEND_API_KEY`）またはリンク手動共有 |
| 承認 URL | `/account-invite/{token}`（有効期限7日） |

- 承認時は招待メール宛先とログインアドレスが一致している必要あり
- 承認後、同じ `accountId` の店舗へスタッフとして紐づけ
- 2人目以降 +¥1,980/月（`EXTRA_ACCOUNT_SEAT_MONTHLY`）

### メール設定（本番）

Firebase Secret Manager に `RESEND_API_KEY` を登録。任意で `BUZZIT_NOTIFY_FROM`。

## 関連ファイル

- `api/src/services/accounts.ts`
- `api/src/services/paymentProvider.ts`
- `api/src/types/account.ts`
- `api/src/middleware/admin.ts`
- `app/src/pages/AccountSetupPage.tsx`
- `app/src/pages/AdminAccountsPage.tsx`

## 移行

```bash
cd buzzit/api
node scripts/migrate-accounts.mjs
```
