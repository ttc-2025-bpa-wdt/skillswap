<script lang="ts">
    interface Props {
        width?: string;
        height?: string;
        variant?: "text" | "card" | "avatar" | "button";
        count?: number;
    }

    let { width = "100%", height = "1rem", variant = "text", count = 1 }: Props = $props();
</script>

{#each Array(count) as _}
    <div class="skeleton skeleton-{variant}" style="width: {width}; height: {height};"></div>
{/each}

<style>
    .skeleton {
        background: linear-gradient(
            90deg,
            var(--accent-3, #e2e8f0) 25%,
            color-mix(in srgb, var(--accent-3, #e2e8f0), white 50%) 50%,
            var(--accent-3, #e2e8f0) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
    }

    .skeleton-card {
        border-radius: 12px;
        height: 200px;
    }

    .skeleton-avatar {
        border-radius: 50%;
        width: 40px;
        height: 40px;
    }

    .skeleton-button {
        border-radius: 8px;
        width: 80px;
        height: 36px;
    }

    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>