/**
 * Mount File Plugin for esbuild
 * 
 * This plugin generates a mount.js file after the build completes. The mount file
 * is responsible for initializing and mounting the application to the DOM.
 * 
 * It analyzes the build's metafile to find the correct chunk paths for the bundle
 * and framework code, then generates appropriate mounting code based on the framework
 * being used (React, Preact, or Svelte).
 * 
 * The generated mount.js file exports mount() and unmount() functions and automatically
 * calls mount() to initialize the application.
 */

import type { ProjectData } from "../project-data.ts";
import type * as esbuild from "esbuild";
import { createMountCode } from "../framework-mounts.ts";

/**
 * Searches through the esbuild metafile to find the output path for a specific entry chunk.
 * 
 * @param metafile - The esbuild metafile containing build output information
 * @param entryName - The name of the entry point to find (e.g., '_bundle', '_framework')
 * @returns The relative path to the chunk, or null if not found
 */
function findChunkPath(metafile: esbuild.Metafile, entryName: string): string | null {
  for (const [outputPath, output] of Object.entries(metafile.outputs)) {
    if (output.entryPoint && output.entryPoint.includes(entryName)) {
      return outputPath.replace('dist/', './');
    }
  }
  return null;
}

/**
 * Generates mount code for projects with external dependencies.
 * Creates framework-specific mounting logic that imports framework dependencies externally.
 * 
 * @param framework - The framework being used ('react', 'preact', or 'svelte')
 * @param appImportSpecifier - The import path to the application bundle
 * @returns The generated mount code as a string
 */
function createMountCodeWithExternals(framework: string, appImportSpecifier: string): string {
  switch (framework) {
    case "react":
      return `
import App from "${appImportSpecifier}";
import React from 'react';
import { createRoot } from 'react-dom/client';

let rootInstance = null;
let rootElement = null;

export function mount(domId = "root") {
  const root = document.getElementById(domId);
  if (!root) {
    throw new Error(\`Root element with id "\${domId}" not found\`);
  }

  if (rootInstance) {
    rootInstance.unmount();
  }

  rootElement = root;
  rootInstance = createRoot(root);

  rootInstance.render(
    React.createElement(React.StrictMode, null, React.createElement(App, null))
  );

  return rootInstance;
}

export function unmount() {
  if (rootInstance) {
    rootInstance.unmount();
    rootInstance = null;
    rootElement = null;
  }
}`;

    case "preact":
      return `
import App from "${appImportSpecifier}";
import { render, h } from 'preact';

let rootInstance = null;
let rootElement = null;

export function mount(domId = "root") {
  const root = document.getElementById(domId);
  if (!root) {
    throw new Error(\`Root element with id "\${domId}" not found\`);
  }

  if (rootInstance) {
    unmount();
  }

  rootElement = root;
  rootInstance = render(h(App, null), root);

  return rootInstance;
}

export function unmount() {
  if (rootInstance && rootElement) {
    render(null, rootElement);
    rootInstance = null;
    rootElement = null;
  }
}`;

    case "svelte":
      return `
import App from "${appImportSpecifier}";
import { mount as svelteMount } from 'svelte';

let componentInstance = null;

export function mount(domId = "root") {
  const root = document.getElementById(domId);
  if (!root) {
    throw new Error(\`Root element with id "\${domId}" not found\`);
  }

  if (componentInstance) {
    unmount();
  }

  componentInstance = svelteMount(App, {
    target: root,
  });

  return componentInstance;
}

export function unmount() {
  if (componentInstance) {
    componentInstance.$destroy();
    componentInstance = null;
  }
}`;

    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}

/**
 * Creates an esbuild plugin that generates a mount.js file after the build.
 * 
 * @param projectData - Project configuration containing framework and dependency information
 * @param outdir - The output directory where the mount.js file will be written
 * @returns An esbuild plugin that generates the mount file on build completion
 */
export function createMountFilePlugin(projectData: ProjectData, outdir: string): esbuild.Plugin {
  return {
    name: "bundlemeup-mount-file",
    setup(build) {
      build.onEnd(async (result) => {
        if (!result.metafile) {
          throw new Error("Metafile is required for mount file generation");
        }

        const bundlePath = findChunkPath(result.metafile, '_bundle') || './bundle.js';
        const frameworkPath = projectData.externalDeps 
          ? null 
          : findChunkPath(result.metafile, '_framework') || './framework.js';

        let mountCode: string;
        if (frameworkPath) {
          mountCode = createMountCode(projectData.framework, bundlePath, frameworkPath);
        } else {
          mountCode = createMountCodeWithExternals(projectData.framework, bundlePath);
        }
        
        const mountPath = `${outdir}/mount.js`;
        await Deno.writeTextFile(mountPath, mountCode + '\n\nmount();');
      });
    },
  };
}
