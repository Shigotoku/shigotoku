# デプロイ運用改善（2026-07）

今回 `/runwith/` `/buzzit/` が 404 になった原因と、再発防止のための改善方針。

## 今回起きたこと

| 問題 | 原因 |
|------|------|
| LP が 404 | `deploy:clipit-web` が ClipIt のみアップロードし、Hosting 上の他パスが削除された |
| CI が何度も失敗 | `FIREBASE_TOKEN` 期限切れ → 再発行が必要 |
| トークン更新後も失敗 | `deploy:buzzit` が `buzzit-app` までデプロイしようとしたが `dist/buzzit-app` 未ビルド |

## 実施済みの修正

1. **`build-clipit-web.mjs`** … runwith / buzzit / clipit の LP を常に含める
2. **`verify-web-dist.mjs`** … デプロイ前に `dist/web` の必須ファイルを検証
3. **`deploy:clipit-web`** … `shigotoku-web`（Hosting）のみデプロイ

## 推奨フロー（今後）

### 通常（LP・コーポレート変更）

```
main に merge → GitHub Actions 自動デプロイ
```

手動の場合:

```powershell
cd deploy
npm run deploy:clipit-web
```

### アプリ本体（BuzzIt / RunWith / ClipIt app）

Hosting ターゲットが別なので、**web デプロイと混ぜない**:

```powershell
npm run deploy:buzzit-app    # shigotoku-prod / buzzit-app
npm run deploy:runwith-app   # shigotoku-runwith-prod
npm run deploy:clipit-app    # shigotoku-clipit-prod
```

### Firebase トークン（CI）

| コマンド | 用途 |
|---------|------|
| `firebase login` | ローカル手動デプロイ（トークン表示なし） |
| `firebase login:ci` | GitHub Actions 用（`1//...` が表示される） |

**2〜3 ヶ月ごと**、または CI が auth エラーになったら `setup-github-actions.ps1` を再実行。

```powershell
cd deploy\scripts
powershell -ExecutionPolicy Bypass -File .\setup-github-actions.ps1
```

## 中期的な改善（TODO）

### 1. CI を用途別に分割（優先度高）

| Workflow | トリガー | 内容 |
|----------|---------|------|
| `deploy-web.yml` | `corporate-site/**`, `*/landing-page/**`, `deploy/**` | `deploy:clipit-web` のみ（約 2 分） |
| `deploy-apps.yml` | `*/app/**` | 各アプリ Hosting |
| `deploy-api.yml` | `*/api/**` | Functions + rules |

→ LP 修正のたびに全プロダクトをビルド・デプロイしない。

### 2. 認証を Service Account に移行（優先度中）

`FIREBASE_TOKEN` は非推奨。GCP サービスアカウント JSON を  
`GOOGLE_APPLICATION_CREDENTIALS` として GitHub Secret に保存する方式へ移行  
（期限切れがなくなり、権限も最小化しやすい）。

### 3. スクリプト名の整理（優先度低）

`build-clipit-web.mjs` → `build-shigotoku-web.mjs` にリネーム  
（ClipIt 専用に見える名前が混乱の元だった）。

### 4. main への merge ルール

- LP / コーポレート変更は `deploy/` 修正とセットで PR レビュー
- **`deploy:corporate-web` / `deploy:clipit-web` は常に全 LP を含む**（部分デプロイ禁止）

## チェックリスト（デプロイ後）

- [ ] https://shigotoku.com/runwith/ → 200
- [ ] https://shigotoku.com/buzzit/ → 200
- [ ] https://shigotoku.com/clipit/ → 200
- [ ] https://shigotoku.com/sitemap.xml → 200
