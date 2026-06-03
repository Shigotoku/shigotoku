import { Link } from "react-router-dom";
import { FilePlus2, QrCode, LayoutTemplate, AlertCircle, Eye, Clock } from "lucide-react";
import PageHeader from "../components/PageHeader";

const todayTasks = [
  { icon: AlertCircle, text: "未確認スタッフが3名います", tone: "text-danger-600" },
  { icon: Clock, text: "180日以上更新されていないマニュアルが2件あります", tone: "text-primary-600" },
  { icon: Eye, text: "よく見られているマニュアル：新患受付の手順", tone: "text-slate-600" },
];

const recent = [
  { id: "demo-1", title: "新患受付の手順", updated: "2日前", reads: 12 },
  { id: "demo-2", title: "電子カルテ 会計入力", updated: "5日前", reads: 8 },
  { id: "demo-3", title: "Web予約システムの確認", updated: "2週間前", reads: 21 },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="ダッシュボード"
        description="今日やること と、最近のマニュアル"
        action={
          <Link
            to="/manuals/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
          >
            <FilePlus2 size={16} />
            新しく作る
          </Link>
        }
      />

      <div className="space-y-6 p-6">
        {/* 今日やること */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">今日やること</h2>
          <ul className="mt-3 space-y-2">
            {todayTasks.map((t, i) => (
              <li key={i} className={`flex items-center gap-2.5 text-sm ${t.tone}`}>
                <t.icon size={16} />
                {t.text}
              </li>
            ))}
          </ul>
        </section>

        {/* クイックアクション */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Link to="/manuals/new" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-sm">
            <FilePlus2 className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">新しく作る</span>
          </Link>
          <Link to="/templates" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary-200 hover:shadow-sm">
            <LayoutTemplate className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">テンプレートから作る</span>
          </Link>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <QrCode className="text-primary-500" size={22} />
            <span className="text-sm font-semibold text-slate-800">QRを印刷する</span>
          </div>
        </section>

        {/* 最近のマニュアル */}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">最近作ったマニュアル</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <Link to={`/manuals/${m.id}/edit`} className="text-sm font-semibold text-slate-900 hover:text-primary-600">
                    {m.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-400">更新 {m.updated} ・ 閲覧 {m.reads}回</p>
                </div>
                <Link to={`/manuals/${m.id}/share`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  共有
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
