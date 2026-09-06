import {
  AnimationCurve,
  AnimationLevel,
  FontWeightOption,
  NavStyle,
  SearchEngine,
  SearchStyle,
  ThemeMode,
  UserPreferences,
} from "../types";

export const DEFAULT_THEME_COLOR = "#8b9dc3";
export const DEFAULT_FAVICON_API = "https://favicon.im/{domain}?larger=true";

export const FALLBACK_FAVICON_APIS = [
  "https://favicon.vemetric.com/{domain}",
  "https://www.google.com/s2/favicons?domain={domain}&sz=64",
  "https://duckduckgo.com/ip2/{domain}.ico",
];
export const DEFAULT_SITE_TITLE = "ModernNav";
export const DEFAULT_FOOTER_GITHUB = "https://github.com/lyan0220";
export const DEFAULT_FOOTER_LINKS = [{ title: "Friendly Links", url: "https://coyoo.ggff.net/" }];

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = [
  {
    id: "google",
    name: "Google",
    urlTemplate: "https://www.google.com/search?q=",
    icon: "google.com",
  },
  {
    id: "baidu",
    name: "Baidu",
    urlTemplate: "https://www.baidu.com/s?wd=",
    icon: "baidu.com",
  },
  {
    id: "bing",
    name: "Bing",
    urlTemplate: "https://www.bing.com/search?q=",
    icon: "bing.com",
  },
  {
    id: "github",
    name: "GitHub",
    urlTemplate: "https://github.com/search?q=",
    icon: "github.com",
  },
];

export const DEFAULT_LAYOUT = {
  maxContainerWidth: 900,
  cardWidth: 96,
  cardHeight: 96,
  gridColumns: 6,
};

export const DEFAULT_LAYOUT_UI = {
  width: DEFAULT_LAYOUT.maxContainerWidth,
  cardWidth: DEFAULT_LAYOUT.cardWidth,
  cardHeight: DEFAULT_LAYOUT.cardHeight,
  cols: DEFAULT_LAYOUT.gridColumns,
};

export const DEFAULT_BACKGROUND = "radial-gradient(circle at 50% -20%, #334155, #0f172a, #020617)";

export const DEFAULT_PREFS: UserPreferences = {
  cardOpacity: 0.1,
  themeColor: DEFAULT_THEME_COLOR,
  themeMode: ThemeMode.Dark,
  themeColorAuto: true,
  faviconApi: DEFAULT_FAVICON_API,
  siteTitle: DEFAULT_SITE_TITLE,
  footerGithub: DEFAULT_FOOTER_GITHUB,
  footerLinks: DEFAULT_FOOTER_LINKS,
};

// Animation
export const DEFAULT_ANIMATION_LEVEL: AnimationLevel = "subtle";
export const DEFAULT_ANIMATION_SPEED = 1.0;
export const DEFAULT_ANIMATION_STAGGER = 30;
export const DEFAULT_ANIMATION_CURVE: AnimationCurve = "ease";
export const DEFAULT_ANIMATION_HOVER_SCALE = 1.0;

// Glass
export const DEFAULT_GLASS_BLUR = 40;
export const DEFAULT_GLASS_SATURATION = 180;
export const DEFAULT_GLASS_NOISE = 0.04;
export const DEFAULT_GLASS_TINT = 0.1;

// Global tuning
export const DEFAULT_RADIUS_SCALE = 1.0;
export const DEFAULT_DENSITY_SCALE = 1.0;
export const DEFAULT_FONT_WEIGHT: FontWeightOption = "light";
export const DEFAULT_FONT_SIZE = 1.0;
export const DEFAULT_NAV_STYLE: NavStyle = "floating";
export const DEFAULT_NAV_POSITION: "top" | "bottom" = "top";
export const DEFAULT_SEARCH_STYLE: SearchStyle = "pill";
