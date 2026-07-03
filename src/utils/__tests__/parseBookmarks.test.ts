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

    const named = result.filter((c) => c.title !== "Uncategorized" && c.title !== "未分类书签");
    expect(named.length).toBe(2);
    expect(named[0].title).toBe("Dev Tools");
    expect(named[0].subCategories[0].items.length).toBe(2);
    expect(named[0].subCategories[0].items[0].url).toBe("https://github.com");
    expect(named[1].title).toBe("Social");
    expect(named[1].subCategories[0].items[0].url).toBe("https://twitter.com");
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
