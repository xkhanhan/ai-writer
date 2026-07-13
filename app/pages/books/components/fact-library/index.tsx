"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input, Form, InputNumber } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  AuditOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import BaseModal from "@/shared/ui/base-modal";
import { useRegisterAiActions, useAiContext } from "../../context/ai-context";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { Book, StoryFact } from "@/app/types";
import {
  fetchFacts,
  createFact,
  updateFact,
  deleteFact,
} from "../../api/facts";
import { showError, showSuccess } from "@/app/utils/error-handler";
import styles from "./index.module.css";

// ============ 筛选类型 ============

type FilterType = "all" | "with-characters" | "no-characters";

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "with-characters", label: "含角色" },
  { key: "no-characters", label: "纯事件" },
];

// ============ 组件 ============

interface FactLibraryProps {
  book: Book;
}

export default function FactLibrary({ book }: FactLibraryProps) {
  const [facts, setFacts] = useState<StoryFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // 编辑弹窗
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<StoryFact | null>(null);
  const [form] = Form.useForm();

  const { toggleVisible: toggleAi } = useAiContext();

  // 注册 AI 操作
  useRegisterAiActions([{
    id: "fact-library.consistency",
    title: "AI 事实一致性检查",
    description: "检查所有事实记录的一致性",
    functionKey: "fact_consistency",
    inputLabel: "描述要检查的范围或关注点",
    inputPlaceholder: "例如：检查第3章到第5章的设定是否一致...",
    resultMode: "text",
  }]);

  // 加载数据
  const loadFacts = useCallback(async () => {
    const res = await fetchFacts(book.id);
    if (res.ok) {
      setFacts(res.data);
      setSelectedId((prev) =>
        prev ?? (res.data.length > 0 ? res.data[0].id : null)
      );
    }
    setLoading(false);
  }, [book.id]);

  useEffect(() => {
    void (async () => {
      await loadFacts();
    })();
  }, [loadFacts]);

  // 筛选
  const filteredFacts = useMemo(() => {
    let result = facts;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.content.toLowerCase().includes(q) ||
          f.relatedCharacterIds.some((c) => c.toLowerCase().includes(q))
      );
    }
    if (filter === "with-characters") {
      result = result.filter((f) => f.relatedCharacterIds.length > 0);
    } else if (filter === "no-characters") {
      result = result.filter((f) => f.relatedCharacterIds.length === 0);
    }
    return result;
  }, [facts, search, filter]);

  // 按章节分组
  const groupedFacts = useMemo(() => {
    const groups: Record<number, StoryFact[]> = {};
    filteredFacts.forEach((f) => {
      if (!groups[f.chapterNumber]) groups[f.chapterNumber] = [];
      groups[f.chapterNumber].push(f);
    });
    return groups;
  }, [filteredFacts]);

  const selectedFact = facts.find((f) => f.id === selectedId) ?? null;
  const chapterNumbers = Object.keys(groupedFacts)
    .map(Number)
    .sort((a, b) => a - b);

  // 新建/编辑
  const openCreateModal = () => {
    setEditingFact(null);
    form.resetFields();
    setEditModalOpen(true);
  };

  const openEditModal = (fact: StoryFact) => {
    setEditingFact(fact);
    form.setFieldsValue({
      content: fact.content,
      chapterNumber: fact.chapterNumber,
      relatedCharacterIds: fact.relatedCharacterIds.join(", "),
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const characterIds = values.relatedCharacterIds
        ? values.relatedCharacterIds
            .split(/[,，]/)
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

      if (editingFact) {
        const res = await updateFact(book.id, editingFact.id, {
          content: values.content,
          chapterNumber: values.chapterNumber,
          relatedCharacterIds: characterIds,
        });
        if (res.ok) {
          showSuccess("事实已更新");
          setEditModalOpen(false);
          loadFacts();
        } else {
          showError(res.error);
        }
      } else {
        const res = await createFact(book.id, {
          content: values.content,
          chapterNumber: values.chapterNumber,
          chapterId: "",
          relatedCharacterIds: characterIds,
        });
        if (res.ok) {
          showSuccess("事实已创建");
          setEditModalOpen(false);
          setSelectedId(res.data.id);
          loadFacts();
        } else {
          showError(res.error);
        }
      }
    } catch {
      // 表单校验失败 — antd handles display
    }
  };

  // 删除
  const handleDelete = (id: string) => {
    confirmDelete("确认删除这条事实？", async () => {
      const res = await deleteFact(book.id, id);
      if (res.ok) {
        showSuccess("事实已删除");
        if (selectedId === id) setSelectedId(null);
        loadFacts();
      } else {
        showError(res.error);
      }
    });
  };

  // 右侧内容（无选中时的空状态）
  const emptyDetail = (
    <div className={styles.emptyState}>选择一条事实查看详情</div>
  );

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          <Panel
            title="事实库"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
            actions={
              <span className={styles.listCount}>
                {filteredFacts.length} 条
              </span>
            }
          >
            <div className={styles.listToolbar}>
              <span className={styles.listCount}>
                {filteredFacts.length} 条
              </span>
              <Button
                type="primary"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={toggleAi}
              >
                AI 检查
              </Button>
            </div>
            <div className={styles.filterBar}>
              {FILTER_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className={styles.searchBar}>
              <Input
                placeholder="搜索事实内容或角色..."
                size="small"
                allowClear
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.factList}>
              {chapterNumbers.map((ch) => {
                const chFacts = groupedFacts[ch];
                return (
                  <div key={ch} className={styles.chapterGroup}>
                    <div className={styles.chapterHeader}>
                      <span>第 {ch} 章</span>
                      <div className={styles.chapterHeaderLine} />
                      <span>{chFacts.length} 条</span>
                    </div>
                    {chFacts.map((f) => (
                      <div
                        key={f.id}
                        className={`${styles.factItem} ${f.id === selectedId ? styles.factItemActive : ""}`}
                        onClick={() => setSelectedId(f.id)}
                      >
                        <div className={styles.factItemContent}>
                          {f.content}
                        </div>
                        {f.relatedCharacterIds.length > 0 && (
                          <div className={styles.factItemMeta}>
                            {f.relatedCharacterIds.map((c) => (
                              <span key={c} className={styles.factItemTag}>
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              {filteredFacts.length === 0 && (
                <EmptyState
                  icon={<AuditOutlined />}
                  title="暂无匹配的事实"
                  description="尝试调整筛选条件或搜索关键词"
                />
              )}
            </div>
            <div className={styles.bottomBar}>
              <Button
                type="primary"
                size="small"
                block
                onClick={openCreateModal}
              >
                + 新建事实
              </Button>
            </div>
          </Panel>

          <Divider />

          <Panel
            title="事实详情"
            defaultSize={600}
            minSize={400}
            actions={
              selectedFact ? (
                <>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(selectedFact)}
                  >
                    编辑
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(selectedFact.id)}
                  >
                    删除
                  </Button>
                </>
              ) : undefined
            }
          >
            {selectedFact ? (
              <div className={styles.detailBody}>
                <div className={styles.detailMeta}>
                  <span>
                    来源：
                    <span style={{ fontWeight: 500 }}>
                      第 {selectedFact.chapterNumber} 章
                    </span>
                  </span>
                  <span>
                    记录于：<span>{selectedFact.createdAt}</span>
                  </span>
                </div>
                <div className={styles.detailSection}>
                  <div className={styles.detailSectionLabel}>事实内容</div>
                  <div className={styles.detailSectionContent}>{selectedFact.content}</div>
                </div>
                <div className={styles.relatedSection}>
                  <div className={styles.relatedLabel}>涉及角色</div>
                  {selectedFact.relatedCharacterIds.length > 0 ? (
                    <div className={styles.relatedTags}>
                      {selectedFact.relatedCharacterIds.map((c) => (
                        <span key={c} className={styles.relatedTag}>
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.detailEmpty}>
                      无关联角色（纯事件记录）
                    </p>
                  )}
                </div>
              </div>
            ) : (
              emptyDetail
            )}
          </Panel>
        </PanelGroup>
      </PanelContainer>

      <BaseModal
        title={editingFact ? "编辑事实" : "新建事实"}
        open={editModalOpen}
        onOk={handleSave}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="章节号"
            name="chapterNumber"
            rules={[{ required: true, message: "请输入章节号" }]}
          >
            <InputNumber
              min={1}
              precision={0}
              style={{ width: "100%" }}
              placeholder="例如：1"
            />
          </Form.Item>
          <Form.Item
            label="事实内容"
            name="content"
            rules={[{ required: true, message: "请输入事实内容" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="描述这一章发生的关键事实..."
            />
          </Form.Item>
          <Form.Item label="涉及角色" name="relatedCharacterIds">
            <Input placeholder="用逗号分隔多个角色名，如：张三, 李四" />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
