```typescript
// svelte-esbuild-plugin.ts
// Deno: `deno add npm:svelte npm:esbuild`
// Node/Bun: standard npm/yarn/pnpm install
import type { Plugin, OnLoadResult } from "npm:esbuild";
import { readFile } from "node:fs/promises"; // In Deno, use Deno.readTextFile
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as svelte from "npm:svelte/compiler";

export function sveltePlugin(options: {
  compilerOptions?: svelte.CompilerOptions;
  cssMode?: "external" | "injected";
} = {}): Plugin {
  const { compilerOptions = {}, cssMode = "external" } = options;

  return {
    name: "esbuild-svelte-ts",
    setup(build) {
      // Resolve virtual CSS sidecar modules
      build.onResolve({ filter: /\?svelte-css$/ }, (args) => {
        return { path: args.path, namespace: "svelte-css" };
      });

      // Load virtual CSS content
      build.onLoad({ filter: /.*/, namespace: "svelte-css" }, (args): OnLoadResult => {
        // Stash actual css in the path; upstream onLoad injects it
        // Here contents will be overwritten per-component below using a map if desired.
        return { contents: "", loader: "css" };
      });

      // Compile .svelte files
      build.onLoad({ filter: /\.svelte$/ }, async (args): Promise<OnLoadResult> => {
        const source = await readFile(args.path, "utf8"); // Deno: Deno.readTextFile(args.path)
        const result = svelte.compile(source, {
          filename: args.path,
          format: "esm",
          generate: "dom",
          sourcemap: true,
          ...compilerOptions,
        });

        let contents = result.js.code;
        const resolveDir = dirname(args.path);

        // Emit CSS either as external or injected
        if (result.css && result.css.code) {
          if (cssMode === "external") {
            // Create a virtual CSS module so esbuild emits a CSS asset in the graph
            const virtualId = args.path + "?svelte-css";
            contents += `\nimport "${virtualId}";\n`;

            // Provide the CSS contents for this specific module id
            build.onLoad({ filter: new RegExp(escapeRegExp(virtualId)), namespace: "svelte-css" }, (): OnLoadResult => {
              return { contents: result.css!.code, loader: "css" };
            });
          } else {
            // Inject CSS at runtime (no separate CSS asset)
            const css = JSON.stringify(result.css.code);
            contents += `
              const __style = document.createElement("style");
              __style.textContent = ${css};
              document.head.appendChild(__style);
            `;
          }
        }

        return {
          contents,
          loader: "js",
          resolveDir,
        };
      });
    },
  };
}

// Helper to escape a string for RegExp construction
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```
