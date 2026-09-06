import React, { useRef, useEffect } from "react";
import { Plus, Save, Smile, Wand2, Loader2 } from "../../utils/icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { IconPicker } from "../IconPicker";
import { SmartIcon } from "../SmartIcon";
import { apiClient } from "../../services/apiClient";
import type { ContentEditorState, ContentEditorActions } from "./useContentEditor";

interface LinkFormProps {
  state: ContentEditorState;
  actions: ContentEditorActions;
}

function isValidUrl(str: string | undefined): str is string {
  if (!str) return false;
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const LinkForm: React.FC<LinkFormProps> = ({ state, actions }) => {
  const { t } = useLanguage();
  const {
    linkFormData,
    showIconPicker,
    iconSearch,
    editingLinkId,
    iconPickerRef,
    iconGroupRef,
    isFetching,
  } = state;
  const {
    setLinkFormData,
    setShowIconPicker,
    setIconSearch,
    closeLinkForm,
    handleSaveLink,
    setIsFetching,
  } = actions;

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDataRef = useRef(linkFormData);

  useEffect(() => {
    formDataRef.current = linkFormData;
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const doFetch = (url: string, fillOnlyBlanks: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsFetching(true);

    apiClient
      .fetchMetadata(url, controller.signal)
      .then((meta) => {
        if (controller.signal.aborted) return;
        const current = formDataRef.current;
        setLinkFormData({
          ...current,
          title: fillOnlyBlanks && current.title ? current.title : meta.title || current.title,
          description:
            fillOnlyBlanks && current.description
              ? current.description
              : meta.description || current.description,
          icon: fillOnlyBlanks && current.icon ? current.icon : meta.icon || current.icon,
        });
      })
      .catch(() => {
        // Silent failure
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsFetching(false);
      });
  };

  const handleUrlChange = (value: string) => {
    abortRef.current?.abort();
    setIsFetching(false);
    setLinkFormData({ ...linkFormData, url: value });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (
      isValidUrl(value) &&
      !linkFormData.title &&
      !linkFormData.description &&
      !linkFormData.icon
    ) {
      debounceRef.current = setTimeout(() => {
        doFetch(value, true);
      }, 800);
    }
  };

  const handleManualFetch = () => {
    if (isValidUrl(linkFormData.url) && !isFetching) {
      doFetch(linkFormData.url, false);
    }
  };

  return (
    <div
      className="surface-sunken border-t border-default p-4 animate-fade-in backdrop-blur-md relative z-20"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="label-xs">{t("label_title")}</label>
          <input
            type="text"
            value={linkFormData.title}
            onChange={(e) => setLinkFormData({ ...linkFormData, title: e.target.value })}
            placeholder={t("title_placeholder")}
            className="input-primary"
            autoFocus
          />
        </div>
        <div className="col-span-2 sm:col-span-1 relative">
          <label className="label-xs">{t("label_icon")}</label>
          <div className="relative group/icon" ref={iconGroupRef}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <SmartIcon icon={linkFormData.icon} size={18} />
            </div>
            <input
              type="text"
              value={linkFormData.icon}
              onFocus={() => setShowIconPicker(true)}
              onChange={(e) => {
                setLinkFormData({ ...linkFormData, icon: e.target.value });
                setIconSearch(e.target.value);
              }}
              placeholder={t("icon_placeholder")}
              className="input-primary pl-10 pr-10"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowIconPicker(!showIconPicker);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
            >
              <Smile size={18} />
            </button>
          </div>
          <IconPicker
            show={showIconPicker}
            onClose={() => setShowIconPicker(false)}
            value={linkFormData.icon || ""}
            onChange={(val) => setLinkFormData({ ...linkFormData, icon: val })}
            searchTerm={iconSearch}
            onSearchChange={setIconSearch}
            pickerRef={iconPickerRef}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label-xs">{t("label_url")}</label>
          <div className="relative">
            <input
              type="text"
              value={linkFormData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={t("url_placeholder")}
              className="input-primary pr-10"
            />
            <button
              onClick={handleManualFetch}
              disabled={isFetching || !isValidUrl(linkFormData.url)}
              title={t(isFetching ? "fetching_metadata" : "fetch_metadata")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isFetching ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            </button>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label-xs">{t("label_desc")}</label>
          <input
            type="text"
            value={linkFormData.description}
            onChange={(e) =>
              setLinkFormData({
                ...linkFormData,
                description: e.target.value,
              })
            }
            placeholder={t("desc_placeholder")}
            className="input-primary"
          />
        </div>
        <div className="col-span-2 flex gap-2 pt-1">
          <button onClick={closeLinkForm} className="flex-1 btn-secondary">
            {t("cancel")}
          </button>
          <button onClick={handleSaveLink} className="flex-1 btn-primary">
            {editingLinkId ? <Save size={14} /> : <Plus size={14} />}
            {editingLinkId ? t("update_link_card") : t("add_link_card")}
          </button>
        </div>
      </div>
    </div>
  );
};
