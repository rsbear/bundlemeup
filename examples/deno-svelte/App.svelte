<script lang="ts">
  import "./steeze.css";

  import { getCount, incCount } from "./State.svelte";

  const handleClick = () => {
    incCount();
  };
</script>

<div>hello svelte</div>
<button onclick={handleClick}>
  clicks: {getCount()}
</button>
