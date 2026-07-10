"use client";

import { useState, useCallback } from "react";
import { Popconfirm } from "antd";
import {
  SettingOutlined,
  ThunderboltOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  ApiOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { AiConfig, Book } from "@/app/types";
import { useConfigList } from "./hooks/use-config-list";
import type { StoredConfig } from "./hooks/use-config-list";
import ConfigDetail from "./components/config-detail";
import ConfigModal from "./components/config-modal";
import styles from "./index.module.css";

type SettingsTab = "ai-config" | "prompt-library";

interface AiConfigFormProps {
  onBack: () => void;
  /** @deprecated No longer used in activity-bar layout */
  initialConfig?: AiConfig | null;
  initialBooks?: Book[];
}

/**
 * Settings AI page — activity bar layout with list + detail panels.
 *
 * AI 配置 tab:
 *   - Left: config list (232px) with add/delete
 *   - Right: detail view for selected config
 *
 * 提示词库 tab: placeholder for now.
 */
export default function AiConfigForm({
  onBack,
}: AiConfigFormProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("ai-config");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StoredConfig | null>(null);

  const {
    configs,
    selectedId,
    selectedConfig,
    loaded,
    selectConfig,
    addConfig,
    updateConfig,
    deleteConfig,
  } = useConfigList();

  const handleAdd = useCallback(() => {
    setEditingConfig(null);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((config: StoredConfig) => {
    setEditingConfig(config);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(
    (config: Omit<StoredConfig, "id" | "status">) => {
      if (editingConfig) {
        updateConfig(editingConfig.id, config);
      } else {
        addConfig(config);
      }
    },
    [editingConfig, addConfig, updateConfig],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingConfig(null);
  }, []);

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteConfig(id);
    },
    [deleteConfig],
  );

  return (
    <div className={styles.container}>
      {/* Activity Bar */}
      <aside className={styles.activityBar}>
        <button
          className={`${styles.activityButton} ${styles.activityTooltip} ${
            activeTab === "ai-config" ? styles.activityButtonActive : ""
          }`}
          onClick={() => setActiveTab("ai-config")}
          type="button"
          data-tooltip="AI 配置"
          aria-label="AI 配置"
        >
          <SettingOutlined />
        </button>

        <button
          className={`${styles.activityButton} ${styles.activityTooltip} ${
            activeTab === "prompt-library" ? styles.activityButtonActive : ""
          }`}
          onClick={() => setActiveTab("prompt-library")}
          type="button"
          data-tooltip="提示词库"
          aria-label="提示词库"
        >
          <ThunderboltOutlined />
        </button>

        <div className={styles.activitySpacer} />

        <button
          className={`${styles.backButton} ${styles.activityTooltip}`}
          onClick={onBack}
          type="button"
          data-tooltip="返回首页"
          aria-label="返回首页"
        >
          <ArrowLeftOutlined />
        </button>
      </aside>

      {/* Content Area */}
      <main className={styles.contentArea}>
        {activeTab === "ai-config" && (
          <div className={styles.configBody}>
            {/* Config List */}
            <nav className={styles.configList}>
              <div className={styles.configListHeader}>
                <h2 className={styles.configListTitle}>AI 配置</h2>
                <button
                  className={styles.addConfigButton}
                  onClick={handleAdd}
                  type="button"
                  aria-label="新建配置"
                >
                  <PlusOutlined />
                </button>
              </div>

              <div className={styles.configListBody}>
                {loaded && configs.length === 0 ? (
                  <div className={styles.configListEmpty}>
                    <ApiOutlined className={styles.configListEmptyIcon} />
                    <span>暂无配置</span>
                    <span>点击 + 新建</span>
                  </div>
                ) : (
                  configs.map((cfg) => (
                    <div
                      key={cfg.id}
                      className={`${styles.configItem} ${
                        cfg.id === selectedId ? styles.configItemActive : ""
                      }`}
                      onClick={() => selectConfig(cfg.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectConfig(cfg.id);
                        }
                      }}
                    >
                      <div className={styles.configItemIcon}>
                        <ApiOutlined />
                      </div>
                      <div className={styles.configItemInfo}>
                        <span className={styles.configItemName}>{cfg.name}</span>
                        <span className={styles.configItemProvider}>
                          {cfg.providerName || cfg.provider}
                        </span>
                      </div>
                      <Popconfirm
                        title="确认删除此配置？"
                        onConfirm={(e) => handleDelete(e as React.MouseEvent, cfg.id)}
                        okText="删除"
                        cancelText="取消"
                      >
                        <button
                          className={styles.configItemDelete}
                          type="button"
                          aria-label="删除配置"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DeleteOutlined />
                        </button>
                      </Popconfirm>
                    </div>
                  ))
                )}
              </div>
            </nav>

            {/* Config Detail */}
            <section className={styles.configDetail}>
              {selectedConfig ? (
                <ConfigDetail config={selectedConfig} onEdit={handleEdit} />
              ) : (
                <div className={styles.promptPlaceholder}>
                  <ApiOutlined className={styles.promptPlaceholderIcon} />
                  <span>
                    {configs.length === 0
                      ? "暂无配置，请点击左上角 + 新建"
                      : "选择一个配置查看详情"}
                  </span>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "prompt-library" && (
          <div className={styles.promptPlaceholder}>
            <ThunderboltOutlined className={styles.promptPlaceholderIcon} />
            <span>提示词库功能即将上线</span>
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      <ConfigModal
        open={modalOpen}
        editingConfig={editingConfig}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}
