"use client";

import { Button, Tag, Empty } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { VolumeOutline } from "@/app/types";
import styles from "./index.module.css";

interface Props {
  volume: VolumeOutline | undefined;
  onEdit: () => void;
}

export function VolumeView({ volume, onEdit }: Props) {
  if (!volume) return <Empty description="未找到卷纲" />;
  const highlights = volume.highlights ? volume.highlights.split(/[，,]/).filter(Boolean) : [];
  const arcSteps = volume.developmentArc ? volume.developmentArc.split("→").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.volumeTitle}>{volume.title}</span>
          <Tag color="red">卷纲</Tag>
        </div>
        <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>编辑卷纲</Button>
      </div>

      {volume.coreConflict && (
        <div className={styles.sectionCard} style={{ borderLeft: "3px solid var(--accent)" }}>
          <div className={styles.sectionCardTitle} style={{ color: "var(--accent)" }}>核心冲突</div>
          <div className={styles.sectionBody}>{volume.coreConflict}</div>
        </div>
      )}

      {arcSteps.length > 0 && (
        <div className={styles.sectionCard} style={{ borderLeft: "3px solid var(--accent)" }}>
          <div className={styles.sectionCardTitle} style={{ color: "var(--accent)" }}>发展弧线</div>
          <div className={styles.arcSteps}>
            {arcSteps.map((step, i) => (
              <span key={i} className={styles.arcStepItem}>
                <Tag>{step}</Tag>
                {i < arcSteps.length - 1 && <span className={styles.arcArrow}>→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {volume.keyPoints.length > 0 && (
        <div className={styles.sectionCard} style={{ borderLeft: "3px solid var(--accent)" }}>
          <div className={styles.sectionCardTitle} style={{ color: "var(--accent)" }}>重要节点</div>
          {volume.keyPoints.map((kp, i) => (
            <div key={i} className={styles.keyPointItem}>
              <span className={styles.keyPointDot}>●</span> {kp.chapter}：{kp.description}
            </div>
          ))}
        </div>
      )}

      {highlights.length > 0 && (
        <div className={styles.sectionCard} style={{ borderLeft: "3px solid var(--jade)" }}>
          <div className={styles.sectionCardTitle} style={{ color: "var(--jade)" }}>预计看点</div>
          <div className={styles.tagList}>
            {highlights.map((h, i) => (
              <Tag key={i} color="green">{h}</Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
