# bundlemeup - A dead simple JS/TS bundler built on rsbuild

For the sake of simplicity! A lightweight CLI tool that wraps rsbuild to bundle React, Svelte, or Preact applications.

## Features

- Export default from an `app.ts(x)` and say `bundlemeup`
- Bundle React, Preact, and Svelte with a single command
- Detects frameworks
- Generates application mounting via virtualization
- Bundling can output an SPA, a mountable ESM module, or an NPM module
- Dev mode with HMR, thanks to rsbuild
- Fast, also thanks to rsbuild

## Quick bit on how it works
bundlemeup CLI does some best guesses about what to do based on your package.json or deno.json. For example, if it sees React in your dependencies, it sets up rsbuild and plugin-react behind the scenes and can bundle accordingly - same thing for Svelte or Preact.

## Not for you if..
- You need to customize your build process
- You don't like build magic

## Installation

### From Source

```bash
deno install -A -n bundlemeup mod.ts
```

## Usage

### Production Build

```bash
bundlemeup --framework react
bundlemeup -f preact
bundlemeup -f svelte
```

This will:
1. Find your app entry point (searches for `app.tsx`, `App.tsx`, `App.svelte`, etc.)
2. Generate framework-specific mount code
3. Bundle everything into `./dist/bundle.js`

### Development Mode

```bash
bundlemeup --framework react --dev
bundlemeup -f svelte -d
```

This will:
1. Bundle your app with source maps
2. Start a dev server on `http://localhost:3000`
3. Watch for file changes and rebuild automatically
4. Reload the browser when files change

## Project Structure

Your project should have one of these entry points:
- `app.tsx` / `App.tsx`
- `app.ts` / `App.ts`
- `src/app.tsx` / `src/App.tsx`
- `App.svelte` (for Svelte)

Example:

```
my-app/
├── app.tsx          # Your app component
├── deno.json        # Project config (package.json is supported)
└── ...
```

## CLI Options

- `-f, --framework <type>` - Framework to use: `react`, `preact`, or `svelte` (default: `react`)
- `-d, --dev` - Development mode with file watching and dev server
- `-h, --help` - Show help message

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

## License

MIT
