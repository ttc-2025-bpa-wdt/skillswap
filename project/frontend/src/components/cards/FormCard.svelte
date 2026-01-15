<script lang="ts">
    import Card from "../base/Card.svelte";
    
    export let children: () => any;
    
    let classes: string = "";
    export { classes as class };

    classes = (`form-card ${classes}`).trim();
</script>

<Card class={classes}>
    {@render children()}
</Card>

<style lang="scss">
    // Using :global because these styles seem intended to apply to children slots
    :global(.form-group) {
        label {
            display: block;
            font-family: "Montserrat", sans-serif;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--foreground);
            margin-bottom: 0.5rem;
        }

        input {
            width: 100%;
            padding: 0.75rem 1rem;
            color: var(--foreground);
            font-size: 1rem;

            &.error {
                border-color: var(--base-red);
            }
        }

        .error-message {
            display: block;
            color: var(--base-red);
            font-size: 0.85rem;
            margin-top: 0.25rem;
            min-height: 1.2em;
        }
    }

    :global(.form-options) {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        font-size: 0.9rem;

        .checkbox-container {
            display: flex;
            align-items: center;
            cursor: pointer;
            color: var(--foreground);
            user-select: none;

            input {
                margin-right: 0.5rem;
                accent-color: var(--accent-1);
                width: 16px;
                height: 16px;
            }
        }
    }
</style>
