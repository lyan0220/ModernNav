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
  error?: string;
}

export interface UpdatePayload {
  type: "categories" | "background" | "prefs" | "auth_code";
  data: unknown;
}
