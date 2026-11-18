import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkPlus, ExternalLink, Info, MapPin, RefreshCw, Search } from "lucide-react";
import type { Company } from "../../../store/company";
import { useCompanyStorageState } from "../../../hooks/useCompanyStorageState";

export interface JGrantItem {
  id: string;
  title: string;
  catchPhrase: string;
  maxLimit: number | null;
  rate: string;
  startAt: string | null;
  endAt: string;
  areas: string;
  areaDetail: string;
  employees: string;
  industry: string;
  purposes: string;
  institution: string;
  url: string;
}

interface JGrantsData {
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  count: number;
  items: JGrantItem[];
}

/** ブックマーク（ダッシュボードの期限一覧からも参照する） */
export const JGRANTS_FAV_KEY = "jgrants-fav";
export interface JGrantFav { title: string; endAt: string; url: string }

const PREFS = /(北海道|東京都|京都府|大阪府|.{2,3}県)/;
const prefOf = (address: string) => address.match(PREFS)?.[1] ?? "";

const daysUntil = (d: string) => {
  const t = new Date(d + "T00:00:00");
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - n.getTime()) / 86400000);
};

function employeeLimit(s: string): number | null {
  const m = s.match(/(\d+)名以下/);
  return m ? Number(m[1]) : null;
}

const yenLabel = (n: number | null) => {
  if (!n) return "上限額は公募要領を確認";
  if (n >= 100_000_000) return `最大${(n / 100_000_000).toFixed(n % 100_000_000 ? 1 : 0)}億円`;
  if (n >= 10_000) return `最大${(n / 10_000).toLocaleString()}万円`;
  return `最大${n.toLocaleString()}円`;
};

