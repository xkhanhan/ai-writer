"use client";

import React, { useCallback } from "react";
import { Modal, Button } from "antd";
import type { ButtonProps } from "antd";
import styles from "./index.module.css";

export interface BaseModalProps {
  open: boolean;
  title: string;
  onCancel: () => void;
  onOk?: () => void | Promise<void>;
  okText?: string;
  cancelText?: string;
  okButtonProps?: ButtonProps;
  confirmLoading?: boolean;
  width?: number;
  destroyOnClose?: boolean;
  footer?: React.ReactNode | null;
  closable?: boolean;
  maskClosable?: boolean;
  children: React.ReactNode;
}

/**
 * BaseModal — 通用基础弹窗模板
 *
 * 三层固定布局：标题栏 / 可滚动内容区 / 固定底部操作栏
 * 所有编辑/创建类弹窗（删除确认除外）必须基于此组件封装。
 */
export default function BaseModal({
  open,
  title,
  onCancel,
  onOk,
  okText = "确认",
  cancelText = "取消",
  okButtonProps,
  confirmLoading,
  width = 600,
  destroyOnClose = true,
  footer,
  closable = false,
  maskClosable = false,
  children,
}: BaseModalProps) {
  const handleOk = useCallback(async () => {
    if (onOk) {
      await onOk();
    }
  }, [onOk]);

  const defaultFooter = (
    <div className={styles.modalFooter}>
      <Button onClick={onCancel}>{cancelText}</Button>
      <Button
        type="primary"
        disabled={okButtonProps?.disabled}
        loading={confirmLoading}
        onClick={handleOk}
      >
        {okText}
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      title={title}
      width={width}
      destroyOnClose={destroyOnClose}
      closable={closable}
      maskClosable={maskClosable}
      keyboard={closable}
      onCancel={onCancel}
      footer={footer === undefined ? defaultFooter : footer}
      classNames={{
        container: styles.modalContent,
        body: styles.modalBody,
      }}
    >
      {children}
    </Modal>
  );
}
