<script lang="ts">
    export let placeholder: string = "Search...";
    export let action: string = "/search";
    export let queryParam: string = "q";
    export let value: string = "";
    export let children: (() => any) | undefined = undefined;

    let classes: string = "";
    export { classes as class };

    classes = (`search-form ${classes}`).trim();
</script>

<form class={classes} {action}>
    <div class="input-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="search-icon">
            <path
                fill-rule="evenodd"
                d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
                clip-rule="evenodd"></path>
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
