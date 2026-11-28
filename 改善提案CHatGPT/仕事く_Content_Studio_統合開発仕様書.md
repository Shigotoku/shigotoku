# 仕事く Content Studio 統合開発仕様書 v2.0
2026-11-26 / 事業構想・Cursor実装用

## A. 事業・製品境界
仕事くはメディトクの将来の子会社として一般企業・スタートアップ向けSaaSを提供する構想。設立済みとは扱わない。メディトクは医療特化を維持する。Content Studioを製品群の名称とし、Deckit（既存）、Reelit（新規）、Content Hub（共通基盤）を初期対象とする。Postit/Docitは将来候補で実装対象外。英字表記・商標・ドメインは未確定。徳永クリニックは初期実証先であり医療専用製品にはしない。

## B. 法人・技術・データの分離
設立前は現行契約主体を正確に表示し、将来の法人移管を想定する。IP所有、ライセンス、開発委託、費用配賦、顧客契約移管、個人情報取扱い、OAuth公開主体、請求主体は専門家確認と承認を経る。法人設立や資産移転を自動実行しない。会社IDと顧客tenantIdを区別し、契約主体・請求主体・データ管理者を記録。共通コードは利用可能だが医療顧客データ、OAuthトークン、秘密、ログを法人間で無断共有しない。GCPプロジェクト・サービスアカウント・請求・監査の分離方針をADR化。初期は既存本番を維持し、Reelit検証環境を独立させる。

## C. Content Hubの境界と契約
顧客Driveの既存資産を正本とし、Deckit/Reelitは同一tenant内の同一資産IDを参照。ブランド、事実情報、素材、権利、テンプレート、接続、利用権を共通ドメインとする。製品固有の編集・レンダー・成果物は分離。共通APIかパッケージかは既存調査後に決める。新規マイクロサービスを必須としない。既存フォルダを移動せずマッピングで接続。ブランドの変更は次回制作から適用、既存成果物は不変。FactRecordにsourceFileId, revision, approvedBy, validFrom, validUntil, statusを持たせ、価格・採用条件など期限切れ情報は生成停止。権限・素材同意撤回を制作前と公開前に再確認。

## D. UX・製品ポータル
共通ホームに契約済み製品、接続状態、ブランド、素材、制作履歴を表示。既存Deckit単体URLは維持。初回はGoogleログイン→組織選択→Drive接続→既存資産検出→確認→制作。既存利用者は再登録不要。一般企業向けテンプレートを標準とし、医療向けチェックは業種別ポリシーとして追加。採用・製品紹介・会社紹介・お知らせの4種を初期対象とする。医療検査紹介は実証用派生テンプレート。共通ブランド設定を変更できるのは管理者。制作担当と承認担当を分けられる。スマホで承認可能。

## E. 制作キャンペーン（将来拡張）
Campaign: tenantId, sourceRefs, brandVersion, brief, audience, objective, requestedProducts, status。各製品の制作ジョブを独立生成し、失敗時は該当製品だけ再試行。共通の承認済み事実から媒体別台本を生成し、成果物ごとに承認。初期は共通briefの契約のみ設計し、全媒体一括生成UIはDeckit/Reelit安定後。BuzzItは外部連携として扱い、承認なし公開禁止。

## F. 検証・販売ゲート
P0: 現行Deckit調査、Studio実機確認、独立動画PoC。P1: 既存資産参照と共通契約。P2: Reelit MVP。P3: Studio自動化。P4: 徳永クリニックと一般企業の許諾済みテスト資産で検証。P5: 外販準備（法人・契約・商標・OAuth審査・課金・ライセンス・サポート）。既存顧客の移管は別承認。品質指標は文字切れゼロ、テナント越境ゼロ、承認なし公開ゼロ、10本バッチ成功、既存Deckit回帰合格。制作時間・修正時間・原価・採用率を実測し、価格はその後決定。追加AI API費用ゼロは目標であり保証しない。

