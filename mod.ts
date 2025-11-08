import { Command } from "@cliffy/command";
import { rsbuilder } from "./bundler.ts";

import { interpretCfg, printInterpretedCfg } from "./interpreted-config.ts";

import type { DistroTarget } from "./types.ts";
import { getStrategy } from "./bundler-strategies.ts";
import { validateFrameworkFlag } from "./validations.ts";

export interface CommandFlags {
  /**
   * --framework
   *   If one not specified, one will be assumed via the projects dependencies
   */
  framework?: string;
  /**
   * --dev, -d
   *   Start an rsbuild dev server
   */
  dev?: boolean;
  /**
   * --domid
   *   supplied for --buildfor-mountable cases
   */
  domid?: string;
  /**
   * --info
   *   print some info about the project. Does not bundle
   */
  info?: string;
  /**
   * --externals
   *   explicitly mark dependencies as external to exclude from bundling
   */
  externals?: string;
  /**
   * --buildfor-npm
   *   Bundle for NPM distribution
   */
  buildforNpm?: boolean;
  /**
   * --buildfor-spa
   *   Bundle a SPA for static deployments
   */
  buildforSpa?: boolean;
  /**
   * --buildfor-mountable
   *   Bundle a mountable ESM module. Useful for external htmls
   */
  buildforMountable?: boolean;
}

await new Command()
  .name("bundlemeup")
  .version("0.1.1")
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
  .option(
    "--domid <domid:string>",
    "DOM id to mount the app into",
  )
  .option(
    "--info <info:string>",
    "Print project information, Accepts: 'json' | 'text' (Exits early)",
  )
  .option(
    "--buildfor-npm",
    "Bundle as npm library with external dependencies",
  )
  .option(
    "--buildfor-spa",
    "Bundle as self-contained SPA with HTML",
  )
  .option(
    "--buildfor-mountable",
    "Bundle with mount/unmount exports (default)",
  )
  .action(
    async (flags: CommandFlags) => {
      // -- first step upon running the program is make sure a random string isn't being passed
      //    as a framework.. narrow it down to supported possibilities
      const [framework, invalidFramework] = validateFrameworkFlag(flags?.framework);
      if (invalidFramework) {
        console.error(`\nError: ${invalidFramework.message}`);
        Deno.exit();
      }

      // -- extract the relevant parts of a project being bundled, such as framework, deps, etc.
      const [discoveries, err] = await interpretCfg(framework, flags?.externals);
      if (err) {
        console.error(`\nError: ${err.message}`);
        Deno.exit(1);
      }

      // -- this needs to run early, the intention of the --info flag is only
      //    to display information about the project
      if (flags?.info) {
        printInterpretedCfg(discoveries, flags.info as "json" | "text");
        Deno.exit();
      }

      // -- build section

      // -- handling mountable
      //    domid and mountable are mutually exclusive and dependent upon each other

      // -- handling spa

      // -- handling npm

      const domIdForDev = flags.domid || "root";

      let buildforTarget: DistroTarget = "mountable";

      if (flags?.dev) {
        buildforTarget = "spa";
      } else {
        const buildforFlags = [
          flags?.buildforNpm,
          flags?.buildforSpa,
          flags?.buildforMountable,
        ].filter(Boolean);
        if (buildforFlags.length > 1) {
          console.error("\nError: Only one --buildfor-* flag can be specified");
          Deno.exit(1);
        }

        if (flags?.buildforNpm) {
          buildforTarget = "npm";
        } else if (flags?.buildforSpa) {
          buildforTarget = "spa";
        } else if (flags?.buildforMountable) {
          buildforTarget = "mountable";
        }
      }

      const [rsbuild, rsbErr] = await rsbuilder(discoveries, buildforTarget, domIdForDev);
      if (rsbErr) {
        console.error(`\n Error: ${rsbErr.message}`);
        if (rsbErr.stack) {
          console.error(`\nStack trace:\n${rsbErr.stack}`);
        }
        Deno.exit(1);
      }

      try {
        if (flags?.dev) {
          // console.log("Dev mode: HTML generation enabled with domId:", domIdForDev);
          await rsbuild.startDevServer();
        } else {
          console.log(`Framework found.. ${discoveries.framework}`);
          console.log(`Bundling.. ${discoveries.entryPoint}`);
          await rsbuild.build();

          const strategy = getStrategy(buildforTarget);
          console.log(strategy.getOutputMessage());
        }
      } catch (error) {
        console.error(`\n Error: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
          console.error(`\nStack trace:\n${error.stack}`);
        }
        Deno.exit(1);
      }
    },
  )
  .parse(Deno.args);
