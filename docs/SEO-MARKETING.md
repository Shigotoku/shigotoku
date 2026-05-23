# SEO・マーケティング設定

## 実装済み

| 項目 | 内容 |
|------|------|
| `sitemap.xml` | `deploy/build.mjs` で生成 → `https://shigotoku.com/sitemap.xml` |
| `robots.txt` | クロール許可 + サイトマップ URL |
| OGP / Twitter Card | 各 LP・コーポレートの Layout |
| 構造化データ | Organization（コーポレート）、SoftwareApplication（各 LP） |
| canonical URL | 各ページに設定 |

## Google Search Console 登録（手動）

1. [Google Search Console](https://search.google.com/search-console) を開く
2. **プロパティを追加** → `https://shigotoku.com`
3. DNS または HTML ファイルで所有権確認
4. **サイトマップ** → `https://shigotoku.com/sitemap.xml` を送信

## マーケティング導線

| 導線 | 実装 |
|------|------|
| コーポレート → ランウィズ LP | `/runwith/` |
| コーポレート → バジット LP | `/buzzit/` |
| LP → アプリ | `app.runwith` / `app.buzzit` の `/login` |
| アプリ → LP | ヘッダー・サイドバーに「サービスサイトへ」リンク |
| バジット `/login` | デモダッシュボードへの CTA |

## Formspree（お問い合わせ・任意）

無料プラン: **月50件まで**・フォーム1つ（小規模サイト向け）。

1. [Formspree](https://formspree.io/) でアカウント作成
2. フォーム ID を `corporate-site/src/components/ContactSection.astro` に設定
3. `npm run deploy:web --prefix deploy`

## 今後の拡張（任意）

- Google Analytics 4
- 導入事例・ブログ（SEO コンテンツ）
- LP 用 OG 画像（1200×630）のデザイン
