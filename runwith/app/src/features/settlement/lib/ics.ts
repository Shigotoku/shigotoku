export interface CalEvent {
  date: Date;
  title: string;
  note: string;
}

const p = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function buildIcs(events: CalEvent[], name: string) {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//runwith//settlement//JP", "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${esc(name)}`,
  ];
  events.forEach((e, i) => {
    const next = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() + 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:runwith-settlement-${ymd(e.date)}-${i}@runwith`,
      `DTSTAMP:${ymd(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${ymd(e.date)}`,
      `DTEND;VALUE=DATE:${ymd(next)}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.note)}`,
      "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}（7日前）`, "END:VALARM",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadText(filename: string, text: string, mime = "text/calendar") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
