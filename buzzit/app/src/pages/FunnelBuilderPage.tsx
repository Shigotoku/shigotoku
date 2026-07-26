import { useEffect, useMemo, useState } from 'react';
import { Link2, QrCode, Copy, ArrowRight } from 'lucide-react';
import { createLineSource, fetchSettings, createTrackingLink } from '../lib/api';
import { loadOnboarding } from '../lib/onboarding';
import { getIndustryTemplate, type IndustryId } from '../data/industryTemplates';
import GlossTooltip from '../components/GlossTooltip';

export default function FunnelBuilderPage() {
  const onboarding = loadOnboarding();
  const industry = (onboarding.industryId as IndustryId) || 'general';
  const template = getIndustryTemplate(industry);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [lineAddUrl, setLineAddUrl] = useState('');
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bio, setBio] = useState(template.bioExample);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        if (s.defaultDestinationUrl) setDestinationUrl(s.defaultDestinationUrl);
      })
      .catch(() => {});
  }, []);

  const profileCopy = useMemo(
    () =>
      [
        template.profileNameExample,
        '',
        bio,
        '',
        `導線: ${template.funnel}`,
        shortUrl ? `友だち追加: ${shortUrl}` : '',
        trackingUrl ? `計測リンク: ${trackingUrl}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    [template, bio, shortUrl, trackingUrl],
  );

  const handleGenerate = async () => {
    setMessage(null);
    try {
      if (destinationUrl.trim()) {
        const t = await createTrackingLink({
          destinationUrl: destinationUrl.trim(),
          title: 'プロフィール導線',
          platform: 'profile',
        });
        setTrackingUrl(t.trackingUrl);
      }
      if (lineAddUrl.trim()) {
        const s = await createLineSource({
          label: 'プロフィール導線',
          addFriendUrl: lineAddUrl.trim(),
        });
        setShortUrl(s.shortUrl);
      }
      setMessage('導線セットを生成しました。プロフィール文をコピーして貼ってください。');
    } catch {
      setMessage('生成に失敗しました。URLとLINE友だち追加リンクを確認してください。');
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard?.writeText(text);
    setMessage('コピーしました');
  };

  const qrUrl = shortUrl || trackingUrl || destinationUrl;

  return (
    <div className="buzz-page">
      <div>
        <h2 className="mb-2 text-2xl font-bold">導線ビルダー</h2>
        <p className="text-neutral-600">
          SNS → <GlossTooltip term="LINE" /> → 予約を、プロフィール文言・短縮URL・QRでセット生成します。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {['認知（SNS）', '関係（LINE）', '来店（予約）'].map((label, i) => (
          <div key={label} className="buzz-card-pad">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">STEP {i + 1}</p>
            <p className="mt-2 font-semibold">{label}</p>
            <p className="mt-1 text-sm text-neutral-600">
              {i === 0 && template.primaryPlatforms.join(' / ')}
              {i === 1 && '友だち追加・タグ・クーポン'}
              {i === 2 && template.kpi}
            </p>
          </div>
        ))}
      </div>

      <div className="buzz-card-pad space-y-4">
        <h3 className="font-bold">セット生成</h3>
        <label className="block text-sm">
          予約・来店URL
          <input
            className="buzz-input mt-1"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
        <label className="block text-sm">
          LINE 友だち追加URL（lin.ee など）
          <input
            className="buzz-input mt-1"
            value={lineAddUrl}
            onChange={(e) => setLineAddUrl(e.target.value)}
            placeholder="https://lin.ee/..."
          />
        </label>
        <label className="block text-sm">
          プロフィール文（編集可）
          <textarea className="buzz-input mt-1 h-28 resize-none" value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <button type="button" onClick={handleGenerate} className="buzz-btn-primary">
          <Link2 className="h-4 w-4" />
          導線セットを作る
        </button>
        {message && <p className="text-sm text-neutral-600">{message}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="buzz-card-pad">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">プロフィールに貼る文</h3>
            <button type="button" onClick={() => copy(profileCopy)} className="inline-flex items-center gap-1 text-xs">
              <Copy className="h-3.5 w-3.5" />
              コピー
            </button>
          </div>
          <pre className="whitespace-pre-wrap border border-neutral-200 bg-neutral-50 p-3 text-sm">{profileCopy}</pre>
        </div>
        <div className="buzz-card-pad">
          <h3 className="mb-3 flex items-center gap-2 font-bold">
            <QrCode className="h-5 w-5" />
            店頭QR用URL
          </h3>
          <p className="break-all text-sm text-neutral-700">{qrUrl || 'URLを入れるとここに表示されます'}</p>
          {qrUrl && (
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm underline-offset-2 hover:underline"
            >
              QR画像を開く
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
          <p className="mt-4 text-xs text-neutral-500">
            チラシ・レジ横に貼ると流入経路計測が始まります（LINE CRMの流入経路）。
          </p>
        </div>
      </div>
    </div>
  );
}
