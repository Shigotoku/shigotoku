# DeckIt（旧開発名: MediToku Slide Studio）
## GCP SaaS移行・開発要件定義書 / Cursor引継ぎ版

**文書版:** 1.1  
**作成日:** 2026-10-01  
**対象:** **DeckIt**（ユーザー向け正式名。本文の Slide Studio 表記は要件継承）  
**目的:** Google Apps Script（GAS）で検証済みのプロトタイプを、GCP上の長期運用可能な商用SaaSへ移行するための正式な開発要件・設計方針・既存コード引継ぎ資料。

> `legacy_gas/` 配下のコードは「動く仕様書」。GCP版へそのままコピペ移植せず、要件・ロジック・UI思想を継承して再実装する。

---

# 0. Cursorで最初に読む順番

1. `00_README_FIRST.md`
2. `docs/00_SHIGOTOKU_GCP_INTEGRATION.md`（shigotoku モノレポ・Firebase 再利用）
3. `docs/01_MASTER_REQUIREMENTS.md`（本書）
3. `docs/02_CURSOR_IMPLEMENTATION_PLAN.md`
4. `docs/03_DATA_MODEL.md`
5. `docs/04_API_SPEC.md`
6. `docs/05_UI_UX_SPEC.md`
7. `docs/06_GAS_TO_GCP_MAPPING.md`
8. `legacy_gas/current/Code.gs`
9. `legacy_gas/current/Index.html`
10. 必要に応じて `legacy_gas/history/` と `reference_screenshots/`

# 1. プロダクト概要

## 1.1 プロダクト名
**MediToku Slide Studio**

## 1.2 定義
単なるAIスライド生成サービスではない。ユーザーのGoogle Driveに蓄積された元資料・テンプレート・過去の完成Slides・会社ルール・個人の好み・用途別ノウハウを活用し、使うほど「その人・その会社らしい資料」が短時間で作れるGoogle Driveネイティブの資料作成SaaSとする。

製品価値の中心:
- 元資料から構成を作る
- Google Slidesとして生成する
- 会社・個人・用途別の「スタイル」を保持する
- 良かった完成資料を「お手本」として蓄積する
- 人が修正した結果をDesign DNAとして再利用する
- 資料本体は原則ユーザーのGoogle Driveに残す
- Google側の仕様やAIエンジンが変わっても、MediToku側のUXと資産が継続する

## 1.3 長期ビジョン
「資料をAIに作らせる」ではなく、**組織と個人の資料作成ノウハウを蓄積・再利用・標準化するOS**を目指す。

将来:
- 個人・法人・部署単位
- 会社公式テンプレート
- 営業/VC/採用/経営会議/行政/学会など用途別Style
- 承認・監査・バージョン管理
- AIエンジン自動選択
- PowerPoint書き出し
- Google Workspace / 個人Googleアカウント双方
- 多言語
- 将来的なMicrosoft 365連携

## 1.4 実装リポジトリ配置（shigotoku モノレポ）

| パス | 内容 |
|------|------|
| `Slide_Studio/app` | Next.js フロント + Route Handlers（Phase A〜） |
| `Slide_Studio/packages/domain` | ドメイン型・mock（Google/Firestore 非依存） |
| `Slide_Studio/e2e` | Playwright |
| `Slide_Studio/legacy_gas` | 参照のみ |

他プロダクト（`runwith/app` 等）は Vite だが、Slide Studio は API・Cloud Run 統合のため **Next.js を採用**。Auth/Firestore/Hosting の**運用パターン**は `docs/00_SHIGOTOKU_GCP_INTEGRATION.md` に合わせる。

# 2. GASからGCPへ移行する判断

## 2.1 GAS版の位置づけ
GAS版は十分に価値を発揮した。UI、Project、Style、Reference、生成フロー、Design DNAなどの要件を具体化した。

今後は **MediToku Slide Studio GAS Prototype v5.x = Feature Freeze** とし、致命的不具合以外は本流開発をGCPへ移す。

## 2.2 GASで商用品質を追求しない理由
- HtmlService特有の制約
- `google.script.run` 依存
- UI初期化とサーバー処理の密結合
- DriveApp / SlidesApp / PropertiesServiceへの直接依存
- テスト/CI/CD/型安全性不足
- 長時間処理・非同期ジョブ設計の弱さ
- Google API待ちがUIを止めやすい
- 実際に「真っ白」「ボタン無反応」「起動遅延」が発生した

