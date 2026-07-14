"use client";

import { Card, Space, Typography } from "antd";
import {
  ThunderboltOutlined,
  EditOutlined,
  HighlightOutlined,
  ClearOutlined,
  ReadOutlined,
  SearchOutlined,
  BulbOutlined,
  FormOutlined,
} from "@ant-design/icons";
import type { Scene, QuickAction } from "../../../../context/ai-context";
import styles from "./index.module.css";

const { Text, Paragraph } = Typography;

/** Icon mapping for quick actions */
const ACTION_ICONS: Record<string, React.ReactNode> = {
  EditOutlined: <EditOutlined />,
  HighlightOutlined: <HighlightOutlined />,
  ClearOutlined: <ClearOutlined />,
  ReadOutlined: <ReadOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  SearchOutlined: <SearchOutlined />,
  BulbOutlined: <BulbOutlined />,
  FormOutlined: <FormOutlined />,
};

function getActionIcon(iconName: string): React.ReactNode {
  return ACTION_ICONS[iconName] || <ThunderboltOutlined />;
}

interface QuickActionsProps {
  scene: Scene;
  onActionClick: (action: QuickAction) => void;
  disabled?: boolean;
}

export function QuickActions({
  scene,
  onActionClick,
  disabled = false,
}: QuickActionsProps) {
  if (!scene.quickActions || scene.quickActions.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text type="secondary">暂无快速操作</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>
        <ThunderboltOutlined />
        <Text strong>{scene.name}</Text>
      </div>
      <Paragraph type="secondary" className={styles.description}>
        {scene.description}
      </Paragraph>
      <div className={styles.grid}>
        {scene.quickActions.map((action) => (
          <Card
            key={action.id}
            hoverable
            className={styles.actionCard}
            onClick={() => !disabled && onActionClick(action)}
          >
            <Space direction="vertical" size="small">
              <div className={styles.actionIcon}>
                {getActionIcon(action.icon)}
              </div>
              <Text strong className={styles.actionName}>
                {action.name}
              </Text>
              <Text type="secondary" className={styles.actionDescription}>
                {action.description}
              </Text>
            </Space>
          </Card>
        ))}
      </div>
    </div>
  );
}