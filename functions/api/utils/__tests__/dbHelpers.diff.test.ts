import { describe, it, expect } from "vitest";
import { diffCategories } from "../diff";
import { rebuildCategories } from "../reads";
import type { Category, SubCategory, LinkItem } from "../../../../src/types";

// Helpers -----------------------------------------------------------------

function cat(
  id: string,
  title: string,
  subs: {
    id: string;
    title: string;
    items: { id: string; title: string; url: string; icon?: string }[];
  }[] = []
): Category {
  return {
    id,
    title,
    subCategories: subs.map((s) => ({
      id: s.id,
      title: s.title,
      items: s.items.map((i) => ({
        id: i.id,
        title: i.title,
        url: i.url,
        ...(i.icon ? { icon: i.icon } : {}),
      })),
    })),
  };
}

const baseline: Category[] = [
  cat("c1", "Home", [
    {
      id: "s1",
      title: "Search",
      items: [
        { id: "l1", title: "Google", url: "https://google.com", icon: "Search" },
        { id: "l2", title: "Bing", url: "https://bing.com" },
      ],
    },
  ]),
  cat("c2", "Dev", [
    { id: "s2", title: "Code", items: [{ id: "l3", title: "GitHub", url: "https://github.com" }] },
  ]),
];

// Tests -------------------------------------------------------------------

