/**
 * This module contains the core types for the library
 * @module
 */

export type Frameworks = "svelte" | "preact" | "react";
export type Runtimes = "nodejs" | "bun" | "deno";
export type BuildTargets = "npm" | "spa" | "mountable";

export type OkErr<T> = [ok: T, err: null] | [ok: null, err: Error];

export interface BundlemeupFlags {
  command: "info" | "dev" | "build";
  framework?: Frameworks;
  externals?: string;
  forNpm?: boolean;
  forMountable?: boolean;
  forSpa?: boolean;
  cwd?: string;
  cssTw?: boolean;
}
