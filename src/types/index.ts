export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  visitCount?: number;
}

export interface SubCategory {
  id: string;
  title: string;
  items: LinkItem[];
}

export interface Category {
  id: string;
  title: string;
  subCategories: SubCategory[];
}

export interface SearchEngine {
  id: string;
  name: string;
  urlTemplate: string;
  icon: string;
}

export enum ThemeMode {
  Dark = "dark",
  Light = "light",
}

export interface FooterLink {
  title: string;
  url: string;
}

// Theme customization types
export type ThemePresetName =
  | "moonstone"
  | "rosegold"
  | "ocean"
  | "ink"
  | "lavender"
  | "forest"
  | "custom";
export type AnimationLevel = "none" | "subtle" | "fluid" | "expressive";
export type CardDisplayMode = "compact" | "standard" | "list";
export type NavStyle = "floating" | "flush" | "minimal";
export type SearchStyle = "pill" | "underline" | "ghost";
export type FontWeightOption = "light" | "regular" | "medium";
export type AnimationCurve = "ease" | "spring" | "linear";

export interface ThemeTokens {
  palette50: string;
  palette100: string;
  palette200: string;
  palette300: string;
  palette400: string;
  palette500: string;
  palette600: string;
  palette700: string;
  palette800: string;
  palette900: string;
  palette950: string;
  accent50: string;
  accent500: string;
  accent900: string;
  surfaceDark: string;
  surfaceLight: string;
  surfaceElevatedDark: string;
  surfaceElevatedLight: string;
}

export interface ThemePreset {
  name: ThemePresetName;
  label: string;
  primary: string;
  tokens: ThemeTokens;
}

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

  // Theme
  themePreset?: ThemePresetName;
  themeOverrides?: Partial<ThemeTokens>;

  // Card display
  cardDisplayMode?: CardDisplayMode;

  // Animation
  animationLevel?: AnimationLevel;
  animationSpeed?: number;
  animationStagger?: number;
  animationCurve?: AnimationCurve;
  animationHoverScale?: number;
  animationEnableGlow?: boolean;
  animationEnableParallax?: boolean;

  // Glass
  glassBlur?: number;
  glassSaturation?: number;
  glassNoise?: number;
  glassTint?: number;

  // Global tuning
  radiusScale?: number;
  densityScale?: number;
  fontWeight?: FontWeightOption;
  fontSize?: number;
  navStyle?: NavStyle;
  navPosition?: "top" | "bottom";
  searchStyle?: SearchStyle;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface BootstrapResponse {
  categories: Category[];
  background: string;
  prefs: UserPreferences;
  isDefaultCode: boolean;
  /** Server-side content version; used for optimistic-concurrency checks on update. */
  dataVersion?: number;
  error?: string;
}

export interface UpdatePayload {
  type: "categories" | "background" | "prefs";
  data: unknown;
  /** dataVersion the edit was based on; a mismatch returns 409. */
  version?: number;
}
