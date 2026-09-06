import React, { useMemo, useState, useEffect } from "react";
import { useViewportScale } from "../hooks/useViewportScale";
import { getIconSize } from "../utils/favicon";
import { loadLucideBarrel } from "../utils/lucideBarrel";

// Cache for dynamically loaded icon modules
type LucideIconComponent = React.ComponentType<{ size?: number; className?: string }>;
type LucideModule = Record<string, LucideIconComponent | unknown>;
let iconsModuleCache: LucideModule | null = null;

async function loadIconsModule(): Promise<LucideModule> {
  if (iconsModuleCache) return iconsModuleCache;
  iconsModuleCache = (await import("lucide-react")) as LucideModule;
  return iconsModuleCache;
}

const SUGGESTED_ICONS = [
  "Link",
  "ExternalLink",
  "Globe",
  "Github",
  "Youtube",
  "Twitter",
  "Instagram",
  "Linkedin",
  "Code",
  "Terminal",
  "Cpu",
  "Database",
  "Cloud",
  "Server",
  "Hash",
  "Layers",
  "MessageSquare",
  "Mail",
  "Bell",
  "User",
  "Users",
  "Settings",
  "Shield",
  "Lock",
  "Search",
  "Heart",
  "Star",
  "Coffee",
  "Music",
  "Video",
  "Camera",
  "Image",
  "File",
  "Folder",
  "Briefcase",
  "ShoppingBag",
  "CreditCard",
  "Wallet",
  "Home",
  "Map",
];

const SUGGESTED_EMOJIS = [
  "🚀",
  "🔥",
  "✨",
  "⚡",
  "💡",
  "🛠️",
  "📦",
  "🎨",
  "🎮",
  "🎧",
  "📸",
  "📽️",
  "🏠",
  "🌍",
  "💼",
  "💻",
  "📱",
  "🔒",
  "🔑",
  "🏷️",
  "📌",
  "📎",
  "📅",
  "📊",
  "🌈",
  "🍎",
  "☕",
  "🍕",
  "🍺",
  "🏀",
  "⚽",
  "🚗",
  "✈️",
  "🚢",
  "🛸",
  "🤖",
];

interface IconPickerProps {
  show: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  pickerRef: React.RefObject<HTMLDivElement>;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  show,
  onClose,
  value,
  onChange,
  searchTerm,
  onSearchChange,
  pickerRef,
}) => {
  const viewportScale = useViewportScale();
  const s = (n: number) => getIconSize(n, viewportScale);
  const [iconsModule, setIconsModule] = useState<LucideModule | null>(null);

  useEffect(() => {
    let mounted = true;
    if (show && !iconsModule) {
      loadIconsModule().then((mod) => {
        if (mounted) setIconsModule(mod);
      });
    }
    return () => {
      mounted = false;
    };
  }, [show, iconsModule]);

  const filteredIconNames = useMemo(() => {
    if (!searchTerm.trim()) return SUGGESTED_ICONS;
    const search = searchTerm.toLowerCase();
    if (!iconsModule) return SUGGESTED_ICONS;
    return Object.keys(iconsModule)
      .filter(
        (name) =>
          name.toLowerCase().includes(search) &&
          name !== "createLucideIcon" &&
          typeof (iconsModule as Record<string, unknown>)[name] === "function"
      )
      .slice(0, 48);
  }, [searchTerm, iconsModule]);

  if (!show) return null;

  return (
    <div
      className="absolute top-full right-0 w-64 mt-2 apple-glass-dark rounded-xl border border-white/10 shadow-2xl p-3 z-50 animate-fade-in-down"
      ref={pickerRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="relative mb-3">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
        >
          <path
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search icons..."
          className="w-full bg-slate-950/50 border border-white/5 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)]/50"
        />
      </div>

      <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        <div>
          <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.1em] mb-2 px-1">
            {searchTerm ? "Search Results" : "Suggested Icons"}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {filteredIconNames.map((name) => {
              const IconComp = iconsModule
                ? ((iconsModule as Record<string, LucideIconComponent>)[name] as
                    LucideIconComponent | undefined)
                : null;
              return (
                <button
                  key={name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(name);
                    onClose();
                  }}
                  title={name}
                  type="button"
                  className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white active:scale-90 ${
                    value === name
                      ? "bg-[var(--theme-primary)]/20 text-white ring-1 ring-[var(--theme-primary)]/30"
                      : ""
                  }`}
                >
                  {IconComp && <IconComp size={s(16)} />}
                </button>
              );
            })}
          </div>
        </div>

        {!searchTerm && (
          <div>
            <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.1em] mb-2 px-1">
              Common Emojis
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {SUGGESTED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(emoji);
                    onClose();
                  }}
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-base active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
