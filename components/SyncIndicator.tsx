import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { storageService } from "../services/storage";
import { useLanguage } from "../contexts/LanguageContext";

export const SyncIndicator: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribe = storageService.subscribeSyncStatus((status) => {
      setIsSyncing(status);
    });
    return () => unsubscribe();
  }, []);

  if (!isSyncing) return null;

  return (
    <div className="w-full flex justify-center pb-2 animate-fade-in z-20 relative">
      <div className="flex items-center gap-2 text-[11px] font-medium opacity-60 tracking-wider">
        <Loader2 size={12} className="animate-spin" />
        <span>{t("syncing_msg")}</span>
      </div>
    </div>
  );
};
