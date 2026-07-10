"use client";

import React from "react";
import { Checkbox } from "antd";
import styles from "./index.module.css";

interface ReviewSectionProps<T> {
  /** Section title (e.g. "提取的事实 (3条)") */
  title: string;
  /** Icon element rendered next to the title */
  icon: React.ReactNode;
  /** Array of items to render */
  items: T[];
  /** Boolean array of checked states, parallel to items */
  selected: boolean[];
  /** Callback when an item is toggled */
  onToggle: (index: number) => void;
  /** Custom render for the item label content */
  renderItem: (item: T, index: number) => React.ReactNode;
}

/**
 * Generic checkbox list section used by the AI review result panel.
 * Renders a section header with icon/title, then a list of checkbox items.
 */
export function ReviewSection<T>({
  title,
  icon,
  items,
  selected,
  onToggle,
  renderItem,
}: ReviewSectionProps<T>) {
  if (items.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        {icon}
        <span>{title} ({items.length}条)</span>
      </div>
      {items.map((item, idx) => (
        <label
          key={idx}
          className={styles.checkItem}
          role="checkbox"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              onToggle(idx);
            }
          }}
        >
          <Checkbox
            checked={selected[idx]}
            onChange={() => onToggle(idx)}
          />
          <span className={styles.checkLabel}>
            {renderItem(item, idx)}
          </span>
        </label>
      ))}
    </div>
  );
}
