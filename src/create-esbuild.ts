import type { ProjectData } from "./project-data.ts";

import * as esbuild from "esbuild";
import esbuildSvelteLib from "esbuild-svelte";
import { sveltePreprocess } from "svelte-preprocess";
import { esbuildPluginTailwind } from "@ryanto/esbuild-plugin-tailwind";
import { createMountCode, getVirtualIds } from "./framework-mounts.ts";

const sveltePlugin = esbuildSvelteLib.default || esbuildSvelteLib;

function createBundlePlugin(projectData: ProjectData): esbuild.Plugin {
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

function findChunkPath(metafile: esbuild.Metafile, entryName: string): string | null {
  for (const [outputPath, output] of Object.entries(metafile.outputs)) {
    if (output.entryPoint && output.entryPoint.includes(entryName)) {
      return outputPath.replace('dist/', './');
    }
  }
  return null;
}

function createMountFilePlugin(projectData: ProjectData, outdir: string): esbuild.Plugin {
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

function createHTMLPlugin(outdir: string, includeCSS: boolean): esbuild.Plugin {
  return {
    name: "bundlemeup-html",
    setup(build) {
      build.onEnd(async (result) => {
        await Deno.mkdir(outdir, { recursive: true });
        
        let cssPath = './bundle.css';
        if (result.metafile && includeCSS) {
          for (const [outputPath] of Object.entries(result.metafile.outputs)) {
            if (outputPath.endsWith('.css')) {
              cssPath = outputPath.replace('dist/', './');
              break;
            }
          }
        }

        const html = createProjectHTML(includeCSS, cssPath);
        const htmlPath = `${outdir}/index.html`;
        await Deno.writeTextFile(htmlPath, html);
      });
    },
  };
}

export function createESBuild(projectData: ProjectData) {
  const plugins: esbuild.Plugin[] = [];
  const mainFields = ["module", "main", "browser"];
  const conditions = ["browser"];

  if (projectData.framework === "svelte") {
    mainFields.push("svelte");
    conditions.push("svelte");
    plugins.push(
      sveltePlugin({
        preprocess: sveltePreprocess(),
      }),
    );
  }

  if (projectData.cssTw) {
    plugins.push(esbuildPluginTailwind({
      base: Deno.cwd(),
      minify: true,
    }));
  }

  plugins.push(createBundlePlugin(projectData));

  const { VIRTUAL_BUNDLE_ID, VIRTUAL_FRAMEWORK_ID } = getVirtualIds();
  const outdir = "dist";

  plugins.push(createHTMLPlugin(outdir, !!projectData.cssTw));
  plugins.push(createMountFilePlugin(projectData, outdir));

  const entryPoints: Record<string, string> = {
    bundle: VIRTUAL_BUNDLE_ID,
  };

  if (!projectData.externalDeps) {
    entryPoints.framework = VIRTUAL_FRAMEWORK_ID;
  }

  const external: string[] = [];
  if (projectData.externalDeps) {
    external.push(...Object.keys(projectData.externalDeps));
  }

  const buildOptions: esbuild.BuildOptions = {
    entryPoints,
    outdir,
    plugins,
    mainFields,
    conditions,
    bundle: true,
    format: "esm",
    minify: false,
    sourcemap: true,
    write: true,
    splitting: true,
    chunkNames: '[name]-[hash]',
    metafile: true,
    external: external.length > 0 ? external : undefined,
  };

  if (projectData.framework === "react") {
    buildOptions.jsx = "automatic";
    buildOptions.jsxDev = false;
  } else if (projectData.framework === "preact") {
    buildOptions.jsx = "automatic";
    buildOptions.jsxImportSource = "preact";
  } else if (projectData.framework === "svelte") {
    buildOptions.jsx = "preserve";
  }

  return {
    dev: async () => {
      return await esbuild.context(buildOptions);
    },
    build: async () => {
      return await esbuild.build(buildOptions);
    },
  };
}

function createProjectHTML(includeCSS: boolean, cssPath: string = './bundle.css') {
  const cssLink = includeCSS ? `<link rel="stylesheet" href="${cssPath}" />` : '';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>${cssLink ? `\n    ${cssLink}` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./mount.js"></script>
  </body>
</html>`;
}
