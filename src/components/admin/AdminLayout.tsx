import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Settings,
  Image as ImageIcon,
  Database,
  ShieldCheck,
  LogOut,
  Home,
} from "../../utils/icons";
import { storageService } from "../../services/storage";
import { useLanguage } from "../../contexts/LanguageContext";
import { useBootstrap } from "../../services/queries";
import { ThemeMode } from "../../types";
import { DEFAULT_PREFS } from "../../constants/defaults";
import { DEFAULT_BACKGROUND } from "../../services/storage";
import { BackgroundLayer } from "../BackgroundLayer";

const NAV = [
  { to: "/admin/content", labelKey: "tab_content", Icon: LayoutGrid },
  { to: "/admin/general", labelKey: "tab_general", Icon: Settings },
  { to: "/admin/appearance", labelKey: "tab_appearance", Icon: ImageIcon },
  { to: "/admin/data", labelKey: "tab_data", Icon: Database },
  { to: "/admin/security", labelKey: "tab_security", Icon: ShieldCheck },
] as const;

export const AdminLayout: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data } = useBootstrap();
  const themeMode = data?.prefs.themeMode ?? DEFAULT_PREFS.themeMode;
  const background = data?.background ?? DEFAULT_BACKGROUND;
  const isDark = themeMode === ThemeMode.Dark;
  const themeClass = isDark ? "theme-dark" : "theme-light";

  const handleLogout = async () => {
    await storageService.logout();
    navigate("/admin/auth", { replace: true });
  };

  return (
    <div className={`${themeClass} min-h-screen relative text-primary`}>
      <BackgroundLayer background={background} />
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-white/20 dark:bg-slate-900/40"
        style={{
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
        }}
      />

      {/* ─── Top Navigation Bar (Apple-glass, matches dashboard CategoryNav) ─── */}
      <header
        className="sticky top-0 z-50 w-full border-b transition-all duration-300 bg-white/60 dark:bg-slate-900/60 border-white/40 dark:border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
        style={{
          backdropFilter: `blur(var(--glass-blur)) saturate(180%)`,
          WebkitBackdropFilter: `blur(var(--glass-blur)) saturate(180%)`,
        }}
      >
        <div className="relative w-full px-6 h-16 flex items-center justify-between">
          {/* Left: Brand */}
          <div className="shrink-0 pr-5">
            <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
              <img src="/favicon.svg" alt="ModernNav" className="w-8 h-8" />
              <span className="text-lg font-semibold tracking-tight text-secondary group-hover:text-[var(--theme-primary)] transition-colors">
                ModernNav
              </span>
            </button>
          </div>

          {/* Center: Tab navigation */}
          <nav className="flex items-center gap-0.5">
            {NAV.map(({ to, labelKey, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? "text-primary" : "text-secondary hover:text-primary"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute inset-0 surface-active rounded-lg" />}
                    <Icon
                      size={15}
                      className={`relative z-10 shrink-0 transition-transform duration-300 ${
                        isActive ? "scale-105" : "opacity-75 group-hover:opacity-100"
                      }`}
                    />
                    <span className="relative z-10">{t(labelKey)}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center pl-5 ml-3 gap-2">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-full text-secondary hover:text-primary surface-hover transition-colors"
              title={t("back_to_home") || "Back to home"}
            >
              <Home size={18} />
            </button>
            <div className="h-4 w-px bg-[var(--border)] mx-1" />
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title={t("logout")}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Page Content (centered, comfortable width) ─── */}
      <main className="relative z-10 w-full">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
