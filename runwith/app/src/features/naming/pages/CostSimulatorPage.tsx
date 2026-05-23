import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Calculator,
  Info,
  ArrowRight,
  TrendingDown,
  Building2,
  User,
  Globe2,
  ChevronLeft,
} from "lucide-react";

export default function CostSimulatorPage() {
  const [numCategories, setNumCategories] = useState(2);
  const [paymentType, setPaymentType] = useState<"10year" | "5year">("10year");
  const [applicationMethod, setApplicationMethod] = useState<
    "self" | "online" | "office"
  >("self");

  const filingFee = 3400 + 8600 * numCategories;
  const registrationFee =
    paymentType === "10year"
      ? 32900 * numCategories
      : 17200 * numCategories;

  const agentFeeMap = {
    self: 0,
    online: 25000 * numCategories,
    office: 80000 * numCategories,
  };
  const agentFee = agentFeeMap[applicationMethod];

  const total = filingFee + registrationFee + agentFee;

  const methodLabels = {
    self: { label: "自力出願", icon: User, desc: "弁理士を使わず全て自分で" },
    online: {
      label: "オンラインサービス",
      icon: Globe2,
      desc: "Toreru等のクラウド型",
    },
    office: {
      label: "特許事務所",
      icon: Building2,
      desc: "従来型の弁理士に依頼",
    },
  };

  return (
    <div className="space-y-8">
      <div>
        <Link to="/naming" className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors">
          <ChevronLeft className="h-4 w-4" />商標取得ステップガイドに戻る
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          費用シミュレーション
        </h1>
        <p className="mt-2 text-slate-500">
          区分数や出願方法を選んで、商標取得にかかる総費用をシミュレーションできます
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-bold text-slate-900">
              条件を設定
            </h2>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  区分数: {numCategories}区分
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={numCategories}
                  onChange={(e) => setNumCategories(Number(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>1区分</span>
                  <span>10区分</span>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  登録料の支払い方法
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["10year", "10年一括", "長期的にはお得"],
                      ["5year", "5年分割", "初期コスト重視"],
                    ] as const
                  ).map(([value, label, sub]) => (
                    <button
                      key={value}
                      onClick={() => setPaymentType(value)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        paymentType === value
                          ? "border-primary-400 bg-primary-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {label}
                      </p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  出願方法
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(
                    Object.entries(methodLabels) as [
                      keyof typeof methodLabels,
                      (typeof methodLabels)[keyof typeof methodLabels],
                    ][]
                  ).map(([key, val]) => {
                    const Icon = val.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setApplicationMethod(key)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${
                          applicationMethod === key
                            ? "border-primary-400 bg-primary-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <Icon
                          className={`mb-1 h-5 w-5 ${applicationMethod === key ? "text-primary-600" : "text-slate-400"}`}
                        />
                        <p className="text-sm font-semibold text-slate-800">
                          {val.label}
                        </p>
                        <p className="text-xs text-slate-500">{val.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900">
              費用の比較（{numCategories}区分の場合）
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left font-medium text-slate-500">
                      項目
                    </th>
                    <th className="pb-3 text-right font-medium text-slate-500">
                      自力出願
                    </th>
                    <th className="pb-3 text-right font-medium text-slate-500">
                      オンライン
                    </th>
                    <th className="pb-3 text-right font-medium text-slate-500">
                      特許事務所
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr>
                    <td className="py-2.5 text-slate-600">出願料（印紙代）</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {filingFee.toLocaleString()}円
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {filingFee.toLocaleString()}円
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {filingFee.toLocaleString()}円
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-600">
                      登録料（
                      {paymentType === "10year" ? "10年一括" : "5年分割"}）
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {registrationFee.toLocaleString()}円
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {registrationFee.toLocaleString()}円
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {registrationFee.toLocaleString()}円
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-600">弁理士報酬</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">
                      0円
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {(25000 * numCategories).toLocaleString()}円
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {(80000 * numCategories).toLocaleString()}円
                    </td>
                  </tr>
                  <tr className="border-t-2 border-slate-200">
                    <td className="pt-3 font-bold text-slate-900">合計</td>
                    <td className="pt-3 text-right text-lg font-bold text-emerald-600">
                      {(filingFee + registrationFee).toLocaleString()}円
                    </td>
                    <td className="pt-3 text-right text-lg font-bold text-slate-800">
                      {(
                        filingFee +
                        registrationFee +
                        25000 * numCategories
                      ).toLocaleString()}
                      円
                    </td>
                    <td className="pt-3 text-right text-lg font-bold text-slate-800">
                      {(
                        filingFee +
                        registrationFee +
                        80000 * numCategories
                      ).toLocaleString()}
                      円
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-accent-50 p-6 shadow-sm">
              <div className="mb-1 flex items-center gap-2 text-sm text-primary-700">
                <Calculator className="h-4 w-4" />
                あなたの見積もり
              </div>
              <div className="mb-4 text-3xl font-bold text-slate-900">
                {total.toLocaleString()}
                <span className="text-base font-medium text-slate-500">円</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">出願料（印紙代）</span>
                  <span className="font-medium text-slate-800">
                    {filingFee.toLocaleString()}円
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">登録料</span>
                  <span className="font-medium text-slate-800">
                    {registrationFee.toLocaleString()}円
                  </span>
                </div>
                {agentFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">弁理士報酬</span>
                    <span className="font-medium text-slate-800">
                      {agentFee.toLocaleString()}円
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-primary-200 pt-4">
                <div className="text-xs text-slate-500">
                  {numCategories}区分 /{" "}
                  {paymentType === "10year" ? "10年一括" : "5年分割"} /{" "}
                  {methodLabels[applicationMethod].label}
                </div>
              </div>
            </div>

            {applicationMethod !== "self" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-2">
                  <TrendingDown className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      自力出願なら{agentFee.toLocaleString()}円節約！
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      このツールを使って自力出願すれば、弁理士費用をまるごと節約できます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div className="text-xs leading-relaxed text-blue-700">
                  <p className="mb-1 font-medium">費用について</p>
                  <ul className="space-y-1">
                    <li>
                      ・出願料：基本3,400円＋8,600円×区分数
                    </li>
                    <li>
                      ・登録料（10年一括）：32,900円×区分数
                    </li>
                    <li>
                      ・登録料（5年分割）：17,200円×区分数（更新時にも同額）
                    </li>
                    <li>
                      ・早期審査には追加費用なし
                    </li>
                    <li>
                      ・書面出願の場合は電子化手数料が別途かかります
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
