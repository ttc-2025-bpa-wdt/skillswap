<script lang="ts">
    import { onMount } from "svelte";
    import Icon from '@lib/Icon.svelte';

    let toasts: Array<{
        id: string;
        type: "success" | "error" | "info" | "warning";
        title: string;
        message: string;
        duration?: number;
    }> = [];

    let toastIdCounter = 0;

    export function addToast(
        type: "success" | "error" | "info" | "warning",
        title: string,
        message: string,
        duration: number = 5000
    ) {
        const id = `toast-${++toastIdCounter}`;
        toasts = [...toasts, { id, type, title, message, duration }];

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }

    export function removeToast(id: string) {
        toasts = toasts.filter((t) => t.id !== id);
    }

    export function success(title: string, message: string, duration?: number) {
        return addToast("success", title, message, duration);
    }

    export function error(title: string, message: string, duration?: number) {
        return addToast("error", title, message, duration);
    }

    export function info(title: string, message: string, duration?: number) {
        return addToast("info", title, message, duration);
    }

    export function warning(title: string, message: string, duration?: number) {
        return addToast("warning", title, message, duration);
    }

    function getIcon(type: string): string {
        switch (type) {
            case "success":
                return "mdi:check-circle";
            case "error":
                return "mdi:alert-circle";
            case "warning":
                return "mdi:alert";
            case "info":
            default:
                return "mdi:information";
        }
    }
</script>

<div class="toast-container" role="alert" aria-live="polite">
    {#each toasts as toast}
        <div class="toast toast-{toast.type}" data-testid="toast">
            <div class="toast-icon">
                <Icon icon={getIcon(toast.type)} width={24} height={24} />
            </div>
            <div class="toast-content">
                <strong class="toast-title">{toast.title}</strong>
                <p class="toast-message">{toast.message}</p>
            </div>
            <button class="toast-close" on:click={() => removeToast(toast.id)} aria-label="Close">
                <Icon icon="mdi:close" width={18} height={18} />
            </button>

            {#if toast.duration && toast.duration > 0}
                <div class="toast-progress" style="animation-duration: {toast.duration}ms"></div>
            {/if}
        </div>
    {/each}
</div>

<style lang="scss">
    .toast-container {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-width: 400px;
        pointer-events: none;

        @media (max-width: 480px) {
            left: 1rem;
            right: 1rem;
            max-width: none;
        }
    }

    .toast {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        background: var(--card-bg);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        position: relative;
        overflow: hidden;
        animation: slide-in 0.3s ease;

        &.toast-success {
            border-left: 4px solid #10b981;

            .toast-icon {
                color: #10b981;
            }
        }

        &.toast-error {
            border-left: 4px solid #ef4444;

            .toast-icon {
                color: #ef4444;
            }
        }

        &.toast-warning {
            border-left: 4px solid #f59e0b;

            .toast-icon {
                color: #f59e0b;
            }
        }

        &.toast-info {
            border-left: 4px solid var(--accent-1);

            .toast-icon {
                color: var(--accent-1);
            }
        }
    }

    @keyframes slide-in {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .toast-icon {
        flex-shrink: 0;
    }

    .toast-content {
        flex: 1;
        min-width: 0;
    }

    .toast-title {
        display: block;
        font-size: 0.95rem;
        font-weight: 600;
        margin-bottom: 0.25rem;
    }

    .toast-message {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-muted);
    }

    .toast-close {
        background: none;
        border: none;
        padding: 0.25rem;
        cursor: pointer;
        color: var(--text-muted);
        border-radius: 4px;
        transition: all 0.2s ease;

        &:hover {
            background: rgba(0, 0, 0, 0.05);
            color: var(--foreground);
        }
    }

    .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.3;
        animation: progress linear forwards;

        .toast-success & {
            background: #10b981;
        }

        .toast-error & {
            background: #ef4444;
        }

        .toast-warning & {
            background: #f59e0b;
        }

        .toast-info & {
            background: var(--accent-1);
        }
    }

    @keyframes progress {
        from {
            width: 100%;
        }
        to {
            width: 0%;
        }
    }
</style>