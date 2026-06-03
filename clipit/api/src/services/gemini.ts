const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export type InstructionTone = 'simple' | 'formal' | 'manual' | 'short' | 'detailed';
export type TargetAudience = 'new_staff' | 'admin' | 'patient' | 'customer' | 'developer';

export interface StepInput {
  title?: string;
  elementText?: string;
  pageTitle?: string;
  pageUrl?: string;
  note?: string;
}

const TONE_LABEL: Record<InstructionTone, string> = {
  simple: 'かんたんな日本語',
  formal: '丁寧な敬語',
  manual: '業務マニュアル風',
  short: '短め',
  detailed: '詳しめ',
};

const AUDIENCE_LABEL: Record<TargetAudience, string> = {
  new_staff: '新人スタッフ',
  admin: '管理者',
  patient: '患者',
  customer: '社内の同僚',
  developer: 'SaaS利用者',
};

export async function generateStepInstruction(
  step: StepInput,
  tone: InstructionTone,
  audience: TargetAudience,
): Promise<{ instruction: string; usedGemini: boolean }> {
  const fallback = buildFallback(step, tone);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { instruction: fallback, usedGemini: false };

  const prompt = `あなたは日本の現場向け業務マニュアル作成の専門家です。
次の操作情報から、1ステップ分の説明文だけを書いてください。

対象者: ${AUDIENCE_LABEL[audience]}
文体: ${TONE_LABEL[tone]}
操作要素: ${step.elementText || '（不明）'}
ページ: ${step.pageTitle || ''} ${step.pageUrl || ''}
メモ: ${step.note || 'なし'}

ルール:
- 1〜3文、日本語のみ
- 個人名・患者IDなどの例は出さない
- JSON不要、説明文のみ出力`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error('empty');
    return { instruction: text.replace(/^["']|["']$/g, ''), usedGemini: true };
  } catch (err) {
    console.warn('Gemini fallback:', err);
    return { instruction: fallback, usedGemini: false };
  }
}

export async function generateAllStepInstructions(
  steps: StepInput[],
  tone: InstructionTone,
  audience: TargetAudience,
): Promise<{ instructions: string[]; usedGemini: boolean }> {
  const results: string[] = [];
  let usedGemini = false;
  for (const step of steps) {
    const r = await generateStepInstruction(step, tone, audience);
    results.push(r.instruction);
    if (r.usedGemini) usedGemini = true;
  }
  return { instructions: results, usedGemini };
}

function buildFallback(step: StepInput, tone: InstructionTone): string {
  const el = step.elementText || step.title || '画面の要素';
  if (tone === 'formal') return `【手順】${el}を操作してください。`;
  return `${el}をクリック（または操作）します。`;
}
