"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { AiAction } from "@/shared/ai/ai-action";

/** 面板模式 */
export type PanelMode = "QUICK" | "CHAT";

/** 编辑器上下文 */
export interface EditorContext {
  content: string;
  selectedText: string | null;
  chapterId: string | null;
  chapterTitle: string | null;
  bookTitle: string | null;
  bookId: string | null;
  wordCount: number;
  cursorPosition: number | null;
}

/** 场景定义 */
export interface Scene {
  id: string;
  name: string;
  description: string;
  icon: string;
  functionKey: string;
  quickActions: QuickAction[];
}

/** 快速操作定义 */
export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompt: string;
}

/** AI Context 值 */
interface AiContextValue {
  /** 当前页面注册的 AI 操作列表 */
  actions: AiAction[];
  /** AI 面板是否可见 */
  visible: boolean;
  /** 切换 AI 面板可见性 */
  toggleVisible: () => void;
  /** bookId */
  bookId: string;
  /** 面板模式 */
  panelMode: PanelMode;
  /** 设置面板模式 */
  setPanelMode: (mode: PanelMode) => void;
  /** 编辑器上下文 */
  editorContext: EditorContext;
  /** 更新编辑器上下文 */
  updateEditorContext: (ctx: Partial<EditorContext>) => void;
  /** 当前活跃场景 */
  activeScene: Scene | null;
  /** 设置活跃场景 */
  setActiveScene: (scene: Scene | null) => void;
}

const AiContext = createContext<AiContextValue | null>(null);

export function useAiContext() {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAiContext must be used within AiProvider");
  return ctx;
}

// ─── 注册 hook ───

/** 页面调用此 hook 注册当前可用的 AI 操作。组件卸载时自动清除。 */
export function useRegisterAiActions(actions: AiAction[]) {
  const { setRegistration } = useAiRegistrationContext();
  const key = actions.length > 0 ? actions[0].id.split(".")[0] : "unknown";

  // 用 ref 存最新 actions，避免 useEffect 依赖频繁变化
  const actionsRef = useRef(actions);

  // Update ref in effect to avoid accessing during render
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    setRegistration(key, { actions: actionsRef.current });
    return () => setRegistration(key, null);
  }, [key, setRegistration]);
}

// ─── 内部 Registration Context ───

interface Registration {
  actions: AiAction[];
}

const AiRegistrationContext = createContext<{
  setRegistration: (key: string, reg: Registration | null) => void;
} | null>(null);

function useAiRegistrationContext() {
  const ctx = useContext(AiRegistrationContext);
  if (!ctx)
    throw new Error("useRegisterAiActions must be used within AiProvider");
  return ctx;
}

// ─── Provider ───

export function AiProvider({
  bookId,
  children,
}: {
  bookId: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("QUICK");
  const [registrations, setRegistrations] = useState<
    Record<string, Registration>
  >({});
  const [editorContext, setEditorContext] = useState<EditorContext>({
    content: "",
    selectedText: null,
    chapterId: null,
    chapterTitle: null,
    bookTitle: null,
    bookId: null,
    wordCount: 0,
    cursorPosition: null,
  });
  const [activeScene, setActiveScene] = useState<Scene | null>(null);

  const toggleVisible = useCallback(() => setVisible((v) => !v), []);

  const updateEditorContext = useCallback(
    (ctx: Partial<EditorContext>) => {
      setEditorContext((prev) => ({ ...prev, ...ctx }));
    },
    []
  );

  const setRegistration = useCallback(
    (key: string, reg: Registration | null) => {
      setRegistrations((prev) => {
        if (reg === null) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: reg };
      });
    },
    []
  );

  const allActions = Object.values(registrations).flatMap((r) => r.actions);

  return (
    <AiRegistrationContext.Provider value={{ setRegistration }}>
      <AiContext.Provider
        value={{
          actions: allActions,
          visible,
          toggleVisible,
          bookId,
          panelMode,
          setPanelMode,
          editorContext,
          updateEditorContext,
          activeScene,
          setActiveScene,
        }}
      >
        {children}
      </AiContext.Provider>
    </AiRegistrationContext.Provider>
  );
}
