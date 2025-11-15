import type { ProjectData } from "./project-data.ts";

import * as esbuild from "esbuild";
import { denoPlugin } from "@deno/esbuild-plugin";
import { esbuildPluginTailwind } from "@ryanto/esbuild-plugin-tailwind";
import { getVirtualIds } from "./framework-mounts.ts";
import { createBundlePlugin } from "./esbuild-plugins/bundle-plugin.ts";
import { createMountFilePlugin } from "./esbuild-plugins/mount-file-plugin.ts";
import { createHTMLPlugin } from "./esbuild-plugins/html-plugin.ts";
// import { createSveltePlugin } from "./esbuild-plugins/svelte-plugin.ts";
import { createTypeScriptPreprocessor } from "./preprocessors/typescript-preprocess.ts";

import esbuildSvelteLib from "esbuild-svelte";

const sveltePlugin = esbuildSvelteLib.default || esbuildSvelteLib;

export function createESBuild(projectData: ProjectData) {
  const plugins: esbuild.Plugin[] = [];
  const mainFields = ["module", "main", "browser"];
  const conditions = ["browser"];

  if (projectData.runtime === "deno") {
    // plugins.push(denoPlugin());
  }

  if (projectData.framework === "svelte") {
    mainFields.push("svelte");
    conditions.push("svelte");
    // plugins.push(createSveltePlugin());
    plugins.push(
      sveltePlugin({
        preprocess: createTypeScriptPreprocessor(),
        esbuildTsTransformOptions: {
          target: "es2020",
          format: "esm",
          tsconfigRaw: JSON.stringify({
            compilerOptions: {
              target: "ES2015",
              verbatimModuleSyntax: true,
              isolatedModules: true,
            },
          }),
        },
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
    chunkNames: "[name]-[hash]",
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
    buildOptions.loader = {
      ".ts": "ts",
      ".js": "js",
    };
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
