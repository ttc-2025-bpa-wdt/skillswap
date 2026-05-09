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
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.52 6.52 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5" />
        </svg>
        <input type="text" name={queryParam} {placeholder} {value} aria-label={placeholder} />
    </div>
    {#if children}
        {@render children()}
    {/if}
</form>

<style lang="scss">
    :global(.search-form) {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;

        @media (max-width: 600px) {
            flex-direction: column;
            gap: 1rem;
        }
    }

    .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
    }

    .search-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 1em;
        height: 1em;
        color: var(--foreground);
        opacity: 0.5;
        pointer-events: none;
        font-size: 1rem;
    }

    input {
        width: 100%;
        padding: 0.5rem 1rem 0.5rem 2.5rem !important;
        border: 1px solid var(--accent-3);
        border-radius: 8px;
        background: var(--background);
        color: var(--foreground);
        font-size: 0.9rem;
        box-sizing: border-box;

        &:focus {
            outline: none;
            border-color: var(--accent-1);
        }
    }
</style>