import React, { useRef, useState } from "react";
import { Database, Download, Upload, AlertCircle, HardDriveDownload, FileUp } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { storageService } from "../../services/storage";
import { Category, UserPreferences } from "../../types";
import { useViewportScale } from "../../hooks/useViewportScale";
import { getIconSize } from "../../utils/favicon";
import { SettingsContainer, SettingsSection } from "./SettingsPrimitives";
import { parseBookmarksHtml } from "../../utils/parseBookmarks";

interface DataTabProps {
  onImport: (categories: Category[], background?: string, prefs?: UserPreferences) => void;
  onImportBookmarks: (categories: Category[]) => void;
  background: string;
  prefs: UserPreferences;
}

export const DataTab: React.FC<DataTabProps> = ({
  onImport,
  onImportBookmarks,
  background: _background,
  prefs: _prefs,
}) => {
  const { t } = useLanguage();
  const viewportScale = useViewportScale();
  const s = (n: number) => getIconSize(n, viewportScale);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bookmarkInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [pendingBookmarks, setPendingBookmarks] = useState<{
    categories: Category[];
    catCount: number;
    linkCount: number;
  } | null>(null);

  const handleExport = () => {
    storageService.exportData();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await storageService.importData(file);

      onImport(importedData.categories || [], importedData.background, importedData.prefs);

      setImportStatus({ type: "success", message: t("import_success") });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("import_error");
      setImportStatus({
        type: "error",
        message,
      });
    }
    e.target.value = "";
    setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
  };

  const handleBookmarkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const html = await file.text();
      const categories = parseBookmarksHtml(html);
      if (categories.length === 0) {
        setImportStatus({ type: "error", message: t("import_bookmarks_empty") });
        setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
        return;
      }
      const linkCount = categories.reduce(
        (sum, c) => sum + c.subCategories.reduce((s, sub) => s + sub.items.length, 0),
        0
      );
      setPendingBookmarks({ categories, catCount: categories.length, linkCount });
    } catch {
      setImportStatus({ type: "error", message: t("import_bookmarks_error") });
      setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
    }
    e.target.value = "";
  };

  const confirmBookmarkImport = () => {
    if (!pendingBookmarks) return;
    onImportBookmarks(pendingBookmarks.categories);
    setImportStatus({
      type: "success",
      message: t("import_bookmarks_success")
        .replace("{count}", String(pendingBookmarks.catCount))
        .replace("{links}", String(pendingBookmarks.linkCount)),
    });
    setPendingBookmarks(null);
    setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
  };

  return (
    <SettingsContainer>
      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5 flex gap-4 items-start">
        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
          <Database size={s(20)} />
        </div>
        <div>
          <h3 className="text-blue-400 font-bold tracking-tight mb-0.5 text-sm">
            {t("data_risk_title")}
          </h3>
          <p className="text-muted text-xs leading-relaxed">{t("data_risk_desc")}</p>
        </div>
      </div>

      <SettingsSection icon={Download} title={t("backup_config")} description={t("backup_desc")}>
        <button
          onClick={handleExport}
          className="btn-secondary w-full py-3 font-bold uppercase tracking-widest group"
        >
          <Download
            size={s(18)}
            className="text-blue-400 group-hover:translate-y-0.5 transition-transform"
          />{" "}
          {t("download_backup")}
        </button>
      </SettingsSection>

      <SettingsSection
        icon={HardDriveDownload}
        title={t("restore_config")}
        description={t("restore_desc")}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary w-full py-3 font-bold uppercase tracking-widest group"
        >
          <Upload
            size={s(18)}
            className="text-emerald-400 group-hover:-translate-y-0.5 transition-transform"
          />{" "}
          {t("select_import")}
        </button>
      </SettingsSection>

      <SettingsSection
        icon={FileUp}
        title={t("import_bookmarks")}
        description={t("import_bookmarks_desc")}
      >
        <input
          type="file"
          ref={bookmarkInputRef}
          onChange={handleBookmarkFileChange}
          accept=".html,.htm"
          className="hidden"
        />
        <button
          onClick={() => bookmarkInputRef.current?.click()}
          className="btn-secondary w-full py-3 font-bold uppercase tracking-widest group"
        >
          <FileUp
            size={s(18)}
            className="text-amber-400 group-hover:-translate-y-0.5 transition-transform"
          />{" "}
          {t("import_bookmarks")}
        </button>
        {pendingBookmarks && (
          <div className="mt-4 p-4 rounded-xl text-xs font-bold border bg-amber-500/10 border-amber-500/20 text-amber-400 flex items-center justify-between gap-3">
            <span>
              {t("import_bookmarks_confirm")
                .replace("{count}", String(pendingBookmarks.catCount))
                .replace("{links}", String(pendingBookmarks.linkCount))}
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setPendingBookmarks(null)}
                className="btn-secondary px-3 py-1.5 text-[10px]"
              >
                {t("cancel")}
              </button>
              <button
                onClick={confirmBookmarkImport}
                className="btn-primary px-3 py-1.5 text-[10px]"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        )}
      </SettingsSection>

      {importStatus.type && (
        <div
          className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-3 ${
            importStatus.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <AlertCircle size={s(18)} /> {importStatus.message}
        </div>
      )}
    </SettingsContainer>
  );
};