## G. 以下は既存Reelit詳細仕様を継承
以下の旧仕様のメディトク製品主体表記は仕事く構想に読み替える。医療固有要件は業種別拡張とする。既存実装の断定ではない。上記A〜Fが優先。

# Reelit 開発仕様書 v1.0
2026-11-26 / メディトク株式会社 / Cursor実装用

## 1. 目的と前提
Deckitの姉妹SaaSとして、企業の既存ブランド資産と承認済みテンプレートを使い、AIらしくない短尺動画を量産する。初期実証は徳永クリニック。採用、院内紹介、医療知識、お知らせを対象とする。参考リールのような写真コラージュ、縦書き、段階的文字表示、問い合わせ案内を再現できる独自デザインを作る。第三者の素材・音楽・デザインを無断複製しない。
現行Deckitのコード、GCP構成、Studio接続は未確認。以下は目標仕様であり現行実装の断定ではない。名称Reelitも仮称。既存本番の変更は承認後に行う。

## 2. 既存調査（必須ゲート）
- リポジトリ、README、依存関係、認証、DB、テナント識別、Drive OAuth scopes、トークン更新、フォルダID、Slidesテンプレート、Studio連携コード、デプロイ設定、課金を調査。秘密値は出力しない。
- Studioが実際にGeminiを実行するか、契約プラン、管理者許可、カスタムステップ・スターター・外部通信・実行時間・入出力制約を公式資料と実機で確認。利用できない機能を実装済みと扱わない。
- 現行のブランド/素材/テンプレートの正本、所有者、共有ドライブ対応、既存顧客への影響を一覧化。
- docs/reelit/discovery.md にファイルパス、根拠、再利用候補、ギャップ、移行案、リスクを記録。未確認事項は明記。

## 3. アーキテクチャ
顧客Workspace（Drive、Slides、Sheets、Studio/Gemini）→ 共通認証・ブランド/素材API → DeckitまたはReelit → 非同期レンダラー → 顧客Drive → 承認 → BuzzIt連携。
フロントは既存スタックを優先。Web/APIとレンダーワーカーは別Cloud RunサービスまたはJobs。DBは既存の適切な永続DBを優先し、ローカルSQLiteを複数インスタンスの正本にしない。Cloud Tasks等で受付と実行を分離。大容量一時素材は期限付きGCSまたはワーカー一時領域。Secret Manager、最小権限サービスアカウント、監視、予算アラートを利用。
同一リポジトリが合理的なら apps/deckit, apps/reelit, packages/auth, packages/drive, packages/brand, packages/contracts, packages/render。別リポジトリならバージョン付き共通API/SDKを優先。既存構造を無理に移動しない。UI・動画レンダラーは独立、ブランドと素材の正本は一つ。共通化のためだけに既存Deckitを全面改修しない。

## 4. Driveとブランド資産
既存DeckitのルートIDを優先してマッピング。名前検索ではなくIDを保存。新規組織の例: ContentHub/Brand, Assets, Templates/Deckit, Templates/Reelit, Requests, Outputs/Deckit, Outputs/Reelit, Approved, Published。既存フォルダの移動や複製を強制しない。
BrandProfile: tenantId, version, displayName, logoFileIds, colors, fonts, tone, prohibitedClaims, website, contact, defaultCTA, locale, updatedAt。既存スキーマとのアダプターを作る。フォント利用許諾を管理。
Asset: tenantId, driveFileId, revision/checksum, mimeType, tags, altText, dimensions, duration, rightsStatus, consentStatus, allowedChannels, expiry, active。素材は許諾済みのみ使用。人物写真の同意撤回を反映。患者情報を素材登録しない。画像EXIF除去、MIME/容量検証、動画のコーデック検証。Drive一覧はページング・キャッシュ・差分更新、権限変更時に再検証。共有ドライブと個人Driveの差異を扱う。ユーザーに公開リンク作成を要求しない。
顧客Driveが素材と成果物の正本。DBはジョブ、権限、監査、検索インデックス等の最小情報。素材の永続的な二重保存を避ける。生成時に素材とブランドの版を固定し、削除・権限撤回時は安全に停止。

