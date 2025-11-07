clean:
  cd examples 
  rm -rf deno-react/dist 
  rm -rf deno-svelte/dist 
  rm -rf deno-preact/dist 
  rm -rf bun-react/dist 
  rm -rf bun-svelte/dist 

test_all:
  deno task test

dev_deno_react:
  cd examples/deno-react && deno run -A ../../mod.ts --dev

dev_deno_preact:
  cd examples/deno-preact && deno run -A ../../mod.ts --dev

dev_deno_svelte:
  cd examples/deno-svelte && deno run -A ../../mod.ts --dev
