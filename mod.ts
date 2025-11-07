import { Command } from "@cliffy/command";
import { rsbuilder } from "./bundler.ts";

import { interpretCfg } from "./interpreted-config.ts";

import type { DistroTarget, Frameworks } from "./types.ts";
import type { InterpretedCfg } from "./interpreted-config.ts";
import { getStrategy } from "./bundler-strategies.ts";

export interface CommandFlags {
  framework?: Frameworks;
  dev?: boolean;
  domid?: string;
  info?: "json" | "text";
  externals?: string;
  distributeNpm?: boolean;
  distributeSpa?: boolean;
  distributeMountable?: boolean;
}

await new Command()
  .name("bundlemeup")
  .version("0.1.0")
  .description("Bundle React, Preact, or Svelte apps with rsbuild")
  .option("-d, --dev", "Start development server with watch mode")
  .option(
    "--framework <framework:string>",
    "By default bundlemeup assumes from project. Pass the flag for explicitness",
  )
  .option(
    "--externals <externals:string>",
    "Mark a project dep as external. Accepts: 'framework' (inferred from project deps) or comma separated string e.g. 'react,react-dom'",
  )
  .option("--domid <domid:string>", "DOM id to mount the app into")
  .option(
    "--info <info:string>",
    "Print project information, Accepts: 'json' | 'text' (Exits early)",
  )
  .option(
    "--distribute-npm",
    "Bundle as npm library with external dependencies",
  )
  .option("--distribute-spa", "Bundle as self-contained SPA with HTML")
  .option(
    "--distribute-mountable",
    "Bundle with mount/unmount exports (default)",
  )
  .action(
    async ({
      dev,
      framework,
      domid,
      info,
      externals,
      distributeNpm,
      distributeSpa,
      distributeMountable,
    }: CommandFlags) => {
      const [discoveries, err] = await interpretCfg(framework, externals);

      if (err) {
        console.error(`\nError: ${err.message}`);
        Deno.exit(1);
      }

      if (info) {
        printInterpretedCfg(discoveries, info as "json" | "text");
        Deno.exit();
      }

      const domIdForDev = domid || "root";

      let distroTarget: DistroTarget = "mountable";

      if (dev) {
        distroTarget = "spa";
      } else {
        const distroFlags = [
          distributeNpm,
          distributeSpa,
          distributeMountable,
        ].filter(Boolean);
        if (distroFlags.length > 1) {
          console.error(
            "\nError: Only one --distribute-* flag can be specified",
          );
          Deno.exit(1);
        }

        if (distributeNpm) {
          distroTarget = "npm";
        } else if (distributeSpa) {
          distroTarget = "spa";
        } else if (distributeMountable) {
          distroTarget = "mountable";
        }
      }

      const [rsbuild, rsbErr] = await rsbuilder(
        discoveries,
        distroTarget,
        domIdForDev,
      );
      if (rsbErr) {
        console.error(
          `\n Error: ${rsbErr instanceof Error ? rsbErr.message : String(rsbErr)}`,
        );
        if (rsbErr instanceof Error && rsbErr.stack) {
          console.error(`\nStack trace:\n${rsbErr.stack}`);
        }
        Deno.exit(1);
      }

      try {
        if (dev) {
          console.log(
            "Dev mode: HTML generation enabled with domId:",
            domIdForDev,
          );
          await rsbuild.startDevServer();
        } else {
          console.log(`Framework found.. ${discoveries.framework}`);
          console.log(`Bundling.. ${discoveries.entryPoint}`);
          await rsbuild.build();

          const strategy = getStrategy(distroTarget);
          console.log(strategy.getOutputMessage());
        }
      } catch (error) {
        console.error(
          `\n Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        if (error instanceof Error && error.stack) {
          console.error(`\nStack trace:\n${error.stack}`);
        }
        Deno.exit(1);
      }
    },
  )
  .parse(Deno.args);

function printInterpretedCfg(
  discoveries: InterpretedCfg,
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
