"use client";

import React, { useState } from "react";
import { PlusOutlined, CloseOutlined } from "@ant-design/icons";
import styles from "./index.module.css";

interface ArrayInputProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  maxItems?: number;
}

export function ArrayInput({ value = [], onChange, placeholder, maxItems }: ArrayInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (maxItems && value.length >= maxItems) return;
    onChange?.([...value, trimmed]);
    setInputValue("");
  };

  const handleRemove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange?.(next);
  };

  return (
    <div className={styles.container}>
      <div className={styles.tags}>
        {value.map((item, index) => (
          <span key={index} className={styles.tag}>
            {item}
            <CloseOutlined className={styles.tagClose} onClick={() => handleRemove(index)} />
          </span>
        ))}
      </div>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={placeholder || "输入后回车添加"}
        />
        <button className={styles.addButton} onClick={handleAdd} type="button">
          <PlusOutlined />
        </button>
      </div>
    </div>
  );
}
