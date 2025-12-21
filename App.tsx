import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Link as LinkIcon,
  Globe,
  FolderOpen,
  ChevronDown,
  Sun,
  Moon,
  Loader2,
  Github,
} from "lucide-react";
import * as Icons from "lucide-react";

import { SearchBar } from "./components/SearchBar";
import { GlassCard } from "./components/GlassCard";
import { LinkManagerModal } from "./components/LinkManagerModal";
import { ToastContainer } from "./components/Toast";
import { SyncIndicator } from "./components/SyncIndicator";
import { storageService, DEFAULT_BACKGROUND } from "./services/storage";
import { getDominantColor } from "./utils/color";
import { Category, ThemeMode } from "./types";
import { useLanguage } from "./contexts/LanguageContext";

const App: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [background, setBackground] = useState<string>(DEFAULT_BACKGROUND);
  const [cardOpacity, setCardOpacity] = useState<number>(0.1);
  const [themeColor, setThemeColor] = useState<string>("#6366f1");
  const [themeMode, setThemeMode] = useState<ThemeMode>(ThemeMode.Dark);
  const [isDefaultCode, setIsDefaultCode] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string>("");

  const { t, language, setLanguage } = useLanguage();

  // Navigation Animation State
  const [navPillStyle, setNavPillStyle] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const tabsRef = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const navTrackRef = useRef<HTMLDivElement>(null);

  const isFirstRender = useRef(true);

  // Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        // Simplified Load: Network First, Fallback to Cache
        const data = await storageService.fetchAllData();

        setCategories(data.categories);
        setBackground(data.background);
        setCardOpacity(data.prefs.cardOpacity);
        setThemeMode(data.prefs.themeMode);
        setIsDefaultCode(data.isDefaultCode);

        if (data.prefs.themeColor) {
          setThemeColor(data.prefs.themeColor);
        } else {
          if (
            data.background.startsWith("http") ||
            data.background.startsWith("data:")
          ) {
            const color = await getDominantColor(data.background);
            setThemeColor(color);
          }
        }

        if (data.categories.length > 0) {
          setActiveCategory(data.categories[0].id);
        }
      } catch (e) {
        console.error("Failed to load app data", e);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Update Sliding Pill Position
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
  }, [activeCategory, categories, loading]);

  // Extract color when background changes (UI only)
  useEffect(() => {
    const updateTheme = async () => {
      if (
        !loading &&
        (background.startsWith("http") || background.startsWith("data:"))
      ) {
        const color = await getDominantColor(background);
        setThemeColor(color);
      }
    };
    updateTheme();
  }, [background, loading]);

  // Persist Preferences
  useEffect(() => {
    if (loading) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    storageService.savePreferences({
      cardOpacity,
      themeColor,
      themeMode,
    });
  }, [themeMode, cardOpacity, themeColor, loading]);

  // Ensure activeCategory is valid
  useEffect(() => {
    if (!loading && categories.length > 0) {
      const currentExists = categories.find((c) => c.id === activeCategory);
      if (!currentExists) {
        const firstCat = categories[0];
        setActiveCategory(firstCat.id);
      }
    }
  }, [categories, activeCategory, loading]);

  // Ensure activeSubCategoryId is valid
  useEffect(() => {
    if (!loading) {
      const currentCat = categories.find((c) => c.id === activeCategory);
      if (currentCat && currentCat.subCategories.length > 0) {
        const subExists = currentCat.subCategories.find(
          (s) => s.id === activeSubCategoryId
        );
        if (!subExists) {
          setActiveSubCategoryId(currentCat.subCategories[0].id);
        }
      } else {
        setActiveSubCategoryId("");
      }
    }
  }, [activeCategory, categories, activeSubCategoryId, loading]);

  // Handle appearance updates from Modal
  const handleUpdateAppearance = (url: string, opacity: number) => {
    setBackground(url);
    setCardOpacity(opacity);
    storageService.setBackground(url);
  };

  const toggleTheme = () => {
    setThemeMode((prev) =>
      prev === ThemeMode.Dark ? ThemeMode.Light : ThemeMode.Dark
    );
  };

  const handleMainCategoryClick = (cat: Category) => {
    setActiveCategory(cat.id);
    if (cat.subCategories.length > 0) {
      setActiveSubCategoryId(cat.subCategories[0].id);
    } else {
      setActiveSubCategoryId("");
    }
  };

  const handleSubCategoryClick = (catId: string, subId: string) => {
    setActiveCategory(catId);
    setActiveSubCategoryId(subId);
  };

  const renderIcon = (iconValue: string | undefined) => {
    const defaultIcon = <Icons.Link size={20} strokeWidth={1.5} />;
    if (!iconValue) return defaultIcon;

    if (iconValue.startsWith("http") || iconValue.startsWith("data:")) {
      return (
        <img
          src={iconValue}
          alt="icon"
          className="w-6 h-6 object-contain drop-shadow-md rounded-md"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }

    // @ts-ignore
    const IconComponent = Icons[iconValue];
    if (IconComponent) {
      return <IconComponent size={20} strokeWidth={1.5} />;
    }

    return (
      <span className="text-xl leading-none filter drop-shadow-md">
        {iconValue}
      </span>
    );
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  const isDark = themeMode === ThemeMode.Dark;
  const isBackgroundUrl =
    background.startsWith("http") || background.startsWith("data:");

  const adaptiveGlassBlur = isDark ? 50 : 30;

  const dropdownClasses = isDark ? "apple-glass-dark" : "apple-glass-light";
  const navDropdownItemBase = `text-left px-3 py-1.5 rounded-md text-xs transition-all duration-200 flex items-center justify-between group/item`;

  const getDropdownItemClass = (isActive: boolean) => {
    if (isActive) {
      return `${navDropdownItemBase} bg-[var(--theme-primary)] text-white font-medium shadow-md`;
    }
    return `${navDropdownItemBase} ${
      isDark
        ? "text-white/90 hover:bg-white/10"
        : "text-slate-700 hover:bg-black/5"
    } active:scale-[0.98]`;
  };

  const navIconColor = isDark ? "text-white/60" : "text-slate-600";

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
    <div
      className={`absolute inset-0 pointer-events-none z-0 bg-gradient-to-br ${
        isDark
          ? "from-white/[0.02] via-transparent to-black/[0.1]"
          : "from-white/[0.3] via-transparent to-transparent"
      } rounded-full`}
    />
  );

  const islandContainerClass = `relative flex items-center justify-center p-1.5 rounded-full border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
    isDark
      ? "bg-slate-900/60 border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]"
      : "bg-white/60 border-white/40 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)]"
  }`;

  const islandStyle = {
    backdropFilter: `blur(${adaptiveGlassBlur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${adaptiveGlassBlur}px) saturate(180%)`,
  };

  const slidingPillClass = `absolute top-0 bottom-0 rounded-full transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] pointer-events-none ${
    isDark
      ? "bg-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border border-white/5"
      : "bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] border border-black/5"
  }`;

  const categoryButtonBase = `
    relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-full transition-colors duration-300 cursor-pointer select-none
    active:scale-95 transition-transform ease-out
  `;

  const categoryButtonColors = (isActive: boolean) => {
    if (isActive) {
      return isDark ? "text-white font-medium" : "text-slate-900 font-medium";
    }
    return isDark
      ? "text-white/50 hover:text-white/80"
      : "text-slate-500 hover:text-slate-800";
  };

  const actionButtonClass = `
    relative flex items-center justify-center p-2.5 rounded-full transition-all duration-200 ease-out
    active:scale-90 active:shadow-inner
    hover:bg-[var(--theme-primary)]/20 hover:text-current hover:border-[var(--theme-primary)]/10
    border border-transparent
    ${navIconColor}
    active:bg-[var(--theme-primary)]/30
  `;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center flex-col gap-4">
        <Loader2 className="animate-spin text-white/40" size={40} />
        <div className="text-white/30 text-sm font-medium tracking-widest uppercase">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  const visibleCategory = categories.find((c) => c.id === activeCategory);
  const visibleSubCategory = visibleCategory?.subCategories.find(
    (s) => s.id === activeSubCategoryId
  );

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden selection:bg-[var(--theme-primary)] selection:text-white font-sans flex flex-col ${
        isDark ? "text-slate-100" : "text-slate-800"
      }`}
    >
      <ToastContainer />

      <style>{`
        :root {
          --theme-primary: ${themeColor};
          --theme-hover: color-mix(in srgb, ${themeColor}, black 10%);
          --theme-active: color-mix(in srgb, ${themeColor}, black 20%);
          --theme-light: color-mix(in srgb, ${themeColor}, white 30%);
          --glass-blur: ${adaptiveGlassBlur}px;
        }
      `}</style>

      {/* Background Layer */}
      <div className="fixed inset-0 z-0">
        {isBackgroundUrl ? (
          <img
            key={background}
            src={background}
            alt="Background"
            className="w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: isDark ? 0.8 : 1 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = "0";
            }}
          />
        ) : (
          <div
            className="w-full h-full transition-opacity duration-700"
            style={{
              background: background,
              opacity: isDark ? 1 : 0.9,
            }}
          />
        )}
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isDark ? "bg-slate-900/30" : "bg-white/10"
          }`}
        ></div>
      </div>

      {/* Navigation - Dynamic Island */}
      <nav className="flex justify-center items-center py-6 px-4 relative z-[100] isolation-isolate text-sm font-medium tracking-wide">
        <div className={islandContainerClass} style={islandStyle}>
          {glassLayerNoise}
          {glassLayerRim}
          {glassLayerSheen}

          <div className="relative z-10 flex items-center gap-1 flex-wrap justify-center max-w-full px-1">
            {/* SECTION 1: Categories */}
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
                  cat.subCategories.length === 1 &&
                  cat.subCategories[0].title === "Default";
                const isActive = activeCategory === cat.id;
                return (
                  <div key={cat.id} className="relative group">
                    <button
                      ref={(el) => {
                        tabsRef.current[cat.id] = el;
                      }}
                      onClick={() => handleMainCategoryClick(cat)}
                      className={`${categoryButtonBase} ${categoryButtonColors(
                        isActive
                      )}`}
                    >
                      <span className="truncate max-w-[120px] relative z-10">
                        {cat.title}
                      </span>
                      {!hasSingleDefault && (
                        <ChevronDown
                          size={14}
                          className={`relative z-10 transition-transform duration-300 group-hover:rotate-180 ${
                            isActive ? "text-current" : "opacity-50"
                          }`}
                        />
                      )}
                    </button>
                    {!hasSingleDefault && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 hidden group-hover:block z-[100] w-34 animate-fade-in origin-top">
                        <div
                          className={`${dropdownClasses} rounded-xl p-1 flex flex-col gap-0.5 overflow-hidden ring-1 ring-white/5 shadow-2xl`}
                        >
                          {cat.subCategories.length > 0 ? (
                            cat.subCategories.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubCategoryClick(cat.id, sub.id);
                                }}
                                className={getDropdownItemClass(
                                  activeCategory === cat.id &&
                                    activeSubCategoryId === sub.id
                                )}
                              >
                                <span className="truncate">{sub.title}</span>
                                {activeCategory === cat.id &&
                                  activeSubCategoryId === sub.id && (
                                    <div className="w-1 h-1 rounded-full bg-white shadow-sm"></div>
                                  )}
                              </button>
                            ))
                          ) : (
                            <div
                              className={`px-3 py-2 text-[10px] text-center italic ${
                                isDark ? "text-white/40" : "text-slate-400"
                              }`}
                            >
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

            {/* SECTION 2: Separator */}
            <div
              className={`w-[1px] h-5 mx-2 rounded-full ${
                isDark ? "bg-white/10" : "bg-slate-400/20"
              }`}
            ></div>

            {/* SECTION 3: Actions */}
            <button
              onClick={toggleLanguage}
              className={actionButtonClass}
              title="Switch Language"
            >
              <Globe size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className={actionButtonClass}
              title="Toggle Theme"
            >
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className={actionButtonClass}
              title={t("settings")}
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 flex-1 flex flex-col items-center pt-8 md:pt-12 max-w-[900px] relative z-[10]">
        <section className="w-full mb-14 animate-fade-in-down relative z-[70] isolation-isolate">
          <SearchBar themeMode={themeMode} />
        </section>

        <main className="w-full pb-20 relative z-[10] space-y-8">
          {visibleSubCategory ? (
            <div key={visibleSubCategory.id} className="">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`h-[1px] flex-1 bg-gradient-to-r from-transparent ${
                    isDark ? "to-white/20" : "to-slate-400/30"
                  }`}
                ></div>
                <h3
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2 ${
                    isDark ? "text-white/50" : "text-slate-400"
                  }`}
                >
                  {visibleSubCategory.title === "Default"
                    ? visibleCategory?.title
                    : visibleSubCategory.title}
                </h3>
                <div
                  className={`h-[1px] flex-1 bg-gradient-to-l from-transparent ${
                    isDark ? "to-white/20" : "to-slate-400/30"
                  }`}
                ></div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {visibleSubCategory.items.map((link) => (
                  <GlassCard
                    key={link.id}
                    hoverEffect={true}
                    opacity={cardOpacity}
                    themeMode={themeMode}
                    onClick={() => window.open(link.url, "_blank")}
                    className="h-24 flex flex-col items-center justify-center text-center p-2 relative group"
                    title={
                      link.description
                        ? `${link.description}\n${link.url}`
                        : `${link.title}\n${link.url}`
                    }
                  >
                    <div
                      className={`mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] flex items-center justify-center h-6 w-6 ${
                        isDark ? "text-white/90" : "text-slate-700"
                      }`}
                    >
                      {renderIcon(link.icon)}
                    </div>
                    <span
                      className={`text-[12px] font-medium truncate w-full px-1 transition-colors duration-300 ${
                        isDark
                          ? "text-white/80 group-hover:text-white"
                          : "text-slate-800"
                      }`}
                    >
                      {link.title}
                    </span>
                  </GlassCard>
                ))}
              </div>

              {visibleSubCategory.items.length === 0 && (
                <div
                  className={`text-center py-16 flex flex-col items-center gap-3 ${
                    isDark ? "text-white/20" : "text-slate-400"
                  }`}
                >
                  <FolderOpen size={40} strokeWidth={1} />
                  <p className="text-sm">{t("no_links")}</p>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`text-center py-12 ${
                isDark ? "text-white/30" : "text-slate-400"
              }`}
            >
              No sub-categories found. Click Settings to configure.
            </div>
          )}
        </main>
      </div>

      <SyncIndicator />

      <footer
        className={`relative z-10 py-5 text-center text-[11px] flex flex-col md:flex-row justify-center items-center gap-4 border-t backdrop-blur-sm transition-colors duration-500 ${
          isDark
            ? "text-white/30 border-white/5 bg-black/10"
            : "text-slate-500 border-black/5 bg-white/20"
        }`}
      >
        <div className="flex gap-4">
          <a
            href="https://math.nyc.mn"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--theme-primary)] cursor-pointer transition-colors"
          >
            <LinkIcon size={12} /> {t("friendly_links")}
          </a>
          <a
            href="https://github.com/lyan0220"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--theme-primary)] cursor-pointer transition-colors"
          >
            <Github size={12} /> {t("about_us")}
          </a>
        </div>
        <div className="flex items-center">
          <p>
            {t("copyright")} © {new Date().getFullYear()} ModernNav
            <span className="mx-2 opacity-50">|</span>
            <span className="opacity-80">{t("powered_by")}</span>
          </p>
          <a
            href="https://github.com/lyan0220/ModernNav"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 font-semibold hover:text-[var(--theme-primary)] transition-colors"
          >
            Lyan
          </a>
        </div>
      </footer>

      <LinkManagerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        setCategories={setCategories}
        background={background}
        prefs={{ cardOpacity }}
        onUpdateAppearance={handleUpdateAppearance}
        isDefaultCode={isDefaultCode}
      />
    </div>
  );
};

export default App;
