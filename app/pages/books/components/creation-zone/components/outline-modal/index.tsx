"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Input, Button, message, Spin } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { parseAiJson } from "@/shared/utils/parse-ai-json";
import type { BookOutline } from "@/app/types";

const { TextArea } = Input;

interface AiResult {
  diagnosis: { direction: string; stages: string; sellingPoints: string };
  optimized: { direction: string; stages: string; sellingPoints: string };
  suggestions: string[];
}

interface Props {
  open: boolean;
  bookId: string;
  outline: BookOutline | null;
  onClose: () => void;
  onSave: (data: { direction: string; stages: string; sellingPoints: string }) => Promise<BookOutline | null>;
}

export function OutlineModal({ open, bookId, outline, onClose, onSave }: Props) {
  const [direction, setDirection] = useState(outline?.direction ?? "");
  const [stages, setStages] = useState(outline?.stages ?? "");
  const [sellingPoints, setSellingPoints] = useState(outline?.sellingPoints ?? "");
  const [saving, setSaving] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiRawText, setAiRawText] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setDirection(outline?.direction ?? "");
      setStages(outline?.stages ?? "");
      setSellingPoints(outline?.sellingPoints ?? "");
      setAiResult(null);
      setAiRawText("");
      setAiInstruction("");
      setAiLoading(false);
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open, outline]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave({ direction, stages, sellingPoints });
      if (result) {
        message.success("总纲已保存");
        onClose();
      } else {
        message.error("保存失败");
      }
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAiOptimize = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    setAiRawText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionKey: "outline_optimize",
          bookId,
          selectedText: aiInstruction || undefined,
          extraVariables: {
            currentDirection: direction || "",
            currentStages: stages || "",
            currentSellingPoints: sellingPoints || "",
          },
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        message.error(`AI 调用失败：${errBody}`);
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        message.error("无法读取 AI 响应");
        setAiLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) {
              accumulated += parsed.content;
              setAiRawText(accumulated);
            }
          } catch {
            // skip
          }
        }
      }

      // Parse the final accumulated text as JSON
      const parsed = parseAiJson<AiResult>(accumulated);
      if (parsed.ok) {
        setAiResult(parsed.data);
      } else {
        message.warning("AI 返回格式异常，请重试");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        message.error("AI 调用失败");
      }
    } finally {
      setAiLoading(false);
      abortRef.current = null;
    }
  }, [aiLoading, bookId, direction, stages, sellingPoints, aiInstruction]);

  const handleAcceptAi = useCallback(() => {
    if (!aiResult) return;
    if (aiResult.optimized.direction) setDirection(aiResult.optimized.direction);
    if (aiResult.optimized.stages) setStages(aiResult.optimized.stages);
    if (aiResult.optimized.sellingPoints) setSellingPoints(aiResult.optimized.sellingPoints);
    setAiResult(null);
    setAiRawText("");
    message.success("已采纳 AI 优化建议");
  }, [aiResult]);

  const handleDiscardAi = useCallback(() => {
    setAiResult(null);
    setAiRawText("");
  }, []);

  return (
    <Modal
      title="总纲"
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>取消</Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>保存</Button>,
      ]}
    >
      {/* Hint */}
      <div style={{ fontSize: 12, color: "#807b74", background: "#f5f2ec", border: "1px solid #ebe7e0", borderRadius: 6, padding: "8px 12px", marginBottom: 16, lineHeight: 1.6 }}>
        总纲保持模糊，随写作推进逐步细化。不需要写细节，只写方向。
      </div>

      {/* Direction */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#4a4640", marginBottom: 4 }}>整体方向</label>
        <TextArea
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          rows={3}
          placeholder="故事的大方向"
        />
      </div>

      {/* Stages */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#4a4640", marginBottom: 4 }}>阶段划分</label>
        <TextArea
          value={stages}
          onChange={(e) => setStages(e.target.value)}
          rows={5}
          placeholder="每个阶段的大致方向，每行一个阶段"
        />
      </div>

      {/* Selling Points */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#4a4640", marginBottom: 4 }}>核心卖点</label>
        <Input
          value={sellingPoints}
          onChange={(e) => setSellingPoints(e.target.value)}
          placeholder="逗号分隔"
        />
      </div>

      {/* ─── AI Optimization Area ─── */}
      <div style={{ borderTop: "1px solid #ebe7e0", paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <Button
            icon={<ThunderboltOutlined />}
            loading={aiLoading}
            onClick={handleAiOptimize}
            size="small"
          >
            AI 优化
          </Button>
          {!aiLoading && !aiResult && (
            <input
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder={"可选：补充优化方向（如「偏爽文节奏」）"}
              style={{
                flex: 1, border: "1px solid #e0dbd3", borderRadius: 4,
                padding: "4px 8px", fontSize: 12, outline: "none",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAiOptimize(); }}
            />
          )}
        </div>

        {/* AI Loading */}
        {aiLoading && !aiRawText && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin size="small" />
            <span style={{ fontSize: 12, color: "#807b74", marginLeft: 8 }}>AI 正在分析总纲...</span>
          </div>
        )}

        {/* Streaming raw text */}
        {aiLoading && aiRawText && (
          <div style={{ fontSize: 12, color: "#4a4640", background: "#faf9f6", border: "1px solid #ebe7e0", borderRadius: 6, padding: 12, maxHeight: 240, overflowY: "auto", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono, monospace)" }}>
            {aiRawText}
          </div>
        )}

        {/* Parsed AI Result */}
        {!aiLoading && aiResult && (
          <div style={{ background: "#faf9f6", border: "1px solid #ebe7e0", borderRadius: 6, padding: 12, fontSize: 12, lineHeight: 1.8 }}>
            {/* Diagnosis */}
            <div style={{ marginBottom: 10, fontWeight: 600, color: "#4a4640" }}>诊断</div>
            {aiResult.diagnosis.direction && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: "#807b74" }}>方向：</span>
                <span>{aiResult.diagnosis.direction}</span>
              </div>
            )}
            {aiResult.diagnosis.stages && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: "#807b74" }}>阶段：</span>
                <span>{aiResult.diagnosis.stages}</span>
              </div>
            )}
            {aiResult.diagnosis.sellingPoints && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: "#807b74" }}>卖点：</span>
                <span>{aiResult.diagnosis.sellingPoints}</span>
              </div>
            )}

            {/* Suggestions */}
            {aiResult.suggestions?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, color: "#4a4640", marginBottom: 4 }}>建议</div>
                {aiResult.suggestions.map((s, i) => (
                  <div key={i} style={{ color: "#6b6560" }}>• {s}</div>
                ))}
              </div>
            )}

            {/* Optimized Preview */}
            <div style={{ fontWeight: 600, color: "#4a4640", marginBottom: 4 }}>优化预览</div>
            {aiResult.optimized.direction && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: "#807b74" }}>方向：</span>
                <span>{aiResult.optimized.direction}</span>
              </div>
            )}
            {aiResult.optimized.stages && (
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: "#807b74" }}>阶段：</span>
                <span style={{ whiteSpace: "pre-wrap" }}>{aiResult.optimized.stages}</span>
              </div>
            )}
            {aiResult.optimized.sellingPoints && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ color: "#807b74" }}>卖点：</span>
                <span>{aiResult.optimized.sellingPoints}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Button type="primary" size="small" onClick={handleAcceptAi}>采纳优化</Button>
              <Button size="small" onClick={handleDiscardAi}>放弃</Button>
              <Button size="small" onClick={handleAiOptimize}>重新生成</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
