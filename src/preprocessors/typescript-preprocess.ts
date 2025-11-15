import { transform, type TransformOptions } from "esbuild";
import type { PreprocessorGroup, Processed } from "svelte/compiler";

export interface TypeScriptPreprocessorOptions {
  /**
   * esbuild transform options
   */
  transformOptions?: Omit<TransformOptions, "loader" | "sourcefile">;

  /**
   * Whether to enable source maps
   * @default true
   */
  sourcemap?: boolean | "inline" | "external";

  /**
   * Target JavaScript version
   * @default 'es2020'
   */
  target?: TransformOptions["target"];

  /**
   * Define replacements for compile-time constants
   */
  define?: Record<string, string>;

  /**
   * tsconfig.json content as object
   */
  tsconfigRaw?: string | object;

  /**
   * Whether to preserve Svelte imports (for .svelte.ts modules)
   * @default true
   */
  preserveSvelteImports?: boolean;
}

const isExternal = /^(https?:)?\/\//;

/**
 * Checks if a script tag contains TypeScript based on its attributes
 */
function isTypeScript(attrs: Record<string, string | boolean>): boolean {
  const { lang, type, src } = attrs;

  // Check lang attribute
  if (typeof lang === "string" && /^(ts|typescript)$/.test(lang)) {
    return true;
  }

  // Check type attribute
  if (typeof type === "string" && /^(text|application)\/(ts|typescript)$/.test(type)) {
    return true;
  }

  // Check src attribute for .ts files (but not external URLs)
  if (typeof src === "string" && !isExternal.test(src) && /\.ts$/.test(src)) {
    return true;
  }

  return false;
}

/**
 * Creates a TypeScript preprocessor using esbuild
 */
export function createTypeScriptPreprocessor(
  options: TypeScriptPreprocessorOptions = {},
): PreprocessorGroup {
  const {
    transformOptions = {},
    sourcemap = true,
    target = "es2020",
    define,
    tsconfigRaw,
    preserveSvelteImports = true,
  } = options;

  return {
    script: async ({ content, attributes, filename }): Promise<Processed> => {
      // Skip .svelte.ts files - they should be handled by Svelte's compiler
      if (filename && /\.svelte\.(ts|js)$/.test(filename)) {
        return { code: content };
      }

      // Only process TypeScript files
      if (!isTypeScript(attributes)) {
        return { code: content };
      }

      try {
        // Build esbuild transform options
        const esbuildOptions: TransformOptions = {
          ...transformOptions,
          loader: "ts",
          sourcefile: filename,
          target,
          format: "esm",
          // CRITICAL: Keep imports as-is, don't try to resolve them
          // The main esbuild bundle step will handle resolution
          platform: "browser",
          sourcemap: sourcemap === "inline" ? "inline" : sourcemap === true ? "external" : false,
          tsconfigRaw: tsconfigRaw
            ? (typeof tsconfigRaw === "string" ? tsconfigRaw : JSON.stringify(tsconfigRaw))
            : JSON.stringify({
                compilerOptions: {
                  target: "ES2015",
                  verbatimModuleSyntax: true,
                  isolatedModules: true,
                },
              }),
          define: define || transformOptions.define,
        };

        // Transform TypeScript to JavaScript
        const result = await transform(content, esbuildOptions);

        // Prepare the response
        const processed: Processed = {
          code: result.code,
        };

        // Add source map if available
        if (result.map) {
          processed.map = result.map;
        }

        // Add dependencies if available
        if (result.warnings && result.warnings.length > 0) {
          processed.dependencies = result.warnings
            .filter((w) => w.location?.file)
            .map((w) => w.location!.file);
        }

        return processed;
      } catch (error: any) {
        // Convert esbuild errors to Svelte preprocessor format
        const err = new Error(`TypeScript compilation failed: ${error.message}`);

        if (error.errors && error.errors.length > 0) {
          const esbuildError = error.errors[0];
          if (esbuildError.location) {
            (err as any).start = {
              line: esbuildError.location.line,
              column: esbuildError.location.column,
            };
            (err as any).end = {
              line: esbuildError.location.line,
              column: esbuildError.location.column + esbuildError.location.length,
            };
          }
        }

        throw err;
      }
    },
  };
}

// Default export with common presets
export default createTypeScriptPreprocessor;

// Convenience exports for common configurations
export const typescript = createTypeScriptPreprocessor;

export const typescriptStrict = (customOptions: TypeScriptPreprocessorOptions = {}) =>
  createTypeScriptPreprocessor({
    ...customOptions,
    tsconfigRaw: {
      compilerOptions: {
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        strictBindCallApply: true,
        strictPropertyInitialization: true,
        noImplicitThis: true,
        alwaysStrict: true,
        ...(typeof customOptions.tsconfigRaw === "object"
          ? (customOptions.tsconfigRaw as any).compilerOptions
          : {}),
      },
    },
  });
