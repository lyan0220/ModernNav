# visit_count 兑现 + HTML 书签导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the dead `visit_count` D1 column — track link clicks via sendBeacon, surface a configurable "Frequently Used" virtual category on the dashboard — and add an HTML bookmark import parser so users can bootstrap their link collection from a browser export.

**Architecture:** Two independent features sharing no code. Feature 1 adds a new `POST /api/visit` endpoint (atomic D1 increment), threads `visitCount` through `LinkRow → LinkItem → bootstrap`, and computes a virtual "Frequently Used" category in `useDashboardLogic` driven by a new `frequentLinks` prefs field. Feature 2 adds a pure-function `parseBookmarksHtml` parser using `DOMParser`, wires a second file-input button in `DataTab`, and feeds the result through the existing `updateCategories.mutate` path.

**Tech Stack:** React 18 · Vite 5 · Vitest · Cloudflare Pages Functions · D1 · TanStack Query v5 · Tailwind 3 · Lucide React

## Global Constraints

- Path alias `@/` → `src/` in all frontend imports
- IDs use `Date.now().toString()` pattern — offset with index suffix when generating multiples
- i18n keys: flat `snake_case` in `src/locales/{en,zh}.json`; access via `useLanguage()` → `t("key")`
- CSS: use `@layer components` token classes (`btn-primary`, `btn-secondary`, `input-primary`, `panel-base`) for admin UI
- Prettier: double quotes, semicolons, printWidth 100, trailing comma es5
- Tests: Vitest with `import { describe, it, expect } from "vitest"`, files in `__tests__/` next to source
- Backend: Cloudflare Pages Functions, export `onRequestPost`/`onRequestGet`, `env.DB` is the D1 binding
- `visit_count` must NOT enter the diff engine — independent from `diffCategories`/`applyCategoryDiff`

---

### Task 1: Backend — `POST /api/visit` endpoint + read path

**Files:**
- Create: `functions/api/visit.ts`
- Modify: `functions/api/utils/reads.ts:17-25,76-80,94-101`
- Modify: `src/types/index.ts:1-7`

**Interfaces:**
- Consumes: `ensureSchema(db)` from `functions/api/utils/schema.ts`, `D1` type from same
- Produces: `LinkItem.visitCount?: number` (used by Task 2, Task 3); `POST /api/visit` endpoint (used by Task 2)

- [ ] **Step 1: Add `visitCount` to `LinkItem` type**

In `src/types/index.ts`, add the optional field:

```typescript
export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  visitCount?: number;
}
```

- [ ] **Step 2: Add `visit_count` to `LinkRow` and read query**

In `functions/api/utils/reads.ts`, update the `LinkRow` interface (line 17) and the SQL query (line 78):

```typescript
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
```

Update the SQL query on line 76-80:

```typescript
    db
      .prepare(
        "SELECT id, subcategory_id, title, url, description, icon, position, visit_count FROM links ORDER BY position ASC, id ASC"
      )
      .all<LinkRow>(),
```

Update `rebuildCategories` (line 94-101) to include `visitCount` in the `LinkItem` construction:

```typescript
    const item: LinkItem = {
      id: l.id,
      title: l.title,
      url: l.url,
      ...(l.description ? { description: l.description } : {}),
      ...(l.icon ? { icon: l.icon } : {}),
      ...(l.visit_count > 0 ? { visitCount: l.visit_count } : {}),
    };
```

- [ ] **Step 3: Create `functions/api/visit.ts`**

```typescript
import { ensureSchema } from "./utils/schema";

interface Env {
  DB?: D1Database;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  try {
    if (!env.DB) return new Response(null, { status: 204 });

    await ensureSchema(env.DB);

    const body = (await request.json()) as { linkId?: string };
    if (!body?.linkId || typeof body.linkId !== "string") {
      return new Response(null, { status: 204 });
    }

    await env.DB.prepare("UPDATE links SET visit_count = visit_count + 1 WHERE id = ?")
      .bind(body.linkId)
      .run();

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
};
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors from the new field (it's optional so existing code unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts functions/api/utils/reads.ts functions/api/visit.ts
git commit -m "feat(visit): add POST /api/visit endpoint and thread visitCount through read path"
```

---

### Task 2: Frontend — sendBeacon on link click

**Files:**
- Modify: `src/components/GlassCard.tsx:4-13,15-27,61-66`
- Modify: `src/App.tsx:187-225`
- Modify: `src/components/CommandPalette.tsx:262-264`

