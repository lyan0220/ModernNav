import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen } from "./utils/icons";
import { LinkCard } from "./components/LinkCard";
import { SearchBar } from "./components/SearchBar";
import { ToastContainer } from "./components/Toast";
import { SyncIndicator } from "./components/SyncIndicator";
import { BackgroundLayer } from "./components/BackgroundLayer";
import { CategoryNav } from "./components/CategoryNav";
import { CommandPalette } from "./components/CommandPalette";
import { Footer } from "./components/Footer";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { useDashboardLogic } from "./hooks/useDashboardLogic";
import { useResponsiveColumns } from "./hooks/useResponsiveColumns";
import { useViewportScale } from "./hooks/useViewportScale";
import { useLanguage } from "./contexts/LanguageContext";

const App: React.FC = () => {
  const { state, actions } = useDashboardLogic();
  const {
    loading,
    categories,
    background,
    cardOpacity,
    themeMode,
    activeCategory,
    activeSubCategoryId,
    maxContainerWidth,
    cardWidth,
    cardHeight,
    gridColumns,
    siteTitle,
    faviconApi,
    footerGithub,
    footerLinks,
    searchEngines,
    navStyle,
    searchStyle,
  } = state;

  const navigate = useNavigate();
  const { t } = useLanguage();
  const viewportScale = useViewportScale();

  const [cmdOpen, setCmdOpen] = useState(false);
  const handleSearchClick = useCallback(() => setCmdOpen(true), []);
  const handleVisit = useCallback((linkId: string) => {
    navigator.sendBeacon("/api/visit", JSON.stringify({ linkId }));
  }, []);
  const handleOpenSettings = useCallback(() => navigate("/admin"), [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const scaledCardHeight = Math.round(cardHeight * viewportScale);
  const scaledCardWidth = Math.round(cardWidth * viewportScale);
  const scaledMaxContainerWidth = Math.round(maxContainerWidth * viewportScale);

  const effectiveColumns = useResponsiveColumns(
    gridColumns,
    scaledMaxContainerWidth,
    scaledCardWidth
  );

  useEffect(() => {
    document.title = siteTitle || "ModernNav";
  }, [siteTitle]);

  if (loading) {
    return (
      <div className="min-h-screen relative flex flex-col items-center pt-8 md:pt-12 px-4 bg-slate-50 dark:bg-slate-900">
        <BackgroundLayer background={background} />
        <div className="w-full max-w-[1000px] relative z-10">
          <SkeletonLoader
            cardOpacity={cardOpacity}
            themeMode={themeMode}
            maxContainerWidth={scaledMaxContainerWidth}
            cardWidth={scaledCardWidth}
            cardHeight={scaledCardHeight}
            gridColumns={effectiveColumns}
          />
        </div>
      </div>
    );
  }

  const visibleCategory = categories.find((c) => c.id === activeCategory);
  const visibleSubCategory = visibleCategory?.subCategories.find(
    (s) => s.id === activeSubCategoryId
  );

  return (
    <div className="min-h-screen relative selection:bg-[var(--theme-primary)] selection:text-white font-sans flex flex-col text-slate-800 dark:text-slate-100">
      <ToastContainer />

      <style>{`
        :root {
          --grid-cols: ${effectiveColumns};
        }
      `}</style>

      <BackgroundLayer background={background} />

      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        activeSubCategoryId={activeSubCategoryId}
        onCategoryClick={actions.handleMainCategoryClick}
        onSubCategoryClick={actions.handleSubCategoryClick}
        themeMode={themeMode}
        toggleTheme={actions.toggleTheme}
        toggleLanguage={actions.toggleLanguage}
        openSettings={handleOpenSettings}
        onSearchClick={handleSearchClick}
        navStyle={navStyle}
      />

      <CommandPalette
        categories={categories}
        themeMode={themeMode}
        faviconApi={faviconApi}
        searchEngines={searchEngines}
        onCategoryClick={actions.handleMainCategoryClick}
        onSubCategoryClick={actions.handleSubCategoryClick}
        toggleTheme={actions.toggleTheme}
        toggleLanguage={actions.toggleLanguage}
        navigate={navigate}
        open={cmdOpen}
        onOpenChange={setCmdOpen}
      />

      <div
        className="container mx-auto px-4 3xl:px-8 flex-1 flex flex-col items-center pt-20 md:pt-12 3xl:pt-16 4xl:pt-20 relative z-[10]"
        style={{ maxWidth: `${scaledMaxContainerWidth}px` }}
      >
        <section className="w-full mb-14 3xl:mb-20 4xl:mb-24 animate-fade-in-down relative z-[70] isolation-isolate">
          <SearchBar
            themeMode={themeMode}
            faviconApi={faviconApi}
            viewportScale={viewportScale}
            searchEngines={searchEngines}
            searchStyle={searchStyle}
          />
        </section>

        <main className="w-full pb-20 relative z-[10] space-y-8">
          {visibleSubCategory ? (
            <div key={visibleSubCategory.id} className="">
              <div
                className="flex items-center"
                style={{
                  gap: `${Math.round(16 * viewportScale)}px`,
                  marginBottom: `${Math.round(24 * viewportScale)}px`,
                }}
              >
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-400/30 dark:to-white/20" />
                <h3
                  className="font-bold uppercase tracking-[0.2em] px-2 text-slate-400 dark:text-white/50"
                  style={{ fontSize: `${Math.max(10, Math.round(10 * viewportScale))}px` }}
                >
                  {visibleSubCategory.title === "Default"
                    ? visibleCategory?.title
                    : visibleSubCategory.title}
                </h3>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-400/30 dark:to-white/20" />
              </div>

              <div className="grid gap-3 sm:gap-4 3xl:gap-5 4xl:gap-6 w-full responsive-grid">
                {visibleSubCategory.items.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    cardOpacity={cardOpacity}
                    themeMode={themeMode}
                    viewportScale={viewportScale}
                    scaledCardHeight={scaledCardHeight}
                    faviconApi={faviconApi}
                    onVisit={handleVisit}
                  />
                ))}
              </div>

              {visibleSubCategory.items.length === 0 && (
                <div className="text-center py-16 flex flex-col items-center gap-3 text-slate-400 dark:text-white/20">
                  <FolderOpen size={40} strokeWidth={1} />
                  <p className="text-sm">{t("no_links")}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-white/30">
              No sub-categories found. Click Settings to configure.
            </div>
          )}
        </main>
      </div>

      <SyncIndicator />

      <Footer github={footerGithub} links={footerLinks} />
    </div>
  );
};

export default App;
