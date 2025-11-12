# bundlemeup

For the sake of simplicity! A CLI tool that wraps rsbuild to bundle React, Svelte, or Preact to specified targets.

## Features

- Export default from an `app.ts(x)` and say `bundlemeup`
- Bundle React, Preact, and Svelte with a single command
- Detects frameworks
- Generates application mounting via virtualization
- Bundling can output an SPA, a mountable ESM module, or an NPM module
- Dev mode with HMR, thanks to rsbuild
- Fast, also thanks to rsbuild
- Satisfies minimalism fetish

## Planned features
- [ ] flag `--css-*` for automatically setting up different CSS approaches
- [ ] flag `--deployto-*` for deploying bundles to a given host
- [ ] Support `solidjs` as a frontend framework
- [ ] Support `gleam/lustre` as a frontend framework
- [ ] Support `ripple` as a frontend framework

## Not for you if..
- You need to customize your build process
- You don't like build magic

## Setting up a project for `bundlemeup`

### Directory Structure
Please note that an `app` file is **required**. It's the file that `bundlemeup` looks up as an entry point.
```
my-app/
├── app.tsx or App.svelte       # Your app component
├── deno.json or package.json   # Project config
└── ...
```

### Conventions and Entry Points
`bundlemup` leverages file naming as a convention - the following file names are supported:
- `App.ts(x)`, `App.js(x)`, `app.ts(x)`, `app.js(x)`, or one of those within a `src` directory (e.g. `src/app.tsx`)
- `App.svelte`, `src/App.svelte`
- __TODO: support mod.ts(x) for developing npm/jsr modules__

`bundlemeup` CLI does some best guesses about what to do based on your package.json or deno.json. For example, if it sees React in your dependencies, it sets up rsbuild and plugin-react behind the scenes and can bundle accordingly - same thing for Svelte or Preact.


## Usage

### CLI

```bash
# Get project info
bundlemeup info

# Start dev server
bundlemeup dev [--framework <react|preact|svelte>]

# Build for different targets
bundlemeup build --for-spa           # Build single-page application
bundlemeup build --for-npm           # Build for npm package
bundlemeup build --for-mountable     # Build mountable application
```

### Programmatic API

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

**Build an SPA**
```bash
deno run -A jsr:@mayi/bundlemeup --buildfor-spa
```

**Build as a Mountable ESM module**
```bash
deno run -A jsr:@mayi/bundlemeup --buildfor-mountable
```

**Build for NPM (WIP, currently not working)**
```bash
deno run -A jsr:@mayi/bundlemeup --buildfor-npm
```

This will:
1. Find your app entry point (searches for `app.tsx`, `App.tsx`, `App.svelte`, etc.)
2. Generate framework-specific mount code
3. Bundle everything into `./dist/*`


## CLI Options

- `-f, --framework <type>` - Framework to use: `react`, `preact`, or `svelte` (default: `react`)
- `-d, --dev` - Starts your app in an `rsbuild` dev server
- `-h, --help` - Show help message
- `--buildfor-spa` - Outputs a production ready SPA build
- `--buildfor-mountable` - Outputs a production ready mountable ESM module
- `--buildfor-npm` - Outputs a module ready for NPM distribution

## Examples

### React App

```typescript
// app.tsx
export default function App() {
  return <h1>Hello React!</h1>;
}
```

```bash
bundler -f react -d
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
3. **Bundling**: Uses esbuild with Deno loader to bundle everything

## Why...?
- It's something that i personally wanted. 
- If i can't see build or config files, i'm not thinking about them.
- It fits a use case for some other projects im working on (undisclosed)

## License

MIT
