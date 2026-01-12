<script lang="ts">
    export let variant: "primary" | "secondary" | "outline" | "ghost" = "primary";
    export let size: "sm" | "md" | "lg" = "md";
    export let href: string | null = null;
    export let className: string = "";
    export let block: boolean = false;

    const classes = ["button", variant, size !== "md" ? size : "", className, block ? "block" : ""]
        .filter(Boolean)
        .join(" ");
</script>

{#if href}
    <a {href} class={classes} {...$$restProps}>
        <slot />
    </a>
{:else}
    <button class={classes} {...$$restProps}>
        <slot />
    </button>
{/if}

<style lang="scss">
    .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-family: "Montserrat", sans-serif;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        text-decoration: none;
        gap: 0.5rem;

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        &.primary {
            background-color: var(--accent-1);
            color: white;
            &:hover:not(:disabled) {
                filter: brightness(1.1);
            }
        }

        &.secondary {
            background-color: transparent;
            box-shadow: inset 0 0 0 2px var(--accent-1);
            color: var(--accent-1);
            &:hover:not(:disabled) {
                background-color: rgba(44, 116, 196, 0.1);
            }
        }

        &.outline {
            background-color: transparent;
            box-shadow: inset 0 0 0 1px var(--accent-3);
            color: var(--foreground);
            &:hover:not(:disabled) {
                border-color: var(--accent-1);
                color: var(--accent-1);
            }
        }

        &.ghost {
            background-color: transparent;
            color: var(--foreground);
            padding: 0.5rem;
            &:hover:not(:disabled) {
                background-color: rgba(0, 0, 0, 0.05);
            }
        }

        &.sm {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
        }
        &.lg {
            padding: 1rem 2rem;
            font-size: 1.1rem;
        }
        &.block {
            width: 100%;
        }
    }
</style>
