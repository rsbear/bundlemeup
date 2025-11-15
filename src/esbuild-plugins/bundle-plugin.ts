/**
 * Bundle Plugin for esbuild
 * 
 * This plugin creates virtual module resolvers for bundlemeup's internal virtual modules.
 * It handles two virtual modules:
 * - virtual:bundlemeup/bundle - Re-exports the user's entry point
 * - virtual:bundlemeup/framework - Provides framework-specific runtime exports
 * 
 * The plugin resolves these virtual module IDs and provides their contents dynamically
 * based on the project configuration (framework type, entry point, etc).
 */

import type { ProjectData } from "../project-data.ts";
import type * as esbuild from "esbuild";
import { getVirtualIds } from "../framework-mounts.ts";

/**
 * Creates an esbuild plugin that handles virtual module resolution for the bundle and framework.
 * 
 * @param projectData - Project configuration containing entry point and framework information
 * @returns An esbuild plugin that resolves virtual module imports
 */
export function createBundlePlugin(projectData: ProjectData): esbuild.Plugin {
  const { VIRTUAL_BUNDLE_ID, VIRTUAL_FRAMEWORK_ID } = getVirtualIds();

  return {
    name: "bundlemeup-bundle",
    setup(build) {
      build.onResolve({ filter: /^virtual:bundlemeup\// }, (args) => {
        return {
          path: args.path,
          namespace: "bundlemeup-virtual",
        };
      });

      build.onLoad({ filter: new RegExp(`${VIRTUAL_BUNDLE_ID}$`), namespace: "bundlemeup-virtual" }, () => {
        const entryPath = projectData.entryPoint.startsWith('/') 
          ? projectData.entryPoint 
          : `./${projectData.entryPoint}`;
        
        return {
          contents: `export { default } from "${entryPath}";`,
          loader: "js",
          resolveDir: Deno.cwd(),
        };
      });

      build.onLoad({ filter: new RegExp(`${VIRTUAL_FRAMEWORK_ID}$`), namespace: "bundlemeup-virtual" }, () => {
        let contents = '';
        if (projectData.framework === 'react') {
          contents = `
import React from 'react';
import { createRoot } from 'react-dom/client';
export { React, createRoot };
`;
        } else if (projectData.framework === 'preact') {
          contents = `
import { render, h } from 'preact';
export { render, h };
`;
        } else if (projectData.framework === 'svelte') {
          contents = `
import { mount as svelteMount } from 'svelte';
export { svelteMount as mount };
`;
        }
        
        return {
          contents,
          loader: "js",
          resolveDir: Deno.cwd(),
        };
      });
    },
  };
}
