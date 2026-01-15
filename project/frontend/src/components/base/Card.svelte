<script lang="ts">
    export let href: string | null = null;
    export let children: () => any;

    let classes: string = "";
    export { classes as class };

    const element = href ? "a" : "div";
    classes = `card ${classes}`.trim();
</script>

<svelte:element this={element} class={classes} {href} {...$$restProps}>
    {@render children()}
</svelte:element>

<style lang="scss">
    :global(.card) {
        display: flex;
        flex-direction: column;
        background: var(--card-bg);
        border: 1px solid var(--accent-3);
        border-radius: 12px;
        padding: 2rem;
        box-shadow: var(--shadow-sm);
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        box-sizing: border-box;
    }

    :global(a.card) {
        color: inherit;
        text-decoration: none;
    }
</style>
