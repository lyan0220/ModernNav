import { useEffect } from "react";
import { useBootstrap } from "../services/queries";
import { getDominantColor } from "../utils/color";
import { ThemeMode } from "../types";
import {
  DEFAULT_PREFS,
  DEFAULT_THEME_COLOR,
  DEFAULT_ANIMATION_LEVEL,
  DEFAULT_ANIMATION_SPEED,
  DEFAULT_GLASS_BLUR,
  DEFAULT_GLASS_SATURATION,
  DEFAULT_GLASS_NOISE,
  DEFAULT_GLASS_TINT,
  DEFAULT_RADIUS_SCALE,
  DEFAULT_DENSITY_SCALE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_FONT_SIZE,
} from "../constants/defaults";

const FONT_WEIGHT_MAP = { light: "300", regular: "400", medium: "500" } as const;

export function useDesignTokens() {
  const { data } = useBootstrap();
  const prefs = data?.prefs ?? DEFAULT_PREFS;
  const background = data?.background ?? "";

  const themeColorAuto = prefs.themeColorAuto ?? true;
  const savedColor = prefs.themeColor || DEFAULT_THEME_COLOR;

  const glassBlur = prefs.glassBlur ?? DEFAULT_GLASS_BLUR;
  const glassSaturation = prefs.glassSaturation ?? DEFAULT_GLASS_SATURATION;
  const glassNoise = prefs.glassNoise ?? DEFAULT_GLASS_NOISE;
  const glassTint = prefs.glassTint ?? prefs.cardOpacity ?? DEFAULT_GLASS_TINT;
  const radiusScale = prefs.radiusScale ?? DEFAULT_RADIUS_SCALE;
  const densityScale = prefs.densityScale ?? DEFAULT_DENSITY_SCALE;
  const fontWeight = prefs.fontWeight ?? DEFAULT_FONT_WEIGHT;
  const fontSize = prefs.fontSize ?? DEFAULT_FONT_SIZE;
  const animationLevel = prefs.animationLevel ?? DEFAULT_ANIMATION_LEVEL;
  const animationSpeed = prefs.animationSpeed ?? DEFAULT_ANIMATION_SPEED;

  useEffect(() => {
    let cancelled = false;
    const root = document.documentElement;

    const applyAccent = (color: string) => {
      if (cancelled) return;
      root.style.setProperty("--theme-primary", color);
      root.style.setProperty("--theme-hover", `color-mix(in srgb, ${color}, black 10%)`);
      root.style.setProperty("--theme-active", `color-mix(in srgb, ${color}, black 20%)`);
      root.style.setProperty("--theme-light", `color-mix(in srgb, ${color}, white 30%)`);
      root.style.setProperty("--theme-glow", `color-mix(in srgb, ${color}, transparent 70%)`);
    };

    const resolve = async () => {
      if (themeColorAuto && (background.startsWith("http") || background.startsWith("data:"))) {
        const extracted = await getDominantColor(background);
        applyAccent(extracted);
      } else {
        applyAccent(savedColor);
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [background, themeColorAuto, savedColor]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", prefs.themeMode === ThemeMode.Dark);
  }, [prefs.themeMode]);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--glass-blur", `${glassBlur}px`);
    root.style.setProperty("--glass-saturation", `${glassSaturation}%`);
    root.style.setProperty("--glass-noise-opacity", `${glassNoise}`);
    root.style.setProperty("--glass-tint", `${glassTint}`);

    root.style.setProperty("--radius-scale", `${radiusScale}`);
    root.style.setProperty("--density-scale", `${densityScale}`);

    root.style.setProperty("--font-weight-body", FONT_WEIGHT_MAP[fontWeight]);
    root.style.setProperty("--font-size-scale", `${fontSize}`);

    root.style.setProperty("--animation-speed", `${animationSpeed}`);

    const levels = ["anim-none", "anim-subtle", "anim-fluid", "anim-expressive"];
    levels.forEach((cls) => root.classList.remove(cls));
    root.classList.add(`anim-${animationLevel}`);
  }, [
    glassBlur,
    glassSaturation,
    glassNoise,
    glassTint,
    radiusScale,
    densityScale,
    fontWeight,
    fontSize,
    animationLevel,
    animationSpeed,
  ]);
}
