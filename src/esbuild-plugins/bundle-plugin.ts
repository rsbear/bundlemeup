/**
 * Bundle Plugin for esbuild
 * 
 * This plugin creates a single virtual entry point that combines:
 * - User's entry point (app code)
 * - Framework-specific mount/unmount logic
 * - Auto-initialization code that calls mount()
 * 
 * The result is a single bundle.js file that contains everything needed to run the app.
 */

import type { ProjectData } from "../project-data.ts";
import type * as esbuild from "esbuild";
import { getVirtualIds } from "../framework-mounts.ts";

function createBundleEntry(projectData: ProjectData): string {
  const entryPath = projectData.entryPoint.startsWith('/') 
    ? projectData.entryPoint 
    : `./${projectData.entryPoint}`;

  const externalDeps = projectData.externalDeps;
  const shouldAutoMount = projectData.buildMode !== "mountable";
  
  if (projectData.framework === 'react') {
    const importSource = externalDeps 
      ? `import React from 'react';\nimport { createRoot } from 'react-dom/client';`
      : `import React from 'react';\nimport { createRoot } from 'react-dom/client';`;
    
    const autoMountCall = shouldAutoMount ? '\nmount();' : '';
    
    return `
import App from "${entryPath}";
${importSource}

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
}${autoMountCall}
`;
  } else if (projectData.framework === 'preact') {
    const importSource = externalDeps 
      ? `import { render, h } from 'preact';`
      : `import { render, h } from 'preact';`;
    
    const autoMountCall = shouldAutoMount ? '\nmount();' : '';
    
    return `
import App from "${entryPath}";
${importSource}

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
}${autoMountCall}
`;
  } else if (projectData.framework === 'svelte') {
    const importSource = externalDeps 
      ? `import { mount as svelteMount } from 'svelte';`
      : `import { mount as svelteMount } from 'svelte';`;
    
    const autoMountCall = shouldAutoMount ? '\nmount();' : '';
    
    return `
import App from "${entryPath}";
${importSource}

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
}${autoMountCall}
`;
  }

  throw new Error(`Unsupported framework: ${projectData.framework}`);
}

export function createBundlePlugin(projectData: ProjectData): esbuild.Plugin {
  const { VIRTUAL_BUNDLE_ID } = getVirtualIds();

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
        return {
          contents: createBundleEntry(projectData),
          loader: "js",
          resolveDir: Deno.cwd(),
        };
      });
    },
  };
}
