// Shared accent-color derivation: the runtime token engine (useDesignTokens)
// and the AppearanceTab live preview must stay in lockstep, so the CSS
// variables are built here rather than inlined at each call site.
export function themeAccentVars(color: string): Record<string, string> {
  return {
    "--theme-primary": color,
    "--theme-hover": `color-mix(in srgb, ${color}, black 10%)`,
    "--theme-active": `color-mix(in srgb, ${color}, black 20%)`,
    "--theme-light": `color-mix(in srgb, ${color}, white 30%)`,
    "--theme-glow": `color-mix(in srgb, ${color}, transparent 70%)`,
  };
}

// Cache for dominant color extraction to avoid re-downloading images
const colorCache = new Map<string, string>();

// Helper to extract dominant color from an image URL
export const getDominantColor = (imageSrc: string): Promise<string> => {
  // Return cached result if available
  if (colorCache.has(imageSrc)) {
    return Promise.resolve(colorCache.get(imageSrc)!);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("#6280a3"); // Default Indigo
        return;
      }

      // Resize to a small size to average out the colors naturally
      canvas.width = 10;
      canvas.height = 10;
      ctx.drawImage(img, 0, 0, 10, 10);

      try {
        const imageData = ctx.getImageData(0, 0, 10, 10).data;
        let r = 0,
          g = 0,
          b = 0;
        const total = imageData.length / 4;

        for (let i = 0; i < imageData.length; i += 4) {
          r += imageData[i];
          g += imageData[i + 1];
          b += imageData[i + 2];
        }

        r = Math.round(r / total);
        g = Math.round(g / total);
        b = Math.round(b / total);

        // Convert to HSL to adjust brightness/saturation for dark mode UI
        const [h, s, l] = rgbToHsl(r, g, b);

        // Boost saturation slightly if it's too washed out
        const newS = Math.max(s, 0.4);

        // Clamp lightness:
        // We want the primary color to pop on a dark background.
        let newL = l;
        if (newL < 0.55) newL = 0.55;
        if (newL > 0.75) newL = 0.75;

        const hex = hslToHex(Math.round(h * 360), Math.round(newS * 100), Math.round(newL * 100));
        colorCache.set(imageSrc, hex);
        resolve(hex);
      } catch (e) {
        // Fallback for CORS issues (tainted canvas)
        console.warn("Could not extract color due to CORS:", e);
        resolve("#6280a3"); // Default Indigo
      }
    };

    img.onerror = () => resolve("#6280a3"); // Default Indigo
  });
};

// Helper: HSL to HEX
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Helper: RGB to HSL
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}
