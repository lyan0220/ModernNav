import React from "react";
import {
  Plus,
  FolderPlus,
  Folder,
  ChevronDown,
  Pencil,
  Trash2,
  X,
  Link as LinkIcon,
  Search,
} from "../../utils/icons";
import { Category } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { useViewportScale } from "../../hooks/useViewportScale";
import { getIconSize } from "../../utils/favicon";
import { LinkCard } from "./LinkCard";
import { LinkForm } from "./LinkForm";
import type { ContentEditorState, ContentEditorActions } from "./useContentEditor";

interface SubcategoryPanelProps {
  categories: Category[];
  state: ContentEditorState;
  actions: ContentEditorActions;
}

export const SubcategoryPanel: React.FC<SubcategoryPanelProps> = ({
  categories,
  state,
  actions,
}) => {
  const { t } = useLanguage();
  const viewportScale = useViewportScale();
  const s = (n: number) => getIconSize(n, viewportScale);
  const {
    selectedCategoryId,
    searchQuery,
    collapsedSubMenus,
    isAddingSubMenu,
    newSubMenuTitle,
    editingSubMenuId,
    editSubMenuTitle,
    targetSubMenuId,
    editingLinkId,
    isAnyEditing,
    showIconPicker,
  } = state;
  const {
    setSearchQuery,
    setIsAddingSubMenu,
    setNewSubMenuTitle,
    setEditingSubMenuId,
    setEditSubMenuTitle,
    handleAddSubMenu,
    handleAddLinkDirectly,
    handleDeleteSubMenu,
    handleUpdateSubMenuTitle,
    toggleSubMenu,
    openAddLink,
    openEditLink,
    handleDeleteLink,
    closeLinkForm,
    dragHandlers,
  } = actions;

  const {
    draggedLink,
    dragOverLink,
    dragOverSubMenuId,
    handleDragStartLink,
    handleDragEnterLink,
    handleDragOverSubMenu,
    handleDragLeaveSubMenu,
    handleDropLinkToSubMenu,
    handleDropLink,
    resetDragState,
  } = dragHandlers;

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="flex-1 flex flex-col surface-elevated relative min-w-0">
      {/* Toolbar */}
      <div className="px-6 border-b border-default flex items-center gap-4 h-16 shrink-0 surface-sunken">
        <div className="relative flex-1 max-w-mxl">
          <Search size={s(14)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={t("search_links_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-primary rounded-full pl-9 pr-4 py-1.5 text-xs"
          />
        </div>
        <button
          onClick={() => {
            if (!isAddingSubMenu) {
              closeLinkForm();
              actions.setEditingSubMenuId(null);
              actions.setEditingCategoryId(null);
            }
            setIsAddingSubMenu(!isAddingSubMenu);
          }}
          className={`flex items-center justify-center gap-2 min-w-[8.5rem] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${
            isAddingSubMenu
              ? "surface-hover border-transparent text-secondary hover:surface-active hover:text-primary"
              : "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white hover:bg-[var(--theme-hover)] hover:border-[var(--theme-hover)]"
          }`}
        >
          {isAddingSubMenu ? <X size={s(14)} /> : <FolderPlus size={s(14)} />}{" "}
          {isAddingSubMenu ? t("cancel") : t("add_submenu")}
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isAddingSubMenu && (
          <div className="mb-6 surface-sunken border border-default p-4 rounded-xl animate-fade-in-down flex gap-3 items-center">
            <input
              autoFocus
              type="text"
              placeholder={t("new_submenu_placeholder")}
              value={newSubMenuTitle}
              onChange={(e) => setNewSubMenuTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSubMenu();
                if (e.key === "Escape") setIsAddingSubMenu(false);
              }}
              className="input-primary"
            />
            <button
              onClick={handleAddSubMenu}
              disabled={!newSubMenuTitle.trim()}
              className="shrink-0 bg-[var(--theme-primary)] hover:bg-[var(--theme-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors"
            >
              {t("add_category_btn")}
            </button>
          </div>
        )}

        <div className="space-y-6">
          {selectedCategory?.subCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted space-y-6">
              <Folder size={s(48)} strokeWidth={1} className="opacity-30" />
              <p className="text-sm font-medium">{t("no_submenus")}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsAddingSubMenu(true)}
                  className="px-4 py-2 rounded-lg bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--theme-primary)]/20 transition-colors flex items-center gap-2"
                >
                  <FolderPlus size={s(14)} /> {t("add_submenu")}
                </button>
                <button
                  onClick={handleAddLinkDirectly}
                  className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] hover:bg-[var(--theme-hover)] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[var(--theme-primary)]/20 transition-colors"
                >
                  <LinkIcon size={14} /> {t("add_link_directly")}
                </button>
              </div>
            </div>
          ) : (
            selectedCategory?.subCategories.map((sub) => {
              const filteredItems = sub.items.filter(
                (item) =>
                  item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.url.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (searchQuery && filteredItems.length === 0) return null;
              const isCollapsed = collapsedSubMenus.has(sub.id);

              return (
                <div
                  key={sub.id}
                  className={`rounded-xl overflow-hidden transition-all duration-300 border ${
                    dragOverSubMenuId === sub.id
                      ? "border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)] bg-[var(--theme-primary)]/5"
                      : "border-default"
                  }`}
                  onDragOver={(e) => handleDragOverSubMenu(e, sub.id)}
                  onDragLeave={handleDragLeaveSubMenu}
                  onDrop={(e) => handleDropLinkToSubMenu(e, sub.id)}
                >
                  {/* Subcategory header */}
                  <div
                    className="flex items-center justify-between p-4 surface-sunken cursor-pointer hover:surface-hover transition-colors group/header"
                    onClick={() => toggleSubMenu(sub.id)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown
                        size={16}
                        className={`text-muted transition-transform duration-300 ${
                          isCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                      {editingSubMenuId === sub.id ? (
                        <input
                          autoFocus
                          className="surface-sunken border border-default rounded px-2 py-1 text-sm text-primary focus:outline-none"
                          value={editSubMenuTitle}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditSubMenuTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateSubMenuTitle(sub.id)}
                          onBlur={() => handleUpdateSubMenuTitle(sub.id)}
                        />
                      ) : (
                        <h4 className="font-bold text-primary text-sm flex items-center gap-2 tracking-tight">
                          <Folder size={14} className="text-[var(--theme-light)]" />
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
                        className="p-1.5 text-muted hover:text-primary transition-colors surface-hover rounded-md hover:surface-active"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubMenu(sub.id, sub.title);
                        }}
                        className="p-1.5 text-muted hover:text-red-400 transition-colors surface-hover rounded-md hover:surface-active"
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className="w-px h-3 bg-[var(--border)] mx-1"></div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddLink(sub.id);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${
                          targetSubMenuId === sub.id && !editingLinkId
                            ? "bg-[var(--theme-primary)] text-white"
                            : "surface-hover text-secondary hover:text-primary"
                        }`}
                      >
                        <Plus size={12} /> {t("add_new_link")}
                      </button>
                    </div>
                  </div>
                  {/* Expanded content */}
                  {!isCollapsed && (
                    <div className="animate-fade-in origin-top">
                      {targetSubMenuId === sub.id && <LinkForm state={state} actions={actions} />}
                      <div className="p-3">
                        {filteredItems.length === 0 ? (
                          <div className="p-6 text-center text-muted text-xs italic tracking-wider">
                            {searchQuery ? t("no_links_search") : t("no_links")}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {filteredItems.map((item, index) => (
                              <LinkCard
                                key={item.id}
                                item={item}
                                index={index}
                                subId={sub.id}
                                isAnyEditing={isAnyEditing}
                                showIconPicker={showIconPicker}
                                isDragging={
                                  draggedLink?.subId === sub.id && draggedLink?.index === index
                                }
                                isDragOver={
                                  dragOverLink?.subId === sub.id &&
                                  dragOverLink?.index === index &&
                                  draggedLink?.index !== index
                                }
                                onEdit={openEditLink}
                                onDelete={handleDeleteLink}
                                onDragStart={handleDragStartLink}
                                onDragEnter={(sId, idx) => handleDragEnterLink(sId, idx)}
                                onDrop={handleDropLink}
                                onDragEnd={resetDragState}
                              />
                            ))}
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
  );
};
