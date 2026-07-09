"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Spin } from "antd";
import styles from "./index.module.css";

interface SplitPanelProps {
  /** 左侧面板内容 */
  left: ReactNode;
  /** 右侧面板内容，null 时显示 emptyState */
  right: ReactNode | null;
  /** 是否显示左侧面板，默认 true */
  showLeftPanel?: boolean;
  /** 左侧初始宽度，默认 280 */
  leftWidth?: number;
  /** 左侧最小宽度，默认 200 */
  leftMinWidth?: number;
  /** 左侧最大宽度，默认 500 */
  leftMaxWidth?: number;
  /** 是否可拖拽调整宽度，默认 false */
  resizable?: boolean;
  /** 左侧面板头部 slot */
  leftHeader?: ReactNode;
  /** 右侧面板头部 slot */
  rightHeader?: ReactNode;
  /** 右侧空状态内容（传 null 时使用默认空状态） */
  emptyState?: ReactNode;
  /** 右侧空状态文字提示（emptyState 优先） */
  emptyHint?: string;
  /** 加载状态，显示 Spin */
  loading?: boolean;
  /** 右侧面板 CSS 类名覆盖 */
  className?: string;
}

export function SplitPanel({
  left,
  right,
  showLeftPanel = true,
  leftWidth: initialLeftWidth = 280,
  leftMinWidth = 200,
  leftMaxWidth = 500,
  resizable = false,
  leftHeader,
  rightHeader,
  emptyState,
  emptyHint = "选择一项查看详情",
  loading = false,
  className,
}: SplitPanelProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!resizable) return;
      e.preventDefault();
      setIsDragging(true);
      const startX = e.clientX;
      const startWidth = leftWidth;

      const handleDragMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const newWidth = Math.min(
          leftMaxWidth,
          Math.max(leftMinWidth, startWidth + delta)
        );
        setLeftWidth(newWidth);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", handleDragMove);
      document.addEventListener("pointerup", handleDragEnd);

      cleanupRef.current = () => {
        document.removeEventListener("pointermove", handleDragMove);
        document.removeEventListener("pointerup", handleDragEnd);
      };
    },
    [resizable, leftWidth, leftMinWidth, leftMaxWidth, handleDragEnd]
  );

  if (loading) {
    return (
      <div className={styles.splitPanelLoading}>
        <Spin />
      </div>
    );
  }

  const renderEmpty = () => {
    if (emptyState) return emptyState;
    return (
      <div className={styles.emptyRight}>
        <span className={styles.emptyHint}>{emptyHint}</span>
      </div>
    );
  };

  return (
    <div
      className={`${styles.splitPanel} ${isDragging ? styles.dragging : ""}`}
    >
      {showLeftPanel && (
        <>
          <div
            className={styles.leftPanel}
            style={{ width: leftWidth, minWidth: leftWidth }}
          >
            {leftHeader && (
              <div className={styles.panelHeader}>{leftHeader}</div>
            )}
            <div className={styles.panelBody}>{left}</div>
          </div>
          {resizable && (
            <div
              className={styles.resizeHandle}
              onPointerDown={handleDragStart}
            />
          )}
        </>
      )}
      <div className={`${styles.rightPanel} ${className ?? ""}`}>
        {rightHeader && (
          <div className={styles.panelHeader}>{rightHeader}</div>
        )}
        <div className={styles.panelBody}>
          {right ?? renderEmpty()}
        </div>
      </div>
    </div>
  );
}
