/**
 * This module determines a strategy for retrieving
 * a build configuration object.
 * @module
 */

import type { ProjectData } from "./project-data.ts";
import * as rsbuilders from "./rsbuild-configs/mod.ts";
import type { BuildTargets } from "./types.ts";

export function buildForStrategy(
  projectData: ProjectData,
  targets: BuildTargets,
) {
  if (projectData.framework === "react") {
    if (targets === "spa") {
      return rsbuilders.reactSpa(projectData);
    }
    if (targets === "mountable") {
      return rsbuilders.reactMountable(projectData);
    }
    if (targets === "npm") {
      return rsbuilders.reactNpm(projectData);
    }
  }

  if (projectData.framework === "preact") {
    if (targets === "spa") {
      return rsbuilders.preactSpa(projectData);
    }
    if (targets === "mountable") {
      return rsbuilders.preactMountable(projectData);
    }
    if (targets === "npm") {
      return rsbuilders.preactNpm(projectData);
    }
  }

  if (projectData.framework === "svelte") {
    if (targets === "spa") {
      return rsbuilders.svelteSpa(projectData);
    }
    if (targets === "mountable") {
      return rsbuilders.svelteMountable(projectData);
    }
    if (targets === "npm") {
      return rsbuilders.svelteNpm(projectData);
    }
  }
}
