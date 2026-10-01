export interface MaskRule {
  id: string;
  pagePattern: string;
  selector: string;
  note: string;
}

const KEY = "shapeit:mask-rules:v1";

export function listMaskRules(): MaskRule[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as MaskRule[];
  } catch {
    return [];
  }
}

export function addMaskRule(input: Omit<MaskRule, "id">) {
  const next = [{ ...input, id: crypto.randomUUID() }, ...listMaskRules()];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteMaskRule(id: string) {
  localStorage.setItem(KEY, JSON.stringify(listMaskRules().filter((r) => r.id !== id)));
}
