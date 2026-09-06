// 数据验证工具
// All validators accept `unknown` — their input is untrusted JSON straight
// off the wire, so every field is narrowed explicitly before use.

import { ERROR_MESSAGES } from "./authHelpers";

type ValidationResult = { valid: boolean; message?: string };

function asRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function isNonEmptyString(value: unknown, maxLength: number): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

// 验证分类数据
export function validateCategory(data: unknown): ValidationResult {
  const d = asRecord(data);
  if (!d) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (!isNonEmptyString(d.id, 500)) {
    return { valid: false, message: "Category ID is required and must be a string" };
  }

  if (!isNonEmptyString(d.title, 50)) {
    return { valid: false, message: "Category title is required and must be 50 characters or less" };
  }

  if (!Array.isArray(d.subCategories)) {
    return { valid: false, message: "SubCategories must be an array" };
  }

  if (d.subCategories.length > 20) {
    return { valid: false, message: "Category cannot have more than 20 subcategories" };
  }

  return { valid: true };
}

// 验证子分类数据
export function validateSubCategory(data: unknown): ValidationResult {
  const d = asRecord(data);
  if (!d) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (!isNonEmptyString(d.id, 500)) {
    return { valid: false, message: "SubCategory ID is required and must be a string" };
  }

  if (!isNonEmptyString(d.title, 50)) {
    return {
      valid: false,
      message: "SubCategory title is required and must be 50 characters or less",
    };
  }

  if (!Array.isArray(d.items)) {
    return { valid: false, message: "Items must be an array" };
  }

  if (d.items.length > 50) {
    return { valid: false, message: "SubCategory cannot have more than 50 items" };
  }

  return { valid: true };
}

// 验证链接项数据
export function validateLinkItem(data: unknown): ValidationResult {
  const d = asRecord(data);
  if (!d) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (!isNonEmptyString(d.id, 500)) {
    return { valid: false, message: "Link ID is required and must be a string" };
  }

  if (!isNonEmptyString(d.title, 100)) {
    return { valid: false, message: "Link title is required and must be 100 characters or less" };
  }

  if (!isNonEmptyString(d.url, 500)) {
    return { valid: false, message: "Link URL is required and must be 500 characters or less" };
  }
  const url = d.url as string;

  try {
    const urlStr = /^https?:\/\//.test(url) ? url : "https://" + url;
    new URL(urlStr);
  } catch {
    return { valid: false, message: "Link URL must be a valid URL" };
  }

  if (d.description !== undefined && d.description !== null) {
    if (typeof d.description !== "string") {
      return { valid: false, message: "Link description must be a string" };
    }
    if (d.description.length > 200) {
      return { valid: false, message: "Link description must be 200 characters or less" };
    }
  }

  if (d.icon !== undefined && d.icon !== null) {
    if (typeof d.icon !== "string" || d.icon.length > 500) {
      return { valid: false, message: "Link icon must be a string of 500 characters or less" };
    }
  }

  return { valid: true };
}

