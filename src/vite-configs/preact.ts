import type { InlineConfig } from "vite";
import preact from "@preact/preset-vite";
import type { ProjectData } from "../project-data.ts";
import { toFileUrl } from "@std/path/to-file-url";
import tailwindcss from "@tailwindcss/vite";

export async function preactSpa(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;
  const cwd = Deno.cwd();
  
  const tempDir = `${cwd}/.bundlemeup`;
  await Deno.mkdir(tempDir, { recursive: true });

  const entryContent = `
import App from "${appFileUrl}";
import { render, h } from "preact";

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element with id "root" not found');
}

render(h(App, null), root);
`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
    ${pd.cssTw ? '<link rel="stylesheet" href="/tailwind.css" />' : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/entry.jsx"></script>
  </body>
</html>`;

  await Deno.writeTextFile(`${tempDir}/entry.jsx`, entryContent);
  await Deno.writeTextFile(`${tempDir}/index.html`, htmlContent);
  
  if (pd.cssTw) {
    await Deno.writeTextFile(`${tempDir}/tailwind.css`, '@import "tailwindcss";');
  }

  const plugins = [preact()];
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

export async function preactMountable(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const cwd = Deno.cwd();
  const tempDir = `${cwd}/.bundlemeup`;
  await Deno.mkdir(tempDir, { recursive: true });

  if (pd.cssTw) {
    await Deno.writeTextFile(`${tempDir}/tailwind.css`, '@import "tailwindcss";');
  }

  const entryContent = `
import App from "${appFileUrl}";
import { render, h } from "preact";
${pd.cssTw ? 'import "../.bundlemeup/tailwind.css";' : ''}

let rootInstance = null;
let rootElement = null;

export function mount(domId = "root") {
  const root = document.getElementById(domId);
  if (!root) {
    throw new Error(\`Root element with id "\${domId}" not found\`);
  }

  if (rootInstance) {
    unmount();
  }

  rootElement = root;
  rootInstance = render(h(App, null), root);

  return rootInstance;
}

export function unmount() {
  if (rootInstance && rootElement) {
    render(null, rootElement);
    rootInstance = null;
    rootElement = null;
  }
}
`;

  const plugins = [
    {
      name: "bundlemeup-virtual-entry",
      resolveId(id: string) {
        if (id === "virtual:entry") return "\0virtual:entry.js";
        return null;
      },
      load(id: string) {
        if (id === "\0virtual:entry.js") return entryContent;
        return null;
      },
    },
    preact(),
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

export async function preactNpm(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const externals: string[] = [];
  if (pd.externalDeps) {
    externals.push(...Object.keys(pd.externalDeps));
  }

  const config: InlineConfig = {
    plugins: [preact()],
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
