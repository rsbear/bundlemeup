export function detectStaticDir(): boolean {
  try {
    const stat = Deno.statSync("static");
    return stat.isDirectory;
  } catch {
    return false;
  }
}

export async function copyStaticDir(outDir: string): Promise<void> {
  const staticDir = "static";

  try {
    await Deno.stat(staticDir);
    await Deno.mkdir(`${outDir}/static`, { recursive: true });

    for await (const entry of Deno.readDir(staticDir)) {
      if (entry.isFile) {
        const srcPath = `${staticDir}/${entry.name}`;
        const destPath = `${outDir}/static/${entry.name}`;
        await Deno.copyFile(srcPath, destPath);
      } else if (entry.isDirectory) {
        await copyDirRecursive(`${staticDir}/${entry.name}`, `${outDir}/static/${entry.name}`);
      }
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      console.warn(
        `[static] Warning: ${staticDir} directory not found, skipping static asset copy`,
      );
    } else {
      throw e;
    }
  }
}

async function copyDirRecursive(src: string, dest: string): Promise<void> {
  await Deno.mkdir(dest, { recursive: true });

  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;

    if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    } else if (entry.isDirectory) {
      await copyDirRecursive(srcPath, destPath);
    }
  }
}