**Interfaces:**
- Consumes: `LinkItem.visitCount` from Task 1; `POST /api/visit` from Task 1
- Produces: `GlassCard.onBeforeNavigate?: () => void` prop (internal wiring, not used outside this task)

- [ ] **Step 1: Add `onBeforeNavigate` prop to `GlassCard`**

In `src/components/GlassCard.tsx`, add the prop and wire it into onClick:

```typescript
interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  opacity?: number;
  themeMode?: ThemeMode;
  href?: string;
  target?: string;
  rel?: string;
  onBeforeNavigate?: () => void;
}
```

Update the destructuring (line 15) to include `onBeforeNavigate`:

```typescript
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  hoverEffect = false,
  onClick,
  onBeforeNavigate,
  opacity = 0.1,
  themeMode = ThemeMode.Dark,
  style,
  href,
  target,
  rel,
  ...props
}) => {
```

Replace the `onClick` on the Component (line 63) with a wrapper that calls `onBeforeNavigate` first:

```typescript
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        onBeforeNavigate?.();
        onClick?.(e);
      }}
```

- [ ] **Step 2: Wire sendBeacon in `App.tsx`**

In `src/App.tsx`, add an `onBeforeNavigate` prop to the GlassCard at line 187:

```typescript
                    <GlassCard
                      key={link.id}
                      hoverEffect={true}
                      opacity={cardOpacity}
                      themeMode={themeMode}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onBeforeNavigate={() => {
                        navigator.sendBeacon(
                          "/api/visit",
                          JSON.stringify({ linkId: link.id })
                        );
                      }}
```

- [ ] **Step 3: Wire sendBeacon in `CommandPalette.tsx`**

In `src/components/CommandPalette.tsx`, add sendBeacon before `window.open` (line 262-264):

```typescript
                    onSelect={() => {
                      navigator.sendBeacon(
                        "/api/visit",
                        JSON.stringify({ linkId: link.id })
                      );
                      window.open(link.url, "_blank");
                      close();
                    }}
```

- [ ] **Step 4: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/GlassCard.tsx src/App.tsx src/components/CommandPalette.tsx
git commit -m "feat(visit): send beacon on link click from dashboard and command palette"
```

---

### Task 3: Frequently Used virtual category + prefs config

**Files:**
- Modify: `src/types/index.ts:38-52`
- Modify: `src/constants/defaults.ts:58-67`
- Modify: `src/hooks/useDashboardLogic.ts:27,93-113`
- Modify: `src/components/settings/GeneralTab.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`
- Modify: `src/App.tsx` (virtual category rendering)

**Interfaces:**
- Consumes: `LinkItem.visitCount` from Task 1; `categories` from `useBootstrap`
- Produces: `UserPreferences.frequentLinks`; virtual `__frequent__` category in dashboard state

- [ ] **Step 1: Add `frequentLinks` to `UserPreferences`**

In `src/types/index.ts`, add to the `UserPreferences` interface:

```typescript
export interface UserPreferences {
  cardOpacity: number;
  themeColor?: string;
  themeMode: ThemeMode;
  themeColorAuto?: boolean;
  maxContainerWidth?: number;
  cardWidth?: number;
  cardHeight?: number;
  gridColumns?: number;
  siteTitle?: string;
  faviconApi?: string;
  footerGithub?: string;
  footerLinks?: FooterLink[];
  searchEngines?: SearchEngine[];
  frequentLinks?: {
    enabled: boolean;
    count: number;
    pinToTop: boolean;
  };
}
```

- [ ] **Step 2: Add i18n keys**

In `src/locales/en.json`, add before the closing `}`:

```json
  "label_frequent_links": "Frequently Used",
  "label_frequent_links_desc": "Show a virtual category with your most visited links.",
  "label_frequent_enabled": "Enable",
  "label_frequent_count": "Number of links",
  "label_frequent_pin_top": "Pin to top",
  "frequent_category_title": "Frequently Used"
```

In `src/locales/zh.json`, add before the closing `}`:

```json
  "label_frequent_links": "常用链接",
  "label_frequent_links_desc": "显示一个虚拟分类，展示您最常访问的链接。",
  "label_frequent_enabled": "启用",
  "label_frequent_count": "显示数量",
  "label_frequent_pin_top": "置顶显示",
  "frequent_category_title": "最近常用"