// 验证用户偏好设置
export function validatePreferences(data: unknown): ValidationResult {
  const d = asRecord(data);
  if (!d) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (d.cardOpacity !== undefined) {
    if (typeof d.cardOpacity !== "number" || d.cardOpacity < 0 || d.cardOpacity > 1) {
      return { valid: false, message: "Card opacity must be a number between 0 and 1" };
    }
  }

  if (d.themeColor !== undefined) {
    if (typeof d.themeColor !== "string") {
      return { valid: false, message: "Theme color must be a string" };
    }
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(d.themeColor)) {
      return { valid: false, message: "Theme color must be a valid hex color" };
    }
  }

  if (d.themeMode !== undefined) {
    if (d.themeMode !== "dark" && d.themeMode !== "light") {
      return { valid: false, message: "Theme mode must be either 'dark' or 'light'" };
    }
  }

  const intFields = ["maxContainerWidth", "cardWidth", "cardHeight", "gridColumns"] as const;
  for (const field of intFields) {
    const value = d[field];
    if (value !== undefined) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
        return { valid: false, message: `${field} must be a positive number` };
      }
    }
  }

  const shortStrFields = ["siteTitle", "faviconApi", "footerGithub"] as const;
  for (const field of shortStrFields) {
    const value = d[field];
    if (value !== undefined) {
      if (typeof value !== "string" || value.length > 200) {
        return { valid: false, message: `${field} must be a string of 200 characters or less` };
      }
    }
  }

  if (d.footerLinks !== undefined) {
    if (!Array.isArray(d.footerLinks) || d.footerLinks.length > 20) {
      return { valid: false, message: "footerLinks must be an array of at most 20 items" };
    }
    for (const link of d.footerLinks as unknown[]) {
      const l = asRecord(link);
      if (!l) {
        return { valid: false, message: "Each footer link must be an object" };
      }
      if (typeof l.title !== "string" || l.title.length > 100) {
        return {
          valid: false,
          message: "Footer link title must be a string of 100 characters or less",
        };
      }
      if (typeof l.url !== "string" || l.url.length > 500) {
        return {
          valid: false,
          message: "Footer link URL must be a string of 500 characters or less",
        };
      }
    }
  }

  if (d.searchEngines !== undefined) {
    if (!Array.isArray(d.searchEngines) || d.searchEngines.length > 20) {
      return { valid: false, message: "searchEngines must be an array of at most 20 items" };
    }
    for (const engine of d.searchEngines as unknown[]) {
      const e = asRecord(engine);
      if (!e) {
        return { valid: false, message: "Each search engine must be an object" };
      }
      if (!isNonEmptyString(e.id, 200)) {
        return { valid: false, message: "Search engine id is required and must be a string" };
      }
      if (!isNonEmptyString(e.name, 50)) {
        return {
          valid: false,
          message: "Search engine name must be a non-empty string of 50 characters or less",
        };
      }
      if (!isNonEmptyString(e.urlTemplate, 500)) {
        return {
          valid: false,
          message: "Search engine urlTemplate must be a non-empty string of 500 characters or less",
        };
      }
      if (typeof e.icon !== "string" || e.icon.length > 500) {
        return {
          valid: false,
          message: "Search engine icon must be a string of 500 characters or less",
        };
      }
    }
  }

  return { valid: true };
}

// 验证背景设置
export function validateBackground(data: unknown): ValidationResult {
  if (data === undefined || data === null) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (typeof data !== "string") {
    return { valid: false, message: "Background must be a string" };
  }

  if (data.length > 1000) {
    return { valid: false, message: "Background must be 1000 characters or less" };
  }

  if (data.startsWith("http")) {
    try {
      new URL(data);
    } catch {
      return { valid: false, message: "Background must be a valid URL" };
    }
  }

  return { valid: true };
}

// 验证完整的分类结构（包括子分类和链接）
export function validateFullCategory(category: unknown): ValidationResult {
  const categoryValidation = validateCategory(category);
  if (!categoryValidation.valid) {
    return categoryValidation;
  }

  const c = asRecord(category)!;
  for (const subCategory of c.subCategories as unknown[]) {
    const subValidation = validateSubCategory(subCategory);
    if (!subValidation.valid) {
      const subRecord = asRecord(subCategory);
      const subTitle = typeof subRecord?.title === "string" ? subRecord.title : "unnamed";
      return {
        valid: false,
        message: `SubCategory "${subTitle}": ${subValidation.message}`,
      };
    }

    const s = asRecord(subCategory)!;
    for (const item of s.items as unknown[]) {
      const itemValidation = validateLinkItem(item);
      if (!itemValidation.valid) {
        const itemRecord = asRecord(item);
        const itemTitle = typeof itemRecord?.title === "string" ? itemRecord.title : "unnamed";
        const subRecord = asRecord(subCategory);
        const subTitle = typeof subRecord?.title === "string" ? subRecord.title : "unnamed";
        return {
          valid: false,
          message: `Link "${itemTitle}" in "${subTitle}": ${itemValidation.message}`,
        };
      }
    }
  }

  return { valid: true };
}
