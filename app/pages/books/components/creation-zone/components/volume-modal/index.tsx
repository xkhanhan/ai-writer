"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Modal, Input, Button, message, Spin } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { parseAiJson } from "@/shared/utils/parse-ai-json";
import type { VolumeOutline, BookOutline } from "@/app/types";

const { TextArea } = Input;

interface AiResult {
  coreConflict: string;
  developmentArc: string;
  highlights: string;
}

interface Props {
  open: boolean;
  bookId: string;
  outline: BookOutline | null;
  volumeId?: string;
  volumes: VolumeOutline[];
  onClose: () => void;
  onSave: (data: { id?: string; title: string; coreConflict?: string; developmentArc?: string; highlights?: string }) => Promise<VolumeOutline | null>;
}

export function VolumeModal({ open, bookId, outline, volumeId, volumes, onClose, onSave }: Props) {
  const volume = volumeId ? volumes.find((v) => v.id === volumeId) : undefined;

  const [title, setTitle] = useState("");
  const [coreConflict, setCoreConflict] = useState("");
  const [developmentArc, setDevelopmentArc] = useState("");
  const [highlights, setHighlights] = useState("");
  const [saving, setSaving] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiRawText, setAiRawText] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(volume?.title ?? "");
      setCoreConflict(volume?.coreConflict ?? "");
      setDevelopmentArc(volume?.developmentArc ?? "");
      setHighlights(volume?.highlights ?? "");
      setAiResult(null);
      setAiRawText("");
      setAiInstruction("");
      setAiLoading(false);
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open, volume]);

  const handleSave = async () => {
    if (!title.trim()) {
      message.warning("请输入卷标题");
      return;
    }
    setSaving(true);
    try {
      const result = await onSave({ id: volume?.id, title, coreConflict, developmentArc, highlights });
      if (result) {
        message.success(volume ? "卷纲已更新" : "卷纲已创建");
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

  const handleAiGenerate = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    setAiRawText("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Calculate editing volume index
      const editingIndex = volume
        ? volumes.findIndex((v) => v.id === volume.id)
        : volumes.length;

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionKey: "volume_generate",
          bookId,
          selectedText: aiInstruction || undefined,
          extraVariables: {
            editingVolumeIndex: String(editingIndex),
            currentVolumeTitle: title || `第${editingIndex + 1}卷`,
            currentVolumeConflict: coreConflict,
            currentVolumeArc: developmentArc,
            currentVolumeHighlights: highlights,
            outlineDirection: outline?.direction || "",
            outlineStages: outline?.stages || "",
            outlineSellingPoints: outline?.sellingPoints || "",
          },
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        message.error("AI 调用失败");
        setAiLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setAiLoading(false); return; }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string };
            if (parsed.content) {
              accumulated += parsed.content;
              setAiRawText(accumulated);
            }
          } catch { /* skip */ }
        }
      }

      const parsed = parseAiJson<AiResult>(accumulated);
      if (parsed.ok) {
        setAiResult(parsed.data);
      } else {
        message.warning("AI 返回格式异常");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") message.error("AI 调用失败");
    } finally {
      setAiLoading(false);
      abortRef.current = null;
    }
  }, [aiLoading, bookId, title, coreConflict, developmentArc, highlights, volume, volumes, aiInstruction, outline]);

  const handleAcceptAi = useCallback(() => {
    if (!aiResult) return;
    if (aiResult.coreConflict) setCoreConflict(aiResult.coreConflict);
    if (aiResult.developmentArc) setDevelopmentArc(aiResult.developmentArc);
    if (aiResult.highlights) setHighlights(aiResult.highlights);
    setAiResult(null);
    setAiRawText("");
    message.success("已采纳 AI 生成内容");
  }, [aiResult]);

  return (
    <Modal
      title={volume ? "编辑卷纲" : "新建卷纲"}
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>取消</Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>保存</Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>卷标题</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="第一卷 · 标题"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>核心冲突</label>
        <TextArea
          value={coreConflict}
          onChange={(e) => setCoreConflict(e.target.value)}
          rows={3}
          placeholder="本卷的核心矛盾"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>发展弧线</label>
        <TextArea
          value={developmentArc}
          onChange={(e) => setDevelopmentArc(e.target.value)}
          rows={3}
          placeholder="情节发展走向"
        />
      </div>
      <div style={{ marginBottom: 0 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>预计看点</label>
        <TextArea
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          rows={2}
          placeholder="吸引读者继续阅读的钩子"
        />
      </div>

      {/* ─── AI Generate Area ─── */}
      <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16, marginTop: 20 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <Button
            icon={<ThunderboltOutlined />}
            loading={aiLoading}
            onClick={handleAiGenerate}
            size="small"
          >
            AI 生成卷纲
          </Button>
          {!aiLoading && !aiResult && (
            <input
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder={"可选：补充说明（如「偏热血路线」）"}
              style={{
                flex: 1, border: "1px solid var(--border)", borderRadius: 4,
                padding: "4px 8px", fontSize: 12, outline: "none",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAiGenerate(); }}
            />
          )}
        </div>

        {aiLoading && !aiRawText && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin size="small" />
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 8 }}>AI 正在生成卷纲...</span>
          </div>
        )}

        {aiLoading && aiRawText && (
          <div style={{
            fontSize: 12, color: "var(--text-secondary)", background: "var(--bg-muted)",
            border: "1px solid var(--border-light)", borderRadius: 6, padding: 12,
            maxHeight: 200, overflowY: "auto", lineHeight: 1.8, whiteSpace: "pre-wrap",
            fontFamily: "var(--font-mono)",
          }}>
            {aiRawText}
          </div>
        )}

        {!aiLoading && aiResult && (
          <div style={{
            background: "var(--bg-muted)", border: "1px solid var(--border-light)",
            borderRadius: 6, padding: 12, fontSize: 12, lineHeight: 1.8,
          }}>
            {aiResult.coreConflict && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>核心冲突：</span>
                <span>{aiResult.coreConflict}</span>
              </div>
            )}
            {aiResult.developmentArc && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>发展弧线：</span>
                <span>{aiResult.developmentArc}</span>
              </div>
            )}
            {aiResult.highlights && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>看点：</span>
                <span>{aiResult.highlights}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="primary" size="small" onClick={handleAcceptAi}>采纳</Button>
              <Button size="small" onClick={() => { setAiResult(null); setAiRawText(""); }}>放弃</Button>
              <Button size="small" onClick={handleAiGenerate}>重新生成</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
