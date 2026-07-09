"use client";

import type { ReactNode } from "react";
import styles from "./index.module.css";

interface PanelProps {
  title: string;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({
  title,
  collapsed = false,
  onToggleCollapse,
  actions,
  children,
  className,
}: PanelProps) {
  return (
    <div
      className={`${styles.panel} ${collapsed ? styles.collapsed : ""} ${className ?? ""}`}
    >
      <div className={styles.panelHeader}>
        {onToggleCollapse && (
          <button
            className={styles.panelCollapseBtn}
            onClick={onToggleCollapse}
            aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            type="button"
          >
            <span className={styles.panelIcon}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d={collapsed ? "M4 2L8 6L4 10" : "M8 2L4 6L8 10"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        )}
        <h3 className={styles.panelTitle}>{title}</h3>
        {actions && <div className={styles.panelActions}>{actions}</div>}
      </div>
      {!collapsed && (
        <div className={styles.panelBody}>{children}</div>
      )}
    </div>
  );
}
