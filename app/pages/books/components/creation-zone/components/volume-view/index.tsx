"use client";

import { Button, Tag, Empty } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { VolumeOutline } from "@/app/types";

interface Props {
  volume: VolumeOutline | undefined;
  onEdit: () => void;
}

export function VolumeView({ volume, onEdit }: Props) {
  if (!volume) return <Empty description="未找到卷纲" />;
  const highlights = volume.highlights ? volume.highlights.split(/[，,]/).filter(Boolean) : [];
  const arcSteps = volume.developmentArc ? volume.developmentArc.split("→").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text)" }}>{volume.title}</span>
          <Tag color="red">卷纲</Tag>
        </div>
        <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>编辑卷纲</Button>
      </div>

      {volume.coreConflict && (
        <div style={{ background: "var(--panel-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>核心冲突</div>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text)" }}>{volume.coreConflict}</div>
        </div>
      )}

      {arcSteps.length > 0 && (
        <div style={{ background: "var(--panel-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>发展弧线</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {arcSteps.map((step, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Tag>{step}</Tag>
                {i < arcSteps.length - 1 && <span style={{ color: "var(--accent)" }}>→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {volume.keyPoints.length > 0 && (
        <div style={{ background: "var(--panel-soft)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16, borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>重要节点</div>
          {volume.keyPoints.map((kp, i) => (
            <div key={i} style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>
              <span style={{ color: "var(--jade)" }}>●</span> {kp.chapter}：{kp.description}
            </div>
          ))}
        </div>
      )}

      {highlights.length > 0 && (
        <div style={{ background: "var(--panel-soft)", padding: 16, borderRadius: "var(--radius-md)", borderLeft: "3px solid var(--jade)" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "var(--jade)", marginBottom: 8 }}>预计看点</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {highlights.map((h, i) => (
              <Tag key={i} color="green">{h}</Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
