import React, { useState } from "react";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { storageService } from "../../services/storage";
import { useViewportScale } from "../../hooks/useViewportScale";
import { getIconSize } from "../../utils/favicon";
import { SettingsContainer, SettingsSection, SettingsRow } from "./SettingsPrimitives";

export const SecurityTab: React.FC = () => {
  const { t } = useLanguage();
  const viewportScale = useViewportScale();
  const s = (n: number) => getIconSize(n, viewportScale);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.current) {
      setPasswordStatus({ type: "error", message: t("current_code_err") });
      return;
    }
    if (passwordForm.new.length < 8) {
      setPasswordStatus({ type: "error", message: t("code_length_err") });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordStatus({ type: "error", message: t("code_mismatch") });
      return;
    }

    const success = await storageService.updateAccessCode(passwordForm.current, passwordForm.new);

    if (success) {
      setPasswordStatus({ type: "success", message: t("code_updated") });
      setPasswordForm({ current: "", new: "", confirm: "" });
    } else {
      setPasswordStatus({ type: "error", message: t("current_code_err") });
    }
    setTimeout(() => setPasswordStatus({ type: null, message: "" }), 4000);
  };

  return (
    <SettingsContainer>
      <SettingsSection icon={Shield} title={t("access_control")} description={t("access_desc")}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <SettingsRow label={t("current_code")}>
            <input
              type={showPassword ? "text" : "password"}
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              className="input-primary py-3 px-4"
            />
          </SettingsRow>
          <SettingsRow label={t("new_code")}>
            <input
              type={showPassword ? "text" : "password"}
              value={passwordForm.new}
              onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
              className="input-primary py-3 px-4"
            />
          </SettingsRow>
          <SettingsRow label={t("confirm_code")}>
            <input
              type={showPassword ? "text" : "password"}
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              className="input-primary py-3 px-4"
            />
          </SettingsRow>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[10px] font-bold text-muted flex items-center gap-2 hover:text-primary transition-colors uppercase tracking-widest"
            >
              {showPassword ? <EyeOff size={s(14)} /> : <Eye size={s(14)} />}{" "}
              {showPassword ? t("hide_codes") : t("show_codes")}
            </button>
            <button
              type="submit"
              className="bg-red-500/90 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-colors shadow-lg shadow-red-500/20"
            >
              {t("update_code_btn")}
            </button>
          </div>
          {passwordStatus.type && (
            <div
              className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-3 ${
                passwordStatus.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              <AlertCircle size={s(18)} />
              {passwordStatus.message}
            </div>
          )}
        </form>
      </SettingsSection>
    </SettingsContainer>
  );
};
