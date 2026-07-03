import type { Category, SubCategory, LinkItem, UserPreferences } from "../../../src/types";
import { ThemeMode } from "../../../src/types";
import type { D1 } from "./schema";

// --- Row shapes ---
interface CategoryRow {
  id: string;
  title: string;
  position: number;
}
interface SubRow {
  id: string;
  category_id: string;
  title: string;
  position: number;
}
interface LinkRow {
  id: string;
  subcategory_id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  position: number;
  visit_count: number;
}

// --- Defaults ---
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "home",
    title: "Home",
    subCategories: [
      {
        id: "default",
        title: "Default",
        items: [
          { id: "1", title: "Google", url: "https://google.com", icon: "Search" },
          { id: "2", title: "GitHub", url: "https://github.com", icon: "Github" },
        ],
      },
    ],
  },
];

const DEFAULT_BACKGROUND = "radial-gradient(circle at 50% -20%, #334155, #0f172a, #020617)";

const DEFAULT_PREFS: UserPreferences = {
  cardOpacity: 0.1,
  themeColor: "#6280a3",
  themeMode: ThemeMode.Dark,
};

export function getDefaultCategories(): Category[] {
  return DEFAULT_CATEGORIES;
}

export function getDefaultBackground(): string {
  return DEFAULT_BACKGROUND;
}

export function getDefaultPrefs(): UserPreferences {
  return DEFAULT_PREFS;
}

// --- Reads ---
export async function readAllCategories(db: D1): Promise<Category[]> {
  const [{ results: cats }, { results: subs }, { results: links }] = await Promise.all([
    db
      .prepare("SELECT id, title, position FROM categories ORDER BY position ASC, id ASC")
      .all<CategoryRow>(),
    db
      .prepare(
        "SELECT id, category_id, title, position FROM subcategories ORDER BY position ASC, id ASC"
      )
      .all<SubRow>(),
    db
      .prepare(
        "SELECT id, subcategory_id, title, url, description, icon, position, visit_count FROM links ORDER BY position ASC, id ASC"
      )
      .all<LinkRow>(),
  ]);

  return rebuildCategories(cats ?? [], subs ?? [], links ?? []);
}

export function rebuildCategories(
  cats: CategoryRow[],
  subs: SubRow[],
  links: LinkRow[]
): Category[] {
  if (!cats || cats.length === 0) return [];

  const linksBySub = new Map<string, LinkItem[]>();
  for (const l of links ?? []) {
    const item: LinkItem = {
      id: l.id,
      title: l.title,
      url: l.url,
      ...(l.description ? { description: l.description } : {}),
      ...(l.icon ? { icon: l.icon } : {}),
      ...(l.visit_count > 0 ? { visitCount: l.visit_count } : {}),
    };
    const arr = linksBySub.get(l.subcategory_id);
    if (arr) arr.push(item);
    else linksBySub.set(l.subcategory_id, [item]);
  }

  const subsByCat = new Map<string, SubCategory[]>();
  for (const s of subs ?? []) {
    const sub: SubCategory = {
      id: s.id,
      title: s.title,
      items: linksBySub.get(s.id) ?? [],
    };
    const arr = subsByCat.get(s.category_id);
    if (arr) arr.push(sub);
    else subsByCat.set(s.category_id, [sub]);
  }

  return cats.map((c) => ({
    id: c.id,
    title: c.title,
    subCategories: subsByCat.get(c.id) ?? [],
  }));
}

// --- Config ---
export interface BootstrapConfig {
  background: string;
  prefs: UserPreferences;
  isDefaultCode: boolean;
}

function parseKVConfig(rows: { key: string; value: string }[]): {
  background: string;
  prefs: UserPreferences;
} {
  const map = new Map<string, string>();
  rows.forEach((r) => map.set(r.key, r.value));

  let background: string = map.get("background") || DEFAULT_BACKGROUND;
  if (typeof background !== "string" || !background) background = DEFAULT_BACKGROUND;

  let prefs: UserPreferences = DEFAULT_PREFS;
  const rawPrefs = map.get("prefs");
  if (rawPrefs) {
    try {
      const parsed = JSON.parse(rawPrefs);
      if (parsed && typeof parsed === "object") prefs = parsed;
    } catch (e) {
      console.warn("prefs JSON parse failed", e);
    }
  }

  return { background, prefs };
}

export async function getBootstrapConfig(db: D1): Promise<BootstrapConfig> {
  const { results } = await db
    .prepare("SELECT key, value FROM config WHERE key IN ('background', 'prefs', 'auth_code')")
    .all<{ key: string; value: string }>();

  const map = new Map<string, string>();
  results?.forEach((r: { key: string; value: string }) => map.set(r.key, r.value));

  const kvRows: { key: string; value: string }[] = [];
  if (map.has("background")) kvRows.push({ key: "background", value: map.get("background")! });
  if (map.has("prefs")) kvRows.push({ key: "prefs", value: map.get("prefs")! });
  const { background, prefs } = parseKVConfig(kvRows);

  const authCode = map.get("auth_code");
  const isDefaultCode = !authCode || authCode === "admin";

  return { background, prefs, isDefaultCode };
}

export async function isDefaultAuthCode(db: D1): Promise<boolean> {
  const row = await db
    .prepare("SELECT value FROM config WHERE key = 'auth_code'")
    .first<{ value: string }>();
  return !row?.value || row.value === "admin";
}