## 2.3 GCP版へ維持する確定仕様
- 左サイドバー中心のSaaS UI
- 4ステップ: 元資料 → 構成 → 生成 → 編集
- Project / Template / Style / Reference
- Design DNA / 編集学習
- Google Drive保存
- Google Slides出力
- 右側Preview、左thumbnail、16:9表示
- 進捗表示
- 会社 / 個人 / 用途別Style
- 良い完成資料のみをReferenceにする思想

# 3. 対象ユーザー

## 3.1 個人
経営者、医師、営業、コンサル、研究者、学会発表者等。

## 3.2 法人
医療法人、一般企業、スタートアップ、コンサル会社、医師会・行政関連組織等。

## 3.3 管理者
- 組織作成
- メンバー/Role
- 会社Style
- 会社Template
- locked rule
- 利用量/請求/監査

# 4. コアUX

## 4.1 最短フロー
1. 新しい資料
2. 元資料を追加 / Driveから選択
3. Style選択
4. 必要なら枚数・目的・対象読者
5. 構成を作る
6. 構成確認
7. Slides生成
8. Preview
9. Google Slidesで仕上げ
10. 良ければ「このスタイルのお手本に追加」

## 4.2 初回利用
- Google Login
- Drive接続
- 保存先を自動作成または選択
- 個人初期Styleを自動作成
- 法人ユーザーは会社Styleを自動表示

## 4.3 通常ユーザーに見せないもの
Folder ID、Slides ID、Firestore ID、OAuth scope名、内部job ID、Design DNA JSON、システムフォルダ。

# 5. UI/UX要件

## 5.1 Sidebar
現GAS版のダークサイドバー方向性を継承。

- MediToku Slide Studio
- ＋ 新しい資料
- Projects
- Styles
- References / お手本
- 必要に応じDrive
- Guide
- Settings

## 5.2 Center
- breadcrumb
- title
- 4 steps
- source
- Style
- conditions
- primary action

## 5.3 Right Preview
- vertical slide thumbnail rail
- large 16:9 preview
- deck versions
- Open in Google Slides
- Add to Reference

## 5.4 Design
- 白 + charcoal + low-saturation teal
- 派手なAI gradientを避ける
- 法人でも違和感なし
- Cursorの情報密度 + Google Workspaceの安心感
- 角丸控えめ、shadow薄め
- 1366×768〜4Kを想定
- `clamp()` 等のresponsive
- 色だけで状態を示さない

## 5.5 絶対要件
- Modalは即時表示。サーバー待ちしない
- ShellはGoogle Drive API待ちしない
- 外部API errorでwhite screenにしない
- 全clickに即時feedback
- Advanced settingは初期非表示
- ID入力を一般ユーザーに要求しない

# 6. Project

1案件 = 1 Project。

フィールド:
- id
- organizationId
- ownerUserId
- name
- styleId
- driveFolderId
- templateFileId
- status
- createdAt / updatedAt
- lastGeneratedDeckId

Drive構造目安:
```text
MediToku Slide Studio/
  Projects/<project>/Sources, Slides, Assets
  Templates/
  References/
  Styles/
```

1 Projectに複数Deck versionを保持する。

# 7. Style

## 7.1 目的
「今日は会社色」「今日は自分色」「今日はVC向け」を1選択で切り替える。

Style = Template + References + Rules + Audience + Purpose + Design/Writing/Chart preference + Animation policy + Assets。

## 7.2 初期例
- 会社公式
- 自分スタイル
- VC・投資家向け
- 医療機関営業

## 7.3 Rule hierarchy
```text
Organization policy
↓
Company Style
↓
Personal Style
↓
Use-case Style
↓
Project instruction
```
上位locked ruleは下位でoverride不可。

## 7.4 kind
- company
- personal
- usecase
- 将来 team

# 8. Reference / お手本

全Slidesを勝手に学習しない。人が「良い」と判断した完成資料だけを登録。

学習カテゴリ:
- design
- writing
- structure
- charts
- motion

Scope:
- company
- team
- personal
- project-only

生成時は初期3件程度、将来はsimilarityで自動選択可。

