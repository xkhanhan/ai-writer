"use client";

import { useState } from "react";
import { Tag, Button } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import BaseModal from "@/shared/ui/base-modal";
import { useRegisterAiActions, useAiContext } from "../../context/ai-context";
import type { Book } from "@/app/types";
import { CAT_META, LEVEL_MAP } from "@/app/constants/settings";
import { useSettingsLibrary } from "./hooks/use-settings-library";
import SettingsListPanel from "./components/settings-list-panel";
import SettingsDetailPanel from "./components/settings-detail-panel";
import SettingsEntityForm from "./components/settings-entity-form";
import styles from "./index.module.css";

interface SettingsLibraryProps {
  book: Book;
  activeId?: string;
  onActiveChange?: (id: string) => void;
}

export default function SettingsLibrary({ book, activeId, onActiveChange }: SettingsLibraryProps) {
  const {
    entities, loading, activeEntity, openGroups, grouped,
    tagNameMap, form, modalOpen, modalCat, editing,
    toggleGroup, openCreate, openEdit, handleSave,
    handleDelete, handleToggleDeprecated, setModalOpen,
  } = useSettingsLibrary(book.id, activeId, onActiveChange);

  const { toggleVisible: toggleAi } = useAiContext();
  const catLabel = CAT_META[modalCat]?.label ?? "设定";

  // 注册 AI 操作
  useRegisterAiActions([{
    id: "settings.character_audit",
    title: "角色一致性检查",
    description: "检查角色设定的前后一致性",
    functionKey: "character_audit",
    inputLabel: "描述要检查的角色或关注点",
    inputPlaceholder: "例如：检查主角的能力设定是否前后一致...",
    resultMode: "text",
  }]);

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
            actions={<span className={styles.entityCount}>{entities.length} 条</span>}
          >
            <SettingsListPanel
              entities={entities}
              loading={loading}
              activeId={activeId}
              openGroups={openGroups}
              grouped={grouped}
              onToggleGroup={toggleGroup}
              onSelectEntity={(id) => onActiveChange?.(id)}
              onOpenCreate={openCreate}
              onOpenAi={toggleAi}
            />
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
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(activeEntity)}>
                    编辑
                  </Button>
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(activeEntity)}>
                    删除
                  </Button>
                  <Button size="small" onClick={() => handleToggleDeprecated(activeEntity)}>
                    {activeEntity.deprecated ? "取消废弃" : "废弃"}
                  </Button>
                </>
              ) : undefined
            }
          >
            {activeEntity ? (
              <SettingsDetailPanel activeEntity={activeEntity} tagNameMap={tagNameMap} />
            ) : (
              <div className={styles.emptyState}>选择一个设定查看详情</div>
            )}
          </Panel>
        </PanelGroup>
      </PanelContainer>

      <BaseModal
        title={`${editing ? "编辑" : "新建"}${catLabel}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText="保存"
        width={560}
        destroyOnClose
      >
        <SettingsEntityForm form={form} modalCat={modalCat} bookId={book.id} />
      </BaseModal>

    </>
  );
}
