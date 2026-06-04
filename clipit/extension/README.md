# クリッピット Chrome 拡張

Manifest V3。クリック記録 + スクショ → API `/v1/manuals/:id/ingest` で Firestore に保存。

## ビルド

```bash
npm install
npm run build
```

## 開発者モードで読み込み

**詳しい手順:** [`docs/開発者モード試用手順.md`](docs/開発者モード試用手順.md)

1. `npm run build` → `chrome://extensions` → デベロッパーモード ON
2. **パッケージ化されていない拡張機能を読み込む** → **`dist/`** フォルダ（`src` ではない）
3. https://app.clipit.shigotoku.com でログイン → マニュアル編集で **拡張と連携**
4. 記録したい業務タブで **記録開始** → 操作（Alt+Shift+S で強制キャプチャ可）→ **停止・取り込み**

## 配布

本番は Chrome ウェブストア（Firebase Hosting 対象外）。