```

- [ ] **Step 3: Compute virtual category in `useDashboardLogic`**

In `src/hooks/useDashboardLogic.ts`, replace the simple `categories` memo (line 27) and add the virtual category logic:

```typescript
  const rawCategories = useMemo(() => data?.categories ?? [], [data?.categories]);

  const frequentLinksConfig = prefs.frequentLinks ?? {
    enabled: true,
    count: 10,
    pinToTop: true,
  };

  const categories = useMemo(() => {
    if (!frequentLinksConfig.enabled) return rawCategories;

    const allLinks: (LinkItem & { catId: string })[] = [];
    for (const cat of rawCategories) {
      for (const sub of cat.subCategories) {
        for (const link of sub.items) {
          if (link.visitCount && link.visitCount > 0) {
            allLinks.push({ ...link, catId: cat.id });
          }
        }
      }
    }

    if (allLinks.length === 0) return rawCategories;

    allLinks.sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0));
    const topLinks = allLinks.slice(0, frequentLinksConfig.count);

    const frequentCategory: Category = {
      id: "__frequent__",
      title: t("frequent_category_title"),
      subCategories: [
        {
          id: "__frequent__-sub",
          title: "Default",
          items: topLinks.map(({ catId: _, ...link }) => link),
        },
      ],
    };

    return frequentLinksConfig.pinToTop
      ? [frequentCategory, ...rawCategories]
      : [...rawCategories, frequentCategory];
  }, [rawCategories, frequentLinksConfig.enabled, frequentLinksConfig.count, frequentLinksConfig.pinToTop, t]);
```

Add the missing imports at the top of the file:

```typescript
import { Category, LinkItem, ThemeMode } from "../types";
```

(Replace the existing `import { Category, ThemeMode } from "../types";` on line 5.)

Also add `const { t } = useLanguage();` inside the hook (the import for `useLanguage` is already present on line 6).

Add `t` inside the hook body, after the existing `useLanguage` destructuring on line 55:

Actually, `useLanguage` is already imported and used on line 55 (`const { language, setLanguage } = useLanguage();`). Change it to:

```typescript
  const { language, setLanguage, t } = useLanguage();
```

- [ ] **Step 4: Add GeneralTab section for frequentLinks config**

In `src/components/settings/GeneralTab.tsx`, import `TrendingUp` from lucide-react (add to line 2 imports), and add a new `SettingsSection` before the save/reset buttons (before line 242).

Add to the `formData` state (line 36):

```typescript
  const [formData, setFormData] = useState({
    siteTitle: prefs.siteTitle || DEFAULT_SITE_TITLE,
    faviconApi: prefs.faviconApi || DEFAULT_FAVICON_API,
    footerGithub: prefs.footerGithub || DEFAULT_FOOTER_GITHUB,
    footerLinks: prefs.footerLinks || DEFAULT_FOOTER_LINKS,
    searchEngines: prefs.searchEngines ?? DEFAULT_SEARCH_ENGINES,
    frequentLinks: prefs.frequentLinks ?? { enabled: true, count: 10, pinToTop: true },
  });
```

Add the new section JSX before the save/reset button div (before line 242):

```tsx
      <SettingsSection
        icon={TrendingUp}
        title={t("label_frequent_links")}
        description={t("label_frequent_links_desc")}
      >
        <div className="space-y-3">
          <SettingsRow label={t("label_frequent_enabled")}>
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  frequentLinks: {
                    ...formData.frequentLinks,
                    enabled: !formData.frequentLinks.enabled,
                  },
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.frequentLinks.enabled
                  ? "bg-[var(--theme-primary)]"
                  : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  formData.frequentLinks.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </SettingsRow>
          {formData.frequentLinks.enabled && (
            <>
              <SettingsRow label={t("label_frequent_count")}>
                <select
                  value={formData.frequentLinks.count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      frequentLinks: {
                        ...formData.frequentLinks,
                        count: Number(e.target.value),
                      },
                    })
                  }
                  className="input-primary text-xs"
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </SettingsRow>
              <SettingsRow label={t("label_frequent_pin_top")}>
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      frequentLinks: {
                        ...formData.frequentLinks,
                        pinToTop: !formData.frequentLinks.pinToTop,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.frequentLinks.pinToTop
                      ? "bg-[var(--theme-primary)]"
                      : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                      formData.frequentLinks.pinToTop ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </SettingsRow>
            </>
          )}
        </div>
      </SettingsSection>
