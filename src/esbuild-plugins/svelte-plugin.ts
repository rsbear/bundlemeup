import type * as esbuild from "esbuild";
import * as svelte from "svelte/compiler";

export function createSveltePlugin(options: {
  compilerOptions?: svelte.CompileOptions;
  cssMode?: "external" | "injected";
} = {}): esbuild.Plugin {
  const { compilerOptions = {}, cssMode = "external" } = options;

  return {
    name: "bundlemeup-svelte",
    setup(build) {
      build.onResolve({ filter: /\?svelte-css$/ }, (args) => {
        return { path: args.path, namespace: "svelte-css" };
      });

      build.onLoad({ filter: /.*/, namespace: "svelte-css" }, (): esbuild.OnLoadResult => {
        return { contents: "", loader: "css" };
      });

      build.onLoad({ filter: /\.svelte$/ }, async (args): Promise<esbuild.OnLoadResult> => {
        const source = await Deno.readTextFile(args.path);
        const result = svelte.compile(source, {
          filename: args.path,
          generate: "client",
          ...compilerOptions,
        });

        let contents = result.js.code;
        const resolveDir = args.path.substring(0, args.path.lastIndexOf("/"));

        if (result.css && result.css.code) {
          if (cssMode === "external") {
            const virtualId = args.path + "?svelte-css";
            contents += `\nimport "${virtualId}";\n`;

            build.onLoad(
              { filter: new RegExp(escapeRegExp(virtualId)), namespace: "svelte-css" },
              (): esbuild.OnLoadResult => {
                return { contents: result.css!.code, loader: "css" };
              },
            );
          } else {
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

      build.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async (args): Promise<esbuild.OnLoadResult> => {
        const source = await Deno.readTextFile(args.path);
        const result = svelte.compileModule(source, {
          filename: args.path,
          generate: "client",
          ...compilerOptions,
        });

        const resolveDir = args.path.substring(0, args.path.lastIndexOf("/"));
        const loader = args.path.endsWith(".ts") ? "ts" : "js";

        return {
          contents: result.js.code,
          loader,
          resolveDir,
        };
      });
    },
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