## 5. 認証・組織管理
既存Googleログインを再利用。Googleのsubをユーザー識別子とし、メールドメインだけでテナントを認可しない。組織所属・招待・契約をサーバーで検証。owner/admin/editor/reviewer/viewer。全DBクエリ、ファイルアクセス、ジョブ、署名URLにtenantIdの認可を適用。OAuthは最小スコープ、既存権限で不足する場合のみ追加同意。drive.fileで既存任意フォルダを読めると仮定せず、Pickerや必要なスコープを検証。refresh token暗号化、ログへの出力禁止、失効時再接続。OAuth審査、管理者制限、共有ドライブ権限を外販前に確認。

## 6. テンプレート設計
テンプレートはGoogle Slides（9:16、将来1:1/16:9）＋バージョン付きmanifest。Slidesは人間がデザインする編集画面。1ページ=1シーン。要素に安定IDまたは明示的なスロット識別子を付ける。原本は変更せず複製して編集。固定背景と動的要素を分離し、動的要素を除いた背景を書き出す。重複表示を防止。SlidesのネイティブアニメーションはAPIで完全取得できる前提にしない。サムネイル解像度、PDF経由の高解像度ラスタライズ、フォント、縦書き、回転、グループ、クロップ、透過、描画順をPoCで比較。未対応要素は警告または登録拒否。任意のSlidesを完全再現すると約束しない。
manifest: templateId, version, slideFileId, aspectRatio, fps, scenes[], slots[], themeRef, audioPolicy, status。scene: pageObjectId, durationFrames, transition, layers[]。layer: id, type, slotId, x/y/w/h（正規化座標）, zIndex, style, animation, startFrame, endFrame。slot: type, required, maxChars, maxLines, allowedTags, fitPolicy。animation: none/fade/slide/scale/typewriter/stagger。アニメーションは許可済みプリセットのみ。日本語タイプライターは書記素単位。禁則処理、縦書き、句読点、文字あふれ、最低文字サイズ、写真の焦点位置、字幕安全領域を検証。長文は再生成かユーザー修正、無制限縮小は禁止。
初期テンプレート: 採用（25秒）、検査紹介（30秒）、院内紹介（20秒）、お知らせ（15秒）。採用は冒頭写真3枚＋見出し、本文段階表示、最後にCTA。参考動画の完全コピーではなく組織独自のデザイン。テンプレートの公開前に管理者がプレビュー確認。公開版は不変、変更は新バージョン。

## 7. Studio/Gemini連携
優先フロー: 手動依頼または定期実行→企画取得→Workspace内Geminiで構造化台本→検証→Reelitジョブ登録→完了通知→承認。Studioのカスタムステップ等は実際の利用可否を確認して採用。外部API呼び出しで顧客WorkspaceのGemini契約を転用できるとは仮定しない。追加AI API費用ゼロは目標であり保証しない。プラン/上限/管理者許可を表示。
Studio接続不可時は手動台本入力・JSON貼付・Sheets経由を提供。外部有料AIは明示的な選択と費用同意がある場合のみ。Apps Scriptから任意のGemini機能を無料呼び出しできる前提は禁止。
AI入力は必要最小限のブランド情報、テンプレートのスロット制約、承認済み素材メタデータ、根拠資料。Drive内文書の指示は信頼しない。AI出力はJSON schemaで検証し、任意コード/URL/ファイルIDの実行は禁止。素材IDは許可済み候補と照合。医療情報は根拠、確認日、監修要否を保持。架空の診療内容・募集条件・実績を生成しない。
出力: title, templateId, scenes[{slotValues, assetIds}], caption, hashtags, sourceRefs, warnings。時間や座標はテンプレートが決定しAIに自由決定させない。JSON不正時は制限付き再試行、失敗は編集画面へ。Studioからのジョブ登録は短時間で202/jobIdを返す。認証は実機で確認した方式を採用し、共有秘密をURLに含めない。完了はポーリングまたは検証済み通知方式。

