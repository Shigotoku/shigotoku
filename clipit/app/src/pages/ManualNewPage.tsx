import { Link, useSearchParams } from "react-router-dom";
import { appendCreateQuery } from "../lib/folderContext";
import { persistTocEnabled, resolveTocEnabled } from "../lib/manualToc";
import { resolveUiLayoutId, type UiLayoutId } from "../lib/uiLayoutTemplates";
import { Chrome, ImageUp, LayoutGrid, MessageCircle, ListOrdered, Sparkles } from "lucide-react";
import PageHeader from "../components/PageHeader";
import UiLayoutPicker from "../components/UiLayoutPicker";
import { useState } from "react";

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
    badge: "",
    primary: false,
  },
  {
    to: "/templates",
    icon: ListOrdered,
    title: "テンプレートから作る",
    desc: "よくある業務の型から素早くスタート（内容のひな型）。",
    badge: "",
    primary: false,
  },
  {
    to: "/manuals/new/talk",
    icon: MessageCircle,
    title: "話して作成",
    desc: "Meetの文字起こしとスクショをルールで統合。説明の暗黙知も残せます。",
    badge: "",
    primary: false,
  },
];

export default function ManualNewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get("folder");
  const [layoutId, setLayoutId] = useState<UiLayoutId>(() => resolveUiLayoutId(searchParams));
  const [tocEnabled, setTocEnabled] = useState(() => resolveTocEnabled(searchParams));

  const handleLayoutChange = (id: UiLayoutId) => {
    setLayoutId(id);
    const next = new URLSearchParams(searchParams);
    next.set("layout", id);
    setSearchParams(next, { replace: true });
  };

  const handleTocChange = (enabled: boolean) => {
    setTocEnabled(enabled);
    persistTocEnabled(enabled);
    const next = new URLSearchParams(searchParams);
    if (enabled) next.set("toc", "1");
    else next.delete("toc");
    setSearchParams(next, { replace: true });
  };

  const linkWithContext = (path: string) => appendCreateQuery(path, folderId, layoutId, tocEnabled);

  return (
    <>
      <PageHeader
        title="マニュアルの作り方を選ぶ"
        description="初めての方は「スクショから作る」がいちばん簡単です"
      />
      <div className="mx-auto w-full max-w-[min(100%,1600px)] space-y-5 px-4 py-5 lg:px-6">
        <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-primary-800">
            <Sparkles size={18} />
            はじめての3ステップ
          </div>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            <li>UIのひな型と作り方を選ぶ（初回はスクショがおすすめ）</li>
            <li>手順を確認・編集する</li>
            <li>共有から URL / QR をスタッフに送る</li>
          </ol>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <LayoutGrid size={18} className="text-primary-500" />
            <h2 className="text-sm font-bold text-slate-900">UIのひな型（レイアウト）</h2>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-slate-500">
            画像の大きさ・位置、説明文の配置、注意点の見せ方など、マニュアルの見た目の型を選びます。内容のテンプレートとは別です。
          </p>
          <UiLayoutPicker value={layoutId} onChange={handleLayoutChange} />
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={tocEnabled}
              onChange={(e) => handleTocChange(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">冒頭に目次を自動作成</span>
              <span className="mt-1 block text-xs text-slate-500">
                各手順へのリンク付き目次をマニュアル先頭に挿入します。プレビュー・Word/HTML 出力にも反映されます。
              </span>
            </span>
          </label>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-slate-900">作り方を選ぶ</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {methods.map((m) => (
              <Link
                key={m.to}
                to={linkWithContext(m.to)}
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
                <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-primary-700">
                  {m.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{m.desc}</p>
              </Link>
            ))}
          </div>
        </section>

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
