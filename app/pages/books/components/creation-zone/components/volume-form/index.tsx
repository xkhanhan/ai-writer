"use client";

import { useState } from "react";
import { Button, Input } from "antd";
import { showError, showSuccess, showWarning } from "@/app/utils/error-handler";
import { DeleteOutlined, MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { SaveButton } from "@/shared/ui/save-button";
import type { VolumeOutline } from "@/app/types";
import styles from "./index.module.css";

const { TextArea } = Input;

interface Props {
  volume?: VolumeOutline;
  onSave: (data: { id?: string; title: string; coreConflict?: string; stages?: string[]; highlights?: string }) => Promise<VolumeOutline | null>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<boolean>;
}

export function VolumeForm({ volume, onSave, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(volume?.title ?? "");
  const [coreConflict, setCoreConflict] = useState(volume?.coreConflict ?? "");
  const [stages, setStages] = useState<string[]>(volume?.stages ?? []);
  const [highlights, setHighlights] = useState(volume?.highlights ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      showWarning("请输入卷标题");
      return;
    }
    setSaving(true);
    try {
      await onSave({ id: volume?.id, title, coreConflict, stages, highlights });
      showSuccess(volume ? "卷纲已更新" : "卷纲已创建");
    } catch {
      showError("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!volume?.id || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(volume.id);
      showSuccess("卷纲已删除");
    } catch {
      showError("删除失败");
      setDeleting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{volume ? "编辑卷纲" : "新建卷纲"}</h3>
        <div className={styles.headerRight}>
          {volume?.id && onDelete && (
            <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={handleDelete}>删除</Button>
          )}
          <SaveButton loading={saving} onClick={handleSave} />
        </div>
      </div>

      <div className={styles.formSection}>
        <label className={styles.formLabel}>卷标题</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：第一卷 风起" maxLength={60} showCount />
      </div>

      <div className={styles.formSection}>
        <label className={styles.formLabel}>核心冲突</label>
        <TextArea value={coreConflict} onChange={(e) => setCoreConflict(e.target.value)} rows={3} placeholder="本卷的核心矛盾" maxLength={2000} showCount />
      </div>

      <div className={styles.formSection}>
        <label className={styles.formLabel}>阶段划分</label>
        {stages.map((stage, i) => (
          <div key={i} className={styles.stageRow}>
            <Input value={stage} placeholder={`阶段 ${i + 1}`} maxLength={200} showCount onChange={(e) => {
              const next = [...stages]; next[i] = e.target.value; setStages(next);
            }} />
            <Button icon={<MinusCircleOutlined />} onClick={() => setStages(stages.filter((_, idx) => idx !== i))} />
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={() => setStages([...stages, ""])}>添加阶段</Button>
      </div>

      <div className={styles.formSection}>
        <label className={styles.formLabel}>预计看点</label>
        <Input value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="用逗号分隔多个看点" maxLength={200} showCount />
      </div>

      <Button onClick={onCancel}>返回</Button>
    </div>
  );
}
