import React, { memo } from "react";
import { GlassCard } from "./GlassCard";
import { SmartIcon } from "./SmartIcon";
import { LinkItem, ThemeMode } from "../types";
import { getFaviconUrl } from "../utils/favicon";

interface LinkCardProps {
  link: LinkItem;
  cardOpacity: number;
  themeMode: ThemeMode;
  viewportScale: number;
  scaledCardHeight: number;
  faviconApi?: string;
  onVisit: (linkId: string) => void;
}

// Memoized so unrelated dashboard state changes (palette toggling, sync
// status, viewport rounding) don't re-render the whole card grid — every
// prop here is a primitive or a stable reference.
function LinkCardComponent({
  link,
  cardOpacity,
  themeMode,
  viewportScale,
  scaledCardHeight,
  faviconApi,
  onVisit,
}: LinkCardProps) {
  const iconSource = link.icon || getFaviconUrl(link.url, faviconApi);
  const scaledIconSize = Math.round(24 * viewportScale);
  const scaledTitleSize = Math.max(12, Math.round(12 * viewportScale));

  return (
    <GlassCard
      hoverEffect={true}
      opacity={cardOpacity}
      themeMode={themeMode}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      onBeforeNavigate={() => onVisit(link.id)}
      className="flex flex-col items-center justify-center text-center p-2 relative group animate-card-enter"
      style={{
        height: `${scaledCardHeight}px`,
        animationFillMode: "backwards",
      }}
      title={link.description ? `${link.description}\n${link.url}` : `${link.title}\n${link.url}`}
    >
      <div
        className="mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] flex items-center justify-center"
        style={{
          height: `${scaledIconSize}px`,
          width: `${scaledIconSize}px`,
        }}
      >
        <SmartIcon
          icon={iconSource}
          imgClassName="object-contain drop-shadow-md rounded-md"
          size={scaledIconSize}
          style={{
            width: `${scaledIconSize}px`,
            height: `${scaledIconSize}px`,
          }}
          faviconApi={faviconApi}
          sourceUrl={link.icon ? undefined : link.url}
        />
      </div>
      <span
        className="font-medium truncate w-full px-1 transition-colors duration-300 text-slate-800 dark:text-white/80 dark:group-hover:text-white"
        style={{ fontSize: `${scaledTitleSize}px` }}
      >
        {link.title}
      </span>
    </GlassCard>
  );
}

export const LinkCard = memo(LinkCardComponent);
