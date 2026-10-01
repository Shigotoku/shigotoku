import { useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { sendAgentMessage } from '../lib/api';
import PlanLockNotice from '../components/PlanLockNotice';
import { useApp } from '../store/appContext';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function AgentPage() {
  const { plan } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'こんにちは。今日のSNS・LINE戦略について何でも聞いてください。投稿実績を踏まえてアドバイスします。',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSend = async () => {
    if (!input.trim() || busy) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const r = await sendAgentMessage(next);
      setMessages([...next, { role: 'assistant', content: r.reply }]);
      setSuggestions(r.suggestions);
    } catch {
      setMessages([...next, { role: 'assistant', content: '応答の取得に失敗しました。しばらくしてから再度お試しください。' }]);
    }
    setBusy(false);
  };

  if (!['growth', 'enterprise'].includes(plan)) {
    return (
      <div className="buzz-page">
        <PlanLockNotice feature="auto" currentPlan={plan} />
        <p className="mt-4 text-sm text-neutral-600">AI戦略エージェントは Growth OS 以上で利用できます。</p>
      </div>
    );
  }

  return (
    <div className="buzz-page flex max-h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-2">
        <div className="buzz-icon-box-accent">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">AI戦略エージェント</h1>
          <p className="text-sm text-neutral-600">Gemini が店舗データを踏まえて今日の一手を提案します。</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-neutral-200/80 bg-neutral-50 p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
              m.role === 'user' ? 'ml-auto bg-neutral-900 text-white' : 'bg-white border border-neutral-200/80 shadow-sm'
            }`}
          >
            {m.content}
          </div>
        ))}
        {busy && <p className="text-xs text-neutral-500">考え中…</p>}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="buzz-chip hover:border-violet-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="例: 今週は何を投稿すべき？"
          className="buzz-input flex-1"
        />
        <button type="button" onClick={handleSend} disabled={busy} className="buzz-btn-accent shrink-0 !px-4">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
