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

## このフォルダだけ別 GitHub アカウントを使う

他プロジェクトと GitHub アカウントを分けている場合、このリポジトリは **ローカル設定** で push 先アカウントを固定できます（グローバル設定は変更しません）。

### すでに設定済み（このリポジトリ）

```bash
git config --local credential.https://github.com.helper manager
git config --local credential.useHttpPath true
```

- グローバルの `gh auth git-credential` ではなく、**Windows 資格情報マネージャー**を使います
- `useHttpPath` により、リポジトリ URL ごとに資格情報を保存します（他プロジェクトと混ざりません）

### 初回 push 手順

1. **Shigotoku 用 GitHub ユーザー名**を remote URL に含める（例: `ShigotokuUser`）

```bash
git remote set-url origin https://ShigotokuUser@github.com/Shigotoku/shigotoku.git
```

2. push する（ブラウザで Shigotoku 用アカウントにログイン）

```bash
git push -u origin main
```

3. コミット作者も分けたい場合（任意）

```bash
git config --local user.name "表示名"
git config --local user.email "shigotoku用メール@example.com"
```

### SSH で分ける場合（上級者向け）

HTTPS の代わりに SSH キーをリポジトリごとに使う方法もあります。`~/.ssh/config` に Host を追加し、このリポジトリだけ `git@github-shigotoku:Shigotoku/shigotoku.git` に変更します。

### トラブル時

403 が出る場合:

1. 「資格情報マネージャー」→ `git:https://github.com/Shigotoku/shigotoku.git` を削除
2. 上記の remote URL（正しいユーザー名付き）を再設定
3. もう一度 `git push`

## GitHub Actions 自動デプロイ

`main` ブランチへの push で Firebase Hosting へ自動デプロイされます。

### 初回セットアップ（自動）

PowerShell で以下を実行すると、Firebase トークン取得 → GitHub Secret 登録 → ワークフロー再実行まで行います。

```powershell
cd deploy\scripts
powershell -ExecutionPolicy Bypass -File .\setup-github-actions.ps1
```

> ブラウザが2回開きます（Firebase ログイン、必要に応じて GitHub 認証）。

### 手動セットアップ

#### 1. Firebase トークンを取得

```bash
cd deploy
npx firebase login:ci
```

表示されたトークン（`1//...` で始まる文字列）をコピーします。

#### 2. GitHub Secrets に登録

1. [GitHub リポジトリ → Settings → Secrets and variables → Actions](https://github.com/Shigotoku/shigotoku/settings/secrets/actions)
2. **New repository secret**
3. Name: `FIREBASE_TOKEN`
4. Value: 上記トークン

### 動作確認

```bash
git push origin main
```

[Actions タブ](https://github.com/Shigotoku/shigotoku/actions) でワークフローが成功することを確認してください。失敗した場合は **Re-run jobs** で再実行できます。

## 手動デプロイ（ローカル）

```bash
cd deploy
npm run deploy:all
```
