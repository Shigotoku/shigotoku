# レイジット (RaiseIt) 引き継ぎメモ

作成日: 2026-10-27(PC 移行のためのメモ。ここまでの開発の全体像と、新 PC での再開手順)。
秘密情報(パスワード・API キー・トークン)はこのファイルに書いていません。

---

## 1. これは何か

SEO / GEO(AI検索) / MEO / UEO / SNS の **集患 SaaS**。コンセプトは「データで見つける → 安全に直す → 効果を測る」。

- いまの顧客(テナント)は **メディトク**(`tenant=meditoku`, `site=meditoku`)のみ。とくなが内科胃腸科外科クリニックは Phase 2 に延期。
- 評価の軸は PV や順位ではなく、**問い合わせ(リード = GA4 `generate_lead`)の件数**。
- 差別化(競合調査 `deep-research-report.md` / `集客・集患統合管理アプリ競合調査.md` より):
  成果基点の優先度付きアクションキュー(期待効果の幅・確度・所要時間・リスク・承認区分)/ 医療広告チェック / 人の承認を必須にする運用 /
  データ鮮度と「できないこと」の明示 / 施策の効果測定 / スマホでも30秒で承認できる画面。
- 方針書: `raiseit/.cursor/rules/raiseit.mdc`、`raiseit/HANDOVER.md`、`raiseit/docs/`(要件定義・競合調査・機能カタログ)。

## 2. 現在の本番環境

| 項目 | 値 |
|---|---|
| アプリ URL | https://raiseit-app-faaccunfca-an.a.run.app (ログイン必須・noindex) |
| GCP プロジェクト | `shigotoku-raiseit-prod`(番号 973742525375)/ リージョン `asia-northeast1` |
| 課金アカウント | `01842B-66EA51-A38CBC` |
| 操作できる Google アカウント | `meditoku.jp@gmail.com`(プロジェクト作成者・オーナー)/ `r.tokunaga@meditoku.com`(editor) |
| Cloud Run service | `raiseit-app`(Express + React。未認証アクセス許可、認可はアプリ側 members で実施) |
| Cloud Run Job | `raiseit-daily`(毎朝 4:00 JST、Cloud Scheduler 経由) |
| 実行 SA | `raiseit-reader@shigotoku-raiseit-prod.iam.gserviceaccount.com`(鍵なし。GSC「制限付き」/GA4「閲覧者」を付与済み) |
| Scheduler SA | `raiseit-scheduler@...` |
| データ置き場 | `gs://shigotoku-raiseit-prod-data/tenants/<tenant>/<site>/{data,reports}/` |
| Firestore | `raiseit_organizations/{tenant}/{members,sites,runs,proposals,auditLogs}` |
| Artifact Registry | `raiseit`(`raiseit-job` / `raiseit-app` イメージ) |
| 認証 | Firebase / Identity Platform の **メール+パスワード**(Google ログインは未設定) |
| Firebase Web アプリ | appId `1:973742525375:web:6598a25b2e2e3ee9476f0a`(公開前提の設定値は `raiseit/app/src/lib.ts`) |
| GSC / GA4 | `sc-domain:meditoku.com` / GA4 プロパティ `538602599` |

### 重要な事情
- **`shigotoku` 系の GCP は `meditoku.jp@gmail.com` のもの**。会社を設立したら、このアカウントを会社用に変更し、`shigotoku.com` と各アプリ(`shigotoku-*-prod`)を引き継ぐ予定。
- 旧プロジェクト `meditoku-attract-works` は削除済み(30日以内なら復元可能)。
- ClipIt の課金を一時的に外している(課金枠の増枠申請中)。**増枠が承認されたら ClipIt の課金を再リンクすること。**
- 独自ドメイン(例: `raiseit.shigotoku.com`)は**最後に実施**する方針。

## 3. 構成とコード

