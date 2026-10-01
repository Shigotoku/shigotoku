# Git チーム開発ガイド — ランウィズ / バジット担当者向け

**対象:** これまで 1 人で管理していた `Shigotoku/shigotoku` モノレポを、  
ランウィズ担当・バジット担当が加わって開発する際の Git / GitHub 運用方針

| 項目 | 内容 |
|------|------|
| 最終更新 | 2026-06-03 |
| リポジトリ | https://github.com/Shigotoku/shigotoku |
| 現状 | 1 アカウント・1 リポジトリ・モノレポ構成 |

---

## 目次

1. [結論（推奨方針）](#1-結論推奨方針)
2. [リポジトリ分割 vs モノレポ維持](#2-リポジトリ分割-vs-モノレポ維持)
3. [GitHub アカウント・権限設計](#3-github-アカウント権限設計)
4. [フォルダと担当範囲](#4-フォルダと担当範囲)
5. [ブランチ戦略](#5-ブランチ戦略)
6. [Pull Request の流れ](#6-pull-request-の流れ)
7. [CODEOWNERS（自動レビュー依頼）](#7-codeowners自動レビュー依頼)
8. [main ブランチの保護](#8-main-ブランチの保護)
9. [コミットメッセージのルール](#9-コミットメッセージのルール)
10. [CI/CD（自動デプロイ）との関係](#10-cicd自動デプロイとの関係)
11. [担当者の初回セットアップ](#11-担当者の初回セットアップ)
12. [オーナー（あなた）がやることチェックリスト](#12-オーナーあなたがやることチェックリスト)
13. [よくあるトラブルと対処](#13-よくあるトラブルと対処)
14. [将来リポジトリを分ける場合](#14-将来リポジトリを分ける場合)

---

## 1. 結論（推奨方針）

**今の段階では、リポジトリは分けずモノレポのまま運用することを推奨します。**

理由:

- `deploy/` が全プロダクトのビルド・Firebase デプロイを一元管理している
- `shigotoku.com` 1 ドメイン配下にコーポレート・RunWith LP・BuzzIt LP が同居している
- GitHub Actions が `main` への merge で **両 Firebase プロジェクト**へ一括デプロイする設計
- 横断ドキュメント（`docs/`, `シゴトク_プロダクト全体仕様書.md`）がある

代わりに、以下で **担当範囲を Git 上で分離** します。

| 施策 | 目的 |
|------|------|
| **ブランチ + Pull Request** | `main` への直接 push を止める |
| **CODEOWNERS** | 変更フォルダに応じて自動でレビュアーを割り当て |
| **GitHub チーム / Collaborator** | 権限を最小限に |
| **ブランチ命名規則** | `runwith/` `buzzit/` プレフィックスで衝突を減らす |
| **main ブランチ保護** | レビュー必須・CI 成功必須 |

```
┌─────────────────────────────────────────────────────────┐
│  Shigotoku/shigotoku（モノレポ・維持）                    │
│                                                         │
│  runwith/**  ← ランウィズ担当が PR で変更                │
│  buzzit/**   ← バジット担当が PR で変更                  │
│  corporate-site/** , deploy/** , docs/**  ← オーナー中心 │
│                                                         │
│  main ──merge──► GitHub Actions ──► Firebase 本番       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. リポジトリ分割 vs モノレポ維持

### 2.1 比較

| 観点 | モノレポ維持（推奨） | リポジトリ 3 分割 |
|------|---------------------|------------------|
| デプロイ | 既存 `deploy/` がそのまま使える | 統合ビルドの再設計が必要 |
| 権限分離 | CODEOWNERS + ブランチ保護で十分 | リポジトリ単位で完全分離 |
| コーポレートサイト | 1 PR で LP リンク更新可能 | 複数 repo 横断の調整が必要 |
| 担当者の学習コスト | 低い（clone 1 回） | 中（複数 clone / submodule） |
| CI コスト | path filter で最適化可能 | 各 repo 独立 |
| 向いている規模 | 担当 2〜5 名 | 完全に独立したチーム・別会社 |

### 2.2 判断基準

**モノレポを続ける:** デプロイ共有・ドメイン共有・人数が少ない（現状）

**分割を検討する:** 担当者が別法人、デプロイも完全独立、RunWith と BuzzIt で release サイクルが全く異なる

---

## 3. GitHub アカウント・権限設計

### 3.1 推奨: Organization + チーム

リポジトリが `Shigotoku/shigotoku`（Organization）配下にある場合:

| GitHub チーム | メンバー | リポジトリ権限 |
|--------------|---------|---------------|
| **Owners**（あなた） | 代表 | Admin |
| **runwith-devs** | ランウィズ担当 | Write |
| **buzzit-devs** | バジット担当 | Write |

> **Write** で十分です。Settings 変更・Secret 管理は Admin（あなた）のみ。

### 3.2 個人リポジトリの場合

Organization が使えない場合は **Collaborator** として招待:

1. GitHub → リポジトリ → **Settings → Collaborators**
2. 担当者の GitHub アカウントを **Write** で追加

### 3.3 やってはいけないこと

- 代表アカウントのパスワード / PAT を担当者に共有する
- `FIREBASE_TOKEN` 等の Secret をチャットで送る（GitHub Secrets のみ）
- 全員に Admin 権限を付与する

各担当者は **自分の GitHub アカウント** で clone / push / PR を作成します。

---

## 4. フォルダと担当範囲

| パス | 主担当 | 備考 |
|------|--------|------|
| `runwith/` | ランウィズ担当 | app, landing-page, docs |
| `buzzit/` | バジット担当 | app, api, landing-page, docs |
| `corporate-site/` | オーナー | 両プロダクトへの導線。変更時は両担当に共有 |
| `deploy/` | オーナー | デプロイ設定。変更は要相談・要レビュー |
| `docs/` | オーナー + 各担当 | 横断 doc はオーナー、製品固有は各 `*/docs/` |
| `.github/workflows/` | オーナー | CI/CD |
| `シゴトク_プロダクト全体仕様書.md` | オーナー | 大きな構成変更時に更新 |

**越境変更**（例: BuzzIt 担当が `deploy/build.mjs` を触る）は PR 説明に理由を書き、オーナーのレビューを必須にします。

---

## 5. ブランチ戦略

### 5.1 基本ルール

| ブランチ | 役割 |
|---------|------|
| `main` | 本番。常にデプロイ可能な状態。**直接 push しない** |
| `runwith/機能名` | ランウィズの機能開発 |
| `buzzit/機能名` | バジットの機能開発 |
| `chore/内容` | 依存関係更新・ドキュメントのみ（オーナー中心） |
| `r.tokunaga-YYYY-MM-DD` | **徳永（オーナー）** の作業用。push した日付でブランチを切る |

### 5.2 命名例

```
runwith/team-invite-fix
runwith/pricing-lp-update
buzzit/line-crm-segment
buzzit/store-billing-ui
chore/update-firebase-tools
r.tokunaga-2026-06-03    # オーナー: clipit 新規・deploy・corporate など横断変更
```

**オーナー（r.tokunaga / 徳永）の push ルール**

- `clipit/`、`deploy/`、`corporate-site/`、`docs/` など **横断変更** は、担当者向けの `runwith/` `buzzit/` とは別に、**必ず `r.tokunaga-日付` ブランチ** から PR する
- ブランチ名の日付は **その日 push する日**（例: 2026-06-03）
- 同じ日に2回目以降 push する場合は `r.tokunaga-2026-06-03-2` のように連番を付けてもよい

### 5.3 作業の流れ（担当者）

```bash
# 最新を取得
git checkout main
git pull origin main

# 作業ブランチ作成
git checkout -b buzzit/line-tag-filter

# 開発・コミット（buzzit/ 以下だけ触るのが理想）
git add buzzit/
git commit -m "feat(buzzit): add tag filter to LINE CRM"

# リモートへ push
git push -u origin buzzit/line-tag-filter

# GitHub 上で Pull Request を作成 → main へ
```

---

## 6. Pull Request の流れ

```
担当者:  feature ブランチで開発
    ↓
担当者:  push → Pull Request 作成（main がマージ先）
    ↓
GitHub:  CODEOWNERS により自動でレビュアーアサイン
    ↓
レビュアー: コード確認（オーナー or 製品オーナー）
    ↓
GitHub Actions: ビルド・デプロイワークフロー（main merge 時）
    ↓
オーナー:  Approve → Merge
    ↓
main:  自動デプロイ → 本番反映
```

### PR テンプレート（推奨内容）

```markdown
## 概要
（何を・なぜ変更したか）

## 変更範囲
- [ ] runwith/
- [ ] buzzit/
- [ ] deploy/ （触った場合は理由を記載）
- [ ] その他

## テスト
- [ ] ローカルで npm run dev 確認
- [ ] npm run build 成功

## デプロイ影響
- [ ] RunWith 本番に影響あり
- [ ] BuzzIt 本番に影響あり
- [ ] 影響なし（docs のみ等）
```

GitHub → **Settings → General → Pull Request templates** で `.github/pull_request_template.md` を置くと便利です。

---

## 7. CODEOWNERS（自動レビュー依頼）

リポジトリ直下に `.github/CODEOWNERS` を置くと、PR 時に自動でレビュー依頼が飛びます。

**例**（GitHub ユーザー名は実際のものに置き換え）:

```
# デフォルト（オーナーが最終確認）
*                       @Shigotoku/tokun

# ランウィズ
/runwith/               @Shigotoku/runwith-lead

# バジット
/buzzit/                @Shigotoku/buzzit-lead

# インフラ・CI（オーナーのみ）
/deploy/                @Shigotoku/tokun
/.github/               @Shigotoku/tokun
/corporate-site/        @Shigotoku/tokun
```

> チームを使う場合: `@Shigotoku/runwith-devs` のように **Team スラッグ** も指定可能です。

---

## 8. main ブランチの保護

GitHub → **Settings → Branches → Branch protection rules → Add rule**

| 設定 | 推奨 |
|------|------|
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ ON |
| Required approvals | **1**（最初は 1 名で十分） |
| Require review from Code Owners | ✅ ON（CODEOWNERS 設定後） |
| Require status checks to pass | ✅ ON（Actions 設定後） |
| Do not allow bypassing | ✅ ON（Admin も含めるとより安全） |
| Restrict who can push | オーナーのみ（任意） |

これにより **担当者が main に直接 push して本番を壊す** リスクを下げられます。

---

## 9. コミットメッセージのルール

既存リポジトリの慣習に合わせ、**プレフィックスで製品を明示** します。

```
feat(buzzit): 店舗課金 UI を設定画面に追加
fix(runwith): 招待リンクの有効期限表示を修正
docs: 全体仕様書に API 一覧を追記
chore(deploy): firebase-tools を更新
```

| プレフィックス | 用途 |
|---------------|------|
| `feat(buzzit)` / `feat(runwith)` | 新機能 |
| `fix(buzzit)` / `fix(runwith)` | バグ修正 |
| `docs` | ドキュメントのみ |
| `chore(deploy)` | ビルド・CI・依存関係 |

---

## 10. CI/CD（自動デプロイ）との関係

### 現状

- `main` への push / merge → `.github/workflows/deploy.yml` が実行
- `npm run deploy:all-with-api` → **RunWith + BuzzIt 両方**が本番デプロイ

### チーム化後の注意

| 状況 | 影響 |
|------|------|
| BuzzIt 担当の PR が merge された | RunWith も含め全体デプロイが走る |
| RunWith 担当の PR が merge された | BuzzIt API も含め全体デプロイが走る |

**対策（段階的）:**

1. **短期:** PR 説明で「デプロイ影響」を明記。merge はオーナーが確認してから Approve
2. **中期:** Actions に path filter を追加し、変更があったプロダクトだけデプロイ
3. **長期:** ステージング環境（Firebase 別プロジェクト）を用意

path filter の例（将来用）:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'buzzit/**'
      - 'deploy/**'
```

---

## 11. 担当者の初回セットアップ

### 11.1 共通

```bash
# 1. リポジトリを clone（自分の GitHub アカウントで認証）
git clone https://github.com/Shigotoku/shigotoku.git
cd shigotoku

# 2. 自分の名前・メール（コミット作者）
git config user.name "担当者の表示名"
git config user.email "担当者@example.com"

# 3. 担当フォルダの依存関係
# ランウィズ担当の例:
cd runwith/app && npm install
cd ../landing-page && npm install

# バジット担当の例:
cd buzzit/app && npm install
cd ../landing-page && npm install
cd ../api && npm install
```

### 11.2 ローカル開発

| 担当 | 起動コマンド |
|------|-------------|
| ランウィズ | `cd runwith/app && npm run dev` |
| バジット | `cd buzzit/app && npm run dev`（API は Emulator または本番 `/api`） |

詳細: [`README.md`](../README.md)、[`シゴトク_プロダクト全体仕様書.md`](../シゴトク_プロダクト全体仕様書.md)

### 11.3 本番デプロイ

**原則、担当者はローカルから `firebase deploy` しない。**

本番反映は **main への merge → GitHub Actions** に統一します。

緊急時のみオーナーが `cd deploy && npm run deploy:runwith` 等を実行。

---

## 12. オーナー（あなた）がやることチェックリスト

- [ ] ランウィズ担当・バジット担当を GitHub Collaborator または Organization Team に追加
- [ ] `.github/CODEOWNERS` を作成（GitHub ユーザー名を実名に更新）
- [ ] `main` ブランチ保護ルールを有効化
- [ ] `.github/pull_request_template.md` を追加（任意）
- [ ] 担当者に「担当フォルダ」「PR 必須」「main 直接 push 禁止」を共有
- [ ] [`docs/GITHUB-SETUP.md`](./GITHUB-SETUP.md) の Actions Secret（`FIREBASE_TOKEN`）が有効か確認
- [ ] 全体仕様書・各 `BILLING-RULES.md` を担当者に読ませる

---

## 13. よくあるトラブルと対処

| 問題 | 対処 |
|------|------|
| push できない（403） | 自分のアカウントが Collaborator に追加されているか確認。別アカウントの credential が残っていないか確認（[`GITHUB-SETUP.md`](./GITHUB-SETUP.md) 参照） |
| main に直接 push してしまった | 以降 PR 運用へ。ブランチ保護を早めに有効化 |
| コンフリクト | `git checkout main && git pull` 後、作業ブランチで `git merge main` して解消 |
| 他人のフォルダを誤って変更 | PR で Revert。CODEOWNERS でレビュー漏れを防ぐ |
| merge 後に本番が壊れた | GitHub で該当 commit を Revert PR → merge → 再デプロイ |
| Actions が失敗 | [Actions タブ](https://github.com/Shigotoku/shigotoku/actions) でログ確認。`FIREBASE_TOKEN` 期限切れなら再発行 |

**禁止事項（全員）:**

- `git push --force` を `main` に対して実行しない
- `.env` や API キーをコミットしない
- 代表アカウントの credential を共有しない

---

## 14. 将来リポジトリを分ける場合

チームが大きくなりモノレポが合わなくなった場合の分割案:

| 新リポジトリ | 内容 |
|-------------|------|
| `shigotoku-web` | corporate-site + deploy/dist/web 生成 |
| `shigotoku-runwith` | runwith/* + runwith 用 deploy |
| `shigotoku-buzzit` | buzzit/* + buzzit 用 deploy + API |

分割時に必要な作業:

- `deploy/build.mjs` の分離またはパッケージ化
- GitHub Actions の複数 workflow 化
- カスタムドメイン・Firebase プロジェクトの再マッピング
- ドキュメントの所在整理

**今は不要。** 担当者 2 名規模ではモノレポ + PR 運用が最もコストが低いです。

---

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [`docs/GITHUB-SETUP.md`](./GITHUB-SETUP.md) | Actions Secret・初回 push・credential |
| [`docs/GCP-DEPLOY.md`](./GCP-DEPLOY.md) | Firebase 手動デプロイ |
| [`docs/FIREBASE-SPLIT.md`](./FIREBASE-SPLIT.md) | Firebase 2 プロジェクト構成 |
| [`シゴトク_プロダクト全体仕様書.md`](../シゴトク_プロダクト全体仕様書.md) | 技術スタック全体像 |

---

*質問・運用変更があれば、このファイルを更新してチームで共有してください。*
