"use client";

import type { ReactNode } from "react";
import styles from "./index.module.css";

interface PanelContainerProps {
  children: ReactNode;
  className?: string;
}

export function PanelContainer({ children, className }: PanelContainerProps) {
  return (
    <div className={`${styles.panelContainer} ${className ?? ""}`}>
      {children}
    </div>
  );
}
