clean:
  cd examples 
  rm -rf examples/deno-react/dist 
  rm -rf examples/deno-svelte/dist 
  rm -rf examples/deno-preact/dist 
  rm -rf examples/bun-react/dist 
  rm -rf examples/bun-svelte/dist 

test_all:
  deno task test

dev_deno_react:
  cd examples/deno-react && deno run -A ../../mod.ts --dev

dev_deno_preact:
  cd examples/deno-preact && deno run -A ../../mod.ts --dev

dev_deno_svelte:
  cd examples/deno-svelte && deno run -A ../../mod.ts --dev
