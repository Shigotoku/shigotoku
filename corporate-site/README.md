# シゴトク コーポレートサイト

株式会社シゴトクの公式ホームページ（Astro）です。

## 開発

```bash
npm install
npm run dev
```

http://localhost:4321 で起動します。

## 環境変数

`.env.example` を `.env` にコピーして、プロダクト URL を設定してください。

```
PUBLIC_RUNWITH_LP_URL=/runwith/
PUBLIC_RUNWITH_APP_URL=https://app.runwith.shigotoku.com
```

## 推奨 URL 構成

| URL | 用途 |
|-----|------|
| `shigotoku.com/` | コーポレートサイト（このプロジェクト） |
| `shigotoku.com/runwith/` | ランウィズ LP |
| `shigotoku.com/runwith/pricing/` | ランウィズ 料金 |
| `app.runwith.shigotoku.com` | ランウィズ アプリ |
| `shigotoku.com/buzzit/` | バジット LP |
| `app.buzzit.shigotoku.com` | バジット アプリ |

## 主なページ

- `/` トップページ
- `/privacy` プライバシーポリシー
- `/terms` 利用規約
- `/tokushoho` 特定商取引法
- `/security` 情報セキュリティ方針
