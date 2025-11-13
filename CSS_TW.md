# Tailwind v4 Integration Plan (`--css-tw`)

## Overview
Add support for Tailwind CSS v4 to bundlemeup via a `--css-tw` flag. This will allow users to include Tailwind CSS in their projects without manual configuration.

## Background
- Tailwind v4 has a different setup than v3 - it uses CSS imports instead of PostCSS plugins
- Tailwind v4 uses `@import "tailwindcss"` in CSS files
- The new architecture is simpler and more performant

## Implementation Plan

### 1. Update Type Definitions
**File**: `src/types.ts`

- Add `cssTw?: boolean` to `BundlemeupFlags` interface
- This flag will enable Tailwind v4 integration

### 2. Update CLI Arguments
**File**: `src/cli.ts`

- Add `--css-tw` option to both `dev` and `build` commands
- Pass the flag through to the `bundlemeup()` function
- Update `BuildFlags` interface to include `cssTw?: boolean`

### 3. Pass Flag Through Core Logic
**File**: `src/mod.ts`

- Pass `cssTw` flag from CLI to `buildForStrategy()` function
- Update the strategy calls to include CSS configuration

### 4. Update Build Strategy
**File**: `src/buildfor-strategy.ts`

- Add `cssTw` parameter to `buildForStrategy()` function
- Pass it to all framework-specific config builders (reactSpa, reactMountable, etc.)

### 5. Update Project Data Interface
**File**: `src/project-data.ts`

- Add `cssTw?: boolean` field to `ProjectData` interface
- Pass this through when building configurations

### 6. Create Virtual CSS File
**File**: `src/virtual.ts`

- Add function `createTailwindCss()` that returns:
  ```css
  @import "tailwindcss";
  ```
- This will be injected as a virtual module when `--css-tw` is enabled

### 7. Update Framework Configs
**Files**: 
- `src/rsbuild-configs/react.ts`
- `src/rsbuild-configs/preact.ts`
- `src/rsbuild-configs/svelte.ts`

For each config function (e.g., `reactSpa`, `reactMountable`, `reactNpm`):

1. Accept `ProjectData` parameter that includes `cssTw` flag
2. When `cssTw` is enabled:
   - Add Tailwind CSS virtual file to `virtualModules`
   - Import the CSS file in the generated mount code
   - Install `tailwindcss` package (v4) as a dependency

**Example for React SPA**:
```typescript
export function reactSpa(pd: ProjectData): CreateRsbuildOptions {
  const virtualModules: Record<string, () => string> = {
    "bundlemeup/_mod.jsx": () => spaAutoMountCode,
  };
  
  if (pd.cssTw) {
    virtualModules["bundlemeup/tailwind.css"] = () => createTailwindCss();
    // Modify spaAutoMountCode to include:
    // import "./bundlemeup/tailwind.css";
  }
  
  // ... rest of config
}
```

### 8. Update Virtual Mount Code Generation
**File**: `src/virtual.ts`

Modify `createSpaAutoMountCode()` and `createUnifiedMountCode()`:
- Add optional parameter `includeTailwind?: boolean`
- When true, prepend CSS import to the generated code:
  ```javascript
  import "../tailwind.css";
  ```

### 9. Install Tailwind v4 Dependency
**File**: `deno.json`

Add to imports:
```json
"tailwindcss": "npm:tailwindcss@^4.0.0"
```

### 10. Documentation Updates
**File**: `README.md`

Add section:
```markdown
### CSS Options

#### Tailwind CSS v4
Use `--css-tw` flag to automatically set up Tailwind CSS v4:

```bash
bundlemeup dev --css-tw
bundlemeup build --for-spa --css-tw
```

This will:
- Automatically inject Tailwind CSS imports
- Use Tailwind v4's new CSS-based architecture
- No configuration file needed
```

### 11. Example Projects
Create example projects to demonstrate:
- `examples/deno-react-tailwind/` - React with Tailwind
- `examples/bun-svelte-tailwind/` - Svelte with Tailwind

### 12. Testing
**File**: `tests/tailwind.test.ts` (new)

Create tests for:
- Dev server with `--css-tw` flag
- Build with `--css-tw` flag
- Verify Tailwind classes are processed correctly
- Test with all frameworks (React, Preact, Svelte)

## Technical Considerations

### Tailwind v4 Architecture
- No `tailwind.config.js` needed by default
- Uses `@import "tailwindcss"` in CSS
- Auto-detects utility classes in source files
- Simpler setup than v3

### Rsbuild Integration
- Rsbuild handles CSS processing via Rspack
- Virtual module plugin can inject the CSS import
- No need for additional PostCSS configuration

### Virtual Module Strategy
1. Create virtual CSS file: `bundlemeup/tailwind.css`
2. Import it in the virtual mount code
3. Let Rsbuild/Rspack handle the CSS processing
4. Tailwind v4 will auto-scan for utility classes

## Future Enhancements
- `--css-tw-config` flag to provide custom Tailwind config
- Support for Tailwind v4 theme customization
- Auto-install Tailwind plugins
- Support for `@theme` directive in v4

## Dependencies to Add
```json
{
  "tailwindcss": "npm:tailwindcss@^4.0.0"
}
```

## Migration Path
Users currently using Tailwind v3 would need to:
1. Remove `tailwind.config.js`
2. Remove PostCSS config
3. Use `--css-tw` flag
4. Update to Tailwind v4 syntax if needed

## Success Criteria
- [ ] `bundlemeup dev --css-tw` starts dev server with Tailwind
- [ ] `bundlemeup build --for-spa --css-tw` bundles with Tailwind
- [ ] Tailwind utilities work in all frameworks (React, Preact, Svelte)
- [ ] No manual configuration required
- [ ] Tests pass for all scenarios
- [ ] Documentation is clear and complete
- [ ] Example projects demonstrate usage
