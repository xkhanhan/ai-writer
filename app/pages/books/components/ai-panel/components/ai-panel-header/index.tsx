"use client";

import { Segmented, Select, Space } from "antd";
import {
  ThunderboltOutlined,
  MessageOutlined,
  DownOutlined,
} from "@ant-design/icons";
import type { PanelMode, Scene } from "../../../../context/ai-context";
import { AGENT_UI_TEXT } from "@/shared/constants/agent-ui";
import styles from "./index.module.css";

interface AiPanelHeaderProps {
  mode: PanelMode;
  onModeChange: (mode: PanelMode) => void;
  scenes: Scene[];
  activeScene: Scene | null;
  onSceneChange: (scene: Scene) => void;
}

/** Icon mapping for scenes */
const SCENE_ICONS: Record<string, React.ReactNode> = {
  EditOutlined: <ThunderboltOutlined />,
  HighlightOutlined: <ThunderboltOutlined />,
  ClearOutlined: <ThunderboltOutlined />,
  ReadOutlined: <ThunderboltOutlined />,
  SearchOutlined: <ThunderboltOutlined />,
  BulbOutlined: <ThunderboltOutlined />,
  FormOutlined: <ThunderboltOutlined />,
};

function getSceneIcon(iconName: string): React.ReactNode {
  return SCENE_ICONS[iconName] || <ThunderboltOutlined />;
}

export function AiPanelHeader({
  mode,
  onModeChange,
  scenes,
  activeScene,
  onSceneChange,
}: AiPanelHeaderProps) {
  const handleSceneChange = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) {
      onSceneChange(scene);
    }
  };

  return (
    <div className={styles.header}>
      {/* Mode switch */}
      <Segmented
        value={mode}
        onChange={(value) => onModeChange(value as PanelMode)}
        options={[
          {
            label: (
              <Space>
                <ThunderboltOutlined />
                <span>{AGENT_UI_TEXT.QUICK_MODE}</span>
              </Space>
            ),
            value: "QUICK",
          },
          {
            label: (
              <Space>
                <MessageOutlined />
                <span>{AGENT_UI_TEXT.CHAT_MODE}</span>
              </Space>
            ),
            value: "CHAT",
          },
        ]}
        size="small"
      />

      {/* Scene selector */}
      <Select
        value={activeScene?.id}
        onChange={handleSceneChange}
        className={styles.sceneSelect}
        placeholder={AGENT_UI_TEXT.SCENE_SELECT}
        suffixIcon={<DownOutlined />}
        options={scenes.map((scene) => ({
          label: (
            <Space>
              {getSceneIcon(scene.icon)}
              <span>{scene.name}</span>
            </Space>
          ),
          value: scene.id,
        }))}
        size="small"
      />
    </div>
  );
}