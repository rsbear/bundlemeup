import type { Frameworks } from "../types.ts";

export function findAppFile(framework: Frameworks): string | null {
  const extensions = framework === "svelte" ? [".svelte"] : [".tsx", ".ts", ".jsx", ".js"];

  const rootFiles = new Set<string>();
  try {
    for (const entry of Deno.readDirSync(".")) {
      if (entry.isFile) {
        rootFiles.add(entry.name);
      }
    }
  } catch {
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
      }
    }
  }

  return null;
}

export function produceInvalidAppFileMsg(framework: Frameworks): string {
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

  return (
    `Could not find entry point for ${framework}\n` +
    `  Looked in: ${cwd}\n` +
    `  Expected one of: ${expectedFiles.join(", ")}`
  );
}
