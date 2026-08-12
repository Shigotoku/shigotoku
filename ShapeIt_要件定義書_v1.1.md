# ShapeIt（シェイプイット）要件定義書

> **ファイル名について**: 正本は `ShapeIt_要件定義書_v1.1.md`。本ファイル（旧名 Product Feedback OS）も同一内容の v1.1 である。

|項目|内容|
|---|---|
|文書バージョン|v1.1|
|作成日|2026-08-11|
|改訂日|2026-08-11|
|想定読者|経営者 / PM / デザイナー / エンジニア / AI Coding Agent / Cursor 等|
|開発方針|自社Dogfoodingから開始し、そのまま外販可能な独立マルチテナントSaaSとして設計|
|想定インフラ|GCP + Cloudflare|
|公開サイト|Astro + GitHub + Cloudflare Pages|
|アプリ|TypeScript / Next.js + Cloud Run + PostgreSQL|
|文書目的|本書単体で、AIまたは開発者がMVP実装の全体像・優先順位・将来拡張を理解できること|
|v1.1での主な変更|正式プロダクト名を **ShapeIt（シェイプイット）** に確定。グローバル外販・体験差別化・コンプライアンス・AI品質の強化要件を追加（§28）|

> **本書の最重要原則：報告者には「気づきを伝える」以外の整理作業を極力させない。分類・重複判定・優先度・担当候補・要約はAIが担う。**

---


# 0. エグゼクティブサマリー

## 0.0 プロダクト名・ブランド

|項目|内容|
|---|---|
|正式名称（英語）|**ShapeIt**|
|正式名称（日本語）|**シェイプイット**|
|読み|シェイプイット|
|カテゴリ表記|AI Product Feedback OS / Product Intelligence SaaS|
|ドメイン仮説|shapeit.app / www.shapeit.app / app.shapeit.app / docs.shapeit.app（取得状況に応じ確定）|
|Repo仮説|`shapeit-app` / `shapeit-web`（既存SaaSリポジトリとは独立）|
|GCP Project仮説|`shapeit-staging` / `shapeit-prod`（既存事業と分離）|
|一文タグライン案|気づきを、プロダクトの形に。|
|補足|「Product Feedback OS」は旧仮称・カテゴリ説明として残してよいが、対外名称・UI・ドメイン・契約書類では **ShapeIt** を用いる。|

- **BRAND-001** [MUST] [MVP] アプリUI、メール、通知、LP、Docs、契約・請求の対外表記は ShapeIt / シェイプイット に統一する。
- **BRAND-002** [MUST] [MVP] コード・設定の識別子（package名、env prefix、telemetry service名等）は `shapeit` を基本とする。
- **BRAND-003** [SHOULD] [V1] 商標・ドメイン・SNSハンドルの確保状況をSecurity/Legalチェックリストに含める。

---

本プロダクト **ShapeIt** は、社員・顧客がSaaSやWebアプリを利用中に発見した「バグ」「使いにくさ」「改善案」「機能要望」「文言修正」「パフォーマンス問題」等を、最短10秒で投稿できる Product Feedback / Product Intelligence SaaS である。
投稿時にはスクリーンショット、URL、ページ情報、ブラウザ・OS・画面サイズ・アプリバージョン等を可能な限り自動取得する。投稿後、AIがタイトル、要約、カテゴリー、Severity、Product Area、Priority、重複候補、再現手順、担当候補を生成し、管理者はAI Triage Inboxで採用・統合・保留・却下を判断する。
同一問題への複数報告は1つのIssueへ集約し、「報告数」を発生頻度・重要度のシグナルとして利用する。開発後は投稿者へ確認を戻し、Closed Loopで改善の完了を検証する。将来的には顧客フィードバック、ARR等の事業影響、GitHub / Slack / Jira / Linear連携、AI Coding Agent、AI Product Managerへ拡張する。
> **価値提案：Jamの「報告の速さ」× Linearの「Triage」× Canny/Productboardの「要望・優先順位」を、AI中心の一つの体験として統合する。**

## 0.1 プロダクトの一文定義
「気づいた瞬間に投稿するだけで、AIが整理・統合・優先順位付けし、開発Todoから修正確認までつなぐ、**ShapeIt — AI Product Feedback OS**」

## 0.2 成功条件

|指標|MVP目標|将来目標|
|---|---|---|
|投稿所要時間|中央値 10秒以内|5秒以内|
|AI自動分類率|80%以上|95%以上|
|AI重複候補提示率|対象Issueで候補提示|Capture時点の類似提示＋高精度自動統合補助|
|管理者Triage時間|1件30秒以内|大半を自動処理|
|報告→Issue化|一貫したワークフロー|完全自動化可能|
|Closed Loop|投稿者へ完了通知|検証・再オープン・Changelogまで自動|
|外販可能性|マルチテナント前提|Billing / i18n / GDPR / Enterprise対応|
|グローバル利用|日本語UIでDogfooding|主要画面の日英＋投稿言語の自動扱い|

# 1. 背景・課題・目的

## 1.1 現状の課題
- 社員全員がアプリを触る中で、気づきが口頭・チャット・メール・メモ等に散らばる。
- スクリーンショット、URL、再現手順、優先度、担当者を毎回整理する負担が大きい。
- 同じ問題が複数人から別々に報告され、重複カードが増える。
- 「何から直すべきか」が声の大きさや記憶に依存しやすい。
- 投稿者から見ると、報告後に「どうなったか」が分からず、投稿文化が弱くなる。
- 外部顧客の要望と社内のバグ・改善案が別系統になり、Product判断が分断される。

## 1.2 目的
- **OBJ-001** [MUST] [MVP] 社員がアプリ利用中の気づきを、最少操作で投稿できること。
- **OBJ-002** [MUST] [MVP] 投稿後の整理作業をAIで自動化し、管理者のTriage負担を削減すること。
- **OBJ-003** [MUST] [MVP] 複数のFeedbackを1つのIssueへ統合できるデータモデルを採用すること。
- **OBJ-004** [MUST] [MVP] 自社利用から開始しても、後から作り直さず外部販売できるマルチテナント設計とすること。
- **OBJ-005** [SHOULD] [V1] 顧客Feedbackを同じ基盤に収集できること。
- **OBJ-006** [SHOULD] [Future] AIが「次に何を直すべきか」を説明付きで提案できること。
- **OBJ-007** [MUST] [V1] 日本語・英語を中心に、グローバルチームが同一テナントで利用できること（i18n / タイムゾーン）。
- **OBJ-008** [SHOULD] [V1] Closed Loopを社内通知にとどめず、Changelog / 顧客向け進捗表示までつなげられること。
- **OBJ-009** [MUST] [V1] 外販時に求められる基本的なプライバシー権利行使（開示・削除・保持）に対応できること。

# 2. プロダクト設計原則

|ID|原則|定義|
|---|---|---|
|P-01|投稿者ファースト|投稿者には分類・優先度・担当者・期限を原則入力させない。|
|P-02|FeedbackとIssueを分離|生の報告（Feedback）と、開発単位（Issue）を別エンティティとして保持する。|
|P-03|AIは補助＋説明可能|AI判断は理由・Confidence・根拠を表示し、人間が上書き可能とする。|
|P-04|原文を保持|AI整形後も投稿者の原文・原データを不変で保持する。|
|P-05|Closed Loop|Doneで終わらず、投稿者への通知・確認までを改善サイクルと定義する。|
|P-06|セキュリティを後付けしない|スクショ等に機微情報が含まれる前提で、マスキング・権限・監査を初期から設計する。|
|P-07|クラウドロックインを抑制|GCPを採用するが、アプリコアはDocker/PostgreSQL/抽象化されたAI Provider等で可搬性を確保する。|
|P-08|独立事業として分離|既存SaaSと同じクラウド事業者を使っても、GCP Project / DB / Storage / Repo / Secrets / Billingを分離する。|
|P-09|シンプルなMVP|最初に価値を証明するのは Capture → AI Triage → Inbox → Duplicate → Board の5点。|

