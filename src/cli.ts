#!/usr/bin/env node
import { Command } from "@cliffy/command";
import { bundlemeup } from "./mod.ts";
import type { Frameworks } from "./types.ts";

const program = new Command();

program.name("bundlemeup").description("Bundle your app").version("1.0.0")
  .action(function() {
    this.showHelp();
  });

program
  .command("info")
  .description("Print info about project")
  .action(async () => {
    try {
      await bundlemeup({ command: "info" });
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
  .action(async (flags: { framework?: string }) => {
    try {
      await bundlemeup({
        command: "dev",
        framework: flags?.framework as Frameworks,
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
  .action(async (flags: BuildFlags) => {
    try {
      await bundlemeup({
        command: "build",
        framework: flags?.framework as Frameworks,
        externals: flags?.externals,
        forNpm: flags.forNpm,
        forMountable: flags.forMountable,
        forSpa: flags.forSpa,
      });
    } catch (err) {
      console.error(err);
      Deno.exit(1);
    }
  });

program.parse();
