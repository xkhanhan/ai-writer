/**
 * AI Panel — Chat Messages Bug Detection
 *
 * This test verifies a critical bug: the AiPanel component passes messages=[]
 * to ChatMessages, but useAiPanel() never exposes chatHelpers.messages.
 * This means chat mode will never display conversation messages.
 *
 * BUG: In ai-panel/index.tsx line 112:
 *   <ChatMessages messages={[]} ... />
 * The empty array [] is hardcoded instead of using actual chat messages.
 *
 * EXPECTED: useAiPanel should return chatMessages from useChat, and
 *           AiPanel should pass them to ChatMessages.
 */

import * as fs from "fs";
import * as path from "path";

describe("AiPanel Chat Messages Bug Detection", () => {
  let aiPanelSource: string;
  let useAiPanelSource: string;

  beforeAll(() => {
    const aiPanelPath = path.resolve(
      __dirname,
      "../../app/pages/books/components/ai-panel/index.tsx"
    );
    const useAiPanelPath = path.resolve(
      __dirname,
      "../../app/pages/books/hooks/use-ai-panel.ts"
    );

    aiPanelSource = fs.readFileSync(aiPanelPath, "utf-8");
    useAiPanelSource = fs.readFileSync(useAiPanelPath, "utf-8");
  });

  describe("useAiPanel hook — chat messages exposure", () => {
    it("should expose chat messages from useChat", () => {
      // The useChat hook returns messages, but useAiPanel doesn't include
      // them in the return value. This means the AiPanel component
      // cannot pass real messages to ChatMessages.
      const returnMatch = useAiPanelSource.match(
        /return\s*\{([\s\S]*?)\};/
      );
      expect(returnMatch).toBeTruthy();

      const returnBlock = returnMatch![1];
      // Check if 'messages' or 'chatMessages' is in the return
      expect(returnBlock).toContain("messages");
    });
  });

  describe("AiPanel component — ChatMessages messages prop", () => {
    it("should NOT pass hardcoded empty array to ChatMessages", () => {
      // Bug: ChatMessages is rendered with messages={[]}
      // This means chat messages are never displayed
      const hasHardcodedEmpty = aiPanelSource.includes(
        "messages={[]}"
      );
      expect(hasHardcodedEmpty).toBe(false);
    });

    it("should pass chat messages from useAiPanel to ChatMessages", () => {
      // The AiPanel should destructure messages from useAiPanel
      // and pass them to ChatMessages
      expect(aiPanelSource).toMatch(
        /ChatMessages[\s\S]*messages=\{[^[\]]*\}/
      );
    });
  });

  describe("useAiPanel hook — loadScenes memoization", () => {
    it("should wrap loadScenes in useCallback to prevent useEffect re-runs", () => {
      // Bug: loadScenes is defined as a plain async function inside the component,
      // but used as a dependency of useEffect. This causes the effect to re-run
      // on every render, potentially creating an infinite re-render loop.
      //
      // Expected: loadScenes should be wrapped in useCallback([])
      // or defined inside the useEffect callback.

      // Check if loadScenes is defined as a regular function (not useCallback)
      const isRegularFunction =
        /const loadScenes\s*=\s*async\s*\(\)/.test(useAiPanelSource);
      const isUseCallback =
        /const loadScenes\s*=\s*useCallback/.test(useAiPanelSource);

      // loadScenes should either be wrapped in useCallback OR
      // be defined inside the useEffect
      if (isRegularFunction) {
        // If it's a regular function, it should not be a useEffect dependency
        const useEffectMatch = useAiPanelSource.match(
          /useEffect\(\(\)\s*=>\s*\{[\s\S]*?loadScenes\(\);[\s\S]*?\},\s*\[([^\]]*)\]\)/
        );
        if (useEffectMatch) {
          const deps = useEffectMatch[1];
          // loadScenes should NOT be in deps if it's not memoized
          expect(deps).not.toContain("loadScenes");
        }
      }
    });
  });

  describe("ai-context.tsx — ref update during render", () => {
    let aiContextSource: string;

    beforeAll(() => {
      const aiContextPath = path.resolve(
        __dirname,
        "../../app/pages/books/context/ai-context.tsx"
      );
      aiContextSource = fs.readFileSync(aiContextPath, "utf-8");
    });

    it("should not update ref.current directly during render", () => {
      // Bug: actionsRef.current = actions is assigned during render
      // React docs say refs should only be accessed outside of render
      // This pattern: const actionsRef = useRef(actions); actionsRef.current = actions;
      // should be moved to useEffect or useLayoutEffect

      // Find the useRegisterAiActions hook and check for ref mutation during render
      const hookMatch = aiContextSource.match(
        /function useRegisterAiActions[\s\S]*?(?=function |$)/
      );

      if (hookMatch) {
        const hookCode = hookMatch[0];
        // Check if ref.current is ASSIGNED outside useEffect/useCallback
        const hasDirectRefAssign = /actionsRef\.current\s*=\s*actions/.test(
          hookCode
        );

        if (hasDirectRefAssign) {
          // The ref ASSIGNMENT (actionsRef.current = actions) should be inside
          // a useEffect or useLayoutEffect callback.
          // We need to check specifically for the ASSIGNMENT pattern inside useEffect,
          // not just any reference to actionsRef.current.
          //
          // Extract ONLY the useEffect callback bodies (between { and }),
          // and check if the ASSIGNMENT (with =) is inside one of them.
          const useEffectBodies = hookCode.match(
            /useEffect\(\(\)\s*=>\s*\{([\s\S]*?)\}\s*,/g
          );

          const refAssignIsInEffect = useEffectBodies?.some((block) =>
            /actionsRef\.current\s*=\s*actions/.test(block)
          );

          // The ref assignment should be inside useEffect, not at component level
          // This test currently FAILS because the assignment is at component level (line 88)
          expect(refAssignIsInEffect).toBe(true);
        }
      }
    });
  });
});