# 3. 利用者・ロール・権限

## 3.1 想定ユーザー

|ユーザー|主目的|主な操作|
|---|---|---|
|Member / 社員|気づきを投稿|投稿、My Feedback、コメント、修正確認|
|Developer|Issueを解決|担当、Status更新、技術コメント、GitHub連携|
|Product Manager|優先順位とTriage|Inbox、統合、Priority override、Roadmap|
|Admin|運用管理|Project、Member、Integration、設定|
|Owner|契約・組織管理|Billing、SSO、全設定|
|Viewer|閲覧のみ|Board、Issue、Analytics閲覧|
|External Customer（将来）|要望・不具合報告|WidgetからFeedback、ステータス確認（設定時）|

## 3.2 RBAC
- **AUTH-001** [MUST] [MVP] Owner / Admin / Product Manager / Developer / Member / Viewer のロールをデータモデル上保持する。
- **AUTH-002** [MUST] [MVP] 全APIでorganization_idによるテナント境界を検証する。
- **AUTH-003** [MUST] [MVP] Google Loginを提供する。
- **AUTH-004** [SHOULD] [V1] Microsoft Login / SSOを提供する。
- **AUTH-005** [SHOULD] [Enterprise] SAML/OIDC SSOおよびSCIMを提供できる構造とする。

# 4. 画面構成・情報設計

## 4.1 グローバルナビゲーション

|画面|MVP|目的|
|---|---|---|
|Inbox|必須|新規Feedback / AI Triageの処理|
|Board|必須|Issueの実行管理|
|Issue Detail|必須|詳細・AI分析・履歴・関連情報|
|Capture|必須|最短投稿|
|My Feedback|必須|投稿者のClosed Loop|
|Ideas|将来|Feature / Ideaの管理|
|Analytics|将来|改善活動・Product Areaの可視化|
|Ask Product|将来|AI Product Manager|
|Changelog|V1|Releaseに紐づく「直したこと」の公開・社内共有|
|Customer Portal|V1/V2|顧客が自分の声の進捗を確認（薄ログイン可）|
|Settings|必須|Project / Member / AI / Privacy等設定|

## 4.2 Capture（投稿）
- **CAP-001** [MUST] [MVP] アプリ内に常設の「＋ 気づきを投稿」ボタンを設置できること。
- **CAP-002** [MUST] [MVP] 投稿時にユーザーはコメント入力または音声入力を選べること。音声はMVPで任意、V1でも可。
- **CAP-003** [MUST] [MVP] 現在のURL、ページタイトル、viewport、browser、OS、app_version、environment、投稿者、投稿日時を可能な限り自動取得すること。
- **CAP-004** [MUST] [MVP] スクリーンショットを投稿に添付できること。
- **CAP-005** [MUST] [MVP] 送信までのユーザー必須入力は原則「内容」のみとし、Category/Priority/Assignee等を要求しないこと。
- **CAP-006** [SHOULD] [V1] スクリーンショットへ矩形、矢印、描画、テキスト注釈を追加できること。
- **CAP-007** [SHOULD] [V1] Chrome Extensionから任意のWebアプリ画面をCaptureできること。
- **CAP-008** [SHOULD] [V1] 埋め込みWidgetをscriptタグ等で外部SaaSへ導入できること。
- **CAP-009** [SHOULD] [V2] 画面録画 / Session replay / 音声添付をサポートすること。
- **CAP-010** [SHOULD] [V2] Console log / Network log / DOM要素 / 操作履歴を明示的な権限・安全策の下で取得できること。
- **CAP-011** [SHOULD] [V1] Capture送信前に同一Project内の類似Issue/Feedbackを提示し、「既存に＋1（upvote/report）」を選べること。新規投稿も常に可能とする（必須化しない）。
- **CAP-012** [SHOULD] [V1] Capture UIをモバイルブラウザ / PWAで快適に使えること（タップ領域・カメラロールからの添付含む）。
- **CAP-013** [SHOULD] [V1] オフラインまたは送信失敗時にローカルキューへ保持し、復帰後に再送できること。
- **CAP-014** [COULD] [V2] Email転送・ヘルプデスク取込等、非UIチャネルからのCaptureを同一Feedbackモデルへ正規化できること。

## 4.3 Inbox / AI Triage
- **TRI-001** [MUST] [MVP] 全新規Feedback/Issue候補をInboxへ集約する。
- **TRI-002** [MUST] [MVP] 各項目にAI生成のTitle、Summary、Category、Severity、Product Area、Priority、Duplicate候補を表示する。
- **TRI-003** [MUST] [MVP] 管理者は「Todoへ」「既存Issueへ統合」「保留」「却下」を1～2操作で実行できる。
- **TRI-004** [MUST] [MVP] 統合時、Feedbackは削除せず、feedback_issue_linksでIssueへ紐づける。
- **TRI-005** [SHOULD] [V1] AI TriageのConfidenceが高い項目に対し自動適用ルールを設定できる。
- **TRI-006** [SHOULD] [V1] Snooze / 再表示日時を設定できる。

## 4.4 Board
- **BRD-001** [MUST] [MVP] Status列として Inbox / Todo / In Progress / Review / Verify / Done / Archived を保持する。UIではMVPで必要列のみ表示可。
- **BRD-002** [MUST] [MVP] Drag & DropでStatus変更できる。
- **BRD-003** [MUST] [MVP] Project、Product Area、Category、Severity、Assignee、Priority等でFilterできる。
- **BRD-004** [SHOULD] [V1] Saved Viewをユーザー/組織単位で保存できる。

## 4.5 Issue Detail
- **ISS-001** [MUST] [MVP] IssueのTitle、Summary、Status、Category、Severity、Priority、Product Area、Assignee、Due Date、Releaseを表示・編集できる。
- **ISS-002** [MUST] [MVP] 紐づく全Feedbackと報告人数を表示する。
- **ISS-003** [MUST] [MVP] スクリーンショット、URL、環境情報、原文、AI分析を同一画面で確認できる。
- **ISS-004** [MUST] [MVP] AIがReproduction StepsとDeveloper Summaryを生成できる。
- **ISS-005** [SHOULD] [V1] Related / Duplicate / Blocks / Blocked by 等のIssue relationを保持できる。
- **ISS-006** [SHOULD] [V1] コメント、Activity、Audit Trailを時系列表示する。
- **ISS-007** [SHOULD] [V1] AI Priorityの理由を表示し、人間のoverride値と理由を保存できる。

## 4.5b Fix Packs（画面単位の一括修正）

> **設計原則：同一問題は Issue に統合し、同一画面の別問題は Fix Pack に束ねる。投稿者には何もさせず、エンジニアには「この画面で直すことリスト＋修正プロンプト」を渡す。**

