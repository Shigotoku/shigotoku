# GitHub リポジトリ設定

リポジトリ: [github.com/Shigotoku/shigotoku](https://github.com/Shigotoku/shigotoku)

## 初回セットアップ（ローカル）

```bash
cd shigotoku
git init
git branch -M main
git remote add origin https://github.com/Shigotoku/shigotoku.git
git add .
git commit -m "Initial commit: Shigotoku monorepo"
git push -u origin main
```

> `buzzit/` 内にあったネストした `.git` は削除済みです（モノレポ構成のため）。

## GitHub Actions 自動デプロイ

`main` ブランチへの push で Firebase Hosting へ自動デプロイされます。

### 1. Firebase トークンを取得

```bash
cd deploy
npx firebase login:ci
```

表示されたトークンをコピーします。

### 2. GitHub Secrets に登録

1. [GitHub リポジトリ → Settings → Secrets and variables → Actions](https://github.com/Shigotoku/shigotoku/settings/secrets/actions)
2. **New repository secret**
3. Name: `FIREBASE_TOKEN`
4. Value: 上記トークン

### 3. 動作確認

```bash
git push origin main
```

[Actions タブ](https://github.com/Shigotoku/shigotoku/actions) でワークフローが成功することを確認してください。

## 手動デプロイ（ローカル）

```bash
cd deploy
npm run deploy:all
```
