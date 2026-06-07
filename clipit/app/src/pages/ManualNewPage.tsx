import { Link } from "react-router-dom";
import { Chrome, ImageUp, MessageCircle, ListOrdered } from "lucide-react";
import PageHeader from "../components/PageHeader";

const methods = [
  {
    to: "/manuals/new/record",
    icon: Chrome,
    title: "クリック操作を記録して作る",
    desc: "Chrome拡張で操作すると、スクショ付き手順が自動でたまります。",
    badge: "おすすめ",
  },
  {
    to: "/manuals/new/talk",
    icon: MessageCircle,
    title: "話して作成",
    desc: "Google Meetの文字起こしとスクショをAIが統合。説明の暗黙知も残せます。",
    badge: "差別化",
  },
  {
    to: "/manuals/new/screenshots",
    icon: ImageUp,
    title: "スクショから作る",
    desc: "撮っておいた画像をアップロードして、手順書にします。",
    badge: "",
  },
  {
    to: "/templates",
    icon: ListOrdered,
    title: "テンプレートから作る",
    desc: "よくある業務の型から素早くスタート。",
    badge: "",
  },
];

export default function ManualNewPage() {
  return (
    <>
      <PageHeader
        title="マニュアルの作り方を選ぶ"
        description="現場に合った方法で、教える手間を減らします"
      />
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          操作だけでは伝わらない注意点やNG例は、<strong>話して作成</strong>が向いています。
          Google Meetで画面共有しながら説明 → 文字起こしを貼り付け → スクショと統合。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {methods.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
            >
              {m.badge && (
                <span className="absolute right-4 top-4 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
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
      </div>
    </>
  );
}
