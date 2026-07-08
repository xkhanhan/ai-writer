"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import type { Book } from "@/app/types";
import { workspacePanels } from "./config/workspace-panels";
import { useWorkspacePersist } from "./hooks/use-workspace-persist";
import styles from "./index.module.css";

interface BookWorkspaceProps {
  book: Book;
  onBack: () => void;
}

export default function BookWorkspace({ book, onBack }: BookWorkspaceProps) {
  const {
    activePanel,
    setActivePanel,
    panelSelections,
    setPanelSelection,
  } = useWorkspacePersist(book.id);

  return (
    <div className={styles.container}>
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
        <button
          className={`${styles.activityButton} ${styles.activityTooltip}`}
          data-tooltip="返回"
          aria-label="返回"
          onClick={onBack}
        >
          <ArrowLeftOutlined />
        </button>
      </div>

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
    </div>
  );
}
