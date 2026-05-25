# BuzzIt（バジット）
SNS 自動化・組織運営の経営 OS「BuzzIt（バジット）」のプロジェクト群です。

## フォルダ構成

| フォルダ | 内容 |
|---------|------|
| [`landing-page/`](./landing-page/) | ランディングページ（Astro） |
| [`app/`](./app/) | Webアプリ（React + Vite）— Phase 1 MVP |
| [`api/`](./api/) | バックエンド API（Firebase Cloud Functions + GCS） |
| [`docs/`](./docs/) | 要件定義・設計メモ |

## Phase 1 MVP 機能

- **経営コクピット**: SNS健康スコア・今日のミッション・売上ファネル
- **マジック・クリエイター**: AI台本生成 + Repurpose（1→多変換）+ Ayrshare一括予約（デモ）
- **ブランドセーフティ**: 医療・薬機法NGワードの事前フィルター
- **プラン管理**: Starter透かし（Powered by BuzzIt）/ Pro以上で削除

## 開発

```bash
# ランディングページ
cd landing-page && npm install && npm run dev

# アプリ
cd app && npm install && npm run dev
```
