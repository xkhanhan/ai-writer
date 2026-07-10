"use client";

import { Button, Tag, Tooltip, Spin } from "antd";
import { PlusOutlined, DownOutlined } from "@ant-design/icons";
import { ThunderboltOutlined } from "@ant-design/icons";
import type { SettingCategory, SettingEntity } from "@/app/types";
import { CAT_META, LEVEL_MAP, CAT_ORDER } from "@/app/constants/settings";
import styles from "./settings-list-panel.module.css";

interface SettingsListPanelProps {
  entities: SettingEntity[];
  loading: boolean;
  activeId?: string;
  openGroups: Record<SettingCategory, boolean>;
  grouped: Record<SettingCategory, SettingEntity[]>;
  onToggleGroup: (cat: SettingCategory) => void;
  onSelectEntity: (id: string) => void;
  onOpenCreate: (cat: SettingCategory) => void;
  onOpenAi: () => void;
}

export default function SettingsListPanel({
  entities,
  loading,
  activeId,
  openGroups,
  grouped,
  onToggleGroup,
  onSelectEntity,
  onOpenCreate,
  onOpenAi,
}: SettingsListPanelProps) {
  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
      </div>
    );
  }

  return (
    <div className={styles.entityList}>
      <div className={styles.listToolbar}>
        <span className={styles.entityCount}>{entities.length} 条</span>
        <Button
          type="primary"
          size="small"
          icon={<ThunderboltOutlined />}
          onClick={onOpenAi}
        >
          AI 检查
        </Button>
      </div>
      {CAT_ORDER.map((cat) => {
        const items = grouped[cat];
        const meta = CAT_META[cat];
        const isOpen = openGroups[cat];
        return (
          <div key={cat} className={styles.catGroup}>
            <div
              className={styles.catHeader}
              onClick={() => onToggleGroup(cat)}
            >
              <div className={styles.catHeaderLeft}>
                <span
                  className={`${styles.catArrow} ${isOpen ? "" : styles.catArrowClosed}`}
                >
                  <DownOutlined style={{ fontSize: 10 }} />
                </span>
                <span className={styles.catIcon}>{meta.icon}</span>
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
                    onOpenCreate(cat);
                  }}
                />
              </Tooltip>
            </div>
            {isOpen && (
              <div className={styles.catItems}>
                {items.length === 0 ? (
                  <div className={styles.catEmpty}>暂无{meta.label}</div>
                ) : (
                  items.map((entity) => (
                    <div
                      key={entity.id}
                      className={`${styles.entityItem} ${activeId === entity.id ? styles.entityItemActive : ""} ${entity.deprecated ? styles.entityItemDeprecated : ""}`}
                      onClick={() => onSelectEntity(entity.id)}
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
  );
}
