import React from "react";
import { Pencil, Trash2, GripVertical } from "../../utils/icons";
import { LinkItem } from "../../types";
import { SmartIcon } from "../SmartIcon";

interface LinkCardProps {
  item: LinkItem;
  index: number;
  subId: string;
  isAnyEditing: boolean;
  showIconPicker: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onEdit: (subId: string, item: LinkItem) => void;
  onDelete: (subId: string, linkId: string) => void;
  onDragStart: (e: React.DragEvent, subId: string, index: number) => void;
  onDragEnter: (subId: string, index: number) => void;
  onDrop: (e: React.DragEvent, subId: string, index: number) => void;
  onDragEnd: () => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({
  item,
  index,
  subId,
  isAnyEditing,
  showIconPicker,
  isDragging,
  isDragOver,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}) => {
  return (
    <div
      draggable={!isAnyEditing}
      onDragStart={(e) => onDragStart(e, subId, index)}
      onDragEnter={() => onDragEnter(subId, index)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, subId, index)}
      className={`group relative flex flex-col items-center justify-center p-3 rounded-xl transition-all border aspect-[4/3]
        ${isDragging ? "opacity-40 border-dashed border-default" : "surface-hover border-muted hover:surface-active hover:border-default"}
        ${isDragOver ? "ring-2 ring-[var(--theme-primary)] bg-[var(--theme-primary)]/10 z-10 scale-105" : ""}
      `}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(subId, item);
        }}
        className={`absolute top-8 right-1 p-1.5 text-secondary hover:text-white surface-active hover:bg-[var(--theme-primary)] rounded-md backdrop-blur-sm transition-all opacity-0 z-20 ${
          showIconPicker ? "pointer-events-none" : "group-hover:opacity-100"
        }`}
      >
        <Pencil size={12} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(subId, item.id);
        }}
        className={`absolute top-1 right-1 p-1.5 text-secondary hover:text-red-400 surface-active hover:bg-red-500/20 rounded-md backdrop-blur-sm transition-all opacity-0 z-20 ${
          showIconPicker ? "pointer-events-none" : "group-hover:opacity-100"
        }`}
      >
        <Trash2 size={12} />
      </button>
      <div
        className={`absolute top-2 left-2 text-muted group-hover:text-secondary cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity ${
          isAnyEditing ? "hidden" : ""
        }`}
      >
        <GripVertical size={14} />
      </div>
      <div className="mb-2 w-8 h-8 flex items-center justify-center text-secondary">
        <SmartIcon icon={item.icon} size={24} />
      </div>
      <div className="w-full text-center px-1">
        <div className="text-xs font-medium text-primary truncate">{item.title}</div>
        <div className="text-[10px] text-muted truncate opacity-60 mt-0.5">
          {item.url
            ? (() => {
                try {
                  return new URL(
                    item.url.startsWith("http") ? item.url : `https://${item.url}`
                  ).hostname.replace("www.", "");
                } catch {
                  return "";
                }
              })()
            : ""}
        </div>
      </div>
    </div>
  );
};