- **PACK-001** [MUST] [V1] オープン Issue を正規化 URL（pageKey）で自動集約し、修正パック一覧を提供する。
- **PACK-002** [MUST] [V1] パック詳細で「この画面の問題リスト」（Severity・報告数順）を表示する。
- **PACK-003** [MUST] [V1] パック単位の Fix-with-AI プロンプト（受け入れ条件・原文サンプル込み）をワンクリックでコピーできる。
- **PACK-004** [SHOULD] [V1] パック内 Issue を個別または一括で Done にできる。
- **PACK-005** [MUST] [V1] pageKey 正規化はアルゴリズム優先（utm 除去・pathname 基準）。意味的な再分割が必要な場合のみ AI 補助とする。
- **PACK-006** [SHOULD] [V1] Heatmap の URL 行から該当修正パックへ遷移できる。
- **PACK-007** [SHOULD] [V1] 同一 URL 内でカテゴリ・文言類似によりサブパック分割し、塊ごとのプロンプト/Done ができる。
- **PACK-008** [SHOULD] [V1] Fix Pack に担当・作業ステータス・Branch/PR・メモを保持できる（組織共有: Firestore `shapeit_fix_pack_meta`、ローカルフォールバックあり）。
- **PACK-009** [SHOULD] [V1] Issue Detail / Board カード / Heatmap から該当修正パックへ遷移できる。

## 4.6 My Feedback / Closed Loop
- **MYF-001** [MUST] [MVP] 投稿者は自分のFeedback一覧と対応Statusを確認できる。
- **MYF-002** [MUST] [MVP] 紐づくIssueがDone/Releasedになった際に投稿者へ通知する。
- **MYF-003** [SHOULD] [V1] 投稿者が「解決した / まだ解決していない」を回答できる。
- **MYF-004** [SHOULD] [V1] 「まだ解決していない」回答時にIssueをVerify/再オープン候補へ移行できる。
- **MYF-005** [SHOULD] [V1] 却下・保留時は理由を投稿者に分かりやすく表示できる。
- **MYF-006** [SHOULD] [V1] Done 通知文はカテゴリ・報告数からアルゴリズムで生成し、投稿原文を引用して確認を促す（難しい個別文面のみ AI）。

## 4.7 Ideas / Roadmap / Analytics（将来）
- **IDEA-001** [SHOULD] [V2] Idea/Feature RequestをBug系Issueと論理的に分離して管理する。
- **IDEA-002** [SHOULD] [V2] IdeaにCustomer数、Vote、ARR、Strategic Fit、Effort等を紐づける。
- **RDM-001** [SHOULD] [V2] Now / Next / Later型Roadmapを提供する。
- **ANA-001** [SHOULD] [V2] Feedback数、Resolved数、Median resolution time、Duplicate rate、AI auto-triage率を可視化する。
- **ANA-002** [SHOULD] [V2] Product Area別のFeedback/Issueヒートマップを提供する。
- **ANA-003** [COULD] [Future] 最も改善が必要な画面・再発率・Release後Bug数等を分析する。

# 5. ドメインモデル・DB設計

## 5.1 エンティティ関係の基本
> **最重要：Feedback（生の気づき）と Issue（開発・改善単位）を分離する。複数Feedback → 1 Issue を標準とする。**
概念関係：Organization → Workspace（任意）→ Project → Feedback → feedback_issue_links → Issue。IssueはRelease、Assignee、Product Area、AI Analysis、Activity等を持つ。

## 5.2 主要テーブル

|テーブル|目的|主要キー/属性|
|---|---|---|
|organizations|テナント|id, name, slug, plan, billing_customer_id|
|workspaces|任意の組織内グループ|id, organization_id, name|
|projects|対象プロダクト|id, organization_id, workspace_id, name, slug|
|users|人物|id, email, name|
|memberships|組織ロール|organization_id, user_id, role|
|feedback|原投稿|raw_text, voice_transcript, source, page_url, browser, os, viewport, app_version|
|issues|整理後の改善単位|title, summary, category, severity, priority_score, status, product_area_id, assignee_id|
|feedback_issue_links|Feedback-Issue対応|feedback_id, issue_id, link_type|
|attachments|画像/動画/音声|feedback_id, type, storage_key, redacted|
|product_areas|製品領域|project_id, name, parent_id|
|issue_relations|Issue間関係|source_issue_id, target_issue_id, relation_type|
|duplicate_candidates|重複候補|feedback/issue, candidate_issue_id, similarity, llm_result|
|ai_analyses|AI結果|model, prompt_version, result_json, confidence|
|ai_runs|AI実行履歴|task_type, status, latency, token/cost metadata|
|priority_events|Priority変更履歴|old, new, source, reason|
|comments|会話|issue_id, author_id, body|
|releases|リリース|project_id, version, released_at|
|notifications|通知|recipient, type, status|
|integrations|外部連携|provider, config, status|
|audit_logs|監査|actor, action, entity, before/after, request_id|

## 5.3 Feedbackテーブルの必須方針
- **DB-001** [MUST] [MVP] feedback.raw_text等の原投稿はAI整形で上書きしない。
- **DB-002** [MUST] [MVP] feedbackにorganization_id / project_idを必須で持たせる。
- **DB-003** [MUST] [MVP] sourceにAPP_WIDGET / CHROME_EXTENSION / WEB_FORM / API / SLACK 等を拡張可能な列挙型として持つ。
- **DB-004** [MUST] [MVP] 環境情報は取得不能項目があっても投稿失敗にしない。

## 5.4 Issueテーブルの必須方針
- **DB-010** [MUST] [MVP] IssueはFeedbackなしでも将来手動作成可能なモデルとする。
- **DB-011** [MUST] [MVP] priority_score（AI/ルール算出）とpriority_override（人間上書き）を分離する。
- **DB-012** [MUST] [MVP] SeverityとPriorityを別概念として保持する。
- **DB-013** [MUST] [MVP] Soft delete / archived設計を採用し、監査上重要なデータを不用意に物理削除しない。

## 5.5 マルチテナント
- **TEN-001** [MUST] [MVP] 全テナントデータにorganization_idを持たせる。
- **TEN-002** [MUST] [MVP] API層でorganization_idのスコープを強制し、他テナントIDを指定しても取得不可とする。
- **TEN-003** [SHOULD] [V1] PostgreSQL Row Level Security等の追加防御を検討・導入する。
- **TEN-004** [MUST] [MVP] 既存SaaSのuser_id / DBを直接共有しない。連携はAPI/Webhook/SSO境界とする。

# 6. AI要件・AI処理パイプライン

## 6.1 AI処理フロー
1. Normalize（原文の意図を保ったTitle/Summary生成）
1. Categorize
1. Severity判定
1. Product Area推定
1. Embedding生成
1. Duplicate候補検索
1. LLMによるsame / related / different判定
1. Priority計算
1. Reproduction Steps生成
1. Developer Summary生成
1. Assignee/Team候補生成
1. 将来：Weekly Product Review / Ask Product

## 6.2 構造化出力
- **AI-001** [MUST] [MVP] AI結果は自由文だけでなく、JSON Schemaに従う構造化データとして取得する。
- **AI-002** [MUST] [MVP] AI Providerをinterfaceで抽象化し、Vertex AIを初期ProviderとしつつOpenAI等へ差し替え可能とする。
- **AI-003** [MUST] [MVP] 各AI結果にmodel、prompt_version、generated_at、confidence、run_idを保存する。
- **AI-004** [MUST] [MVP] AI失敗時もFeedback投稿自体は成功させ、再試行可能な非同期処理とする。
- **AI-005** [SHOULD] [V1] AIの人間による修正を学習・評価用シグナルとして保持する。

## 6.3 Category
初期カテゴリーは次の固定集合を採用する。必要に応じて組織カスタムラベルを併用する。
- BUG
- UX
- UI
- FEATURE
- COPY
- PERFORMANCE
- SECURITY
- DATA
- INTEGRATION
- OPERATION
- IDEA
- OTHER

## 6.4 Severity

