# レイジット (RaiseIt) 引き渡し手順書(受け取る会社向け)

## 0. 渡すもの

**`commercial/raiseit` フォルダだけ**で完結します(他のフォルダへの依存はありません)。
`scripts\make-handover.ps1` を実行すると、秘密情報・取得済みデータ・`node_modules` を除いた `raiseit-handover.zip` が `commercial/` に作られます。

| 渡す | 渡さない(zipに自動で含まれない) |
| --- | --- |
| `scripts/` `config/sites.example.json` `docs/` `.cursor/rules/` `package.json` `env.example` `README.md` `HANDOVER.md` | `.env`(キー類) / `credentials/` / `data/`(メディトク実データ) / `reports/` / `config/sites.json` / `node_modules/` |

`data/meditoku` はメディトク自社サイトの実データです。引き渡すかは契約で決めてください(渡す場合は別途 zip で)。

## 1. 受け取る側の手順

### 1-1. リポジトリ作成
1. zip を展開し、新しいフォルダ(例 `raiseit`)に置く。
2. `git init` → 新会社の GitHub 等へ push(`.gitignore` で `.env` `data/` `reports/` は除外済み)。
3. Cursor でそのフォルダを開く。`.cursor/rules/raiseit.mdc` が自動で読まれ、AI に方針が伝わる。

### 1-2. Google Cloud(新会社の組織で新規作成)
1. 新会社の Google Workspace / Cloud Identity で組織・請求・プロジェクトを作成。
2. API を有効化: Search Console API / Google Analytics Data API / PageSpeed Insights API。
3. 実行用サービスアカウントを作成(キー発行は組織ポリシーで禁止されがち)。**キーは作らず**、`gcloud auth application-default login --impersonate-service-account=<SA>` を使う。キーが許可されている場合のみ `credentials/` に置き `.env` の `GOOGLE_APPLICATION_CREDENTIALS` に指定。
4. PageSpeed 用 API キーを新規発行(制限: PageSpeed Insights API のみ)。
5. 計測対象サイトごとに、サービスアカウントのメールを **Search Console(ユーザーとして追加・制限付き可)** と **GA4(閲覧者)** に追加。

### 1-3. 設定
1. `env.example` を `.env` にコピーし、`PSI_API_KEY` などを入れる(`.env` は絶対にコミットしない)。
2. `config/sites.example.json` を `config/sites.json` にコピーし、計測するサイトを書く(`id` / `gscSite` / `ga4PropertyId`)。
3. `npm install`

### 1-4. 動作確認
```powershell
npm run check:auth
npm run fetch:gsc -- --site <id>      # 初回は過去分のバックフィル
npm run fetch:ga4 -- --site <id>
npm run fetch:src -- --site <id>
npm run fetch:events -- --site <id>
npm run fetch:psi -- --site <id>
npm test
npm run report -- --site <id>         # reports/<id>/latest.html
```
毎日自動実行する場合: `scripts\register-task.ps1`(Windows タスクスケジューラ。全サイトを順に処理)。

### 1-5. AI(任意)
`.env` の `AI_PROVIDER` を設定: 院内/社内ローカルLLMは `ollama` か `openai-compat`、無い環境は BYO で `anthropic` / `gemini` / `openai-compat` + `AI_API_KEY`。
`npm run ai:propose -- --site <id> --limit 3` → `npm run ai:review -- --site <id>` で承認。承認済み提案の PR 化は未実装。

## 2. 引き渡し直後に必ずやること

1. メディトク固有の記述の整理: `rg -i meditoku`(`docs/` の中の事例、`sites.example.json` の例)。
2. 医療広告チェッカーのルールは医療向け。業種別ルールセットに分離(店舗・一般企業向けを別に作る)。
3. `issue-text.mjs` の `DEFAULT_CONSTRAINTS`(「見た目を変えない」等)を顧客・業種ごとに差し替え可能にする。
4. 法務: 利用規約・プライバシーポリシー・特商法表記・問い合わせ窓口を整備(OAuth審査と GBP API 申請に必要)。
5. 元のコードの権利関係(著作権・ライセンス)を契約書で明記。

## 3. 開発ロードマップ(`docs/` 参照)

| 順 | 内容 | 備考 |
| --- | --- | --- |
| 1 | GCP 移行: ndjson → Cloud SQL(PostgreSQL)、日次 → Cloud Scheduler + Cloud Run Jobs、`.env` → Secret Manager | `docs/別会社への移管チェックリスト.md` §3 |
| 2 | マルチテナント化: 全データに `tenant_id`、認証(Firebase Auth)、権限 | 販売前に必須 (§4) |
| 3 | 管理画面(Web)とレポートの動的表示 | 現状は静的HTML |
| 4 | 顧客の Google 連携(OAuth)。読み取り専用スコープから。OAuth 検証を申請 | 新会社のブランド・ドメインで |
| 5 | Google ビジネスプロフィール API 申請(**新会社の GCP プロジェクト番号で**) | 申請には公開サイト・法人情報・利用目的が必要 |
| 6 | YouTube / Instagram / X 連携(現状は CSV 取り込みのみ) | |
| 7 | AI 提案 → 承認 → Git PR 作成 | プロバイダ抽象化まで完了 |

機能の優先順位の根拠は `docs/競合機能カタログと提案.md` と `docs/research/`。要件は `docs/要件定義書.md`。

## 4. Cursor で開発を続けるコツ
- 最初に「`HANDOVER.md` と `docs/要件定義書.md` を読んで、ロードマップ1から進めて」と依頼する。
- 新しい機能は `docs/` に設計を残し、`.cursor/rules/raiseit.mdc` に守るべき方針を追記する。
- 秘密情報(`.env`・キー・顧客トークン)はチャットに貼らない。
