import { Link } from 'react-router-dom';
import { Flame, Sparkles } from 'lucide-react';
import PlatformShowcasePanel from '../../components/PlatformShowcasePanel';
import { useRoadmap } from './RoadmapContext';

export default function PlaybookTab() {
  const { industry, primaryShowcase, primaryPlatformName, playbookHooks, playbookPillars } = useRoadmap();
  return (
        <div className="space-y-6">
          <section className="buzz-card-pad">
            <p className="buzz-section-label mb-2 flex items-center gap-2">
              <Flame className="h-3.5 w-3.5" />
              {industry.label} · Content pillars
            </p>
            <h3 className="mb-2 text-xl font-bold">投稿の中身は「3本柱」で迷わない</h3>
            <p className="mb-6 max-w-2xl text-sm text-neutral-600">
              {industry.blurb}
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {playbookPillars.map((pillar) => (
                <div key={pillar.id} className="border border-neutral-200 p-5">
                  <p className="text-[11px] font-semibold tracking-wider text-neutral-400">
                    {pillar.ratio}
                  </p>
                  <h4 className="mt-1 text-base font-bold">{pillar.name}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{pillar.description}</p>
                  <ul className="mt-4 space-y-2">
                    {pillar.examples.map((ex) => (
                      <li key={ex} className="flex gap-2 text-xs text-neutral-700 md:text-sm">
                        <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-400" />
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="buzz-card-pad">
            <h3 className="mb-2 text-xl font-bold">冒頭2〜3秒フックの型</h3>
            <p className="mb-6 max-w-2xl text-sm text-neutral-600">
              {industry.label}向けの言い回し例です。無音でも伝わるテロップ必須。
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {playbookHooks.map((hook) => (
                <div key={hook.id} className="border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold tracking-wider text-[#6b4a3a]">{hook.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-800">{hook.example}</p>
                </div>
              ))}
            </div>
            <Link to="/magic-creator" className="buzz-btn-primary mt-6">
              <Sparkles className="h-4 w-4" />
              フック付き台本を生成する
            </Link>
          </section>

          {primaryShowcase && (
            <section className="buzz-card-pad border border-[#6b4a3a]/15 bg-white">
              <p className="buzz-section-label mb-4">
                {industry.label} · 主戦場 {primaryPlatformName}
              </p>
              <PlatformShowcasePanel
                showcase={primaryShowcase}
                platformName={primaryPlatformName}
                compact
              />
              <Link to="/magic-creator" className="buzz-btn-primary mt-6">
                <Sparkles className="h-4 w-4" />
                見本を参考に台本を作る
              </Link>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: '撮影スペック',
                body: '縦9:16 / 1080×1920 / 15〜30秒。カットは0.5〜2秒でテンポよく。顔出しは維持率が上がりやすい。',
              },
              {
                title: 'アルゴリズムが見るもの',
                body: '視聴完了率・再視聴・保存・DMシェア。いいねは参考程度。投稿後1時間の返信が効く。',
              },
              {
                title: '売上への変換',
                body: `最後に必ずCTA。${industry.funnel}`,
              },
            ].map((card) => (
              <div key={card.title} className="buzz-card-pad">
                <h4 className="font-bold">{card.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{card.body}</p>
              </div>
            ))}
          </section>
        </div>
  );
}
