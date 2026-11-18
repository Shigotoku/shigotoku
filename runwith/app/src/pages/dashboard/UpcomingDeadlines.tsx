import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, ArrowRight } from "lucide-react";
import { useCompanyStore } from "../../store/company";
import { useAuthStore } from "../../store/auth";
import { useProgressStore, TASK_IDS } from "../../store/progress";
import { getStorageJson } from "../../lib/companyStorage";
import { addDays, fmtShort, parseIso, shiftWeekend, toIso, twoMonthsAfterEnd } from "../../features/settlement/lib/dates";
import { STEPS } from "../../features/settlement/lib/content";
import type { SettlementState } from "../../features/settlement/lib/types";

interface Item {
  id: string;
  date: Date;
  label: string;
  link: string;
  source: string;
}

/** ダッシュボード用：全機能の期限を横断して「期限が近い順」に表示 */
export default function UpcomingDeadlines() {
  const company = useCompanyStore((s) => s.company);
  const isDemo = useAuthStore((s) => s.isDemo);
  const isDone = useProgressStore((s) => s.isDone);
  useProgressStore((s) => s.completedTasks); // 進捗変更で再描画
  const [settlement, setSettlement] = useState<SettlementState | null>(null);
  const [grantFavs, setGrantFavs] = useState<Record<string, { title: string; endAt: string; url: string }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getStorageJson<SettlementState>("settlement-v2", company?.id, isDemo);
        if (!cancelled) setSettlement(s ?? null);
        const g = await getStorageJson<Record<string, { title: string; endAt: string; url: string }>>("jgrants-fav", company?.id, isDemo);
        if (!cancelled && g) setGrantFavs(g);
      } catch {
        /* 未設定 */
      }
    })();
    return () => { cancelled = true; };
  }, [company?.id, isDemo]);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (company?.foundedDate) {
      const f = parseIso(company.foundedDate.slice(0, 10));
      const addMonths = (n: number) => {
        const last = new Date(f.getFullYear(), f.getMonth() + n + 1, 0).getDate();
        return new Date(f.getFullYear(), f.getMonth() + n, Math.min(f.getDate(), last));
      };
      const notif: [string, string, Date][] = [
        [TASK_IDS.FOUNDED_TAX_NOTIF, "法人設立届出書（税務署）", addMonths(2)],
        [TASK_IDS.FOUNDED_BLUE_RETURN, "青色申告の承認申請書", addMonths(3)],
        [TASK_IDS.FOUNDED_SALARY_OFFICE, "給与支払事務所等の開設届出書", addMonths(1)],
        [TASK_IDS.FOUNDED_PREF_TAX, "法人設立届（都道府県税事務所）", addMonths(1)],
        [TASK_IDS.FOUNDED_CITY_TAX, "法人設立届（市区町村）", addMonths(1)],
      ];
      notif.forEach(([id, label, date]) => {
        if (!isDone(id)) list.push({ id, date, label, link: "/notifications", source: "届出" });
      });
    }

    if (settlement) {
      const key = settlement.currentEnd && settlement.terms[settlement.currentEnd]
        ? settlement.currentEnd
        : Object.keys(settlement.terms).sort().pop();
      const term = key ? settlement.terms[key] : undefined;
      if (term) {
        const end = parseIso(term.endDate);
        const allDone = STEPS.every((s) => term.done[s.id]);
        if (!allDone) {
          list.push({
            id: "settle-final", date: shiftWeekend(twoMonthsAfterEnd(end)), source: "決算",
            label: `第${term.termNo}期 決算・申告・納付`, link: "/journey/settlement",
          });
        }
        const start = parseIso(term.startDate);
        const sixEnd = addDays(new Date(start.getFullYear(), start.getMonth() + 6, start.getDate()), -1);
        list.push({
          id: "settle-interim", date: shiftWeekend(twoMonthsAfterEnd(sixEnd)), source: "決算",
          label: `第${term.termNo}期 中間申告（該当する場合）`, link: "/journey/settlement",
        });
      }
    }

    Object.entries(grantFavs).forEach(([id, g]) => {
      list.push({ id: `grant-${id}`, date: parseIso(g.endAt), label: `補助金：${g.title}`, link: "/funding", source: "補助金" });
    });

    const y = today.getFullYear();
    [y, y + 1].forEach((yy) => {
      list.push(
        { id: `gen-${yy}-1`, date: new Date(yy, 0, 20), label: "源泉所得税の特例納付（7〜12月分）", link: "/tax-calendar", source: "税務" },
        { id: `gen-${yy}-1b`, date: new Date(yy, 0, 31), label: "法定調書合計表・償却資産申告", link: "/tax-calendar", source: "税務" },
        { id: `gen-${yy}-7`, date: new Date(yy, 6, 10), label: "源泉所得税の特例納付（1〜6月分）／算定基礎届", link: "/tax-calendar", source: "税務" },
      );
    });

    return list
      .filter((i) => i.date.getTime() - today.getTime() <= 60 * 86400000)
      .filter((i) => today.getTime() - i.date.getTime() <= 120 * 86400000)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  }, [company?.foundedDate, settlement, isDone, grantFavs]);

  if (items.length === 0) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <CalendarClock className="h-4 w-4 text-primary-600" /> 期限が近いもの（60日以内・期限超過）
        </h2>
        <Link to="/tax-calendar" className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
          カレンダー <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="space-y-1.5">
        {items.map((i) => {
          const days = Math.round((i.date.getTime() - today.getTime()) / 86400000);
          const over = days < 0;
          return (
            <li key={i.id}>
              <Link to={i.link} state={{ fromJourney: true }}
                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50">
                <span className={`flex h-9 w-14 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                  over ? "bg-red-100 text-red-700" : days <= 14 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                  {fmtShort(i.date)}
                </span>
                <span className="flex-1 text-sm text-slate-800">{i.label}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{i.source}</span>
                <span className={`flex items-center gap-1 text-xs font-medium ${over ? "text-red-600" : days <= 14 ? "text-amber-600" : "text-slate-500"}`}>
                  {over && <AlertTriangle className="h-3 w-3" />}
                  {over ? `${-days}日超過` : days === 0 ? "本日" : `あと${days}日`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-slate-400">
        設立日・決算・届出の進捗から自動計算（{toIso(today)}時点）。祝日・自治体独自の期限は含みません。
      </p>
    </div>
  );
}
