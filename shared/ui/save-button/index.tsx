"use client";

import React from "react";
import { SaveOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

interface SaveButtonProps {
  onClick?: () => void;
  loading?: boolean;
}

export function SaveButton({ onClick, loading }: SaveButtonProps) {
  return (
    <button className={styles.button} onClick={onClick} disabled={loading}>
      <SaveOutlined />
      <span>{loading ? "保存中…" : "保存"}</span>
    </button>
  );
}
