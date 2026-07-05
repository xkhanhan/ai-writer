"use client";

import type { ReactNode } from "react";
import styles from "./index.module.css";

interface SplitPanelProps {
  /** 左侧面板内容 */
  left: ReactNode;
  /** 右侧面板内容，null 时显示空状态 */
  right: ReactNode | null;
  /** 左侧宽度，默认 280px */
  leftWidth?: number;
  /** 右侧空状态提示 */
  emptyHint?: string;
}

export function SplitPanel({
  left,
  right,
  leftWidth = 280,
  emptyHint = "选择一项查看详情",
}: SplitPanelProps) {
  return (
    <div className={styles.splitPanel}>
      <div className={styles.leftPanel} style={{ width: leftWidth, minWidth: leftWidth }}>
        {left}
      </div>
      <div className={styles.rightPanel}>
        {right ?? (
          <div className={styles.emptyRight}>
            <span className={styles.emptyHint}>{emptyHint}</span>
          </div>
        )}
      </div>
    </div>
  );
}