export default function JGrantsTab({ company }: { company: Company | null }) {
  const [data, setData] = useState<JGrantsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [purpose, setPurpose] = useState("すべて");
  const [localOnly, setLocalOnly] = useState(true);
  const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = useCompanyStorageState<Record<string, JGrantFav>>(JGRANTS_FAV_KEY, {});

  const myPref = company?.address ? prefOf(company.address) : "";

  const load = () => {
    setLoading(true);
    setError("");
    fetch(`${import.meta.env.BASE_URL}data/jgrants.json`, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<JGrantsData>;
      })
      .then(setData)
      .catch((e) => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const items = useMemo(() => {
    if (!data) return [];
    const emp = company?.employeeCount ?? 1;
    return data.items
      .filter((i) => daysUntil(i.endAt) >= 0)
      .map((i) => {
        let score = 50;
        const national = i.areas.includes("全国");
        const local = !!myPref && i.areas.includes(myPref);
        if (local) score += 25;
        else if (national) score += 10;
        else if (myPref) score -= 40;
        const lim = employeeLimit(i.employees);
        if (lim !== null) score += emp <= lim ? 5 : -50;
        if (/創業|起業|スタートアップ/.test(i.title + i.catchPhrase)) score += 10;
        if (company?.isMedicalMode && /医療|ヘルスケア|医薬/.test(i.title + i.industry)) score += 10;
        return { ...i, score: Math.max(1, Math.min(99, score)), national, local };
      });
  }, [data, myPref, company?.employeeCount, company?.isMedicalMode]);

  const purposes = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.purposes.split(" / ").forEach((p) => p && set.add(p)));
    return ["すべて", ...[...set]];
  }, [items]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return items
      .filter((i) => !localOnly || !myPref || i.national || i.local)
      .filter((i) => purpose === "すべて" || i.purposes.includes(purpose))
      .filter((i) => !favOnly || favs[i.id])
      .filter((i) => !kw || (i.title + i.catchPhrase + i.institution).toLowerCase().includes(kw))
      .sort((a, b) => a.endAt.localeCompare(b.endAt));
  }, [items, q, purpose, localOnly, favOnly, myPref, favs]);

  const toggleFav = (i: JGrantItem) =>
    setFavs((prev) => {
      const next = { ...prev };
      if (next[i.id]) delete next[i.id];
      else next[i.id] = { title: i.title, endAt: i.endAt, url: i.url };
      return next;
    });

  const ageDays = data ? Math.floor((Date.now() - new Date(data.fetchedAt).getTime()) / 86400000) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-900">
        <p className="flex items-center gap-1.5 font-bold"><Info className="h-4 w-4" /> 公募中の補助金（Jグランツ公開情報を自動取得）</p>
        <p className="mt-1">
          デジタル庁の「Jグランツ」に掲載された受付中の制度のみを表示します。
          {data && `最終取得：${new Date(data.fetchedAt).toLocaleString("ja-JP")}（${data.count}件中、受付中${items.length}件）。`}
          申請要件・金額・期限は必ず公募要領で確認してください。
        </p>
        {ageDays >= 7 && <p className="mt-1 font-semibold text-amber-700">データが{ageDays}日前のものです。最新はJグランツ本体で確認してください。</p>}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="キーワードで検索（例：創業、IT、研究開発）"
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5 text-slate-700">
            <input type="checkbox" checked={localOnly} onChange={(e) => setLocalOnly(e.target.checked)} />
            {myPref ? `全国＋${myPref}の制度のみ` : "地域で絞り込む（会社の住所が未設定です）"}
          </label>
          <label className="flex items-center gap-1.5 text-slate-700">
            <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} />
            ブックマークのみ（{Object.keys(favs).length}）
          </label>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}
            className="max-w-[260px] rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
            {purposes.map((p) => <option key={p}>{p}</option>)}
          </select>
          <span className="ml-auto text-slate-500">{filtered.length}件</span>
        </div>
      </div>

      {loading && <p className="p-6 text-center text-sm text-slate-500">読み込み中…</p>}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          公募データを読み込めませんでした（{error}）。
          <button onClick={load} className="ml-2 inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" />再読み込み</button>
          <a href="https://www.jgrants-portal.go.jp/" target="_blank" rel="noopener noreferrer" className="ml-3 underline">Jグランツを開く</a>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((i) => {
          const d = daysUntil(i.endAt);
          const fav = !!favs[i.id];
          return (
            <div key={i.id} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="flex items-center gap-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                      <MapPin className="h-3 w-3" />{i.national ? "全国" : i.areas.length > 24 ? `${i.areas.slice(0, 24)}…` : i.areas}
                    </span>
                    {i.employees && i.employees !== "従業員数の制約なし" && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">{i.employees}</span>
                    )}
                    {d <= 14 && <span className="rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-700">締切まで{d}日</span>}
                    {i.purposes.split(" / ").slice(0, 2).map((p) => p && (
                      <span key={p} className="rounded-md bg-primary-50 px-2 py-0.5 text-primary-600">{p}</span>
                    ))}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{i.title}</h3>
                  {i.catchPhrase && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{i.catchPhrase}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button onClick={() => toggleFav(i)} title={fav ? "ブックマークを外す" : "ブックマーク（ダッシュボードに期限を表示）"}
                    className={fav ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}>
                    {fav ? <Bookmark className="h-4 w-4 fill-current" /> : <BookmarkPlus className="h-4 w-4" />}
                  </button>
                  <span className="text-xs font-bold text-slate-900">{i.score}%</span>
                  <span className="text-[10px] text-slate-400">マッチ度</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{yenLabel(i.maxLimit)}</span>
                {i.rate && <span>補助率 {i.rate.length > 40 ? i.rate.slice(0, 40) + "…" : i.rate}</span>}
                <span>受付 {i.startAt ?? "—"} 〜 <b className="text-slate-800">{i.endAt}</b>（あと{d}日）</span>
                <a href={i.url} target="_blank" rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 font-medium text-white hover:bg-primary-700">
                  公募要領を見る <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
        {!loading && !error && filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            条件に合う公募中の補助金がありません。地域の絞り込みを外すか、キーワードを変えてください。
          </p>
        )}
      </div>
    </div>
  );
}
