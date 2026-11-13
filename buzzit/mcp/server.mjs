#!/usr/bin/env node
/**
 * Buzzit MCP サーバー（stdio）。
 * AI が「ネタ登録」「重複チェック」「下書き作成」「予約状況の確認」をできる。
 * 承認・予約確定・投稿はできない（人がバジット上で行う）。
 *
 * 環境変数:
 *   BUZZIT_API_KEY  必須  バジットで発行した API キー（bzk_...）。キャラごとに別キーを発行する
 *   BUZZIT_API_BASE 任意  既定: https://app.buzzit.shigotoku.com/api
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.BUZZIT_API_BASE ?? 'https://app.buzzit.shigotoku.com/api').replace(/\/$/, '');
const KEY = process.env.BUZZIT_API_KEY;
if (!KEY) {
  console.error('BUZZIT_API_KEY が未設定です');
  process.exit(1);
}

async function call(method, path, body) {
  const res = await fetch(`${BASE}/v1/agent${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `APIエラー (${res.status})`);
  return data;
}

const text = (obj) => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: e instanceof Error ? e.message : String(e) }] });
const wrap = (fn) => async (args) => {
  try {
    return text(await fn(args));
  } catch (e) {
    return fail(e);
  }
};

const server = new McpServer({ name: 'buzzit', version: '0.1.0' });

server.registerTool(
  'list_scheduled',
  {
    description:
      'このキャラの投稿予定・下書き・履歴を取得する。新しい原稿を作る前に、既出テーマを確認するために使う。status はカンマ区切り（draft,pending,pending_approval,published,failed）。',
    inputSchema: { status: z.string().optional() },
  },
  wrap(({ status }) => call('GET', status ? `/scheduled?status=${encodeURIComponent(status)}` : '/scheduled')),
);

server.registerTool(
  'list_ideas',
  { description: 'ネタ帳（ネタInbox）の一覧を取得する。', inputSchema: {} },
  wrap(() => call('GET', '/ideas')),
);

server.registerTool(
  'check_duplicate',
  {
    description:
      '案の文章が、過去の投稿・予約・ネタと似ていないか確認する。ネタ登録や下書き作成の前に必ず呼ぶ。',
    inputSchema: { text: z.string().min(1) },
  },
  wrap(({ text: t }) => call('POST', '/check-duplicate', { text: t })),
);

server.registerTool(
  'add_idea',
  {
    description: 'ネタ帳にネタを追加する（投稿はされない）。',
    inputSchema: { text: z.string().min(1).max(2000) },
  },
  wrap(({ text: t }) => call('POST', '/ideas', { text: t })),
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
  wrap(({ scheduledAt, platform, label, content }) =>
    call('POST', '/drafts', { scheduledAt, contents: [{ platform, label, content }] }),
  ),
);

await server.connect(new StdioServerTransport());
