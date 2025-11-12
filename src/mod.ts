#!/usr/bin/env node
import { Command } from "@cliffy/command";
import { interpretProjectData, printProjectData } from "./project-data.ts";
import { createRsbuild } from "@rsbuild/core";
import { buildForStrategy } from "./buildfor-strategy.ts";
import type { BuildTargets, Frameworks } from "./types.ts";

const program = new Command();

program.name("bundlemeup").description("Bundle your app").version("1.0.0");

program
  .command("info")
  .description("Print info about project")
  .action(async () => {
    const [pd, err] = await interpretProjectData();
    if (err) {
      console.error(err);
      Deno.exit();
    }
    printProjectData(pd, "text");
  });

program
  .command("dev")
  .description("Start an rsbuild dev server")
  .option(
    "--framework <framework>",
    "Optional. By default, bundlemeup will try to detect the framework from dependencies. Use flag if you prefer to be explicit",
  )
  .action(async (flags: { framework?: string }) => {
    const [pd, err] = await interpretProjectData(flags?.framework as Frameworks);
    if (err) {
      console.error(err);
      Deno.exit();
    }

    const cfg = buildForStrategy(pd, "spa");
    const rsbuild = await createRsbuild(cfg);
    await rsbuild.startDevServer();
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
    const [pd, err] = await interpretProjectData(flags?.framework as Frameworks);
    if (err) {
      console.error(err);
      Deno.exit();
    }

    const targets = buildTargetToStrUnion(flags);

    const cfg = buildForStrategy(pd, targets);

    const rsbuild = await createRsbuild(cfg);
    await rsbuild.build();
  });

program.parse();

function buildTargetToStrUnion(flags: BuildFlags): BuildTargets {
  if (flags.forNpm) return "npm";
  if (flags.forSpa) return "spa";
  if (flags.forMountable) return "mountable";
  return "spa";
}
