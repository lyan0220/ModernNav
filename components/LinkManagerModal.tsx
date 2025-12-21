import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Download,
  Upload,
  Save,
  AlertCircle,
  Lock,
  Shield,
  Key,
  Eye,
  EyeOff,
  LogIn,
  Pencil,
  Search,
  LayoutGrid,
  Database,
  ShieldCheck,
  FolderPlus,
  Folder,
  Image as ImageIcon,
  RotateCcw,
  Sliders,
  LogOut,
  Loader2,
  Link as LinkIcon,
  Smile,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Category, LinkItem, SubCategory } from "../types";
import * as Icons from "lucide-react";
import { storageService, DEFAULT_BACKGROUND } from "../services/storage";
import { useLanguage } from "../contexts/LanguageContext";

interface LinkManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  background: string;
  prefs: { cardOpacity: number };
  onUpdateAppearance: (url: string, opacity: number) => void;
  isDefaultCode?: boolean;
}

type LinkFormData = Partial<LinkItem> & { subCategoryId: string };

// Categorized Suggestions
const SUGGESTED_ICONS = [
  "Link",
  "ExternalLink",
  "Globe",
  "Github",
  "Youtube",
  "Twitter",
  "Instagram",
  "Linkedin",
  "Code",
  "Terminal",
  "Cpu",
  "Database",
  "Cloud",
  "Server",
  "Hash",
  "Layers",
  "MessageSquare",
  "Mail",
  "Bell",
  "User",
  "Users",
  "Settings",
  "Shield",
  "Lock",
  "Search",
  "Heart",
  "Star",
  "Coffee",
  "Music",
  "Video",
  "Camera",
  "Image",
  "File",
  "Folder",
  "Briefcase",
  "ShoppingBag",
  "CreditCard",
  "Wallet",
  "Home",
  "Map",
];

const SUGGESTED_EMOJIS = [
  "🚀",
  "🔥",
  "✨",
  "⚡",
  "💡",
  "🛠️",
  "📦",
  "🎨",
  "🎮",
  "🎧",
  "📸",
  "📽️",
  "🏠",
  "🌍",
  "💼",
  "💻",
  "📱",
  "🔒",
  "🔑",
  "🏷️",
  "📌",
  "📎",
  "📅",
  "📊",
  "🌈",
  "🍎",
  "☕",
  "🍕",
  "🍺",
  "🏀",
  "⚽",
  "🚗",
  "✈️",
  "🚢",
  "🛸",
  "🤖",
];

