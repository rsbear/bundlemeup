import { bundlemeup } from "../src/mod.ts";
import { exists } from "@std/fs";
import { join } from "@std/path";

export interface TestExample {
  name: string;
  path: string;
  runtime: "deno" | "bun";
  framework: "react" | "preact" | "svelte";
  entryFile: string;
}

export const examples: TestExample[] = [
  {
    name: "deno-react",
    path: "./examples/deno-react",
    runtime: "deno",
    framework: "react",
    entryFile: "app.tsx",
  },
  {
    name: "deno-preact",
    path: "./examples/deno-preact",
    runtime: "deno",
    framework: "preact",
    entryFile: "app.tsx",
  },
  {
    name: "deno-svelte",
    path: "./examples/deno-svelte",
    runtime: "deno",
    framework: "svelte",
    entryFile: "App.svelte",
  },
  {
    name: "bun-react",
    path: "./examples/bun-react",
    runtime: "bun",
    framework: "react",
    entryFile: "app.tsx",
  },
  {
    name: "bun-svelte",
    path: "./examples/bun-svelte",
    runtime: "bun",
    framework: "svelte",
    entryFile: "App.svelte",
  },
];

export async function cleanupDistDir(examplePath: string) {
  const distPath = join(examplePath, "dist");
  try {
    await Deno.remove(distPath, { recursive: true });
  } catch {
    // Ignore if dist doesn't exist
  }
}

export async function testInfoCommand(example: TestExample): Promise<boolean> {
  try {
    await bundlemeup({
      command: "info",
      cwd: example.path,
    });
    return true;
  } catch (error) {
    console.error(`Info test failed for ${example.name}:`, error);
    return false;
  }
}

export async function testBuildSpa(example: TestExample): Promise<boolean> {
  try {
    await cleanupDistDir(example.path);

    await bundlemeup({
      command: "build",
      forSpa: true,
      cwd: example.path,
    });

    const distPath = join(example.path, "dist");
    const indexHtmlPath = join(distPath, "index.html");

    const distExists = await exists(distPath);
    const indexExists = await exists(indexHtmlPath);

    if (!distExists) {
      console.error(`SPA build failed for ${example.name}: dist/ not created`);
      return false;
    }

    if (!indexExists) {
      console.error(`SPA build failed for ${example.name}: index.html not created`);
      return false;
    }

    const indexContent = await Deno.readTextFile(indexHtmlPath);
    const hasScriptTag = indexContent.includes("<script");

    if (!hasScriptTag) {
      console.error(`SPA build failed for ${example.name}: index.html missing script tags`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`SPA build failed for ${example.name}:`, error);
    return false;
  }
}

export async function testBuildNpm(example: TestExample): Promise<boolean> {
  try {
    await cleanupDistDir(example.path);

    await bundlemeup({
      command: "build",
      forNpm: true,
      cwd: example.path,
    });

    const distPath = join(example.path, "dist");
    const distExists = await exists(distPath);

    if (!distExists) {
      console.error(`NPM build failed for ${example.name}: dist/ not created`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`NPM build failed for ${example.name}:`, error);
    return false;
  }
}

export async function testBuildMountable(example: TestExample): Promise<boolean> {
  try {
    await cleanupDistDir(example.path);

    await bundlemeup({
      command: "build",
      forMountable: true,
      cwd: example.path,
    });

    const distPath = join(example.path, "dist");
    const distExists = await exists(distPath);

    if (!distExists) {
      console.error(`Mountable build failed for ${example.name}: dist/ not created`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Mountable build failed for ${example.name}:`, error);
    return false;
  }
}
