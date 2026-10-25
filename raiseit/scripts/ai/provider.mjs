// AIプロバイダ抽象化。ローカルLLM(院内/社内)を優先し、無い施設はBYO(自分のキー)。
// 設定(.env または sites.json の ai):
//   AI_PROVIDER = ollama | openai-compat | anthropic | gemini | none
//   AI_MODEL, AI_BASE_URL(任意), AI_API_KEY(BYO時)
// openai-compat は LM Studio / llama.cpp / vLLM / OpenAI など「OpenAI互換API」全般に使える。
// 方針: 診療所の個人情報は送らない。送るのは公開サイトの指標・URL・課題文のみ。
import { loadEnv } from '../lib.mjs';

const DEFAULTS = {
  ollama: { baseUrl: 'http://localhost:11434', model: 'qwen2.5:7b' },
  'openai-compat': { baseUrl: 'http://localhost:1234/v1', model: 'local-model' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-5' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash' },
};

export function aiConfig() {
  loadEnv();
  const provider = (process.env.AI_PROVIDER || 'none').toLowerCase();
  const d = DEFAULTS[provider] || {};
  return {
    provider,
    model: process.env.AI_MODEL || d.model,
    baseUrl: (process.env.AI_BASE_URL || d.baseUrl || '').replace(/\/$/, ''),
    apiKey: process.env.AI_API_KEY || '',
    isLocal: provider === 'ollama' || /localhost|127\.0\.0\.1|\.local\b|^http:\/\/(10|192\.168)\./.test(process.env.AI_BASE_URL || d.baseUrl || ''),
  };
}

async function post(url, body, headers = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`AI API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** @param {{system?:string,user:string}} p  @returns {Promise<string>} */
export async function complete(p, cfg = aiConfig()) {
  const { provider, model, baseUrl, apiKey } = cfg;
  switch (provider) {
    case 'ollama': {
      const j = await post(`${baseUrl}/api/chat`, { model, stream: false, messages: [...(p.system ? [{ role: 'system', content: p.system }] : []), { role: 'user', content: p.user }] });
      return j.message?.content ?? '';
    }
    case 'openai-compat': {
      const j = await post(`${baseUrl}/chat/completions`, { model, messages: [...(p.system ? [{ role: 'system', content: p.system }] : []), { role: 'user', content: p.user }] }, apiKey ? { authorization: `Bearer ${apiKey}` } : {});
      return j.choices?.[0]?.message?.content ?? '';
    }
    case 'anthropic': {
      if (!apiKey) throw new Error('AI_API_KEY が未設定です(BYO)');
      const j = await post(`${baseUrl}/v1/messages`, { model, max_tokens: 2000, system: p.system, messages: [{ role: 'user', content: p.user }] }, { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' });
      return (j.content || []).map((c) => c.text || '').join('');
    }
    case 'gemini': {
      if (!apiKey) throw new Error('AI_API_KEY が未設定です(BYO)');
      const j = await post(`${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`, { systemInstruction: p.system ? { parts: [{ text: p.system }] } : undefined, contents: [{ role: 'user', parts: [{ text: p.user }] }] });
      return (j.candidates?.[0]?.content?.parts || []).map((x) => x.text || '').join('');
    }
    default:
      throw new Error('AI_PROVIDER が未設定です(ollama / openai-compat / anthropic / gemini)');
  }
}
