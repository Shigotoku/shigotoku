# ShapeIt Chrome 拡張 — Web Store 申請ガイド

社内配布（限定公開 Unlisted）→ Google Workspace 強制インストールまでを想定したチェックリストです。

## 費用

| 項目 | 費用 |
|------|------|
| Chrome Web Store 開発者登録 | **$5（一度きり）** |
| バージョンアップの公開 | **無料** |
| Workspace 強制配布 | 追加料金なし（既存ライセンス内） |

---

## 拡張の機能（v0.3.0）

申請・社内説明用の機能一覧です。

| 機能 | 説明 |
|------|------|
| 全画面キャプチャ | 表示中のブラウザタブをスクリーンショット |
| 範囲選択キャプチャ | ページ上でドラッグして一部だけ切り取り |
| 注釈（書き込み） | ペン・矩形・矢印・文字・色変更・1つ戻す |
| URL 自動取得 | 報告対象ページの URL・タイトルを自動入力 |
| 一言コメント | 気づきをテキストで入力して API 送信 |
| ShapeIt 連携 | アプリにログイン済みなら Bearer トークンで直接投稿 |
| ショートカット | `Alt+Shift+F` でキャプチャ＋編集画面を開く |

---

## 申請前チェックリスト

### ビルド

```powershell
cd deploy
npm run build:shapeit-extension
```

出力:

- `shapeit/extension/dist/` — ストアにアップロードするフォルダ（zip 化して提出）
- `deploy/dist/shapeit-app/downloads/shapeit-chrome-extension.zip` — 社内 zip 配布用（開発者モード向け）

### 必要アセット

| 項目 | 要件 |
|------|------|
| アイコン | 128×128 PNG（`public/icon.png` を高解像度化推奨） |
| スクリーンショット | 1〜5枚、1280×800 または 640×400 |
| 説明文（短） | 132文字以内 |
| 説明文（詳細） | 機能・データの扱いを明記 |
| プライバシーポリシー URL | https://shigotoku.com/shapeit/privacy/ |
| サポート URL | https://shigotoku.com/shapeit/guide/ またはお問い合わせ |

### スクリーンショット撮影のおすすめ構成

1. **ポップアップ** — URL 表示と「キャプチャして報告」ボタン
2. **編集画面** — スクショ＋注釈ツールバー
3. **範囲選択** — ページ上の選択 UI
4. **送信完了** — 「ShapeIt に投稿しました」
5. **ShapeIt 受信箱** — 投稿が届いた画面（アプリ側）

---

## ストア掲載文（コピー用）

### 短い説明（日本語）

```
開いている画面をスクショ（全画面・範囲選択）し、書き込みと URL 付きで ShapeIt に改善報告を送ります。
```

### 詳細説明（日本語）

```
ShapeIt は SaaS の改善報告を集めるツールです。この拡張機能で、操作中の画面からすぐに気づきを送れます。

【できること】
・表示中タブの全画面キャプチャ
・ドラッグによる範囲選択キャプチャ
・スクリーンショットへの注釈（ペン・矩形・矢印・文字）
・ページ URL・タイトルの自動取得
・ShapeIt へのワンクリック投稿

【データの送信先】
投稿内容・スクリーンショット・URL は、お客様の ShapeIt ワークスペース（app.shapeit.shigotoku.com）にのみ送信されます。第三者への販売・広告利用は行いません。

【必要な権限】
・activeTab / tabs: 報告対象ページの URL とスクリーンショット取得
・scripting: 範囲選択 UI の一時表示
・host_permissions (<all_urls>): 任意の SaaS 画面からの報告のため

【アカウント】
ShapeIt にログインしたアカウントで投稿されます。初回はアプリでログインしてください。
```

### Short description (English)

```
Capture the current tab (full or region), annotate, and send feedback with URL to ShapeIt.
```

---

## 権限の審査用説明（Permission justification）

| 権限 | 申請時の説明（英語例） |
|------|------------------------|
| `activeTab` | Capture the visible tab screenshot when the user clicks the extension. |
| `tabs` | Read the active tab URL and title to attach to feedback reports. |
| `scripting` | Inject a temporary region-selection overlay when the user chooses partial capture. |
| `storage` | Store ShapeIt auth token and pending reports locally on the device. |
| `<all_urls>` | Users report issues on arbitrary SaaS products they use; screenshots must work on any HTTPS page the user is viewing. Data is only sent to the user's ShapeIt API after explicit submit. |

---

## 公開手順（限定公開 Unlisted）

1. https://chrome.google.com/webstore/devconsole で開発者登録（$5）
2. **新しいアイテム** → `shapeit-chrome-extension.zip`（`dist` フォルダを zip）をアップロード
3. ストア掲載情報・スクリーンショット・プライバシーポリシー URL を入力
4. **公開設定: 限定公開（Unlisted）** を選択  
   - 検索には出ない  
   - リンクを知っている人だけインストール可能
5. 審査提出 → 承認後、インストール URL を社内共有

### 更新時

1. `manifest.json` の `version` を上げる（例: 0.3.0 → 0.3.1）
2. `npm run build` → 新しい zip をアップロード
3. 審査（通常は初回より短い）

---

## Google Workspace 強制配布

1. 上記のとおり Web Store に限定公開で公開する
2. 拡張の **ID** を控える（`chrome://extensions` の詳細、またはデベロッパーコンソール）
3. [Google 管理コンソール](https://admin.google.com) → デバイス → Chrome → アプリと拡張機能
4. 対象 OU を選び **追加** → Chrome ウェブストアから ShapeIt 拡張を検索（限定公開でも ID 指定で追加可能）
5. インストールポリシー: **Force install（強制インストール）**

社員は Chrome を開くだけで拡張が入ります。ShapeIt へのログインは初回のみ必要です。

---

## 開発中の社内配布（ストア審査待ち）

審査完了までの暫定手段:

1. `npm run build:shapeit-extension` で zip 生成
2. 社員に zip + [セットアップ伴走ガイド](./セットアップ伴走ガイド.md) を共有
3. 開発者モードで `dist` を読み込み（パイロット向け）

**本番は Unlisted + Workspace 強制配布に切り替え**てください。

---

## 関連ファイル

| パス | 内容 |
|------|------|
| `manifest.json` | 権限・バージョン |
| `editor.html` / `editor.js` | キャプチャ編集・注釈・投稿 |
| `popup.html` / `popup.js` | クイックランチャー |
| `src/captureOverlay.ts` | 範囲選択 UI |
| `src/shared.ts` | キャプチャ処理 |
| `セットアップ伴走ガイド.md` | 社員向けインストール手順 |
