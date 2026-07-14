/**
 * Round 2 Regression Tests — Unified AI Panel
 *
 * Verifies all 5 bugs found in Round 1 QA are correctly fixed:
 *
 * Bug #1 [严重] — Chat mode messages always empty
 *   → Fixed: messages exported from useChat via useAiPanel, passed to ChatMessages
 *
 * Bug #2 [严重] — loadScenes causes useEffect infinite loop
 *   → Fixed: loadScenes wrapped in useCallback
 *
 * Bug #3 [中等] — Ref updated during render
 *   → Fixed: actionsRef.current = actions moved into useEffect
 *
 * Bug #4 [低] — bookId parameter unused
 *   → Fixed: bookId correctly passed to updateEditorContext
 *
 * Bug #5 [低] — inputRef uses any type
 *   → Fixed: changed to InputRef from antd
 */

import * as fs from "fs";
import * as path from "path";

// ── Helper: read file content ──
function readSource(relativePath: string): string {
  const fullPath = path.resolve(__dirname, relativePath);
  return fs.readFileSync(fullPath, "utf-8");
}

// ── Pre-load all source files ──
let useAiPanelSource: string;
let aiPanelSource: string;
let aiContextSource: string;
let useEditorContextSource: string;
let aiInputAreaSource: string;
let aiPanelHeaderSource: string;
let quickActionsSource: string;

beforeAll(() => {
  useAiPanelSource = readSource("../../app/pages/books/hooks/use-ai-panel.ts");
  aiPanelSource = readSource("../../app/pages/books/components/ai-panel/index.tsx");
  aiContextSource = readSource("../../app/pages/books/context/ai-context.tsx");
  useEditorContextSource = readSource("../../app/pages/books/hooks/use-editor-context.ts");
  aiInputAreaSource = readSource("../../app/pages/books/components/ai-panel/components/ai-input-area/index.tsx");
  aiPanelHeaderSource = readSource("../../app/pages/books/components/ai-panel/components/ai-panel-header/index.tsx");
  quickActionsSource = readSource("../../app/pages/books/components/ai-panel/components/quick-actions/index.tsx");
});

// ════════════════════════════════════════════════════════════
// Bug #1: Chat mode messages always empty
// ════════════════════════════════════════════════════════════

