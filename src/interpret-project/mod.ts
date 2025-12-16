/**
 * This module interprets the project the CLI is being ran for
 * and builds a data object for later use.
 * - best guess project package manager via a lockfile
 * - best guess framework based on project deps
 * - find entry file based on app.js(x)|ts(x) convention
 * - best guess dep externalization based on CLI flag and/or framework
 *
 * @module
 */

import type { Frameworks, OkErr, Runtimes } from "./../types.ts";
import { detectTailwind, discoverFramework, parseLibs } from "./determine-deps.ts";
import { determineRuntime } from "./determine-runtime.ts";
import { findAppFile, produceInvalidAppFileMsg } from "./find-app-file.ts";
import { detectStaticDir } from "./handle-static-dir.ts";

type PkgName = string;
type PkgVersion = string;

export interface ProjectData {
  runtime: Runtimes;
  framework: Frameworks;
  deps: Record<PkgName, PkgVersion>;
  entryPoint: string;

  externalDeps: Record<PkgName, PkgVersion> | null;

  cssTw?: boolean;

  cpStatic?: boolean;

  buildMode?: "dev" | "spa" | "mountable";

  customHtml?: boolean;

  customHtmlPath?: string;
}

export const interpretProjectData = async (
  maybeFramework?: Frameworks,
  externals?: string,
  customHtml?: boolean,
): Promise<OkErr<ProjectData>> => {
  try {
    const runtime = determineRuntime();
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

    let customHtmlPath: string | undefined;
    if (customHtml) {
      customHtmlPath = findCustomHtml();
      if (!customHtmlPath) {
        return [
          null,
          new Error(
            "Could not find index.html in project root. Please ensure index.html exists when using --custom-html flag.",
          ),
        ];
      }
    }

    const cssTw = detectTailwind(libs);
    const cpStatic = detectStaticDir();

    return [
      {
        runtime,
        framework,
        deps: libs,
        entryPoint,
        externalDeps,
        customHtml,
        customHtmlPath,
        cssTw,
        cpStatic,
      },
      null,
    ];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
};

function findCustomHtml(): string | undefined {
  try {
    const stat = Deno.statSync("index.html");
    if (stat.isFile) {
      return "index.html";
    }
  } catch {
  }
  return undefined;
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
    console.log(
      ` Inferring externals from defined ${framework} and externalizing`,
    );
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
    case "auto":
      return [];
    default:
      return [];
  }
}

export function printProjectData(
  discoveries: ProjectData,
  info: "json" | "text",
) {
  if (info === "json") {
    console.log(JSON.stringify(discoveries));
    return;
  }
  console.log(`✓  Package manager:   ${discoveries.runtime}`);
  console.log(`✓  Framework:         ${discoveries.framework}`);
  console.log(`✓  App file:          ${discoveries.entryPoint}`);
  console.log(`✓  Deps:`);
  Object.entries(discoveries.deps).forEach(([k, v]) => {
    console.log(`      ${k} : ${v}`);
  });
  console.log(`✓  External deps:`);
  if (discoveries.externalDeps) {
    Object.entries(discoveries.externalDeps).forEach(([k, v]) => {
      console.log(`      ${k} : ${v}`);
    });
  }
  return;
}
