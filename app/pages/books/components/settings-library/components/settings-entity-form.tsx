"use client";

import { Form, Input, Select } from "antd";
import { InfoCircleOutlined, BulbOutlined } from "@ant-design/icons";
import type { SettingCategory } from "@/app/types";
import {
  STATUS_FIELD_TEMPLATES,
  CATEGORY_FIELD_TEMPLATES,
} from "@/app/types";
import { INFO_FIELDS, CAT_META } from "@/app/constants/settings";
import { TagSelector } from "@/shared/ui/tag-selector";
import type { FormInstance } from "antd";
import styles from "./settings-entity-form.module.css";

interface SettingsEntityFormProps {
  form: FormInstance;
  modalCat: SettingCategory;
  bookId: string;
}

export default function SettingsEntityForm({
  form,
  modalCat,
  bookId,
}: SettingsEntityFormProps) {
  const catLabel = CAT_META[modalCat]?.label ?? "设定";
  const statusFieldsList = STATUS_FIELD_TEMPLATES[modalCat] ?? [];
  const catFieldsList = CATEGORY_FIELD_TEMPLATES[modalCat] ?? [];

  return (
    <Form form={form} layout="vertical" initialValues={{ level: "general" }}>
      {/* 基础信息 */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <InfoCircleOutlined style={{ fontSize: 13, color: "var(--text-secondary)" }} />
          基础信息
        </div>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input placeholder="输入设定实体名称" maxLength={60} showCount />
        </Form.Item>
        <Form.Item name="level" label="级别">
          <Select
            placeholder="选择级别"
            options={[
              { value: "core", label: "核心" },
              { value: "important", label: "重要" },
              { value: "general", label: "一般" },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="tagIds"
          label="标签"
          rules={[{
            validator: async (_, value: string[]) => {
              if (value && value.length > 10) {
                throw new Error("最多选择 10 个标签");
              }
            },
          }]}
        >
          <TagSelector bookId={bookId} placeholder="选择关联标签" />
        </Form.Item>
      </div>

      <div className={styles.formDivider} />

      {/* 设定信息（6 个通用文本字段） */}
      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <BulbOutlined style={{ fontSize: 13, color: "var(--text-secondary)" }} />
          设定信息
        </div>
        {INFO_FIELDS.map((f) => (
          <Form.Item key={f.key} name={f.key} label={f.label}>
            <Input.TextArea
              rows={2}
              placeholder={`填写${f.label}...`}
              maxLength={f.key === "description" ? 2000 : 1000}
              showCount
            />
          </Form.Item>
        ))}
      </div>

      {/* 分类专属字段 */}
      {catFieldsList.length > 0 && (
        <>
          <div className={styles.formDivider} />
          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>
              <InfoCircleOutlined style={{ fontSize: 13, color: "var(--text-secondary)" }} />
              {catLabel}专属
            </div>
            {catFieldsList.map((f) => (
              <Form.Item key={f} name={f} label={f}>
                <Input.TextArea
                  rows={2}
                  placeholder={`填写${f}...`}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            ))}
          </div>
        </>
      )}

      {/* 初始状态 */}
      {statusFieldsList.length > 0 && (
        <>
          <div className={styles.formDivider} />
          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>
              <InfoCircleOutlined style={{ fontSize: 13, color: "var(--text-secondary)" }} />
              初始状态
              <span className={styles.formSectionHint}>
                （可留空，后续系统自动更新）
              </span>
            </div>
            {statusFieldsList.map((f) => (
              <Form.Item key={f} name={f} label={f}>
                <Input placeholder={`填写${f}（可留空）`} maxLength={200} />
              </Form.Item>
            ))}
          </div>
        </>
      )}
    </Form>
  );
}
