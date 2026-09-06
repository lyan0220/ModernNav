import React from "react";
import { Link as LinkIcon, Github } from "../utils/icons";
import { useLanguage } from "../contexts/LanguageContext";
import { FooterLink } from "../types";
import { useViewportScale } from "../hooks/useViewportScale";
import { getIconSize } from "../utils/favicon";

interface FooterProps {
  github?: string;
  links?: FooterLink[];
}

export const Footer: React.FC<FooterProps> = ({ github, links }) => {
  const { t } = useLanguage();
  const viewportScale = useViewportScale();
  const s = (n: number) => getIconSize(n, viewportScale);

  return (
    <footer className="relative z-10 py-5 text-center text-sm flex flex-col md:flex-row justify-center items-center gap-4 border-t backdrop-blur-sm transition-colors duration-500 text-slate-500 dark:text-white/30 border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/10">
      <div className="flex flex-wrap justify-center gap-y-2 gap-x-6 px-4">
        {links?.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--theme-primary)] cursor-pointer transition-colors"
          >
            <LinkIcon size={s(18)} /> {link.title}
          </a>
        ))}
        {github && (
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-[var(--theme-primary)] cursor-pointer transition-colors"
          >
            <Github size={s(18)} /> {t("about_us") || "GitHub"}
          </a>
        )}
      </div>
      <div className="flex items-center shrink-0">
        <p>
          {t("copyright")} © {new Date().getFullYear()} ModernNav
          <span className="mx-2 opacity-50">|</span>
          <span className="opacity-80">{t("powered_by")}</span>
        </p>
        <a
          href="https://github.com/lyan0220/ModernNav"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-semibold hover:text-[var(--theme-primary)] transition-colors"
        >
          Lyan
        </a>
      </div>
    </footer>
  );
};
