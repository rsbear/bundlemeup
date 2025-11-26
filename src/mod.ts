/**
 * The module is core programmatic API for @habitat/bundleup
 * and ultimately exposes a function called bundlemeup()
 * that users can execute in a script.
 * @module
 */

import { interpretProjectData, printProjectData } from "./project-data.ts";
import { createESBuild } from "./create-esbuild.ts";

import type { BundlemeupFlags } from "./types.ts";
export type { BundlemeupFlags };

export async function bundleup(flags: BundlemeupFlags) {
  const originalCwd = Deno.cwd();

  try {
    if (flags.cwd) {
      Deno.chdir(flags.cwd);
    }

    switch (flags.command) {
      case "info": {
        const [pd, err] = await interpretProjectData(flags.framework, flags.externals, flags.customHtml);
        if (err) {
          throw err;
        }
        printProjectData(pd, "text");
        break;
      }

      case "dev": {
        const [pd, err] = await interpretProjectData(flags.framework, flags.externals, flags.customHtml);
        if (err) {
          throw err;
        }

        pd.cssTw = flags.cssTw;
        pd.buildMode = "dev";

        const PORT = 3000;
        const esbuildCtx = await createESBuild(pd).dev();
        await esbuildCtx.watch();
        await esbuildCtx.serve({
          port: PORT,
          servedir: "dist",
          fallback: "dist/index.html",
        });
        console.log(`[dev] server started at http://localhost:${PORT}`);

        break;
      }

      case "build": {
        const [pd, err] = await interpretProjectData(flags.framework, flags.externals, flags.customHtml);
        if (err) {
          throw err;
        }

        pd.cssTw = flags.cssTw;
        
        if (flags.forMountable) {
          pd.buildMode = "mountable";
        } else if (flags.forSpa) {
          pd.buildMode = "spa";
        } else {
          pd.buildMode = "spa";
        }

        await createESBuild(pd).build();

        if (flags.cpStatic) {
          const staticDir = "static";
          const outDir = "dist";
          
          try {
            await Deno.stat(staticDir);
            await Deno.mkdir(outDir, { recursive: true });
            
            for await (const entry of Deno.readDir(staticDir)) {
              const srcPath = `${staticDir}/${entry.name}`;
              const destPath = `${outDir}/${entry.name}`;
              await Deno.copyFile(srcPath, destPath);
            }
            
            console.log(`[build] Copied static assets from ${staticDir} to ${outDir}`);
          } catch (e) {
            if (e instanceof Deno.errors.NotFound) {
              console.warn(`[build] Warning: ${staticDir} directory not found, skipping static asset copy`);
            } else {
              throw e;
            }
          }
        }

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