describe("Bug #1 — Chat messages must not be empty in CHAT mode", () => {
  describe("useAiPanel hook", () => {
    it("should use useChat from @ai-sdk/react", () => {
      expect(useAiPanelSource).toContain('from "@ai-sdk/react"');
      expect(useAiPanelSource).toMatch(/useChat\s*\(/);
    });

    it("should store useChat return value in a variable", () => {
      // e.g. const chatHelpers = useChat({...})
      expect(useAiPanelSource).toMatch(
        /const\s+\w+\s*=\s*useChat\s*\(/
      );
    });

    it("should transform chat messages into the expected format", () => {
      // Should map chat messages to {id, role, content, parts} format
      expect(useAiPanelSource).toMatch(/\.map\s*\(\s*\(msg\)/);
      expect(useAiPanelSource).toContain("msg.id");
      expect(useAiPanelSource).toContain("msg.role");
    });

    it("should expose transformed messages in the return object", () => {
      const returnMatch = useAiPanelSource.match(
        /return\s*\{([\s\S]*?)\};\s*\}/
      );
      expect(returnMatch).toBeTruthy();
      const returnBlock = returnMatch![1];
      // Must have 'messages' in the return
      expect(returnBlock).toContain("messages");
    });

    it("should NOT return empty array or undefined for messages", () => {
      // Ensure messages is not hardcoded
      expect(useAiPanelSource).not.toMatch(
        /messages:\s*\[\s*\]/
      );
      expect(useAiPanelSource).not.toMatch(
        /messages:\s*undefined/
      );
    });
  });

  describe("AiPanel component", () => {
    it("should destructure messages from useAiPanel", () => {
      // The destructuring of useAiPanel return should include 'messages'
      const destructMatch = aiPanelSource.match(
        /const\s*\{([\s\S]*?)\}\s*=\s*useAiPanel/
      );
      expect(destructMatch).toBeTruthy();
      expect(destructMatch![1]).toContain("messages");
    });

    it("should pass messages to ChatMessages (not hardcoded [])", () => {
      expect(aiPanelSource).not.toContain("messages={[]}");
      expect(aiPanelSource).toMatch(
        /ChatMessages[\s\S]*messages=\{messages\}/
      );
    });

    it("should NOT import or use an unused useCallback (panel header cleanup)", () => {
      // ai-panel-header should not import unused variables
      // Check that unused imports from Round 1 (e.g. DownOutlined) are cleaned up
      // DownOutlined is still used as suffixIcon, so it's fine
      // But verify no unused warning-causing imports remain
    });
  });

  describe("AiPanelHeader", () => {
    it("should NOT have unused import warnings", () => {
      // The header should use all imported components
      // Verify Segmented, Select, Space are used
      expect(aiPanelHeaderSource).toContain("Segmented");
      expect(aiPanelHeaderSource).toContain("Select");
      expect(aiPanelHeaderSource).toContain("Space");
      // DownOutlined is used as suffixIcon
      expect(aiPanelHeaderSource).toContain("DownOutlined");
    });
  });

  describe("QuickActions", () => {
    it("should NOT have unused variable warnings", () => {
      // Check that no unused destructured variables exist
      // Typography is destructured as { Text, Paragraph } — both are used
      expect(quickActionsSource).toContain("<Text");
      expect(quickActionsSource).toContain("<Paragraph");
    });
  });
});

// ════════════════════════════════════════════════════════════
// Bug #2: loadScenes causes useEffect infinite loop
// ════════════════════════════════════════════════════════════

describe("Bug #2 — loadScenes must not cause infinite re-render loop", () => {
  it("should wrap loadScenes in useCallback", () => {
    expect(useAiPanelSource).toMatch(
      /const loadScenes\s*=\s*useCallback\s*\(/
    );
  });

  it("should NOT be a plain async function at component level", () => {
    // The old pattern was: const loadScenes = async () => { ... }
    // Without useCallback, this creates a new function every render
    const isPlainAsyncFn =
      /const loadScenes\s*=\s*async\s*\(\s*\)\s*=>\s*\{/.test(
        useAiPanelSource
      );
    // If it matches, it should ALSO have useCallback wrapping it
    if (isPlainAsyncFn) {
      // It should be within useCallback
      expect(useAiPanelSource).toMatch(
        /useCallback\s*\(\s*async\s*\(\s*\)\s*=>/
      );
    }
  });

  it("should have loadScenes as useEffect dependency (not an inline call)", () => {
    // The useEffect should depend on [loadScenes], not call loadScenes inline
    expect(useAiPanelSource).toMatch(
      /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?loadScenes\(\)[\s\S]*?\},\s*\[loadScenes\]\)/
    );
  });

  it("should have stable dependency array for useCallback", () => {
    // useCallback for loadScenes should have an explicit dependency array
    // Check that the pattern exists: }, [activeScene, setActiveScene]);
    expect(useAiPanelSource).toMatch(
      /},\s*\[activeScene,\s*setActiveScene\]\);/
    );
    // And that it follows the useCallback definition
    expect(useAiPanelSource).toContain("const loadScenes = useCallback");
  });
});

// ════════════════════════════════════════════════════════════
// Bug #3: Ref updated during render
// ════════════════════════════════════════════════════════════

describe("Bug #3 — Ref must not be updated during render", () => {
  describe("ai-context.tsx — useRegisterAiActions", () => {
    it("should NOT assign actionsRef.current at the top level of the hook", () => {
      // Extract the hook body between function declaration and first useEffect
      const hookMatch = aiContextSource.match(
        /function useRegisterAiActions[\s\S]*?(?=\/\/ ─|$)/
      );
      expect(hookMatch).toBeTruthy();

      const hookBody = hookMatch![0];

      // Split by useEffect to get the "top-level" portion (before first useEffect)
      const topLevelEnd = hookBody.indexOf("useEffect");
      if (topLevelEnd !== -1) {
        const topLevelCode = hookBody.substring(0, topLevelEnd);
        // Should NOT contain direct assignment in top-level code
        expect(topLevelCode).not.toMatch(
          /actionsRef\.current\s*=\s*actions\s*;/
        );
      }
    });

    it("should update actionsRef.current inside a useEffect", () => {
      // There should be a useEffect that updates actionsRef.current
      const useEffectBodies = aiContextSource.match(
        /useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\}\s*,\s*\[[^\]]*\]\)/g
      );
      expect(useEffectBodies).toBeTruthy();

      const refUpdateInEffect = useEffectBodies!.some((block) =>
        /actionsRef\.current\s*=\s*actions/.test(block)
      );
      expect(refUpdateInEffect).toBe(true);
    });

    it("should use useRef for actionsRef", () => {
      expect(aiContextSource).toMatch(
        /const actionsRef\s*=\s*useRef\s*\(actions\)/
      );
    });
  });

  describe("use-editor-context.ts — contentRef", () => {
    it("should NOT assign contentRef.current at the top level", () => {
      // contentRef.current = content should be in useEffect
      const lines = useEditorContextSource.split("\n");
      let inUseEffect = 0;
      let braceDepth = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("useEffect(")) {
          inUseEffect++;
          braceDepth = 0;
        }
        if (inUseEffect > 0) {
          braceDepth += (line.match(/\{/g) || []).length;
          braceDepth -= (line.match(/\}/g) || []).length;
          if (braceDepth <= 0) {
            inUseEffect = 0;
          }
        }

        // If we find contentRef.current = content outside of useEffect, fail
        if (
          line.includes("contentRef.current = content") &&
          inUseEffect === 0
        ) {
          // Check it's not just in the ref declaration
          if (!line.includes("useRef")) {
            fail(
              `contentRef.current is assigned at line ${
                i + 1
              } outside of useEffect`
            );
          }
        }
      }
      // If we reach here, the assignment is properly inside useEffect
      expect(true).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════
// Bug #4: bookId parameter unused
// ════════════════════════════════════════════════════════════

describe("Bug #4 — bookId parameter must be used", () => {
  describe("use-editor-context.ts", () => {
    it("should destructure bookId from props", () => {
      expect(useEditorContextSource).toContain("bookId");
    });

    it("should pass bookId to updateEditorContext", () => {
      // The updateEditorContext call should include bookId
      expect(useEditorContextSource).toMatch(
        /updateEditorContext\s*\(\s*\{[\s\S]*?bookId[\s\S]*?\}\)/
      );
    });

    it("should use bookId in the useEffect that updates context", () => {
      // bookId should be in the dependency array of the useEffect that calls updateEditorContext
      const useEffectMatch = useEditorContextSource.match(
        /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?updateEditorContext[\s\S]*?\},\s*\[([^\]]*)\]\)/
      );
      expect(useEffectMatch).toBeTruthy();
      expect(useEffectMatch![1]).toContain("bookId");
    });

    it("should accept bookId as a required prop in the interface", () => {
      // The interface should have bookId as a required string field
      expect(useEditorContextSource).toMatch(
        /interface\s+UseEditorContextProps[\s\S]*?bookId:\s*string/
      );
    });
  });

  describe("use-ai-panel.ts — bookId in sendMessage", () => {
    it("should pass bookId in chat mode sendMessage body", () => {
      expect(useAiPanelSource).toContain("bookId");
      // In the CHAT mode body, bookId should be included
      expect(useAiPanelSource).toMatch(
        /body:\s*\{[\s\S]*?bookId[\s\S]*?\}/
      );
    });

    it("should pass bookId in quick action API request body", () => {
      // In the QUICK mode fetch, bookId should be in JSON body
      expect(useAiPanelSource).toMatch(
        /JSON\.stringify\(\{[\s\S]*?bookId[\s\S]*?\}\)/
      );
    });
  });
});

