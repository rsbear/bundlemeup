import type { Frameworks, Runtimes } from "../types.ts";

type PkgName = string;
type PkgVersion = string;

export async function parseLibs(
  runtime: Runtimes,
): Promise<Record<PkgName, PkgVersion>> {
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
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
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
        const match = value.match(
          /^(?:npm:|jsr:)?(@?[\w-]+\/)?(@?[\w-]+)@(.+)$/,
        );
        if (match) {
          const pkgName = match[1] ? `${match[1]}${match[2]}` : match[2];
          libs[pkgName] = match[3];
        } else if (key.startsWith("npm:") || key.startsWith("jsr:")) {
          const pkgMatch = key.match(
            /^(?:npm:|jsr:)(@?[\w-]+(?:\/[\w-]+)?)(?:@(.+))?$/,
          );
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

export function discoverFramework(
  libs: Record<PkgName, PkgVersion>,
): Frameworks | null {
  if (libs["svelte"]) return "svelte";
  if (libs["preact"]) return "preact";
  if (libs["react"]) return "react";
  return null;
}

export function detectTailwind(libs: Record<PkgName, PkgVersion>): boolean {
  return !!libs["tailwindcss"];
}
