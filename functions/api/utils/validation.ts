// 数据验证工具

import { ERROR_MESSAGES } from "./auth";
import { Category, SubCategory, LinkItem } from "../../../types";

// 验证分类数据
export function validateCategory(data: any): { valid: boolean; message?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (!data.id || typeof data.id !== "string") {
    return { valid: false, message: "Category ID is required and must be a string" };
  }

  if (!data.title || typeof data.title !== "string") {
    return { valid: false, message: "Category title is required and must be a string" };
  }

  if (data.title.length > 50) {
    return { valid: false, message: "Category title must be 50 characters or less" };
  }

  if (!data.subCategories || !Array.isArray(data.subCategories)) {
    return { valid: false, message: "SubCategories must be an array" };
  }

  if (data.subCategories.length > 20) {
    return { valid: false, message: "Category cannot have more than 20 subcategories" };
  }

  return { valid: true };
}

// 验证子分类数据
export function validateSubCategory(data: any): { valid: boolean; message?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (!data.id || typeof data.id !== "string") {
    return { valid: false, message: "SubCategory ID is required and must be a string" };
  }

  if (!data.title || typeof data.title !== "string") {
    return { valid: false, message: "SubCategory title is required and must be a string" };
  }

  if (data.title.length > 50) {
    return { valid: false, message: "SubCategory title must be 50 characters or less" };
  }

  if (!data.items || !Array.isArray(data.items)) {
    return { valid: false, message: "Items must be an array" };
  }

  if (data.items.length > 50) {
    return { valid: false, message: "SubCategory cannot have more than 50 items" };
  }

  return { valid: true };
}

// 验证链接项数据
export function validateLinkItem(data: any): { valid: boolean; message?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (!data.id || typeof data.id !== "string") {
    return { valid: false, message: "Link ID is required and must be a string" };
  }

  if (!data.title || typeof data.title !== "string") {
    return { valid: false, message: "Link title is required and must be a string" };
  }

  if (data.title.length > 100) {
    return { valid: false, message: "Link title must be 100 characters or less" };
  }

  if (!data.url || typeof data.url !== "string") {
    return { valid: false, message: "Link URL is required and must be a string" };
  }

  if (data.url.length > 500) {
    return { valid: false, message: "Link URL must be 500 characters or less" };
  }

  try {
    new URL(data.url.startsWith("http") ? data.url : ("https://" + data.url));
  } catch {
    return { valid: false, message: "Link URL must be a valid URL" };
  }

  if (data.description && typeof data.description !== "string") {
    return { valid: false, message: "Link description must be a string" };
  }

  if (data.description && data.description.length > 200) {
    return { valid: false, message: "Link description must be 200 characters or less" };
  }

  if (data.icon && typeof data.icon !== "string") {
    return { valid: false, message: "Link icon must be a string" };
  }

  if (data.icon && data.icon.length > 100) {
    return { valid: false, message: "Link icon must be 100 characters or less" };
  }

  return { valid: true };
}

// 验证用户偏好设置
export function validatePreferences(data: any): { valid: boolean; message?: string } {
  if (!data || typeof data !== "object") {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (data.cardOpacity !== undefined) {
    if (typeof data.cardOpacity !== "number" || data.cardOpacity < 0 || data.cardOpacity > 1) {
      return { valid: false, message: "Card opacity must be a number between 0 and 1" };
    }
  }

  if (data.themeColor !== undefined) {
    if (typeof data.themeColor !== "string") {
      return { valid: false, message: "Theme color must be a string" };
    }

    // 简单的颜色格式验证
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(data.themeColor)) {
      return { valid: false, message: "Theme color must be a valid hex color" };
    }
  }

  if (data.themeMode !== undefined) {
    if (typeof data.themeMode !== "string") {
      return { valid: false, message: "Theme mode must be a string" };
    }

    if (data.themeMode !== "dark" && data.themeMode !== "light") {
      return { valid: false, message: "Theme mode must be either 'dark' or 'light'" };
    }
  }

  return { valid: true };
}

// 验证背景设置
export function validateBackground(data: any): { valid: boolean; message?: string } {
  if (!data) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATA };
  }

  if (typeof data !== "string") {
    return { valid: false, message: "Background must be a string" };
  }

  if (data.length > 1000) {
    return { valid: false, message: "Background must be 1000 characters or less" };
  }

  // 验证是否为有效的CSS背景或URL
  if (data.startsWith("http")) {
    try {
      new URL(data);
    } catch {
      return { valid: false, message: "Background must be a valid URL" };
    }
  } else if (!data.includes("gradient") && !data.includes("rgb") && !data.includes("#")) {
    return { valid: false, message: "Background must be a valid CSS background or URL" };
  }

  return { valid: true };
}

// 验证完整的分类结构（包括子分类和链接）
export function validateFullCategory(category: any): { valid: boolean; message?: string } {
  // 首先验证基本分类属性
  const categoryValidation = validateCategory(category);
  if (!categoryValidation.valid) {
    return categoryValidation;
  }

  // 验证每个子分类
  for (const subCategory of category.subCategories) {
    const subValidation = validateSubCategory(subCategory);
    if (!subValidation.valid) {
      return { valid: false, message: `SubCategory "${subCategory.title || "unnamed"}": ${subValidation.message}` };
    }

    // 验证子分类中的每个链接
    for (const item of subCategory.items) {
      const itemValidation = validateLinkItem(item);
      if (!itemValidation.valid) {
        return { valid: false, message: `Link "${item.title || "unnamed"}" in "${subCategory.title || "unnamed"}": ${itemValidation.message}` };
      }
    }
  }

  return { valid: true };
}
