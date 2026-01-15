<script lang="ts">
    import { onMount } from "svelte";

    export let currentPath: string = "/dashboard"; // Default, or passed prop

    $: segment = currentPath.split("/")[1] || "dashboard";
    $: activePage = `/${segment}`;

    const menuItems = [
        { href: "/dashboard", icon: "mdi:view-dashboard", label: "Dashboard" },
        { href: "/search", icon: "mdi:search", label: "Search" },
        { href: "/sessions", icon: "mdi:account-box", label: "My Sessions" },
        { href: "/settings", icon: "mdi:settings", label: "Settings" },
    ];
</script>

<nav class="menu-strip">
    {#each menuItems as item}
        <a href={item.href} class:active={activePage === item.href}>
            <iconify-icon class="icon" icon={item.icon}></iconify-icon>
            <span>{item.label}</span>
        </a>
    {/each}
</nav>

<style lang="scss">
    .menu-strip {
        display: none;
    }

    @media (max-width: 600px) {
        .menu-strip {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: var(--background);
            border-top: 1px solid var(--accent-3);
            align-items: center;
            justify-content: space-around;
            z-index: 1000;
        }

        a {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 0.75rem;
            color: color-mix(in srgb, var(--foreground) 70%, var(--background) 20%);
            text-decoration: none;

            :global(.icon) {
                font-size: 1.5rem;
            }

            &.active {
                color: var(--accent-1);
            }
        }
    }
</style>
