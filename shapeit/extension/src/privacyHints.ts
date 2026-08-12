/** 拡張側: password / data-private の存在ヒント（PRV-001） */
export function redactSensitiveDomHints(): string[] {
  const hits: string[] = [];
  try {
    if (document.querySelector("input[type=password]")) hits.push("password-field");
    if (document.querySelector("[data-private],[data-sensitive]")) hits.push("private-marked");
  } catch {
    /* ignore */
  }
  return hits;
}
