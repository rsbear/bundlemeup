// src/esbuild-plugins/svelte-plugin.ts
import type * as esbuild from "esbuild";
import * as svelte from "svelte/compiler";

export function createSveltePlugin(options: {
  compilerOptions?: svelte.CompileOptions;
  cssMode?: "external" | "injected";
  dev?: boolean;
} = {}): esbuild.Plugin {
  const { compilerOptions = {}, cssMode = "external", dev = true } = options;

  return {
    name: "bundlemeup-svelte",
    setup(build) {
      // Virtual CSS namespace
      build.onResolve({ filter: /\?svelte-css$/ }, (args) => {
        return { path: args.path, namespace: "svelte-css" };
      });

      build.onLoad({ filter: /.*/, namespace: "svelte-css" }, (): esbuild.OnLoadResult => {
        return { contents: "", loader: "css" };
      });

      function registerVirtualCss(virtualId: string, cssCode: string) {
        build.onLoad(
          { filter: new RegExp(escapeRegExp(virtualId)), namespace: "svelte-css" },
          (): esbuild.OnLoadResult => ({ contents: cssCode, loader: "css" }),
        );
      }

      // Components: .svelte
      build.onLoad({ filter: /\.svelte$/ }, async (args): Promise<esbuild.OnLoadResult> => {
        const source = await Deno.readTextFile(args.path);
        const result = svelte.compile(source, {
          filename: args.path,
          generate: "client",
          ...compilerOptions,
        });

        let contents = result.js.code;
        const resolveDir = dirname(args.path);

        const cssCode = result.css?.code ?? "";
        if (cssCode) {
          if (cssMode === "external") {
            const virtualId = `${args.path}?svelte-css`;
            contents += `\nimport "${virtualId}";\n`;
            registerVirtualCss(virtualId, cssCode);
          } else {
            contents += `
const __style = document.createElement("style");
__style.textContent = ${JSON.stringify(cssCode)};
document.head.appendChild(__style);
`;
          }
        }

        return { contents, loader: "js", resolveDir };
      });

      // Rune modules: .svelte.ts / .svelte.js
      build.onResolve({ filter: /\.svelte\.(ts|js)$/ }, async (args) => {
        const importerDir = args.importer ? dirname(args.importer) : args.resolveDir || ".";
        const abs = resolvePath(importerDir, args.path);
        if (await fileExists(abs)) {
          return { path: abs, namespace: "svelte-module" };
        }
        return null;
      });

      build.onLoad(
        { filter: /\.svelte\.(ts|js)$/, namespace: "svelte-module" },
        async (args): Promise<esbuild.OnLoadResult> => {
          const source = await Deno.readTextFile(args.path);
          const result = svelte.compileModule(source, {
            filename: args.path,
            generate: "client",
            ...compilerOptions,
          });

          let contents = result.js.code;

          // Fallback transform: If compileModule output still includes bare runes,
          // map them to public helpers from svelte/reactivity
          // Note: this transform is simple—good enough for $state/$derived in typical modules
          const hasBareState = /\$state\s*\(/.test(contents);
          const hasBareDerived = /\$derived\s*\(/.test(contents);
          if (hasBareState || hasBareDerived) {
            const helpersImport =
              `import { state as __sv_state, derived as __sv_derived } from "svelte/reactivity";\n`;
            contents = helpersImport +
              contents
                .replace(/\$state\s*\(/g, "__sv_state(")
                .replace(/\$derived\s*\(/g, "__sv_derived(");
          }

          return { contents, loader: "js", resolveDir: dirname(args.path) };
        },
      );
    },
  };
}

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "." : p.slice(0, i);
}
function resolvePath(dir: string, spec: string): string {
  if (spec.startsWith("/")) return spec;
  if (!dir) return spec;
  return dir.endsWith("/") ? dir + spec : dir + "/" + spec;
}
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
