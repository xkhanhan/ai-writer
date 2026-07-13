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
  actionsRef.current = actions;

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
  const [registrations, setRegistrations] = useState<
    Record<string, Registration>
  >({});

  const toggleVisible = useCallback(() => setVisible((v) => !v), []);

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
        value={{ actions: allActions, visible, toggleVisible, bookId }}
      >
        {children}
      </AiContext.Provider>
    </AiRegistrationContext.Provider>
  );
}
