"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  Tag,
  Tooltip,
  Spin,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  DownOutlined,
  InfoCircleOutlined,
  UserOutlined,
  EnvironmentOutlined,
  BankOutlined,
  GiftOutlined,
  AppstoreOutlined,
  BulbOutlined,
  EyeOutlined,
  StarOutlined,
  ThunderboltOutlined,
  FallOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import BaseModal from "@/shared/ui/base-modal";
import { confirmDelete } from "@/shared/ui/confirm-delete";
import { TagSelector } from "@/shared/ui/tag-selector";
import type {
  Book,
  SettingEntity,
  SettingCategory,
  SettingLevel,
  TagCategory,
  CreateSettingEntityDTO,
} from "@/app/types";
import {
  STATUS_FIELD_TEMPLATES,
  CATEGORY_FIELD_TEMPLATES,
} from "@/app/types";
import {
  fetchSettingEntities,
  createSettingEntity,
  updateSettingEntity,
  deleteSettingEntity,
} from "../../api/setting-entities";
import { useTagTree } from "@/shared/hooks/use-tag-tree";
import { showError, showSuccess } from "@/app/utils/error-handler";
import styles from "./index.module.css";

// ============ 常量 ============

const CAT_META: Record<
  SettingCategory,
  { label: string; icon: React.ReactNode }
> = {
  character: { label: "人物", icon: <UserOutlined /> },
  location: { label: "地点", icon: <EnvironmentOutlined /> },
  faction: { label: "势力", icon: <BankOutlined /> },
  item: { label: "物品", icon: <GiftOutlined /> },
  other: { label: "其他", icon: <AppstoreOutlined /> },
};

const LEVEL_MAP: Record<
  SettingLevel,
  { label: string; color: string }
> = {
  core: { label: "核心", color: "green" },
  important: { label: "重要", color: "orange" },
  general: { label: "一般", color: "" },
};

const CAT_ORDER: SettingCategory[] = [
  "character",
  "location",
  "faction",
  "item",
  "other",
];

const INFO_FIELDS: {
  key: keyof Pick<
    SettingEntity,
    "description" | "appearance" | "traits" | "background" | "abilities" | "weaknesses"
  >;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "description", label: "描述", icon: <BulbOutlined /> },
  { key: "appearance", label: "外观", icon: <EyeOutlined /> },
  { key: "traits", label: "特点", icon: <StarOutlined /> },
  { key: "background", label: "背景", icon: <InfoCircleOutlined /> },
  { key: "abilities", label: "能力", icon: <ThunderboltOutlined /> },
  { key: "weaknesses", label: "弱点", icon: <FallOutlined /> },
];

// ============ 组件 ============

interface SettingsLibraryProps {
  book: Book;
  activeId?: string;
  onActiveChange?: (id: string) => void;
}

