# レイジット (RaiseIt)(raiseit)GCP 構成・運用手順

他アプリ(ShapeIt / DeckIt 等)と同じ型で運用する: `deploy/` に Firebase 設定・ルール・デプロイスクリプトを置き、`gcloud` / `firebase` で冪等にデプロイする。

| 項目 | 内容 |
|------|------|
| 最終更新 | 2026-10-25 |
| GCP プロジェクト | `shigotoku-raiseit-prod`(番号 973742525375。他アプリと同じ `meditoku.jp@gmail.com`、課金先 `01842B-66EA51-A38CBC`)。`deploy/.firebaserc` の別名は `raiseit` |
| リージョン | `asia-northeast1`(東京) |
| 最初の顧客(テナント) | `meditoku`(メディトク。サイト `meditoku` = `sc-domain:meditoku.com` / GA4 `538602599`) |
| コード | `raiseit/`(ソース)、`deploy/`(デプロイ設定) |

> 会社設立後は shigotoku.com ごと新会社へ引き継ぐ予定(`meditoku.jp@gmail.com` も新会社のアカウントへ切替)。外販前に課金・組織を新会社へ移す。移管手順は `raiseit/docs/別会社への移管チェックリスト.md`)。プロジェクト ID は `RAISEIT_PROJECT` で差し替え可能。

## 構成

| 役割 | ローカル(旧) | GCP(現在) |
|------|---------------|-------------|
| 日次実行 | Windows タスクスケジューラ | Cloud Scheduler(毎日 04:00 JST)→ Cloud Run Job `raiseit-daily` |
| 分析データ(ndjson)・レポート | `data/` `reports/` | Cloud Storage `gs://shigotoku-raiseit-prod-data/tenants/<tenant>/<site>/{data,reports}/` |
| テナント・サイト設定・実行履歴・承認・監査 | `config/sites.json` | Firestore `raiseit_organizations/{tenant}/{members,sites,runs,proposals,auditLogs}` |
| 認証(Google API) | ADC | ジョブ専用 SA `raiseit-reader`(鍵なし)。**Search Console(`sc-domain:meditoku.com`)と GA4(`538602599`)に `raiseit-reader@shigotoku-raiseit-prod.iam.gserviceaccount.com` を閲覧者として追加する必要あり**(追加するまで取得は 403) |
| イメージ | - | Artifact Registry `raiseit/raiseit-job`(Cloud Build でビルド) |

ジョブの流れ: Firestore から対象サイト取得 → GCS から過去データを一時領域へ → 既存の `fetch-*` / `analyze` スクリプトをそのまま実行(`DATA_ROOT` / `REPORT_ROOT` で保存先を切替)→ 更新分だけ GCS へアップロード → 実行結果を `runs` に記録。

## テナント分離

- すべての保存先に `tenant` を含める(GCS のパス、Firestore の `raiseit_organizations/{tenant}`)。
- クライアント(ブラウザ)からの書き込みは Firestore ルールで全面禁止。書き込みはサーバー(Admin SDK)のみ。GCS バケットは公開アクセス防止+IAM のみ(クライアント用ルールなし)。
- 読み取りは `members/{uid}` がある組織のみ(`firestore.raiseit.rules`)。

## デプロイ

```powershell
cd deploy
npm run deploy:raiseit-job     # API有効化・Firestore・バケット・イメージ・Job・Scheduler(冪等)
npm run deploy:raiseit-rules   # Firestore ルール+インデックス(gcloud ログインのみ。firebase login 不要)
node scripts/deploy-raiseit-job.mjs --image   # コード変更後はイメージ再ビルド+Job更新のみ
```

テナントの登録/更新(メディトクを 1 ユーザーとして登録):

```powershell
cd raiseit
gcloud auth application-default login
npm run seed:tenant
```

## 運用

```powershell
# 手動実行
gcloud run jobs execute raiseit-daily --region asia-northeast1 --project shigotoku-raiseit-prod --wait
# 過去分のバックフィル(GSC は16か月まで)
gcloud run jobs execute raiseit-daily --region asia-northeast1 --project shigotoku-raiseit-prod --update-env-vars JOB_DAYS=480 --async
# ログ
gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="raiseit-daily"' --project shigotoku-raiseit-prod --limit 50
# データの取り出し
gcloud storage cp -r gs://shigotoku-raiseit-prod-data/tenants/meditoku/meditoku/reports ./reports-meditoku
```

> `execute` に付けた `--update-env-vars` はその実行だけの上書きで、Job 本体の設定(`JOB_DAYS=7`)は変わらない。

## サイト(顧客)の追加

Firestore の `raiseit_organizations/{tenant}/sites/{siteId}` に `gscSite` / `ga4PropertyId` / `industry` / `active` を追加し、そのサイトの GSC・GA4 に `raiseit-reader@shigotoku-raiseit-prod.iam.gserviceaccount.com` を閲覧者として追加する。

## 未実施(次のロードマップ)

- [ ] 認証(Firebase Authentication)と管理画面(`members` の紐づけ、承認 UI)
- [ ] 顧客の Google OAuth 連携(外販時)
- [ ] Secret Manager への移行(PSI_API_KEY 等。現在 PSI は未設定のため毎週月曜の取得はスキップ)
- [ ] 承認済み AI 提案の Git PR 化

## 経緯メモ

- 2026-10-25 旧 meditoku-attract-works(meditoku.com 側)で試作 → 他アプリと同じ命名の shigotoku-raiseit-prod へ移行。データ(GCS)はコピー済み。
- 課金先の紐付け上限(5件)のため、ClipIt(shigotoku-clipit-prod-ad9ee)の課金を外した。ClipIt の API は課金なしでは動かない可能性がある。上限引き上げ申請の承認後に紐付け直す。

## アプリ(Cloud Run service raiseit-app)

- 構成: raiseit/server(Express + Firebase ID トークン認証) + raiseit/app(Vite React)。デプロイは deploy で npm run deploy:raiseit-app。
- 認証: Identity Platform のメール/パスワード。初回オーナー(OWNER_EMAILS)は初回ログイン時に members へ自動登録。Google ログインは OAuth クライアント作成が必要なため未設定。
- 公開 URL: https://raiseit-app-faaccunfca-an.a.run.app(allUsers invoker は meditoku.jp@gmail.com で付与。認可はアプリ側 members で実施)。
