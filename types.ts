export type Frameworks = "svelte" | "preact" | "react";
export type Runtimes = "nodejs" | "bun" | "deno";
export type DistroTarget = "npm" | "spa" | "mountable";

/**
 * Result enforces:
 *  - If the first item is null, the second item must be Error
 *  - If the first item exists, the second item must be null
 */
export type OkErr<T> =
  | [ok: T, err: null]
  | [ok: null, err: Error];
