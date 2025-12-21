import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { SearchEngine, ThemeMode } from "../types";
import { SEARCH_ENGINES } from "../constants";
import { useLanguage } from "../contexts/LanguageContext";

interface SearchBarProps {
  themeMode: ThemeMode;
}

export const SearchBar: React.FC<SearchBarProps> = ({ themeMode }) => {
  const [query, setQuery] = useState("");
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine>(
    SEARCH_ENGINES[0]
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLFormElement>(null);
  const { t } = useLanguage();

  const isDark = themeMode === ThemeMode.Dark;

  // --- SEARCH BAR AESTHETICS ---
  // Stealth Mode: Extremely low opacity by default

  const stateClasses = isDark
    ? "bg-slate-900/0 hover:bg-slate-900/40 focus-within:bg-slate-900/60 border-white/10 hover:border-white/10 focus-within:border-[var(--theme-primary)]/20"
    : "bg-white/0 hover:bg-white/40 focus-within:bg-white/70 border-white/10 hover:border-white/30 focus-within:border-[var(--theme-primary)]/50";

  const containerStyle = {
    backdropFilter:
      query || isDropdownOpen || isFocused
        ? `blur(12px) saturate(160%)`
        : `blur(0px) saturate(100%)`,
    WebkitBackdropFilter:
      query || isDropdownOpen || isFocused
        ? `blur(12px) saturate(160%)`
        : `blur(0px) saturate(100%)`,
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    transform: "translateZ(0)",
    WebkitTransform: "translateZ(0)",
  };

  const shadowClasses = isDark
    ? "shadow-none hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] focus-within:shadow-[0_0_20px_-5px_var(--theme-primary)]/20"
    : "shadow-none hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] focus-within:shadow-[0_0_20px_-5px_var(--theme-primary)]/10";

  const textColor = isDark ? "text-white" : "text-slate-800";
  const placeholderColor = isDark
    ? "placeholder-white/20 focus-within:placeholder-white/50"
    : "placeholder-slate-600/30 focus-within:placeholder-slate-600";
  const iconColor = isDark
    ? "text-white/30 group-hover:text-white/80"
    : "text-slate-500/40 group-hover:text-slate-700";
  const dividerColor = isDark
    ? "border-r border-white/5 group-hover:border-white/10"
    : "border-r border-slate-500/5 group-hover:border-slate-500/20";

  const dropdownClasses = isDark ? "apple-glass-dark" : "apple-glass-light";

  const dropdownText = isDark ? "text-white" : "text-slate-800";

  const itemBase =
    "flex-shrink-0 flex items-center gap-2 px-2.5 h-6 rounded-md transition-all text-[11px] whitespace-nowrap";
  const itemHover = isDark
    ? "hover:bg-[var(--theme-primary)]/20 hover:text-white"
    : "hover:bg-black/5 hover:text-slate-900";
  const itemActive =
    "bg-[var(--theme-primary)] text-white font-medium shadow-md";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    window.open(
      `${selectedEngine.urlTemplate}${encodeURIComponent(query)}`,
      "_blank"
    );
    setQuery("");
  };

  const handleEngineSelect = (engine: SearchEngine) => {
    setSelectedEngine(engine);
    setIsDropdownOpen(false);
  };

  // NOTE: Width reduced to max-w-[400px]
  return (
    <div className="w-full max-w-[400px] mx-auto relative z-[70] transition-all duration-300">
      <form
        onSubmit={handleSearch}
        className="relative w-full group"
        ref={dropdownRef}
      >
        <div
          className={`relative flex items-center rounded-2xl transition-all duration-300 h-12 border ${stateClasses} ${shadowClasses}`}
          style={containerStyle}
        >
          <div className="relative h-full">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`h-full flex items-center gap-2 pl-4 pr-3 rounded-l-2xl transition-colors min-w-[70px] ${dividerColor} ${
                isDark
                  ? "text-white/50 hover:text-white hover:bg-white/5"
                  : "text-slate-500 hover:text-slate-900 hover:bg-black/5"
              }`}
            >
              <span className="flex items-center justify-center w-5 h-5 rounded-md overflow-hidden shadow-sm opacity-60 group-hover:opacity-100 transition-opacity">
                {selectedEngine.icon}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 opacity-40 group-hover:opacity-100 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <input
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search_placeholder", {
              engine: selectedEngine.name,
            })}
            className={`flex-1 bg-transparent border-none outline-none text-sm px-4 h-full text-left transition-colors ${textColor} ${placeholderColor}`}
          />

          <button
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            type="submit"
            className={`p-2.5 mr-1 transition-all rounded-xl ${iconColor} ${
              isDark
                ? "hover:bg-[var(--theme-primary)]/20 hover:text-white"
                : "hover:bg-black/5 hover:text-slate-900"
            }`}
          >
            <Search size={18} />
          </button>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            className={`absolute top-full left-0 right-0 mt-2 px-1 h-10 flex items-center ${dropdownClasses} rounded-xl overflow-hidden animate-fade-in origin-top z-[80] shadow-2xl`}
          >
            <div className="flex flex-row overflow-x-auto no-scrollbar gap-1.5 px-1 items-center w-full h-full">
              {SEARCH_ENGINES.map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => handleEngineSelect(engine)}
                  className={`${itemBase} ${dropdownText} ${
                    selectedEngine.id === engine.id
                      ? itemActive
                      : `opacity-90 ${itemHover}`
                  }`}
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center rounded-sm overflow-hidden shadow-sm bg-white/10">
                    {engine.icon}
                  </span>
                  <span className="font-medium tracking-tight">
                    {engine.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
