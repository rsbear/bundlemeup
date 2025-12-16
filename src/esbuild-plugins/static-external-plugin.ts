import type * as esbuild from "esbuild";

export function createStaticExternalPlugin(): esbuild.Plugin {
  return {
    name: "static-external",
    setup(build) {
      build.onResolve({ filter: /^\/static\// }, (args) => {
        return {
          path: args.path,
          external: true,
        };
      });
    },
  };
}
