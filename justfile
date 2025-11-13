# just do commands

default:
  @just --list

clean:
  cd examples 
  rm -rf examples/deno-react/dist 
  rm -rf examples/deno-svelte/dist 
  rm -rf examples/deno-preact/dist 
  rm -rf examples/bun-react/dist 
  rm -rf examples/bun-svelte/dist 

build_npm:
  deno task build:npm

test_all:
  deno task test:all

dev_deno_react:
  cd examples/deno-react && deno run -A ../../src/cli.ts dev

dev_deno_preact:
  cd examples/deno-preact && deno run -A ../../src/cli.ts dev

dev_deno_svelte:
  cd examples/deno-svelte && deno run -A ../../src/cli.ts dev

dev_bun_react:
  cd examples/bun-react && bun ../../npm/esm/cli.js dev

dev_bun_svelte:
  cd examples/bun-svelte && bun ../../npm/esm/cli.js dev

build_deno_react:
  cd examples/deno-react && deno run -A ../../src/cli.ts build --for-spa

build_deno_preact:
  cd examples/deno-preact && deno run -A ../../src/cli.ts build --for-spa

build_deno_svelte:
  cd examples/deno-svelte && deno run -A ../../src/cli.ts build --for-spa

build_bun_react:
  cd examples/bun-react && bun ../../npm/esm/cli.js build --for-spa

build_bun_svelte:
  cd examples/bun-svelte && bun ../../npm/esm/cli.js build --for-spa

info_deno_react:
  cd examples/deno-react && deno run -A ../../src/cli.ts info

info_deno_preact:
  cd examples/deno-preact && deno run -A ../../src/cli.ts info

info_deno_svelte:
  cd examples/deno-svelte && deno run -A ../../src/cli.ts info

info_bun_react:
  cd examples/bun-react && bun ../../npm/esm/cli.js info

info_bun_svelte:
  cd examples/bun-svelte && bun ../../npm/esm/cli.js info