# 9. Design DNA / Learning

人が編集した完成版との差分やReferenceから傾向を抽出。

例:
- title length
- body density
- bullet length
- image ratio
- whitespace
- chart ratio
- conclusion-first
- citation policy
- colors
- tone

Legacy GAS関数:
- `getDesignProfile`
- `learnFromReferenceDecks`
- `previewEditedDeckLearning`
- `approveEditedDeckLearning`
- `exportDesignProfile`
- `importDesignProfile`

GCP版: `DesignProfileService`, `LearningService`。

# 10. Source / 元資料

MVP:
- PDF
- TXT
- PNG/JPEG/GIF

将来:
- DOCX/PPTX/XLSX
- Google Docs/Sheets
- URL

PDF/TXT: text extraction, heading/numeric/source position。画像はAsset保存、将来OCR/Vision。

GAS版8MB上限を商用版の固定仕様にしない。Plan/backend設定で変更。

# 11. Template

Google Slidesを主とする。

Layout例:
- cover
- statement
- evidence
- two-column
- closing

優先順位:
1. Project explicit
2. Style
3. Organization default
4. System default

# 12. Generation

## 12.1 Legacy
PDF解析 → prompt → Gemini Web手動 → JSON → app貼付 → `createDeck`。

## 12.2 GCP MVP
Manual Gemini flowを残してもよいが、内部は `GenerationEngine` abstraction。

```ts
interface GenerationEngine {
  createOutline(input: GenerationInput): Promise<DeckPlan>
}
```

候補:
- ManualGeminiEngine
- GeminiApiEngine
- VertexGeminiEngine
- GeminiSlidesEngine
- future engines

ユーザーは通常AI providerを意識せず「構成を作る」だけ。

# 13. Google Slides

GCP版はDrive API + Slides API。

責務:
- template copy
- page duplicate/create
- text replacement
- image insertion
- formatting
- thumbnail
- export PPTX

Animationは完全自動を必須にしない。「なし/控えめ/しっかり」はpolicy/template選択。

# 14. Preview

Google Slidesに近い形式。
- 左 thumbnail rail
- 右 16:9
- version switch
- open in Slides
- add to Reference

将来quick edit:
- この1枚再生成
- titleのみ
- 短く
- layout変更

# 15. GCP Architecture

```text
Browser
  ↓
Next.js / TypeScript
  ↓
Cloud Run Web/API
  ├─ Auth Adapter
  ├─ Project Service
  ├─ Style Service
  ├─ Reference Service
  ├─ Generation Service
  ├─ Drive Adapter
  ├─ Slides Adapter
  └─ Billing Adapter
  ↓
Firestore / Cloud Tasks / Secret Manager / Cloud Logging
  ↓
Google Drive API / Slides API / AI Engine
```

Frontend:
- Next.js
- TypeScript
- React
- Tailwind CSS
- React Query等でserver state

Backend:
- TypeScript / Node.js / Cloud Run
- domain/serviceとGoogle Adapter分離

Long tasks:
- Cloud Tasks + worker

# 16. Google Adapter Layer

最重要。Google固有処理をProduct logicから分離。

```ts
interface DriveProvider {
  createProjectFolder(...): Promise<DriveFolderRef>
  listProjectFiles(...): Promise<FileRef[]>
  copyTemplate(...): Promise<DriveFileRef>
}
interface SlidesProvider {
  createDeck(...): Promise<DeckRef>
  getThumbnails(...): Promise<SlideThumbnail[]>
  exportPptx(...): Promise<ExportRef>
}
```

React componentからGoogle API直接呼出し禁止。

# 17. Capability First

Google AI Pro / Workspace / 無料という商品名でbusiness logicを分岐しない。

悪い:
```ts
if (user.googlePlan === 'Google AI Pro')
```
良い:
```ts
if (capabilities.nativeGeminiSlides)
```

候補:
- driveFileAccess
- picker
- sharedDrive
- slidesRead / slidesWrite
- nativeGeminiSlides
- organizationAdmin
- advancedGeneration
- auditLogging

# 18. OAuth / Drive

- Google Sign-In
- Google Picker
- least privilege
- commercial versionは `drive.file` 中心
- Shared DriveはCapability
- scopeは本番前に再確認

