/**
 * The module contains a given frameworks' mount code.
 * It is injected or built in a build or dev time.
 * @module
 */

import type { Frameworks } from "./types.ts";

const VIRTUAL_PREFIX = "virtual:bundlemeup/";
const VIRTUAL_MOD_ID = `${VIRTUAL_PREFIX}_mod.jsx`;
const VIRTUAL_MOUNT_ID = `${VIRTUAL_PREFIX}_mount.jsx`;
const VIRTUAL_BUNDLE_ID = `${VIRTUAL_PREFIX}_bundle.jsx`;
const VIRTUAL_FRAMEWORK_ID = `${VIRTUAL_PREFIX}_framework.jsx`;

export function getVirtualIds() {
  return {
    VIRTUAL_PREFIX,
    VIRTUAL_MOD_ID,
    VIRTUAL_MOUNT_ID,
    VIRTUAL_BUNDLE_ID,
    VIRTUAL_FRAMEWORK_ID,
  };
}

export function createMountCode(
  framework: Frameworks,
  appImportSpecifier: string,
  frameworkImportSpecifier: string,
): string {
  switch (framework) {
    case "react":
      return `
import App from "${appImportSpecifier}";
import { React, createRoot } from "${frameworkImportSpecifier}";

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
}`;

    case "preact":
      return `
import App from "${appImportSpecifier}";
import { render, h } from "${frameworkImportSpecifier}";

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
}`;

    case "svelte":
      return `
import App from "${appImportSpecifier}";
import { mount as svelteMount, unmount as svelteUnmount } from "${frameworkImportSpecifier}";

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
    svelteUnmount(componentInstance, { outro: true });
    componentInstance = null;
  }
}`;

    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}