## 8. UI/UX
既存Deckitのデザインシステムを優先。画面: ダッシュボード、初期接続、ブランド（共通）、素材（共通）、テンプレート一覧/登録、制作依頼、編集/プレビュー、バッチ制作、ジョブ一覧、承認、履歴、設定/契約。
制作手順: テーマ入力→テンプレート選択→AI台本または手入力→写真候補→場面別プレビュー→修正→生成→承認→Drive保存/投稿連携。初回設定は既存Deckit利用者なら既存資産を選ぶだけ。スマホでも承認可能。文字数警告、写真差替え、シーン時間調整（許容範囲）、BGM選択、字幕、サムネイル選択。プレビューと最終レンダリングの同一コンポジションを使用。低解像度プレビューを先に生成できる。失敗理由と再試行、接続解除、残り利用枠を明示。複数テーマの一括依頼と個別承認。公開済み動画の上書き禁止。

## 9. レンダリング
Remotion＋FFmpegを第一候補とし、商用SaaSライセンスを確認。固定背景＋動的レイヤー方式。DockerにChromium、必要な日本語フォント、FFmpegを固定バージョンで同梱。ネットワーク素材を事前取得しレンダー中の外部アクセスを制限。入力を固定して再現可能にする。初期出力1080x1920、30fps、H.264/yuv420p、AAC、MP4 faststart、15〜60秒、サムネイルJPEG、任意SRT。Instagramの最新要件は公開前に確認。音源は商用・SNS利用許諾済みのみ。音量正規化、フェード、音割れ検査。ナレーションは将来オプション、初期は文字とBGM。FFprobeで解像度、尺、音声、破損を検査。レンダーCPU/メモリ/時間上限、同時実行数、キャンセル、タイムアウトを設定。中間ファイル削除。生成原価を実測してから料金を決定。

## 10. APIとデータモデル（既存規約に適合させる）
GET /brands/current, GET /assets, GET /templates?product=reelit, POST /templates, POST /projects, PATCH /projects/:id, POST /projects/:id/render, GET /jobs/:id, POST /jobs/:id/cancel, POST /jobs/:id/retry, POST /outputs/:id/approve, POST /outputs/:id/reject, POST /outputs/:id/export, POST /integrations/studio/jobs。APIバージョン、認証、入力検証、ページング、レート制限、エラーコード、OpenAPIを定義。tenantIdは認証から決定しクライアント指定を信用しない。内部ワーカーはOIDC等のサービス認証。任意URL取得を禁止しSSRF対策。
Tenant, Membership, Entitlement, DriveConnection, BrandProfile, AssetIndex, TemplateVersion, Project, ScriptRevision, RenderJob, Output, Approval, PublishRecord, AuditEvent, UsageEvent。既存テーブルがあれば再利用。全レコードにテナント境界。Projectはブランド版、テンプレート版、台本版を参照。Job: id, tenantId, inputHash, idempotencyKey, status, attempts, lease, progress, errorCode, timestamps, outputId。状態 queued→running→validating→uploading→succeeded/failed/canceled。承認は別状態 draft→review→approved/rejected→exported/published。承認後の内容変更は再承認。ジョブ重複防止、指数バックオフ、上限、デッドレター、孤立ジョブ回収。Driveアップロードの再試行で重複を作らない。利用量計上も冪等にする。