describe("diffCategories", () => {
  it("produces an empty diff when next equals current", () => {
    const diff = diffCategories(baseline, baseline);
    expect(diff.isEmpty).toBe(true);
    expect(diff.categories.inserts).toHaveLength(0);
    expect(diff.categories.updates).toHaveLength(0);
    expect(diff.categories.deletes).toHaveLength(0);
    expect(diff.subcategories.updates).toHaveLength(0);
    expect(diff.links.updates).toHaveLength(0);
  });

  it("emits a single category UPDATE on rename (the headline win)", () => {
    const next = baseline.map((c) => (c.id === "c1" ? { ...c, title: "Homepage" } : c));
    const diff = diffCategories(baseline, next);

    expect(diff.categories.updates).toHaveLength(1);
    expect(diff.categories.updates[0]).toEqual({ id: "c1", title: "Homepage" });
    expect(diff.categories.inserts).toHaveLength(0);
    expect(diff.categories.deletes).toHaveLength(0);
    // No sub/link churn from a pure rename.
    expect(diff.subcategories).toEqual({
      inserts: [],
      updates: [],
      deletes: [],
    });
    expect(diff.links).toEqual({
      inserts: [],
      updates: [],
      deletes: [],
    });
    expect(diff.isEmpty).toBe(false);
  });

  it("emits a single link UPDATE on title change (no cascade)", () => {
    const next = baseline.map((c) =>
      c.id === "c1"
        ? {
            ...c,
            subCategories: c.subCategories!.map((s: SubCategory) =>
              s.id === "s1"
                ? {
                    ...s,
                    items: s.items.map((l: LinkItem) =>
                      l.id === "l1" ? { ...l, title: "Google Search" } : l
                    ),
                  }
                : s
            ),
          }
        : c
    );
    const diff = diffCategories(baseline, next);

    expect(diff.links.updates).toHaveLength(1);
    expect(diff.links.updates[0]).toEqual({ id: "l1", title: "Google Search" });
    expect(diff.categories.updates).toHaveLength(0);
    expect(diff.subcategories.updates).toHaveLength(0);
  });

  it("inserts a new link without touching siblings", () => {
    const next = baseline.map((c) =>
      c.id === "c1"
        ? {
            ...c,
            subCategories: c.subCategories!.map((s: SubCategory) =>
              s.id === "s1"
                ? {
                    ...s,
                    items: [
                      ...s.items,
                      { id: "l4", title: "DuckDuckGo", url: "https://duckduckgo.com" },
                    ],
                  }
                : s
            ),
          }
        : c
    );
    const diff = diffCategories(baseline, next);

    expect(diff.links.inserts).toHaveLength(1);
    expect(diff.links.inserts[0]).toMatchObject({
      id: "l4",
      subcategoryId: "s1",
      title: "DuckDuckGo",
      url: "https://duckduckgo.com",
      position: 2,
    });
    expect(diff.links.updates).toHaveLength(0);
    expect(diff.links.deletes).toHaveLength(0);
  });

  it("emits a single link DELETE on removal (no sibling churn)", () => {
    const next = baseline.map((c) =>
      c.id === "c1"
        ? {
            ...c,
            subCategories: c.subCategories!.map((s: SubCategory) =>
              s.id === "s1" ? { ...s, items: s.items.filter((l: LinkItem) => l.id !== "l2") } : s
            ),
          }
        : c
    );
    const diff = diffCategories(baseline, next);

    expect(diff.links.deletes).toEqual(["l2"]);
    expect(diff.links.inserts).toHaveLength(0);
    expect(diff.links.updates).toHaveLength(0);
  });

  it("deletes a whole category and relies on cascade for its children", () => {
    const next = baseline.filter((c) => c.id !== "c2");
    const diff = diffCategories(baseline, next);

    expect(diff.categories.deletes).toEqual(["c2"]);
    // Sub s2 belongs to the deleted category -> not emitted (cascade handles it).
    expect(diff.subcategories.deletes).toHaveLength(0);
    // Link l3 under s2 -> not emitted (cascade handles it).
    expect(diff.links.deletes).toHaveLength(0);
  });

  it("deletes a subcategory but not its parent (explicit sub delete)", () => {
    const next = baseline.map((c) =>
      c.id === "c1"
        ? { ...c, subCategories: c.subCategories!.filter((s: SubCategory) => s.id !== "s1") }
        : c
    );
    const diff = diffCategories(baseline, next);

    expect(diff.categories.deletes).toHaveLength(0);
    expect(diff.subcategories.deletes).toEqual(["s1"]);
    // Links l1/l2 under the deleted sub -> not emitted (cascade handles them).
    expect(diff.links.deletes).toHaveLength(0);
  });

  it("moves a link to a different subcategory via subcategoryId UPDATE", () => {
    const next = baseline.map((c) =>
      c.id === "c2"
        ? {
            ...c,
            subCategories: c.subCategories!.map((s: SubCategory) =>
              s.id === "s2"
                ? { ...s, items: [...s.items, baseline[0].subCategories![0].items[0]] }
                : s
            ),
          }
        : {
            ...c,
            subCategories: c.subCategories!.map((s: SubCategory) =>
              s.id === "s1" ? { ...s, items: s.items.filter((l: LinkItem) => l.id !== "l1") } : s
            ),
          }
    );
    const diff = diffCategories(baseline, next);

    const l1Update = diff.links.updates.find((u) => u.id === "l1");
    expect(l1Update).toBeDefined();
    expect(l1Update!.subcategoryId).toBe("s2");
    expect(l1Update!.position).toBe(1);
  });

  it("adds a brand-new category with its subtree", () => {
    const next = [
      ...baseline,
      cat("c3", "Tools", [
        {
          id: "s3",
          title: "Misc",
          items: [{ id: "l5", title: "Notion", url: "https://notion.so" }],
        },
      ]),
    ];
    const diff = diffCategories(baseline, next);

    expect(diff.categories.inserts).toHaveLength(1);
    expect(diff.categories.inserts[0]).toEqual({ id: "c3", title: "Tools", position: 2 });
    expect(diff.subcategories.inserts).toHaveLength(1);
    expect(diff.subcategories.inserts[0]).toMatchObject({
      id: "s3",
      categoryId: "c3",
      position: 0,
    });
    expect(diff.links.inserts).toHaveLength(1);
    expect(diff.links.inserts[0]).toMatchObject({ id: "l5", subcategoryId: "s3" });
  });

  it("emits position UPDATEs on reorder without touching unchanged rows", () => {
    // Swap the order of the two top-level categories.
    const next: Category[] = [baseline[1], baseline[0]];
    const diff = diffCategories(baseline, next);

    // Both categories changed position (0<->1).
    const updatedIds = diff.categories.updates.map((u) => u.id).sort();
    expect(updatedIds).toEqual(["c1", "c2"]);
    expect(diff.categories.updates.every((u) => Object.keys(u).length === 2)).toBe(true);
  });

  it("skips UPDATEs when only description changes from undefined to null equivalence", () => {
    // description absent on both sides -> no diff noise.
    const next = baseline.map((c) => ({ ...c }));
    const diff = diffCategories(baseline, next);
    expect(diff.isEmpty).toBe(true);
  });

  it("moves a link out of a subcategory being deleted (regression: cascade order)", () => {
    // Regression test: sub s1 is deleted, but its link l1 moves to s2 (which survives).
    // The old statement order (delete-before-update) would cascade-kill l1 before the
    // UPDATE could rescue it. New order (update-before-delete) keeps l1 alive.
    const next = baseline.map((c) => {
      if (c.id === "c1") {
        return {
          ...c,
          subCategories: c.subCategories!.filter((s: SubCategory) => s.id !== "s1"),
        };
      }
      if (c.id === "c2") {
        return {
          ...c,
          subCategories: c.subCategories!.map((s: SubCategory) => {
            if (s.id === "s2") {
              return {
                ...s,
                items: [...s.items, baseline[0].subCategories![0].items[0]],
              };
            }
            return s;
          }),
        };
      }
      return c;
    });

    const diff = diffCategories(baseline, next);

    // s1 is deleted, so we should see a sub delete.
    expect(diff.subcategories.deletes).toContain("s1");
    // l1 is moved from s1 to s2, so we should see a link update (not a delete+insert).
    const l1Update = diff.links.updates.find((u) => u.id === "l1");
    expect(l1Update).toBeDefined();
    expect(l1Update!.subcategoryId).toBe("s2");
    // No explicit delete of l1 — it survived via the update.
    expect(diff.links.deletes).not.toContain("l1");
  });
});

describe("rebuildCategories", () => {
  it("round-trips nested structure through row form", () => {
    const cats = [{ id: "c1", title: "Home", position: 0 }];
    const subs = [{ id: "s1", category_id: "c1", title: "Search", position: 0 }];
    const links = [
      {
        id: "l1",
        subcategory_id: "s1",
        title: "Google",
        url: "https://google.com",
        description: null,
        icon: "Search",
        position: 0,
        visit_count: 0,
      },
    ];

    const result = rebuildCategories(cats, subs, links);
    expect(result).toEqual([
      {
        id: "c1",
        title: "Home",
        subCategories: [
          {
            id: "s1",
            title: "Search",
            items: [{ id: "l1", title: "Google", url: "https://google.com", icon: "Search" }],
          },
        ],
      },
    ]);
  });

  it("returns empty array when no categories exist", () => {
    expect(rebuildCategories([], [], [])).toEqual([]);
  });
});
