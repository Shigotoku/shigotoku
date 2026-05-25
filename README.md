# シゴトク（Shigotoku）

株式会社シゴトクのプロダクト群をまとめたリポジトリです。

## フォルダ構成

| フォルダ | プロダクト | 説明 | 技術スタック |
|---------|-----------|------|-------------|
| [`corporate-site/`](./corporate-site/) | シゴトク ホームページ | コーポレートサイト | Astro |
| [`runwith/landing-page/`](./runwith/landing-page/) | ランウィズ | ランディングページ | Astro |
| [`runwith/app/`](./runwith/app/) | ランウィズ | Webアプリ | React + Vite |
| [`buzzit/landing-page/`](./buzzit/landing-page/) | バジット（BuzzIt） | ランディングページ | Astro |
| [`buzzit/app/`](./buzzit/app/) | バジット（BuzzIt） | Webアプリ | React + Vite |

## 開発の起動方法

```bash
# シゴトク ホームページ
cd corporate-site && npm install && npm run dev

# ランウィズ ランディングページ
cd runwith/landing-page && npm install && npm run dev

# ランウィズ アプリ
cd runwith/app && npm install && npm run dev

# バジット ランディングページ
cd buzzit/landing-page && npm install && npm run dev

# バジット アプリ
cd buzzit/app && npm install && npm run dev
```

## 本番 URL 構成

| URL | 内容 |
|-----|------|
| `shigotoku.com/` | コーポレートサイト |
| `shigotoku.com/runwith/` | ランウィズ LP |
| `shigotoku.com/buzzit/` | バジット LP |
| `app.runwith.shigotoku.com` | ランウィズ アプリ |
| `app.buzzit.shigotoku.com` | バジット アプリ |

詳細な進捗は [`docs/DEPLOY-STATUS.md`](./docs/DEPLOY-STATUS.md) を参照してください。

## デプロイ（GCP / Firebase）

統合ビルドと Firebase Hosting 設定は [`deploy/`](./deploy/) にあります。

```bash
cd deploy
npm install
npm run build          # 全プロジェクトをビルド
npm run deploy:all     # Firebase へデプロイ
```

詳細は [`docs/GCP-DEPLOY.md`](./docs/GCP-DEPLOY.md) を参照してください。

- [GitHub 設定・CI デプロイ](./docs/GITHUB-SETUP.md)
- [SEO・マーケティング](./docs/SEO-MARKETING.md)

## 補足

- **バジット**のプロダクト名は **BuzzIt** です。
- **ランウィズ**の DB マイグレーション（参考用）は [`runwith/supabase/`](./runwith/supabase/) にあります。Supabase は本番未使用（デモモード）。
