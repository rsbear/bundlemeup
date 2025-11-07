import type * as _esbuild from "esbuild";
import type { denoPlugin as _denoPlugin } from "@deno/esbuild-plugin";
import { createRsbuild, type RsbuildInstance } from "@rsbuild/core";
import { ensureDir } from "@std/fs/ensure-dir";
import { toFileUrl } from "@std/path/to-file-url";
import type { DistroTarget } from "./types.ts";
import type { InterpretedCfg } from "./interpreted-config.ts";
import { getStrategy } from "./bundler-strategies.ts";

export type Rsbuilder =
  | [rsbuilder: RsbuildInstance, err: null]
  | [null, Error];

export async function rsbuilder(
  discoveries: InterpretedCfg,
  distroTarget: DistroTarget = "mountable",
  domId?: string
): Promise<Rsbuilder> {
  const { framework, runtime, entryPoint } = discoveries;

  try {
    await ensureDir("./dist");
  } catch (error) {
    return [null, Error(`Failed to create dist directory: ${errMsg(error)}`)];
  }

  const appAbsPath = Deno.realPathSync(entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const strategy = getStrategy(distroTarget);
  const rsbuildConfig = strategy.createRsbuildConfig(
    discoveries,
    appFileUrl,
    framework,
    runtime,
    domId
  );

  const rsbuild = await createRsbuild({ rsbuildConfig });

  return [rsbuild, null];
}

const errMsg = (e: unknown): string => {
  return e instanceof Error ? e.message : e as string;
};