export default function SettingsLibrary({ book, activeId, onActiveChange }: SettingsLibraryProps) {
  // 数据
  const [entities, setEntities] = useState<SettingEntity[]>([]);
  const [loading, setLoading] = useState(true);

  // 标签名称映射（id -> name），用于详情区展示
  const { tags: tagTree } = useTagTree(book.id);
  const tagNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (tags: TagCategory[]) => {
      for (const t of tags) {
        map.set(t.id, t.name);
        if (t.children) walk(t.children);
      }
    };
    walk(tagTree);
    return map;
  }, [tagTree]);

  // 分组折叠
  const [openGroups, setOpenGroups] = useState<
    Record<SettingCategory, boolean>
  >({
    character: false,
    location: false,
    faction: false,
    item: false,
    other: false,
  });

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCat, setModalCat] = useState<SettingCategory>("character");
  const [editing, setEditing] = useState<SettingEntity | null>(null);
  const [form] = Form.useForm();

  // 详情区字段折叠
  const [expandedFields, setExpandedFields] = useState<
    Record<string, boolean>
  >({
    description: true,
    appearance: true,
    traits: true,
    background: true,
    abilities: true,
    weaknesses: true,
  });

  const activeEntity = entities.find((e) => e.id === activeId) ?? null;

  // 按分类分组
  const grouped = CAT_ORDER.reduce(
    (acc, cat) => {
      acc[cat] = entities.filter((e) => e.category === cat);
      return acc;
    },
    {} as Record<SettingCategory, SettingEntity[]>
  );

  // ============ 数据加载 ============

  const loadEntities = useCallback(async () => {
    setLoading(true);
    const result = await fetchSettingEntities(book.id);
    if (result.ok) {
      setEntities(result.data);
      // 自动展开有内容的分类
      const newOpen: Record<SettingCategory, boolean> = {
        character: false,
        location: false,
        faction: false,
        item: false,
        other: false,
      };
      for (const cat of CAT_ORDER) {
        if (result.data.some((e) => e.category === cat)) {
          newOpen[cat] = true;
        }
      }
      setOpenGroups(newOpen);
    }
    setLoading(false);
  }, [book.id]);

  useEffect(() => {
    void (async () => {
      await loadEntities();
    })();
  }, [loadEntities]);

  // 数据加载完成后，自动选中首项（无历史选中 or 选中项已被删除）
  useEffect(() => {
    if (loading || entities.length === 0) return;
    if (!activeId || !entities.some((e) => e.id === activeId)) {
      onActiveChange?.(entities[0].id);
    }
  }, [loading, entities, activeId, onActiveChange]);

  // ============ 分组切换 ============

  const toggleGroup = (cat: SettingCategory) => {
    setOpenGroups((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ============ 弹窗操作 ============

  const openCreate = (cat: SettingCategory) => {
    setEditing(null);
    setModalCat(cat);
    const defaults: Record<string, unknown> = {
      name: "",
      level: "general",
      tagIds: [],
      description: "",
      appearance: "",
      traits: "",
      background: "",
      abilities: "",
      weaknesses: "",
    };
    // 初始化分类专属字段
    for (const f of CATEGORY_FIELD_TEMPLATES[cat]) {
      defaults[f] = "";
    }
    // 初始化状态字段
    for (const f of STATUS_FIELD_TEMPLATES[cat]) {
      defaults[f] = "";
    }
    form.resetFields();
    form.setFieldsValue(defaults);
    setModalOpen(true);
  };

  const openEdit = (entity: SettingEntity) => {
    setEditing(entity);
    setModalCat(entity.category);
    form.resetFields();
    form.setFieldsValue({
      name: entity.name,
      level: entity.level,
      tagIds: entity.tagIds ?? [],
      description: entity.description,
      appearance: entity.appearance,
      traits: entity.traits,
      background: entity.background,
      abilities: entity.abilities,
      weaknesses: entity.weaknesses,
      ...entity.categoryFields,
      ...entity.statusFields,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    const {
      name,
      level,
      tagIds,
      description,
      appearance,
      traits,
      background,
      abilities,
      weaknesses,
      ...rest
    } = values;

    // 分类专属字段
    const categoryFields: Record<string, string> = {};
    for (const f of CATEGORY_FIELD_TEMPLATES[modalCat]) {
      if (rest[f] !== undefined) categoryFields[f] = rest[f];
    }

    // 状态字段
    const statusFields: Record<string, string> = {};
    for (const f of STATUS_FIELD_TEMPLATES[modalCat]) {
      if (rest[f] !== undefined) statusFields[f] = rest[f];
    }

    if (editing) {
      const dto = {
        name: name.trim(),
        level: level as SettingLevel,
        tagIds: tagIds as string[],
        description,
        appearance,
        traits,
        background,
        abilities,
        weaknesses,
        categoryFields,
        statusFields,
      };
      const result = await updateSettingEntity(editing.id, dto);
      if (!result.ok) {
        showError(result.error || "保存失败");
        return;
      }
      setEntities((prev) =>
        prev.map((e) => (e.id === result.data.id ? result.data : e))
      );
    } else {
      const dto: CreateSettingEntityDTO = {
        category: modalCat,
        name: name.trim(),
        level: level as SettingLevel,
        tagIds: tagIds as string[],
        description,
        appearance,
        traits,
        background,
        abilities,
        weaknesses,
        categoryFields,
        statusFields,
      };
      const result = await createSettingEntity(book.id, dto);
      if (!result.ok) {
        showError(result.error || "创建失败");
        return;
      }
      setEntities((prev) => [...prev, result.data]);
      onActiveChange?.(result.data.id);
      setOpenGroups((prev) => ({ ...prev, [modalCat]: true }));
    }

    showSuccess(editing ? "保存成功" : "创建成功");
    setModalOpen(false);
  };

  const handleDelete = (entity: SettingEntity) => {
    confirmDelete(entity.name, async () => {
      const result = await deleteSettingEntity(entity.id);
      if (result.ok) {
        setEntities((prev) => prev.filter((e) => e.id !== entity.id));
        showSuccess("删除成功");
      } else {
        showError(result.error || "删除失败");
      }
    });
  };

  const handleToggleDeprecated = async (entity: SettingEntity) => {
    const result = await updateSettingEntity(entity.id, {
      deprecated: !entity.deprecated,
    });
    if (result.ok) {
      setEntities((prev) =>
        prev.map((e) => (e.id === result.data.id ? result.data : e))
      );
    } else {
      showError(result.error || "更新废弃状态失败");
    }
  };

  const toggleField = (key: string) => {
    setExpandedFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ============ 左侧面板 ============

  const leftPanelContent = (
    <>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <div className={styles.entityList}>
          {CAT_ORDER.map((cat) => {
            const items = grouped[cat];
            const meta = CAT_META[cat];
            const isOpen = openGroups[cat];
            return (
              <div key={cat} className={styles.catGroup}>
                <div
                  className={styles.catHeader}
                  onClick={() => toggleGroup(cat)}
                >
                  <div className={styles.catHeaderLeft}>
                    <span
                      className={`${styles.catArrow} ${isOpen ? "" : styles.catArrowClosed}`}
                    >
                      <DownOutlined style={{ fontSize: 10 }} />
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      {meta.icon}
                    </span>
                    <span className={styles.catName}>{meta.label}</span>
                    <span className={styles.catCount}>{items.length}</span>
                  </div>
                  <Tooltip title={`新建${meta.label}`}>
                    <Button
                      type="text"
                      size="small"
                      icon={<PlusOutlined />}
                      className={styles.addBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreate(cat);
                      }}
                    />
                  </Tooltip>
                </div>
                {isOpen && (
                  <div className={styles.catItems}>
                    {items.length === 0 ? (
                      <div
                        style={{
                          padding: "6px 0",
                          fontSize: 11,
                          color: "var(--text-secondary)",
                          fontStyle: "italic",
                        }}
                      >
                        暂无{meta.label}
                      </div>
                    ) : (
                      items.map((entity) => (
                        <div
                          key={entity.id}
                          className={`${styles.entityItem} ${activeId === entity.id ? styles.entityItemActive : ""} ${entity.deprecated ? styles.entityItemDeprecated : ""}`}
                          onClick={() => onActiveChange?.(entity.id)}
                        >
                          <div className={styles.entityItemBody}>
                            <span className={styles.entityName}>
                              {entity.name}
                            </span>
                            <Tag
                              color={LEVEL_MAP[entity.level]?.color}
                              style={{ margin: 0, fontSize: 11 }}
                            >
                              {LEVEL_MAP[entity.level]?.label}
                            </Tag>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  // ============ 右侧面板 ============

  const rightPanelContent = activeEntity ? (
    <div className={styles.detailBody}>
        <div className={styles.detailMeta}>
          创建于{" "}
          {new Date(activeEntity.createdAt).toLocaleString("zh-CN")} · 更新于{" "}
          {new Date(activeEntity.updatedAt).toLocaleString("zh-CN")}
        </div>
        {/* 6 个通用信息字段卡片 */}
        {INFO_FIELDS.map((f) => {
          const val = activeEntity[f.key];
          const isExpanded = expandedFields[f.key];
          return (
            <div key={f.key} className={styles.infoSection}>
              <div
                className={styles.infoSectionHeader}
                onClick={() => toggleField(f.key)}
                style={{ cursor: "pointer" }}
              >
                <span className={styles.infoSectionTitle}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {f.icon}
                  </span>
                  {f.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  {isExpanded ? "收起" : "展开"}
                </span>
              </div>
              <div
                className={`${styles.infoSectionBody} ${!isExpanded ? styles.infoSectionBodyCollapsed : ""}`}
              >
                {val ? (
                  <div className={styles.descText}>{val}</div>
                ) : (
                  <div className={styles.descEmpty}>暂无内容</div>
                )}
              </div>
            </div>
          );
        })}

        {/* 标签区 */}
        {activeEntity.tagIds && activeEntity.tagIds.length > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoSectionHeader}>
              <span className={styles.infoSectionTitle}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  <TagsOutlined />
                </span>
                标签
              </span>
            </div>
            <div className={styles.infoSectionBody}>
              <div className={styles.tagList}>
                {activeEntity.tagIds.map((tagId) => (
                  <span key={tagId} className={styles.tagItem}>
                    {tagNameMap.get(tagId) ?? tagId}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 分类专属字段 */}
        {CATEGORY_FIELD_TEMPLATES[activeEntity.category]?.length > 0 && (
          <div className={styles.infoSection}>
            <div className={styles.infoSectionHeader}>
              <span className={styles.infoSectionTitle}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  <InfoCircleOutlined />
                </span>
                分类专属
              </span>
            </div>
            <div className={styles.infoSectionBody}>
              {CATEGORY_FIELD_TEMPLATES[activeEntity.category].map((f) => (
                <div key={f} className={styles.statusField} style={{ marginBottom: 8 }}>
                  <span className={styles.statusLabel}>{f}</span>
                  <span className={styles.statusValue}>
                    {activeEntity.categoryFields?.[f] || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 状态信息区 */}
        <div className={styles.infoSection}>
          <div className={styles.infoSectionHeader}>
            <span className={styles.infoSectionTitle}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                <InfoCircleOutlined />
              </span>
              状态信息
            </span>
            <Tooltip title="状态信息随正文变化，仅记录当前快照">
              <InfoCircleOutlined
                style={{ fontSize: 14, color: "var(--text-secondary)", cursor: "help" }}
              />
            </Tooltip>
          </div>
          <div className={styles.infoSectionBody}>
            {Object.keys(activeEntity.statusFields || {}).length > 0 ? (
              <div className={styles.statusGrid}>
                {Object.entries(activeEntity.statusFields).map(([k, v]) => (
                  <div key={k} className={styles.statusField}>
                    <span className={styles.statusLabel}>{k}</span>
                    <span className={styles.statusValue}>{v || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.statusEmpty}>暂无状态信息</div>
            )}
          </div>
        </div>
    </div>
  ) : null;

  // ============ 弹窗表单 ============

  const catLabel = CAT_META[modalCat]?.label ?? "设定";
  const modalTitle = `${editing ? "编辑" : "新建"}${catLabel}`;
  const statusFieldsList = STATUS_FIELD_TEMPLATES[modalCat] ?? [];
  const catFieldsList = CATEGORY_FIELD_TEMPLATES[modalCat] ?? [];

  const modalContent = (
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
          <TagSelector bookId={book.id} placeholder="选择关联标签" />
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

  // ============ 渲染 ============

  return (
    <>
      <PanelContainer>
        <PanelGroup direction="horizontal">
          <Panel
            title="设定库"
            defaultSize={280}
            minSize={200}
            maxSize={500}
            collapsible
            actions={
              <span className={styles.entityCount}>{entities.length} 条</span>
            }
          >
            {leftPanelContent}
          </Panel>

          <Divider />

          <Panel
            title={activeEntity ? activeEntity.name : "设定详情"}
            defaultSize={600}
            minSize={400}
            actions={
              activeEntity ? (
                <>
                  <Tag color={LEVEL_MAP[activeEntity.level]?.color}>
                    {LEVEL_MAP[activeEntity.level]?.label}
                  </Tag>
                  <Tag>{CAT_META[activeEntity.category]?.label}</Tag>
                  {activeEntity.deprecated && <Tag color="error">已废弃</Tag>}
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEdit(activeEntity)}
                  >
                    编辑
                  </Button>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(activeEntity)}
                  >
                    删除
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleToggleDeprecated(activeEntity)}
                  >
                    {activeEntity.deprecated ? "取消废弃" : "废弃"}
                  </Button>
                </>
              ) : undefined
            }
          >
            {activeEntity ? rightPanelContent : null}
          </Panel>
        </PanelGroup>
      </PanelContainer>

      <BaseModal
        title={modalTitle}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="保存"
        width={560}
        destroyOnClose
      >
        {modalContent}
      </BaseModal>
    </>
  );
}