# 19. Firestore

Collection:
- users
- organizations
- memberships
- projects
- styles
- references
- designProfiles
- generationJobs
- decks
- subscriptions
- auditLogs

資料本文をFirestoreへ大量コピーしない。Document bodyはGoogle Driveを原則とする。

# 20. Organization / RBAC

個人ユーザーもPersonal Organizationを持つ設計推奨。

Role:
- owner
- admin
- member
- viewer

将来:
- billing_admin
- brand_manager

会社管理者がlock可能:
- logo
- colors
- font
- disclaimer
- prohibited expressions
- source/reference policies

# 21. Auth

Google Sign-In + Identity Platformまたは会社既存Auth Adapter。
既存MediToku GCP共通基盤があるなら再利用。

# 22. Billing

初期:
- Free
- Pro
- Team

将来:
- Business
- Enterprise

Stripe等はAdapter化。

# 23. Non-functional

Performance:
- shell first paint 1秒台目標
- click feedback 100ms以内
- Driveはskeleton + async
- generationはjob即作成

Reliability:
- retry + exponential backoff
- idempotency
- duplicate generation prevention
- partial failure isolation
- job recovery

Observability:
- structured logging
- requestId
- organizationId/userIdを最小限
- generationJobId
- external API latency
- error classification

Google障害時でもGuide/Settings/metadata UIは使える。

# 24. Security

- Secret Manager
- OAuth token protection
- least scope
- backend authorization
- organization isolation
- audit
- temporary file TTL
- dev/prod分離
- no secrets in repo/browser bundle
- file validation
- CSP等

医療情報対応は初期一般SaaSの自動前提にしない。必要なら別途法務・セキュリティ設計。

# 25. Error UX

禁止:
- white screen
- no response
- generic internal error only

必須:
- immediate visual response
- retry
- step state
- error code
- requestId

Error code例:
AUTH, PERMISSION, GOOGLE_QUOTA, GOOGLE_TRANSIENT, FILE_UNSUPPORTED, FILE_TOO_LARGE, GENERATION_INVALID, SLIDES_API, BILLING, INTERNAL。

# 26. GenerationJob

状態:
- queued
- analyzing
- planning
- awaiting_user
- generating
- rendering
- complete
- failed
- canceled

fields:
- percent
- currentStep
- message
- timestamps
- requestId

# 27. API

最低限:
- `GET /api/bootstrap`
- Projects CRUD
- Sources
- Styles CRUD + effective resolver
- References CRUD
- generation-jobs
- decks / thumbnails / export
- capabilities
- health

詳細は `04_API_SPEC.md`。

# 28. Test

Unit:
- style merge
- rule priority
- prompt construction
- deck validation
- capability routing

Integration:
- Drive
- Slides
- Firestore
- Auth
- Task queue

E2E Playwright:
Login → New Project → Source → Style → Outline → Slides → Preview → Open Slides → Reference。

# 29. Acceptance Criteria v1

商用β前:
- Google login
- Project CRUD
- Style CRUD
- Reference
- Picker
- Drive保存
- PDF/TXT analysis
- Outline generation
- Slides generation
- Preview thumbnail
- Open Slides
- PPTX export
- Progress
- Error recovery
- Basic organization/RBAC
- minimum audit
- dev/prod deploy

# 30. GCP Environment

推奨:
- `meditoku-slide-dev`
- `meditoku-slide-prod`

ただし会社既存GCP organization / shared infra / CI/CDに統合可能なら再利用。

必須:
- dev/prod data separation
- OAuth client separation
- secrets separation
- billing alert
- logging retention

# 31. Repository案

```text
meditoku-slide-studio/
  apps/web/
  packages/ui/
  packages/domain/
  packages/google-adapters/
  packages/generation/
  services/worker/
  docs/
  infra/
  tests/
```

小さく始めるなら単一Next.js repoでもよい。最初からmicroservice化しすぎない。

# 32. Domain Entity

- User
- Organization
- Membership
- Project
- Style
- Reference
- DesignProfile
- Source
- Deck
- GenerationJob
- Capability

Domain layerはGoogle API / Firestore SDKを直接知らない。

# 33. Legacy GASコード

`legacy_gas/current/`:
- Code.gs
- Index.html
- appsscript.json

