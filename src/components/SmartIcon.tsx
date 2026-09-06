import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { LucideIcon } from "../utils/icons";
import { Globe } from "../utils/icons";
import { loadLucideBarrel } from "../utils/lucideBarrel";
import { getFallbackFaviconUrls } from "../utils/favicon";
import { useViewportScale } from "../hooks/useViewportScale";

const FAVICON_LOAD_TIMEOUT_MS = 10000;

interface SmartIconProps {
  icon: string | undefined;
  className?: string;
  imgClassName?: string;
  size?: number;
  style?: React.CSSProperties;
  faviconApi?: string;
  sourceUrl?: string;
}

export const SmartIcon: React.FC<SmartIconProps> = ({
  icon,
  className = "",
  imgClassName = "",
  size = 20,
  style,
  faviconApi,
  sourceUrl,
}) => {
  const scale = useViewportScale();
  const scaledSize = Math.round(size * scale);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const DefaultIcon = Globe;

  // Name-based icon lookup needs the full lucide barrel, which loads on
  // demand — URL/data/emoji icons never trigger the ~470KB download.
  const needsBarrel = !!icon && !icon.startsWith("http") && !icon.startsWith("data:");
  const [barrel, setBarrel] = useState<Record<string, LucideIcon | undefined> | null>(null);
  useEffect(() => {
    if (!needsBarrel) return;
    let cancelled = false;
    loadLucideBarrel().then((m) => {
      if (!cancelled) setBarrel(m as Record<string, LucideIcon | undefined>);
    });
    return () => {
      cancelled = true;
    };
  }, [needsBarrel]);

  const currentKey = `${icon}|${sourceUrl}|${faviconApi}`;
  const [prevKey, setPrevKey] = useState(currentKey);

  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setFallbackIndex(0);
    setStatus("loading");
  }

  const fallbackUrls = useMemo(() => {
    if (icon && (icon.startsWith("http") || icon.startsWith("data:"))) {
      if (icon.startsWith("data:")) return [icon];

      if (sourceUrl && faviconApi) {
        return getFallbackFaviconUrls(sourceUrl, faviconApi);
      }

      return [icon];
    }
    return [];
  }, [icon, sourceUrl, faviconApi]);

  const currentSrc = useMemo(() => {
    if (!icon) return "";
    if (icon.startsWith("data:")) return icon;
    if (fallbackUrls.length > 0) {
      return fallbackUrls[Math.min(fallbackIndex, fallbackUrls.length - 1)];
    }
    return icon;
  }, [icon, fallbackUrls, fallbackIndex]);

  const handleFallback = useCallback(() => {
    setFallbackIndex((idx) => {
      const next = idx + 1;
      if (next < fallbackUrls.length) {
        setStatus("loading");
        return next;
      }
      setStatus("error");
      return idx;
    });
  }, [fallbackUrls.length]);

  // Image elements don't time out on hung HTTP requests — onError never fires
  // when the server accepts the connection but never responds. Without this,
  // a slow primary favicon API leaves every icon stuck on the loading skeleton
  // indefinitely. Fall through to the next URL after FAVICON_LOAD_TIMEOUT_MS.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (status !== "loading" || !currentSrc || currentSrc.startsWith("data:")) {
      return;
    }
    if (fallbackUrls.length <= 1) return;

    timeoutRef.current = setTimeout(() => {
      handleFallback();
    }, FAVICON_LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentSrc, status, fallbackUrls.length, handleFallback]);

  const handleLoad = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus("loaded");
  }, []);

  if (!icon) {
    return <DefaultIcon size={scaledSize} className={className} style={style} strokeWidth={1.5} />;
  }

  if (icon.startsWith("http") || icon.startsWith("data:")) {
    if (icon.startsWith("data:")) {
      return (
        <div className={`relative flex items-center justify-center ${className}`} style={style}>
          <img
            src={icon}
            alt=""
            decoding="async"
            className={`object-contain ${imgClassName}`}
            style={{ width: scaledSize, height: scaledSize }}
          />
        </div>
      );
    }

    return (
      <div className={`relative flex items-center justify-center ${className}`} style={style}>
        {(status === "loading" || status === "error") && (
          <DefaultIcon
            size={scaledSize}
            className={`absolute inset-0 m-auto text-slate-400/50 ${status === "loading" ? "animate-pulse" : ""}`}
            style={style}
            strokeWidth={1.5}
          />
        )}

        {status !== "error" && (
          <img
            key={currentSrc}
            src={currentSrc}
            alt=""
            decoding="async"
            className={`transition-opacity duration-300 ease-out object-contain ${imgClassName} ${
              status === "loaded" ? "opacity-100" : "opacity-0"
            }`}
            style={{ width: scaledSize, height: scaledSize }}
            onLoad={handleLoad}
            onError={handleFallback}
          />
        )}
      </div>
    );
  }

  const iconKey = icon.trim().toLowerCase();
  let IconComponent: LucideIcon | null = null;
  if (barrel) {
    const exactKey = icon.trim();
    IconComponent = barrel[exactKey] ?? null;
    if (!IconComponent) {
      const matchedKey = Object.keys(barrel).find((k) => k.toLowerCase() === iconKey);
      IconComponent = matchedKey ? barrel[matchedKey] ?? null : null;
    }
  }

  if (IconComponent && (typeof IconComponent === "function" || typeof IconComponent === "object")) {
    const Component = IconComponent;
    return <Component size={scaledSize} className={className} style={style} strokeWidth={1.5} />;
  }

  const isLikelyEmoji = icon.length <= 4 || /[\u1F600-\u1F64F]/.test(icon);

  if (isLikelyEmoji) {
    return (
      <span
        className={`leading-none filter drop-shadow-md select-none ${className}`}
        style={{ fontSize: scaledSize, ...style }}
      >
        {icon}
      </span>
    );
  }

  return <DefaultIcon size={scaledSize} className={className} style={style} strokeWidth={1.5} />;
};