|Severity|意味|例|
|---|---|---|
|S0 Critical|即時対応相当|ログイン不能、全体停止、データ消失、重大Security、課金異常|
|S1 High|主要機能に大きな影響|頻発エラー、主要業務停止|
|S2 Medium|回避策あり・一部影響|使いにくさ、一部機能不具合|
|S3 Low|軽微|文言、見た目、低頻度|
- **AI-010** [MUST] [MVP] Severityの判定理由を短文で保存・表示する。

## 6.5 Duplicate Detection
- **AI-020** [MUST] [MVP] 新規Feedback/Issueに対し、同一Project内のEmbedding近傍候補を検索する。
- **AI-021** [MUST] [MVP] Top-N候補をLLMで再判定し same / related / different とconfidenceを返す。
- **AI-022** [MUST] [MVP] MVPでは自動統合せず、候補を人間に提示する。
- **AI-023** [SHOULD] [V1] 十分高いconfidenceと組織ポリシーがある場合、自動統合補助を許可する。
- **AI-024** [MUST] [MVP] 統合時、元Feedbackを失わず、Issueのreport_countに反映する。

## 6.6 Priority Engine
PriorityはLLMの主観だけで決定しない。ルールベースのスコアにAI抽出シグナルを入力する。初期案は100点満点。

|要素|上限点|説明|
|---|---|---|
|Severity|30|S0/S1等|
|Frequency|15|報告数・再発数|
|Affected users|15|影響ユーザー範囲|
|Revenue impact|10|将来：ARR/商談/解約リスク|
|Customer impact|10|顧客重要度・主要業務|
|Strategic fit|10|戦略テーマとの一致|
|Recency|5|急増・最近の発生|
|Compliance/Security|5|法令・セキュリティ上の緊急性|
- **PRI-001** [MUST] [MVP] Priority Scoreは0-100で保存する。
- **PRI-002** [MUST] [MVP] スコア理由を人が理解できる箇条書きとして表示する。
- **PRI-003** [MUST] [MVP] 人間がPriority Overrideを行え、理由を必須入力できる。
- **PRI-004** [SHOULD] [V2] Effortを加味したImpact/Confidence/Effort型ランキングを提供する。

## 6.7 Ask Product / AI Product Manager（将来）
- **AIPM-001** [SHOULD] [Future] 「今週何を直すべき？」等の自然言語質問に、根拠付き優先Issueを返す。
- **AIPM-002** [SHOULD] [Future] 毎週、新規Feedback、Critical、急増Issue、要望急増、顧客影響、推奨順位をまとめたWeekly Product Reviewを生成する。
- **AIPM-003** [SHOULD] [Future] 回答は必ず参照Issue/Feedbackを提示し、根拠追跡可能とする。

# 7. 業務フロー・状態遷移

## 7.1 標準フロー
1. 社員/顧客が気づく
1. Captureボタンを押す
1. スクショ・URL・環境情報を取得
1. コメント/音声を送信
1. Feedback保存（ここでユーザー操作は完了）
1. Cloud TasksへAI処理を投入
1. AI Triage結果を生成
1. Duplicate候補提示
1. 管理者が既存Issueへ統合または新規Issue化
1. Boardで開発
1. Review
1. Verify
1. Releaseへ紐づけ
1. 投稿者へ完了通知
1. 投稿者が解決確認
1. Done / 再オープン

## 7.2 状態遷移

|From|To|主なトリガー|
|---|---|---|
|Inbox|Todo|Triage Accept|
|Inbox|Archived|却下|
|Inbox|Snoozed|保留|
|Todo|In Progress|担当者着手|
|In Progress|Review|修正/PR準備|
|Review|Verify|レビュー完了/デプロイ|
|Verify|Done|QA/投稿者確認|
|Done|In Progress/Verify|未解決回答・再発|

# 8. 技術アーキテクチャ

## 8.1 採用スタック

|レイヤー|採用案|方針|
|---|---|---|
|Public Web / LP|Astro + TypeScript|高速・静的・SEO・Git運用|
|Public Hosting|Cloudflare Pages|GitHub push/PR Preview|
|DNS/WAF/CDN|Cloudflare|公開エッジ統一|
|SaaS Web App|Next.js + TypeScript|Cloud Run上で運用|
|Backend API|TypeScript / Node.js|Web App分離可能なAPI境界|
|Container|Docker|クラウド可搬性|
|Compute|Google Cloud Run|Web/API/Worker|
|Database|Cloud SQL for PostgreSQL|中心データ|
|Vector|PostgreSQL + pgvector|重複候補/意味検索|
|Private Object Storage|Google Cloud Storage|スクショ/動画/音声|
|Public Assets|Cloudflare R2（任意）|LP画像・公開資料等|
|Async Jobs|Cloud Tasks|AI/通知/Webhook非同期化|
|AI|Vertex AI（初期）|Provider abstraction必須|
|Secrets|Secret Manager|鍵・外部連携Secret|
|Observability|Cloud Logging/Monitoring + Error tracking|request_id追跡|
|CI/CD App|GitHub Actions + Artifact Registry + Cloud Run|staging→production|
|CI/CD Web|GitHub + Cloudflare Pages|PR Preview→main production|

## 8.2 ドメイン構成

|用途|例|
|---|---|
|Marketing|shapeit.app / www.shapeit.app|
|App|app.shapeit.app|
|API|api.shapeit.app（必要な場合）|
|Docs|docs.shapeit.app|
|Status|status.shapeit.app（将来）|
|Customer Portal|portal.shapeit.app または app 内パス（将来）|

## 8.3 Repo構成
- **ARC-001** [MUST] [MVP] 既存SaaSとは独立したGitHub Repositoryを作る。
- **ARC-002** [MUST] [MVP] 最低限 `shapeit-app` と `shapeit-web` を分離する。
- **ARC-003** [MUST] [MVP] 既存SaaSとのコードmonorepo統合を前提にしない。
推奨：shapeit-appはWeb/API/Workerをmonorepoで管理してもよいが、既存事業とは独立させる。

## 8.4 GCP Project分離
- **ARC-010** [MUST] [MVP] ShapeIt専用GCP Projectを作成し、既存SaaSとDB/Storage/Secretsを共有しない。
- **ARC-011** [MUST] [MVP] staging と production は別Projectにする。devを別Projectにできれば推奨。
- **ARC-012** [MUST] [MVP] Cloud SQL、GCS bucket、Service Account、Secret Managerを環境ごとに分離する。

## 8.5 CloudflareとGCPの責務

|Cloudflare|GCP|
|---|---|
|DNS / WAF / CDN|App compute|
|Astro LP hosting|PostgreSQL|
|PR preview for marketing|Private screenshot/file storage|
|公開アセット / R2（任意）|AI jobs / Cloud Tasks|
|Bot/edge protection|Secrets / audit / logging|

# 9. セキュリティ・プライバシー・監査
> **スクリーンショットには個人情報・機密情報・医療情報が映る可能性がある。「画像は便利な添付」ではなく「高機密データ」として扱う。**

## 9.1 必須セキュリティ
- **SEC-001** [MUST] [MVP] 通信はHTTPS/TLSを必須とする。
- **SEC-002** [MUST] [MVP] Storageはprivateを標準とし、閲覧は短時間のSigned URLまたは認可プロキシ経由とする。
- **SEC-003** [MUST] [MVP] Secret/API keyはSecret Managerで管理し、コード・DBへ平文保存しない。
- **SEC-004** [MUST] [MVP] Role/Organization/Project単位で認可を検証する。
- **SEC-005** [MUST] [MVP] 重要操作はAudit Logへactor/action/entity/before/after/request_idを記録する。
- **SEC-006** [MUST] [MVP] ログへpassword/token/cookie/Authorization/API keyを出力しない。
- **SEC-007** [MUST] [MVP] バックアップとリストア手順を定義し、定期的に復元テスト可能とする。
- **SEC-008** [MUST] [MVP] ユーザー削除・Organization削除・Retention policyを設計する。
- **SEC-009** [MUST] [MVP] Rate limit / WAF / basic abuse protectionを設ける。
- **SEC-010** [MUST] [MVP] 本番データを開発環境へ無断コピーしない。

