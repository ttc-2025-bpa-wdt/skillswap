<script lang="ts">
    import Button from "./Button.svelte";

    export let currentPage: number = 1;
    export let totalPages: number | undefined = undefined;
    export let showSelector: boolean = true;

    let classes: string = "";
    export { classes as class };

    classes = `pagination ${classes}`.trim();

    function handlePrev() {
        if (currentPage > 1) {
            currentPage -= 1;
        }
    }

    function handleNext() {
        if (totalPages === undefined || currentPage < totalPages) {
            currentPage += 1;
        }
    }

    function handlePageInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const page = parseInt(target.value, 10);
        if (!isNaN(page) && page >= 1) {
            if (totalPages === undefined || page <= totalPages) {
                currentPage = page;
            }
        }
    }

    function handlePerPageChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        currentPage = 1;
        // Per-page change is handled by parent via re-fetch
        const event = new CustomEvent("perpagechange", { detail: parseInt(target.value, 10) });
        dispatchEvent(event);
    }
</script>

<div class={classes}>
    {#if showSelector}
        <div class="page-info">
            <label for="per-page">Show</label>
            <select id="per-page" onchange={handlePerPageChange}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
            </select>
        </div>
    {/if}

    <div class="nav-controls">
        <Button variant="outline" class="page-btn" onclick={handlePrev} disabled={currentPage <= 1}>&lt;</Button>
        <div class="page-info">
            <span>Page</span>
            <input type="number" value={currentPage} min="1" max={totalPages} aria-label="Page number" onchange={handlePageInput} />
        </div>
        <Button variant="outline" class="page-btn" onclick={handleNext} disabled={totalPages !== undefined && currentPage >= totalPages}>&gt;</Button>
    </div>
</div>

<style lang="scss">
    $gap: 0.5rem;

    :global(.pagination) {
        display: inline-flex;
        align-items: center;
        gap: $gap;
        flex-wrap: wrap;
        max-width: 100%;

        @media (max-width: 600px) {
            justify-content: flex-start;
            gap: 0.5rem;
        }
    }

    .nav-controls {
        display: flex;
        align-items: center;
        gap: $gap;
        height: 100%;
    }

    .page-info {
        display: flex;
        align-items: center;
        color: var(--foreground);
        font-size: 0.9rem;
        gap: $gap;
        height: 100%;
    }

    select,
    input {
        height: 2.25rem;
        padding: 0 0.5rem;
        border: 1px solid var(--accent-3);
        border-radius: 4px;
        background: var(--background);
        color: var(--foreground);
        font-family: inherit;
        box-sizing: border-box;
    }

    input {
        width: 50px;
        text-align: center;
        height: 2.25rem;

        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        -moz-appearance: textfield;
    }

    @media (max-width: 600px) {
        .page-info {
            white-space: nowrap;
        }
    }
</style>