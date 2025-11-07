import { rsbuilder } from "./bundler.ts";
import { interpretCfg } from "./interpreted-config.ts";
import { serveDir } from "@std/http/file-server";
import { join } from "@std/path/join";
import type { Frameworks } from "./types.ts";

interface Example {
  name: string;
  path: string;
  framework: Frameworks;
  domId: string;
}

async function discoverExamples(): Promise<Example[]> {
  const examples: Example[] = [];
  const examplesDir = "./examples";

  try {
    for await (const entry of Deno.readDir(examplesDir)) {
      if (!entry.isDirectory) continue;

      const examplePath = join(examplesDir, entry.name);

      // Generate DOM ID from example name
      // e.g., "deno-react" -> "example-deno-react"
      const domId = `example-${entry.name}`;

      // We'll discover framework properly when bundling (after chdir)
      // For now, just use a placeholder - it will be updated in bundleExample
      examples.push({
        name: entry.name,
        path: examplePath,
        framework: "react", // placeholder, will be updated during bundling
        domId,
      });
    }
  } catch (error) {
    console.error("Error discovering examples:", error);
  }

  return examples;
}

async function bundleExample(example: Example): Promise<string> {
  const originalCwd = Deno.cwd();
  try {
    // Change to example directory
    Deno.chdir(example.path);

    // Discover project details using the refactored API
    const [discoveries, err] = await interpretCfg();
    if (err) {
      throw new Error(`Failed to discover project: ${err.message}`);
    }

    console.log(`📦 Bundling ${example.name} (${discoveries.framework})...`);

    // Bundle the example using the refactored API with mountable strategy
    const [rsbuild, rsbErr] = await rsbuilder(discoveries, "mountable");
    if (rsbErr) {
      throw new Error(
        `Failed to create rsbuild instance: ${
          rsbErr instanceof Error ? rsbErr.message : String(rsbErr)
        }`,
      );
    }

    await rsbuild.build();

    // Find the generated bundle file (using relative path since we're in example dir)
    const distJsDir = "./dist/static/js";
    const jsFiles: string[] = [];

    try {
      for await (const entry of Deno.readDir(distJsDir)) {
        if (
          entry.isFile &&
          entry.name.endsWith(".js") &&
          !entry.name.includes(".LICENSE")
        ) {
          jsFiles.push(entry.name);
        }
      }
    } catch (error) {
      // Try to list what's actually in dist
      try {
        console.log(`  Debug: Checking dist directory...`);
        const distDir = "./dist";
        for await (const entry of Deno.readDir(distDir)) {
          console.log(
            `  Debug: Found in dist: ${entry.name} (${entry.isDirectory ? "dir" : "file"})`,
          );
          if (entry.isDirectory && entry.name === "static") {
            const staticDir = join(distDir, "static");
            for await (const staticEntry of Deno.readDir(staticDir)) {
              console.log(`  Debug: Found in static: ${staticEntry.name}`);
            }
          }
        }
      } catch {
        // Ignore debug errors
      }
      throw new Error(
        `Directory ${distJsDir} not found or not readable: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    // Find the main index file
    const mainFile = jsFiles.find((f) => f.startsWith("index.")) || jsFiles[0];

    if (!mainFile) {
      console.error(`  Debug: Available JS files: ${jsFiles.join(", ")}`);
      throw new Error(
        `No bundle file found for ${example.name} in ${distJsDir}`,
      );
    }

    // Return relative path from test root
    return `./examples/${example.name}/dist/static/js/${mainFile}`;
  } finally {
    Deno.chdir(originalCwd);
  }
}

function generateImportMap(
  examples: Example[],
  bundlePaths: Map<string, string>,
): string {
  const imports: Record<string, string> = {};

  for (const example of examples) {
    const bundlePath = bundlePaths.get(example.name);
    if (bundlePath) {
      // Create import specifier like "@examples/deno-react"
      const importSpec = `@examples/${example.name}`;
      imports[importSpec] = bundlePath;
    }
  }

  return JSON.stringify({ imports }, null, 2);
}

function generateTestHTML(
  examples: Example[],
  bundlePaths: Map<string, string>,
  importMap: string,
): string {
  const sections = examples
    .map((example) => {
      const bundlePath = bundlePaths.get(example.name);
      if (!bundlePath) return "";

      return `
    <section>
      <h2>examples/${example.name}</h2>
      <div id="${example.domId}"></div>
    </section>
    `;
    })
    .join("\n");

  const mountScript = examples
    .map((example) => {
      const bundlePath = bundlePaths.get(example.name);
      if (!bundlePath) return "";
      const importSpec = `@examples/${example.name}`;
      return `
      try {
        const { mount } = await import("${importSpec}");
        const mountTarget = document.getElementById("${example.domId}");
        console.log("-- mount", mount)

        if (!mountTarget) {
          console.error("✗ Mount target not found for ${example.name}: ${example.domId}");
        } else if (mount) {
          mount("${example.domId}");
          console.log("✓ Mounted ${example.name}");
        } else {
          console.error("✗ Failed to mount ${example.name}: missing mount export");
        }
      } catch (error) {
        console.error("✗ Error mounting ${example.name}:", error);
      }
    `;
    })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>bundlemeup Integration Test</title>
  <script type="importmap">
${importMap}
  </script>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    section {
      background: white;
      margin: 20px 0;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      margin-top: 0;
      color: #333;
      padding-bottom: 10px;
      font-family: monospace;
      font-height: 14px;
    }
    h2 {
      margin-top: 0;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 10px;
      font-family: monospace;
      font-height: 12px;
    }
    #example-deno-react,
    #example-deno-preact,
    #example-deno-svelte,
    #example-bun-react,
    #example-bun-svelte {
      min-height: 80px;
      padding: 10px;
      border: 1px dashed #ccc;
      border-radius: 4px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>bundlemeup Integration Test</h1>
  <p>Testing all bundled examples:</p>

${sections}

  <script type="module">
    // Mount all bundles using ES module imports via import map
    (async () => {
${mountScript}
    })();
  </script>
</body>
</html>`;
}

async function main() {
  console.log("🔍 Discovering examples...");
  const examples = await discoverExamples();

  if (examples.length === 0) {
    console.error("No examples found!.. exiting.");
    Deno.exit(1);
  }

  console.log(`✓ Found ${examples.length} examples:`);
  examples.forEach((ex) => console.log(`  - ${ex.name}`));

  console.log("\n📦 Bundling examples...");
  const bundlePaths = new Map<string, string>();

  for (const example of examples) {
    try {
      const bundlePath = await bundleExample(example);
      bundlePaths.set(example.name, bundlePath);
      console.log(`  ✓ ${example.name}: ${bundlePath}`);
    } catch (error) {
      console.error(
        `  ✗ ${example.name}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  if (bundlePaths.size === 0) {
    console.error("No bundles were created successfully!");
    Deno.exit(1);
  }

  console.log("\n🚀 Starting test server on http://localhost:3000");
  console.log("   Press Ctrl+C to stop\n");
  console.log(
    "   HTML and import map are generated server-side on each request\n",
  );

  Deno.serve({ port: 3000 }, (req) => {
    const url = new URL(req.url);

    // Serve HTML dynamically
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const importMap = generateImportMap(examples, bundlePaths);
      const html = generateTestHTML(examples, bundlePaths, importMap);
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Serve import map dynamically
    if (url.pathname === "/import-map.json") {
      const importMap = generateImportMap(examples, bundlePaths);
      return new Response(importMap, {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Serve static files from examples
    return serveDir(req, {
      fsRoot: ".",
      quiet: true,
    });
  });
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    Deno.exit(1);
  });
}