## 9.2 Sensitive Data / Auto Blur
- **PRV-001** [MUST] [MVP] Capture対象DOMで data-private / data-sensitive 等を指定し、クライアント側でマスクできる設計を用意する。
- **PRV-002** [SHOULD] [V1] 氏名、住所、電話、メール、患者番号、生年月日等の機微情報候補を検出しAuto Blurできる。
- **PRV-003** [SHOULD] [V1] 組織設定で「Original imageを保存しない」を選択できる。
- **PRV-004** [MUST] [MVP] password input、token、Authorization header、Cookie等はCapture/Log対象から除外する。
- **PRV-005** [SHOULD] [V1] 管理者がページ/selector単位で常時マスクルールを設定できる。

## 9.3 データ保存地域
- **PRV-010** [MUST] [MVP] Private attachmentのGCS bucketは明示的にリージョンを指定する。初期候補はasia-northeast1（東京）。
- **PRV-011** [SHOULD] [Enterprise] データレジデンシー要件に応じて地域選択可能な構造を検討する。

# 10. 通知・外部連携

## 10.1 Notification
- **NOT-001** [MUST] [MVP] App内通知を提供する。
- **NOT-002** [MUST] [MVP] 必要なイベントでEmail通知を送れる構造にする。
- **NOT-003** [SHOULD] [V1] Slack / Microsoft Teams通知を提供する。
- **NOT-004** [MUST] [MVP] 通知過多を防ぐため、イベント種別ごとに購読設定可能なデータモデルとする。

## 10.2 Integrations Roadmap

|Integration|Phase|用途|
|---|---|---|
|GitHub|V1|Issue作成、PR/Release連携|
|Slack|V1|投稿・通知|
|Microsoft Teams|V1/V2|通知|
|Outbound Webhook / Zapier / Make|V1|汎用自動化|
|Email → Feedback|V1/V2|サポート転送|
|Zendesk / Intercom / Freshdesk|V2|チケット取込|
|Linear|V2|Issue同期|
|Jira|V2|Issue同期|
|Sentry等|V2|Error→Feedback/Issue|
|PagerDuty / 障害チャンネル|V2|S0エスカレーション|
|Customer CRM / Billing|V2|ARR・顧客重要度|
|Feature Flag（LaunchDarkly等）|V2/V3|実験・フラグ相関|
|AI Coding Agent|V3|Issue→修正提案→PR|

## 10.3 GitHub / AI Coding
- **DEV-001** [SHOULD] [V1] Issue DetailからGitHub Issueを作成し相互リンクできる。
- **DEV-002** [SHOULD] [V2] PR / Branch / Commit / ReleaseをIssueへ紐づけられる。
- **DEV-003** [SHOULD] [V3] 「Fix with AI」からIssue、Screenshot、URL、DOM/Console/Network、Repro、Repo contextをAI Coding Agentへ渡せる。
- **DEV-004** [SHOULD] [V3] AI生成PRはHuman Reviewを必須とする初期ポリシーとする。

# 11. ホームページ・LP・ドキュメント

## 11.1 技術
- **WEB-001** [MUST] [MVP] 公開サイトはAstro + TypeScriptで作成する。
- **WEB-002** [MUST] [MVP] GitHubからCloudflare Pagesへ自動デプロイする。
- **WEB-003** [MUST] [MVP] PRごとにPreviewできる運用を採用する。
- **WEB-004** [MUST] [MVP] SaaS本体repoとは分離する。

## 11.2 初期ページ

|Path|目的|
|---|---|
|/|Hero・価値提案・デモ・CTA|
|/features|Capture / AI Triage / Duplicate / Priority / Closed Loop|
|/pricing|料金（販売開始時）|
|/security|セキュリティ・データ取扱い|
|/docs|導入・Widget・Extension・Integrationドキュメント|
|/blog|SEO / Product Management / Bug reportingコンテンツ|
|/cases|導入事例（将来）|
|/login|appへの導線|

## 11.3 LPメッセージ案
Hero案：「気づいた瞬間が、改善の始まり。」
Product名表示：**ShapeIt（シェイプイット）**
Sub copy案：「社員やユーザーから届くバグ・改善案・要望をAIが自動整理。投稿から開発Todoまで、10秒。」
タグライン案：「気づきを、プロダクトの形に。」
視覚デモ：社員「このボタン分かりにくい」→ AI「UX / Priority 68 / 類似報告12件」→ Todo という3ステップをアニメーションで表示する。

# 12. MVP要件

## 12.1 MVPで必ず実装する

|領域|MVP必須|
|---|---|
|Authentication|Google Login|
|Tenant|Organization / Project / Membership|
|Capture|Comment, URL, Screenshot, Browser/OS/Viewport/App version|
|Feedback|原文保存|
|AI|Title, Summary, Category, Severity, Product Area, Priority, Duplicate candidate|
|Async|Cloud Tasks + AI Worker|
|Inbox|Triage UI|
|Issue|Detail + Feedback aggregation|
|Board|Inbox/Todo/Doing/Review/Done相当|
|My Feedback|自分の投稿・Status|
|Notification|App + 最低限Email|
|Security|Private Storage, RBAC, Audit basics, secret handling|
|Infra|GCP staging/prod分離, Cloudflare, CI/CD|
|Public Site|Astro LP最小版|

## 12.2 MVPで意図的に作らない
- Chrome Extension
- Session replay
- Console/Network capture
- Slack/Jira/Linear同期
- Customer voting
- 高度Analytics
- Roadmap
- Billing
- AI Coding
- Microsoft/SAML SSO
- 高度Auto Blur/OCR
- モバイルネイティブアプリ
ただし、上記を後から追加できるようデータモデル・Integration abstraction・source enum等は拡張性を持たせる。

## 12.3 MVP完了条件
- **MVP-AC-001** [MUST] [MVP] 社員が実アプリ画面から10秒程度でFeedbackを投稿できる。
- **MVP-AC-002** [MUST] [MVP] 投稿後、ユーザーを待たせずFeedbackが保存される。
- **MVP-AC-003** [MUST] [MVP] AI結果が非同期で付与され、Inboxで確認できる。
- **MVP-AC-004** [MUST] [MVP] 重複候補を提示し、既存Issueへ統合できる。
- **MVP-AC-005** [MUST] [MVP] Boardで担当・Statusを管理できる。
- **MVP-AC-006** [MUST] [MVP] Done時に投稿者が結果を確認できる。
- **MVP-AC-007** [MUST] [MVP] 2つのOrganizationをテスト作成し、相互のデータが取得不能であることを自動テストで確認する。

# 13. フェーズ別ロードマップ

|Phase|目的|主要機能|
|---|---|---|
|MVP v0.1|自社Dogfooding|Capture, AI Triage, Duplicate, Inbox, Board, My Feedback, Multi-tenant foundation, ShapeItブランド統一|
|V1 外販準備|他社が導入可能|Billing, Invite, i18n(日英), GDPR基礎, PWA/モバイルCapture, Capture時類似提示, Changelog, Webhook, Microsoft login, Chrome Extension, Widget, GitHub, Slack, Security強化|
|V2 Product Intelligence|顧客の声と事業影響|Customer Portal, Vote, ARR, CRM, Ideas, Roadmap, Analytics, マルチモーダルAI, ヘルプデスク取込, Jira/Linear, S0エスカレーション, 再発検知|
|V3 AI Development|修正実行まで短縮|Console/Network/Replay, AI Coding, PR/Release連携, Feature flag相関|
|V4 AI Product Manager|意思決定をAI補助|Ask Product, Weekly Review, Portfolio insights, Autonomous triage|
|V5 Autonomous Improvement|半自律改善ループ|Feedback→Code investigation→Fix proposal→PR→Human review→Deploy→Verify|