export const LinkManagerModal: React.FC<LinkManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  setCategories,
  background,
  prefs,
  onUpdateAppearance,
  isDefaultCode = false,
}) => {
  const { t, language } = useLanguage();

  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authInput, setAuthInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<
    "content" | "appearance" | "data" | "security"
  >("content");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSubMenus, setCollapsedSubMenus] = useState<Set<string>>(
    new Set()
  );

  // --- Category States ---
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCategoryTitle, setEditCategoryTitle] = useState("");

  // --- SubMenu States ---
  const [isAddingSubMenu, setIsAddingSubMenu] = useState(false);
  const [newSubMenuTitle, setNewSubMenuTitle] = useState("");
  const [editingSubMenuId, setEditingSubMenuId] = useState<string | null>(null);
  const [editSubMenuTitle, setEditSubMenuTitle] = useState("");

  // --- Link Form States ---
  const [targetSubMenuId, setTargetSubMenuId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkFormData, setLinkFormData] = useState<LinkFormData>({
    title: "",
    url: "",
    description: "",
    icon: "",
    subCategoryId: "",
  });

  // --- Icon Picker State ---
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const iconPickerRef = useRef<HTMLDivElement>(null);

  // --- Appearance States ---
  const [bgInput, setBgInput] = useState(background);
  const [opacityInput, setOpacityInput] = useState(prefs.cardOpacity);
  const [bgStatus, setBgStatus] = useState<string>("");

  // --- Password States ---
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

  // --- Import/Export States ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // --- Drag and Drop States ---
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<
    number | null
  >(null);
  const [dragOverCategoryIndex, setDragOverCategoryIndex] = useState<
    number | null
  >(null);

  // Updated: Track source category ID to allow cross-category dragging
  const [draggedLink, setDraggedLink] = useState<{
    categoryId: string;
    subId: string;
    index: number;
  } | null>(null);
  const [dragOverLink, setDragOverLink] = useState<{
    subId: string;
    index: number;
  } | null>(null);

  // Highlighting the whole submenu container when dragging a link over it (for dropping into empty folders)
  const [dragOverSubMenuId, setDragOverSubMenuId] = useState<string | null>(
    null
  );

  // Ref for handling auto-switch delay
  const hoverSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Computed State
  const isAnyEditing =
    editingCategoryId !== null ||
    editingSubMenuId !== null ||
    targetSubMenuId !== null ||
    editingLinkId !== null ||
    isAddingSubMenu;

  const filteredIconNames = useMemo(() => {
    if (!iconSearch.trim()) return SUGGESTED_ICONS;
    const search = iconSearch.toLowerCase();
    return Object.keys(Icons)
      .filter(
        (name) =>
          name.toLowerCase().includes(search) &&
          name !== "createLucideIcon" &&
          typeof (Icons as any)[name] === "function"
      )
      .slice(0, 48);
  }, [iconSearch]);

  // Effects
  useEffect(() => {
    if (
      categories.length > 0 &&
      (!selectedCategoryId ||
        !categories.find((c) => c.id === selectedCategoryId))
    ) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Initial Auth Check
  useEffect(() => {
    if (isOpen) {
      storageService.isAuthenticated().then((isAuth) => {
        setIsAuthenticated(isAuth);
      });
      setAuthInput("");
      setAuthError("");
      setBgInput(background);
      setOpacityInput(prefs.cardOpacity);
      setBgStatus("");
    }
  }, [isOpen, background, prefs]);

  // Session Activity Monitor
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const interval = setInterval(() => {
      // Check if the underlying token is still valid (or refreshable)
      storageService.isAuthenticated().then((isAuth) => {
        if (!isAuth) {
          setIsAuthenticated(false);
          setAuthError(t("session_expired"));
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen, isAuthenticated, t]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        iconPickerRef.current &&
        !iconPickerRef.current.contains(event.target as Node)
      ) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Handlers
  const syncCategories = async (newCategories: Category[]) => {
    setCategories(newCategories);
    try {
      await storageService.saveCategories(newCategories);
    } catch (e) {
      console.error("Failed to sync", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setAuthError("");

    try {
      // Use new storage service login which calls API
      const success = await storageService.login(authInput);
      if (success) {
        setIsAuthenticated(true);
      } else {
        setAuthError(t("incorrect_code"));
      }
    } catch (error) {
      setAuthError(t("incorrect_code"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    storageService.logout();
    setIsAuthenticated(false);
  };

  const handleAddCategory = () => {
    if (!newCategoryTitle.trim()) return;
    const newCat: Category = {
      id: Date.now().toString(),
      title: newCategoryTitle,
      subCategories: [
        { id: Date.now().toString() + "-gen", title: "Default", items: [] },
      ],
    };
    syncCategories([...categories, newCat]);
    setNewCategoryTitle("");
    setSelectedCategoryId(newCat.id);
  };

  const handleUpdateCategoryTitle = (id: string) => {
    if (!editCategoryTitle.trim()) {
      setEditingCategoryId(null);
      return;
    }
    syncCategories(
      categories.map((c) =>
        c.id === id ? { ...c, title: editCategoryTitle } : c
      )
    );
    setEditingCategoryId(null);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (window.confirm(t("delete_cat_confirm", { name }))) {
      const updated = categories.filter((c) => c.id !== id);
      syncCategories(updated);
      if (selectedCategoryId === id && updated.length > 0)
        setSelectedCategoryId(updated[0].id);
    }
  };

  const resetDragState = () => {
    setDraggedCategoryIndex(null);
    setDragOverCategoryIndex(null);
    setDraggedLink(null);
    setDragOverLink(null);
    setDragOverSubMenuId(null);
    if (hoverSwitchTimeoutRef.current) {
      clearTimeout(hoverSwitchTimeoutRef.current);
      hoverSwitchTimeoutRef.current = null;
    }
  };

  const handleDragStartCategory = (e: React.DragEvent, index: number) => {
    if (isAnyEditing) {
      e.preventDefault();
      return;
    }
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverCategory = (
    e: React.DragEvent,
    index: number,
    catId: string
  ) => {
    e.preventDefault(); // Essential to allow drop
    e.dataTransfer.dropEffect = "move";

    // 1. Handling Category Reordering
    if (draggedCategoryIndex !== null && draggedCategoryIndex !== index) {
      setDragOverCategoryIndex(index);
    }

    // 2. Handling Link Drag (Switch View Logic)
    if (draggedLink) {
      // If hovering over a different category than selected, highlight it
      if (selectedCategoryId !== catId) {
        setDragOverCategoryIndex(index);

        // Schedule auto-switch if not already scheduled
        if (!hoverSwitchTimeoutRef.current) {
          hoverSwitchTimeoutRef.current = setTimeout(() => {
            setSelectedCategoryId(catId);
            // Clear highlight after switch implies we are now "in" this category
            setDragOverCategoryIndex(null);
            hoverSwitchTimeoutRef.current = null;
          }, 600); // 600ms delay to switch view
        }
      } else {
        // If we moved back to current category, clear timeout
        if (hoverSwitchTimeoutRef.current) {
          clearTimeout(hoverSwitchTimeoutRef.current);
          hoverSwitchTimeoutRef.current = null;
        }
        setDragOverCategoryIndex(null);
      }
    }
  };

  const handleDragLeaveCategory = () => {
    // If leaving the sidebar item, clear the switch timer
    if (hoverSwitchTimeoutRef.current) {
      clearTimeout(hoverSwitchTimeoutRef.current);
      hoverSwitchTimeoutRef.current = null;
    }
    setDragOverCategoryIndex(null);
  };

  const handleDropCategory = (
    e: React.DragEvent,
    targetIndex: number,
    targetCatId: string
  ) => {
    e.preventDefault();

    // Case A: Reordering Categories
    if (draggedCategoryIndex !== null) {
      if (draggedCategoryIndex === targetIndex) {
        resetDragState();
        return;
      }
      const updated = [...categories];
      const [moved] = updated.splice(draggedCategoryIndex, 1);
      updated.splice(targetIndex, 0, moved);
      syncCategories(updated);
      resetDragState();
      return;
    }

    // Case B: Dropping a Link onto a Sidebar Category (Moves to first submenu of target category)
    if (draggedLink) {
      const sourceCatId = draggedLink.categoryId;
      // Optimization: If dropping on same category source, ignore (user should use main view to reorder)
      // Unless we want to allow "Move to Default" even within same category? Let's allow cross-cat only for simplicity or standard move.
      // Actually, users might expect it to go to default folder if they drop on sidebar.

      const newCategories = JSON.parse(
        JSON.stringify(categories)
      ) as Category[];

      // 1. Remove from Source
      const sourceCat = newCategories.find((c) => c.id === sourceCatId);
      const sourceSub = sourceCat?.subCategories.find(
        (s) => s.id === draggedLink.subId
      );
      if (!sourceCat || !sourceSub) {
        resetDragState();
        return;
      }
      const [movedItem] = sourceSub.items.splice(draggedLink.index, 1);

      // 2. Add to Target (First SubMenu)
      const targetCat = newCategories.find((c) => c.id === targetCatId);
      if (targetCat && targetCat.subCategories.length > 0) {
        targetCat.subCategories[0].items.push(movedItem);
        syncCategories(newCategories);
        setSelectedCategoryId(targetCatId); // Ensure we switch to it to show the result
      }

      resetDragState();
    }
  };

  const handleDragStartLink = (
    e: React.DragEvent,
    subId: string,
    index: number
  ) => {
    e.stopPropagation();
    if (isAnyEditing) {
      e.preventDefault();
      return;
    }
    // Store categoryId to allow cross-category movement tracking
    setDraggedLink({ categoryId: selectedCategoryId, subId, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnterLink = (subId: string, index: number) => {
    if (
      draggedLink &&
      (draggedLink.subId !== subId || draggedLink.index !== index)
    ) {
      setDragOverLink({ subId, index });
    }
  };

  // Called when dragging a link over a SubMenu container (Header or empty space)
  const handleDragOverSubMenu = (e: React.DragEvent, subId: string) => {
    if (!draggedLink) return; // Only allow links
    e.preventDefault(); // Allow drop
    if (dragOverSubMenuId !== subId && draggedLink.subId !== subId) {
      setDragOverSubMenuId(subId);
    }
  };

  // Handle dropping a link onto the SubMenu container (appends to end)
  const handleDropLinkToSubMenu = (e: React.DragEvent, targetSubId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLink) {
      resetDragState();
      return;
    }

    // If dropping into same folder but not on a specific item, effectively no-op (or move to end)
    if (
      draggedLink.categoryId === selectedCategoryId &&
      draggedLink.subId === targetSubId
    ) {
      // Optional: Move to end if dropped on header? For now, reset.
      resetDragState();
      return;
    }

    const newCategories = JSON.parse(JSON.stringify(categories)) as Category[];

    // 1. Remove from Source (Source Category might be different from Selected)
    const sourceCatIndex = newCategories.findIndex(
      (c) => c.id === draggedLink.categoryId
    );
    if (sourceCatIndex === -1) {
      resetDragState();
      return;
    }

    const sourceSubIndex = newCategories[
      sourceCatIndex
    ].subCategories.findIndex((s) => s.id === draggedLink.subId);
    if (sourceSubIndex === -1) {
      resetDragState();
      return;
    }

    const [movedItem] = newCategories[sourceCatIndex].subCategories[
      sourceSubIndex
    ].items.splice(draggedLink.index, 1);

    // 2. Add to Target (Current Selected Category -> Target Sub ID)
    const targetCatIndex = newCategories.findIndex(
      (c) => c.id === selectedCategoryId
    );
    if (targetCatIndex === -1) {
      resetDragState();
      return;
    } // Should not happen

    const targetSubIndex = newCategories[
      targetCatIndex
    ].subCategories.findIndex((s) => s.id === targetSubId);
    if (targetSubIndex === -1) {
      resetDragState();
      return;
    }

    newCategories[targetCatIndex].subCategories[targetSubIndex].items.push(
      movedItem
    );

    syncCategories(newCategories);

    // Expand target folder if collapsed so user sees the dropped item
    if (collapsedSubMenus.has(targetSubId)) {
      const newCollapsed = new Set(collapsedSubMenus);
      newCollapsed.delete(targetSubId);
      setCollapsedSubMenus(newCollapsed);
    }

    resetDragState();
  };

  const handleDropLink = (
    e: React.DragEvent,
    targetSubId: string,
    targetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLink) {
      resetDragState();
      return;
    }

    // Optimization: if dropping on exact same spot
    if (
      draggedLink.categoryId === selectedCategoryId &&
      draggedLink.subId === targetSubId &&
      draggedLink.index === targetIndex
    ) {
      resetDragState();
      return;
    }

    const newCategories = JSON.parse(JSON.stringify(categories)) as Category[];

    // 1. Remove from Source
    const sourceCatIndex = newCategories.findIndex(
      (c) => c.id === draggedLink.categoryId
    );
    if (sourceCatIndex === -1) {
      resetDragState();
      return;
    }

    const sourceSubIndex = newCategories[
      sourceCatIndex
    ].subCategories.findIndex((s) => s.id === draggedLink.subId);
    if (sourceSubIndex === -1) {
      resetDragState();
      return;
    }

    const [movedItem] = newCategories[sourceCatIndex].subCategories[
      sourceSubIndex
    ].items.splice(draggedLink.index, 1);

    // 2. Add to Target (Current Selected Category)
    const targetCatIndex = newCategories.findIndex(
      (c) => c.id === selectedCategoryId
    );
    // Find target SubCategory index
    const targetSubIndex = newCategories[
      targetCatIndex
    ].subCategories.findIndex((s) => s.id === targetSubId);

    if (targetSubIndex !== -1) {
      newCategories[targetCatIndex].subCategories[targetSubIndex].items.splice(
        targetIndex,
        0,
        movedItem
      );
      syncCategories(newCategories);
    }

    resetDragState();
  };

  const handleAddSubMenu = () => {
    if (!newSubMenuTitle.trim() || !selectedCategoryId) return;
    const newSub: SubCategory = {
      id: Date.now().toString(),
      title: newSubMenuTitle,
      items: [],
    };
    syncCategories(
      categories.map((c) =>
        c.id === selectedCategoryId
          ? { ...c, subCategories: [...c.subCategories, newSub] }
          : c
      )
    );
    setNewSubMenuTitle("");
    setIsAddingSubMenu(false);
  };

  const handleAddLinkDirectly = () => {
    if (!selectedCategoryId) return;
    const newSubId = Date.now().toString();
    const newSub: SubCategory = { id: newSubId, title: "Default", items: [] };
    syncCategories(
      categories.map((c) =>
        c.id === selectedCategoryId
          ? { ...c, subCategories: [...c.subCategories, newSub] }
          : c
      )
    );
    setTargetSubMenuId(newSubId);
    setEditingLinkId(null);
    setLinkFormData({
      title: "",
      url: "",
      description: "",
      icon: "",
      subCategoryId: newSubId,
    });
  };

  const handleDeleteSubMenu = (subId: string, title: string) => {
    if (window.confirm(t("delete_submenu_confirm", { name: title }))) {
      syncCategories(
        categories.map((c) =>
          c.id === selectedCategoryId
            ? {
                ...c,
                subCategories: c.subCategories.filter((s) => s.id !== subId),
              }
            : c
        )
      );
    }
  };

  const handleUpdateSubMenuTitle = (subId: string) => {
    if (!editSubMenuTitle.trim()) return;
    syncCategories(
      categories.map((c) =>
        c.id === selectedCategoryId
          ? {
              ...c,
              subCategories: c.subCategories.map((s) =>
                s.id === subId ? { ...s, title: editSubMenuTitle } : s
              ),
            }
          : c
      )
    );
    setEditingSubMenuId(null);
  };

  const toggleSubMenu = (subId: string) => {
    const newSet = new Set(collapsedSubMenus);
    if (newSet.has(subId)) {
      newSet.delete(subId);
    } else {
      newSet.add(subId);
    }
    setCollapsedSubMenus(newSet);
  };

  const openAddLink = (subId: string) => {
    setTargetSubMenuId(subId);
    setEditingLinkId(null);
    setLinkFormData({
      title: "",
      url: "",
      description: "",
      icon: "",
      subCategoryId: subId,
    });
    setIconSearch("");
    setShowIconPicker(false);

    // Auto expand if trying to add link
    const newCollapsed = new Set(collapsedSubMenus);
    newCollapsed.delete(subId);
    setCollapsedSubMenus(newCollapsed);
  };

  const openEditLink = (subId: string, item: LinkItem) => {
    setTargetSubMenuId(subId);
    setEditingLinkId(item.id);
    setLinkFormData({
      title: item.title,
      url: item.url,
      description: item.description || "",
      icon: item.icon || "",
      subCategoryId: subId,
    });
    setIconSearch("");
    setShowIconPicker(false);
  };

  const handleSaveLink = () => {
    if (
      !linkFormData.title ||
      !linkFormData.url ||
      !selectedCategoryId ||
      !targetSubMenuId
    )
      return;

    let finalIcon = linkFormData.icon;
    if (!finalIcon && linkFormData.url) {
      try {
        const urlToParse = linkFormData.url.match(/^https?:\/\//)
          ? linkFormData.url
          : `https://${linkFormData.url}`;
        const hostname = new URL(urlToParse).hostname;
        if (hostname) finalIcon = `https://favicon.im/${hostname}?larger=true`;
      } catch (e) {}
    }

    const newItem: LinkItem = {
      id: editingLinkId || Date.now().toString(),
      title: linkFormData.title,
      url: linkFormData.url,
      description: linkFormData.description || "",
      icon: finalIcon || "Link",
    };

    syncCategories(
      categories.map((cat) =>
        cat.id === selectedCategoryId
          ? {
              ...cat,
              subCategories: cat.subCategories.map((sub) => {
                if (sub.id === targetSubMenuId) {
                  return editingLinkId
                    ? {
                        ...sub,
                        items: sub.items.map((i) =>
                          i.id === editingLinkId ? newItem : i
                        ),
                      }
                    : { ...sub, items: [...sub.items, newItem] };
                }
                return sub;
              }),
            }
          : cat
      )
    );
    closeLinkForm();
  };

  const handleDeleteLink = (subId: string, linkId: string) => {
    if (window.confirm("Delete this link?")) {
      syncCategories(
        categories.map((cat) =>
          cat.id === selectedCategoryId
            ? {
                ...cat,
                subCategories: cat.subCategories.map((sub) =>
                  sub.id === subId
                    ? {
                        ...sub,
                        items: sub.items.filter((i) => i.id !== linkId),
                      }
                    : sub
                ),
              }
            : cat
        )
      );
    }
  };

  const closeLinkForm = () => {
    setTargetSubMenuId(null);
    setEditingLinkId(null);
    setLinkFormData({
      title: "",
      url: "",
      description: "",
      icon: "",
      subCategoryId: "",
    });
    setShowIconPicker(false);
  };

  const handleResetBackground = () => {
    setBgInput(DEFAULT_BACKGROUND);
    setBgStatus(t("bg_updated"));
    setTimeout(() => setBgStatus(""), 3000);
  };

  const handleUpdateBackground = () => {
    onUpdateAppearance(bgInput, opacityInput);
    setBgStatus(t("bg_updated"));
    setTimeout(() => setBgStatus(""), 3000);
  };

  const handleExport = () => {
    storageService.exportData();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedData = await storageService.importData(file);
      if (importedData.categories) syncCategories(importedData.categories);
      let hasAppearanceUpdate = false;
      if (importedData.background) {
        setBgInput(importedData.background);
        storageService.setBackground(importedData.background);
        hasAppearanceUpdate = true;
      }
      if (importedData.prefs) {
        setOpacityInput(importedData.prefs.cardOpacity);
        storageService.savePreferences(importedData.prefs);
        hasAppearanceUpdate = true;
      }
      if (hasAppearanceUpdate) {
        onUpdateAppearance(
          importedData.background || background,
          importedData.prefs?.cardOpacity ?? prefs.cardOpacity
        );
      }
      setImportStatus({ type: "success", message: t("import_success") });
    } catch (error: any) {
      // Use detailed error message if available
      setImportStatus({
        type: "error",
        message: error.message || t("import_error"),
      });
    }
    e.target.value = "";
    setTimeout(() => setImportStatus({ type: null, message: "" }), 6000);
  };

  const renderIcon = (iconValue: string | undefined, size = 16) => {
    const defaultIcon = <Icons.Link size={size} className="text-slate-400" />;
    if (!iconValue) return defaultIcon;
    if (iconValue.startsWith("http") || iconValue.startsWith("data:")) {
      return (
        <img
          src={iconValue}
          alt=""
          className="object-contain rounded-sm"
          style={{ width: size, height: size }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );
    }
    // @ts-ignore
    const IconComponent = Icons[iconValue];
    if (IconComponent)
      return <IconComponent size={size} className="text-slate-400" />;
    return (
      <span className="leading-none" style={{ fontSize: size }}>
        {iconValue}
      </span>
    );
  };

  const renderLinkForm = () => (
    <div className="bg-slate-950/40 border-t border-white/[0.08] p-4 animate-fade-in backdrop-blur-md relative z-20">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            {t("label_title")}
          </label>
          <input
            type="text"
            value={linkFormData.title}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, title: e.target.value })
            }
            placeholder={t("title_placeholder")}
            className="w-full bg-slate-900/50 border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)]/50 transition-all text-sm"
            autoFocus
          />
        </div>
        <div className="col-span-2 sm:col-span-1 relative" ref={iconPickerRef}>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            {t("label_icon")}
          </label>
          <div className="relative group/icon">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              {renderIcon(linkFormData.icon, 18)}
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
              className="w-full bg-slate-900/50 border border-white/[0.1] rounded-lg pl-10 pr-10 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)]/50 transition-all text-sm"
            />
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <Smile size={18} />
            </button>
          </div>

          {showIconPicker && (
            <div className="absolute top-full right-0 w-64 mt-2 apple-glass-dark rounded-xl border border-white/10 shadow-2xl p-3 z-50 animate-fade-in-down">
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  value={iconSearch}
                  onChange={(e) => setIconSearch(e.target.value)}
                  placeholder="Search icons..."
                  className="w-full bg-slate-950/50 border border-white/5 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)]/50"
                  autoFocus
                />
              </div>

              <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                <div>
                  <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.1em] mb-2 px-1">
                    {iconSearch ? "Search Results" : "Suggested Icons"}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {filteredIconNames.map((name) => {
                      const IconComp = (Icons as any)[name];
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            setLinkFormData({ ...linkFormData, icon: name });
                            setShowIconPicker(false);
                          }}
                          title={name}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white active:scale-90 ${
                            linkFormData.icon === name
                              ? "bg-[var(--theme-primary)]/20 text-white ring-1 ring-[var(--theme-primary)]/30"
                              : ""
                          }`}
                        >
                          {IconComp && <IconComp size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!iconSearch && (
                  <div>
                    <div className="text-[9px] text-slate-500 uppercase font-black tracking-[0.1em] mb-2 px-1">
                      Common Emojis
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                      {SUGGESTED_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setLinkFormData({ ...linkFormData, icon: emoji });
                            setShowIconPicker(false);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-base active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            {t("label_url")}
          </label>
          <input
            type="text"
            value={linkFormData.url}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, url: e.target.value })
            }
            placeholder={t("url_placeholder")}
            className="w-full bg-slate-900/50 border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)]/50 transition-all text-sm"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            {t("label_desc")}
          </label>
          <input
            type="text"
            value={linkFormData.description}
            onChange={(e) =>
              setLinkFormData({ ...linkFormData, description: e.target.value })
            }
            placeholder={t("desc_placeholder")}
            className="w-full bg-slate-900/50 border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)]/50 transition-all text-sm"
          />
        </div>
        <div className="col-span-2 flex gap-2 pt-1">
          <button
            onClick={closeLinkForm}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors border border-white/5"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSaveLink}
            className="flex-1 bg-[var(--theme-primary)] hover:bg-[var(--theme-hover)] text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--theme-primary)]/20"
          >
            {editingLinkId ? <Save size={14} /> : <Plus size={14} />}
            {editingLinkId ? t("update_link_card") : t("add_link_card")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-[#0f172a] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-[85vh] animate-fade-in-down transition-all ring-1 ring-white/5">
        {!isAuthenticated ? (
          <div className="p-12 h-full flex flex-col items-center justify-center text-center space-y-6 bg-slate-900">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-2 border border-white/[0.08] shadow-inner">
              <Lock size={40} className="text-slate-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t("admin_access")}
              </h2>
              <p className="text-slate-400 text-sm">{t("enter_code_msg")}</p>
              {isDefaultCode && (
                <p className="text-emerald-400/90 text-xs mt-3 font-mono bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-md inline-block">
                  {t("default_code")}
                </p>
              )}
            </div>
            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
              <input
                type="password"
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/[0.1] rounded-xl px-4 py-3 text-center text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)]/50 transition-all tracking-widest text-lg"
                placeholder="••••"
                autoFocus
              />
              {authError && (
                <div className="text-red-400 text-sm animate-pulse flex items-center justify-center gap-1">
                  <AlertCircle size={14} /> {authError}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-hover)] text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--theme-primary)]/20"
              >
                {isVerifying ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <LogIn size={18} />
                )}{" "}
                {t("unlock_btn")}
              </button>
            </form>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-sm mt-4 transition-colors"
            >
              {t("cancel")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/50 shrink-0 h-16">
              <div className="flex items-center gap-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield size={20} className="text-emerald-400" />{" "}
                  {t("dashboard_manage")}
                </h2>
                <div className="flex bg-slate-950/50 rounded-lg p-1 border border-white/[0.05]">
                  <button
                    onClick={() => setActiveTab("content")}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === "content"
                        ? "bg-[var(--theme-primary)] text-white shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <LayoutGrid size={14} className="inline mr-1 mb-0.5" />{" "}
                    {t("tab_content")}
                  </button>
                  <button
                    onClick={() => setActiveTab("appearance")}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === "appearance"
                        ? "bg-[var(--theme-primary)] text-white shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ImageIcon size={14} className="inline mr-1 mb-0.5" />{" "}
                    {t("tab_appearance")}
                  </button>
                  <button
                    onClick={() => setActiveTab("data")}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === "data"
                        ? "bg-[var(--theme-primary)] text-white shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Database size={14} className="inline mr-1 mb-0.5" />{" "}
                    {t("tab_data")}
                  </button>
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                      activeTab === "security"
                        ? "bg-[var(--theme-primary)] text-white shadow-md"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <ShieldCheck size={14} className="inline mr-1 mb-0.5" />{" "}
                    {t("tab_security")}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium"
                >
                  <LogOut size={16} />{" "}
                  <span className="hidden sm:inline">{t("logout")}</span>
                </button>
                <div className="w-px h-5 bg-white/[0.1]"></div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex bg-slate-900">
              {activeTab === "content" && (
                <div className="flex w-full h-full animate-fade-in">
                  <div className="w-64 border-r border-white/[0.08] flex flex-col bg-slate-950/30">
                    <div className="p-4 border-b border-white/[0.08] h-14 flex items-center">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {t("sidebar_categories")}
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {categories.map((cat, index) => (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedCategoryId(cat.id)}
                          draggable={!isAnyEditing}
                          onDragStart={(e) => handleDragStartCategory(e, index)}
                          onDragOver={(e) =>
                            handleDragOverCategory(e, index, cat.id)
                          }
                          onDragLeave={handleDragLeaveCategory}
                          onDragEnd={resetDragState}
                          onDrop={(e) => handleDropCategory(e, index, cat.id)}
                          className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                            selectedCategoryId === cat.id
                              ? "bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]"
                              : "text-slate-400 border-transparent hover:bg-white/[0.03] hover:text-[var(--theme-primary)]"
                          } ${
                            draggedCategoryIndex === index
                              ? selectedCategoryId === cat.id
                                ? "opacity-40 border-dashed border-[var(--theme-primary)]"
                                : "opacity-40 border-dashed border-white/20"
                              : ""
                          } ${
                            dragOverCategoryIndex === index &&
                            draggedCategoryIndex !== index
                              ? "bg-[var(--theme-primary)]/20 border-[var(--theme-primary)] shadow-themed-light"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <GripVertical
                              size={14}
                              className={`shrink-0 ${
                                isAnyEditing
                                  ? "text-slate-800 cursor-not-allowed"
                                  : "text-slate-700 group-hover:text-slate-500 cursor-grab active:cursor-grabbing"
                              }`}
                            />
                            {editingCategoryId === cat.id ? (
                              <input
                                autoFocus
                                className="bg-slate-900 border border-[var(--theme-primary)] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-full"
                                value={editCategoryTitle}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  setEditCategoryTitle(e.target.value)
                                }
                                onKeyDown={(e) =>
                                  e.key === "Enter" &&
                                  handleUpdateCategoryTitle(cat.id)
                                }
                                onBlur={() => handleUpdateCategoryTitle(cat.id)}
                              />
                            ) : (
                              <span className="truncate text-sm font-semibold">
                                {cat.title}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategoryId(cat.id);
                                setEditCategoryTitle(cat.title);
                              }}
                              className="p-1 text-slate-500 hover:text-white rounded"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(cat.id, cat.title);
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-white/[0.08] bg-slate-950/50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryTitle}
                          onChange={(e) => setNewCategoryTitle(e.target.value)}
                          placeholder={t("add_category_placeholder")}
                          className="min-w-0 flex-1 bg-slate-900/50 border border-white/[0.1] rounded-md px-2 py-1.5 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)] text-xs"
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddCategory()
                          }
                        />
                        <button
                          onClick={handleAddCategory}
                          className="shrink-0 bg-white/5 border border-white/5 hover:bg-[var(--theme-primary)] text-white px-2 rounded-md transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col bg-slate-900 relative">
                    <div className="px-6 border-b border-white/[0.08] flex items-center gap-4 bg-white/[0.01] h-14 shrink-0 backdrop-blur-md">
                      <div className="relative flex-1 max-w-md">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                        <input
                          type="text"
                          placeholder={t("search_links_placeholder")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-950/50 border border-white/[0.1] rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[var(--theme-primary)] transition-all"
                        />
                      </div>
                      <button
                        onClick={() => setIsAddingSubMenu(!isAddingSubMenu)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${
                          isAddingSubMenu
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {isAddingSubMenu ? (
                          <X size={14} />
                        ) : (
                          <FolderPlus size={14} />
                        )}{" "}
                        {isAddingSubMenu ? t("cancel") : t("add_submenu")}
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                      {isAddingSubMenu && (
                        <div className="mb-6 bg-slate-800/40 border border-white/[0.08] p-4 rounded-xl animate-fade-in-down flex gap-3 items-center">
                          <input
                            autoFocus
                            type="text"
                            placeholder={t("new_submenu_placeholder")}
                            value={newSubMenuTitle}
                            onChange={(e) => setNewSubMenuTitle(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleAddSubMenu()
                            }
                            className="flex-1 bg-slate-900/50 border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-sm"
                          />
                          <button
                            onClick={handleAddSubMenu}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase shadow-lg shadow-emerald-500/20"
                          >
                            {t("add_category_btn")}
                          </button>
                        </div>
                      )}

                      <div className="space-y-6">
                        {categories.find((c) => c.id === selectedCategoryId)
                          ?.subCategories.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-6">
                            <Folder
                              size={48}
                              strokeWidth={1}
                              className="opacity-30"
                            />
                            <p className="text-sm font-medium">
                              {t("no_submenus")}
                            </p>
                            <div className="flex gap-4">
                              <button
                                onClick={() => setIsAddingSubMenu(true)}
                                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-widest border border-white/5 flex items-center gap-2"
                              >
                                <FolderPlus size={14} /> {t("add_submenu")}
                              </button>
                              <button
                                onClick={handleAddLinkDirectly}
                                className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--theme-primary)]/20"
                              >
                                <LinkIcon size={14} /> {t("add_link_directly")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          categories
                            .find((c) => c.id === selectedCategoryId)
                            ?.subCategories.map((sub) => {
                              const filteredItems = sub.items.filter(
                                (item) =>
                                  item.title
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase()) ||
                                  item.url
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase())
                              );
                              if (searchQuery && filteredItems.length === 0)
                                return null;
                              const isCollapsed = collapsedSubMenus.has(sub.id);

                              return (
                                <div
                                  key={sub.id}
                                  className={`
                                  bg-slate-800/40 border rounded-xl overflow-hidden shadow-sm transition-all duration-300
                                  ${
                                    dragOverSubMenuId === sub.id
                                      ? "border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)] bg-[var(--theme-primary)]/5"
                                      : "border-white/[0.08]"
                                  }
                                `}
                                  onDragOver={(e) =>
                                    handleDragOverSubMenu(e, sub.id)
                                  }
                                  onDragLeave={() => setDragOverSubMenuId(null)}
                                  onDrop={(e) =>
                                    handleDropLinkToSubMenu(e, sub.id)
                                  }
                                >
                                  <div
                                    className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors group/header"
                                    onClick={() => toggleSubMenu(sub.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <ChevronDown
                                        size={16}
                                        className={`text-slate-500 transition-transform duration-300 ${
                                          isCollapsed
                                            ? "-rotate-90"
                                            : "rotate-0"
                                        }`}
                                      />
                                      {editingSubMenuId === sub.id ? (
                                        <input
                                          autoFocus
                                          className="bg-slate-900 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                          value={editSubMenuTitle}
                                          onClick={(e) => e.stopPropagation()}
                                          onChange={(e) =>
                                            setEditSubMenuTitle(e.target.value)
                                          }
                                          onKeyDown={(e) =>
                                            e.key === "Enter" &&
                                            handleUpdateSubMenuTitle(sub.id)
                                          }
                                          onBlur={() =>
                                            handleUpdateSubMenuTitle(sub.id)
                                          }
                                        />
                                      ) : (
                                        <h4 className="font-bold text-white/90 text-sm flex items-center gap-2 tracking-tight">
                                          <Folder
                                            size={14}
                                            className="text-[var(--theme-light)]"
                                          />
                                          {sub.title}
                                        </h4>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 opacity-100 sm:opacity-60 sm:group-hover/header:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSubMenuId(sub.id);
                                          setEditSubMenuTitle(sub.title);
                                        }}
                                        className="p-1.5 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-md hover:bg-white/10"
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteSubMenu(
                                            sub.id,
                                            sub.title
                                          );
                                        }}
                                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors bg-white/5 rounded-md hover:bg-white/10"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                      <div className="w-px h-3 bg-white/[0.08] mx-1"></div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openAddLink(sub.id);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${
                                          targetSubMenuId === sub.id &&
                                          !editingLinkId
                                            ? "bg-[var(--theme-primary)] text-white"
                                            : "bg-white/5 text-slate-400 hover:text-white"
                                        }`}
                                      >
                                        <Plus size={12} /> {t("add_new_link")}
                                      </button>
                                    </div>
                                  </div>
                                  {!isCollapsed && (
                                    <div className="animate-fade-in origin-top">
                                      {targetSubMenuId === sub.id &&
                                        renderLinkForm()}
                                      <div className="p-3">
                                        {filteredItems.length === 0 ? (
                                          <div className="p-6 text-center text-slate-600 text-xs italic tracking-wider">
                                            {searchQuery
                                              ? t("no_links_search")
                                              : t("no_links")}
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                            {filteredItems.map(
                                              (item, index) => (
                                                <div
                                                  key={item.id}
                                                  draggable={!isAnyEditing}
                                                  onDragStart={(e) =>
                                                    handleDragStartLink(
                                                      e,
                                                      sub.id,
                                                      index
                                                    )
                                                  }
                                                  onDragEnter={() =>
                                                    handleDragEnterLink(
                                                      sub.id,
                                                      index
                                                    )
                                                  }
                                                  onDragOver={(e) =>
                                                    e.preventDefault()
                                                  }
                                                  onDragEnd={resetDragState}
                                                  onDrop={(e) =>
                                                    handleDropLink(
                                                      e,
                                                      sub.id,
                                                      index
                                                    )
                                                  }
                                                  className={`
                                                group relative flex flex-col items-center justify-center p-3 rounded-xl transition-all border
                                                aspect-[4/3]
                                                ${
                                                  draggedLink?.subId ===
                                                    sub.id &&
                                                  draggedLink?.index === index
                                                    ? "opacity-40 border-dashed border-white/20"
                                                    : "bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10"
                                                }
                                                ${
                                                  dragOverLink?.subId ===
                                                    sub.id &&
                                                  dragOverLink?.index ===
                                                    index &&
                                                  draggedLink?.index !== index
                                                    ? "ring-2 ring-[var(--theme-primary)] bg-[var(--theme-primary)]/10 z-10 scale-105"
                                                    : ""
                                                }
                                              `}
                                                >
                                                  {/* Actions Overlay (Top Right) */}
                                                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditLink(
                                                          sub.id,
                                                          item
                                                        );
                                                      }}
                                                      className="p-1.5 text-slate-400 hover:text-white bg-black/50 hover:bg-[var(--theme-primary)] rounded-md backdrop-blur-sm transition-colors"
                                                      title="Edit"
                                                    >
                                                      <Pencil size={12} />
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteLink(
                                                          sub.id,
                                                          item.id
                                                        );
                                                      }}
                                                      className="p-1.5 text-slate-400 hover:text-red-400 bg-black/50 hover:bg-red-500/20 rounded-md backdrop-blur-sm transition-colors"
                                                      title="Delete"
                                                    >
                                                      <Trash2 size={12} />
                                                    </button>
                                                  </div>

                                                  {/* Drag Handle (Top Left) */}
                                                  <div
                                                    className={`absolute top-2 left-2 text-slate-600 group-hover:text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity ${
                                                      isAnyEditing
                                                        ? "hidden"
                                                        : ""
                                                    }`}
                                                  >
                                                    <GripVertical size={14} />
                                                  </div>

                                                  {/* Icon */}
                                                  <div className="mb-2 w-8 h-8 flex items-center justify-center text-slate-300">
                                                    {renderIcon(item.icon, 24)}
                                                  </div>

                                                  {/* Title */}
                                                  <div className="w-full text-center px-1">
                                                    <div className="text-xs font-medium text-slate-200 truncate">
                                                      {item.title}
                                                    </div>
                                                    {/* Simplified host display */}
                                                    <div className="text-[10px] text-slate-500 truncate opacity-60 mt-0.5">
                                                      {item.url
                                                        ? (() => {
                                                            try {
                                                              return new URL(
                                                                item.url.startsWith(
                                                                  "http"
                                                                )
                                                                  ? item.url
                                                                  : `https://${item.url}`
                                                              ).hostname.replace(
                                                                "www.",
                                                                ""
                                                              );
                                                            } catch {
                                                              return "";
                                                            }
                                                          })()
                                                        : ""}
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "appearance" && (
                <div className="p-8 w-full max-w-2xl mx-auto overflow-y-auto animate-fade-in custom-scrollbar">
                  <div className="bg-slate-800/40 p-8 rounded-2xl border border-white/[0.08] shadow-sm">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-[var(--theme-primary)]/10 rounded-xl text-[var(--theme-light)]">
                        <Sliders size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {t("background_settings")}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {t("background_desc")}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                          {t("bg_url_label")}
                        </label>
                        <input
                          type="text"
                          value={bgInput}
                          onChange={(e) => setBgInput(e.target.value)}
                          placeholder={t("bg_url_placeholder")}
                          className="w-full bg-slate-900/50 border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none focus:border-[var(--theme-primary)] text-sm transition-all"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            {t("label_opacity")}
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">
                            {Math.round(opacityInput * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={opacityInput}
                          onChange={(e) =>
                            setOpacityInput(Number(e.target.value))
                          }
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[var(--theme-primary)]"
                        />
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-white/[0.1] h-36 bg-slate-950/50 flex items-center justify-center relative shadow-inner">
                        {bgInput.startsWith("http") ||
                        bgInput.startsWith("data:") ? (
                          <img
                            src={bgInput}
                            alt="Preview"
                            className="w-full h-full object-cover opacity-60"
                            onError={(e) =>
                              ((e.target as HTMLImageElement).style.display =
                                "none")
                            }
                          />
                        ) : (
                          <div
                            className="w-full h-full opacity-60"
                            style={{ background: bgInput }}
                          ></div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="w-28 h-20 rounded-xl border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl"
                            style={{
                              background: `linear-gradient(135deg, rgba(255, 255, 255, ${opacityInput}), rgba(255, 255, 255, ${
                                opacityInput * 0.4
                              }))`,
                            }}
                          >
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter drop-shadow-md">
                              Preview
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleResetBackground}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5"
                        >
                          <RotateCcw size={16} /> {t("reset_bg_btn")}
                        </button>
                        <button
                          onClick={handleUpdateBackground}
                          className="flex-1 bg-[var(--theme-primary)] hover:bg-[var(--theme-hover)] text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-[var(--theme-primary)]/30"
                        >
                          <Save size={16} /> {t("update_bg_btn")}
                        </button>
                      </div>
                      {bgStatus && (
                        <div className="p-3 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center animate-fade-in tracking-wider">
                          {bgStatus}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "data" && (
                <div className="p-8 w-full max-w-2xl mx-auto overflow-y-auto animate-fade-in custom-scrollbar">
                  <div className="space-y-6">
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6 flex gap-5 items-start">
                      <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                        <Database size={24} />
                      </div>
                      <div>
                        <h3 className="text-blue-400 font-bold tracking-tight mb-1">
                          {t("data_risk_title")}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                          {t("data_risk_desc")}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/[0.08]">
                      <h3 className="text-white font-bold mb-1 tracking-tight">
                        {t("backup_config")}
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">
                        {t("backup_desc")}
                      </p>
                      <button
                        onClick={handleExport}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/[0.08] px-4 py-3 rounded-xl flex items-center justify-center gap-3 transition-all text-xs font-bold uppercase tracking-widest group"
                      >
                        <Download
                          size={18}
                          className="text-blue-400 group-hover:translate-y-0.5 transition-transform"
                        />{" "}
                        {t("download_backup")}
                      </button>
                    </div>
                    <div className="bg-slate-800/40 p-6 rounded-2xl border border-white/[0.08]">
                      <h3 className="text-white font-bold mb-1 tracking-tight">
                        {t("restore_config")}
                      </h3>
                      <p className="text-xs text-slate-500 mb-6">
                        {t("restore_desc")}
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/[0.08] px-4 py-3 rounded-xl flex items-center justify-center gap-3 transition-all text-xs font-bold uppercase tracking-widest group"
                      >
                        <Upload
                          size={18}
                          className="text-emerald-400 group-hover:-translate-y-0.5 transition-transform"
                        />{" "}
                        {t("select_import")}
                      </button>
                      {importStatus.type && (
                        <div
                          className={`mt-4 p-4 rounded-xl text-xs font-bold border flex items-center gap-3 ${
                            importStatus.type === "success"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-red-500/10 border-red-500/20 text-red-400"
                          }`}
                        >
                          <AlertCircle size={18} /> {importStatus.message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "security" && (
                <div className="p-8 w-full max-w-2xl mx-auto overflow-y-auto animate-fade-in custom-scrollbar">
                  <div className="bg-slate-800/40 p-8 rounded-2xl border border-white/[0.08]">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                        <Shield size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {t("access_control")}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {t("access_desc")}
                        </p>
                      </div>
                    </div>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!passwordForm.current) {
                          setPasswordStatus({
                            type: "error",
                            message: t("current_code_err"),
                          });
                          return;
                        }
                        if (passwordForm.new.length < 4) {
                          setPasswordStatus({
                            type: "error",
                            message: t("code_length_err"),
                          });
                          return;
                        }
                        if (passwordForm.new !== passwordForm.confirm) {
                          setPasswordStatus({
                            type: "error",
                            message: t("code_mismatch"),
                          });
                          return;
                        }

                        const success = await storageService.updateAccessCode(
                          passwordForm.current,
                          passwordForm.new
                        );

                        if (success) {
                          setPasswordStatus({
                            type: "success",
                            message: t("code_updated"),
                          });
                          setPasswordForm({
                            current: "",
                            new: "",
                            confirm: "",
                          });
                        } else {
                          setPasswordStatus({
                            type: "error",
                            message: t("current_code_err"),
                          });
                        }
                        setTimeout(
                          () => setPasswordStatus({ type: null, message: "" }),
                          4000
                        );
                      }}
                      className="space-y-5 max-w-sm mx-auto"
                    >
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                          {t("current_code")}
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.current}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              current: e.target.value,
                            })
                          }
                          className="w-full bg-slate-950/50 border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none focus:border-red-500 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                          {t("new_code")}
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.new}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              new: e.target.value,
                            })
                          }
                          className="w-full bg-slate-950/50 border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none focus:border-red-500 transition-all text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                          {t("confirm_code")}
                        </label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.confirm}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              confirm: e.target.value,
                            })
                          }
                          className="w-full bg-slate-950/50 border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-slate-700 focus:outline-none focus:border-red-500 transition-all text-sm"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] font-bold text-slate-500 flex items-center gap-2 hover:text-white transition-colors uppercase tracking-widest"
                        >
                          {showPassword ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}{" "}
                          {showPassword ? t("hide_codes") : t("show_codes")}
                        </button>
                        <button
                          type="submit"
                          className="bg-red-500/80 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all shadow-lg shadow-red-500/20"
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
                          <AlertCircle size={18} />
                          {passwordStatus.message}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
