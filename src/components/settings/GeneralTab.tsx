import React, { useState } from "react";
import {
  Globe,
  Save,
  CheckCircle2,
  Link as LinkIcon,
  Plus,
  Trash2,
  Settings,
  Search,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { UserPreferences, FooterLink, SearchEngine } from "../../types";
import {
  DEFAULT_SITE_TITLE,
  DEFAULT_FAVICON_API,
  DEFAULT_FOOTER_GITHUB,
  DEFAULT_FOOTER_LINKS,
  DEFAULT_SEARCH_ENGINES,
} from "../../constants/defaults";
import { useViewportScale } from "../../hooks/useViewportScale";
import { getIconSize, getFaviconUrl } from "../../utils/favicon";
import { SmartIcon } from "../SmartIcon";
import { SettingsContainer, SettingsSection, SettingsRow } from "./SettingsPrimitives";

interface GeneralTabProps {
  prefs: UserPreferences;
  onUpdate: (newPrefs: Partial<UserPreferences>) => void;
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ prefs, onUpdate }) => {
  const { t } = useLanguage();
  const viewportScale = useViewportScale();
  const s = (n: number) => getIconSize(n, viewportScale);
  const [formData, setFormData] = useState({
    siteTitle: prefs.siteTitle || DEFAULT_SITE_TITLE,
    faviconApi: prefs.faviconApi || DEFAULT_FAVICON_API,
    footerGithub: prefs.footerGithub || DEFAULT_FOOTER_GITHUB,
    footerLinks: prefs.footerLinks || DEFAULT_FOOTER_LINKS,
    searchEngines: prefs.searchEngines ?? DEFAULT_SEARCH_ENGINES,
    frequentLinks: prefs.frequentLinks ?? { enabled: true, count: 10, pinToTop: true },
  });
  const [saveStatus, setSaveStatus] = useState(false);

  const handleSave = () => {
    onUpdate(formData);
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 3000);
  };

  const addFooterLink = () => {
    setFormData({
      ...formData,
      footerLinks: [...formData.footerLinks, { title: "", url: "" }],
    });
  };

  const removeFooterLink = (index: number) => {
    const newLinks = [...formData.footerLinks];
    newLinks.splice(index, 1);
    setFormData({ ...formData, footerLinks: newLinks });
  };

  const updateFooterLink = (index: number, field: keyof FooterLink, value: string) => {
    const newLinks = [...formData.footerLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData({ ...formData, footerLinks: newLinks });
  };

  const addSearchEngine = () => {
    setFormData({
      ...formData,
      searchEngines: [
        ...formData.searchEngines,
        { id: Date.now().toString(), name: "", urlTemplate: "", icon: "" },
      ],
    });
  };

  const removeSearchEngine = (index: number) => {
    const next = [...formData.searchEngines];
    next.splice(index, 1);
    setFormData({ ...formData, searchEngines: next });
  };

  const updateSearchEngine = (index: number, field: keyof SearchEngine, value: string) => {
    const next = [...formData.searchEngines];
    next[index] = { ...next[index], [field]: value };
    setFormData({ ...formData, searchEngines: next });
  };

  const resetSearchEngines = () => {
    setFormData({ ...formData, searchEngines: DEFAULT_SEARCH_ENGINES });
  };

  return (
    <SettingsContainer>
      <SettingsSection icon={Settings} title={t("tab_general")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingsRow label={t("label_site_title")}>
            <input
              type="text"
              value={formData.siteTitle}
              onChange={(e) => setFormData({ ...formData, siteTitle: e.target.value })}
              className="input-primary"
            />
          </SettingsRow>
          <SettingsRow label={t("label_github_link")}>
            <input
              type="text"
              value={formData.footerGithub}
              onChange={(e) => setFormData({ ...formData, footerGithub: e.target.value })}
              className="input-primary font-mono"
            />
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        icon={Globe}
        title={t("label_favicon_api")}
        description={t("label_favicon_api_desc")}
      >
        <input
          type="text"
          value={formData.faviconApi}
          onChange={(e) => setFormData({ ...formData, faviconApi: e.target.value })}
          className="input-primary text-xs font-mono"
          placeholder="https://favicon.im/{domain}"
        />
      </SettingsSection>

      <SettingsSection
        icon={Search}
        title={t("label_search_engines")}
        description={t("label_search_engines_desc")}
        action={
          <button
            onClick={addSearchEngine}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <Plus size={s(12)} /> {t("btn_add_link")}
          </button>
        }
      >
        <div className="space-y-2">
          {formData.searchEngines.map((engine, index) => (
            <div key={engine.id} className="flex gap-2 group animate-fade-in relative">
              <input
                type="text"
                value={engine.name}
                onChange={(e) => updateSearchEngine(index, "name", e.target.value)}
                placeholder={t("search_engine_name")}
                className="input-primary w-28 text-xs"
              />
              <input
                type="text"
                value={engine.urlTemplate}
                onChange={(e) => updateSearchEngine(index, "urlTemplate", e.target.value)}
                placeholder={t("search_engine_url")}
                className="input-primary flex-1 text-xs font-mono"
              />
              <div className="relative flex-1">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <SmartIcon
                    icon={engine.icon ? getFaviconUrl(engine.icon, formData.faviconApi) : ""}
                    size={16}
                    imgClassName="object-contain"
                    faviconApi={formData.faviconApi}
                    sourceUrl={engine.icon || undefined}
                  />
                </div>
                <input
                  type="text"
                  value={engine.icon}
                  onChange={(e) => updateSearchEngine(index, "icon", e.target.value)}
                  placeholder={t("search_engine_icon")}
                  className="input-primary w-full text-xs font-mono pl-8"
                />
              </div>
              <button
                onClick={() => removeSearchEngine(index)}
                className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={s(14)} />
              </button>
            </div>
          ))}
          {formData.searchEngines.length === 0 && (
            <p className="text-center py-2 text-muted text-[10px] italic">
              No search engines configured. Click &quot;Reset Default&quot; to restore defaults.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={LinkIcon}
        title={t("label_friendship_links")}
        action={
          <button
            onClick={addFooterLink}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <Plus size={s(12)} /> {t("btn_add_link")}
          </button>
        }
      >
        <div className="space-y-2">
          {formData.footerLinks.map((link, index) => (
            <div key={index} className="flex gap-2 group animate-fade-in relative">
              <input
                type="text"
                value={link.title}
                onChange={(e) => updateFooterLink(index, "title", e.target.value)}
                placeholder="Title"
                className="input-primary w-32 text-xs"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateFooterLink(index, "url", e.target.value)}
                placeholder="https://..."
                className="input-primary flex-1 text-xs font-mono"
              />
              <button
                onClick={() => removeFooterLink(index)}
                className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={s(14)} />
              </button>
            </div>
          ))}
          {formData.footerLinks.length === 0 && (
            <p className="text-center py-2 text-muted text-[10px] italic">
              No friendship links configured.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        icon={TrendingUp}
        title={t("label_frequent_links")}
        description={t("label_frequent_links_desc")}
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <button
              onClick={() =>
                setFormData({
                  ...formData,
                  frequentLinks: {
                    ...formData.frequentLinks,
                    enabled: !formData.frequentLinks.enabled,
                  },
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.frequentLinks.enabled
                  ? "bg-[var(--theme-primary)]"
                  : "bg-black/10 dark:bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  formData.frequentLinks.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-xs font-medium text-secondary">
              {t("label_frequent_enabled")}
            </span>
          </label>
          {formData.frequentLinks.enabled && (
            <>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button
                  onClick={() =>
                    setFormData({
                      ...formData,
                      frequentLinks: {
                        ...formData.frequentLinks,
                        pinToTop: !formData.frequentLinks.pinToTop,
                      },
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.frequentLinks.pinToTop
                      ? "bg-[var(--theme-primary)]"
                      : "bg-black/10 dark:bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      formData.frequentLinks.pinToTop ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-xs font-medium text-secondary">
                  {t("label_frequent_pin_top")}
                </span>
              </label>
              <label className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-secondary">
                  {t("label_frequent_count")}
                </span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.frequentLinks.count}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                    setFormData({
                      ...formData,
                      frequentLinks: { ...formData.frequentLinks, count: v },
                    });
                  }}
                  className="input-primary w-16 text-xs text-center"
                />
              </label>
            </>
          )}
        </div>
      </SettingsSection>

      <div className="flex items-center gap-3">
        <button
          onClick={resetSearchEngines}
          className="btn-secondary flex-1 py-2.5 rounded-xl tracking-[0.15em] font-bold uppercase group"
        >
          <RotateCcw size={s(14)} className="group-active:rotate-[-90deg] transition-transform" />
          <span className="text-[10px]">{t("btn_reset_default")}</span>
        </button>
        <button
          onClick={handleSave}
          className={
            saveStatus
              ? "flex-1 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 py-2.5 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2"
              : "btn-primary flex-1 py-2.5 tracking-[0.2em] text-[10px]"
          }
        >
          {saveStatus ? <CheckCircle2 size={s(14)} /> : <Save size={s(14)} />}
          <span>{saveStatus ? t("msg_saved") : t("btn_update_settings")}</span>
        </button>
      </div>
    </SettingsContainer>
  );
};
