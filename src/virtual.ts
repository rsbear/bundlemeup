/**
 * The module contains a given frameworks' mount code.
 * It is injected or built in a build or dev time.
 * @module
 */

import type { Frameworks } from "./types.ts";

const VIRTUAL_PREFIX = "virtual:bundlemeup/";
const VIRTUAL_MOD_ID = `${VIRTUAL_PREFIX}_mod.jsx`;
const VIRTUAL_MOUNT_ID = `${VIRTUAL_PREFIX}_mount.jsx`;

export function getVirtualIds() {
  return { VIRTUAL_PREFIX, VIRTUAL_MOD_ID, VIRTUAL_MOUNT_ID };
}

export function createTailwindCss(): string {
  return `@import "tailwindcss/index.css";`;
}

export function createSpaAutoMountCode(
  framework: Frameworks,
  appImportSpecifier: string,
  domId: string = "root",
  includeTailwind?: boolean,
): string {
  const cssImport = includeTailwind ? `import "../tailwind.css";` : "";
  const appImport = `import App from "${appImportSpecifier}";`;

  switch (framework) {
    case "react":
      return `${cssImport}
${appImport}
import React from 'react';
import { createRoot } from "react-dom/client";

const root = document.getElementById("${domId}");
if (!root) {
  throw new Error(\`Root element with id "${domId}" not found\`);
}

const rootInstance = createRoot(root);
rootInstance.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

    case "preact":
      return `${cssImport}
${appImport}
import { render } from "preact";

const root = document.getElementById("${domId}");
if (!root) {
  throw new Error(\`Root element with id "${domId}" not found\`);
}

render(<App />, root);`;

    case "svelte":
      return `${cssImport}
${appImport}
import { mount as svelteMount } from "svelte";

const root = document.getElementById("${domId}");
if (!root) {
  throw new Error(\`Root element with id "${domId}" not found\`);
}

svelteMount(App, {
  target: root,
});`;

    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}

export function createUnifiedMountCode(
  framework: Frameworks,
  appImportSpecifier: string,
  includeTailwind?: boolean,
): string {
  const cssImport = includeTailwind ? `import "../tailwind.css";` : "";
  const appImport = `import App from "${appImportSpecifier}";`;

  switch (framework) {
    case "react":
      return `${cssImport}
${appImport}
import React from 'react';
import { createRoot } from "react-dom/client";

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
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  return rootInstance;
}

export function unmount() {
  if (rootInstance) {
    rootInstance.unmount();
    rootInstance = null;
    rootElement = null;
  }
}`;

    case "preact":
      return `${cssImport}
${appImport}
import { render } from "preact";

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
  rootInstance = render(<App />, root);

  return rootInstance;
}

export function unmount() {
  if (rootInstance && rootElement) {
    render(null, rootElement);
    rootInstance = null;
    rootElement = null;
  }
}`;

    case "svelte":
      return `${cssImport}
${appImport}
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
}`;

    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}
