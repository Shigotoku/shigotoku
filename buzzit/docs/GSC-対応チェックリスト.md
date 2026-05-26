# Google Search Console 対応チェックリスト

**対象ドメイン:** `shigotoku.com`（BuzzIt LP は `https://shigotoku.com/buzzit/`）  
**最終更新:** 2026-05-25  
**関連:** リポジトリ全体の SEO 設定は [`docs/SEO-MARKETING.md`](../../docs/SEO-MARKETING.md)

---

## 1. このドキュメントの目的

Search Console から届く「インデックス未登録」「リダイレクト」などの通知は、**多くの場合ペナルティではなく状況報告**です。  
本チェックリストは、Shigotoku / BuzzIt サイト運用者が **GSC 上で何を確認し、何を直し、何を待てばよいか** を整理したものです。

---

## 2. 正規 URL（現行）

| 種別 | URL | 備考 |
|------|-----|------|
| コーポレート | `https://shigotoku.com/` | |
| BuzzIt LP | `https://shigotoku.com/buzzit/` | canonical・OGP 設定済み |
| ランウィズ LP | `https://shigotoku.com/runwith/` | |
| ランウィズ 料金 | `https://shigotoku.com/runwith/pricing/` | |
| BuzzIt アプリ | `https://app.buzzit.shigotoku.com/` | **`noindex`**（検索対象外） |
| ランウィズ アプリ | `https://app.runwith.shigotoku.com/` | **`noindex`**（検索対象外） |

**旧サブドメイン:** `startupbuilder.shigotoku.com` は現行構成に含まれません。インデックスに残っている場合は後述 §5 を参照。

---

## 3. サイトマップ・robots（実装済み）

デプロイ時に `deploy/build.mjs` が生成します。

| ファイル | URL |
|----------|-----|
| サイトマップ | `https://shigotoku.com/sitemap.xml` |
| robots.txt | `https://shigotoku.com/robots.txt` |

**サイトマップに含まれる URL（8件）**

- `https://shigotoku.com/`
- `https://shigotoku.com/privacy/`
- `https://shigotoku.com/terms/`
- `https://shigotoku.com/tokushoho/`
- `https://shigotoku.com/security/`
- `https://shigotoku.com/runwith/`
- `https://shigotoku.com/runwith/pricing/`
- `https://shigotoku.com/buzzit/`

---

## 4. GSC 初回セットアップ

