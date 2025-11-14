<script lang="ts">
  let count = $state(0);
  console.log("esbuildany svelte");

  const handleClick = () => {
    count++;
  };
</script>

<div>hello svelte</div>
<button onclick={handleClick}>
  clicks: {count}
</button>
