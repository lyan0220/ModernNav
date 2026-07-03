import React, { useRef, useEffect, useState } from "react";
import { ChevronDown, Globe, Moon, Sun, Settings, Menu, X, Search } from "lucide-react";
import { Category, ThemeMode } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { useViewportScale } from "../hooks/useViewportScale";
import { getIconSize } from "../utils/favicon";

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  activeSubCategoryId: string;
  onCategoryClick: (cat: Category) => void;
  onSubCategoryClick: (catId: string, subId: string) => void;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  openSettings: () => void;
  onSearchClick: () => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  activeSubCategoryId,
  onCategoryClick,
  onSubCategoryClick,
  themeMode,
  toggleTheme,
  toggleLanguage,
  openSettings,
  onSearchClick,
}) => {
  const { t } = useLanguage();
  const viewportScale = useViewportScale();
  const s = (n: number) => getIconSize(n, viewportScale);
  const isDark = themeMode === ThemeMode.Dark;
  const [isExpanded, setIsExpanded] = useState(false);

  const [navPillStyle, setNavPillStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const navTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePill = () => {
      const activeTab = tabsRef.current[activeCategory];
      if (activeTab && navTrackRef.current) {
        const trackRect = navTrackRef.current.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();

        setNavPillStyle({
          left: tabRect.left - trackRect.left,
          width: tabRect.width,
          opacity: 1,
        });
      }
    };

    const timer = setTimeout(updatePill, 50);
    window.addEventListener("resize", updatePill);

    return () => {
      window.removeEventListener("resize", updatePill);
      clearTimeout(timer);
    };
  }, [activeCategory, categories]);

  const dropdownClasses = isDark ? "apple-glass-dark" : "apple-glass-light";
  const navDropdownItemBase = `text-left px-3 py-1.5 rounded-md text-xs transition-all duration-200 flex items-center justify-between group/item`;

  const getDropdownItemClass = (isActive: boolean) => {
    if (isActive) {
      return `${navDropdownItemBase} bg-[var(--theme-primary)] text-white font-medium shadow-md`;
    }
    return `${navDropdownItemBase} text-slate-700 dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.98]`;
  };

  const islandContainerClass = `relative flex items-center justify-center p-1.5 rounded-full border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]`;

  const islandStyle = {
    backdropFilter: `blur(var(--glass-blur)) saturate(180%)`,
    WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(180%)`,
  };

  const slidingPillClass = `absolute top-0 bottom-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] pointer-events-none bg-[color-mix(in_srgb,var(--theme-primary),transparent_80%)] dark:bg-white/10 shadow-[inset_0_2px_8px_-2px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-black/5 dark:border-white/5`;

  const categoryButtonBase = `
    relative z-10 flex items-center gap-1.5 px-4 py-2 3xl:px-5 3xl:py-2.5 rounded-full transition-colors duration-300 cursor-pointer select-none
    active:scale-95 transition-transform ease-out
  `;

  const categoryButtonColors = (isActive: boolean) => {
    if (isActive) {
      return "text-slate-900 dark:text-white font-medium";
    }
    return "text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white/80";
  };

  const actionButtonClass = `
    relative flex items-center justify-center p-2.5 rounded-full transition-all duration-200 ease-out
    active:scale-90 active:shadow-inner
    hover:bg-[var(--theme-primary)]/20 hover:text-current hover:border-[var(--theme-primary)]/10
    border border-transparent
    text-slate-600 dark:text-white/60
    active:bg-[var(--theme-primary)]/30
  `;

  const glassLayerNoise = (
    <div className="absolute inset-0 z-0 glass-noise pointer-events-none opacity-50 rounded-full" />
  );

  const glassLayerRim = (
    <div
      className="absolute inset-0 pointer-events-none rounded-full z-0"
      style={{
        boxShadow: isDark
          ? "inset 0 1px 0 0 rgba(255,255,255,0.08)"
          : "inset 0 1px 0 0 rgba(255,255,255,0.4)",
      }}
    />
  );

  const glassLayerSheen = (
    <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-white/[0.3] dark:from-white/[0.02] via-transparent to-transparent dark:to-black/[0.1] rounded-full" />
  );

  const mobileButtonClass =
    "p-2 rounded-lg transition-colors text-slate-600 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5";

  return (
    <>
      <nav className="md:hidden fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-white/5 backdrop-blur-xl">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => setIsExpanded(true)} className={mobileButtonClass}>
            <Menu size={s(20)} />
          </button>

          <div className="flex items-center gap-1">
            <button onClick={onSearchClick} className={mobileButtonClass}>
              <Search size={s(18)} />
            </button>
            <button onClick={toggleLanguage} className={mobileButtonClass}>
              <Globe size={s(18)} />
            </button>
            <button onClick={toggleTheme} className={mobileButtonClass}>
              {isDark ? <Moon size={s(18)} /> : <Sun size={s(18)} />}
            </button>
            <button onClick={openSettings} className={mobileButtonClass}>
              <Settings size={s(18)} />
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`md:hidden fixed inset-0 z-[2000] transition-all duration-300 ${
          isExpanded ? "visible" : "invisible"
        }`}
      >
        <div
          onClick={() => setIsExpanded(false)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            isExpanded ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`absolute top-0 left-0 bottom-0 w-[280px] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] flex flex-col ${
            isExpanded ? "translate-x-0" : "-translate-x-full"
          } bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-white/10`}
          style={{ backdropFilter: "blur(20px)" }}
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {t("sidebar_categories")}
            </h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 dark:text-white/40"
            >
              <X size={s(20)} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <div key={cat.id} className="space-y-1">
                  <button
                    onClick={() => {
                      onCategoryClick(cat);
                      if (cat.subCategories.length <= 1) setIsExpanded(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-[var(--theme-primary)] text-white shadow-md font-bold"
                        : "text-slate-600 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="text-sm">{cat.title}</span>
                    {cat.subCategories.length > 1 && (
                      <ChevronDown
                        size={s(14)}
                        className={`transition-transform duration-300 ${isActive ? "rotate-180" : "-rotate-90 opacity-40"}`}
                      />
                    )}
                  </button>

                  {isActive && cat.subCategories.length > 1 && (
                    <div className="mt-1 space-y-1 ml-2 pl-4 border-l border-white/10">
                      {cat.subCategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            onSubCategoryClick(cat.id, sub.id);
                            setIsExpanded(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                            activeSubCategoryId === sub.id
                              ? "text-[var(--theme-primary)] font-bold bg-[var(--theme-primary)]/10"
                              : "text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70"
                          }`}
                        >
                          {sub.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <nav className="hidden md:flex justify-center items-center py-6 3xl:py-8 px-4 sticky top-0 z-[100] isolation-isolate text-sm font-medium tracking-wide">
        <div className={islandContainerClass} style={islandStyle}>
          {glassLayerNoise}
          {glassLayerRim}
          {glassLayerSheen}

          <div className="relative z-10 flex items-center gap-1 3xl:gap-2 flex-wrap justify-center max-w-full px-1 3xl:px-2">
            <div className="relative flex items-center" ref={navTrackRef}>
              <div
                className={slidingPillClass}
                style={{
                  left: navPillStyle.left,
                  width: navPillStyle.width,
                  opacity: navPillStyle.opacity,
                  height: "100%",
                }}
              />
              {categories.map((cat) => {
                const hasSingleDefault =
                  cat.subCategories.length === 1 && cat.subCategories[0].title === "Default";
                const isActive = activeCategory === cat.id;
                return (
                  <div key={cat.id} className="relative group">
                    <button
                      ref={(el) => {
                        tabsRef.current[cat.id] = el;
                      }}
                      onClick={() => onCategoryClick(cat)}
                      className={`${categoryButtonBase} ${categoryButtonColors(isActive)}`}
                    >
                      <span className="truncate max-w-[120px] relative z-10">{cat.title}</span>
                      {!hasSingleDefault && (
                        <ChevronDown
                          size={s(14)}
                          className={`relative z-10 transition-transform duration-300 group-hover:rotate-180 ${
                            isActive ? "text-current" : "opacity-50"
                          }`}
                        />
                      )}
                    </button>
                    {!hasSingleDefault && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 hidden group-hover:block z-[100] min-w-[100px] animate-fade-in origin-top">
                        <div
                          className={`${dropdownClasses} rounded-xl p-1 flex flex-col gap-0.5 overflow-hidden ring-1 ring-white/5 shadow-2xl`}
                        >
                          {cat.subCategories.length > 0 ? (
                            cat.subCategories.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSubCategoryClick(cat.id, sub.id);
                                }}
                                className={getDropdownItemClass(
                                  activeCategory === cat.id && activeSubCategoryId === sub.id
                                )}
                              >
                                <span className="truncate">{sub.title}</span>
                                {activeCategory === cat.id && activeSubCategoryId === sub.id && (
                                  <div className="w-1 h-1 rounded-full bg-white shadow-sm"></div>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-[10px] text-center italic text-slate-400 dark:text-white/40">
                              {t("no_submenus")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="w-[1px] h-5 mx-2 rounded-full bg-slate-400/20 dark:bg-white/10" />

            <button onClick={onSearchClick} className={actionButtonClass} title="Search (⌘K)">
              <Search size={s(18)} />
            </button>
            <button onClick={toggleLanguage} className={actionButtonClass} title="Switch Language">
              <Globe size={s(18)} />
            </button>
            <button onClick={toggleTheme} className={actionButtonClass} title="Toggle Theme">
              {isDark ? <Moon size={s(18)} /> : <Sun size={s(18)} />}
            </button>
            <button onClick={openSettings} className={actionButtonClass} title={t("settings")}>
              <Settings size={s(18)} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};
