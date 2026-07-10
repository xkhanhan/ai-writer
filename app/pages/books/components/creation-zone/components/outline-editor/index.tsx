"use client";

import { useState } from "react";
import { Button, Input } from "antd";
import { showError, showSuccess } from "@/app/utils/error-handler";
import { SaveButton } from "@/shared/ui/save-button";
import type { BookOutline } from "@/app/types";
import styles from "./index.module.css";

const { TextArea } = Input;

interface Props {
  outline: BookOutline | null;
  onSave: (data: { direction: string; stages: string; sellingPoints: string }) => Promise<BookOutline | null>;
  onCancel: () => void;
}

export function OutlineEditor({ outline, onSave, onCancel }: Props) {
  const [direction, setDirection] = useState(outline?.direction ?? "");
  const [stages, setStages] = useState(outline?.stages ?? "");
  const [sellingPoints, setSellingPoints] = useState(outline?.sellingPoints ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ direction, stages, sellingPoints });
      showSuccess("总纲已保存");
    } catch {
      showError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>总纲</h3>
        <SaveButton loading={saving} onClick={handleSave} />
      </div>
      <div className={styles.hintBox}>
        <span className={styles.hintText}>
          总纲保持模糊，随写作推进逐步细化。不需要写细节，只写方向。
        </span>
      </div>
      <div className={styles.formSection}>
        <label className={styles.formLabel}>整体方向</label>
        <TextArea value={direction} onChange={(e) => setDirection(e.target.value)} rows={3} placeholder="故事的大方向" maxLength={2000} showCount />
      </div>
      <div className={styles.formSection}>
        <label className={styles.formLabel}>阶段划分</label>
        <TextArea value={stages} onChange={(e) => setStages(e.target.value)} rows={5} placeholder="每个阶段的大致方向，每行一个阶段" maxLength={10000} showCount />
      </div>
      <div className={styles.formSection}>
        <label className={styles.formLabel}>核心卖点</label>
        <Input value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} placeholder="逗号分隔" maxLength={200} showCount />
      </div>
      <Button onClick={onCancel}>返回</Button>
    </div>
  );
}
