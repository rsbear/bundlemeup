# Refactor Plan: Consolidate to src/ Structure

## Overview
Refactor the codebase to use the cleaner `src/` structure as the primary implementation, moving all business logic into `src/` and leaving only configuration files and integration tests in the project root.

## Current State Analysis

### Root Directory Files (to be migrated/removed)
- `mod.ts` - Main CLI entry point (OLD implementation using cliffy)
- `bundler.ts` - Rsbuild instance creator with strategy pattern
- `bundler-strategies.ts` - Strategy implementations (npm/spa/mountable)
- `interpreted-config.ts` - Project configuration interpreter (InterpretedCfg)
- `validations.ts` - Framework flag validation
- `virtual.ts` - Virtual module code generators
- `types.ts` - Type definitions (DistroTarget)

### src/ Directory (NEW structure - target implementation)
- `src/mod.ts` - CLI entry point using Command pattern
- `src/project-data.ts` - Project configuration interpreter (ProjectData - equivalent to InterpretedCfg)
- `src/buildfor-strategy.ts` - Strategy dispatcher (calls rsbuild configs)
- `src/types.ts` - Type definitions (BuildTargets)
- `src/rsbuild-configs/mod.ts` - Framework config exports
- `src/rsbuild-configs/react.ts` - React rsbuild configs (stub)
- `src/rsbuild-configs/preact.ts` - Preact rsbuild configs (stub)
- `src/rsbuild-configs/svelte.ts` - Svelte rsbuild configs (stub)

## Key Differences

1. **Type Names**: 
   - Root: `InterpretedCfg`, `DistroTarget`
   - src/: `ProjectData`, `BuildTargets`

2. **Architecture**:
   - Root: Strategy pattern with full implementations in `bundler-strategies.ts`
   - src/: Strategy dispatcher in `buildfor-strategy.ts` + separate config files per framework

3. **Missing from src/**:
   - `validations.ts` functionality
   - `virtual.ts` module code generators
   - Full rsbuild config implementations in framework files

## Migration Tasks

### Phase 1: Move Shared Utilities to src/
- [ ] Move `virtual.ts` → `src/virtual.ts`
- [ ] Update imports in `src/` files to reference new locations
- [ ] Note: `validations.ts` will be removed (framework validation handled by subcommands)

### Phase 2: Implement Framework Rsbuild Configs
- [ ] Implement `src/rsbuild-configs/react.ts` (reactSpa, reactNpm, reactMountable)
- [ ] Implement `src/rsbuild-configs/preact.ts` (preactSpa, preactNpm, preactMountable)
- [ ] Implement `src/rsbuild-configs/svelte.ts` (svelteSpa, svelteNpm, svelteMountable)
- [ ] Extract logic from root `bundler-strategies.ts` into appropriate framework files
- [ ] Ensure each function returns proper `CreateRsbuildOptions` config

### Phase 3: Update src/mod.ts CLI
- [ ] Add missing import for `createRsbuild`
- [ ] Fix ProjectData type usage (currently references InterpretedCfg in printProjectData)
- [ ] Ensure dev command properly creates and starts rsbuild instance
- [ ] Ensure build command properly creates and builds rsbuild instance
- [ ] Add proper error handling for all commands

### Phase 4: Consolidate Type Definitions
- [ ] Standardize on `src/types.ts` as single source of truth
- [ ] Ensure `BuildTargets` is used consistently (not DistroTarget)
- [ ] Ensure `ProjectData` is used consistently (not InterpretedCfg)
- [ ] Add any missing type exports

### Phase 5: Update Project Entry Point
- [ ] Update `deno.json` main/exports to point to `src/mod.ts`
- [ ] Verify all examples work with new structure
- [ ] Update any documentation references

### Phase 6: Remove Deprecated Root Files
- [ ] Delete `mod.ts` (root)
- [ ] Delete `bundler.ts`
- [ ] Delete `bundler-strategies.ts`
- [ ] Delete `interpreted-config.ts`
- [ ] Delete `validations.ts` (no longer needed with subcommands)
- [ ] Delete `virtual.ts` (moved to src/)
- [ ] Delete `types.ts` (root, consolidated to src/types.ts)

### Phase 7: Final Structure Verification
- [ ] Verify only these files remain in root:
  - `deno.json`, `deno.lock`
  - `.gitignore`
  - `justfile`
  - `README.md`
  - `test-integration.ts`
  - `.github/workflows/`
  - `examples/`
  - `src/`

## Implementation Notes

### Rsbuild Config Structure
Each framework config file should export three functions following this pattern:
```typescript
import type { CreateRsbuildOptions } from "@rsbuild/core";
import { defineConfig } from "@rsbuild/core";
import type { ProjectData } from "../project-data.ts";

export function reactSpa(pd: ProjectData): CreateRsbuildOptions {
  // Implementation with virtual modules for auto-mounting
  // Based on spaStrategy from bundler-strategies.ts
}

export function reactNpm(pd: ProjectData): CreateRsbuildOptions {
  // Implementation with externals support
  // Based on npmStrategy from bundler-strategies.ts
}

export function reactMountable(pd: ProjectData): CreateRsbuildOptions {
  // Implementation with mount/unmount exports
  // Based on mountableStrategy from bundler-strategies.ts
}
```

### Virtual Module Integration
The framework configs need access to:
- `createSpaAutoMountCode()` from `virtual.ts`
- `createUnifiedMountCode()` from `virtual.ts`
- Plugin setup similar to strategies in `bundler-strategies.ts`

### Configuration Constants
Extract common config patterns:
- Plugin setup per framework
- mainFields and conditionNames per framework
- Rspack plugin setup (Deno support)
- Output configuration

## Success Criteria
- All business logic resides in `src/`
- Root contains only config files and integration tests
- All examples work correctly
- No duplicate functionality between root and src/
- Type definitions are consistent throughout