```
raiseit/
  scripts/                 取得・分析(.mjs。DATA_ROOT/REPORT_ROOT/SITES_FILE で保存先を差し替え可)
    fetch-search-console.mjs / fetch-ga4*.mjs / fetch-psi.mjs / fetch-site-audit.mjs / fetch-competitors.mjs
    engine/insights.mjs    判断エンジン(North Star・アクションキュー・効果測定・鮮度・限界)
    engine/detail.mjs      詳細データ(日次/検索語/ページ/流入元/端末/閲覧、検索意図の分類)
    engine/digest.mjs      週次ダイジェストメールの本文生成・送信(Resend)
    engine/build-summary.mjs  → reports/summary.json, detail.json, detail-7.json, detail-90.json
    medical-ad-check.mjs   医療広告の簡易チェック
    cloud/run-job.mjs      Cloud Run Job 本体(GCS ⇄ /tmp 同期 → 各スクリプト実行 → アップロード → runs 記録)
    cloud/seed-tenant.mjs  テナント/サイト/メンバーの初期登録
  server/index.mjs         アプリサーバー(Firebase ID トークン認証・API)
  app/                     React + Vite + Tailwind(モバイル優先)。ページ: 今月の結論/改善候補/流入・漏斗/詳細データ/競合/文案チェック/施策履歴/設定
  Dockerfile / Dockerfile.app
deploy/
  scripts/deploy-raiseit-job.mjs   インフラ + ジョブ(--infra / --image)
  scripts/deploy-raiseit-app.mjs   アプリのビルド+デプロイ(--no-build)
  scripts/deploy-raiseit-rules.mjs Firestore ルール(REST)
  scripts/setup-raiseit-mail.mjs   週次メールの有効化(Resend キーを Secret Manager へ)
  cloudbuild.raiseit*.yaml, firestore.raiseit.rules / indexes.json
docs/FIREBASE-RAISEIT-SETUP.md     セットアップ経緯メモ
```

日次ジョブの手順: `fetch-search-console → fetch-ga4 → fetch-ga4-sources → fetch-ga4-events → fetch-ga4-conversions →(月曜のみ PSI)→ fetch-site-audit → fetch-competitors(週次)→ analyze → build-summary` → 月曜 JST に週次メール(`RESEND_API_KEY` があれば)。

### 設計上の注意(ハマりどころ)
- **GSC のクエリ別データは匿名化クエリを含まず、クリックの約2〜3割しか見えない。** 判断はページ別合計(`gsc-page`)で行い、クエリは補助。
- GA4 の自然検索セッションが GSC クリックの約13〜17% しかない(**計測の欠け疑い**)。改善候補 `trk-gap` に出ている。
- 効果測定は前後14日の傾向であり、季節性や他施策は除いていない(画面に注記済み)。
- 医療広告・`canonical`・`noindex`・`robots` は**自動変更しない**。AI の出力は人が承認するまで何も変更しない。
- Express は v5(ワイルドカード `*` ルートは使えない)。
- Windows の `cmd` 経由で gcloud を呼ぶと `^` が壊れるため、環境変数は `--env-vars-file` で渡している。
- パスワード設定メールは Firebase 標準ハンドラが「page mode is invalid」になるため、**アプリ内 `/auth/action` で処理**している。メールテンプレートの URL は API では変更不可。ログイン画面の再設定ボタンは外してあり、**オーナーが設定画面の「メンバー」から同じメールアドレスを追加して再発行リンクを出す**運用。

## 4. 新 PC での再開手順

1. 必要ツール: Git、Node.js 22 以上、Google Cloud CLI(gcloud)、GitHub CLI(gh)。
2. リポジトリを取得: `git clone https://github.com/Shigotoku/shigotoku.git`、ブランチ `r.tokunaga-2026-10-25`(最新)をチェックアウト。
   - コミット作者はリポジトリ内で `徳永竜馬` に設定していた(`git config user.name / user.email`)。新 PC でも設定する。
   - **GitHub の push は `Shigotoku` アカウントで行う**(`meditoku` アカウントだと 403)。`gh auth login` で Shigotoku を使う。
3. gcloud ログイン: `gcloud auth login meditoku.jp@gmail.com`(および必要なら `r.tokunaga@meditoku.com`)。
   `gcloud config set account meditoku.jp@gmail.com` / `gcloud config set project shigotoku-raiseit-prod`。
4. 依存インストール: `raiseit/`、`raiseit/app/`、`deploy/` でそれぞれ `npm install`。
5. **Git に入っていないファイルを作り直す**(`.gitignore` 対象):
   - `raiseit/.env`: `GSC_SITE_URL=sc-domain:meditoku.com` / `GA4_PROPERTY_ID=538602599`
   - `raiseit/config/sites.json`: メディトク1件(id `meditoku`、name `メディトク`、industry `general`、gscSite `sc-domain:meditoku.com`、ga4PropertyId `538602599`)
   - ローカルで取得スクリプトを動かす場合の認証は、サービスアカウント `raiseit-reader` のなりすまし(`gcloud auth application-default login --impersonate-service-account=raiseit-reader@shigotoku-raiseit-prod.iam.gserviceaccount.com`。`meditoku.jp@gmail.com` に Token Creator を付与済み)。本番では不要。
6. 動作確認: `cd raiseit && npm test`(全17件)/ `cd raiseit/app && npm run build`。
7. デプロイ:
   - ジョブ: `cd deploy && node scripts/deploy-raiseit-job.mjs --image`
   - アプリ: `cd deploy && node scripts/deploy-raiseit-app.mjs`
   - ジョブの手動実行: `gcloud run jobs execute raiseit-daily --region asia-northeast1 --project shigotoku-raiseit-prod --wait`
     (過去分を取り直すときは `--update-env-vars JOB_DAYS=480`。週次メールの即時送信テストは `DIGEST_FORCE=1`)
