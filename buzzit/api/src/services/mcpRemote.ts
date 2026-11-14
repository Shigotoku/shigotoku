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

const PLATFORM = z
  .enum(['x_thread', 'instagram', 'facebook', 'threads', 'line', 'gbp', 'youtube_shorts', 'tiktok'])
  .describe('x_thread=X / instagram / facebook / threads / line / gbp=Googleビジネス / youtube_shorts / tiktok');

const INSTRUCTIONS = `バジット(Buzzit)は SNS 投稿の管理アプリです。あなたは「編集長」として下書きを作り、人が確認・承認・予約します（あなたは投稿できません）。
推奨手順: 0) 投稿計画があれば plan_gaps で埋めるべき枠（日時・媒体・テーマ）を取得し、その枠に沿って作る 1) overview か tag_report / performance_report で現状と過去の実績（伸びた型）を確認 2) 使用回数の多いタグ・直近の内容と被らない切り口を選ぶ 3) check_duplicate で重複確認 / lint_post で表現チェック 4) 画像/動画があれば upload_media か get_upload_url で送る 5) tags を付けて create_draft 6) 他SNSに展開するなら adapt_post(dryRun で確認→作成)。
X自動投稿のシリーズ（カテゴリ別の在庫）は x_series_list → x_series_create → x_series_add_items で自由に作れる（投稿OKは人が画面で付ける）。
X は本文280字（スレッドは「---」だけの行で区切る・最大5投稿）。Instagram は画像必須、YouTube Shorts / TikTok は動画必須、Googleビジネスはハッシュタグ不要。`;

function buildServer(ctx: AgentCtx): McpServer {
  const server = new McpServer({ name: 'buzzit', version: '0.3.0' }, { instructions: INSTRUCTIONS });
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
    { description: 'ネタ帳にネタを追加する（投稿はされない）。', inputSchema: { text: z.string().min(1).max(2000) } },
    ({ text }) => run(() => opAddIdea(ctx, text)),
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
      },
    },
    ({ platform, scheduledAt, content, label, mediaUrls, tags, topic, aiGeneratedMedia }) =>
      run(() =>
        opCreateDraft(ctx, {
          scheduledAt,
          contents: [{ platform, label: label ?? '投稿', content }],
          mediaUrls,
          tags,
          topic,
          aiGeneratedMedia,
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
