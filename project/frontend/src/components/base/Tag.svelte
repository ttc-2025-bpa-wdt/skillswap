<script lang="ts">
    import type { ITag } from "shared/schema";

    export let payload: Partial<ITag>;
    export let foreground: string = "var(--foreground)";
    export let children: (() => any) | undefined = undefined;

    let classes: string = "";
    export { classes as class };

    const name = payload.name || null;
    const color = payload.color || "var(--background)";

    classes = (`tag ${classes}`).trim();
</script>

<span class={classes} style={`background-color: ${color}; color: ${foreground}`}>
    {#if name}
        {name}
    {:else if children}
        {@render children()}
    {/if}
</span>

<style lang="scss">
    :global(.tag) {
        text-transform: uppercase;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        display: inline-block;
    }
</style>
