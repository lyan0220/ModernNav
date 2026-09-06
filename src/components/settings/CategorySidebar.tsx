import React from "react";
import { Plus, GripVertical, Pencil, Trash2, X } from "../../utils/icons";
import { Category } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import type { ContentEditorState, ContentEditorActions } from "./useContentEditor";

interface CategorySidebarProps {
  categories: Category[];
  state: ContentEditorState;
  actions: ContentEditorActions;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, state, actions }) => {
  const { t } = useLanguage();
  const {
    selectedCategoryId,
    isAddingCategory,
    newCategoryTitle,
    editingCategoryId,
    editCategoryTitle,
    isAnyEditing,
  } = state;
  const {
    setSelectedCategoryId,
    setIsAddingCategory,
    setNewCategoryTitle,
    setEditingCategoryId,
    setEditCategoryTitle,
    handleAddCategory,
    handleUpdateCategoryTitle,
    handleDeleteCategory,
    closeLinkForm,
    dragHandlers,
  } = actions;
  const {
    draggedCategoryIndex,
    dragOverCategoryIndex,
    handleDragStartCategory,
    handleDragOverCategory,
    handleDragLeaveCategory,
    handleDropCategory,
    resetDragState,
  } = dragHandlers;

  return (
    <div className="w-60 border-r border-default flex flex-col surface-sunken shrink-0">
      <div className="px-4 border-b border-default h-16 flex items-center justify-between shrink-0">
        <h3 className="text-[12px] font-black text-muted uppercase tracking-[0.2em]">
          {t("sidebar_categories")}
        </h3>
        <button
          onClick={() => {
            setIsAddingCategory((v: boolean) => !v);
            setNewCategoryTitle("");
            setEditingCategoryId(null);
          }}
          title={t("add_category_placeholder")}
          className={`p-1.5 rounded-lg transition-colors ${
            isAddingCategory
              ? "bg-[var(--theme-primary)] text-white"
              : "surface-hover text-secondary hover:text-primary hover:surface-active"
          }`}
        >
          {isAddingCategory ? <X size={15} /> : <Plus size={15} />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {isAddingCategory && (
          <div className="flex gap-1.5 p-1.5 mb-1 animate-fade-in-down">
            <input
              autoFocus
              type="text"
              value={newCategoryTitle}
              onChange={(e) => setNewCategoryTitle(e.target.value)}
              placeholder={t("add_category_placeholder")}
              className="input-primary rounded-md px-2 py-1.5 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCategory();
                if (e.key === "Escape") setIsAddingCategory(false);
              }}
            />
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryTitle.trim()}
              className="shrink-0 bg-[var(--theme-primary)] hover:bg-[var(--theme-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 rounded-md transition-colors flex items-center"
              title={t("add_category_btn")}
            >
              <Plus size={16} />
            </button>
          </div>
        )}
        {categories.map((cat, index) => (
          <div
            key={cat.id}
            onClick={() => {
              setSelectedCategoryId(cat.id);
              closeLinkForm();
              actions.setIsAddingSubMenu(false);
              actions.setEditingSubMenuId(null);
              setEditingCategoryId(null);
            }}
            draggable={!isAnyEditing}
            onDragStart={(e) => handleDragStartCategory(e, index)}
            onDragOver={(e) => handleDragOverCategory(e, index, cat.id)}
            onDragLeave={handleDragLeaveCategory}
            onDragEnd={resetDragState}
            onDrop={(e) => handleDropCategory(e, index, cat.id)}
            className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
              selectedCategoryId === cat.id
                ? "bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]"
                : "modal-text-secondary border-transparent hover:surface-hover hover:text-[var(--theme-primary)]"
            } ${
              draggedCategoryIndex === index
                ? "opacity-40 border-dashed border-[var(--theme-primary)]"
                : ""
            } ${
              dragOverCategoryIndex === index && draggedCategoryIndex !== index
                ? "bg-[var(--theme-primary)]/20 border-[var(--theme-primary)] shadow-themed-light"
                : ""
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <GripVertical
                size={14}
                className={`shrink-0 ${
                  isAnyEditing
                    ? "text-muted/50 cursor-not-allowed"
                    : "text-muted group-hover:text-secondary cursor-grab active:cursor-grabbing"
                }`}
              />
              {editingCategoryId === cat.id ? (
                <input
                  autoFocus
                  className="surface-sunken border border-[var(--theme-primary)] rounded px-1.5 py-0.5 text-xs text-primary focus:outline-none w-full"
                  value={editCategoryTitle}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditCategoryTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateCategoryTitle(cat.id)}
                  onBlur={() => handleUpdateCategoryTitle(cat.id)}
                />
              ) : (
                <span className="truncate text-sm font-semibold">{cat.title}</span>
              )}
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategoryId(cat.id);
                  setEditCategoryTitle(cat.title);
                }}
                className="p-1 text-muted hover:text-primary rounded"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCategory(cat.id, cat.title);
                }}
                className="p-1 text-muted hover:text-red-400 rounded"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
