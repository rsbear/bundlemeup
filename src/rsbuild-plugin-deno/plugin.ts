import {
  MediaType,
  RequestedModuleType,
  ResolutionMode,
  Workspace,
  type WorkspaceOptions,
} from "@deno/loader";
import type { RsbuildPlugin } from "@rsbuild/core";
import * as path from "@std/path";
import { isBuiltin } from "node:module";

export interface DenoPluginOptions {
  /** Show debugging logs */
  debug?: boolean;
  /** Use this path to a `deno.json` instead of auto-discovering it. */
  configPath?: string;
  /** Don't transpile files when loading them */
  noTranspile?: boolean;
  /** Keep JSX as is, instead of transpiling it according to compilerOptions. */
  preserveJsx?: boolean;
  /**
   * Prefix for public environment variables that should be inlined during
   * bundling.
   * @example `FRESH_PUBLIC_`
   */
  publicEnvVarPrefix?: string;
  /**
   * Node.js conditions to use during resolution
   * @default ["node", "import"]
   */
  nodeConditions?: string[];
  /**
   * Platform target for the build
   * @default "node"
   */
  platform?: "browser" | "node" | "neutral";
}

/**
 * Create an instance of the Deno plugin for Rsbuild
 */
export function denoPlugin(options: DenoPluginOptions = {}): RsbuildPlugin {
  return {
    name: "rsbuild:deno",
    setup(api) {
      let workspace: Workspace;
      let loader: Awaited<ReturnType<Workspace["createLoader"]>>;
      let externals: RegExp[] = [];

      api.onBeforeBuild(async ({ bundlerConfigs }) => {
        // Initialize workspace and loader
        workspace = new Workspace({
          debug: options.debug,
          configPath: options.configPath,
          nodeConditions: options.nodeConditions ?? ["node", "import"],
          noTranspile: options.noTranspile,
          preserveJsx: options.preserveJsx,
          platform: getPlatform(options.platform),
        });

        loader = await workspace.createLoader();

        // Extract externals from the first bundler config
        const externalPatterns = bundlerConfigs[0]?.externals;
        if (Array.isArray(externalPatterns)) {
          externals = externalPatterns.map((item) =>
            typeof item === "string" ? externalToRegex(item) : item as RegExp
          );
        }
      });

      api.onAfterBuild(() => {
        // Cleanup
        if (loader) {
          loader[Symbol.dispose]?.();
        }
      });

      api.modifyRspackConfig((config, { mergeConfig }) => {
        // Custom resolver plugin for Deno-style resolution
        const DenoResolverPlugin = {
          apply(resolver: any) {
            const target = resolver.ensureHook("resolved");

            resolver
              .getHook("before-resolve")
              .tapAsync(
                "DenoResolverPlugin",
                async (request: any, resolveContext: any, callback: any) => {
                  if (!loader || !request.request) {
                    return callback();
                  }

                  const requestPath = request.request;

                  // Handle built-in and external modules
                  if (
                    isBuiltin(requestPath) ||
                    externals.some((reg) => reg.test(requestPath))
                  ) {
                    return callback();
                  }

                  // Determine resolution mode
                  const kind =
                    request.dependency?.type === "cjs require"
                      ? ResolutionMode.Require
                      : ResolutionMode.Import;

                  try {
                    const importer = request.context?.issuer || "";
                    const res = await loader.resolve(
                      requestPath,
                      importer,
                      kind,
                    );

                    let resolvedPath: string;
                    if (res.startsWith("file:")) {
                      resolvedPath = path.fromFileUrl(res);
                    } else {
                      resolvedPath = res;
                    }

                    // Mark special protocol modules with custom data
                    const isSpecialProtocol = 
                      res.startsWith("http:") ||
                      res.startsWith("https:") ||
                      res.startsWith("npm:") ||
                      res.startsWith("jsr:");

                    const obj = {
                      ...request,
                      path: isSpecialProtocol ? false : path.dirname(resolvedPath),
                      request: isSpecialProtocol ? res : path.basename(resolvedPath),
                      fullySpecified: true,
                      // Store original URL for the loader
                      __denoUrl: res,
                    };

                    resolver.doResolve(
                      target,
                      obj,
                      `resolved by deno loader: ${res}`,
                      resolveContext,
                      callback,
                    );
                  } catch (err) {
                    const couldNotResolveReg =
                      /Relative import path ".*?" not prefixed with/;

                    if (
                      err instanceof Error &&
                      couldNotResolveReg.test(err.message)
                    ) {
                      return callback();
                    }

                    return callback(err);
                  }
                },
              );
          },
        };

        // Inline loader implementation
        const DenoLoaderPlugin = {
          apply(compiler: any) {
            compiler.hooks.compilation.tap(
              "DenoLoaderPlugin",
              (compilation: any) => {
                compilation.hooks.buildModule.tap(
                  "DenoLoaderPlugin",
                  (module: any) => {
                    // Skip if not a normal module
                    if (!module.resource) return;

                    const originalSource = module.originalSource;
                    if (!originalSource) return;

                    // Create a loader function that will process the module
                    const processModule = async () => {
                      const resourcePath = module.resource;

                      // Determine the URL for Deno loader
                      let url: string;
                      if (
                        resourcePath.startsWith("http:") ||
                        resourcePath.startsWith("https:") ||
                        resourcePath.startsWith("npm:") ||
                        resourcePath.startsWith("jsr:")
                      ) {
                        url = resourcePath;
                      } else {
                        url = path.toFileUrl(resourcePath).toString();
                      }

                      // Get query params for module type
                      const queryIndex = resourcePath.indexOf("?");
                      const query =
                        queryIndex > -1
                          ? resourcePath.slice(queryIndex + 1)
                          : "";
                      const withArgs: Record<string, string> = {};
                      if (query) {
                        const params = new URLSearchParams(query);
                        for (const [key, value] of params.entries()) {
                          withArgs[key] = value;
                        }
                      }

                      const moduleType = getModuleType(resourcePath, withArgs);

                      try {
                        const res = await loader.load(url, moduleType);

                        if (res.kind === "external") {
                          return null;
                        }

                        let code = new TextDecoder().decode(res.code);

                        // Handle environment variable inlining
                        const envPrefix = options.publicEnvVarPrefix;
                        if (
                          envPrefix &&
                          moduleType === RequestedModuleType.Default
                        ) {
                          code = code.replaceAll(
                            /Deno\.env\.get\(["']([^)]+)['"]\)|process\.env\.([\w_-]+)/g,
                            (m, name, processName) => {
                              if (
                                name !== undefined &&
                                name.startsWith(envPrefix)
                              ) {
                                return JSON.stringify(process.env[name]);
                              }
                              if (
                                processName !== undefined &&
                                processName.startsWith(envPrefix)
                              ) {
                                return JSON.stringify(
                                  process.env[processName],
                                );
                              }
                              return m;
                            },
                          );
                        }

                        return code;
                      } catch (err) {
                        if (options.debug) {
                          console.error(
                            `[deno-plugin] Error loading ${resourcePath}:`,
                            err,
                          );
                        }
                        return null;
                      }
                    };

                    // Store the processor for later use
                    module.__denoProcessor = processModule;
                  },
                );
              },
            );

            // Hook into module building to transform source
            compiler.hooks.compilation.tap(
              "DenoLoaderPlugin",
              (compilation: any) => {
                compilation.hooks.succeedModule.tapAsync(
                  "DenoLoaderPlugin",
                  async (module: any, callback: any) => {
                    if (module.__denoProcessor) {
                      try {
                        const transformed = await module.__denoProcessor();
                        if (transformed !== null) {
                          // Update the module source with transformed code
                          const { RawSource } = compiler.webpack.sources;
                          module._source = new RawSource(transformed);
                        }
                      } catch (err) {
                        return callback(err);
                      }
                    }
                    callback();
                  },
                );
              },
            );
          },
        };

        return mergeConfig(config, {
          resolve: {
            plugins: [DenoResolverPlugin],
          },
          plugins: [DenoLoaderPlugin],
        });
      });
    },
  };
}

function getPlatform(
  platform: "browser" | "node" | "neutral" | undefined,
): WorkspaceOptions["platform"] {
  switch (platform) {
    case "browser":
      return "browser";
    case "node":
      return "node";
    case "neutral":
    default:
      return undefined;
  }
}

function getModuleType(
  file: string,
  withArgs: Record<string, string> = {},
): RequestedModuleType {
  switch (withArgs.type) {
    case "text":
      return RequestedModuleType.Text;
    case "bytes":
      return RequestedModuleType.Bytes;
    case "json":
      return RequestedModuleType.Json;
    default:
      if (file.endsWith(".json")) {
        return RequestedModuleType.Json;
      }
      return RequestedModuleType.Default;
  }
}

// For some reason bundlers pass external specifiers to plugins.
export function externalToRegex(external: string): RegExp {
  return new RegExp(
    "^" + external.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(
      /\*/g,
      ".*",
    ) + "$",
  );
}
