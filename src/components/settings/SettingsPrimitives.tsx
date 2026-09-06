import React from "react";
import { LucideIcon } from "../../utils/icons";

/**
 * Shared layout primitives for the admin settings tabs.
 *
 * These exist to end the "every tab hand-rolls its own panels" fragmentation:
 * one source of truth for content width, section cards, and row layout so the
 * whole settings area reads as a single, modern, cohesive surface.
 */

/** Centered, scrollable column shared by every settings tab. */
export const SettingsContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = "", style }) => (
  <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in" style={style}>
    <div className={`w-full max-w-3xl mx-auto px-6 py-8 space-y-5 ${className}`}>{children}</div>
  </div>
);

/** A titled card section: themed icon chip + title + optional description. */
export const SettingsSection: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ icon: Icon, title, description, action, children, className = "" }) => (
  <section
    className={`surface-elevated border border-default rounded-2xl overflow-hidden ${className}`}
  >
    <div className="flex items-start justify-between gap-4 p-5 pb-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center">
          <Icon size={17} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-primary tracking-tight truncate">{title}</h3>
          {description && (
            <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

/** A label/control row inside a section. */
export const SettingsRow: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold text-secondary uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-muted leading-relaxed">{hint}</p>}
  </div>
);
