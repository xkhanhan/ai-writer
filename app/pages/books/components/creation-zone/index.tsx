"use client";

import { useState, useCallback, useMemo } from "react";
import { PlusOutlined } from "@ant-design/icons";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import { useRegisterAiActions } from "../../context/ai-context";
import { useCreationZone } from "@/app/pages/books/hooks/use-creation-zone";
import { NavigationTree } from "./components/navigation-tree";
import { CenterContent } from "./components/center-content";
import type { AiAction } from "@/shared/ai/ai-action";
import styles from "./index.module.css";

interface CreationZoneProps {
  bookId: string;
}

export function CreationZone({ bookId }: CreationZoneProps) {
  const zone = useCreationZone(bookId);
  const { view, setView, volumes } = zone;

  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const handleAddVolume = useCallback(() => {
    setAddMenuOpen(false);
    setView({ type: "volume-form" });
  }, [setView]);

  const handleAddChapter = useCallback(() => {
    setAddMenuOpen(false);
    const lastVolId = volumes[volumes.length - 1]?.id;
    if (lastVolId) setView({ type: "chapter-form", volumeId: lastVolId });
  }, [setView, volumes]);

  // 根据当前视图类型动态注册 AI 操作
  const aiActions = useMemo<AiAction[]>(() => {
    if (view.type === "outline") {
      return [{
        id: "creation.outline_optimize",
        title: "优化总纲",
        description: "诊断并优化方向、阶段、卖点",
        functionKey: "outline_optimize",
        extraVariables: {
          currentDirection: zone.outline?.direction || "",
          currentStages: zone.outline?.stages || "",
          currentSellingPoints: zone.outline?.sellingPoints || "",
        },
        resultMode: "json",
        onAdopt: async (result) => {
          const r = result as { optimized?: { direction?: string; stages?: string; sellingPoints?: string } };
          if (r.optimized) {
            zone.saveOutline({
              direction: r.optimized.direction || zone.outline?.direction || "",
              stages: r.optimized.stages || zone.outline?.stages || "",
              sellingPoints: r.optimized.sellingPoints || zone.outline?.sellingPoints || "",
            });
          }
        },
      }];
    }

    if (view.type === "content-editor") {
      return [
        {
          id: "creation.generate",
          title: "生成正文",
          description: "根据章纲生成小说正文",
          functionKey: "content_generate",
          inputLabel: "生成要求（可留空）",
          inputPlaceholder: "例如：保持轻松幽默的风格...",
          resultMode: "text",
        },
        {
          id: "creation.polish",
          title: "润色",
          description: "提升文字表现力",
          functionKey: "polish",
          inputLabel: "润色要求",
          inputPlaceholder: "例如：提升文字的表现力和感染力...",
          resultMode: "text",
        },
        {
          id: "creation.deslop",
          title: "去AI味",
          description: "去除AI生成痕迹",
          functionKey: "deslop",
          inputLabel: "去AI味要求",
          inputPlaceholder: "例如：去除AI常见表达，让文字更自然...",
          resultMode: "text",
        },
      ];
    }

    return [];
  }, [view.type, zone]);

  useRegisterAiActions(aiActions);

  return (
    <PanelContainer>
      <PanelGroup direction="horizontal">
        <Panel
          title="大纲"
          defaultSize={210}
          minSize={160}
          maxSize={320}
          collapsible
          actions={
            <div className={styles.addWrapper}>
              <button
                className={styles.addBtn}
                onClick={() => setAddMenuOpen(!addMenuOpen)}
              >
                <PlusOutlined />
              </button>
              {addMenuOpen && (
                <div className={styles.addMenu}>
                  <div className={styles.addMenuItem} onClick={handleAddVolume}>
                    新建卷
                  </div>
                  {volumes.length > 0 && (
                    <div className={styles.addMenuItem} onClick={handleAddChapter}>
                      新建章
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        >
          <NavigationTree zone={zone} />
        </Panel>

        <Divider />

        <Panel
          title={
            view.type === "outline" ? "总纲编辑"
            : view.type === "volume-form" ? "卷纲编辑"
            : view.type === "chapter-form" ? "章纲编辑"
            : view.type === "content-editor" ? "正文编辑"
            : "创作台"
          }
          flexible
          minSize={400}
        >
          <CenterContent bookId={bookId} zone={zone} />
        </Panel>
      </PanelGroup>
    </PanelContainer>
  );
}
