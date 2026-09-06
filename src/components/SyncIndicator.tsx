import React, { useEffect, useState } from "react";
import { CloudOff, Loader2 } from "../utils/icons";
import { storageService } from "../services/storage";
import { apiClient } from "../services/apiClient";
import { useLanguage } from "../contexts/LanguageContext";

export const SyncIndicator: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let mounted = true;

    const refreshAuthState = () => {
      // isAuthenticated() may attempt a token refresh (network) — only apply
      // the result while still mounted.
      apiClient.isAuthenticated().then((authenticated) => {
        if (mounted) setIsLocalMode(!authenticated);
      });
    };

    refreshAuthState();
    window.addEventListener("modernnav:auth-changed", refreshAuthState);

    const unsubscribe = storageService.subscribeSyncStatus((status) => {
      setIsSyncing(status);
    });

    return () => {
      mounted = false;
      window.removeEventListener("modernnav:auth-changed", refreshAuthState);
      unsubscribe();
    };
  }, []);

  if (isSyncing) {
    return (
      <div className="w-full flex justify-center pb-2 animate-fade-in z-20 relative">
        <div className="flex items-center gap-2 text-[11px] font-medium opacity-60 tracking-wider">
          <Loader2 size={12} className="animate-spin" />
          <span>{t("syncing_msg")}</span>
        </div>
      </div>
    );
  }

  if (!isLocalMode) return null;

  return (
    <div className="w-full flex justify-center pb-2 animate-fade-in z-20 relative">
      <div
        className="flex items-center gap-1.5 text-[11px] font-medium opacity-50 tracking-wider"
        title={t("local_mode_msg")}
      >
        <CloudOff size={12} />
        <span>{t("local_mode_msg")}</span>
      </div>
    </div>
  );
};
