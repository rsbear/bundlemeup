/**
 * HTML Plugin for esbuild
 *
 * This plugin generates an index.html file after the build completes. The generated
 * HTML provides a minimal structure with:
 * - A root div element for mounting the application
 * - A script tag to load the mount.js module
 * - Optional CSS link tag if Tailwind CSS is enabled
 *
 * The plugin inspects the build's metafile to find the correct CSS chunk path when
 * CSS processing is enabled.
 */

import type * as esbuild from "esbuild";

/**
 * Generates the HTML content for the project.
 *
 * @param includeCSS - Whether to include a CSS link tag in the HTML
 * @param cssPath - The path to the CSS file (defaults to './bundle.css')
 * @returns The generated HTML string
 */
function createProjectHTML(includeCSS: boolean, cssPath: string = "/bundle.css"): string {
  const cssLink = includeCSS ? `<link rel="stylesheet" href="${cssPath}" />` : "";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>${cssLink ? `\n    ${cssLink}` : ""}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/bundle.js"></script>
  </body>
</html>`;
}

/**
 * Creates an esbuild plugin that generates an index.html file after the build.
 *
 * @param outdir - The output directory where the HTML file will be written
 * @param includeCSS - Whether to include a CSS link tag in the generated HTML
 * @param customHtmlPath - Optional path to a custom HTML file to copy instead of generating
 * @returns An esbuild plugin that generates the HTML file on build completion
 */
export function createHTMLPlugin(
  outdir: string,
  includeCSS: boolean,
  customHtmlPath?: string,
): esbuild.Plugin {
  return {
    name: "bundlemeup-html",
    setup(build) {
      build.onEnd(async (result) => {
        await Deno.mkdir(outdir, { recursive: true });

        const htmlPath = `${outdir}/index.html`;

        if (customHtmlPath) {
          const customHtml = await Deno.readTextFile(customHtmlPath);
          await Deno.writeTextFile(htmlPath, customHtml);
        } else {
          let cssPath = "./bundle.css";
          if (result.metafile && includeCSS) {
            for (const [outputPath] of Object.entries(result.metafile.outputs)) {
              if (outputPath.endsWith(".css")) {
                cssPath = outputPath.replace("dist/", "./");
                break;
              }
            }
          }

          const html = createProjectHTML(includeCSS, cssPath);
          await Deno.writeTextFile(htmlPath, html);
        }
      });
    },
  };
}
