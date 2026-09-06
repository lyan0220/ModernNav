import React from "react";
import { ThemeMode } from "../types";

interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  opacity?: number;
  themeMode?: ThemeMode;
  href?: string;
  target?: string;
  rel?: string;
  onBeforeNavigate?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  hoverEffect = false,
  onClick,
  onBeforeNavigate,
  opacity = 0.1,
  themeMode = ThemeMode.Dark,
  style,
  href,
  target,
  rel,
  ...props
}) => {
  const isDark = themeMode === ThemeMode.Dark;
  const Component = href ? "a" : "div";

  const MIN_TINT = isDark ? 0.2 : 0.3;
  const MAX_TINT = isDark ? 0.8 : 0.8;
  const safeAlpha = MIN_TINT + opacity * (MAX_TINT - MIN_TINT);
  const baseColor = isDark ? `rgba(15, 23, 42, ${safeAlpha})` : `rgba(255, 255, 255, ${safeAlpha})`;

  const containerClasses = `
    relative block overflow-hidden border
    transition-all ease-out
    group no-underline
    border-white/30 dark:border-white/[0.08]
    shadow-[0_4px_24px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_24px_-1px_rgba(0,0,0,0.2)]
    ${
      hoverEffect
        ? `hover:-translate-y-1
      hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)]
      hover:border-white/50 dark:hover:border-white/20
      cursor-pointer`
        : ""
    }
    ${className}
  `;

  return (
    <Component
      className={containerClasses}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        onBeforeNavigate?.();
        onClick?.(e);
      }}
      href={href}
      target={target}
      rel={rel}
      style={{
        backgroundColor: baseColor,
        backdropFilter: `blur(var(--glass-blur, ${isDark ? 50 : 25}px)) saturate(var(--glass-saturation, ${isDark ? 90 : 180}%))`,
        WebkitBackdropFilter: `blur(var(--glass-blur, ${isDark ? 50 : 25}px)) saturate(var(--glass-saturation, ${isDark ? 90 : 180}%))`,
        borderRadius: `calc(16px * var(--radius-scale, 1))`,
        transitionDuration: `var(--anim-card-duration, 300ms)`,
        ...(hoverEffect
          ? ({ "--hover-scale": "var(--anim-hover-scale, 1.02)" } as React.CSSProperties)
          : {}),
        ...style,
      }}
      {...(props as React.HTMLAttributes<HTMLAnchorElement> & React.HTMLAttributes<HTMLDivElement>)}
    >
      <div
        className="absolute inset-0 z-0 glass-noise pointer-events-none"
        style={{ opacity: "var(--glass-noise-opacity, 0.4)" }}
      />

      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          borderRadius: `calc(16px * var(--radius-scale, 1))`,
          boxShadow: isDark
            ? "inset 0 0.4px 0 0 rgba(255,255,255,0.08)"
            : "inset 0 0.4px 0 0 rgba(255,255,255,0.4)",
        }}
      />

      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-white/[0.3] dark:from-white/[0.05] via-transparent to-transparent dark:to-black/[0.1]" />

      {hoverEffect && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ borderRadius: `calc(16px * var(--radius-scale, 1))` }}
        >
          <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/[0.05] to-transparent -translate-x-full group-hover:animate-shimmer" />
        </div>
      )}

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-slate-800 dark:text-white">
        {children}
      </div>
    </Component>
  );
};