8. ブランチ運用: **`main` へ直接 push しない**。ブランチ名は `r.tokunaga-YYYY-MM-DD`(同日2本目以降は `-2`)。詳細は `.cursor/rules/git-branch-r-tokunaga.mdc` と `docs/GIT-TEAM-WORKFLOW.md`。

## 5. アカウント・ログイン情報の扱い

- アプリのオーナー: `r.tokunaga@meditoku.com`。初期パスワードはこの PC の `%TEMP%\raiseit-initial-pw.txt` に保存していた(新 PC には移らない)。
  **パスワードは設定リンクで変更済みか確認し、PC 上のそのファイルは削除すること。** ログインできなければ、`meditoku.jp@gmail.com` の gcloud 権限で再発行リンクを作れる(Identity Toolkit の `accounts:sendOobCode` に `returnOobLink:true`。作成したリンクの `oobCode` を `https://raiseit-app-faaccunfca-an.a.run.app/auth/action?mode=resetPassword&oobCode=...` に付ける)。
- API キー・トークン・パスワードをコミットしない。顧客トークンは Secret Manager、分析データとは分離する。

## 6. 残りのタスク

### 人の作業(私=AI ではできないもの)
1. **GA4 で `generate_lead` を「キーイベントとしてマーク」する**(改善候補の最上位)。
2. **計測の乖離の確認**: GSC クリックに対して GA4 の自然検索セッションが極端に少ない。同意バナー(Cookie)の設定・GA4 タグの出力を確認。
3. **Resend の API キーを設定して週次メールを有効化**: `$env:RESEND_API_KEY="re_..."; cd deploy; npm run setup:raiseit-mail`。送信元ドメインを Resend で検証しておく(既定 `RaiseIt <notify@raiseit.shigotoku.com>`)。
4. **競合サイトを登録**: アプリの「競合」ページで名前と URL を追加(最大10件)。観測は翌朝から週1回。
5. 旧 `attract-works-reader` の権限行を GSC / GA4 の画面から手動で削除。
6. ClipIt の課金再リンク(課金枠の増枠承認後)。
7. 独自ドメインの設定(最後に)。

### 開発の候補
- Google ログイン(OAuth クライアント作成が必要)。
- Googleビジネスプロフィール(MEO)・SNS 連携(API 申請が前提)。
- 1つの素材 → 複数チャネル展開、ホワイトラベル化(Phase 3 以降)。
- とくなが内科胃腸科外科クリニックの追加(Phase 2。`industry: clinic` で医療広告ルールと構造化データ提案が有効になる)。
- 効果測定の精度向上(季節性補正など)、検索意図分類の改善。

## 7. この会話で作ったもの(時系列の要約)

1. `attract-works-handover.zip` を取り込み、メディトクだけを顧客として GCP に移行(Cloud Run Job + Scheduler + GCS + Firestore)。アプリ名を「レイジット (RaiseIt)」に変更し、他アプリと同じ `shigotoku-*-prod` 形式の専用プロジェクトへ移設。
2. GSC のクエリ別データの欠落に対応(ページ別合計を保存し、判断の基準に)。
3. 競合調査レポートを踏まえて判断エンジンを実装(成果基点・アクションキュー・効果測定・鮮度・限界)。
4. 管理アプリ(Cloud Run + Firebase 認証 + React)を公開し、メンバー管理(招待・権限変更)を追加。
5. 週次ダイジェストメール(Resend)、公開ページ監査(技術・医療広告の自動検出)を追加。
6. 画面を全幅化し、トップを1画面ダッシュボードに。詳細データ(6タブ・期間切替・CSV・検索意図分類・計測乖離の警告)、施策履歴の取り込みと記録フォームを追加。
7. 競合サイトの定点観測(週次・robots 遵守・登録画面)を追加。

## 8. リポジトリ直下の未コミットファイルについて

リポジトリ直下に、Git 管理されていないファイルがある(PC 移行時はフォルダごとコピーするか、必要なものだけ移す)。
`RaiseIt.png` / `attract-works-handover.zip` / `attract-works-meditoku-actions.zip` / `deep-research-report.md` / `集客・集患統合管理アプリ競合調査.md`。
`attract-works-meditoku-actions.zip` の施策履歴1件は、すでに本番へ取り込み済み(2026-10-25 トップページ高速化)。

## 9. 直近の最終コミット

ブランチ `r.tokunaga-2026-10-25`、最新コミット `85fc1b4`「レイジット: 競合サイトの定点観測(週次・robots遵守・登録画面)を追加」。
`main` へのマージは未実施(PR 経由で行う)。