```

- [ ] **Step 5: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/constants/defaults.ts src/hooks/useDashboardLogic.ts src/components/settings/GeneralTab.tsx src/locales/en.json src/locales/zh.json
git commit -m "feat(visit): add frequently used virtual category with configurable prefs"
```

---

### Task 4: Bookmark parser — TDD

**Files:**
- Create: `src/utils/parseBookmarks.ts`
- Create: `src/utils/__tests__/parseBookmarks.test.ts`

**Interfaces:**
- Consumes: `Category`, `SubCategory`, `LinkItem` from `src/types/index.ts`
- Produces: `parseBookmarksHtml(html: string): Category[]` (used by Task 5)

- [ ] **Step 1: Write failing tests**

Create `src/utils/__tests__/parseBookmarks.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseBookmarksHtml } from "../parseBookmarks";

const CHROME_BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3>Bookmarks Bar</H3>
    <DL><p>
        <DT><H3>Dev Tools</H3>
        <DL><p>
            <DT><A HREF="https://github.com">GitHub</A>
            <DT><A HREF="https://gitlab.com">GitLab</A>
        </DL><p>
        <DT><H3>Social</H3>
        <DL><p>
            <DT><A HREF="https://twitter.com">Twitter</A>
        </DL><p>
    </DL><p>
    <DT><H3>Other Bookmarks</H3>
    <DL><p>
        <DT><A HREF="https://example.com">Example</A>
    </DL><p>
</DL><p>`;

const NESTED_BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<DL><p>
    <DT><H3>Work</H3>
    <DL><p>
        <DT><H3>Frontend</H3>
        <DL><p>
            <DT><H3>React</H3>
            <DL><p>
                <DT><A HREF="https://react.dev">React Docs</A>
                <DT><H3>Libraries</H3>
                <DL><p>
                    <DT><A HREF="https://tanstack.com">TanStack</A>
                </DL><p>
            </DL><p>
        </DL><p>
    </DL><p>
</DL><p>`;

const TOP_LEVEL_LINKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<DL><p>
    <DT><A HREF="https://orphan1.com">Orphan 1</A>
    <DT><A HREF="https://orphan2.com">Orphan 2</A>
    <DT><H3>Folder</H3>
    <DL><p>
        <DT><A HREF="https://nested.com">Nested</A>
    </DL><p>
</DL><p>`;

const EMPTY_BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<DL><p>
</DL><p>`;

const JS_LINKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE>
<DL><p>
    <DT><H3>Misc</H3>
    <DL><p>
        <DT><A HREF="javascript:void(0)">Bookmarklet</A>
        <DT><A HREF="https://real.com">Real Link</A>
        <DT><A HREF="data:text/html,hello">Data URI</A>
    </DL><p>
</DL><p>`;