`legacy_gas/history/`:
MVPからv5.1.6まで主要ZIPを保存。

これらを削除せず、behavior/referenceとして使う。

# 34. GAS → GCP mapping（概要）

Project / Drive:
- `mt33CreateProject`, `mt33ListProjects`, `mt33UploadSource`, `mt33ListSources`, `mt40GetProjectState`
→ ProjectService + SourceService + DriveAdapter

Style:
- `mt41ListStyles`, `mt41CreateStyle`, `mt41SaveStyle`, `mt41GetEffectiveStyle_`, `mt41BuildStyleContext`
→ StyleService + StyleResolver

Reference:
- `mt33RegisterReference`, `mt33ListReferences`, `mt41ListStyleReferences`
→ ReferenceService

Learning:
- `getDesignProfile`, `learnFromReferenceDecks`, `previewEditedDeckLearning`, `approveEditedDeckLearning`
→ DesignProfileService + LearningService

Slides:
- `createDeck`, `mt42GetPresentationSlides`, `exportPptx`
→ SlidesService + SlidesAdapter + ExportService

Reliability:
- `mt5GetCapabilities`, `mt5Bootstrap`, `mt5WithRetry_`, `mt5CreateDeck`, `mt5CreateProject`
→ CapabilityService + middleware + idempotency layer

詳細は `06_GAS_TO_GCP_MAPPING.md`。

# 35. そのまま移植しないもの

- HtmlService
- google.script.run
- Apps Script PropertiesService
- GAS global function API
- DriveApp
- SlidesApp
- LockService
- GAS HTML template hacks
- base target behavior

Behavior/logicを移し、実装は再構築。

# 36. Migration Phases

A. UI Skeleton / mock data  
B. Auth / Domain / Firestore  
C. Google OAuth / Picker / Drive / Slides  
D. Generation engine  
E. Style / Reference / Design DNA  
F. Billing / Audit / Production verification

# 37. Cursor最初のPR

1. packageを全部読む
2. Legacyを直接importしない
3. Next.js + TypeScriptを作成
4. Domain modelを定義
5. mock dataでv5 UXを再現
6. Playwrightを入れる
7. UIが安定してからAuth/Google API

First PR goal:
- login placeholder
- app shell
- sidebar
- new project modal
- style selector
- source dropzone
- preview pane
- guide/settings/reference/style dialogs
- responsive
- tests

# 38. UIで絶対に避けること

- ボタン無反応
- 初期ロードwhite screen
- Google API待ちでpage block
- modal openでserver await
- 1 errorで全UI停止
- Folder ID入力
- 永続的JSON貼付UX（最終的に隠す）
- 設定過多
- Project/Style/Template概念混同

# 39. 差別化

生成速度だけで競争しない。

- Google Drive native
- Google Slides native
- user-owned data
- reusable Style
- company + personal + use-case layering
- curated Reference
- human-approved learning
- Design DNA
- organization governance
- replaceable AI engines
- no proprietary editor lock-in
- PPTX / Slides仕上げ自由

# 40. Product message

**Your Slides. Your Drive. Your Style.**

日本語候補: **使うほど、あなたらしい資料になる。**

# 41. Cursor開始時の未確定事項

既存MediToku GCP環境で確認:
- common Auth
- monorepo
- CI/CD
- Firestore
- Cloud Run standard
- Secret Manager naming
- domain/DNS
- billing/Stripe
- monitoring/logging
- organization/user shared DB

既存があれば重複して新設しない。

# 42. 最重要原則

1. UIはシンプル、内部は高度
2. 資料本体はユーザー側に残す
3. Style / Referenceは長期資産
4. Googleのプラン名ではなくCapability
5. Google固有実装はAdapter化
6. AI engineは交換可能
7. 一部障害で全UIを止めない
8. 人の最終編集を尊重
9. 使うほど価値が増す
10. GASはPrototype、GCPが本番

# 43. Completion Definition

完成とはSlidesが出るだけではない。
- 初見ユーザーが説明なしで使える
- UIで迷わない
- Google一時エラーから回復
- company/personal/usecase Styleが機能
- Referenceが次回生成に効く
- files remain in user Drive
- admin governance
- progress
- monitoring
- dev/prod separation
- automated tests
- Google仕様変更時にAdapterだけで対応できる
