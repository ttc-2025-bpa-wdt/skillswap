<script lang="ts">
    export let achievement: {
        key: string;
        name: string;
        description: string;
        icon: string;
        category: string;
        points: number;
        unlocked: boolean;
        unlockedAt?: Date;
        progress?: number;
    };
    export let size: "sm" | "md" | "lg" = "md";
    export let showProgress: boolean = false;

    $: sizeClass = `badge-${size}`;
    $: progressPercent = achievement.progress ?? (achievement.unlocked ? 100 : 0);

    function formatDate(date: Date): string {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
</script>

<div
    class="achievement-badge"
    class:unlocked={achievement.unlocked}
    class:sizeClass
    role="article"
    aria-label={`${achievement.name} achievement${achievement.unlocked ? " (unlocked)" : " (locked)"}`}
>
    <div class="badge-icon">
        <iconify-icon icon={achievement.icon} width={size === "lg" ? 48 : size === "md" ? 36 : 24} height={size === "lg" ? 48 : size === "md" ? 36 : 24}></iconify-icon>
        {#if achievement.unlocked}
            <div class="unlock-glow"></div>
        {/if}
    </div>

    <div class="badge-content">
        <h4 class="badge-name">{achievement.name}</h4>
        <p class="badge-description">{achievement.description}</p>
        
        {#if achievement.unlocked && achievement.unlockedAt}
            <span class="unlock-date">Unlocked {formatDate(achievement.unlockedAt)}</span>
        {/if}

        {#if showProgress && !achievement.unlocked && progressPercent > 0}
            <div class="progress-container">
                <div class="progress-bar" style="width: {progressPercent}%"></div>
                <span class="progress-text">{progressPercent}%</span>
            </div>
        {/if}

        <div class="badge-points">
            <iconify-icon icon="mdi:star" width="14" height="14"></iconify-icon>
            <span>{achievement.points} pts</span>
        </div>
    </div>

    {#if !achievement.unlocked}
        <div class="lock-overlay">
            <iconify-icon icon="mdi:lock" width="24" height="24"></iconify-icon>
        </div>
    {/if}
</div>

<style lang="scss">
    .achievement-badge {
        position: relative;
        display: flex;
        gap: 1rem;
        padding: 1rem;
        background: var(--card-bg);
        border: 2px solid var(--accent-3);
        border-radius: 12px;
        transition: all 0.3s ease;

        &:not(.unlocked) {
            opacity: 0.7;
            filter: grayscale(30%);
        }

        &.unlocked {
            border-color: var(--accent-2);
            box-shadow: 0 0 20px rgba(42, 157, 143, 0.2);
        }

        &:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }
    }

    .badge-sm {
        padding: 0.5rem;
        gap: 0.5rem;

        .badge-name {
            font-size: 0.85rem;
        }

        .badge-description {
            font-size: 0.75rem;
        }
    }

    .badge-lg {
        padding: 1.5rem;
        gap: 1.5rem;
    }

    .badge-icon {
        position: relative;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
        border-radius: 12px;
        flex-shrink: 0;
        color: white;

        .badge-sm & {
            width: 40px;
            height: 40px;
            border-radius: 8px;
        }

        .badge-lg & {
            width: 80px;
            height: 80px;
            border-radius: 16px;
        }
    }

    .unlock-glow {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
        animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 0.5;
        }
        50% {
            opacity: 1;
        }
    }

    .badge-content {
        flex: 1;
        min-width: 0;
    }

    .badge-name {
        margin: 0 0 0.25rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--foreground);
    }

    .badge-description {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-muted);
        line-height: 1.4;
    }

    .unlock-date {
        display: inline-block;
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: var(--accent-2);
        font-weight: 500;
    }

    .progress-container {
        position: relative;
        margin-top: 0.5rem;
        height: 20px;
        background: var(--accent-3);
        border-radius: 10px;
        overflow: hidden;
    }

    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
        border-radius: 10px;
        transition: width 0.3s ease;
    }

    .progress-text {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--foreground);
    }

    .badge-points {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        margin-top: 0.5rem;
        padding: 0.25rem 0.5rem;
        background: rgba(255, 193, 7, 0.15);
        color: #c9a000;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 4px;
    }

    .lock-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: var(--text-muted);
        pointer-events: none;
    }

    .unlocked .lock-overlay {
        display: none;
    }
</style>