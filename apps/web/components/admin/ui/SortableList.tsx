"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

interface SortableListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  /** Accessible name of each item, used in "Move X up" labels. */
  getLabel: (item: T) => string;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
}

/**
 * Drag-and-drop list (rancangan §11: "⋮⋮ = drag untuk urutkan").
 * Mouse: drag the grip. Keyboard / touch: the up/down buttons do the same.
 */
export function SortableList<T>({ items, getKey, onReorder, renderItem, getLabel, disabled, className, itemClassName }: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Only the grip starts a drag, so text inputs inside an item stay selectable.
  const [armed, setArmed] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onReorder(next);
    setAnnouncement(`${getLabel(moved!)} moved to position ${to + 1} of ${items.length}.`);
  };

  return (
    <>
      <ul className={cn("flex flex-col", className)}>
        {items.map((item, i) => (
          <li
            key={getKey(item)}
            draggable={!disabled && armed === i}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
              setArmed(null);
            }}
            className={cn(
              "group relative flex items-center gap-2 transition-[opacity,background-color] duration-150",
              dragIndex === i && "opacity-40",
              overIndex === i && dragIndex !== null && dragIndex !== i && "bg-surface-2",
              itemClassName,
            )}
          >
            {!disabled && (
              <span className="flex shrink-0 items-center">
                <span
                  className="grid size-7 cursor-grab place-items-center text-text-subtle active:cursor-grabbing"
                  aria-hidden="true"
                  title="Drag to reorder"
                  onPointerDown={() => setArmed(i)}
                  onPointerUp={() => setArmed(null)}
                >
                  <Icon name="grip" size={16} />
                </span>
                <span className="flex flex-col">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${getLabel(item)} up`} className="grid h-4 w-5 place-items-center text-text-subtle hover:text-text disabled:opacity-25">
                    <Icon name="chevron-up" size={13} />
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={`Move ${getLabel(item)} down`} className="grid h-4 w-5 place-items-center text-text-subtle hover:text-text disabled:opacity-25">
                    <Icon name="chevron-down" size={13} />
                  </button>
                </span>
              </span>
            )}
            <div className="min-w-0 flex-1">{renderItem(item, i)}</div>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
