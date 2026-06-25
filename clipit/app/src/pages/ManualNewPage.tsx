import { Link, useSearchParams } from "react-router-dom";
import { appendFolderQuery } from "../lib/folderContext";
import { Chrome, ImageUp, MessageCircle, ListOrdered, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";

const methods = [
  {
    to: "/manuals/new/screenshots",
    icon: ImageUp,
    title: "スクショから作る",
    desc: "拡張不要。画像を選ぶだけ。はじめての方におすすめ。",
    badge: "初回おすすめ",
    primary: true,
  },
  {
    to: "/manuals/new/record",
    icon: Chrome,
    title: "クリック操作を記録して作る",
    desc: "Chrome拡張で操作すると、スクショ付き手順が自動でたまります。",
    badge: "本格運用",
    primary: false,
  },
  {
    to: "/templates",
    icon: ListOrdered,
    title: "テンプレートから作る",
    desc: "よくある業務の型から素早くスタート。",
    badge: "",
    primary: false,
  },
  {
    to: "/manuals/new/talk",
    icon: MessageCircle,
    title: "話して作成",
    desc: "Meetの文字起こしとスクショをAIが統合。説明の暗黙知も残せます。",
    badge: "上級者向け",
    primary: false,
  },
];

export default function ManualNewPage() {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get("folder");

  return (
    <>
      <PageHeader
        title="マニュアルの作り方を選ぶ"
        description="初めての方は「スクショから作る」がいちばん簡単です"
      />
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-primary-800">
            <Sparkles size={18} />
            はじめての3ステップ
          </div>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            <li>下から作り方を選ぶ（初回はスクショがおすすめ）</li>
            <li>手順を確認・編集する</li>
            <li>共有から URL / QR をスタッフに送る</li>
          </ol>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {methods.map((m) => (
            <Link
              key={m.to}
              to={appendFolderQuery(m.to, folderId)}
              className={`group relative rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                m.primary
                  ? "border-2 border-primary-300 bg-primary-50/30 hover:border-primary-400"
                  : "border-slate-200 bg-white hover:border-primary-300"
              }`}
            >
              {m.badge && (
                <span
                  className={`absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    m.primary ? "bg-primary-500 text-white" : "bg-primary-100 text-primary-700"
                  }`}
                >
                  {m.badge}
                </span>
              )}
              <m.icon className="text-primary-500" size={28} />
              <h2 className="mt-3 text-base font-bold text-slate-900 group-hover:text-primary-700">
                {m.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{m.desc}</p>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500">
          操作記録には
          <Link to="/extension/install" className="font-semibold text-primary-600 hover:underline">
            Chrome拡張
          </Link>
          が必要です（PC・Google Chrome のみ）
        </p>
      </div>
    </>
  );
}
