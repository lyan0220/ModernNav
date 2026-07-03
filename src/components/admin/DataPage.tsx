import React from "react";
import {
  useBootstrap,
  useUpdateBackground,
  useUpdateCategories,
  useUpdatePrefs,
} from "../../services/queries";
import { DataTab } from "../settings/DataTab";
import { DEFAULT_PREFS } from "../../constants/defaults";
import { DEFAULT_BACKGROUND } from "../../services/storage";

export const DataPage: React.FC = () => {
  const { data } = useBootstrap();
  const updateCategories = useUpdateCategories();
  const updateBackground = useUpdateBackground();
  const updatePrefs = useUpdatePrefs();

  const prefs = data?.prefs ?? DEFAULT_PREFS;
  const background = data?.background ?? DEFAULT_BACKGROUND;
  const currentCategories = data?.categories ?? [];

  return (
    <DataTab
      background={background}
      prefs={prefs}
      onImport={(categories, newBg, newPrefs) => {
        updateCategories.mutate(categories);
        if (newBg) updateBackground.mutate(newBg);
        if (newPrefs) updatePrefs.mutate(newPrefs);
      }}
      onImportBookmarks={(imported) => {
        updateCategories.mutate([...currentCategories, ...imported]);
      }}
    />
  );
};

export default DataPage;
