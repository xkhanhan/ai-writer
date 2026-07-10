"use client";

import { Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { SettingEntity } from "@/app/types";
import { CATEGORY_FIELD_TEMPLATES } from "@/app/types";
import { INFO_FIELDS } from "@/app/constants/settings";
import styles from "./settings-detail-panel.module.css";

interface SettingsDetailPanelProps {
  activeEntity: SettingEntity;
  tagNameMap: Map<string, string>;
}

export default function SettingsDetailPanel({
  activeEntity,
  tagNameMap,
}: SettingsDetailPanelProps) {
  return (
    <div className={styles.detailBody}>
      <div className={styles.detailMeta}>
        创建于{" "}
        {new Date(activeEntity.createdAt).toLocaleString("zh-CN")} · 更新于{" "}
        {new Date(activeEntity.updatedAt).toLocaleString("zh-CN")}
      </div>

      {/* 6 个通用信息字段 */}
      <div className={styles.infoGrid}>
        {INFO_FIELDS.map((f) => {
          const val = activeEntity[f.key];
          return (
            <div key={f.key} className={styles.infoItem}>
              <div className={styles.infoLabel}>{f.label}</div>
              <div className={styles.infoValue}>
                {val || <span className={styles.infoEmpty}>暂无</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 标签区 */}
      {activeEntity.tagIds && activeEntity.tagIds.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionLabel}>标签</div>
          <div className={styles.detailSectionContent}>
            <div className={styles.tagList}>
              {activeEntity.tagIds.map((tagId) => (
                <span key={tagId} className={styles.tagItem}>
                  {tagNameMap.get(tagId) ?? tagId}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 分类专属字段 */}
      {CATEGORY_FIELD_TEMPLATES[activeEntity.category]?.length > 0 && (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionLabel}>分类专属</div>
          <div className={styles.detailSectionContent}>
            {CATEGORY_FIELD_TEMPLATES[activeEntity.category].map((f) => (
              <div key={f} className={styles.statusField}>
                <span className={styles.statusLabel}>{f}</span>
                <span className={styles.statusValue}>
                  {activeEntity.categoryFields?.[f] || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 状态信息区 */}
      <div className={styles.detailSection}>
        <div className={styles.detailSectionLabel}>
          状态信息
          <Tooltip title="状态信息随正文变化，仅记录当前快照">
            <InfoCircleOutlined className={styles.statusInfoIcon} />
          </Tooltip>
        </div>
        <div className={styles.detailSectionContent}>
          {Object.keys(activeEntity.statusFields || {}).length > 0 ? (
            <div className={styles.statusGrid}>
              {Object.entries(activeEntity.statusFields).map(([k, v]) => (
                <div key={k} className={styles.statusField}>
                  <span className={styles.statusLabel}>{k}</span>
                  <span className={styles.statusValue}>{v || "—"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.statusEmpty}>暂无状态信息</div>
          )}
        </div>
      </div>
    </div>
  );
}
