"use client";

import React from "react";
import { Dropdown, type MenuProps } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

export interface AiDropdownMenuItem {
  key: string;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

interface AiDropdownProps {
  items: AiDropdownMenuItem[];
  disabled?: boolean;
}

export function AiDropdown({ items, disabled }: AiDropdownProps) {
  const menuItems: MenuProps["items"] = items.map((item) => ({
    key: item.key,
    label: (
      <span className={item.disabled ? styles.menuItemDisabled : styles.menuItem}>
        {item.label}
      </span>
    ),
    disabled: item.disabled,
    onClick: item.onClick,
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={["click"]} disabled={disabled}>
      <button className={styles.trigger} aria-label="AI 功能">
        <ThunderboltOutlined />
        <span>AI</span>
        <span className={styles.arrow}>▾</span>
      </button>
    </Dropdown>
  );
}