# 14. 外販時の料金・パッケージ仮説
料金は最終確定事項ではない。重要な原則は「投稿者を増やすほど価値が出るため、投稿者へのseat課金を抑える」ことである。Contributor/Memberは無料または実質無制限とし、管理・AI・Integration・Enterprise機能側で課金する。

|Plan|参考価格仮説|対象|主な差分|
|---|---|---|---|
|Starter|¥4,980/月|小規模|管理者3、投稿者多数、基本AI|
|Team|¥14,800/月|SaaSチーム|管理者10、AI Triage/重複、GitHub/Slack|
|Business|¥39,800/月|成長企業|複数Product、Analytics、SSO強化|
|Enterprise|個別見積|大企業|SAML/SCIM、監査、データ地域、SLA|
- **BILL-001** [SHOULD] [V1] Billing Providerはアプリコアから抽象化し、plan/entitlementで機能制御する。
- **BILL-002** [SHOULD] [V1] 投稿者数が導入障壁にならない料金設計を優先する。

# 15. 非機能要件

## 15.1 パフォーマンス
- **NFR-P-001** [MUST] [MVP] Feedback送信APIはAI処理完了を待たず応答する。
- **NFR-P-002** [SHOULD] [MVP] 通常の投稿保存はP95 1秒以内を目標とする（大容量アップロード除く）。
- **NFR-P-003** [SHOULD] [MVP] 主要Board/Inboxの初期表示は一般的な社内ネットワークで体感2秒以内を目標とする。

## 15.2 可用性・耐障害性
- **NFR-A-001** [MUST] [MVP] AI Provider障害時もFeedback収集を継続できる。
- **NFR-A-002** [MUST] [MVP] 非同期Jobはretryとdead-letter相当の失敗管理を持つ。
- **NFR-A-003** [SHOULD] [V1] 本番のSLO/SLAを定義しmonitoringする。

## 15.3 Observability
- **OBS-001** [MUST] [MVP] request_id, organization_id, user_id, project_id（安全な範囲）をログ相関に利用する。
- **OBS-002** [MUST] [MVP] AI runのlatency/error/model/prompt_versionを追跡する。
- **OBS-003** [SHOULD] [V1] AIコストをorganization/project/task単位で可視化できるメトリクスを保持する。

## 15.4 Accessibility / UX
- **UX-001** [MUST] [V1] キーボード操作、十分なコントラスト、フォームラベル等の基本アクセシビリティを守る（外販時は A11Y-001 / WCAG 2.2 AA 目標と整合）。
- **UX-002** [MUST] [MVP] 投稿フローはPC非技術職でも説明なしで使えることを目標とする。
- **UX-003** [MUST] [MVP] AI用語や開発用語を投稿者画面に過剰表示しない。
- **UX-004** [MUST] [MVP] 対外向けコピー・空状態・通知文面にプロダクト名 ShapeIt を一貫して用いる。

# 16. API・イベント設計方針

## 16.1 API境界
RESTまたは型安全RPCのいずれでもよいが、UIコンポーネントがDBへ直接アクセスしない。Application/Domain Serviceを介して認可・監査・Business Logicを一元化する。
- **API-001** [MUST] [MVP] Feedback create / Issue CRUD / Triage / Comment / Notification等の操作を明確なservice境界で提供する。
- **API-002** [MUST] [MVP] 重要なmutationはidempotencyを検討し、重複投稿・二重操作を防ぐ。
- **API-003** [SHOULD] [V1] 外部Widget/Extension向けPublic API token / Project keyを安全に提供する。

## 16.2 Domain Events

|Event|利用例|
|---|---|
|feedback.created|AI analysis開始|
|feedback.analysis.completed|Inbox更新/通知|
|issue.created|Board/Integration|
|issue.merged|Feedback集約|
|issue.status.changed|通知/Audit|
|issue.released|投稿者通知|
|verification.failed|再オープン|
|integration.webhook.received|GitHub等同期|

# 17. Product Analytics・品質評価

## 17.1 自社プロダクトKPI

|KPI|定義|
|---|---|
|Time to Capture|Capture開始→送信|
|Time to Triage|Feedback作成→Triage完了|
|Time to Resolution|Issue作成→Done|
|Duplicate Rate|既存Issueへ統合されたFeedback割合|
|AI Classification Acceptance|AI分類が人間に変更されなかった割合|
|AI Priority Override Rate|Priorityを人間が変更した割合|
|Closed-loop Verification Rate|Done通知後に投稿者が確認した割合|
|Reporter Retention|継続的にFeedbackを投稿する社員割合|
- **MET-001** [MUST] [MVP] MVP時点から上記KPI算出に必要なtimestamp/eventを保存する。

# 18. テスト・品質保証

## 18.1 必須テスト
- **TST-001** [MUST] [MVP] テナント分離の自動テスト。
- **TST-002** [MUST] [MVP] RBACのAPIテスト。
- **TST-003** [MUST] [MVP] Feedback投稿→AI Job enqueueまでのintegration test。
- **TST-004** [MUST] [MVP] AI JSON schema validation / fallback test。
- **TST-005** [MUST] [MVP] Duplicate mergeで原Feedbackが失われないtest。
- **TST-006** [MUST] [MVP] Signed URL/Private Storageのaccess control test。
- **TST-007** [MUST] [MVP] Secret/token等がlogへ出ないtest。
- **TST-008** [MUST] [MVP] 主要Capture/Inbox/Board/My FeedbackのE2E test。

# 19. 開発・デプロイ・運用

## 19.1 環境

|環境|用途|
|---|---|
|local|開発|
|staging|PR後の統合確認 / Dogfooding|
|production|本番|
- **OPS-001** [MUST] [MVP] DB migrationをコード管理し、自動/半自動で再現可能にする。
- **OPS-002** [MUST] [MVP] Production deployはmain merge等の明確なルールに限定する。
- **OPS-003** [MUST] [MVP] Cloud Run Revisionでrollback可能な運用とする。
- **OPS-004** [SHOULD] [V1] Feature flagを導入し、段階リリースを可能にする。

# 20. AI Coding Agent向け実装ルール
> **AIが実装する場合も、この章を優先ルールとして扱う。要件を満たすために勝手に既存SaaSのDB・認証・Secretsへ依存してはならない。**
- **AIC-001** [MUST] [MVP] 実装前にRequirement IDを参照し、対象機能の受入条件を満たすテストを作成または更新する。
- **AIC-002** [MUST] [MVP] organization_idの認可スコープを省略しない。
- **AIC-003** [MUST] [MVP] Feedback原文をAI生成内容で上書きしない。
- **AIC-004** [MUST] [MVP] AI呼び出しをUI requestの同期ブロッキング処理にしない。
- **AIC-005** [MUST] [MVP] AI Provider固有SDKをDomain Logicへ直接拡散させない。adapter層に閉じ込める。
- **AIC-006** [MUST] [MVP] GCS/Cloudflare等Provider固有処理はstorage/infra adapterへ閉じ込める。
- **AIC-007** [MUST] [MVP] 秘密情報・個人情報をapplication logへ出力しない。
- **AIC-008** [MUST] [MVP] 重大な設計変更が本書と矛盾する場合、暗黙に変更せずADR/仕様変更として明示する。
- **AIC-009** [MUST] [MVP] MVPで不要な将来機能を先回りして過剰実装しない。ただしデータモデル上の拡張性は保持する。