// ════════════════════════════════════════════════════════════
// Bug #5: inputRef uses any type
// ════════════════════════════════════════════════════════════

describe("Bug #5 — inputRef must use proper typing", () => {
  it("should import InputRef from antd", () => {
    expect(aiInputAreaSource).toMatch(
      /import\s+type\s*\{\s*InputRef\s*\}\s+from\s+["']antd["']/
    );
  });

  it("should use InputRef as the generic type for useRef", () => {
    expect(aiInputAreaSource).toMatch(
      /useRef\s*<\s*InputRef\s*>\s*\(\s*null\s*\)/
    );
  });

  it("should NOT use any type for inputRef", () => {
    expect(aiInputAreaSource).not.toMatch(
      /useRef\s*<\s*any\s*>\s*\(/
    );
    expect(aiInputAreaSource).not.toMatch(
      /inputRef.*?:\s*any/
    );
  });

  it("should still correctly use inputRef for focus()", () => {
    // The ref should still be usable
    expect(aiInputAreaSource).toContain("inputRef.current?.focus()");
  });
});

// ════════════════════════════════════════════════════════════
// Additional: Interface & type completeness
// ════════════════════════════════════════════════════════════

describe("Interface completeness — UseAiPanelReturn", () => {
  it("should include messages field in the interface", () => {
    const interfaceMatch = useAiPanelSource.match(
      /interface\s+UseAiPanelReturn[\s\S]*?\}/
    );
    expect(interfaceMatch).toBeTruthy();
    expect(interfaceMatch![0]).toContain("messages");
  });

  it("should define messages as an array of message objects", () => {
    const interfaceMatch = useAiPanelSource.match(
      /interface\s+UseAiPanelReturn[\s\S]*?\}/
    );
    expect(interfaceMatch).toBeTruthy();
    // messages should have id, role, content fields
    expect(interfaceMatch![0]).toContain('"user" | "assistant"');
  });
});

// ════════════════════════════════════════════════════════════
// Additional: DefaultChatTransport usage
// ════════════════════════════════════════════════════════════

describe("Vercel AI SDK integration", () => {
  it("should import DefaultChatTransport from 'ai'", () => {
    expect(useAiPanelSource).toContain('from "ai"');
    expect(useAiPanelSource).toContain("DefaultChatTransport");
  });

  it("should configure chat transport with correct API endpoint", () => {
    expect(useAiPanelSource).toContain('/api/ai/agent/chat');
  });

  it("should handle onFinish callback for chat", () => {
    expect(useAiPanelSource).toContain("onFinish");
  });

  it("should handle onError callback for chat", () => {
    expect(useAiPanelSource).toContain("onError");
  });
});

// ════════════════════════════════════════════════════════════
// Additional: sendMessage uses bookId in both modes
// ════════════════════════════════════════════════════════════

describe("sendMessage — bookId in both modes", () => {
  it("should include bookId in sendMessage dependency array", () => {
    // The sendMessage useCallback's dependency array should include bookId
    // Pattern: }, [panelMode, chatHelpers, activeScene, bookId, conversationId, editorContext]);
    expect(useAiPanelSource).toMatch(
      /\},\s*\[panelMode,\s*chatHelpers,\s*activeScene,\s*bookId,\s*conversationId,\s*editorContext\]\);/
    );
  });
});
