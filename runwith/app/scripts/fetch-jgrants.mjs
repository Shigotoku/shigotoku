/**
 * Jグランツ公開API（デジタル庁）から「現在募集中」の補助金を取得し、
 * public/data/jgrants.json に書き出す。ビルド前（CI / 手動）に実行する。
 *
 *   node scripts/fetch-jgrants.mjs
 *
 * ブラウザから直接APIを呼ぶとCORSで失敗するため、静的JSONとして配信する。
 * 取得に失敗した場合は既存のJSONを残して終了コード0で終わる（デプロイを止めない）。
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.jgrants-portal.go.jp/exp/v1/public/subsidies";
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/data/jgrants.json");

/** スタートアップ・中小企業に関連しそうなキーワード（2文字以上が必須） */
const KEYWORDS = [
  "創業", "起業", "スタートアップ", "ベンチャー", "新規事業", "中小企業", "小規模事業者",
  "設備投資", "IT導入", "デジタル", "DX", "研究開発", "新製品", "販路開拓", "海外展開",
  "雇用", "人材", "賃上げ", "省力化", "省エネ", "医療", "ヘルスケア", "知的財産", "特許",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
      if (res.ok) return await res.json();
      if (res.status < 500 && res.status !== 429) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === tries - 1) throw e;
    }
    await sleep(800 * (i + 1));
  }
  throw new Error("unreachable");
}

/** UTC ISO → JST の日付文字列 (YYYY-MM-DD) */
function toJstDate(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

const stripHtml = (s) =>
  String(s ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

async function pool(items, size, worker) {
  const out = [];
  let idx = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (idx < items.length) {
        const i = idx++;
        out[i] = await worker(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const found = new Map();
  for (const kw of KEYWORDS) {
    const url = `${API}?keyword=${encodeURIComponent(kw)}&sort=acceptance_end_datetime&order=ASC&acceptance=1`;
    try {
      const json = await getJson(url);
      for (const r of json.result ?? []) if (!found.has(r.id)) found.set(r.id, r);
      console.log(`keyword "${kw}": ${json.result?.length ?? 0}件 (累計 ${found.size})`);
    } catch (e) {
      console.warn(`keyword "${kw}" 失敗: ${e.message}`);
    }
    await sleep(150);
  }
  if (found.size === 0) throw new Error("1件も取得できませんでした");

  const list = [...found.values()];
  const items = (
    await pool(list, 5, async (r) => {
      let d = {};
      try {
        const json = await getJson(`${API}/id/${r.id}`);
        d = (json.result && json.result[0]) || {};
      } catch (e) {
        console.warn(`detail ${r.id} 失敗: ${e.message}`);
      }
      return {
        id: r.id,
        title: r.title,
        catchPhrase: stripHtml(d.subsidy_catch_phrase),
        maxLimit: r.subsidy_max_limit ?? d.subsidy_max_limit ?? null,
        rate: d.subsidy_rate ?? "",
        startAt: toJstDate(r.acceptance_start_datetime),
        endAt: toJstDate(r.acceptance_end_datetime),
        areas: r.target_area_search ?? d.target_area_search ?? "",
        areaDetail: stripHtml(d.target_area_detail).slice(0, 200),
        employees: r.target_number_of_employees ?? d.target_number_of_employees ?? "",
        industry: d.industry ?? "",
        purposes: d.use_purpose ?? "",
        institution: r.institution_name ?? d.institution_name ?? "",
        url: d.front_subsidy_detail_page_url || `https://www.jgrants-portal.go.jp/subsidy/${r.id}`,
      };
    })
  ).filter((x) => x.title && x.endAt);

  items.sort((a, b) => a.endAt.localeCompare(b.endAt));
  const payload = {
    source: "Jグランツ（デジタル庁）公開API",
    sourceUrl: "https://www.jgrants-portal.go.jp/",
    fetchedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload), "utf8");
  console.log(`書き出し: ${OUT} (${items.length}件)`);
}

main().catch(async (e) => {
  console.warn(`Jグランツの更新をスキップ: ${e.message}`);
  try {
    await readFile(OUT);
    console.warn("既存のjgrants.jsonを継続利用します");
  } catch {
    console.warn("既存データなし");
  }
  process.exit(0);
});
