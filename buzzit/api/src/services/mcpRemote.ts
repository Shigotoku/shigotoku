/**
 * リモート MCP エンドポイント（Streamable HTTP・ステートレス）。
 * ユーザーは URL と API キーを AI ツールに貼るだけで使える。サーバー常駐不要（Functions の従量課金のみ）。
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import type { Response } from 'express';
import {
  agentRouter,
  requireAgentKey,
  opAddIdea,
  opCheckDuplicate,
  opCreateDraft,
  opListIdeas,
  opListScheduled,
  type AgentCtx,
  type AgentRequest,
} from './agentApi';

function buildServer(ctx: AgentCtx): McpServer {
  const server = new McpServer({ name: 'buzzit', version: '0.2.0' });
  const run = async (fn: () => Promise<unknown>) => {
    try {
      return { content: [{ type: 'text' as const, text: JSON.stringify(await fn(), null, 2) }] };
    } catch (e) {
      return { isError: true, content: [{ type: 'text' as const, text: e instanceof Error ? e.message : String(e) }] };
    }
  };

  server.registerTool(
    'list_scheduled',
    {
      description:
        'このキャラの投稿予定・下書き・履歴を取得する。新しい原稿を作る前に既出テーマを確認するために使う。status はカンマ区切り（draft,pending,pending_approval,published,failed）。',
      inputSchema: { status: z.string().optional() },
    },
    ({ status }) => run(() => opListScheduled(ctx, status)),
  );
  server.registerTool(
    'list_ideas',
    { description: 'ネタ帳（ネタInbox）の一覧を取得する。', inputSchema: {} },
    () => run(() => opListIdeas(ctx)),
  );
  server.registerTool(
    'check_duplicate',
    {
      description: '案の文章が過去の投稿・予約・ネタと似ていないか確認する。ネタ登録や下書き作成の前に必ず呼ぶ。',
      inputSchema: { text: z.string().min(1) },
    },
    ({ text }) => run(() => opCheckDuplicate(ctx, text)),
  );
  server.registerTool(
    'add_idea',
    { description: 'ネタ帳にネタを追加する（投稿はされない）。', inputSchema: { text: z.string().min(1).max(2000) } },
    ({ text }) => run(() => opAddIdea(ctx, text)),
  );
  server.registerTool(
    'create_draft',
    {
      description:
        '投稿の下書きを作る。必ず下書き状態で保存され、人がバジットで確認・承認・予約するまで投稿されない。X用は platform="x_thread"。スレッドは本文を「---」だけの行で区切る（最大5投稿、各280字）。scheduledAt は未来のISO8601（例 2026-11-20T12:00:00+09:00）。',
      inputSchema: {
        scheduledAt: z.string(),
        platform: z.string().default('x_thread'),
        label: z.string().default('Xポスト'),
        content: z.string().min(1).max(5000),
      },
    },
    ({ scheduledAt, platform, label, content }) =>
      run(() => opCreateDraft(ctx, { scheduledAt, contents: [{ platform, label, content }] })),
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
