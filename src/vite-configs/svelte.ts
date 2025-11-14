import type { InlineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { ProjectData } from "../project-data.ts";
import { toFileUrl } from "@std/path/to-file-url";
import tailwindcss from "@tailwindcss/vite";

export async function svelteSpa(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;
  const cwd = Deno.cwd();

  const tempDir = `${cwd}/.bundlemeup`;
  await Deno.mkdir(tempDir, { recursive: true });

  const entryContent = `
import App from "${appFileUrl}";
import { mount as svelteMount } from "svelte";

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element with id "root" not found');
}

svelteMount(App, {
  target: root,
});
`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/entry.js"></script>
  </body>
</html>`;

  await Deno.writeTextFile(`${tempDir}/entry.js`, entryContent);
  await Deno.writeTextFile(`${tempDir}/index.html`, htmlContent);

  const plugins = [svelte()];

  if (pd.cssTw) {
    plugins.push(tailwindcss());
  }

  const config: InlineConfig = {
    plugins,
    root: tempDir,
    server: {
      fs: {
        strict: false,
      },
    },
    build: {
      rollupOptions: {
        input: `${tempDir}/index.html`,
        output: {
          entryFileNames: "index.js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
      outDir: `${cwd}/dist`,
      emptyOutDir: true,
    },
  };

  return config;
}

export async function svelteMountable(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const cwd = Deno.cwd();
  const tempDir = `${cwd}/.bundlemeup`;
  await Deno.mkdir(tempDir, { recursive: true });

  const entryContent = `
import App from "${appFileUrl}";
import { mount as svelteMount } from "svelte";

let componentInstance = null;

export function mount(domId = "root") {
  const root = document.getElementById(domId);
  if (!root) {
    throw new Error(\`Root element with id "\${domId}" not found\`);
  }

  if (componentInstance) {
    unmount();
  }

  componentInstance = svelteMount(App, {
    target: root,
  });

  return componentInstance;
}

export function unmount() {
  if (componentInstance) {
    componentInstance.$destroy();
    componentInstance = null;
  }
}
`;

  const plugins = [
    svelte(),
    {
      name: "bundlemeup-virtual-entry",
      resolveId(id: string) {
        if (id === "virtual:entry") return "\0virtual:entry";
        return null;
      },
      load(id: string) {
        if (id === "\0virtual:entry") return entryContent;
        return null;
      },
    },
  ];

  if (pd.cssTw) {
    plugins.push(tailwindcss());
  }

  const config: InlineConfig = {
    plugins,
    root: Deno.cwd(),
    build: {
      lib: {
        entry: "virtual:entry",
        formats: ["es"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "index.js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
      outDir: "dist",
    },
  };

  return config;
}

export async function svelteNpm(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const externals: string[] = [];
  if (pd.externalDeps) {
    externals.push(...Object.keys(pd.externalDeps));
  }

  const config: InlineConfig = {
    plugins: [svelte()],
    root: Deno.cwd(),
    build: {
      lib: {
        entry: appFileUrl,
        formats: ["es"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        external: externals.length > 0 ? externals : undefined,
        output: {
          entryFileNames: "index.js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
      outDir: "dist",
    },
  };

  return config;
}
