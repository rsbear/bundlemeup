import type { InlineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { ProjectData } from "../project-data.ts";
import { toFileUrl } from "@std/path/to-file-url";
import tailwindcss from "@tailwindcss/postcss";

export async function reactSpa(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;
  const cwd = Deno.cwd();
  
  const tempDir = `${cwd}/.bundlemeup`;
  await Deno.mkdir(tempDir, { recursive: true });

  const entryContent = `
import App from "${appFileUrl}";
import React from 'react';
import { createRoot } from "react-dom/client";
${pd.cssTw ? 'import "./tailwind.css";' : ''}

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element with id "root" not found');
}

const rootInstance = createRoot(root);
rootInstance.render(
  React.createElement(React.StrictMode, null, React.createElement(App, null))
);
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
    <script type="module" src="/entry.tsx"></script>
  </body>
</html>`;

  await Deno.writeTextFile(`${tempDir}/entry.tsx`, entryContent);
  await Deno.writeTextFile(`${tempDir}/index.html`, htmlContent);
  
  if (pd.cssTw) {
    await Deno.writeTextFile(`${tempDir}/tailwind.css`, '@import "tailwindcss/index.css";');
  }

  const config: InlineConfig = {
    plugins: [react()],
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

  if (pd.cssTw) {
    config.css = {
      postcss: {
        plugins: [
          tailwindcss,
        ],
      },
    };
  }

  return config;
}

export async function reactMountable(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const entryContent = `
import App from "${appFileUrl}";
import React from 'react';
import { createRoot } from "react-dom/client";
${pd.cssTw ? 'import "virtual:tailwind.css";' : ''}

let rootInstance = null;
let rootElement = null;

export function mount(domId = "root") {
  const root = document.getElementById(domId);
  if (!root) {
    throw new Error(\`Root element with id "\${domId}" not found\`);
  }

  if (rootInstance) {
    rootInstance.unmount();
  }

  rootElement = root;
  rootInstance = createRoot(root);
  rootInstance.render(
    React.createElement(React.StrictMode, null, React.createElement(App, null))
  );

  return rootInstance;
}

export function unmount() {
  if (rootInstance) {
    rootInstance.unmount();
    rootInstance = null;
    rootElement = null;
  }
}
`;

  const plugins = [
    react(),
    {
      name: "bundlemeup-virtual-entry",
      resolveId(id: string) {
        if (id === "virtual:entry") return "\0virtual:entry.js";
        if (id === "virtual:tailwind.css" && pd.cssTw) return "\0virtual:tailwind.css";
        return null;
      },
      load(id: string) {
        if (id === "\0virtual:entry.js") return entryContent;
        if (id === "\0virtual:tailwind.css" && pd.cssTw) {
          return '@import "tailwindcss/index.css";';
        }
        return null;
      },
    },
  ];

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

  if (pd.cssTw) {
    config.css = {
      postcss: {
        plugins: [
          tailwindcss,
        ],
      },
    };
  }

  return config;
}

export async function reactNpm(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const externals: string[] = [];
  if (pd.externalDeps) {
    externals.push(...Object.keys(pd.externalDeps));
  }

  const config: InlineConfig = {
    plugins: [react()],
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
