"use client";

import { RobotOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import type { Book } from "@/app/types";
import { workspacePanels } from "./config/workspace-panels";
import { useWorkspacePersist } from "./hooks/use-workspace-persist";
import { AiProvider, useAiContext } from "./context/ai-context";
import { AiAgentPanel } from "./components/ai-agent-panel";
import {
  PanelContainer,
  PanelGroup,
  Panel,
  Divider,
} from "@/shared/ui/panel-container";
import styles from "./index.module.css";

interface BookWorkspaceProps {
  book: Book;
  onBack: () => void;
}

export default function BookWorkspace({ book, onBack }: BookWorkspaceProps) {
  return (
    <AiProvider bookId={book.id}>
      <BookWorkspaceInner book={book} onBack={onBack} />
    </AiProvider>
  );
}

function BookWorkspaceInner({ book, onBack }: BookWorkspaceProps) {
  const {
    activePanel,
    setActivePanel,
    panelSelections,
    setPanelSelection,
  } = useWorkspacePersist(book.id);

  const { visible: aiVisible, toggleVisible: toggleAi } = useAiContext();

  return (
    <div className={styles.container}>
      {/* Activity Bar */}
      <div className={styles.activityBar}>
        {workspacePanels.map((panel) => (
          <button
            key={panel.key}
            className={`${styles.activityButton} ${styles.activityTooltip} ${
              activePanel === panel.key ? styles.activityButtonActive : ""
            }`}
            data-tooltip={panel.title}
            aria-label={panel.title}
            onClick={() => setActivePanel(panel.key)}
          >
            {panel.icon}
          </button>
        ))}
        <div className={styles.activitySpacer} />
        {/* AI 面板切换按钮 */}
        <button
          className={`${styles.activityButton} ${styles.activityTooltip} ${
            aiVisible ? styles.activityButtonActive : ""
          }`}
          data-tooltip="AI 助手"
          aria-label="AI 助手"
          onClick={toggleAi}
        >
          <RobotOutlined />
        </button>
        <button
          className={`${styles.activityButton} ${styles.activityTooltip}`}
          data-tooltip="返回"
          aria-label="返回"
          onClick={onBack}
        >
          <ArrowLeftOutlined />
        </button>
      </div>

      {/* 三栏布局：内容区 + AI 面板 */}
      <PanelContainer>
        <PanelGroup direction="horizontal">
          {/* 中间内容区 - flexible 自适应 */}
          <Panel flexible minSize={400}>
            <div className={styles.contentArea}>
              <div className={styles.contentBody}>
                {workspacePanels.map((panel) => {
                  if (activePanel !== panel.key) return null;
                  return (
                    <div key={panel.key} className={styles.panelWrapper}>
                      {panel.component({
                        book,
                        activeId: panelSelections[panel.key],
                        onActiveChange: (id: string) =>
                          setPanelSelection(panel.key, id),
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>

          {/* 右侧 AI 面板 - 始终存在，可折叠 */}
          <Divider />
          <Panel
            title="AI 助手"
            defaultSize={280}
            minSize={240}
            maxSize={400}
            collapsible
            collapsed={!aiVisible}
            onToggleCollapse={toggleAi}
          >
            <AiAgentPanel />
          </Panel>
        </PanelGroup>
      </PanelContainer>
    </div>
  );
}
