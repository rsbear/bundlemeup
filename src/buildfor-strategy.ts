/**
 * This module determines a strategy for retrieving
 * a build configuration object.
 * @module
 */

import type { ProjectData } from "./project-data.ts";
import * as viteBuilders from "./vite-configs/mod.ts";
import type { BuildTargets } from "./types.ts";

export async function buildForStrategy(
  projectData: ProjectData,
  targets: BuildTargets,
) {
  if (projectData.framework === "react") {
    if (targets === "spa") {
      return await viteBuilders.reactSpa(projectData);
    }
    if (targets === "mountable") {
      return await viteBuilders.reactMountable(projectData);
    }
    if (targets === "npm") {
      return await viteBuilders.reactNpm(projectData);
    }
  }

  if (projectData.framework === "preact") {
    if (targets === "spa") {
      return await viteBuilders.preactSpa(projectData);
    }
    if (targets === "mountable") {
      return await viteBuilders.preactMountable(projectData);
    }
    if (targets === "npm") {
      return await viteBuilders.preactNpm(projectData);
    }
  }

  if (projectData.framework === "svelte") {
    if (targets === "spa") {
      return await viteBuilders.svelteSpa(projectData);
    }
    if (targets === "mountable") {
      return await viteBuilders.svelteMountable(projectData);
    }
    if (targets === "npm") {
      return await viteBuilders.svelteNpm(projectData);
    }
  }
}
