const PII = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  /\b0\d{1,4}-\d{1,4}-\d{3,4}\b/g,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
];

export function detectPii(text: string) {
  const hits: string[] = [];
  for (const re of PII) {
    const m = text.match(re);
    if (m) hits.push(...m);
  }
  return hits;
}

export function maskPii(text: string) {
  let next = text;
  for (const re of PII) next = next.replace(re, "[redacted]");
  return { text: next, masked: next !== text };
}
