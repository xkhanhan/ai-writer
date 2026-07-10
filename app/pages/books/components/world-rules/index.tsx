"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Tag } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import BaseModal from "@/shared/ui/base-modal";
import { AiSceneModal } from "@/shared/ui/ai-scene-modal";
import { getWorldRuleScenes } from "../../config/ai-scenes";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type {
  Book,
  WorldRule,
  WorldRuleCategory,
  CreateWorldRuleDTO,
} from "@/app/types";
import {
  fetchWorldRules,
  createWorldRule,
  updateWorldRule,
  deleteWorldRule,
} from "../../api/world-rules";
import { showError, showSuccess } from "@/app/utils/error-handler";
import WorldRuleList from "./world-rule-list";
import WorldRuleDetail from "./world-rule-detail";
import WorldRuleForm from "./world-rule-form";
import { CATEGORY_META } from "./constants";
import styles from "./index.module.css";

interface WorldRulesProps {
  book: Book;
  activeId?: string;
  onActiveChange?: (id: string) => void;
}

export default function WorldRules({
  book,
  activeId,
  onActiveChange,
}: WorldRulesProps) {
  const [rules, setRules] = useState<WorldRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [collapsed, setCollapsed] = useState<
    Record<WorldRuleCategory, boolean>
  >({ global: false, writing: false, setting: false });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalCategory, setModalCategory] =
    useState<WorldRuleCategory>("global");
  const [editingRule, setEditingRule] = useState<WorldRule | null>(null);

  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");

  const [aiOpen, setAiOpen] = useState(false);

  const activeRule = rules.find((r) => r.id === activeId) ?? null;
  const totalRules = rules.length;

  // ============ 数据加载 ============

  const loadRules = useCallback(async () => {
    setLoading(true);
    const result = await fetchWorldRules(book.id);
    if (result.ok) setRules(result.data);
    setLoading(false);
  }, [book.id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load is safe
  useEffect(() => { void loadRules(); }, [loadRules]);

  useEffect(() => {
    if (loading || rules.length === 0) return;
    if (!activeId || !rules.some((r) => r.id === activeId)) {
      onActiveChange?.(rules[0].id);
    }
  }, [loading, rules, activeId, onActiveChange]);

  // ============ 表单操作 ============

  const resetForm = () => {
    setFormName("");
    setFormContent("");
  };

  const openCreate = (category: WorldRuleCategory) => {
    resetForm();
    setModalMode("create");
    setModalCategory(category);
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEdit = (rule: WorldRule) => {
    setFormName(rule.name);
    setFormContent(rule.content);
    setModalMode("edit");
    setModalCategory(rule.category);
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;

    if (modalMode === "create") {
      const dto: CreateWorldRuleDTO = {
        category: modalCategory,
        name: formName.trim(),
        content: formContent,
      };
      const result = await createWorldRule(book.id, dto);
      if (!result.ok) {
        showError(result.error || "创建失败");
        return;
      }
      setRules((prev) => [...prev, result.data]);
      onActiveChange?.(result.data.id);
    } else if (editingRule) {
      const result = await updateWorldRule(editingRule.id, {
        name: formName.trim(),
        content: formContent,
      });
      if (result.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === result.data.id ? result.data : r))
        );
      } else {
        showError(result.error || "保存失败");
        return;
      }
    }

    showSuccess(modalMode === "create" ? "创建成功" : "保存成功");
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (rule: WorldRule) => {
    if (rule.isFixed) return;
    confirmDelete(rule.name, async () => {
      const result = await deleteWorldRule(rule.id);
      if (result.ok) {
        setRules((prev) => prev.filter((r) => r.id !== rule.id));
        showSuccess("删除成功");
      } else {
        showError(result.error || "删除失败");
      }
    });
  };

  const handleSelectRule = (id: string) => {
    onActiveChange?.(id === activeId ? "" : id);
  };

  const handleAiSave = async (
    rulesByCategory: Record<string, { name: string; content: string }[]>
  ) => {
    const cats: WorldRuleCategory[] = ["global", "writing", "setting"];
    let savedCount = 0;
    for (const cat of cats) {
      const catRules = rulesByCategory[cat];
      if (!Array.isArray(catRules)) continue;
      for (const rule of catRules) {
        const result = await createWorldRule(book.id, {
          category: cat,
          name: rule.name,
          content: rule.content,
        });
        if (result.ok) savedCount++;
      }
    }
    if (savedCount === 0) throw new Error("未成功保存任何规则");
  };

  // ============ 渲染 ============

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          <Panel
            title="世界规则"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
            actions={
              <span className={styles.ruleCount}>{totalRules}</span>
            }
          >
            <WorldRuleList
              rules={rules}
              loading={loading}
              activeId={activeId}
              collapsed={collapsed}
              onToggleCategory={(cat) =>
                setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
              }
              onSelectRule={handleSelectRule}
              onOpenCreate={openCreate}
              onOpenAi={() => setAiOpen(true)}
            />
          </Panel>

          <Divider />

          <Panel
            title={activeRule ? activeRule.name : "世界规则"}
            defaultSize={600}
            minSize={400}
            actions={
              activeRule ? (
                <>
                  <Tag color={CATEGORY_META[activeRule.category].tagColor}>
                    {CATEGORY_META[activeRule.category].label}
                  </Tag>
                  {activeRule.isFixed && (
                    <Tag color="error">固定规则</Tag>
                  )}
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(activeRule)}
                  >
                    编辑
                  </Button>
                  {!activeRule.isFixed && (
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(activeRule)}
                    >
                      删除
                    </Button>
                  )}
                </>
              ) : undefined
            }
          >
            <WorldRuleDetail activeRule={activeRule} />
          </Panel>
        </PanelGroup>
      </PanelContainer>

      <BaseModal
        title={
          modalMode === "create"
            ? `新建${CATEGORY_META[modalCategory].label}`
            : `编辑${CATEGORY_META[editingRule?.category ?? "global"].label}`
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          resetForm();
        }}
        onOk={handleSave}
        okButtonProps={{ disabled: !formName.trim() }}
        okText="保存"
        width={560}
        destroyOnClose
      >
        <WorldRuleForm
          formName={formName}
          formContent={formContent}
          onNameChange={setFormName}
          onContentChange={setFormContent}
        />
      </BaseModal>

      <AiSceneModal
        open={aiOpen}
        scene={getWorldRuleScenes(book.id, handleAiSave)}
        bookId={book.id}
        onClose={() => setAiOpen(false)}
        onSaved={async () => {
          setAiOpen(false);
          await loadRules();
        }}
        onSave={getWorldRuleScenes(book.id, handleAiSave).onSave}
      />
    </>
  );
}
