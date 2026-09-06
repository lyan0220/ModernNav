// Lazy facade over the pinyin table (pinyinTable.ts). While the table is
// loading, non-CJK initials still work and CJK chars fall through to exact
// matching — identical to a table miss. Results are cached per input string
// so the command palette stops recomputing initials on every keystroke.

let table: typeof import("./pinyinTable") | null = null;
let loader: Promise<void> | null = null;

export function isPinyinTableReady(): boolean {
  return table !== null;
}

export function loadPinyinTable(): Promise<void> {
  if (table) return Promise.resolve();
  loader ??= import("./pinyinTable").then((m) => {
    table = m;
    initialsCache.clear(); // drop fallback results computed before load
  });
  return loader;
}

const initialsCache = new Map<string, string>();

export function getInitials(str: string): string {
  if (table) {
    const cached = initialsCache.get(str);
    if (cached !== undefined) return cached;
  }

  let result = "";
  for (const ch of str) {
    const initial = table?.CHAR_TO_INITIAL.get(ch);
    result += initial ?? ch.toLowerCase();
  }

  if (table) initialsCache.set(str, result);
  return result;
}
