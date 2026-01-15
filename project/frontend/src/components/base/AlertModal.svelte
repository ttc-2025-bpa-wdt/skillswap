<script>
    import { alertStore } from '../../lib/ui';
    import Button from './Button.svelte';

    let state;
    alertStore.subscribe(value => {
        state = value;
    });

    function handleClose(result = undefined) {
        if (state.resolve) {
            state.resolve(result);
        }
    }
</script>

{#if state.isOpen}
    <div class="modal-backdrop" on:click={() => state.type !== 'confirm' && handleClose()}>
        <div class="modal-content" on:click|stopPropagation>
            <h3>{state.title}</h3>
            <p>{state.message}</p>
            <div class="modal-actions">
                {#if state.type === 'confirm'}
                    <Button onclick={() => handleClose(false)} variant="ghost">Cancel</Button>
                    <Button onclick={() => handleClose(true)} variant="primary">Confirm</Button>
                {:else}
                    <Button onclick={() => handleClose()} variant="primary">OK</Button>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
    }

    .modal-content {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: fadeIn 0.2s ease-out;
        
        h3 {
             margin-top: 0;
             margin-bottom: 1rem;
             color: var(--foreground);
             font-family: 'Montserrat', sans-serif;
        }

        p {
            margin-bottom: 2rem;
            color: var(--foreground);
            opacity: 0.9;
            line-height: 1.5;
            white-space: pre-wrap; /* Preserve newlines */
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
