/**
 * リモート MCP エンドポイント（Streamable HTTP・ステートレス）。
 * どの AI（ChatGPT / Claude / Gemini / Cursor 等）でも、URL とキーだけでバジットへ下書きを送れる。
 * 安全設計: 承認・予約確定・投稿はできない（常に下書きまで）。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Response } from 'express';
import {
  addCandidatesFromAi,
  checkDuplicates,
  getCandidate,
  listCandidates,
  targetOf,
  updateCandidate,
} from './postCandidates';
import {
  APP_ORIGIN,
  agentRouter,
  requireAgentKey,
  opAddIdea,
  opAdaptPost,
  opCheckDuplicate,
  opCreateDraft,
  opGetPost,
  opGetUploadUrl,
  opListIdeas,
  opLintPost,
  opListScheduled,
  opOverview,
  opGetPlan,
  opPlanGaps,
  opPerformance,
  opSearchPosts,
  opTagReport,
  opUploadMedia,
  type AgentCtx,
  type AgentRequest,
} from './agentApi';
import { listXSeries, createXSeriesChecked, addXSeriesItems } from './xSeries';
import {
  assertTarget,
  buildUtmUrl,
  opGetAccount,
  opGetApiUsage,
  opGetOperationLogs,
  opGetPostMetrics,
  opGetSeries,
  opGetSeriesReport,
  opListAccounts,
  opListCharacters,
  opListSeries,
  opUpdateDraft,
  opUpsertPlan,
  opUpsertSeries,
  opWeeklyReport,
  opWhoAmI,
  withIdempotency,
} from './agentExtras';

const PLATFORM = z
  .enum(['x_thread', 'instagram', 'facebook', 'threads', 'line', 'gbp', 'youtube_shorts', 'tiktok'])
  .describe('x_thread=X / instagram / facebook / threads / line / gbp=Googleビジネス / youtube_shorts / tiktok');

const INSTRUCTIONS = `バジット(Buzzit)は SNS 投稿の管理アプリです。あなたは「編集長」として下書きを作り、人が確認・承認・予約します（あなたは投稿できません）。
まず whoami で「接続中のキャラ（ID・名前）」と接続済みSNSアカウントを確認する。この接続はそのキャラ専用で、別キャラ・別アカウントは操作できない（曖昧なら中止して人に確認する）。投稿シリーズは list_series、登録は upsert_plan（既定はプレビューのみ。保存は人が内容と対象キャラを確認してから dryRun=false + characterId）。実績は未取得を0として扱わず、無いデータの成果や理由を創作しない（get_series_report / get_weekly_report の facts と hypotheses を区別して報告）。X APIの読み取りは費用がかかるため使わず、実績は人が手入力またはCSV取り込みする。
推奨手順: 0) 投稿計画があれば plan_gaps で埋めるべき枠（日時・媒体・テーマ）を取得し、その枠に沿って作る 1) overview か tag_report / performance_report で現状と過去の実績（伸びた型）を確認 2) 使用回数の多いタグ・直近の内容と被らない切り口を選ぶ 3) check_duplicate で重複確認 / lint_post で表現チェック 4) 画像/動画があれば upload_media か get_upload_url で送る 5) tags を付けて create_draft 6) 他SNSに展開するなら adapt_post(dryRun で確認→作成)。
投稿候補は BuzzIt が正本。candidates_unused でネタを探し、candidates_check_duplicate（完全一致・表現・テーマ・結論・オチ・投稿済み）で確認してから create_draft。候補の追加は candidates_import（列名は自由・既定プレビュー）、修正案は candidates_update の aiSuggestion。採用・下書き移行・予約・投稿は人が画面で行う。
X自動投稿のシリーズ（カテゴリ別の在庫）は x_series_list → x_series_create → x_series_add_items で自由に作れる（投稿OKは人が画面で付ける）。
X は本文280字（スレッドは「---」だけの行で区切る・最大5投稿）。Instagram は画像必須、YouTube Shorts / TikTok は動画必須、Googleビジネスはハッシュタグ不要。`;

function buildServer(ctx: AgentCtx): McpServer {
  const server = new McpServer(
    {
      name: 'buzzit',
      title: 'BuzzIt',
      version: '0.4.0',
      websiteUrl: APP_ORIGIN,
      icons: [
        { src: `${APP_ORIGIN}/icon-256.png`, mimeType: 'image/png', sizes: ['256x256'] },
        { src: `${APP_ORIGIN}/favicon.svg`, mimeType: 'image/svg+xml', sizes: ['any'] },
      ],
    }, { instructions: INSTRUCTIONS });
  const run = async (fn: () => Promise<unknown>) => {
    try {
      return { content: [{ type: 'text' as const, text: JSON.stringify(await fn(), null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }] };
    }
  };

  server.registerTool(
    'overview',
    {
      description: '全体像を取得: 状態別・媒体別の件数、今後の予定、下書き、直近の投稿結果（インプレッション付き）、失敗。まずこれを呼ぶ。',
      inputSchema: {},
    },
    () => run(() => opOverview(ctx)),
  );

  server.registerTool(
    'list_scheduled',
    {
      description: '投稿予定・下書き・履歴の一覧。status はカンマ区切り（draft,pending,pending_approval,published,failed）。',
      inputSchema: { status: z.string().optional() },
    },
    ({ status }) => run(() => opListScheduled(ctx, status)),
  );

  server.registerTool(
    'get_post',
    {
      description: '1件の詳細（全文・画像・投稿結果・Xの投稿URL・インプレッション等）。',
      inputSchema: { jobId: z.string() },
    },
    ({ jobId }) => run(() => opGetPost(ctx, jobId)),
  );

  server.registerTool(
    'search_posts',
    {
      description: '過去の投稿をルールベースで検索（キーワード・タグ・媒体・状態・期間）。',
      inputSchema: {
        query: z.string().optional(),
        tags: z.array(z.string()).optional(),
        platform: PLATFORM.optional(),
        status: z.string().optional(),
        days: z.number().int().positive().optional().describe('直近N日'),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    (q) => run(() => opSearchPosts(ctx, q)),
  );

  server.registerTool(
    'tag_report',
    {
      description:
        'タグ別の投稿実績（回数・最終日・平均インプレッション・直近の例）と、最近使っていないタグ。「同じタイプの投稿を過去にどう作ったか」を確認し、被らない領域の投稿を作るために使う。',
      inputSchema: {
        platform: PLATFORM.optional(),
        days: z.number().int().positive().default(90),
      },
    },
    (q) => run(() => opTagReport(ctx, q)),
  );

  server.registerTool(
    'get_plan',
    { description: '登録済みの投稿計画（曜日×時刻×媒体×テーマ）を取得する。', inputSchema: {} },
    () => run(() => opGetPlan(ctx)),
  );

  server.registerTool(
    'plan_gaps',
    {
      description:
        '投稿計画のうち、まだ投稿・下書きが入っていない枠（日時・媒体・テーマ・タグ）を返す。各枠を create_draft で埋めれば計画どおりの運用になる。',
      inputSchema: { weeks: z.number().int().min(1).max(8).default(2) },
    },
    ({ weeks }) => run(() => opPlanGaps(ctx, { weeks })),
  );

  server.registerTool(
    'performance_report',
    {
      description:
        '成果レポート（ルールベース）: 伸びた投稿 TOP5、平均インプレッションが高いタグ・曜日・時間帯。伸びる領域を増やす企画づくりに使う。',
      inputSchema: { platform: PLATFORM.optional(), days: z.number().int().positive().default(180) },
    },
    (q) => run(() => opPerformance(ctx, q)),
  );

  server.registerTool(
    'check_duplicate',
    {
      description: '案の文章が過去の投稿・予約・ネタと似ていないか確認（ルールベース、0.5以上で重複の可能性大）。下書き作成の前に必ず呼ぶ。',
      inputSchema: { text: z.string().min(1), platform: PLATFORM.optional(), tags: z.array(z.string()).optional() },
    },
    ({ text, platform, tags }) => run(() => opCheckDuplicate(ctx, text, { platform, tags })),
  );

  server.registerTool(
    'lint_post',
    {
      description:
        '投稿文のルールベース簡易チェック。医療広告ガイドライン・景表法で問題になりやすい表現（効果の保証・最上級・体験談・ビフォーアフター等）や媒体仕様（InstagramはJPEGのみ等）を警告する。下書き作成前に使う。法的判断ではない。',
      inputSchema: { text: z.string().min(1), platform: PLATFORM.optional(), mediaUrls: z.array(z.string()).optional() },
    },
    (a) => run(() => opLintPost(ctx, a)),
  );

  server.registerTool(
    'list_ideas',
    { description: 'ネタ帳（ネタInbox）の一覧。', inputSchema: {} },
    () => run(() => opListIdeas(ctx)),
  );

  server.registerTool(
    'add_idea',
    {
      description: 'ネタ帳にネタを追加する（投稿はされない）。制度・AIニュース等は sourceUrl（一次情報のURL）と publishedAt（発表日）を付ける。',
      inputSchema: {
        text: z.string().min(1).max(1800),
        sourceUrl: z.string().url().optional(),
        publishedAt: z.string().max(30).optional().describe('発表日 例 2026-11-01'),
        seriesName: z.string().max(60).optional().describe('候補シリーズ'),
      },
    },
    ({ text, sourceUrl, publishedAt, seriesName }) => {
      const meta = [
        seriesName ? `候補シリーズ: ${seriesName}` : '',
        sourceUrl ? `出典: ${sourceUrl}` : '',
        publishedAt ? `発表日: ${publishedAt}` : '',
        `確認日: ${new Date().toISOString().slice(0, 10)}`,
      ].filter(Boolean);
      return run(() => opAddIdea(ctx, `${text}\n（${meta.join(' / ')}）`.slice(0, 2000)));
    },
  );

  server.registerTool(
    'upload_media',
    {
      description:
        '画像・動画をバジットに保存して公開URL(mediaUrl)を得る。url（https の公開URL）を渡すのが基本。極小の画像（約700KBまで）のみ base64 でも可。大きな動画は get_upload_url を使う。画像10MB・動画50MBまで。',
      inputSchema: {
        url: z.string().url().optional(),
        base64: z.string().optional(),
        contentType: z.string().optional().describe('例 image/png, image/jpeg, video/mp4（base64 のとき必須）'),
        fileName: z.string().optional(),
      },
    },
    (a) => run(() => opUploadMedia(ctx, a)),
  );

  server.registerTool(
    'get_upload_url',
    {
      description: '大きな動画向け。署名付きアップロードURLを返す。AI側が PUT で送信後、mediaUrl を create_draft に渡す。',
      inputSchema: { fileName: z.string(), contentType: z.string() },
    },
    (a) => run(() => opGetUploadUrl(ctx, a)),
  );

  server.registerTool(
    'create_draft',
    {
      description:
        '投稿の下書きを1件作る（必ず下書き。人が承認・予約するまで投稿されない）。媒体ごとに1件ずつ作る。tags（例: ["医療制度","初心者向け"]）と topic を必ず付けると、後で tag_report で被り確認ができる。scheduledAt は未来のISO8601（例 2026-11-20T12:00:00+09:00）。X のスレッドは本文を「---」だけの行で区切る。Instagram・GBP は mediaUrls に画像、YouTube Shorts・TikTok は動画が必要。',
      inputSchema: {
        platform: PLATFORM,
        scheduledAt: z.string(),
        content: z.string().min(1).max(5000),
        label: z.string().optional(),
        mediaUrls: z.array(z.string().url()).max(6).optional(),
        tags: z.array(z.string()).max(10).optional(),
        topic: z.string().max(80).optional().describe('この投稿の主題（例: 医療費控除の基本）'),
        aiGeneratedMedia: z.boolean().optional().describe('画像・動画をAIで生成/大幅加工した場合 true（X・Instagramの公式AIラベルを付けて投稿される）'),
        characterId: z.string().optional().describe('対象キャラID（whoami で確認）。接続中のキャラと違う場合は中止される'),
        idempotencyKey: z.string().min(8).max(80).optional().describe('重複送信防止キー。同じキーで再実行しても二重に作られない'),
      },
    },
    ({ platform, scheduledAt, content, label, mediaUrls, tags, topic, aiGeneratedMedia, characterId, idempotencyKey }) =>
      run(() =>
        withIdempotency(ctx, 'create_draft', idempotencyKey, async () => {
          await assertTarget(ctx, characterId);
          return opCreateDraft(ctx, {
            scheduledAt,
            contents: [{ platform, label: label ?? '投稿', content }],
            mediaUrls,
            tags,
            topic,
            aiGeneratedMedia,
          });
        }),
      ),
  );

  server.registerTool(
    'adapt_post',
    {
      description:
        '既存の投稿（jobId）または文章（text）を、他SNS向けの形式（文字数・ハッシュタグ・画像/動画要件）に整えて下書き化する。ルールベース。まず dryRun=true でプレビューと警告を確認し、問題なければ dryRun=false で scheduledAt を付けて作成。例: Xの投稿 → instagram / gbp / line。',
      inputSchema: {
        jobId: z.string().optional(),
        text: z.string().optional(),
        mediaUrls: z.array(z.string().url()).optional(),
        targets: z.array(PLATFORM).min(1),
        scheduledAt: z.string().optional().describe('基準日時。複数媒体は30分ずつずらして作成'),
        tags: z.array(z.string()).optional(),
        dryRun: z.boolean().default(true),
      },
    },
    (a) => run(() => opAdaptPost(ctx, a)),
  );

  server.registerTool(
    'x_series_list',
    {
      description:
        'X自動投稿の「シリーズ」（論文・医療ニュース等のカテゴリ在庫）一覧と、各シリーズの在庫件数。シリーズを作る前に必ず呼んで、既存と被らないか確認する。',
      inputSchema: {},
    },
    () => run(() => listXSeries(ctx.uid, ctx.personaId)),
  );

  server.registerTool(
    'x_series_create',
    {
      description:
        'X自動投稿のシリーズを新規作成する（同名があればそれを返す）。例: name="C_医療あるある"。作成後は x_series_add_items でネタを入れる。',
      inputSchema: { name: z.string().min(1).max(40), description: z.string().max(200).optional() },
    },
    ({ name, description }) =>
      run(() => createXSeriesChecked(ctx.uid, { name, description, personaId: ctx.personaId })),
  );

  server.registerTool(
    'x_series_add_items',
    {
      description:
        'シリーズの在庫にツイート案を追加する。必ず「未承認」で入り、人がバジット画面で「投稿OK」にするまで投稿されない。text=ツイート本文（280字以内・スレッドは「---」行で区切る）、tags=ハッシュタグ文字列、imageUrl は upload_media で得た公開URL。scheduledAt を付けるとその時刻に投稿（人の承認後）。',
      inputSchema: {
        seriesId: z.string(),
        items: z
          .array(
            z.object({
              text: z.string().min(1).max(1200),
              tags: z.string().max(200).optional(),
              imageUrl: z.string().url().optional(),
              scheduledAt: z.string().optional().describe('ISO8601。例 2026-11-20T07:30:00+09:00'),
            }),
          )
          .min(1)
          .max(50),
      },
    },
    ({ seriesId, items }) =>
      run(async () => {
        const created = await addXSeriesItems(
          ctx.uid,
          seriesId,
          items.map((i) => ({ ...i, approved: false })),
        );
        return { added: created.length, note: '未承認で追加しました。バジットの画面で「投稿OK」にすると投稿されます。', items: created };
      }),
  );

  // ===== 追加ツール（キャラ確認・シリーズ/計画・下書き編集・実績・レポート） =====
  const CHAR = z.string().optional().describe('対象キャラID（whoami で確認）。接続中のキャラと違う場合は中止される');
  const IDEM = z.string().min(8).max(80).optional().describe('重複送信防止キー。同じキーで再実行しても二重に作られない');
  const SLOT = z.object({
    id: z.string().optional(),
    weekday: z.number().int().min(0).max(6).describe('0=日 … 6=土'),
    time: z.string().regex(/^\d{2}:\d{2}$/).describe('HH:MM（日本時間）'),
    platform: z.string().default('x_thread'),
    seriesName: z.string().max(60).optional().describe('シリーズ名'),
    theme: z.string().max(80).optional(),
    purpose: z.string().max(200).optional().describe('主な目的'),
    audience: z.string().max(100).optional(),
    category: z.string().max(60).optional(),
    tone: z.string().max(200).optional(),
    mediaKind: z.string().max(60).optional().describe('画像・漫画・動画などの指定'),
    rules: z.string().max(600).optional().describe('投稿作成ルール'),
    ngRules: z.string().max(600).optional().describe('禁止表現・注意事項'),
    product: z.string().max(80).optional(),
    tags: z.array(z.string()).max(5).optional(),
    active: z.boolean().optional(),
  });

  server.registerTool('whoami', { description: '接続中のキャラ（ID・名前）と、そのキャラのSNSアカウントの接続状態を返す。最初に呼んで対象を確認する。', inputSchema: {} }, () => run(() => opWhoAmI(ctx)));
  server.registerTool('list_characters', { description: '操作できるキャラの一覧。操作対象は connected=true の1キャラのみ。', inputSchema: {} }, () => run(() => opListCharacters(ctx)));
  server.registerTool('list_accounts', { description: '接続中キャラのSNSアカウント一覧（接続状態・表示名。認証情報は返さない）。', inputSchema: {} }, () => run(() => opListAccounts(ctx)));
  server.registerTool('get_account', { description: 'アカウント詳細（platform=x など）。', inputSchema: { platform: z.string() } }, ({ platform }) => run(() => opGetAccount(ctx, platform)));
  server.registerTool('list_series', { description: '投稿シリーズ（曜日・時刻・媒体・目的・トーン・ルール等）の一覧。', inputSchema: {} }, () => run(() => opListSeries(ctx)));
  server.registerTool('get_series', { description: 'シリーズ1件の設定を取得。', inputSchema: { seriesId: z.string() } }, ({ seriesId }) => run(() => opGetSeries(ctx, seriesId)));
  server.registerTool(
    'preview_plan',
    { description: '投稿計画（シリーズ枠）を登録した場合の変更内容（追加・更新）をプレビューする。保存しない。', inputSchema: { slots: z.array(SLOT).min(1).max(40) } },
    ({ slots }) => run(() => opUpsertPlan(ctx, { slots, dryRun: true })),
  );
  server.registerTool(
    'upsert_plan',
    {
      description:
        '投稿計画（シリーズ枠）の作成・更新。既定は dryRun=true（プレビューのみ）。保存するには dryRun=false と characterId が必要。既存枠は削除せず、同じ内容を再実行しても増えない。下書き・予約は作らない。',
      inputSchema: { slots: z.array(SLOT).min(1).max(40), dryRun: z.boolean().default(true), characterId: CHAR, idempotencyKey: IDEM },
    },
    ({ slots, dryRun, characterId, idempotencyKey }) => run(() => withIdempotency(ctx, 'upsert_plan', dryRun ? undefined : idempotencyKey, () => opUpsertPlan(ctx, { slots, dryRun, characterId }))),
  );
  server.registerTool(
    'upsert_series',
    {
      description: 'シリーズ1件の作成・更新（upsert_plan の1件版）。既定は dryRun=true。',
      inputSchema: { series: SLOT, dryRun: z.boolean().default(true), characterId: CHAR, idempotencyKey: IDEM },
    },
    ({ series, dryRun, characterId, idempotencyKey }) => run(() => withIdempotency(ctx, 'upsert_series', dryRun ? undefined : idempotencyKey, () => opUpsertSeries(ctx, { series, dryRun, characterId }))),
  );
  server.registerTool(
    'update_draft',
    {
      description: '下書き(draft)の本文・日時・タグ等を編集する。承認待ち・予約済み・投稿済みは変更できない（画面で編集）。投稿はされない。',
      inputSchema: {
        jobId: z.string(),
        content: z.string().max(5000).optional(),
        scheduledAt: z.string().optional(),
        tags: z.array(z.string()).max(10).optional(),
        topic: z.string().max(80).optional(),
        mediaUrls: z.array(z.string().url()).max(6).optional(),
        characterId: CHAR,
        idempotencyKey: IDEM,
      },
    },
    ({ idempotencyKey, ...rest }) => run(() => withIdempotency(ctx, 'update_draft', idempotencyKey, () => opUpdateDraft(ctx, rest))),
  );
  server.registerTool(
    'get_post_metrics',
    { description: '1投稿の実績（インプレッション等・24h/72h/7日/28日のスナップショット・1,000表示あたりの反応）。未取得は null で、0ではない。', inputSchema: { jobId: z.string() } },
    ({ jobId }) => run(() => opGetPostMetrics(ctx, jobId)),
  );
  server.registerTool(
    'get_series_report',
    { description: 'シリーズ別・曜日別・時刻別・画像有無別・URL有無別・形式別の実績（平均・中央値・1,000表示あたり。5件未満は少数サンプル表示）。実績未登録の投稿は含めず件数を明示。', inputSchema: { days: z.number().int().min(7).max(365).default(90), seriesName: z.string().optional() } },
    ({ days, seriesName }) => run(() => opGetSeriesReport(ctx, { days, seriesName })),
  );
  server.registerTool(
    'get_weekly_report',
    { description: '週次レポート用の実データ（今週の投稿数・成果・トップ/下位・シリーズ別・製品投稿比率・4週比較）と、ルールベースの仮説。データが無い項目は創作しないこと。', inputSchema: {} },
    () => run(() => opWeeklyReport(ctx)),
  );
  server.registerTool('get_api_usage', { description: 'APIの利用状況と費用の目安（X自動取得のON/OFF、実績の保存方法の内訳）。', inputSchema: {} }, () => run(() => opGetApiUsage(ctx)));
  server.registerTool(
    'get_operation_logs',
    { description: 'AI操作・実績取り込み・投稿エラー等の操作履歴。', inputSchema: { limit: z.number().int().min(1).max(100).default(30) } },
    ({ limit }) => run(() => opGetOperationLogs(ctx, limit)),
  );
  server.registerTool(
    'build_utm_url',
    {
      description: '投稿用のUTM付きURLを作る（utm_source=x, utm_medium=organic_social, utm_campaign=シリーズID, utm_content=投稿ID）。個人情報はURLに入れない。',
      inputSchema: { url: z.string().url(), seriesId: z.string().optional(), jobId: z.string().optional(), platform: z.string().optional() },
    },
    (a) => run(async () => buildUtmUrl(a)),
  );

  // ---- 投稿候補（BuzzIt が正本）。AIは候補の追加・修正案・重複確認まで。採用・下書き移行・予約・投稿は人が画面で行う ----
  server.registerTool(
    'candidates_search',
    {
      description: '登録済みの投稿候補を検索する（管理ID・タイトル・本文・シリーズ・テーマ・追加項目が対象）。selection=unreviewed/adopted/needs_fix/hold/rejected、status=candidate/drafted。',
      inputSchema: { query: z.string().optional(), series: z.string().optional(), selection: z.string().optional(), status: z.string().optional(), limit: z.number().int().min(1).max(100).default(30) },
    },
    (q) => run(async () => { const r = await listCandidates(ctx.uid, q); return { total: r.total, counts: r.counts, series: r.series, candidates: r.candidates.map((c) => ({ ...c, body: c.body.slice(0, 300) })) }; }),
  );
  server.registerTool(
    'candidates_unused',
    {
      description: '未使用の投稿候補（まだ下書きに移していない・不採用ではない）を、採用済み→未選定→要修正/保留の順で返す。次に作る投稿ネタ探しに使う。',
      inputSchema: { series: z.string().optional(), limit: z.number().int().min(1).max(50).default(10) },
    },
    ({ series, limit }) => run(async () => {
      const r = await listCandidates(ctx.uid, { series, status: 'candidate', limit: 2000 });
      const rank: Record<string, number> = { adopted: 0, unreviewed: 1, needs_fix: 2, hold: 3 };
      const list = r.candidates.filter((c) => c.selection !== 'rejected').sort((a, b) => (rank[a.selection] ?? 9) - (rank[b.selection] ?? 9)).slice(0, limit);
      return { count: list.length, candidates: list };
    }),
  );
  server.registerTool(
    'candidates_get',
    { description: '投稿候補1件の全項目（本文・画像案・確認事項・編集メモ・追加項目・AI提案）。id は管理ID（例 MD-001）。', inputSchema: { id: z.string() } },
    ({ id }) => run(() => getCandidate(ctx.uid, id)),
  );
  server.registerTool(
    'candidates_check_duplicate',
    {
      description: '重複・類似チェック。完全一致／表現が似ている／テーマが近い／結論が同じ／オチが同じ／投稿済みのテーマ を、候補・Xシリーズ在庫・下書き・予約・投稿済み・ネタ帳すべてから探し、ID・タイトル・本文・理由を返す。id（候補の管理ID）または text のどちらかを渡す。useAi を省略するとユーザー設定（既定はルールのみ）に従う。自動削除はしない。',
      inputSchema: { id: z.string().optional(), text: z.string().optional(), title: z.string().optional(), theme: z.string().optional(), conclusion: z.string().optional(), punchline: z.string().optional(), useAi: z.boolean().optional() },
    },
    ({ id, useAi, ...t }) => run(async () => {
      if (id) return checkDuplicates(ctx, targetOf(await getCandidate(ctx.uid, id)), { ai: useAi });
      if (!t.text) throw new Error('id か text が必要です');
      return checkDuplicates(ctx, { text: t.text, title: t.title, theme: t.theme, conclusion: t.conclusion, punchline: t.punchline }, { ai: useAi });
    }),
  );
  server.registerTool(
    'candidates_import',
    {
      description: '投稿候補を追加する。rows は「列名は自由」の表（例: {"管理ID":"MD-121","シリーズ":"…","タイトル":"…","投稿本文":"…","画像案":"…"}）。既知の列（管理ID・シリーズ・タイトル・投稿本文・画像案・評価・確認事項・編集メモ・テーマ・結論・オチ）は自動対応し、それ以外の列は「追加項目」として保存。同じ管理IDは重複登録しない（既存はスキップ）。選定状況は常に未選定で始まり、下書き・予約・公開は作られない。既定は dryRun=true（プレビューのみ）。保存は人が内容を確認してから dryRun=false。',
      inputSchema: { rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).min(1).max(200), columnMap: z.record(z.string(), z.string()).optional(), dryRun: z.boolean().default(true) },
    },
    ({ rows, columnMap, dryRun }) => run(() => addCandidatesFromAi(ctx.uid, rows, { columnMap: columnMap as never, dryRun })),
  );
  server.registerTool(
    'candidates_update',
    {
      description: '投稿候補の本文・画像案・タイトル・テーマ・結論・オチ・確認事項・編集メモの修正、および aiSuggestion（改善提案。画面に表示され、人が採否を決める）の保存。選定状況（採用など）と下書きへの移行は人だけが行う。',
      inputSchema: {
        id: z.string(),
        title: z.string().max(200).optional(), body: z.string().max(5000).optional(), imageIdea: z.string().max(2000).optional(),
        theme: z.string().max(200).optional(), conclusion: z.string().max(300).optional(), punchline: z.string().max(300).optional(),
        checkNotes: z.string().max(2000).optional(), editNotes: z.string().max(2000).optional(), aiSuggestion: z.string().max(3000).optional(),
      },
    },
    ({ id, ...patch }) => run(() => updateCandidate(ctx.uid, id, patch, 'ai')),
  );
  return server;
}

agentRouter.post('/mcp', requireAgentKey, async (req: AgentRequest, res: Response) => {
  const server = buildServer({ uid: req.agent!.uid, personaId: req.agent!.personaId });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('mcp error', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
    }
  }
});

const notAllowed = (_req: AgentRequest, res: Response) => {
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
};
agentRouter.get('/mcp', notAllowed);
agentRouter.delete('/mcp', notAllowed);
