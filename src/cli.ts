#!/usr/bin/env node

/**
 * This module contains the cli to run @habitat/bundleup on a project.
 * @module
 */

import { Command } from "@cliffy/command";
import { bundleup } from "./mod.ts";
import type { Frameworks } from "./types.ts";

const program = new Command();

program.name("bundlemeup").description("Bundle your app").version("1.0.0")
  .action(function (this: Command) {
    this.showHelp();
  });

program
  .command("info")
  .description("Print info about project")
  .action(async () => {
    try {
      await bundleup({ command: "info" });
    } catch (err) {
      console.error(err);
      Deno.exit(1);
    }
  });

program
  .command("dev")
  .description("Start an rsbuild dev server")
  .option(
    "--framework <framework>",
    "Optional. By default, bundlemeup will try to detect the framework from dependencies. Use flag if you prefer to be explicit",
  )
  .option("--css-tw", "Force enable Tailwind CSS v4 integration (auto-detected if tailwindcss is in dependencies)")
  .option("--cp-static", "Force copy static assets from 'static' directory (auto-detected if static/ exists)")
  .option("--custom-html", "Use custom index.html from project root instead of generating one")
  .action(async (flags: { framework?: string; cssTw?: boolean; cpStatic?: boolean; customHtml?: boolean }) => {
    try {
      await bundleup({
        command: "dev",
        framework: flags?.framework as Frameworks,
        cssTw: flags.cssTw,
        cpStatic: flags.cpStatic,
        customHtml: flags.customHtml,
      });
    } catch (err) {
      console.error(err);
      Deno.exit(1);
    }
  });

interface BuildFlags {
  framework?: string;
  externals?: string;
  forNpm?: boolean;
  forMountable?: boolean;
  forSpa?: boolean;
  cssTw?: boolean;
  cpStatic?: boolean;
  customHtml?: boolean;
}

program
  .command("build")
  .description("Build your app, mountable, or NPM package")
  .option(
    "--framework <framework>",
    "Optional. By default, bundlemeup will try to detect the framework from dependencies. Use flag if you prefer to be explicit",
  )
  .option(
    "--externals <externals>",
    "Specify dependencies to mark as external. Use 'framework' for auto detection or a comma-separated list of package names",
  )
  .option("--for-npm", "Build for NPM")
  .option("--for-mountable", "Build a mountable application for external use")
  .option("--for-spa", "Build a single-page application")
  .option("--css-tw", "Force enable Tailwind CSS v4 integration (auto-detected if tailwindcss is in dependencies)")
  .option("--cp-static", "Force copy static assets from 'static' directory (auto-detected if static/ exists)")
  .option("--custom-html", "Use custom index.html from project root instead of generating one")
  .action(async (flags: BuildFlags) => {
    try {
      await bundleup({
        command: "build",
        framework: flags?.framework as Frameworks,
        externals: flags?.externals,
        forNpm: flags.forNpm,
        forMountable: flags.forMountable,
        forSpa: flags.forSpa,
        cssTw: flags.cssTw,
        cpStatic: flags.cpStatic,
        customHtml: flags.customHtml,
      });
    } catch (err) {
      console.error(err);
      Deno.exit(1);
    }
  });

program.parse();