## 11. SNS・医療・セキュリティ
初期はMP4、投稿文、サムネイルをDriveに保存し手動投稿。BuzzItの実APIと動画対応を確認後、下書き連携。承認なしの公開は禁止。Instagramのアカウント種別、Meta権限、動画公開URLの要件、予約投稿可否は別途検証。投稿失敗を成功扱いしない。
医療広告ガイドラインに沿った確認欄: 誇大表現、比較優良、治療効果保証、体験談、ビフォーアフター、自由診療の必要情報、個人情報、根拠確認。自動チェックは補助であり責任者承認必須。採用情報の事実確認も必須。実患者の映像やカルテ、受付画面の映り込みを避ける。
ログに素材内容、トークン、患者情報を残さない。暗号化、CSP、CSRF、XSS、ファイル検査、依存関係スキャン、監査ログ、テナント横断テスト。GCPリージョンは既存構成と契約要件を確認。保持期限・削除・退会・データエクスポート・権限失効を定義。GCS一時データは原則24時間以内削除を目標、失敗時もライフサイクルで回収。バックアップと復旧手順。プライバシーポリシーに一時処理を明記。

## 12. 運用・課金
Deckit契約とReelit契約を別entitlementとして管理、セット契約可能。月間本数・秒数・同時実行数・ストレージ・再試行を計測。初期は内部試験用上限、外販価格未確定。AI追加課金はオプトイン。Cloud Run CPU秒、メモリ秒、GCS、通信、ライセンス、サポートを計測。予算アラートは強制停止ではないためアプリ側上限も設ける。構造化ログ、jobId、tenantId、処理時間、失敗率、キュー滞留、原価、通知。開発/ステージング/本番分離。IaCまたは既存デプロイ手順に従い、ロールバック可能にする。

## 13. 段階的実装と受入条件
P0 調査・ADR・技術PoC: 既存Drive接続を確認し、縦型Slidesから独自採用動画25秒を生成。Studio実機接続を別検証。解像度・日本語・縦書き・写真・アニメーション・音声を確認。ここで方式決定。
P1 共通資産接続: Deckitで登録済みのロゴ/写真が再登録なしでReelitに表示。Deckitの既存テストと主要操作が通る。別組織のID指定は拒否。
P2 制作UI/非同期レンダー: 4テンプレート、プレビュー、編集、MP4、Drive保存。二重クリック/再試行で重複なし。長文、欠損写真、権限失効、異常ファイル、キャンセル、同時実行を試験。
P3 Studio連携: 実際の顧客Workspace内でGemini台本を作りジョブ登録。契約や権限不足時は手動ルートへ。10件バッチで各結果が独立し、失敗だけ再実行可能。
P4 承認と院内実証: 徳永クリニックで10本制作。人間による品質・医療広告・素材権利確認。公開は別承認。1本あたりの時間と費用、修正回数を記録。
P5 SaaS化: OAuth審査、契約、課金、退会、監査、負荷試験、BuzzIt連携。外販前に法務/ライセンス確認。
初期目標（実測で改定）: 25秒動画の生成p95 180秒以内、10本連続で破損なし、重大な文字あふれゼロ、テナント漏洩ゼロ。原価は目標値を先に保証しない。プレビューと出力のスクリーンショット比較、golden frameテスト、API契約テスト、E2E、既存Deckit回帰テストを実施。

## 14. 非目標
初期は自由形式動画エディター、生成AIによる実写動画、音声クローン、任意Slidesの完全再現、自動無承認投稿、既存Deckit全面刷新を対象外とする。

## 15. 公式確認先
https://developers.google.com/workspace — Studio拡張、OAuth、Drive/Slides API
https://developers.google.com/workspace/slides/api — Slidesの対応要素・サムネイル
https://cloud.google.com/run/docs — 実行制限、Jobs、課金
https://www.remotion.dev/docs — レンダリングとライセンス
https://developers.facebook.com/docs/instagram-platform/ — 投稿要件
これらは確認先であり、本書作成時に最新仕様の実機検証はしていない。