describe("parseBookmarksHtml", () => {
  it("parses Chrome bookmark format with standard folders", () => {
    const result = parseBookmarksHtml(CHROME_BOOKMARKS);

    expect(result.length).toBe(2);
    expect(result[0].title).toBe("Dev Tools");
    expect(result[0].subCategories[0].items.length).toBe(2);
    expect(result[0].subCategories[0].items[0].url).toBe("https://github.com");
    expect(result[1].title).toBe("Social");
    expect(result[1].subCategories[0].items[0].url).toBe("https://twitter.com");
  });

  it("skips browser built-in folder names and promotes children", () => {
    const result = parseBookmarksHtml(CHROME_BOOKMARKS);
    const titles = result.map((c) => c.title);
    expect(titles).not.toContain("Bookmarks Bar");
    expect(titles).not.toContain("Other Bookmarks");
  });

  it("promotes links from skipped built-in folders to uncategorized", () => {
    const result = parseBookmarksHtml(CHROME_BOOKMARKS);
    const uncategorized = result.find(
      (c) => c.title === "Uncategorized" || c.title === "未分类书签"
    );
    expect(uncategorized).toBeDefined();
    expect(uncategorized!.subCategories[0].items[0].url).toBe("https://example.com");
  });

  it("flattens deeply nested folders (3+ levels) into subcategory", () => {
    const result = parseBookmarksHtml(NESTED_BOOKMARKS);

    expect(result.length).toBe(1);
    expect(result[0].title).toBe("Work");
    expect(result[0].subCategories[0].title).toBe("Frontend");
    const items = result[0].subCategories[0].items;
    expect(items.some((l) => l.url === "https://react.dev")).toBe(true);
    expect(items.some((l) => l.url === "https://tanstack.com")).toBe(true);
  });

  it("groups top-level orphan links into uncategorized category", () => {
    const result = parseBookmarksHtml(TOP_LEVEL_LINKS);
    const uncategorized = result.find(
      (c) => c.title === "Uncategorized" || c.title === "未分类书签"
    );
    expect(uncategorized).toBeDefined();
    expect(uncategorized!.subCategories[0].items.length).toBe(2);
    expect(uncategorized!.subCategories[0].items[0].url).toBe("https://orphan1.com");
  });

  it("returns empty array for empty bookmark file", () => {
    const result = parseBookmarksHtml(EMPTY_BOOKMARKS);
    expect(result).toEqual([]);
  });

  it("filters out javascript: and data: links", () => {
    const result = parseBookmarksHtml(JS_LINKS);
    expect(result.length).toBe(1);
    const allLinks = result[0].subCategories.flatMap((s) => s.items);
    expect(allLinks.length).toBe(1);
    expect(allLinks[0].url).toBe("https://real.com");
  });

  it("generates unique IDs for all entities", () => {
    const result = parseBookmarksHtml(CHROME_BOOKMARKS);
    const ids = new Set<string>();
    for (const cat of result) {
      expect(ids.has(cat.id)).toBe(false);
      ids.add(cat.id);
      for (const sub of cat.subCategories) {
        expect(ids.has(sub.id)).toBe(false);
        ids.add(sub.id);
        for (const link of sub.items) {
          expect(ids.has(link.id)).toBe(false);
          ids.add(link.id);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run src/utils/__tests__/parseBookmarks.test.ts`
Expected: FAIL — `parseBookmarks` module not found

- [ ] **Step 3: Implement `parseBookmarksHtml`**

Create `src/utils/parseBookmarks.ts`:

```typescript
import type { Category, SubCategory, LinkItem } from "../types";

const SKIP_FOLDERS = new Set([
  "bookmarks bar",
  "书签栏",
  "bookmarks toolbar",
  "favorites bar",
  "other bookmarks",
  "其他书签",
  "mobile bookmarks",
  "移动设备书签",
]);

const BLOCKED_PROTOCOLS = ["javascript:", "data:"];

interface BookmarkNode {
  title: string;
  url?: string;
  children: BookmarkNode[];
}

function parseDL(dl: Element): BookmarkNode[] {
  const nodes: BookmarkNode[] = [];
  const dts = dl.querySelectorAll(":scope > dt");

  for (const dt of dts) {
    const anchor = dt.querySelector(":scope > a");
    if (anchor) {
      const href = anchor.getAttribute("href") ?? "";
      if (BLOCKED_PROTOCOLS.some((p) => href.toLowerCase().startsWith(p))) continue;
      nodes.push({ title: anchor.textContent?.trim() || href, url: href, children: [] });
      continue;
    }
    const h3 = dt.querySelector(":scope > h3");
    const childDl = dt.querySelector(":scope > dl");
    if (h3 && childDl) {
      const title = h3.textContent?.trim() || "Untitled";
      nodes.push({ title, children: parseDL(childDl) });
    }
  }
  return nodes;
}

function flattenLinks(node: BookmarkNode): LinkItem[] {
  const links: LinkItem[] = [];
  let linkIdx = 0;

  function collect(n: BookmarkNode) {
    if (n.url) {
      links.push({
        id: `${Date.now()}-fl-${linkIdx++}`,
        title: n.title,
        url: n.url,
      });
    }
    for (const child of n.children) {
      collect(child);
    }
  }

  for (const child of node.children) {
    collect(child);
  }
  return links;
}

export function parseBookmarksHtml(html: string): Category[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rootDl = doc.querySelector("dl");
  if (!rootDl) return [];

  const rootNodes = parseDL(rootDl);

  const expandedNodes: BookmarkNode[] = [];
  for (const node of rootNodes) {
    if (!node.url && SKIP_FOLDERS.has(node.title.toLowerCase())) {
      expandedNodes.push(...node.children);
    } else {
      expandedNodes.push(node);
    }
  }

  const categories: Category[] = [];
  const orphanLinks: LinkItem[] = [];
  let catIdx = 0;
  const ts = Date.now();

  for (const node of expandedNodes) {
    if (node.url) {
      if (!BLOCKED_PROTOCOLS.some((p) => node.url!.toLowerCase().startsWith(p))) {
        orphanLinks.push({
          id: `${ts}-orphan-${orphanLinks.length}`,
          title: node.title,
          url: node.url,
        });
      }
      continue;
    }

    const subCategories: SubCategory[] = [];
    const directLinks: LinkItem[] = [];
    let subIdx = 0;
    let linkIdx = 0;

    for (const child of node.children) {
      if (child.url) {
        directLinks.push({
          id: `${ts}-link-${catIdx}-0-${linkIdx++}`,
          title: child.title,
          url: child.url,
        });
        continue;
      }

      const subLinks = flattenLinks(child);
      if (subLinks.length > 0) {
        subCategories.push({
          id: `${ts}-sub-${catIdx}-${subIdx++}`,
          title: child.title,
          items: subLinks.map((l, i) => ({
            ...l,
            id: `${ts}-link-${catIdx}-${subIdx - 1}-${i}`,
          })),
        });
      }
    }

    if (directLinks.length > 0) {
      if (subCategories.length > 0) {
        subCategories[0] = {
          ...subCategories[0],
          items: [...directLinks, ...subCategories[0].items],
        };
      } else {
        subCategories.push({
          id: `${ts}-sub-${catIdx}-0`,
          title: "Default",
          items: directLinks,
        });
      }
    }

    if (subCategories.length > 0) {
      categories.push({
        id: `${ts}-cat-${catIdx++}`,
        title: node.title,
        subCategories,
      });
    }
  }

  if (orphanLinks.length > 0) {
    categories.push({
      id: `${ts}-cat-uncategorized`,
      title: "Uncategorized",
      subCategories: [
        {
          id: `${ts}-sub-uncategorized`,
          title: "Default",
          items: orphanLinks,
        },
      ],
    });
  }

  return categories;
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/utils/__tests__/parseBookmarks.test.ts`
Expected: PASS — all 7 tests green

- [ ] **Step 5: Run full test suite + typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/parseBookmarks.ts src/utils/__tests__/parseBookmarks.test.ts
git commit -m "feat(bookmarks): add HTML bookmark parser with tests"
```

---

### Task 5: Wire bookmark import into DataTab UI

**Files:**
- Modify: `src/components/settings/DataTab.tsx`
- Modify: `src/components/admin/DataPage.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Interfaces:**
- Consumes: `parseBookmarksHtml` from Task 4; `Category[]` from `useBootstrap`
- Produces: `DataTabProps.onImportBookmarks` callback

- [ ] **Step 1: Add i18n keys for bookmark import**

In `src/locales/en.json`, add before the closing `}`:

```json
  "import_bookmarks": "Import Browser Bookmarks",
  "import_bookmarks_desc": "Import bookmarks from an HTML file exported by your browser.",
  "import_bookmarks_confirm": "Import {count} categories with {links} links?",
  "import_bookmarks_success": "Successfully imported {count} categories with {links} links!",
  "import_bookmarks_error": "Not a valid bookmark file. Please export bookmarks as HTML from your browser.",
  "import_bookmarks_empty": "No links found in the bookmark file.",
  "confirm": "Confirm",
```

In `src/locales/zh.json`, add before the closing `}`:

```json
  "import_bookmarks": "导入浏览器书签",
  "import_bookmarks_desc": "从浏览器导出的 HTML 书签文件中导入链接。",
  "import_bookmarks_confirm": "即将导入 {count} 个分类，共 {links} 个链接，确认？",
  "import_bookmarks_success": "成功导入 {count} 个分类，共 {links} 个链接！",
  "import_bookmarks_error": "不是有效的书签文件。请从浏览器导出 HTML 格式的书签。",
  "import_bookmarks_empty": "书签文件中未找到链接。",
  "confirm": "确认",
```

- [ ] **Step 2: Add `onImportBookmarks` to `DataTab`**

Rewrite `src/components/settings/DataTab.tsx` to add a second file input for bookmarks:

Add imports at the top:

```typescript
import { FileUp } from "lucide-react";
import { parseBookmarksHtml } from "../../utils/parseBookmarks";
```

Add to the `DataTabProps` interface:

```typescript
interface DataTabProps {
  onImport: (categories: Category[], background?: string, prefs?: UserPreferences) => void;
  onImportBookmarks: (categories: Category[]) => void;
  background: string;
  prefs: UserPreferences;
}
```

Update the destructuring:

```typescript
export const DataTab: React.FC<DataTabProps> = ({
  onImport,
  onImportBookmarks,
  background: _background,
  prefs: _prefs,
}) => {
```

Add a new ref and state for bookmark import confirmation:

```typescript
  const bookmarkInputRef = useRef<HTMLInputElement>(null);
  const [pendingBookmarks, setPendingBookmarks] = useState<{
    categories: Category[];
    catCount: number;
    linkCount: number;
  } | null>(null);
```

Add the bookmark file handler:

```typescript
  const handleBookmarkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const html = await file.text();
      const categories = parseBookmarksHtml(html);
      if (categories.length === 0) {
        setImportStatus({ type: "error", message: t("import_bookmarks_empty") });
        setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
        return;
      }
      const linkCount = categories.reduce(
        (sum, c) => sum + c.subCategories.reduce((s, sub) => s + sub.items.length, 0),
        0
      );
      setPendingBookmarks({ categories, catCount: categories.length, linkCount });
    } catch {
      setImportStatus({ type: "error", message: t("import_bookmarks_error") });
      setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
    }
    e.target.value = "";
  };

  const confirmBookmarkImport = () => {
    if (!pendingBookmarks) return;
    onImportBookmarks(pendingBookmarks.categories);
    setImportStatus({
      type: "success",
      message: t("import_bookmarks_success")
        .replace("{count}", String(pendingBookmarks.catCount))
        .replace("{links}", String(pendingBookmarks.linkCount)),
    });
    setPendingBookmarks(null);
    setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
  };
```

Add a new `SettingsSection` after the existing restore section (after line 114's `</SettingsSection>`):

```tsx
      <SettingsSection
        icon={FileUp}
        title={t("import_bookmarks")}
        description={t("import_bookmarks_desc")}
      >
        <input
          type="file"
          ref={bookmarkInputRef}
          onChange={handleBookmarkFileChange}
          accept=".html,.htm"
          className="hidden"
        />
        <button
          onClick={() => bookmarkInputRef.current?.click()}
          className="btn-secondary w-full py-3 font-bold uppercase tracking-widest group"
        >
          <FileUp
            size={s(18)}
            className="text-amber-400 group-hover:-translate-y-0.5 transition-transform"
          />{" "}
          {t("import_bookmarks")}
        </button>
        {pendingBookmarks && (
          <div className="mt-4 p-4 rounded-xl text-xs font-bold border bg-amber-500/10 border-amber-500/20 text-amber-400 flex items-center justify-between gap-3">
            <span>
              {t("import_bookmarks_confirm")
                .replace("{count}", String(pendingBookmarks.catCount))
                .replace("{links}", String(pendingBookmarks.linkCount))}
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setPendingBookmarks(null)}
                className="btn-secondary px-3 py-1.5 text-[10px]"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmBookmarkImport}
                className="btn-primary px-3 py-1.5 text-[10px]"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        )}
      </SettingsSection>
```

- [ ] **Step 3: Wire `onImportBookmarks` in `DataPage.tsx`**

Update `src/components/admin/DataPage.tsx` to pass the new prop:

```typescript
export const DataPage: React.FC = () => {
  const { data } = useBootstrap();
  const updateCategories = useUpdateCategories();
  const updateBackground = useUpdateBackground();
  const updatePrefs = useUpdatePrefs();

  const prefs = data?.prefs ?? DEFAULT_PREFS;
  const background = data?.background ?? DEFAULT_BACKGROUND;
  const currentCategories = data?.categories ?? [];

  return (
    <DataTab
      background={background}
      prefs={prefs}
      onImport={(categories, newBg, newPrefs) => {
        updateCategories.mutate(categories);
        if (newBg) updateBackground.mutate(newBg);
        if (newPrefs) updatePrefs.mutate(newPrefs);
      }}
      onImportBookmarks={(imported) => {
        updateCategories.mutate([...currentCategories, ...imported]);
      }}
    />
  );
};
```

- [ ] **Step 4: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: PASS — all existing tests + bookmark parser tests green

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/DataTab.tsx src/components/admin/DataPage.tsx src/locales/en.json src/locales/zh.json
git commit -m "feat(bookmarks): wire HTML bookmark import into DataTab with confirmation dialog"
```
