# SEO・マーケティング設定

## 実装済み

| 項目 | 内容 |
|------|------|
| `sitemap.xml` | `deploy/build.mjs` で生成 → `https://shigotoku.com/sitemap.xml` |
| `robots.txt` | クロール許可 + サイトマップ URL |
| OGP / Twitter Card | 各 LP・コーポレートの Layout |
| 構造化データ | Organization（コーポレート）、SoftwareApplication（各 LP） |
| canonical URL | 各ページに設定 |
| ランウィズ LP | 導入事例・FAQ セクション |
| BuzzIt LP | Before/After・Instagram×LINE 訴求セクション |
| GA4 基盤 | `PUBLIC_GA_MEASUREMENT_ID` 設定時に全公開サイトへタグ出力 |

## Google Search Console

1. [Google Search Console](https://search.google.com/search-console) を開く
2. **プロパティを追加** → `https://shigotoku.com`
3. DNS または HTML ファイルで所有権確認
4. **サイトマップ** → `https://shigotoku.com/sitemap.xml` を送信

## マーケティング導線

| 導線 | 実装 |
|------|------|
| コーポレート → ランウィズ LP | `/runwith/` |
| コーポレート → BuzzIt LP | `/buzzit/` |
| LP → アプリ | `app.runwith` / `app.buzzit` の `/login` |
| アプリ → LP | ヘッダー・サイドバーに「サービスサイトへ」リンク |
| BuzzIt `/login` | デモダッシュボードへの CTA |

## お問い合わせ（Formspree → 保留）

Formspree の代わりに、**自社リード管理アプリ**への連携を予定しています。  
準備が整い次第、`corporate-site/src/components/ContactSection.astro` を更新します。

## Google Analytics 4

1. [Google Analytics](https://analytics.google.com/) でプロパティを作成
2. 測定 ID（`G-XXXXXXXXXX`）を取得
3. 以下のいずれかで設定:
   - **GitHub Actions:** Secrets に `PUBLIC_GA_MEASUREMENT_ID` を登録
   - **ローカルデプロイ:** 環境変数 `PUBLIC_GA_MEASUREMENT_ID=G-...` を指定して `npm run deploy:all --prefix deploy`

## 今後の拡張（任意）

- 導入事例の実データ差し替え（ランウィズ・BuzzIt）
- LP 用 OG 画像（1200×630）のデザイン
- ブログ / コンテンツマーケ（中長期 SEO）

## プロダクト名

- **BuzzIt**（バジット）— SNS運用・売上トラッキングOS
- 旧称 BuzzPilot は使用しません（内部企画ドキュメント除く）
