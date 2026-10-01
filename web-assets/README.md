# Web 画像アセット（HP / LP 共通）

コーポレートサイトと各 LP で使う静的画像の **単一ソース** です。  
各プロジェクトの `public/` へは `deploy/scripts/sync-web-assets.mjs` で同期します。

## フォルダ構成

```
web-assets/
  corporate/
    brand/          # シゴトクロゴなど
    site/           # コーポレート HP 用（ヒーロー、ミッション等）
    products/       # 各プロダクトロゴ・アイコン
  landing-pages/
    runwith/        # ランウィズ LP
    buzzit/         # バジット LP
    clipit/         # クリッピット LP
```

## 同期方法

```bash
# リポジトリルートから
node deploy/scripts/sync-web-assets.mjs

# または deploy パッケージ経由
npm run sync:web-assets --prefix deploy
```

`npm run build:clipit-web` / `npm run deploy:clipit-web` 実行時にも自動で同期されます。

## 画像の追加・変更

1. このフォルダ内の適切な場所にファイルを置く（または差し替える）
2. 同期スクリプトを実行
3. corporate-site から参照する場合は `corporate-site/src/lib/assets.ts` のパス定数を確認

### 例: シゴトクロゴの差し替え

`corporate/brand/shigotoku-logo.png` を上書き → 同期

### 例: お知らせ以外のコーポレート画像

`corporate/site/` に追加 → `assets.ts` にパスを追加

### 例: バジット LP の画像

`landing-pages/buzzit/images/` に追加 → 同期（LP 側の参照パスは従来どおり `images/...`）

## ClipIt アイコン

透過処理済みアイコンは `prepare-clipit-icon.mjs` が `corporate/products/clipit-icon.png` に出力します。  
ビルド前に同期されるため、手動で LP 用 `icon.png` を編集する必要はありません。
