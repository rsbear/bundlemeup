import type { CreateRsbuildOptions } from "@rsbuild/core";
import { defineConfig } from "@rsbuild/core";
import { pluginSvelte } from "@rsbuild/plugin-svelte";
import { pluginVirtualModule } from "rsbuild-plugin-virtual-module";
import RspackDenoPlugin from "@snowman/rspack-deno-plugin";
import type { ProjectData } from "../project-data.ts";
import {
  createSpaAutoMountCode,
  createTailwindCss,
  createUnifiedMountCode,
} from "../virtual.ts";
import { toFileUrl } from "@std/path/to-file-url";

export function svelteSpa(pd: ProjectData): CreateRsbuildOptions {
  const tempDir = ".bundlemeup-virtual";
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const spaAutoMountCode = createSpaAutoMountCode(
    "svelte",
    appFileUrl,
    "root",
    pd.cssTw,
  );

  const virtualModules: Record<string, () => string> = {
    "bundlemeup/_mod.jsx": () => spaAutoMountCode,
  };

  if (pd.cssTw) {
    virtualModules["tailwind.css"] = () => createTailwindCss();
  }

  const plugins = [
    pluginVirtualModule({
      tempDir,
      virtualModules,
    }),
    pluginSvelte(),
  ];

  const rspackPlugins = [];
  if (pd.runtime === "deno") {
    rspackPlugins.push(new RspackDenoPlugin());
  }

  const postcssConfig = pd.cssTw
    ? {
        postcssOptions: {
          plugins: [
            "@tailwindcss/postcss",
          ],
        },
      }
    : undefined;

  return {
    rsbuildConfig: defineConfig({
      source: {
        entry: {
          index: `./${tempDir}/bundlemeup/_mod.jsx`,
        },
      },
      output: {
        module: true,
      },
      performance: {
        chunkSplit: {
          strategy: "all-in-one",
        },
      },
      tools: {
        postcss: postcssConfig,
        rspack: {
          plugins: rspackPlugins,
          resolve: {
            mainFields: ["svelte", "browser", "module", "main"],
            conditionNames: ["svelte", "browser"],
          },
          output: {
            library: {
              type: "module",
            },
          },
          experiments: {
            outputModule: true,
          },
        },
      },
      plugins,
    }),
  };
}

export function svelteNpm(pd: ProjectData): CreateRsbuildOptions {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const plugins = [pluginSvelte()];

  const rspackPlugins = [];
  if (pd.runtime === "deno") {
    rspackPlugins.push(new RspackDenoPlugin());
  }

  const externals: Record<string, string> = {};
  if (pd.externalDeps) {
    for (const [key] of Object.entries(pd.externalDeps)) {
      externals[key] = key;
    }
  }

  return {
    rsbuildConfig: defineConfig({
      source: {
        entry: {
          index: appFileUrl,
        },
      },
      output: {
        module: true,
      },
      performance: {
        chunkSplit: {
          strategy: "all-in-one",
        },
      },
      tools: {
        rspack: {
          plugins: rspackPlugins,
          resolve: {
            mainFields: ["svelte", "browser", "module", "main"],
            conditionNames: ["svelte", "browser"],
          },
          output: {
            library: {
              type: "module",
            },
          },
          experiments: {
            outputModule: true,
          },
          externals: Object.keys(externals).length > 0 ? externals : undefined,
        },
      },
      plugins,
    }),
  };
}

export function svelteMountable(pd: ProjectData): CreateRsbuildOptions {
  const tempDir = ".bundlemeup-virtual";
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const unifiedMountCode = createUnifiedMountCode(
    "svelte",
    appFileUrl,
    pd.cssTw,
  );

  const virtualModules: Record<string, () => string> = {
    "bundlemeup/_mod.jsx": () => unifiedMountCode,
  };

  if (pd.cssTw) {
    virtualModules["tailwind.css"] = () => createTailwindCss();
  }

  const plugins = [
    pluginVirtualModule({
      tempDir,
      virtualModules,
    }),
    pluginSvelte(),
  ];

  const rspackPlugins = [];
  if (pd.runtime === "deno") {
    rspackPlugins.push(new RspackDenoPlugin());
  }

  const postcssConfig = pd.cssTw
    ? {
        postcssOptions: {
          plugins: [
            "@tailwindcss/postcss",
          ],
        },
      }
    : undefined;

  return {
    rsbuildConfig: defineConfig({
      source: {
        entry: {
          index: `./${tempDir}/bundlemeup/_mod.jsx`,
        },
      },
      output: {
        module: true,
      },
      performance: {
        chunkSplit: {
          strategy: "all-in-one",
        },
      },
      tools: {
        postcss: postcssConfig,
        rspack: {
          plugins: rspackPlugins,
          resolve: {
            mainFields: ["svelte", "browser", "module", "main"],
            conditionNames: ["svelte", "browser"],
          },
          output: {
            library: {
              type: "module",
            },
          },
          experiments: {
            outputModule: true,
          },
        },
      },
      plugins,
    }),
  };
}
