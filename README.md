# bundlemeup

For the sake of simplicity! A CLI tool that wraps rsbuild to bundle React, Svelte, or Preact to specified targets. Also enable tailwindcss via flag. Essentially this a tool for lazy people or those who get distracted by the onslaught of config files in JS/TS projects..

## Not for you if..
- You need to customize your build process
- You don't like build magic

## Straight To The Point

- Make an entry point `app.tsx`, `mod.tsx`, or any acceptable convention.
- We look configure the bundler based on the framework in your project dependencies.
- Please leverage the `--help` flag for insights

## Usage

check out the examples directory or...

### Project structure**
```bash
my-app/
├── app.tsx or App.svelte       # Your app component
├── deno.json or package.json   # Project config
└── ...
```

**Dev server (deno)**
```bash
deno run -A jsr:@habitat/bundleup dev --css-tw
```
**Possible builds (deno)**
```bash
deno run -A jsr:@habitat/bundleup build --for-spa --css-tw 
deno run -A jsr:@habitat/bundleup build --for-npm --css-tw 
deno run -A jsr:@habitat/bundleup build --for-mountable
```

**Dev server (NPM)**
```bash
bunx bundlemeup dev --css-tw
```
**Possible builds (NPM)**
```bash
bunx bundlemeup build --for-spa
bunx bundlemeup build --for-npm --css-tw
bunx bundlemeup build --for-mountable --css-tw
```

This will:
1. Find your app entry point (searches for `app.tsx`, `App.tsx`, `App.svelte`, etc.)
2. Generate framework-specific mount code
3. Bundle everything into `./dist/*` or start a dev server

## TODOs or Planned features
- [ ] leverage src/rsbuild-plugin-deno instead of snowmans so that the CLI can work with deno and npm module
- [ ] flag `--css-*` for automatically setting up different CSS approaches
- [ ] Support `solidjs` as a frontend framework
- [ ] Support `gleam/lustre` as a frontend framework
- [ ] Support `ripple` as a frontend framework
- [ ] flag `--deployto-*` for deploying bundles to a given host


---


## CLI Options

- `-h, --help` - Show help message
- `dev` - Start an rsbuild dev server
    - `--framework <type>` - Framework to use: `react`, `preact`, or `svelte` (default: is based on project deps)
    - `--css-tw` - Virtualizes tailwind, postcss, and css entry point
- `build` - Start an rsbuild dev server
    - `--framework <type>` - Framework to use: `react`, `preact`, or `svelte` (default: is based on project deps)
    - `--css-tw` - Virtualizes tailwind, postcss, and css entry point
    - `--for-spa` - Outputs a production ready SPA build
    - `--for-mountable` - Outputs a production ready mountable ESM module
    - `--for-npm` - Outputs a module ready for NPM distribution


## Programmatic API

```typescript
import { bundlemeup } from "bundlemeup";

await bundlemeup({
  command: "build",
  forSpa: true,
  framework: "react",
  cwd: "./my-project"
});
```

## Testing

```bash
# Run Deno tests (tests Deno examples)
deno task test

# Run all tests with summary
deno task test:all

# Run Bun tests (requires Bun runtime)
bun test tests/bun.test.ts
```

## Development

```bash
# Build npm package
deno task build:npm

# Run tests
deno task test
```



## Examples

### React App

```typescript
// app.tsx
export default function App() {
  return <h1>Hello React!</h1>;
}
```

```bash
 -f react -d
```

### Preact App

```typescript
// app.tsx
export default function App() {
  return <h1>Hello Preact!</h1>;
}
```

```bash
bundler -f preact -d
```

### Svelte App

```svelte
<!-- App.svelte -->
<script>
  let count = 0;
</script>

<h1>Hello Svelte!</h1>
<button on:click={() => count++}>
  Count: {count}
</button>
```

## How It Works

1. **Package Management Detection**: Determines projects package manager via lock files
1. **Entry Point Detection**: Automatically finds your app component
2. **Virtualized Mount Code**: Creates framework-specific mounting code
3. **Bundling**: Uses rsbuild

## Why...?
- It's something that i personally wanted. 
- If i can't see build or config files, i'm not thinking about them.
- It fits a use case for some other projects im working on (undisclosed)

## License

MIT
