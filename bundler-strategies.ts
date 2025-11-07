import type { RsbuildConfig } from "@rsbuild/core";
import { defineConfig } from "@rsbuild/core";
import RspackDenoPlugin from "@snowman/rspack-deno-plugin";
import { pluginVirtualModule } from "rsbuild-plugin-virtual-module";
import { pluginSvelte } from "@rsbuild/plugin-svelte";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginPreact } from "@rsbuild/plugin-preact";
import type { Frameworks, Runtimes, DistroTarget } from "./types.ts";
import type { InterpretedCfg } from "./interpreted-config.ts";
import { createUnifiedMountCode, createSpaAutoMountCode } from "./virtual.ts";

export interface BundlerStrategy {
  createRsbuildConfig(
    projectConfig: InterpretedCfg,
    appFileUrl: string,
    framework: Frameworks,
    runtime: Runtimes,
    domId?: string,
  ): RsbuildConfig;
  getOutputMessage(): string;
}

export const npmStrategy: BundlerStrategy = {
  createRsbuildConfig(projectConfig, appFileUrl, framework, runtime) {
    const plugins = [];

    if (framework === "svelte") {
      plugins.push(pluginSvelte());
    } else if (framework === "react") {
      plugins.push(pluginReact());
    } else if (framework === "preact") {
      plugins.push(pluginPreact());
    }

    const mainFields =
      framework === "svelte"
        ? ["svelte", "browser", "module", "main"]
        : ["browser", "module", "main"];

    const conditionNames =
      framework === "svelte" ? ["svelte", "browser"] : ["browser"];

    const rspackPlugins = [];
    if (runtime === "deno") {
      rspackPlugins.push(new RspackDenoPlugin());
    }

    const externals: Record<string, string> = {};
    if (projectConfig.externalDeps) {
      for (const [key] of Object.entries(projectConfig.externalDeps)) {
        externals[key] = key;
      }
    }

    return defineConfig({
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
            mainFields,
            conditionNames,
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
    });
  },
  getOutputMessage: () =>
    "✓ NPM library bundle created at ./dist/static/js/index.*.js\n  This bundle is ready for publishing with external dependencies",
};

export const spaStrategy: BundlerStrategy = {
  createRsbuildConfig(
    _projectConfig,
    appFileUrl,
    framework,
    runtime,
    domId = "root",
  ) {
    const tempDir = ".bundlemeup-virtual";

    const spaAutoMountCode = createSpaAutoMountCode(
      framework,
      appFileUrl,
      domId,
    );

    const plugins = [
      pluginVirtualModule({
        tempDir,
        virtualModules: {
          "bundlemeup/_mod.jsx": () => spaAutoMountCode,
        },
      }),
    ];

    if (framework === "svelte") {
      plugins.push(pluginSvelte());
    } else if (framework === "react") {
      plugins.push(pluginReact());
    } else if (framework === "preact") {
      plugins.push(pluginPreact());
    }

    const mainFields =
      framework === "svelte"
        ? ["svelte", "browser", "module", "main"]
        : ["browser", "module", "main"];

    const conditionNames =
      framework === "svelte" ? ["svelte", "browser"] : ["browser"];

    const rspackPlugins = [];
    if (runtime === "deno") {
      rspackPlugins.push(new RspackDenoPlugin());
    }

    return defineConfig({
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
        rspack: {
          plugins: rspackPlugins,
          resolve: {
            mainFields,
            conditionNames,
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
    });
  },
  getOutputMessage: () =>
    "✓ SPA bundle created at ./dist/index.html\n  This bundle auto-mounts on page load",
};

export const mountableStrategy: BundlerStrategy = {
  createRsbuildConfig(_projectConfig, appFileUrl, framework, runtime) {
    const tempDir = ".bundlemeup-virtual";

    const unifiedMountCode = createUnifiedMountCode(framework, appFileUrl);

    const plugins = [
      pluginVirtualModule({
        tempDir,
        virtualModules: {
          "bundlemeup/_mod.jsx": () => unifiedMountCode,
        },
      }),
    ];

    if (framework === "svelte") {
      plugins.push(pluginSvelte());
    } else if (framework === "react") {
      plugins.push(pluginReact());
    } else if (framework === "preact") {
      plugins.push(pluginPreact());
    }

    const mainFields =
      framework === "svelte"
        ? ["svelte", "browser", "module", "main"]
        : ["browser", "module", "main"];

    const conditionNames =
      framework === "svelte" ? ["svelte", "browser"] : ["browser"];

    const rspackPlugins = [];
    if (runtime === "deno") {
      rspackPlugins.push(new RspackDenoPlugin());
    }

    return defineConfig({
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
        rspack: {
          plugins: rspackPlugins,
          resolve: {
            mainFields,
            conditionNames,
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
    });
  },
  getOutputMessage: () =>
    "✓ Mountable bundle created at ./dist/static/js/index.*.js\n  This bundle exports { mount, unmount } for dynamic mounting\n  Usage: const app = await import('./dist/static/js/index.js');\n         app.mount('your-dom-id');",
};

export function getStrategy(target: DistroTarget): BundlerStrategy {
  switch (target) {
    case "npm":
      return npmStrategy;
    case "spa":
      return spaStrategy;
    case "mountable":
      return mountableStrategy;
  }
}
