import { Link } from 'react-router-dom';
import { settingsPath } from '../../lib/settingsUrls';
import { InfoTile } from './RoadmapParts';
import { useRoadmap } from './RoadmapContext';

export default function IndustryTab() {
  const { industry, openCompanion } = useRoadmap();
  return (
        <div className="space-y-6">
          <section className="buzz-card-pad">
            <p className="buzz-section-label mb-2">{industry.label}</p>
            <h3 className="text-xl font-bold">業種に合わせた始め方</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">{industry.blurb}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <InfoTile label="集中する媒体" value={industry.primaryPlatforms.join(' → ')} />
              <InfoTile label="推奨導線" value={industry.funnel} />
              <InfoTile label="見るべきKPI" value={industry.kpi} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="buzz-card-pad">
              <h4 className="font-bold">おすすめプロフィール例</h4>
              <p className="mt-4 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                名前欄
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-900">{industry.profileNameExample}</p>
              <p className="mt-4 text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                自己紹介
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {industry.bioExample}
              </p>
            </div>
            <div className="buzz-card-pad">
              <h4 className="mb-3 font-bold">この業種のスタート順</h4>
              <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-neutral-700">
                {industry.startOrder.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className="buzz-btn-secondary" onClick={() => openCompanion()}>
                  SNS伴走ガイドへ
                </button>
                <Link to={settingsPath({ tab: 'sns' })} className="buzz-btn-secondary">
                  設定で連携
                </Link>
                <Link to="/magic-creator" className="buzz-btn-primary">
                  台本を作る
                </Link>
              </div>
            </div>
          </section>

          <section className="buzz-card-pad">
            <h4 className="mb-2 font-bold">今週の投稿ネタ（7本）</h4>
            <p className="mb-4 text-sm text-neutral-600">
              完璧な企画より、このリストを埋めるほうが続きます。BuzzIt のボイスドラフトに一言渡すだけで台本化できます。
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {industry.weekIdeas.map((idea, i) => (
                <div
                  key={idea}
                  className="flex gap-3 border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800"
                >
                  <span className="buzz-stat-value text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
                  <span className="leading-relaxed">{idea}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
  );
}
