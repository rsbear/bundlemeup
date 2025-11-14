import type { InlineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { ProjectData } from "../project-data.ts";
import { toFileUrl } from "@std/path/to-file-url";
import tailwindcss from "@tailwindcss/postcss";

export async function svelteSpa(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const entryContent = `
import App from "${appFileUrl}";
import { mount as svelteMount } from "svelte";
${pd.cssTw ? 'import "virtual:tailwind.css";' : ''}

const root = document.getElementById("root");
if (!root) {
  throw new Error('Root element with id "root" not found');
}

svelteMount(App, {
  target: root,
});
`;

  const plugins = [
    svelte(),
    {
      name: "bundlemeup-virtual-entry",
      resolveId(id: string) {
        if (id === "virtual:entry") return "\0virtual:entry";
        if (id === "virtual:tailwind.css" && pd.cssTw) return "\0virtual:tailwind.css";
        return null;
      },
      load(id: string) {
        if (id === "\0virtual:entry") return entryContent;
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
      rollupOptions: {
        input: "virtual:entry",
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

export async function svelteMountable(pd: ProjectData): Promise<InlineConfig> {
  const appAbsPath = Deno.realPathSync(pd.entryPoint);
  const appFileUrl = toFileUrl(appAbsPath).href;

  const entryContent = `
import App from "${appFileUrl}";
import { mount as svelteMount } from "svelte";
${pd.cssTw ? 'import "virtual:tailwind.css";' : ''}

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
        if (id === "virtual:tailwind.css" && pd.cssTw) return "\0virtual:tailwind.css";
        return null;
      },
      load(id: string) {
        if (id === "\0virtual:entry") return entryContent;
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
