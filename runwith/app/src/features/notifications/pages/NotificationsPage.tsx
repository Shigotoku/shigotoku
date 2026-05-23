import { useState } from "react";
import {
  Bell,
  Building2,
  FileText,
  Calendar,
  MapPin,
  ClipboardList,
  Lightbulb,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useProgressStore } from "../../../store/progress";
import { useCompanyStore } from "../../../store/company";

interface NotificationItem {
  id: string;
  name: string;
  deadline: string;
  destination: string;
  documents: string[];
  tips: string;
  links?: { label: string; url: string }[];
}

interface Category {
  id: string;
  title: string;
  color: string;
  icon: typeof Building2;
  items: NotificationItem[];
}

const categories: Category[] = [
  {
    id: "tax",
    title: "税務関連（税務署）",
    color: "bg-blue-50 text-blue-600",
    icon: Building2,
    items: [
      {
        id: "notif_tax_establishment",
        name: "法人設立届出書",
        deadline: "設立から2ヶ月以内",
        destination: "本店所在地の税務署",
        documents: ["法人設立届出書", "定款の写し", "登記簿謄本"],
        tips: "設立後すぐに提出。青色申告の承認申請と同時提出が効率的",
        links: [{ label: "e-Tax（税務署への電子申告）", url: "https://www.e-tax.nta.go.jp/" }],
      },
      {
        id: "notif_blue_return",
        name: "青色申告承認申請書",
        deadline: "設立から3ヶ月以内（または最初の事業年度終了日の前日まで）",
        destination: "本店所在地の税務署",
        documents: ["青色申告承認申請書"],
        tips: "これを出し忘れると初年度から青色申告が使えない。損金算入の特典が大きいので必須！",
        links: [{ label: "国税庁：青色申告承認申請書", url: "https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/hojin/annai/1554_3.htm" }],
      },
      {
        id: "notif_salary_office",
        name: "給与支払事務所の開設届出書",
        deadline: "給与支払開始から1ヶ月以内",
        destination: "本店所在地の税務署",
        documents: ["給与支払事務所の開設届出書"],
        tips: "役員報酬・従業員給与を支払う場合は必須。源泉徴収義務が発生する",
      },
      {
        id: "notif_withholding_special",
        name: "源泉所得税の納期特例の承認申請書",
        deadline: "申請した月の翌月から適用",
        destination: "本店所在地の税務署",
        documents: ["源泉所得税の納期の特例の承認に関する申請書"],
        tips: "常時10人未満の場合、毎月納付を半年に2回にまとめられる。資金繰りが楽になる",
      },
      {
        id: "notif_consumption_tax",
        name: "消費税課税事業者届出書",
        deadline: "課税事業者となる事業年度の前日まで（該当する場合）",
        destination: "本店所在地の税務署",
        documents: ["消費税課税事業者届出書"],
        tips: "資本金1,000万円以上は設立時から課税事業者。インボイス登録番号の取得も検討を",
      },
    ],
  },
  {
    id: "local",
    title: "地方税（都道府県・市区町村）",
    color: "bg-teal-50 text-teal-600",
    icon: MapPin,
    items: [
      {
        id: "notif_pref_tax",
        name: "法人事業税・住民税の届出（都道府県）",
        deadline: "設立から2ヶ月以内（目安）",
        destination: "本店所在地の都道府県税事務所",
        documents: ["法人設立届出書", "定款の写し", "登記簿謄本"],
        tips: "都道府県税事務所と市区町村役所の両方に提出が必要",
        links: [{ label: "eLTAX（地方税電子申告）", url: "https://www.eltax.lta.go.jp/" }],
      },
      {
        id: "notif_city_tax",
        name: "法人住民税の届出（市区町村）",
        deadline: "設立から2ヶ月以内（目安）",
        destination: "本店所在地の市区町村役所",
        documents: ["法人設立届出書", "定款の写し", "登記簿謄本"],
        tips: "市区町村によって書式が異なる場合がある",
      },
    ],
  },
  {
    id: "social",
    title: "社会保険（年金事務所）",
    color: "bg-purple-50 text-purple-600",
    icon: FileText,
    items: [
      {
        id: "notif_health_pension",
        name: "健康保険・厚生年金保険 新規適用届",
        deadline: "適用事業所となった日から5日以内",
        destination: "本店所在地の年金事務所",
        documents: ["健康保険・厚生年金保険新規適用届", "事業所概要", "法人登記簿謄本"],
        tips: "法人は役員1名のみでも強制加入。設立後すぐに手続きを",
        links: [{ label: "日本年金機構：新規適用届", url: "https://www.nenkin.go.jp/service/kounen/jigyonushi/shintetsuzuki/20140121.html" }],
      },
    ],
  },
  {
    id: "labor",
    title: "労働保険（従業員を雇う場合）",
    color: "bg-orange-50 text-orange-600",
    icon: ClipboardList,
    items: [
      {
        id: "notif_labor_insurance",
        name: "労働保険 保険関係成立届",
        deadline: "保険関係成立日の翌日から10日以内",
        destination: "労働基準監督署",
        documents: ["労働保険保険関係成立届", "事業所一覧"],
        tips: "1人でも雇用する事業所は加入義務あり。未加入は罰則あり",
        links: [{ label: "厚生労働省：労働保険の加入手続き", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/hoken/hoken01/index.html" }],
      },
      {
        id: "notif_employment_insurance",
        name: "雇用保険 適用事業所設置届",
        deadline: "設置の日から10日以内",
        destination: "公共職業安定所（ハローワーク）",
        documents: ["雇用保険適用事業所設置届", "雇用保険被保険者資格取得届"],
        tips: "週所定労働時間が20時間以上・31日以上雇用見込みの従業員がいる場合に必須",
      },
    ],
  },
  {
    id: "medical",
    title: "医療系特有の届出（保健所等）",
    color: "bg-emerald-50 text-emerald-600",
    icon: Bell,
    items: [
      {
        id: "notif_medical_clinic",
        name: "診療所開設届",
        deadline: "開設の10日前まで",
        destination: "所在地の保健所",
        documents: ["診療所開設届", "施設の構造設備概要書", "医師・看護師の資格証"],
        tips: "無床診療所（19床以下）の場合は届出のみ。有床診療所（20床以上）は許可が必要",
        links: [{ label: "厚生労働省：医療機関の開設手続き", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000060929.html" }],
      },
      {
        id: "notif_medical_device",
        name: "医療機器製造販売業許可申請",
        deadline: "事業開始前に取得",
        destination: "都道府県知事（または地方厚生局）",
        documents: ["医療機器製造販売業許可申請書", "品質管理基準書", "安全管理基準書", "責任技術者の資格証明"],
        tips: "クラス分類（I〜IV）により許可要件が異なる。PMDA事前相談を必ず利用すること",
        links: [
          { label: "PMDA：医療機器の製造販売", url: "https://www.pmda.go.jp/review-services/drug-reviews/about-reviews/devices/0027.html" },
        ],
      },
    ],
  },
];

export default function NotificationsPage() {
  const { isDone, toggleTask } = useProgressStore();
  const { company } = useCompanyStore();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allItems = categories.flatMap((c) => c.items);
  const submittedCount = allItems.filter((i) => isDone(i.id)).length;
  const totalCount = allItems.length;
  const progressPercent = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
  const isMedical = company?.isMedicalMode;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">届出・手続きナビ</h1>
        <p className="mt-1 text-sm text-slate-500">
          法人設立後に必要な届出・手続きを一覧で管理できます。提出済みにすると自動保存されます。
        </p>
      </div>

      {/* 進捗サマリー */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">届出完了率</p>
          <p className="text-sm font-bold text-primary-600">{submittedCount} / {totalCount} 件提出済み</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {categories.map((cat) => {
            const catDone = cat.items.filter((i) => isDone(i.id)).length;
            return (
              <div key={cat.id} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className={`h-2 w-2 rounded-full ${catDone === cat.items.length ? "bg-success-400" : "bg-slate-300"}`} />
                {cat.title.split("（")[0]}：{catDone}/{cat.items.length}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs leading-relaxed text-amber-800">
          <span className="font-semibold">重要：</span>
          青色申告承認申請は設立から3ヶ月以内が期限です。逃すと初年度から青色申告が使えず、欠損金の繰越控除等の特典が受けられません。
        </p>
      </div>

      {/* カテゴリ別一覧 */}
      <div className="space-y-4">
        {categories.map((category) => {
          if (category.id === "medical" && !isMedical) return null;
          const Icon = category.icon;
          const catDone = category.items.filter((i) => isDone(i.id)).length;

          return (
            <div key={category.id} className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${category.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-slate-900">{category.title}</h2>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  catDone === category.items.length ? "bg-success-100 text-success-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {catDone}/{category.items.length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {category.items.map((item) => {
                  const isExpanded = expandedItems[item.id] ?? false;
                  const done = isDone(item.id);

                  return (
                    <div key={item.id} className={`px-5 py-4 transition-colors ${done ? "bg-slate-50/50" : ""}`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTask(item.id)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            done ? "border-success-400 bg-success-400 text-white" : "border-slate-300 hover:border-primary-400"
                          }`}
                        >
                          {done && <CheckCircle2 className="h-4 w-4" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-semibold ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                              {item.name}
                            </h3>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              done ? "bg-success-100 text-success-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {done ? "提出済み" : "未提出"}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {item.deadline}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {item.destination}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="mt-1.5 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-3 w-3" />詳細を閉じる</>
                            ) : (
                              <><ChevronDown className="h-3 w-3" />詳細を見る（必要書類・ポイント）</>
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                              <div>
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                  <ClipboardList className="h-3.5 w-3.5" />必要書類
                                </p>
                                <ul className="mt-1.5 space-y-1">
                                  {item.documents.map((d) => (
                                    <li key={d} className="flex items-center gap-1.5 text-xs text-slate-600">
                                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />{d}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-lg bg-amber-50 p-2.5">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                                  <Lightbulb className="h-3.5 w-3.5" />ポイント
                                </p>
                                <p className="mt-1 text-xs text-amber-700">{item.tips}</p>
                              </div>
                              {item.links && item.links.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {item.links.map((link) => (
                                    <a
                                      key={link.url}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                                    >
                                      {link.label}<ExternalLink className="h-3 w-3" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
