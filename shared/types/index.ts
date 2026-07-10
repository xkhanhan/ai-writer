// Cross-layer shared type definitions (importable from app/ and server/)
// Domain modules split for maintainability — this barrel re-exports everything
// so existing `import { X } from "@/shared/types"` continues to work.

export * from "./book";
export * from "./chapter";
export * from "./file";
export * from "./ai";
export * from "./prompt-template";
export * from "./tag";
export * from "./world-rule";
export * from "./setting";
export * from "./fact";
export * from "./foreshadow";
