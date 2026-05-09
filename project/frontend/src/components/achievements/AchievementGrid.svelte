<script lang="ts">
    import AchievementBadge from "./AchievementBadge.svelte";
    import { onMount } from "svelte";
    import Icon from '@lib/Icon.svelte';
    import { apiFetch } from "@lib/api";

    export let userId: string;

    let achievements: any[] = [];
    let loading: boolean = true;
    let selectedCategory: string = "all";
    let filter: string = "all"; // all, unlocked, locked

    const categories = [
        { value: "all", label: "All" },
        { value: "teaching", label: "Teaching" },
        { value: "learning", label: "Learning" },
        { value: "community", label: "Community" },
        { value: "special", label: "Special" },
    ];

    $: filteredAchievements = achievements.filter((a) => {
        const categoryMatch = selectedCategory === "all" || a.category === selectedCategory;
        const filterMatch =
            filter === "all" ||
            (filter === "unlocked" && a.unlocked) ||
            (filter === "locked" && !a.unlocked);
        return categoryMatch && filterMatch;
    });

    $: unlockedCount = achievements.filter((a) => a.unlocked).length;
    $: totalPoints = achievements
        .filter((a) => a.unlocked)
        .reduce((sum, a) => sum + a.points, 0);

    async function fetchAchievements() {
        loading = true;
        try {
            const response = await apiFetch("/api/v1/user/achievements/progress");
            const data = await response.json();
            if (data.success) {
                achievements = data.progress;
            }
        } catch (error) {
            console.error("Failed to fetch achievements:", error);
        }
        loading = false;
    }

    onMount(fetchAchievements);
</script>

<div class="achievement-grid">
    <div class="grid-header">
        <div class="stats">
            <div class="stat">
                <Icon icon="mdi:trophy" width={24} height={24} />
                <span class="stat-value">{unlockedCount}/{achievements.length}</span>
                <span class="stat-label">Unlocked</span>
            </div>
            <div class="stat">
                <Icon icon="mdi:star" width={24} height={24} />
                <span class="stat-value">{totalPoints}</span>
                <span class="stat-label">Points</span>
            </div>
        </div>

        <div class="filters">
            <div class="filter-group">
                <label>Category:</label>
                <select bind:value={selectedCategory}>
                    {#each categories as cat}
                        <option value={cat.value}>{cat.label}</option>
                    {/each}
                </select>
            </div>

            <div class="filter-group">
                <label>Status:</label>
                <select bind:value={filter}>
                    <option value="all">All</option>
                    <option value="unlocked">Unlocked</option>
                    <option value="locked">Locked</option>
                </select>
            </div>
        </div>
    </div>

    {#if loading}
        <div class="loading-state">
            <Icon icon="mdi:loading" width={48} height={48} class="spin" />
            <p>Loading achievements...</p>
        </div>
    {:else if filteredAchievements.length === 0}
        <div class="empty-state">
            <Icon icon="mdi:trophy-outline" width={64} height={64} />
            <p>No achievements found</p>
        </div>
    {:else}
        <div class="grid">
            {#each filteredAchievements as achievement}
                <AchievementBadge {achievement} size="md" showProgress={true} />
            {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .achievement-grid {
        padding: 1rem;
    }

    .grid-header {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--accent-3);
    }

    .stats {
        display: flex;
        gap: 2rem;
    }

    .stat {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--accent-1);

        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .stat-label {
            font-size: 0.85rem;
            color: var(--text-muted);
        }
    }

    .filters {
        display: flex;
        gap: 1rem;
    }

    .filter-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        label {
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        select {
            padding: 0.5rem;
            border: 1px solid var(--accent-3);
            border-radius: 6px;
            background: var(--card-bg);
            color: var(--foreground);
            font-size: 0.85rem;
        }
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;

        @media (max-width: 640px) {
            grid-template-columns: 1fr;
        }
    }

    .loading-state,
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        color: var(--text-muted);
        text-align: center;

        p {
            margin-top: 1rem;
        }
    }

    .spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>