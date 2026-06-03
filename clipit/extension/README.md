# クリッピット Chrome 拡張

Manifest V3。クリック記録 + スクショ → API `/v1/manuals/:id/ingest` で Firestore に保存。

## ビルド

```bash
npm install
npm run build
```

## 開発者モードで読み込み

1. `chrome://extensions` → デベロッパーモード ON
2. **パッケージ化されていない拡張機能を読み込む** → `dist/` フォルダ
3. `app.clipit.shigotoku.com` のマニュアル編集で **拡張と連携**
4. 記録したい業務タブを開き、拡張アイコンから **記録開始** → 操作 → **停止・取り込み**

## 配布

本番は Chrome ウェブストア（Firebase Hosting 対象外）。