- [ ] [Google Search Console](https://search.google.com/search-console) を開く
- [ ] プロパティを追加（推奨: **ドメイン** `shigotoku.com` または **URL プレフィックス** `https://shigotoku.com/`）
- [ ] DNS または HTML で所有権確認
- [ ] **サイトマップ** → `https://shigotoku.com/sitemap.xml` を送信
- [ ] 送信後、ステータスが「成功」になることを確認（数時間〜1日かかることがある）

---

## 5. 通知が来たときの対応フロー

### Step 1: パニックしない

メール件名例: **「ページがインデックスに登録されない新しい要因」**

- これは **障害アラートではない**
- 「未登録の理由が増えた／変わった」という **情報メール**
- 登録済みページが 0 件に落ちていなければ、通常は急ぎの対応不要

### Step 2: 理由ごとに URL を確認

GSC → **インデックス作成** → **ページ** → 該当する理由をクリック → **例** の URL をメモする。

| 理由 | 意味 | 基本対応 |
|------|------|----------|
| **ページにリダイレクトがあります** | その URL は別 URL へ飛ぶため、飛び元はインデックスされない | 意図した 301/302 なら **対応不要**。意図しない場合のみ Hosting/DNS を修正 |
| **検出 – インデックス未登録** | Google は URL を知っているが、まだクロール・評価していない | サイトマップ確認 + 重要 URL のインデックス登録リクエスト + **1〜4週間待つ** |
| **クロール済み – インデックス未登録** | クロールしたが品質・重複等で載せなかった | コンテンツ・canonical・内部リンクを見直す |
| **除外 – 'noindex' タグ** | 意図的に除外 | アプリ（`/login` 等）なら **正常** |

### Step 3: 優先 URL にインデックス登録をリクエスト

GSC 上部 **URL 検査** で以下を 1 件ずつ入力 → **インデックス登録をリクエスト**

- [ ] `https://shigotoku.com/`
- [ ] `https://shigotoku.com/buzzit/`
- [ ] `https://shigotoku.com/runwith/`
- [ ] `https://shigotoku.com/runwith/pricing/`

**注意:** 毎日繰り返す必要はない。デプロイで LP を大きく更新した直後など、タイミングを絞る。

### Step 4: 1〜4週間後に再確認

- [ ] **インデックス作成 → ページ** で登録済み件数の推移を確認
- [ ] BuzzIt LP（`/buzzit/`）が「登録済み」の例に含まれるか確認

---

## 6. `startupbuilder.shigotoku.com` について

インデックス済みの例に **旧サブドメイン** が含まれることがあります（`/login` や `/pricing` など）。

| 確認 | 対応 |
|------|------|
| サブドメインがまだ DNS で生きている | 301 で現行 URL へ統合（LP → `shigotoku.com/runwith/`、アプリ → `app.runwith.shigotoku.com`） |
| ログイン画面が検索に載っている | 現行アプリは `noindex` 済み。旧ドメイン側もリダイレクトまたは `noindex` |
| リダイレクト設定後 | GSC **削除** → **一時的な削除** は通常不要。301 が浸透すれば自然に整理される |

「ページにリダイレクトがあります」の 1 件は、**旧 URL から新 URL への 301** である可能性が高いです。意図どおりなら放置で問題ありません。

---

## 7. BuzzIt 担当者が特に見るポイント

- [ ] `https://shigotoku.com/buzzit/` がサイトマップに含まれている（`deploy/build.mjs` で自動生成）
- [ ] LP 更新後に `cd deploy && npm run deploy:web`（または `deploy:buzzit`）で本番反映
- [ ] デプロイ後、必要なら URL 検査で `/buzzit/` のインデックス登録をリクエスト
- [ ] **アプリ**（`app.buzzit.shigotoku.com`）は検索に載せない設計（`noindex, nofollow`）。GSC にアプリ URL が出ても優先度は低い

---

## 8. やらなくてよいこと

- メールが来るたびにサイトマップを再送信し続ける
- 未登録 URL すべてに毎日インデックス登録リクエスト
- 「未登録 = サイトがペナルティ」と判断する
- アプリの `/login` を無理にインデックスさせる

---

## 9. 定期メンテナンス（月 1 回）

- [ ] GSC → インデックス作成 → ページ（登録済み / 未登録の件数）
- [ ] GSC → エクスペリエンス（Core Web Vitals があれば確認）
- [ ] サイトマップの最終読み取り日
- [ ] BuzzIt LP デプロイ有無と `/buzzit/` のインデックス状態
- [ ] `startupbuilder` など旧 URL が残っていないか

---

## 10. コード変更が必要になる場合

| 症状 | 修正場所 |
|------|----------|
| サイトマップに URL を追加・削除 | `deploy/build.mjs` の `sitemapUrls` |
| robots の Allow/Disallow | 同上 `robots.txt` 生成部分 |
| canonical / OGP | `buzzit/landing-page/src/components/Seo.astro` 等 |
| LP の base URL | `buzzit/landing-page/astro.config.mjs`（`site` / `base`） |

変更後は `deploy` 経由で本番デプロイし、GSC で URL 検査 → 必要ならインデックス登録リクエスト。

---

## 11. 参考リンク

- [Google Search Console ヘルプ – インデックス登録](https://support.google.com/webmasters/answer/7440203)
- [リダイレクトと Google 検索](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- 社内: [`docs/SEO-MARKETING.md`](../../docs/SEO-MARKETING.md)
