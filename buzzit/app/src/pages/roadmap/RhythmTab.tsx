import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { faqs, weeklyRhythm } from '../../data/growthRoadmap';
import { settingsPath } from '../../lib/settingsUrls';
import { useRoadmap } from './RoadmapContext';

export default function RhythmTab() {
  const { industry } = useRoadmap();
  return (
        <div className="space-y-6">
          <section className="buzz-card-pad">
            <h3 className="mb-2 text-xl font-bold">おすすめ週間リズム</h3>
            <p className="mb-6 text-sm text-neutral-600">
              「毎日がんばる」ではなく、曜日で役割を固定すると続きやすいです。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                    <th className="py-3 pr-4 font-semibold">いつ</th>
                    <th className="py-3 pr-4 font-semibold">やること</th>
                    <th className="py-3 font-semibold">BuzzIt</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyRhythm.map((row) => (
                    <tr key={row.day + row.focus} className="border-b border-neutral-100">
                      <td className="py-3 pr-4 font-medium text-neutral-900">{row.day}</td>
                      <td className="py-3 pr-4 text-neutral-600">{row.focus}</td>
                      <td className="py-3">
                        {row.path ? (
                          <Link
                            to={row.path}
                            className="inline-flex items-center gap-1 font-medium text-neutral-900 underline-offset-2 hover:underline"
                          >
                            {row.buzzit}
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span className="text-neutral-500">{row.buzzit}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xl font-bold">よくあるつまずき</h3>
            {faqs.map((item) => (
              <details key={item.q} className="buzz-card group open:shadow-sm">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-neutral-900 marker:content-none md:px-6">
                  <span className="flex items-center justify-between gap-3">
                    {item.q}
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <p className="border-t border-neutral-100 px-5 py-4 text-sm leading-relaxed text-neutral-600 md:px-6">
                  {item.a}
                </p>
              </details>
            ))}
          </section>

          <section className="border border-neutral-200 bg-gradient-to-r from-white to-[#f0ebe3] px-6 py-8 md:px-8">
            <h3 className="text-lg font-bold">迷ったら、今日はこれだけ（{industry.label}）</h3>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
              {industry.startOrder.slice(0, 3).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={settingsPath({ tab: 'sns' })} className="buzz-btn-secondary">
                設定を開く
              </Link>
              <Link to="/magic-creator" className="buzz-btn-primary">
                クリエイターへ
              </Link>
            </div>
          </section>
        </div>
  );
}