# 21. 推奨コード構成（例）
実装フレームワークに応じて変更可能だが、責務分離は維持する。
```text
shapeit-app/
  apps/
    web/              # Next.js UI
    api/              # API (必要なら独立)
    worker/           # AI / notification / webhook jobs
  packages/
    domain/           # entities, policies, use cases
    db/               # schema, migrations, repositories
    ai/               # AIProvider interface + Vertex adapter
    storage/          # Storage interface + GCS adapter
    auth/             # RBAC / tenant scope
    integrations/     # GitHub/Slack等
    ui/               # shared UI
    config/
  infra/
    terraform-or-other-iac/
  tests/

shapeit-web/
  src/
    components/
    layouts/
    pages/
    content/
  public/
```

# 22. 未確定事項（実装開始前またはMVP中に決定）

|項目|初期推奨|決定タイミング|
|---|---|---|
|正式サービス名|**ShapeIt（シェイプイット）確定**|完了（v1.1）|
|ドメイン|shapeit.app 系（取得可否を確認）|LP公開前|
|ORM|Prisma / Drizzle等を比較|実装開始時|
|Authライブラリ|Google Login容易性とB2B SSO拡張性で選定|実装開始時|
|Email Provider|GCP外部サービス含め比較|通知実装時|
|Embedding model|Vertex AI初期|AI PoC時|
|Priority weights|本書初期値をDogfoodingで調整|MVP運用1-2か月|
|Storage retention|組織ポリシー化|MVP運用前|
|R2利用範囲|公開アセットのみから開始|LP/Docs時|
|Billing Provider|Stripe等をV1で選定|外販開始前|
|初期対応言語|UI: 日本語必須、英語V1。AI要約の作業言語は組織設定|V1|
|Customer Portalの形態|マジックリンク vs 共有URL vs 軽量ログイン|V1設計時|

# 23. スコープ外・禁止事項
- MVP段階でJira/Linear/Productboardの全機能を再現しようとしない。
- 投稿者に必須項目を増やしてCaptureをフォーム化しすぎない。
- LLMのPriority値だけで重大インシデントを自動Close/却下しない。
- 既存SaaSのDB・Storage・Secretを直接共有しない。
- 医療/個人情報が含まれる可能性のあるスクリーンショットをpublic bucketへ置かない。
- AI CodingでHuman Reviewなしにproductionへ自動反映しない（少なくとも初期）。
- 社員のFeedback投稿数ランキングを人事評価目的に用いる機能を標準提供しない。
- Capture時の類似提示を必須選択にして、新規投稿を塞がない。
- S0 / SECURITY カテゴリを人間確認なしに自動アーカイブしない。

# 24. 開発着手時のDefinition of Ready
- 正式サービス名 **ShapeIt** の対外表記ルールが共有されている（本書 §0.0）
- ドメイン取得方針が決定（仮ドメインでも可）
- GitHub `shapeit-app` / `shapeit-web` 作成
- GCP staging/prod Project作成
- Cloudflare zone/Pages設定
- DB schema v1レビュー
- Google Login設定
- GCS private bucket設定
- AI Provider PoC（構造化JSON + embedding）
- MVP画面ワイヤーフレーム確定
- Requirement IDをIssue/PRで参照する運用決定

# 25. MVPの推奨実装順序
1. 基盤：Repo、CI/CD、GCP Project、Cloudflare、DB、Auth、Organization/Project
1. Capture：投稿UI、Screenshot、URL/Browser/OS/App version、Feedback保存
1. 非同期：Cloud Tasks、AI Worker、AI JSON schema
1. AI：Normalize / Category / Severity / Product Area / Priority
1. Duplicate：Embedding + pgvector + LLM rerank
1. Inbox：AI Triage、統合/採用/保留/却下
1. Issue Detail：Feedback集約、AI理由、Activity
1. Board：Status、Assignee、Filter
1. My Feedback：投稿一覧、Done通知
1. Security hardening：マスキング基礎、Audit、Storage認可、テナント自動テスト
1. LP：Astro、Hero、Features、Security、Login導線
1. Dogfooding：全社員で使用し、Priority重み・Capture UXを改善

# 26. 要件優先度の読み方

|表記|意味|
|---|---|
|MUST|そのフェーズで必須。欠ける場合は未完成。|
|SHOULD|原則実装。合理的理由がある場合のみ延期可。|
|COULD|価値はあるが優先度低。|
|MVP|自社Dogfooding可能な最初の製品|
|V1|外販開始を想定|
|V2/V3|Product Intelligence / AI Development拡張|
|Future|長期構想|

# 27. 最終ビジョン
本プロダクト **ShapeIt** の最終形は単なるFeedback管理ではない。Employee VoiceとCustomer Voiceを一つのProduct Intelligenceに集約し、AIがTriage・重複統合・Priority・Roadmap判断を支援し、さらに開発コンテキストをCoding Agentへ渡し、Release後に投稿者へ検証を戻す「AI Product Development Platform」である。
> **最終ループ：Feedback → AI分析 → Duplicate統合 → Priority → Development → AI Coding補助 → Review → Release → Reporter Verification → Learn → 次のPriorityへ。**
ただし成功の起点は常にシンプルである。「誰でも10秒で投稿できる」「AIが整理する」「同じ問題はまとまる」「何から直すか分かる」「直ったことが投稿者へ返る」。この5点をMVPのプロダクト品質上の最優先事項とする。
名前の含意：**Shape** = 散らばった気づきをプロダクトの形に整える。**It** = あらゆるプロダクト・画面・チームに対して適用できるOSであること。

---

# 28. v1.1 追加要件 — グローバル最強化レイヤー
> 本章は v1.0 レビューで不足が指摘された領域を、MVPを壊さずフェーズ付きで追加したものである。実装時は §12（MVP範囲）を優先し、本章の V1/V2 を先回り過剰実装しない（AIC-009）。

## 28.1 体験差別化（Capture / Closed Loop）

- **DUP-CAP-001** [SHOULD] [V1] Capture送信前に類似候補を表示し、既存Issueへの report_count 加算（upvote相当）を1操作で行えること（= CAP-011）。
- **CL-001** [SHOULD] [V1] Issueが Done / Released になったら、社内Changelogエントリを生成できること（公開範囲は組織設定）。
- **CL-002** [SHOULD] [V1] Changelogを埋め込みWidgetまたは公開ページとして提供できること。
- **CL-003** [SHOULD] [V2] 顧客向けポータルで「自分のFeedbackの進捗」のみをマジックリンク等で確認できること。
- **CL-004** [COULD] [V1] 管理者向け週次ダイジェスト（新規数・未Triage・急増Issue・Critical）をEmail/Slackで送れること。
- **CL-005** [SHOULD] [V2] Release後に同系統Feedbackが再燃した場合、再発アラートを出せること。

## 28.2 グローバル利用・アクセシビリティ

- **I18N-001** [MUST] [V1] アプリUIの日本語・英語切り替えを提供する。
- **I18N-002** [MUST] [V1] 日時表示・Snooze・週次集計は Organization のタイムゾーン設定に従う。
- **I18N-003** [SHOULD] [V1] Feedback原文の言語を検出し、管理者作業言語への翻訳要約をAIが付与できること（原文は保持）。
- **I18N-004** [SHOULD] [V2] 通知メール／Changelogのロケールを受信者単位で選べること。
- **A11Y-001** [MUST] [V1] 主要画面で WCAG 2.2 AA を目標としたコントラスト・キーボード操作・ラベルを満たす（UX-001を外販必須へ昇格）。
- **MOB-001** [SHOULD] [V1] Capture / My Feedback をモバイルWebおよびPWAで利用可能にする（= CAP-012）。
- **MOB-002** [SHOULD] [V1] オフライン再送キューを提供する（= CAP-013）。

