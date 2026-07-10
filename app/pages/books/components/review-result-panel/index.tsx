"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button, Spin, Checkbox } from "antd";
import {
  CloseOutlined,
  CheckOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TagsOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { showError, showSuccess } from "@/app/utils/error-handler";
import styles from "./index.module.css";

// ============================================================================
// Types
// ============================================================================

interface Fact {
  content: string;
  chapterNumber: number;
  relatedCharacters: string[];
}

interface ForeshadowChange {
  action: "plant" | "resolve";
  name: string;
  description: string;
}

interface CharacterState {
  name: string;
  changes: {
    location?: string;
    knownInfo?: string[];
    relationship?: string;
  };
}

interface ItemState {
  name: string;
  changes: {
    status: string;
  };
}

interface ReviewExtractedData {
  facts: Fact[];
  foreshadowChanges: ForeshadowChange[];
  characterStates: CharacterState[];
  itemStates: ItemState[];
}

interface ReviewMetadata {
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
}

export interface ReviewConfirmData {
  facts: Fact[];
  foreshadowChanges: ForeshadowChange[];
  characterStates: CharacterState[];
  itemStates: ItemState[];
}

interface ReviewResultPanelProps {
  visible: boolean;
  bookId: string;
  chapterId: string;
  onConfirm: (data: ReviewConfirmData) => void;
  onCancel: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatChanges(changes: Record<string, unknown>): string {
  const parts: string[] = [];
  if (changes.location != null) parts.push(`位置→${String(changes.location)}`);
  if (changes.relationship != null)
    parts.push(`关系→${String(changes.relationship)}`);
  if (changes.status != null) parts.push(`状态→${String(changes.status)}`);
  if (Array.isArray(changes.knownInfo) && changes.knownInfo.length > 0)
    parts.push(`新知→${changes.knownInfo.join(", ")}`);
  return parts.join("; ") || "无变更";
}

// ============================================================================
// Component
// ============================================================================

export function ReviewResultPanel({
  visible,
  bookId,
  chapterId,
  onConfirm,
  onCancel,
}: ReviewResultPanelProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReviewExtractedData | null>(null);
  const [metadata, setMetadata] = useState<ReviewMetadata | null>(null);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Selection state — all checked by default
  const [selectedFacts, setSelectedFacts] = useState<boolean[]>([]);
  const [selectedForeshadows, setSelectedForeshadows] = useState<boolean[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<boolean[]>([]);
  const [selectedItems, setSelectedItems] = useState<boolean[]>([]);

  const hasAutoStarted = useRef(false);

  // --- API call ---
  const callApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setRawOutput(null);
    setWarning(null);
    setMetadata(null);

    try {
      const response = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapterId }),
      });

      const json = await response.json();

      if (!response.ok || json.success === false) {
        throw new Error(json.error || "AI 审阅提取失败");
      }

      if (json.data) {
        setData(json.data);
        setMetadata(json.metadata ?? null);
        const d = json.data as ReviewExtractedData;
        setSelectedFacts(d.facts.map(() => true));
        setSelectedForeshadows(d.foreshadowChanges.map(() => true));
        setSelectedCharacters(d.characterStates.map(() => true));
        setSelectedItems(d.itemStates.map(() => true));
      } else {
        setRawOutput(json.rawOutput ?? "");
        setWarning(json.warning ?? "AI 返回内容无法解析");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 审阅提取失败";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [bookId, chapterId]);

  // Trigger once when panel becomes visible
  useEffect(() => {
    if (!visible) {
      hasAutoStarted.current = false;
      return;
    }
    if (!hasAutoStarted.current) {
      hasAutoStarted.current = true;
      void callApi();
    }
  }, [visible, callApi]);

  // --- Selection handlers ---
  const allChecked = data && data.facts.length > 0;

  const allFactsSelected = selectedFacts.length > 0 && selectedFacts.every(Boolean);
  const allForeshadowsSelected =
    selectedForeshadows.length > 0 && selectedForeshadows.every(Boolean);
  const allCharactersSelected =
    selectedCharacters.length > 0 && selectedCharacters.every(Boolean);
  const allItemsSelected = selectedItems.length > 0 && selectedItems.every(Boolean);
  const everythingSelected =
    allFactsSelected && allForeshadowsSelected && allCharactersSelected && allItemsSelected;

  const nothingSelected =
    selectedFacts.every((v) => !v) &&
    selectedForeshadows.every((v) => !v) &&
    selectedCharacters.every((v) => !v) &&
    selectedItems.every((v) => !v);

  const handleSelectAll = useCallback(() => {
    if (data) {
      setSelectedFacts(data.facts.map(() => true));
      setSelectedForeshadows(data.foreshadowChanges.map(() => true));
      setSelectedCharacters(data.characterStates.map(() => true));
      setSelectedItems(data.itemStates.map(() => true));
    }
  }, [data]);

  const handleDeselectAll = useCallback(() => {
    if (data) {
      setSelectedFacts(data.facts.map(() => false));
      setSelectedForeshadows(data.foreshadowChanges.map(() => false));
      setSelectedCharacters(data.characterStates.map(() => false));
      setSelectedItems(data.itemStates.map(() => false));
    }
  }, [data]);

  const toggleFact = useCallback(
    (idx: number) =>
      setSelectedFacts((prev) => prev.map((v, i) => (i === idx ? !v : v))),
    [],
  );

  const toggleForeshadow = useCallback(
    (idx: number) =>
      setSelectedForeshadows((prev) => prev.map((v, i) => (i === idx ? !v : v))),
    [],
  );

  const toggleCharacter = useCallback(
    (idx: number) =>
      setSelectedCharacters((prev) => prev.map((v, i) => (i === idx ? !v : v))),
    [],
  );

  const toggleItem = useCallback(
    (idx: number) =>
      setSelectedItems((prev) => prev.map((v, i) => (i === idx ? !v : v))),
    [],
  );

  const handleConfirm = useCallback(() => {
    if (!data) return;
    const confirmData: ReviewConfirmData = {
      facts: data.facts.filter((_, i) => selectedFacts[i]),
      foreshadowChanges: data.foreshadowChanges.filter((_, i) => selectedForeshadows[i]),
      characterStates: data.characterStates.filter((_, i) => selectedCharacters[i]),
      itemStates: data.itemStates.filter((_, i) => selectedItems[i]),
    };
    onConfirm(confirmData);
    showSuccess(
      `已采纳 ${confirmData.facts.length + confirmData.foreshadowChanges.length + confirmData.characterStates.length + confirmData.itemStates.length} 项`,
    );
  }, [data, selectedFacts, selectedForeshadows, selectedCharacters, selectedItems, onConfirm]);

  if (!visible) return null;

  const hasData = data !== null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <CheckOutlined />
          AI 过审结果
        </span>
        <div className={styles.headerActions}>
          {hasData && (
            <>
              {everythingSelected ? (
                <Button size="small" type="link" onClick={handleDeselectAll}>
                  取消全选
                </Button>
              ) : (
                <Button size="small" type="link" onClick={handleSelectAll}>
                  全选
                </Button>
              )}
            </>
          )}
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onCancel}
            aria-label="关闭 AI 过审结果面板"
          />
        </div>
      </div>

      <div className={styles.panelBody}>
        {loading && (
          <div className={styles.loadingState}>
            <Spin tip="正在提取章节要素..." />
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <ExclamationCircleOutlined style={{ fontSize: 24 }} />
            <span>{error}</span>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => void callApi()}>
              重试
            </Button>
          </div>
        )}

        {!loading && !error && rawOutput !== null && (
          <div className={styles.warningBlock}>
            <ExclamationCircleOutlined style={{ color: "var(--color-warning)" }} />
            <span className={styles.warningText}>{warning}</span>
            <pre className={styles.rawOutput}>{rawOutput}</pre>
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            {/* Facts section */}
            {data.facts.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <FileTextOutlined />
                  <span>提取的事实 ({data.facts.length}条)</span>
                </div>
                {data.facts.map((fact, idx) => (
                  <label
                    key={idx}
                    className={styles.checkItem}
                    role="checkbox"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleFact(idx);
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedFacts[idx]}
                      onChange={() => toggleFact(idx)}
                    />
                    <span className={styles.checkLabel}>
                      {fact.content}
                      {fact.relatedCharacters.length > 0 && (
                        <span className={styles.muted}>
                          {" "}
                          ({fact.relatedCharacters.join(", ")})
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Foreshadow changes section */}
            {data.foreshadowChanges.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <TagsOutlined />
                  <span>伏笔变更 ({data.foreshadowChanges.length}条)</span>
                </div>
                {data.foreshadowChanges.map((fs, idx) => (
                  <label
                    key={idx}
                    className={styles.checkItem}
                    role="checkbox"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleForeshadow(idx);
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedForeshadows[idx]}
                      onChange={() => toggleForeshadow(idx)}
                    />
                    <span
                      className={`${styles.badge} ${fs.action === "plant" ? styles.badgePlant : styles.badgeResolve}`}
                    >
                      {fs.action === "plant" ? "埋入" : "收回"}
                    </span>
                    <span className={styles.checkLabel}>
                      {fs.name}: {fs.description}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Character states section */}
            {data.characterStates.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <UserOutlined />
                  <span>角色状态 ({data.characterStates.length}条)</span>
                </div>
                {data.characterStates.map((char, idx) => (
                  <label
                    key={idx}
                    className={styles.checkItem}
                    role="checkbox"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleCharacter(idx);
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedCharacters[idx]}
                      onChange={() => toggleCharacter(idx)}
                    />
                    <span className={styles.checkLabel}>
                      <strong>{char.name}</strong>: {formatChanges(char.changes)}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Item states section */}
            {data.itemStates.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <SafetyCertificateOutlined />
                  <span>物品状态 ({data.itemStates.length}条)</span>
                </div>
                {data.itemStates.map((item, idx) => (
                  <label
                    key={idx}
                    className={styles.checkItem}
                    role="checkbox"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleItem(idx);
                      }
                    }}
                  >
                    <Checkbox
                      checked={selectedItems[idx]}
                      onChange={() => toggleItem(idx)}
                    />
                    <span className={styles.checkLabel}>
                      <strong>{item.name}</strong>: 状态→{item.changes.status}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Empty state */}
            {data.facts.length === 0 &&
              data.foreshadowChanges.length === 0 &&
              data.characterStates.length === 0 &&
              data.itemStates.length === 0 && (
                <div className={styles.emptyState}>AI 未从该章节中提取到任何要素。</div>
              )}
          </>
        )}
      </div>

      {metadata && (
        <div className={styles.metadata}>
          {metadata.tokensInput > 0 && (
            <span>tokens: {metadata.tokensInput}</span>
          )}
          {metadata.latencyMs > 0 && (
            <span>耗时: {(metadata.latencyMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}

      <div className={styles.panelFooter}>
        <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={() => void callApi()}>
          重新提取
        </Button>
        <Button size="small" onClick={onCancel}>
          放弃
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          disabled={loading || !!error || !hasData || nothingSelected}
          onClick={handleConfirm}
        >
          确认采纳选中项
        </Button>
      </div>
    </div>
  );
}
