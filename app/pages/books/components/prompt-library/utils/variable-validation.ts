/**
 * Variable validation utilities for the prompt editor.
 *
 * Re-exports `validateTemplateVariables` from shared types and provides
 * additional helpers for UI integration (e.g. building error messages).
 */

import {
  PROMPT_VARIABLES,
  validateTemplateVariables as _validateTemplateVariables,
  type PromptVariable,
} from "@/shared/types";

export { PROMPT_VARIABLES, _validateTemplateVariables as validateTemplateVariables };

/**
 * Look up a built-in variable definition by its name.
 * Returns `undefined` if the name is not a registered built-in variable.
 */
export function getBuiltinVariable(name: string): PromptVariable | undefined {
  return PROMPT_VARIABLES.find((v) => v.name === name);
}

/**
 * Validate a template string and return user-friendly error messages
 * for any undefined variable references found.
 *
 * @param template - The raw template string to validate
 * @returns Array of human-readable error strings (empty when valid)
 */
export function getTemplateValidationErrors(template: string): string[] {
  const undefinedVars = _validateTemplateVariables(template);
  return undefinedVars.map(
    (varName) => `未定义的变量 "${varName}"，可用变量: ${PROMPT_VARIABLES.map((v) => `\${${v.name}}`).join(", ")}`,
  );
}