## 28.3 プライバシー・コンプライアンス（外販入場券）

- **CMP-001** [MUST] [V1] 本人またはAdminが組織データのエクスポート（JSON/CSV）を要求できること。
- **CMP-002** [MUST] [V1] ユーザー削除・Feedback匿名化・Organization削除の手順を製品機能または運用Runbookとして実行可能にすること。
- **CMP-003** [MUST] [V1] 添付・Feedbackの保持期間（Retention）を組織ポリシーとして設定できること。
- **CMP-004** [SHOULD] [V1] 公開サイトに Subprocessors / データ取扱い / DPA導線を掲載する。
- **CMP-005** [SHOULD] [Enterprise] データレジデンシー（例: 東京 / EU / US）を選択可能な構造とする（PRV-011の具体化）。
- **CMP-006** [SHOULD] [V1] MFA（またはIdP側MFA前提の文書化）とセッションタイムアウト方針を持つこと。

## 28.4 収集チャネル・プラットフォーム接続

- **CH-001** [SHOULD] [V1] Outbound Webhook（署名付き）で feedback/issue イベントを外部へ送れること。
- **CH-002** [SHOULD] [V1] Zapier / Make 等から利用可能な汎用コネクタ、または同等のPublic APIを提供する。
- **CH-003** [SHOULD] [V1/V2] Email → Feedback の取込（転送用アドレスまたはInbound parse）。
- **CH-004** [SHOULD] [V2] Zendesk / Intercom / Freshdesk 等からのチケット取込アダプタ。
- **CH-005** [SHOULD] [V2] 既存CSV / スプレッドシートからの移行ウィザード。
- **CH-006** [COULD] [V2] Discord / Teams スラッシュコマンドからの投稿。

## 28.5 プロダクト判断・運用強度

- **PI-001** [SHOULD] [V2] 顧客セグメント（プラン、ARR帯、社内外）をFeedback/Issueに紐づけられること。
- **PI-002** [SHOULD] [V2] イニシアチブ / OKR / 戦略テーマへの紐づけを持てること。
- **PI-003** [SHOULD] [V2] Effort（S/M/L）を持ち Impact÷Effort ランキングを提供する（PRI-004の具体化）。
- **PI-004** [SHOULD] [V2] URL/ルート単位の報告密度ヒートマップを提供する（ANA-003前倒し）。
- **PI-005** [SHOULD] [V2] S0 Critical を PagerDuty / 指定Slack等へエスカレーションできること。
- **PI-006** [COULD] [V3] Feature flag / 実験IDとFeedback急増の相関を表示できること。
- **PI-007** [COULD] [V2] 「競合言及」等のクラスタタグをAIが付与できること。

## 28.6 AI品質・安全・コスト

- **AIQ-001** [SHOULD] [V1] Category / Severity / Duplicate の Golden set による回帰評価をCIまたは定期ジョブで回せる構造とする。
- **AIQ-002** [MUST] [V1] Organization / Project 単位でAI利用のレート制限または予算上限を設定できること（OBS-003の製品化）。
- **AIQ-003** [MUST] [MVP] ユーザー原文をシステムプロンプトとして解釈しない境界（プロンプトインジェクション耐性）を持つこと。
- **AIQ-004** [MUST] [MVP] S0 および SECURITY は自動アーカイブ／自動却下の対象外とするルールを強制すること。
- **AIQ-005** [SHOULD] [V2] スクリーンショットのマルチモーダル解析（UI要素・エラー文言・Severity手がかり）をAIパイプラインに追加できること。
- **AIQ-006** [SHOULD] [V1] 人間によるAI修正を学習シグナルとして保存し、Acceptance率を可視化する（AI-005の強化）。
- **AIQ-007** [SHOULD] [V1] Assignee候補は Product Area・過去担当・CODEOWNERS相当の根拠を表示すること。

## 28.7 定着・オンボーディング

- **ONB-001** [SHOULD] [V1] Organization作成後のセットアップウィザード（Project → Capture設置 → テスト投稿 → Inbox）を提供する。
- **ONB-002** [SHOULD] [MVP] Empty stateにサンプルFeedback/Issueを投入し、初日から価値が分かること。
- **ONB-003** [SHOULD] [V1] 未Triage件数のSLAアラート（管理者向け）を設定できること。
- **ONB-004** [COULD] [V1] 投稿文化の健全指標（投稿者数・継続率）をAnalyticsに出す。人事評価ランキングは出さない（§23）。

## 28.8 エンタープライズ／プラットフォーム（長期）

- **ENT-001** [SHOULD] [Enterprise] IP許可リスト、ゲスト期限付きアクセス、監査ログのSIEMエクスポート。
- **ENT-002** [COULD] [Enterprise] ホワイトラベル（ロゴ・ドメイン）。
- **ENT-003** [COULD] [Future] Workflow builder（条件→Slack/PagerDuty/Webhook）。
- **ENT-004** [COULD] [Future] Custom fields / 業種別テンプレート / Marketplace。
- **ENT-005** [COULD] [Future] 複数Product横断のPortfolioビュー。

## 28.9 追加要件のフェーズ要約

|優先|内容|Phase|
|---|---|---|
|1|Capture時類似提示＋upvote|V1|
|2|i18n（日英）＋TZ|V1|
|3|GDPR権利行使・Retention・DPA導線|V1|
|4|Changelog / 週次ダイジェスト|V1|
|5|Webhook / Public API|V1|
|6|PWAモバイルCapture・オフライン再送|V1|
|7|マルチモーダルスクショ理解|V2|
|8|Customer Portal・ヘルプデスク取込|V2|
|9|S0エスカレーション・再発検知|V2|
|10|AI評価セット・コスト上限・安全弁|MVP〜V1|

---

# 付録A. 主要要件IDインデックス

|Prefix|領域|
|---|---|
|BRAND|プロダクト名・ブランド|
|OBJ|目的|
|AUTH|認証・権限|
|CAP|Capture|
|DUP-CAP|Capture時重複回避|
|TRI|Triage|
|BRD|Board|
|ISS|Issue|
|MYF|My Feedback|
|CL|Closed Loop拡張（Changelog等）|
|DB/TEN|DB/マルチテナント|
|AI/PRI/AIPM/AIQ|AI/優先順位/AI PM/AI品質|
|ARC|アーキテクチャ|
|SEC/PRV/CMP|Security/Privacy/Compliance|
|I18N/A11Y/MOB|国際化/アクセシビリティ/モバイル|
|NOT/DEV/CH|通知/開発連携/収集チャネル|
|PI|Product Intelligence|
|ONB|オンボーディング|
|ENT|Enterprise / Platform|
|WEB|LP|
|MVP-AC|MVP受入条件|
|NFR/OBS|非機能/監視|
|API|API|
|MET|KPI|
|TST|テスト|
|OPS|運用|
|AIC|AI Coding Agentルール|

# 付録B. 改訂履歴

|版|日付|内容|
|---|---|---|
|v1.0|2026-08-11|初版（仮称 Product Feedback OS）|
|v1.1|2026-08-11|正式名 **ShapeIt（シェイプイット）** 確定。ブランド・ドメイン仮説・Repo名を更新。グローバル外販・体験差別化・コンプライアンス・AI品質等を §28 として追加。|