<script lang="ts">
    import { onMount } from "svelte";
    import Icon from '@lib/Icon.svelte';

    let currentTheme = $state<"light" | "dark">("light");

    function toggle() {
        currentTheme = currentTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", currentTheme);
        localStorage.setItem("theme", currentTheme);
    }

    onMount(() => {
        const saved = localStorage.getItem("theme") as "light" | "dark" | null;
        if (saved) {
            currentTheme = saved;
            document.documentElement.setAttribute("data-theme", saved);
        }
    });
</script>

<button class="theme-toggle" on:click={toggle} aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}>
    {#if currentTheme === 'light'}
        <Icon icon="mdi:weather-night" width={20} height={20} />
    {:else}
        <Icon icon="mdi:weather-sunny" width={20} height={20} />
    {/if}
</button>

<style lang="scss">
    .theme-toggle {
        background: none;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
        color: var(--foreground);
        border-radius: 50%;
        transition: background 0.2s;

        &:hover {
            background: rgba(0, 0, 0, 0.05);
        }
    }
</style>