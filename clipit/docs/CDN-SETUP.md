# クリッピット Storage CDN 設定（任意）

大量の共有閲覧がある場合、Firebase Storage の **転送単価・レイテンシ** を改善するために Cloud CDN を有効化できます。

## 前提

- プロジェクト: `shigotoku-clipit-prod-ad9ee`
- バケット: `shigotoku-clipit-prod-ad9ee.firebasestorage.app`
- 画像には `Cache-Control: public, max-age=31536000, immutable` を付与済み（アプリ/API アップロード時）

## 手順（概要）

1. [Google Cloud Console](https://console.cloud.google.com/) → ネットワークサービス → **Cloud CDN**
2. バックエンドに Storage バケットを指定する **外部 HTTP(S) 負荷分散** を作成
3. カスタムドメイン（例: `cdn.clipit.shigotoku.com`）をマッピング
4. Firebase Hosting またはアプリの `screenshotUrl` 生成を CDN オリジンに切り替える（将来対応）

現状は Firebase の download URL をそのまま利用しています。ブラウザキャッシュと WebP 化で小〜中規模の閲覧は十分低コストです。月間転送が **100GB を超える** 見込みになったら CDN 導入を検討してください。

## Storage CORS（エクスポート用）

```bash
gsutil cors set deploy/storage.cors.clipit.json gs://shigotoku-clipit-prod-ad9ee.appspot.com
gsutil cors set deploy/storage.cors.clipit.json gs://shigotoku-clipit-prod-ad9ee.firebasestorage.app
# または
npm run storage:cors:clipit --prefix deploy
```
