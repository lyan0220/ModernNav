import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Command } from "cmdk";
import { Search, FolderOpen, Sun, Moon, Globe, Settings, Home } from "lucide-react";
import { Category, SearchEngine, ThemeMode } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { SmartIcon } from "./SmartIcon";
import { getFaviconUrl } from "../utils/favicon";
import { fuzzyMatch } from "../utils/fuzzyMatch";
import { getInitials } from "../utils/pinyinInitials";

interface FlatLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  categoryId: string;
  categoryTitle: string;
}

interface CommandAction {
  id: string;
  label: string;
  keywords: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  categories: Category[];
  themeMode: ThemeMode;
  faviconApi?: string;
  searchEngines: SearchEngine[];
  onCategoryClick: (cat: Category) => void;
  onSubCategoryClick: (catId: string, subId: string) => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  navigate: (path: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.15em] [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:dark:text-white/30";

const itemClass = [
  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer",
  "transition-all duration-200 ease-out",
  "text-slate-700 dark:text-white/80",
  "hover:bg-[var(--theme-primary)] dark:hover:bg-[var(--theme-primary)]",
  "data-[selected=true]:bg-[var(--theme-primary)]/40",
  "data-[selected=true]:ring-1 data-[selected=true]:ring-[var(--theme-primary)]",
  "data-[selected=true]:shadow-[0_0_12px_-3px_var(--theme-primary)]",
  "data-[selected=true]:text-slate-900 dark:data-[selected=true]:text-white",
  "data-[selected=true]:[&_.cmd-icon]:text-[var(--theme-primary)]",
].join(" ");

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  categories,
  themeMode,
  faviconApi,
  searchEngines,
  onCategoryClick,
  onSubCategoryClick,
  toggleTheme,
  toggleLanguage,
  navigate,
  open,
  onOpenChange,
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // avoid synchronous setState inside effect to prevent cascading renders
    if (!open) {
      const id = window.setTimeout(() => setSearch(""), 0);
      return () => window.clearTimeout(id);
    }
    return;
  }, [open]);

  const flatLinks = useMemo<FlatLink[]>(
    () =>
      categories.flatMap((cat) =>
        cat.subCategories.flatMap((sub) =>
          sub.items.map((link) => ({
            ...link,
            categoryId: cat.id,
            categoryTitle: cat.title,
          }))
        )
      ),
    [categories]
  );

  const categoryItems = useMemo(
    () =>
      categories.flatMap((cat) => [
        {
          id: `cat-${cat.id}`,
          title: cat.title,
          type: "category" as const,
          cat,
          subId: undefined as string | undefined,
        },
        ...cat.subCategories
          .filter((sub) => sub.title !== "Default")
          .map((sub) => ({
            id: `sub-${sub.id}`,
            title: `${cat.title} / ${sub.title}`,
            type: "subcategory" as const,
            cat,
            subId: sub.id,
          })),
      ]),
    [categories]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = 0;
    });
  }, []);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const commands = useMemo<CommandAction[]>(() => {
    const isDark = themeMode === ThemeMode.Dark;
    return [
      {
        id: "toggle-theme",
        label: t("cmd_toggle_theme"),
        keywords: "切换主题 Toggle Theme dark light",
        icon: isDark ? <Moon size={16} /> : <Sun size={16} />,
        action: () => {
          toggleTheme();
          close();
        },
      },
      {
        id: "toggle-lang",
        label: t("cmd_toggle_lang"),
        keywords: "切换语言 Switch Language english chinese",
        icon: <Globe size={16} />,
        action: () => {
          toggleLanguage();
          close();
        },
      },
      {
        id: "go-admin",
        label: t("cmd_go_admin"),
        keywords: "进入管理后台 Go to Admin settings",
        icon: <Settings size={16} />,
        action: () => {
          navigate("/admin");
          close();
        },
      },
      {
        id: "go-home",
        label: t("cmd_go_home"),
        keywords: "返回首页 Back to Home",
        icon: <Home size={16} />,
        action: () => {
          navigate("/");
          close();
        },
      },
    ];
  }, [t, themeMode, toggleTheme, toggleLanguage, navigate, close]);

  const customFilter = useCallback((value: string, search: string, keywords?: string[]): number => {
    if (value.startsWith("search-engine:")) return 1;
    const targets = [value, ...(keywords ?? [])];
    let best = 0;
    for (const target of targets) {
      const { score } = fuzzyMatch(search, target);
      best = Math.max(best, score);
    }
    return best;
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] isolate" onClick={close}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      <div className="relative flex justify-center px-4 pt-[20vh] pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto w-full max-w-[560px] rounded-2xl border overflow-hidden
            bg-white/70 dark:bg-slate-900/70
            border-white/40 dark:border-white/10
            shadow-[0_20px_60px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)]
            animate-scale-in"
          style={{
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
          }}
        >
          <div className="absolute inset-0 z-0 glass-noise pointer-events-none opacity-40 rounded-2xl" />
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl z-0"
            style={{
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.08)",
            }}
          />
          <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-white/[0.15] dark:from-white/[0.02] via-transparent to-transparent rounded-2xl" />

          <Command filter={customFilter} loop className="relative z-10">
            <div className="flex items-center gap-3 px-4 border-b border-white/10 dark:border-white/5">
              <Search size={18} className="text-slate-400 dark:text-white/30 shrink-0" />
              <Command.Input
                autoFocus
                value={search}
                onValueChange={handleSearchChange}
                placeholder={t("cmd_placeholder")}
                className="flex-1 h-12 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/30"
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/5 dark:bg-white/10 text-slate-400 dark:text-white/30 border border-black/5 dark:border-white/5">
                Esc
              </kbd>
            </div>

            <Command.List
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto overscroll-contain p-2"
            >
              <Command.Empty className="py-8 text-center text-sm text-slate-400 dark:text-white/30">
                {t("cmd_no_results")}
              </Command.Empty>

              <Command.Group heading={t("cmd_links")} className={groupHeadingClass}>
                {flatLinks.map((link) => (
                  <Command.Item
                    key={link.id}
                    value={link.title}
                    keywords={[
                      getInitials(link.title),
                      link.url,
                      link.description ?? "",
                      getInitials(link.description ?? ""),
                    ]}
                    onSelect={() => {
                      navigator.sendBeacon("/api/visit", JSON.stringify({ linkId: link.id }));
                      window.open(link.url, "_blank");
                      close();
                    }}
                    className={itemClass}
                  >
                    <span className="cmd-icon w-6 h-6 shrink-0 flex items-center justify-center rounded overflow-hidden text-slate-400 dark:text-white/40 transition-colors duration-200">
                      <SmartIcon
                        icon={link.icon || getFaviconUrl(link.url, faviconApi)}
                        size={18}
                        imgClassName="object-contain"
                        faviconApi={faviconApi}
                        sourceUrl={link.icon ? undefined : link.url}
                      />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{link.title}</div>
                      <div className="truncate text-xs text-slate-400 dark:text-white/30">
                        {link.url}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/25">
                      {link.categoryTitle}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading={t("cmd_categories")} className={groupHeadingClass}>
                {categoryItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.title}
                    keywords={[getInitials(item.title)]}
                    onSelect={() => {
                      if (item.subId) {
                        onSubCategoryClick(item.cat.id, item.subId);
                      } else {
                        onCategoryClick(item.cat);
                      }
                      close();
                    }}
                    className={itemClass}
                  >
                    <FolderOpen
                      size={16}
                      className="cmd-icon shrink-0 text-slate-400 dark:text-white/40 transition-colors duration-200"
                    />
                    <span className="truncate">{item.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading={t("cmd_commands")} className={groupHeadingClass}>
                {commands.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    keywords={[cmd.keywords, getInitials(cmd.label)]}
                    onSelect={cmd.action}
                    className={itemClass}
                  >
                    <span className="cmd-icon shrink-0 text-slate-400 dark:text-white/40 transition-colors duration-200">
                      {cmd.icon}
                    </span>
                    <span className="truncate">{cmd.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              {search.trim() && (
                <Command.Group heading={t("cmd_search_engines")} className={groupHeadingClass}>
                  {searchEngines.map((engine) => (
                    <Command.Item
                      key={engine.id}
                      value={`search-engine:${engine.id}`}
                      onSelect={() => {
                        window.open(`${engine.urlTemplate}${encodeURIComponent(search)}`, "_blank");
                        close();
                      }}
                      className={itemClass}
                    >
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded overflow-hidden">
                        <SmartIcon
                          icon={getFaviconUrl(engine.icon, faviconApi)}
                          size={14}
                          imgClassName="object-contain"
                          faviconApi={faviconApi}
                          sourceUrl={engine.icon}
                        />
                      </span>
                      <span className="truncate">
                        {t("cmd_search_with", {
                          query: search,
                          engine: engine.name,
                        })}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </div>
      </div>
    </div>,
    document.body
  );
};
