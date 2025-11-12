# Testing Strategy

This directory contains tests for bundlemeup using both Deno and Bun test APIs.

## Test Files

- `test-helpers.ts` - Shared test helpers for Deno tests (uses @std/fs)
- `test-helpers-bun.ts` - Shared test helpers for Bun tests (uses node:fs)
- `deno.test.ts` - Deno-specific tests using Deno.test()
- `bun.test.ts` - Bun-specific tests using bun:test
- `all.test.ts` - Standalone test runner that tests all examples and prints summary

## Running Tests

### Deno Tests
Tests Deno examples (deno-react, deno-preact, deno-svelte):

```bash
deno task test
# or
deno test -A tests/deno.test.ts
```

### Bun Tests
Tests Bun examples (bun-react, bun-svelte):

**Note:** Bun tests currently require the source to work with Node.js-compatible imports. The tests are designed but may need the npm-built version or additional setup.

```bash
bun test tests/bun.test.ts
```

### All Tests
Runs all tests across all examples and provides a summary:

```bash
deno task test:all
# or
deno run -A tests/all.test.ts
```

## Test Coverage

Each example is tested for:
- ✅ `info` command - Detects runtime, framework, and entry file
- ✅ `build --for-spa` - Creates dist/ with index.html and bundled JS
- ✅ `build --for-npm` - Creates dist/ with npm-compatible output
- ✅ `build --for-mountable` - Creates dist/ with mountable bundle

## Examples Tested

### Deno Examples
- `examples/deno-react/` - React with Deno
- `examples/deno-preact/` - Preact with Deno
- `examples/deno-svelte/` - Svelte with Deno

### Bun Examples
- `examples/bun-react/` - React with Bun
- `examples/bun-svelte/` - Svelte with Bun

## Implementation Notes

- Tests use the programmatic API (`bundlemeup()` function) rather than spawning CLI processes
- Each test cleans up the `dist/` directory before building
- Tests verify that expected files are created (dist/, index.html, etc.)
- Deno and Bun tests use separate helper files due to different module systems
- The `all.test.ts` runner works with both runtimes and provides detailed output
