<script lang="ts">
    import { type IUser } from "shared/schema";
    import Icon from '@lib/Icon.svelte';

    export let user: IUser | null = null;
    export let notificationCount: number = 0;
    export let chatCount: number = 0;
    export let isDemo: boolean = false;

    $: isLoggedIn = user !== null;

    interface NavItem {
        href: string;
        icon: string;
        label: string;
        requiresAuth?: boolean;
        badge?: number;
        center?: boolean;
    }

    const navItems: NavItem[] = [
        { href: "/dashboard", icon: "mdi:home", label: "Home", requiresAuth: true },
        { href: "/search", icon: "mdi:compass", label: "Explore" },
        { href: "/session/create", icon: "mdi:plus", label: "Create", requiresAuth: true, center: true },
        { href: "/profile", icon: "mdi:account-circle", label: "Profile", requiresAuth: true },
    ];

    const loggedOutItems: NavItem[] = [
        { href: "/search", icon: "mdi:compass", label: "Explore" },
        { href: "/auth/login", icon: "mdi:login", label: "Sign In" },
    ];

    $: items = isLoggedIn
        ? navItems.filter(item => !(isDemo && item.href === "/session/create"))
        : loggedOutItems;

    let currentPath = typeof window !== "undefined" ? window.location.pathname : "";

    function updatePath() {
        currentPath = window.location.pathname;
    }

    import { onMount } from "svelte";
    onMount(() => {
        window.addEventListener("popstate", updatePath);
        document.addEventListener("astro:after-swap", updatePath);
        return () => {
            window.removeEventListener("popstate", updatePath);
            document.removeEventListener("astro:after-swap", updatePath);
        };
    });

    function isActive(href: string): boolean {
        if (href === "/dashboard") {
            return currentPath === "/" || currentPath === "/dashboard";
        }
        return currentPath.startsWith(href);
    }

    function handleClick(item: NavItem, event: MouseEvent) {
        if ("vibrate" in navigator) {
            navigator.vibrate(item.center ? 20 : 10);
        }

        if (!isLoggedIn && item.requiresAuth) {
            event.preventDefault();
            window.location.href = "/auth/login";
        }
    }
</script>

<nav class="mobile-nav" aria-label="Mobile navigation">
    <div class="nav-container">
        {#each items as item}
            {@const active = isActive(item.href)}
            <a
                href={item.href}
                class="nav-item"
                class:center={item.center}
                class:active
                on:click={(e) => handleClick(item, e)}
                aria-current={active ? "page" : undefined}
            >
                {#if item.center}
                    <div class="center-button">
                        <Icon icon={item.icon} width={28} height={28} />
                    </div>
                {:else}
                    <div class="icon-wrapper" class:has-badge={item.badge && item.badge > 0}>
                        <Icon icon={item.icon} width={22} height={22} />
                        {#if item.badge && item.badge > 0}
                            <span class="badge">{item.badge > 99 ? "99+" : item.badge}</span>
                        {/if}
                    </div>
                    <span class="label">{item.label}</span>
                {/if}
            </a>
        {/each}
    </div>
</nav>

<style lang="scss">
    .mobile-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--card-bg);
        border-top: 1px solid var(--accent-3);
        z-index: 100;
        padding-bottom: env(safe-area-inset-bottom, 0);
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);

        @media (min-width: 769px) {
            display: none;
        }
    }

    .nav-container {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        max-width: 500px;
        margin: 0 auto;
        padding: 0.25rem 0.25rem 0;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
        padding: 0.3rem 0.5rem 0.25rem;
        text-decoration: none;
        color: var(--text-muted);
        border-radius: 12px;
        transition: all 0.2s ease;
        min-width: 56px;
        position: relative;

        &:active {
            transform: scale(0.95);
        }

        &:hover {
            color: var(--accent-1);
        }

        &.active {
            color: var(--accent-1);

            .icon-wrapper {
                background: rgba(44, 116, 196, 0.15);
            }

            .label {
                font-weight: 600;
            }
        }

        // Elevated center button
        &.center {
            .center-button {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: var(--accent-1);
                color: white;
                transform: translateY(-6px);
                box-shadow: 0 2px 8px rgba(44, 116, 196, 0.35);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            &:hover .center-button {
                box-shadow: 0 4px 12px rgba(44, 116, 196, 0.45);
            }

            &:active .center-button {
                transform: translateY(-4px) scale(0.95);
            }

            &.active .center-button {
                background: var(--accent-2);
            }
        }
    }

    .icon-wrapper {
        position: relative;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s ease;

        &.has-badge::after {
            content: "";
            position: absolute;
            top: -2px;
            right: -2px;
            width: 8px;
            height: 8px;
            background: var(--base-red);
            border-radius: 50%;
            border: 2px solid var(--card-bg);
        }
    }

    .badge {
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        background: var(--base-red);
        color: white;
        font-size: 10px;
        font-weight: 600;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--card-bg);
        line-height: 1;
    }

    .label {
        font-size: 0.6rem;
        font-weight: 500;
        white-space: nowrap;
    }
</style>