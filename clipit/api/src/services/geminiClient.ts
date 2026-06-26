export type GeminiModel = 'flash' | 'pro';

const MODEL_URL: Record<GeminiModel, string> = {
  flash: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  pro: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent',
};

const EMBED_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY が未設定です');
  return key;
}

export async function geminiGenerateText(
  prompt: string,
  model: GeminiModel = 'flash',
  opts?: { temperature?: number; maxOutputTokens?: number; json?: boolean },
): Promise<string> {
  const res = await fetch(`${MODEL_URL[model]}?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts?.temperature ?? 0.2,
        maxOutputTokens: opts?.maxOutputTokens ?? 8192,
        ...(opts?.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${model} error: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

export async function geminiGenerateJson<T>(prompt: string, model: GeminiModel = 'flash'): Promise<T> {
  const raw = await geminiGenerateText(prompt, model, { json: true, temperature: 0.15 });
  return JSON.parse(raw) as T;
}

export async function embedText(text: string): Promise<number[]> {
  const trimmed = text.trim().slice(0, 2048);
  if (!trimmed) return [];
  const res = await fetch(`${EMBED_URL}?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text: trimmed }] },
    }),
  });
  if (!res.ok) throw new Error(`Gemini embed error: ${res.status}`);
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  return data.embedding?.values ?? [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
