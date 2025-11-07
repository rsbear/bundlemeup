/**
 * Responsible for interpreting the project the CLI is being ran for
 * - best guess project package manager via a lock file
 * - best guess framework based on project deps
 * - best guess entry file based on app.js(x)|ts(x) convention
 * - best guess dep externalization based on CLI flag and/or framework
 */
import type { Frameworks, OkErr, Runtimes } from "./types.ts";

type PkgName = string;
type PkgVersion = string;

export interface InterpretedCfg {
  /** deno, bun, npm, or pnpm */
  runtime: Runtimes;
  /** svelte, react, preact */
  framework: Frameworks;
  /** deps from package.json or deno.json */
  deps: Record<PkgName, PkgVersion>;
  /** bundle entry point aka 'app.tsx' */
  entryPoint: string;

  /** externalized deps */
  externalDeps: Record<PkgName, PkgVersion> | null;
}

export const interpretCfg = async (
  maybeFramework?: Frameworks,
  externals?: string,
): Promise<OkErr<InterpretedCfg>> => {
  try {
    const runtime = discoverRuntime();
    const libs = await parseLibs(runtime);

    const framework = maybeFramework || discoverFramework(libs);
    if (!framework) {
      return [
        null,
        new Error(
          "Could not auto-detect framework. Please specify one using --framework (react, preact, or svelte)",
        ),
      ];
    }

    const entryPoint = findAppFile(framework);
    if (!entryPoint) {
      return [null, new Error(produceInvalidAppFileMsg(framework))];
    }

    const externalDeps = buildExternalDeps(externals, libs, framework);

    return [{
      runtime,
      framework,
      deps: libs,
      entryPoint,
      externalDeps,
    }, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
};

function discoverRuntime(): Runtimes {
  const lockFiles: Array<[string, Runtimes]> = [
    ["deno.lock", "deno"],
    ["bun.lock", "bun"],
    ["package-lock.json", "nodejs"],
  ];

  for (const [lockFile, runtime] of lockFiles) {
    try {
      Deno.statSync(lockFile);
      return runtime;
    } catch {
      // File doesn't exist, continue checking
    }
  }

  return "nodejs";
}

function discoverFramework(libs: Record<PkgName, PkgVersion>): Frameworks | null {
  if (libs["svelte"]) return "svelte";
  if (libs["preact"]) return "preact";
  if (libs["react"]) return "react";
  return null;
}

async function parseLibs(runtime: Runtimes): Promise<Record<PkgName, PkgVersion>> {
  if (runtime === "deno") {
    return await parseDenoJSON();
  } else {
    return await parsePackageJSON();
  }
}

async function parsePackageJSON(): Promise<Record<PkgName, PkgVersion>> {
  try {
    const text = await Deno.readTextFile("package.json");
    const pkg = JSON.parse(text);
    return {
      ...pkg.dependencies || {},
      ...pkg.devDependencies || {},
    };
  } catch {
    return {};
  }
}

async function parseDenoJSON(): Promise<Record<PkgName, PkgVersion>> {
  try {
    const text = await Deno.readTextFile("deno.json");
    const deno = JSON.parse(text);
    const imports = deno.imports || {};

    const libs: Record<PkgName, PkgVersion> = {};
    for (const [key, value] of Object.entries(imports)) {
      if (typeof value === "string") {
        const match = value.match(/^(?:npm:|jsr:)?(@?[\w-]+\/)?(@?[\w-]+)@(.+)$/);
        if (match) {
          const pkgName = match[1] ? `${match[1]}${match[2]}` : match[2];
          libs[pkgName] = match[3];
        } else if (key.startsWith("npm:") || key.startsWith("jsr:")) {
          const pkgMatch = key.match(/^(?:npm:|jsr:)(@?[\w-]+(?:\/[\w-]+)?)(?:@(.+))?$/);
          if (pkgMatch) {
            libs[pkgMatch[1]] = pkgMatch[2] || "latest";
          }
        }
      }
    }
    return libs;
  } catch {
    return {};
  }
}

function findAppFile(framework: Frameworks): string | null {
  const extensions = framework === "svelte" ? [".svelte"] : [".tsx", ".ts", ".jsx", ".js"];

  const rootFiles = new Set<string>();
  try {
    for (const entry of Deno.readDirSync(".")) {
      if (entry.isFile) {
        rootFiles.add(entry.name);
      }
    }
  } catch {
    // Directory read failed, fallback to statSync
  }

  const srcFiles = new Set<string>();
  try {
    const srcStat = Deno.statSync("src");
    if (srcStat.isDirectory) {
      for (const entry of Deno.readDirSync("src")) {
        if (entry.isFile) {
          srcFiles.add(entry.name);
        }
      }
    }
  } catch {
    // src directory doesn't exist or read failed
  }

  for (const base of ["App", "app"]) {
    for (const ext of extensions) {
      const fileName = `${base}${ext}`;
      if (rootFiles.has(fileName)) {
        return fileName;
      }
    }
  }

  for (const base of ["App", "app"]) {
    for (const ext of extensions) {
      const fileName = `${base}${ext}`;
      if (srcFiles.has(fileName)) {
        return `src/${fileName}`;
      }
    }
  }

  const basePaths = ["App", "app", "src/app", "src/App"];
  for (const base of basePaths) {
    for (const ext of extensions) {
      const path = `${base}${ext}`;
      try {
        const stat = Deno.statSync(path);
        if (stat.isFile) {
          return path;
        }
      } catch {
        // continue
      }
    }
  }

  return null;
}

function buildExternalDeps(
  externals: string | undefined,
  deps: Record<PkgName, PkgVersion>,
  framework: Frameworks,
): Record<PkgName, PkgVersion> | null {
  if (!externals) {
    return null;
  }

  if (externals === "framework") {
    console.log(` Inferring externals from defined ${framework} and externalizing`);
    const frameworkDeps = getFrameworkDeps(framework);
    const externalDeps: Record<PkgName, PkgVersion> = {};
    for (const dep of frameworkDeps) {
      if (deps[dep]) {
        externalDeps[dep] = deps[dep];
      }
    }
    return externalDeps;
  }

  const specifiedDeps = externals.split(",").map((d) => d.trim());
  const externalDeps: Record<PkgName, PkgVersion> = {};
  for (const dep of specifiedDeps) {
    if (deps[dep]) {
      externalDeps[dep] = deps[dep];
    }
  }
  return externalDeps;
}

function getFrameworkDeps(framework: Frameworks): string[] {
  switch (framework) {
    case "react":
      return ["react", "react-dom"];
    case "preact":
      return ["preact"];
    case "svelte":
      return ["svelte"];
  }
}

function produceInvalidAppFileMsg(framework: Frameworks): string {
  const cwd = Deno.cwd();
  const expectedFiles = framework === "svelte"
    ? ["app.svelte", "App.svelte", "src/app.svelte", "src/App.svelte"]
    : [
      "app.tsx",
      "App.tsx",
      "app.ts",
      "App.ts",
      "app.jsx",
      "App.jsx",
      "app.js",
      "App.js",
      "src/app.tsx",
      "src/App.tsx",
    ];

  return `Could not find entry point for ${framework}\n` +
    `  Looked in: ${cwd}\n` +
    `  Expected one of: ${expectedFiles.join(", ")}`;
}
