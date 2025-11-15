import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: [
    "./src/mod.ts",
    {
      name: "./cli",
      path: "./src/cli.ts",
    },
  ],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  scriptModule: false,
  typeCheck: false,
  test: false,
  package: {
    name: "bundlemeup",
    version: "0.2.1",
    description:
      "A CLI tool that wraps rsbuild to bundle React, Svelte, or Preact to specified targets",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/rsbear/bundlemeup.git",
    },
    bugs: {
      url: "https://github.com/rsbear/bundlemeup/issues",
    },
    bin: {
      bundlemeup: "./esm/cli.js",
    },
  },
  postBuild() {
    Deno.copyFileSync("README.md", "npm/README.md");
    Deno.copyFileSync("LICENSE", "npm/LICENSE");

    const cliPath = "npm/esm/cli.js";
    const content = Deno.readTextFileSync(cliPath);
    const fixed = content
      .replace(
        /^import \* as dntShim[^\n]*\n!\/.*/m,
        '#!/usr/bin/env node\nimport * as dntShim from "./_dnt.shims.js";',
      )
      .replace(/^node;\n/m, "");
    Deno.writeTextFileSync(cliPath, fixed);
  },
  compilerOptions: {
    lib: ["ES2021", "DOM"],
  },
});
