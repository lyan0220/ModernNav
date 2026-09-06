import React, { useState } from "react";
import { Lock, AlertCircle, Loader2, LogIn } from "../../utils/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { storageService } from "../../services/storage";
import { useBootstrap } from "../../services/queries";
import { ThemeMode } from "../../types";
import { DEFAULT_PREFS } from "../../constants/defaults";

export const AdminAuthPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { data } = useBootstrap();
  const isDefaultCode = data?.isDefaultCode ?? false;
  const themeMode = data?.prefs.themeMode ?? DEFAULT_PREFS.themeMode;
  const themeClass = themeMode === ThemeMode.Light ? "theme-light" : "theme-dark";

  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from || "/admin/content";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setAuthError("");

    try {
      const success = await storageService.login(authInput);
      if (success) {
        navigate(redirectTo, { replace: true });
      } else {
        setAuthError(t("incorrect_code"));
      }
    } catch (error) {
      if (error instanceof Error && error.message === "RATE_LIMITED") {
        setAuthError(t("login_rate_limited"));
      } else {
        setAuthError(t("incorrect_code"));
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`${themeClass} h-screen flex items-center justify-center surface-base px-4`}>
      <div className="w-full max-w-sm surface-elevated border border-default rounded-2xl p-10 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-16 h-16 rounded-full surface-base border border-default flex items-center justify-center shadow-inner">
            <Lock size={28} className="text-secondary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary mb-1">{t("admin_access")}</h2>
            <p className="text-sm text-secondary">{t("enter_code_msg")}</p>
            {isDefaultCode && (
              <p className="text-emerald-400/90 text-xs mt-3 font-mono bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-md inline-block">
                {t("default_code")}
              </p>
            )}
          </div>
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <input
              type="password"
              value={authInput}
              onChange={(e) => setAuthInput(e.target.value)}
              className="input-primary py-3 px-4 text-center tracking-widest text-lg"
              placeholder="••••"
              autoFocus
            />
            {authError && (
              <div className="text-red-400 text-sm flex items-center justify-center gap-1.5">
                <AlertCircle size={14} /> {authError}
              </div>
            )}
            <button type="submit" className="btn-primary w-full py-3 rounded-xl">
              {isVerifying ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
              <span>{t("unlock_btn")}</span>
            </button>
          </form>
          <button
            onClick={() => navigate("/")}
            className="text-secondary hover:text-primary text-sm transition-colors"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthPage;
