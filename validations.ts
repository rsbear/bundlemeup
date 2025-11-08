import type { Frameworks } from "./types.ts";

/**
 * Guard against an unexpected string
 */
export function validateFrameworkFlag(
  framework: string | undefined,
): [Frameworks | undefined, Error | null] {
  if (
    framework === "svelte" || framework === "react" || framework === "preact" ||
    typeof framework === "undefined"
  ) return [framework, null];
  return [undefined, Error(`You specified: ${framework} - this value will not work`)];
}
