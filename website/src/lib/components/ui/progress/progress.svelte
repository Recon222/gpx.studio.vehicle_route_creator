<script lang="ts">
  import { cn } from "$lib/utils";

  let className: string | undefined | null = undefined;
  export { className as class };
  export let value: number | undefined | null = undefined;
</script>

<div
  class={cn(
    "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
    className
  )}
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={value}
>
  <div
    class="h-full w-full flex-1 bg-primary transition-all"
    style={value ? `transform: translateX(-${100 - value}%)` : "transform: translateX(-100%)"}
  />
</div> 