/**
 * Looks at the projects lockfile to determine the runtime
 * and returns a string of the runtime.
 */

import type { Runtimes } from "../types.ts";

export function determineRuntime(): Runtimes {
  const lockFiles: Array<[string, Runtimes]> = [
    ["deno.lock", "deno"],
    ["bun.lock", "bun"],
    ["package-lock.json", "nodejs"],
  ];

  for (const [lockFile, runtime] of lockFiles) {
    try {
      Deno.statSync(lockFile);
      return runtime;
    } catch {
    }
  }

  return "nodejs";
}
