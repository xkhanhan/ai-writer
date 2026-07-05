"use client";

import { useState } from "react";
import { Button, Input, Modal, Select, Tag } from "antd";
import { AppstoreOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { SplitPanel } from "@/shared/ui/split-panel";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { Book, WorldRule } from "@/app/types";
import styles from "./index.module.css";

interface WorldRulesProps {
  book: Book;
}

const levelOptions = [
  { label: "核心", value: "core" },
  { label: "重要", value: "important" },
  { label: "一般", value: "general" },
];

const levelLabels: Record<WorldRule["level"], string> = {
  core: "核心",
  important: "重要",
  general: "一般",
};

export default function WorldRules({ book }: WorldRulesProps) {
  const [rules, setRules] = useState<WorldRule[]>([]);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);

  // Modal 状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingRule, setEditingRule] = useState<WorldRule | null>(null);

  // 表单字段
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState<WorldRule["level"]>("general");
  const [formContent, setFormContent] = useState("");

  const activeRule = rules.find((r) => r.id === activeRuleId) ?? null;

  const resetForm = () => {
    setFormName("");
    setFormLevel("general");
    setFormContent("");
  };

  const openCreate = () => {
    resetForm();
    setModalMode("create");
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEdit = (rule: WorldRule) => {
    setFormName(rule.name);
    setFormLevel(rule.level);
    setFormContent(rule.content);
    setModalMode("edit");
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    if (modalMode === "create") {
      const newRule: WorldRule = {
        id: `wr_${Date.now()}`,
        bookId: book.id,
        name: formName.trim(),
        level: formLevel,
        content: formContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRules((prev) => [...prev, newRule]);
      setActiveRuleId(newRule.id);
    } else if (editingRule) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRule.id
            ? { ...r, name: formName.trim(), level: formLevel, content: formContent, updatedAt: new Date().toISOString() }
            : r
        )
      );
    }

    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (rule: WorldRule) => {
    confirmDelete(rule.name, () => {
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      if (activeRuleId === rule.id) setActiveRuleId(null);
    });
  };

  // 左侧列表
  const leftPanel = rules.length === 0 ? (
    <div className={styles.leftEmpty}>
      <EmptyState
        icon={<AppstoreOutlined />}
        title="还没有世界规则"
        description="定义你的世界观规则，辅助 AI 生成"
        action={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建规则</Button>}
      />
    </div>
  ) : (
    <div className={styles.ruleList}>
      <div className={styles.listToolbar}>
        <span className={styles.ruleCount}>{rules.length} 条规则</span>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>新建</Button>
      </div>
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`${styles.ruleItem} ${activeRuleId === rule.id ? styles.ruleItemActive : ""}`}
          onClick={() => setActiveRuleId(rule.id === activeRuleId ? null : rule.id)}
        >
          <div className={styles.ruleItemBody}>
            <span className={styles.ruleName}>{rule.name}</span>
            <div className={styles.ruleItemMeta}>
              <Tag
                color={rule.level === "core" ? "green" : rule.level === "important" ? "orange" : undefined}
                style={{ margin: 0 }}
              >
                {levelLabels[rule.level]}
              </Tag>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // 右侧详情
  const rightPanel = activeRule ? (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div className={styles.detailTitleRow}>
          <h3 className={styles.detailTitle}>{activeRule.name}</h3>
          <Tag
            color={activeRule.level === "core" ? "green" : activeRule.level === "important" ? "orange" : undefined}
          >
            {levelLabels[activeRule.level]}
          </Tag>
        </div>
        <span className={styles.detailTime}>创建于 {new Date(activeRule.createdAt).toLocaleString("zh-CN")}</span>
        <div className={styles.detailActions}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(activeRule)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(activeRule)}>删除</Button>
        </div>
      </div>
      <div className={styles.detailContent}>
        {activeRule.content ? (
          <p className={styles.detailText}>{activeRule.content}</p>
        ) : (
          <p className={styles.detailEmpty}>暂无内容</p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <SplitPanel
        left={leftPanel}
        right={rightPanel}
        leftWidth={280}
        emptyHint="选择一条规则查看详情"
      />

      {/* 新建/编辑弹窗 */}
      <Modal
        title={modalMode === "create" ? "新建规则" : "编辑规则"}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); resetForm(); }}
        onOk={handleSave}
        okButtonProps={{ disabled: !formName.trim() }}
        okText="保存"
        cancelText="取消"
        width={560}
        destroyOnClose
      >
        <div className={styles.modalForm}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>规则名称</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="输入规则名称"
              maxLength={60}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>规则等级</label>
            <Select
              value={formLevel}
              onChange={(v) => setFormLevel(v)}
              options={levelOptions}
              style={{ width: "100%" }}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>规则内容</label>
            <Input.TextArea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="描述这条世界规则的具体内容"
              rows={6}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
