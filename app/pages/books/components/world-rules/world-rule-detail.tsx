"use client";

import { Tag } from "antd";
import type { WorldRule } from "@/app/types";
import {
  CATEGORY_META,
  SETTING_TYPE_LABELS,
  SETTING_TYPE_COLORS,
} from "./constants";
import styles from "./world-rule-detail.module.css";

interface WorldRuleDetailProps {
  activeRule: WorldRule | null;
}

export default function WorldRuleDetail({ activeRule }: WorldRuleDetailProps) {
  if (!activeRule) {
    return <div className={styles.emptyState}>选择一条规则查看详情</div>;
  }

  return (
    <div className={styles.detailBody}>
      <span className={styles.detailTime}>
        更新于 {new Date(activeRule.updatedAt).toLocaleString("zh-CN")}
      </span>

      <div className={styles.detailSection}>
        <div className={styles.detailSectionLabel}>规则内容</div>
        <div className={styles.detailSectionContent}>
          {activeRule.content || (
            <span className={styles.noContent}>暂无内容</span>
          )}
        </div>
      </div>

      {activeRule.category === "setting" && activeRule.settingType && (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionLabel}>设定规则配置</div>
          <div className={styles.detailSectionContent}>
            <div className={styles.configRow}>
              <span className={styles.configLabel}>值类型</span>
              <Tag color={SETTING_TYPE_COLORS[activeRule.settingType]}>
                {SETTING_TYPE_LABELS[activeRule.settingType]}
              </Tag>
            </div>
            {activeRule.settingType === "select" &&
              activeRule.selectOptions.length > 0 && (
                <div className={styles.configRow}>
                  <span className={styles.configLabel}>可选值</span>
                  <div className={styles.configValue}>
                    {activeRule.selectOptions.map((opt, i) => (
                      <Tag key={i}>{opt}</Tag>
                    ))}
                  </div>
                </div>
              )}
            {activeRule.settingType === "number" && (
              <div className={styles.configRow}>
                <span className={styles.configLabel}>取值范围</span>
                <span className={styles.configValue}>
                  {activeRule.numberMin} ~ {activeRule.numberMax}{" "}
                  {activeRule.numberUnit}
                </span>
              </div>
            )}
            {activeRule.content && (
              <div className={styles.configRow}>
                <span className={styles.configLabel}>校验说明</span>
                <span className={styles.configValue}>{activeRule.content}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
