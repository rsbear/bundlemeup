# Testing Plan for bundlemeup

## Overview
Test that bundlemeup works correctly across different runtimes (Deno, Bun, Node.js) and frameworks (React, Preact, Svelte).

## Prerequisites

### Before Testing
1. **Refactor for programmatic API** (RECOMMENDED)
   - Separate CLI code from core logic
   - Export `bundlemeup()` function from `src/mod.ts`
   - Move CLI-specific code to `src/cli.ts`
   - This enables easier testing without process spawning

2. **Build npm package**
   ```bash
   deno task build:npm
   ```

3. **Link package for local testing**
   ```bash
   cd npm && npm link
   ```

## Test Matrix

### Examples to Test
- `examples/deno-react/` - Deno runtime, React framework
- `examples/deno-preact/` - Deno runtime, Preact framework  
- `examples/deno-svelte/` - Deno runtime, Svelte framework
- `examples/bun-react/` - Bun runtime, React framework
- `examples/bun-svelte/` - Bun runtime, Svelte framework

### Commands to Test per Example
1. `info` - Verify project detection
2. `dev` - Start dev server (manual verification)
3. `build --for-spa` - Build SPA
4. `build --for-npm` - Build for npm
5. `build --for-mountable` - Build mountable

## Testing Methods

### Option A: Programmatic API Testing (RECOMMENDED)
After refactoring, create `test-examples.ts`:

```typescript
import { bundlemeup } from "./src/mod.ts";

// Test each example programmatically
const examples = [
  { path: "./examples/deno-react", runtime: "deno", framework: "react" },
  { path: "./examples/bun-react", runtime: "bun", framework: "react" },
  // ... etc
];

for (const example of examples) {
  await bundlemeup({
    command: "build",
    forSpa: true,
    cwd: example.path
  });
}
```

### Option B: CLI Bin Testing
Test the actual CLI binary after npm build:

```bash
# For Deno examples
cd examples/deno-react
bundlemeup info
bundlemeup build --for-spa

# For Bun examples  
cd examples/bun-react
bundlemeup info
bundlemeup build --for-spa
```

### Option C: Runtime-Specific Testing
Use each runtime's native package manager:

**Deno:**
```bash
cd examples/deno-react
deno run -A ../../src/mod.ts info
deno run -A ../../src/mod.ts build --for-spa
```

**Bun:**
```bash
cd examples/bun-react
bun ../../npm/esm/mod.js info
bun ../../npm/esm/mod.js build --for-spa
```

## Success Criteria

### `info` command
- [ ] Correctly detects runtime (Deno, Bun, Node)
- [ ] Correctly detects framework (React, Preact, Svelte)
- [ ] Shows expected entry point
- [ ] No errors

### `dev` command
- [ ] Server starts successfully
- [ ] App loads in browser
- [ ] HMR works
- [ ] No console errors

### `build --for-spa` command
- [ ] Build completes without errors
- [ ] `dist/` directory created
- [ ] Contains `index.html` with script tags
- [ ] Contains bundled JS and CSS files
- [ ] Assets are properly referenced

### `build --for-npm` command
- [ ] Build completes without errors
- [ ] Output directory created with proper structure
- [ ] Module exports are valid
- [ ] No unnecessary files included

### `build --for-mountable` command
- [ ] Build completes without errors
- [ ] Creates mountable bundle
- [ ] Export function is available

## Automated Test Script

Create `test-all-examples.ts` that:
1. Iterates through each example directory
2. Runs each command
3. Verifies expected outputs exist
4. Reports pass/fail for each test
5. Generates test report

## Next Steps

1. **Decision Point**: Refactor for programmatic API?
   - **YES (recommended)**: Better testability, cleaner architecture
   - **NO**: Proceed with CLI-only testing via process spawning

2. Create automated test script
3. Run tests on all examples
4. Document any runtime-specific quirks
5. Add to CI/CD pipeline (GitHub Actions)

## Notes

- Some tests may need to be run in specific runtimes (e.g., Deno examples in Deno)
- Dev server tests may need to be semi-automated (start server, check port)
- Build output verification can be fully automated
- Consider adding smoke tests that actually run the built artifacts
## Test Results

All 20 tests passing ✅

- 5 examples tested (deno-react, deno-preact, deno-svelte, bun-react, bun-svelte)
- 4 commands tested per example (info, build --for-spa, build --for-npm, build --for-mountable)
- Total: 20 tests

Run tests with:
```bash
deno task test:all
```
