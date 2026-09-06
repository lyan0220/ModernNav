// Shared lazy loader for the full lucide-react barrel. Only two consumers
// need it — the admin icon picker and SmartIcon's name-based icon lookup —
// and both use it on demand, so the ~470KB full icon set never loads for
// regular visitors. Everywhere else, icons come from utils/icons.ts (deep
// per-icon imports).
type LucideIconComponent = React.ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
  style?: React.CSSProperties;
}>;
export type LucideBarrel = Record<string, LucideIconComponent | unknown>;

let barrelPromise: Promise<LucideBarrel> | null = null;

export function loadLucideBarrel(): Promise<LucideBarrel> {
  barrelPromise ??= import("lucide-react") as Promise<LucideBarrel>;
  return barrelPromise;
}

export function isLucideBarrelLoaded(): boolean {
  return barrelPromise !== null;
}
