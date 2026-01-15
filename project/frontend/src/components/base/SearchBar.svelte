<script lang="ts">
    export let placeholder: string = "Search...";
    export let action: string = "/search";
    export let queryParam: string = "q";
    export let value: string = "";
    export let children: (() => any) | undefined = undefined;

    let classes: string = "";
    export { classes as class };

    classes = `search-form ${classes}`.trim();
</script>

<form class={classes} {action}>
    <div class="input-wrapper">
        <iconify-icon icon="mdi:magnify" class="search-icon" width="24" height="24" aria-label="Search"></iconify-icon>
        <input type="text" name={queryParam} {placeholder} {value} aria-label={placeholder} />
    </div>
    {#if children}
        {@render children()}
    {/if}
</form>

<style lang="scss">
    :global(.search-form) {
        display: flex;
        gap: 1rem;
        width: 100%;

        @media (max-width: 600px) {
            flex-direction: column;
            gap: 1rem;
        }
    }

    .input-wrapper {
        position: relative;
        flex: 1;
        width: 100%;

        .search-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            width: 1.25rem;
            height: 1.25rem;
            color: var(--foreground);
            opacity: 0.5;
        }

        input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 3rem;
            border: 1px solid var(--accent-3);
            border-radius: 8px;
            background: var(--background);
            color: var(--foreground);
            font-size: 1rem;
            box-sizing: border-box;

            &:focus {
                outline: none;
                border-color: var(--accent-1);
            }
        }
    }
</style>
