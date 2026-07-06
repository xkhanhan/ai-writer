"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Select,
  Modal,
  Tag,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { SplitPanel } from "@/shared/ui/split-panel";
import { EmptyState } from "@/shared/ui/empty-state";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import type { Book, SettingEntity, SettingCategory } from "@/app/types";
import styles from "./index.module.css";

interface SettingsLibraryProps {
  book: Book;
}

const categories: { key: SettingCategory; label: string }[] = [
  { key: "character", label: "人物" },
  { key: "item", label: "物品" },
  { key: "location", label: "地点" },
  { key: "faction", label: "势力" },
  { key: "other", label: "其他" },
];

const levelOptions = [
  { label: "核心", value: "core" },
  { label: "重要", value: "important" },
  { label: "一般", value: "general" },
];

const levelLabels: Record<string, string> = {
  core: "核心",
  important: "重要",
  general: "一般",
};

type ModalMode = "create" | "edit";

const categoryLabels: Record<SettingCategory, string> = {
  character: "人物",
  item: "物品",
  location: "地点",
  faction: "势力",
  other: "其他",
};

export default function SettingsLibrary({ book }: SettingsLibraryProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<SettingCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<SettingEntity | null>(null);
  const [entities, setEntities] = useState<SettingEntity[]>([]);

  // Modal 状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingEntity, setEditingEntity] = useState<SettingEntity | null>(null);

  // 表单字段
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<SettingCategory>("character");
  const [formLevel, setFormLevel] = useState("general");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "deprecated">("active");

  // 打开新建 Modal
  const handleOpenCreate = (category: SettingCategory) => {
    setModalMode("create");
    setEditingEntity(null);
    setFormName("");
    setFormCategory(category);
    setFormLevel("general");
    setFormDescription("");
    setFormStatus("active");
    setModalOpen(true);
  };

  // 打开编辑 Modal
  const handleOpenEdit = (entity: SettingEntity) => {
    setModalMode("edit");
    setEditingEntity(entity);
    const entityLevel =
      ((entity as unknown as Record<string, unknown>).level as string) ||
      "general";
    setFormName(entity.name);
    setFormCategory(entity.category);
    setFormLevel(entityLevel);
    setFormDescription(entity.description || "");
    setFormStatus(entity.deprecated ? "deprecated" : "active");
    setModalOpen(true);
  };

  // Modal 保存
  const handleModalSave = () => {
    if (!formName.trim()) return;
    const now = new Date().toISOString();

    if (modalMode === "create") {
      const newEntity: SettingEntity & { level?: string } = {
        id: `se_${Date.now()}`,
        bookId: book.id,
        category: formCategory,
        name: formName.trim(),
        description: formDescription || undefined,
        deprecated: false,
        createdAt: now,
        updatedAt: now,
        level: formLevel,
      };
      setEntities((prev) => [...prev, newEntity]);
      setSelectedItem(newEntity);
      setSelectedCategory(formCategory);
    } else if (modalMode === "edit" && editingEntity) {
      const updated: SettingEntity & { level?: string } = {
        ...editingEntity,
        name: formName.trim(),
        category: formCategory,
        description: formDescription || undefined,
        deprecated: formStatus === "deprecated",
        updatedAt: now,
        level: formLevel,
      };
      setEntities((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
      setSelectedItem(updated);
    }

    setModalOpen(false);
  };

  // 删除实体
  const handleDelete = (entity: SettingEntity) => {
    confirmDelete(entity.name, () => {
      setEntities((prev) => prev.filter((e) => e.id !== entity.id));
      if (selectedItem?.id === entity.id) {
        setSelectedItem(null);
      }
    });
  };

  // 按分类获取数量
  const getCount = (cat: SettingCategory) =>
    entities.filter((e) => e.category === cat).length;

  // 获取分类下的实体
  const getCategoryEntities = (cat: SettingCategory) =>
    entities.filter((e) => e.category === cat);

  // 获取 entity 的 level
  const getEntityLevel = (entity: SettingEntity): string =>
    ((entity as unknown as Record<string, unknown>).level as string) || "general";

  // 获取所有实体总数
  const totalCount = entities.length;

  // ===== 左侧面板 =====
  const leftPanel = totalCount === 0 ? (
    <div className={styles.leftEmpty}>
      <EmptyState
        icon={<FileOutlined />}
        title="还没有设定"
        description="创建人物、物品、地点等设定，丰富你的世界观"
        action={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenCreate("character")}>
            新建设定
          </Button>
        }
      />
    </div>
  ) : (
    <div className={styles.entityList}>
      <div className={styles.listToolbar}>
        <span className={styles.entityCount}>{totalCount} 条设定</span>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenCreate("character")}>
          新建
        </Button>
      </div>
      {categories.map((cat) => {
        const count = getCount(cat.key);
        const items = getCategoryEntities(cat.key);
        const isExpanded = selectedCategory === cat.key;

        return (
          <div key={cat.key} className={styles.categoryGroup}>
            <div
              className={`${styles.categoryHeader} ${isExpanded ? styles.categoryHeaderActive : ""}`}
              onClick={() => setSelectedCategory(isExpanded ? null : cat.key)}
            >
              <span className={styles.categoryName}>{cat.label}</span>
              <span className={styles.categoryCount}>{count}</span>
            </div>

            {isExpanded && (
              <div className={styles.categoryItems}>
                {items.length === 0 ? (
                  <div className={styles.categoryEmpty}>暂无{cat.label}</div>
                ) : (
                  items.map((entity) => {
                    const level = getEntityLevel(entity);
                    return (
                      <div
                        key={entity.id}
                        className={`${styles.entityItem} ${selectedItem?.id === entity.id ? styles.entityItemActive : ""} ${entity.deprecated ? styles.entityItemDeprecated : ""}`}
                        onClick={() => setSelectedItem(entity)}
                      >
                        <div className={styles.entityItemBody}>
                          <span className={styles.entityName}>{entity.name}</span>
                          <Tag
                            color={level === "core" ? "green" : level === "important" ? "orange" : undefined}
                            style={{ margin: 0 }}
                          >
                            {levelLabels[level] || "一般"}
                          </Tag>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ===== 右侧详情 =====
  const rightPanel = selectedItem ? (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div className={styles.detailTitleRow}>
          <h3 className={styles.detailTitle}>{selectedItem.name}</h3>
          <Tag
            color={getEntityLevel(selectedItem) === "core" ? "green" : getEntityLevel(selectedItem) === "important" ? "orange" : undefined}
          >
            {levelLabels[getEntityLevel(selectedItem)] || "一般"}
          </Tag>
          <Tag>{categoryLabels[selectedItem.category]}</Tag>
        </div>
        <span className={styles.detailTime}>
          创建于 {new Date(selectedItem.createdAt).toLocaleString("zh-CN")}
        </span>
        <div className={styles.detailActions}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(selectedItem)}>
            编辑
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(selectedItem)}>
            删除
          </Button>
        </div>
      </div>

      <div className={styles.detailContent}>
        {selectedItem.category === "character" && (
          <>
            {selectedItem.gender && (
              <div className={styles.viewField}>
                <span className={styles.viewFieldLabel}>性别</span>
                <span className={styles.viewFieldValue}>{selectedItem.gender}</span>
              </div>
            )}
            {selectedItem.personality && (
              <div className={styles.viewField}>
                <span className={styles.viewFieldLabel}>性格</span>
                <span className={styles.viewFieldValue}>{selectedItem.personality}</span>
              </div>
            )}
            {selectedItem.traits && (
              <div className={styles.viewField}>
                <span className={styles.viewFieldLabel}>特点/癖好</span>
                <span className={styles.viewFieldValue}>{selectedItem.traits}</span>
              </div>
            )}
            {selectedItem.tags && selectedItem.tags.length > 0 && (
              <div className={styles.viewField}>
                <span className={styles.viewFieldLabel}>标签</span>
                <div className={styles.viewTags}>
                  {selectedItem.tags.map((tag, i) => (
                    <span key={i} className={styles.viewTag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedItem.description ? (
          <div className={styles.viewField}>
            <span className={styles.viewFieldLabel}>描述</span>
            <p className={styles.detailText}>{selectedItem.description}</p>
          </div>
        ) : (
          <p className={styles.detailEmpty}>暂无内容</p>
        )}

        {selectedItem.deprecated && (
          <Tag color="error" style={{ marginTop: 8 }}>已废弃</Tag>
        )}
      </div>
    </div>
  ) : null;

  // ===== Modal 表单 =====
  const renderModal = () => (
    <Modal
      title={modalMode === "create" ? "新建设定" : "编辑设定"}
      open={modalOpen}
      onCancel={() => setModalOpen(false)}
      onOk={handleModalSave}
      okButtonProps={{ disabled: !formName.trim() }}
      okText="保存"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <div className={styles.modalForm}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>
            名称 <span className={styles.formRequired}>*</span>
          </label>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="输入名称"
            maxLength={60}
            showCount
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>分类</label>
          <Select
            value={formCategory}
            onChange={(v) => setFormCategory(v)}
            options={categories.map((c) => ({ label: c.label, value: c.key }))}
            style={{ width: "100%" }}
            disabled={modalMode === "create"}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>级别</label>
          <Select
            value={formLevel}
            onChange={(v) => setFormLevel(v)}
            options={levelOptions}
            style={{ width: "100%" }}
          />
        </div>
        {formCategory === "character" && (
          <>
            <div className={styles.formField}>
              <label className={styles.formLabel}>性别</label>
              <Select
                value={undefined}
                onChange={(v) => setFormDescription(v || "")}
                allowClear
                placeholder="选择性别"
                options={[
                  { label: "男", value: "男" },
                  { label: "女", value: "女" },
                  { label: "其他", value: "其他" },
                ]}
                style={{ width: "100%" }}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>性格</label>
              <Input placeholder="描述角色性格特征" maxLength={200} showCount />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>特点/癖好</label>
              <Input placeholder="描述角色特点或癖好" maxLength={200} showCount />
            </div>
          </>
        )}
        <div className={styles.formField}>
          <label className={styles.formLabel}>描述</label>
          <Input.TextArea
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="详细描述"
            rows={6}
            maxLength={2000}
            showCount
          />
        </div>
        {modalMode === "edit" && (
          <div className={styles.formField}>
            <label className={styles.formLabel}>状态</label>
            <Select
              value={formStatus}
              onChange={(v) => setFormStatus(v)}
              options={[
                { label: "正常", value: "active" },
                { label: "已废弃", value: "deprecated" },
              ]}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    </Modal>
  );

  return (
    <>
      <SplitPanel
        left={leftPanel}
        right={rightPanel}
        leftWidth={280}
        emptyHint="选择一项设定查看详情"
      />
      {renderModal()}
    </>
  );
}
