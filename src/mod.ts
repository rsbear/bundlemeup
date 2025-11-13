/**
 * The module is core programmatic API for @habitat/bundleup
 * and ultimately exposes a function called bundlemeup()
 * that users can execute in a script.
 * @module
 */

import { interpretProjectData, printProjectData } from "./project-data.ts";
import { createRsbuild } from "@rsbuild/core";
import { buildForStrategy } from "./buildfor-strategy.ts";
import type { BuildTargets, BundlemeupFlags } from "./types.ts";

export type { BundlemeupFlags };

function buildTargetToStrUnion(flags: BundlemeupFlags): BuildTargets {
  if (flags.forNpm) return "npm";
  if (flags.forSpa) return "spa";
  if (flags.forMountable) return "mountable";
  return "spa";
}

export async function bundlemeup(flags: BundlemeupFlags) {
  const originalCwd = Deno.cwd();

  try {
    if (flags.cwd) {
      Deno.chdir(flags.cwd);
    }

    switch (flags.command) {
      case "info": {
        const [pd, err] = await interpretProjectData(flags.framework);
        if (err) {
          throw err;
        }
        printProjectData(pd, "text");
        break;
      }

      case "dev": {
        const [pd, err] = await interpretProjectData(flags.framework);
        if (err) {
          throw err;
        }

        const cfg = buildForStrategy(pd, "spa");
        const rsbuild = await createRsbuild(cfg);
        await rsbuild.startDevServer();
        break;
      }

      case "build": {
        const [pd, err] = await interpretProjectData(flags.framework);
        if (err) {
          throw err;
        }

        const targets = buildTargetToStrUnion(flags);
        const cfg = buildForStrategy(pd, targets);

        const rsbuild = await createRsbuild(cfg);
        await rsbuild.build();
        break;
      }

      default:
        throw new Error(`Unknown command: ${flags.command}`);
    }
  } finally {
    if (flags.cwd) {
      Deno.chdir(originalCwd);
    }
  }
}
