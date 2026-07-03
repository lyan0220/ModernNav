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

function flattenLinks(node: BookmarkNode, ts: number, prefix: string): LinkItem[] {
  const links: LinkItem[] = [];
  let idx = 0;

  function collect(n: BookmarkNode) {
    if (n.url) {
      links.push({
        id: `${ts}-${prefix}-${idx++}`,
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

      const subLinks = flattenLinks(child, ts, `fl-${catIdx}-${subIdx}`);
      if (subLinks.length > 0) {
        subCategories.push({
          id: `${ts}-sub-${catIdx}-${subIdx}`,
          title: child.title,
          items: subLinks,
        });
        subIdx++;
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
