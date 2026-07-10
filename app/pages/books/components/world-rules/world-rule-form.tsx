"use client";

import { Input } from "antd";
import styles from "./world-rule-form.module.css";

interface WorldRuleFormProps {
  formName: string;
  formContent: string;
  onNameChange: (name: string) => void;
  onContentChange: (content: string) => void;
}

export default function WorldRuleForm({
  formName,
  formContent,
  onNameChange,
  onContentChange,
}: WorldRuleFormProps) {
  return (
    <div className={styles.modalForm}>
      <div className={styles.formField}>
        <label className={styles.formLabel}>
          <span className={styles.required}>*</span> 规则名称
        </label>
        <Input
          value={formName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="输入规则名称"
          maxLength={60}
          showCount
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>
          <span className={styles.required}>*</span> 规则内容
        </label>
        <Input.TextArea
          value={formContent}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="描述这条世界规则的具体内容"
          rows={6}
          maxLength={300}
          showCount
        />
      </div>
    </div>
  );
}
