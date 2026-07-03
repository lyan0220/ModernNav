import { useEffect, useMemo, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { useBootstrap, useUpdateCategories, useUpdatePrefs } from "../services/queries";
import { storageService } from "../services/storage";
import { Category, LinkItem, ThemeMode } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import {
  DEFAULT_FAVICON_API,
  DEFAULT_SITE_TITLE,
  DEFAULT_FOOTER_GITHUB,
  DEFAULT_LAYOUT,
  DEFAULT_PREFS,
  DEFAULT_SEARCH_ENGINES,
} from "../constants/defaults";

export const useDashboardLogic = () => {
  const { data, isLoading, isPlaceholderData } = useBootstrap();
  const updateCategories = useUpdateCategories();
  const updatePrefs = useUpdatePrefs();
  const isMutating = useIsMutating();

  // Notify legacy SyncIndicator subscribers when any mutation runs.
  useEffect(() => {
    storageService.notifySyncStatus(isMutating > 0);
  }, [isMutating]);

  const rawCategories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const background = data?.background ?? "";
  const prefs = data?.prefs ?? DEFAULT_PREFS;
  const isDefaultCode = data?.isDefaultCode ?? false;

  const cardOpacity = prefs.cardOpacity;
  const themeMode = prefs.themeMode;
  const themeColorAuto = prefs.themeColorAuto ?? true;
  const maxContainerWidth = prefs.maxContainerWidth ?? DEFAULT_LAYOUT.maxContainerWidth;
  const cardWidth = prefs.cardWidth ?? DEFAULT_LAYOUT.cardWidth;
  const cardHeight = prefs.cardHeight ?? DEFAULT_LAYOUT.cardHeight;
  const gridColumns = prefs.gridColumns ?? DEFAULT_LAYOUT.gridColumns;
  const siteTitle = prefs.siteTitle ?? DEFAULT_SITE_TITLE;
  const faviconApi = prefs.faviconApi ?? DEFAULT_FAVICON_API;
  const footerGithub = prefs.footerGithub ?? DEFAULT_FOOTER_GITHUB;
  const footerLinks = prefs.footerLinks ?? [];
  const searchEngines = prefs.searchEngines ?? DEFAULT_SEARCH_ENGINES;

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string>("");

  const { language, setLanguage, t } = useLanguage();

  const frequentLinksConfig = prefs.frequentLinks ?? {
    enabled: true,
    count: 10,
    pinToTop: true,
  };

  const categories = useMemo(() => {
    if (!frequentLinksConfig.enabled) return rawCategories;

    const allLinks: (LinkItem & { _catId: string })[] = [];
    for (const cat of rawCategories) {
      for (const sub of cat.subCategories) {
        for (const link of sub.items) {
          if (link.visitCount && link.visitCount > 0) {
            allLinks.push({ ...link, _catId: cat.id });
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
          items: topLinks.map(({ _catId: _, ...link }) => link),
        },
      ],
    };

    return frequentLinksConfig.pinToTop
      ? [frequentCategory, ...rawCategories]
      : [...rawCategories, frequentCategory];
  }, [
    rawCategories,
    frequentLinksConfig.enabled,
    frequentLinksConfig.count,
    frequentLinksConfig.pinToTop,
    t,
  ]);

  // Show loading only when we have no cached placeholder.
  const loading = isLoading && isPlaceholderData === false;

  // Derive the actually-rendered selection from `categories` so we never need
  // to write state from inside an effect just to fix up an invalid id.
  const visibleCategory = categories.find((c) => c.id === activeCategory) ?? categories[0] ?? null;
  const effectiveActiveCategory = visibleCategory?.id ?? "";
  const effectiveActiveSubCategoryId =
    visibleCategory?.subCategories.find((s) => s.id === activeSubCategoryId)?.id ??
    visibleCategory?.subCategories[0]?.id ??
    "";

  // --- Action handlers ---
  const setCategories: React.Dispatch<React.SetStateAction<Category[]>> = (next) => {
    const value =
      typeof next === "function" ? (next as (c: Category[]) => Category[])(categories) : next;
    updateCategories.mutate(value);
  };

  const toggleTheme = () => {
    const newTheme = themeMode === ThemeMode.Dark ? ThemeMode.Light : ThemeMode.Dark;
    updatePrefs.mutate({ ...prefs, themeMode: newTheme });
  };

  const toggleLanguage = () => setLanguage(language === "en" ? "zh" : "en");

  const handleMainCategoryClick = (cat: Category) => {
    setActiveCategory(cat.id);
    setActiveSubCategoryId(cat.subCategories[0]?.id ?? "");
  };

  const handleSubCategoryClick = (catId: string, subId: string) => {
    setActiveCategory(catId);
    setActiveSubCategoryId(subId);
  };

  return {
    state: {
      loading,
      categories,
      background,
      cardOpacity,
      themeColorAuto,
      themeMode,
      isDefaultCode,
      activeCategory: effectiveActiveCategory,
      activeSubCategoryId: effectiveActiveSubCategoryId,
      maxContainerWidth,
      cardWidth,
      cardHeight,
      gridColumns,
      siteTitle,
      faviconApi,
      footerGithub,
      footerLinks,
      searchEngines,
    },
    actions: {
      setCategories,
      toggleTheme,
      toggleLanguage,
      handleMainCategoryClick,
      handleSubCategoryClick,
    },
  };
};
