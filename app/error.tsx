"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("应用错误:", error);
  }, [error]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      gap: 16,
      fontFamily: "var(--font-body)",
    }}>
      <h2 style={{ margin: 0, color: "var(--text)" }}>页面出了点问题</h2>
      <p style={{ margin: 0, color: "var(--ink-tertiary)", fontSize: 14 }}>
        {error.digest ? `错误码：${error.digest}` : "发生了未知错误"}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "8px 24px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-light)",
          background: "var(--panel)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        重试
      </button>
    </div>
  );
}
