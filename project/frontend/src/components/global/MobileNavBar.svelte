<script lang="ts">
    import { type IUser } from "shared/schema";

    export let user: IUser | null = null;
    export let notificationCount: number = 0;
    export let chatCount: number = 0;

    $: isLoggedIn = user !== null;

    interface NavItem {
        href: string;
        icon: string;
        label: string;
        requiresAuth?: boolean;
        badge?: number;
    }

    const navItems: NavItem[] = [
        { href: "/dashboard", icon: "mdi:home", label: "Home", requiresAuth: true },
        { href: "/search", icon: "mdi:magnify", label: "Search" },
        { href: "/session/create", icon: "mdi:plus-circle", label: "Create", requiresAuth: true },
        { href: "/chat", icon: "mdi:chat", label: "Chat", requiresAuth: true, badge: chatCount },
        { href: "/profile", icon: "mdi:account", label: "Profile", requiresAuth: true },
    ];

    $: filteredItems = navItems.filter(item => !item.requiresAuth || isLoggedIn);

    // Active state tracking
    let currentPath = "";
    if (typeof window !== "undefined") {
        currentPath = window.location.pathname;
    }

    function isActive(href: string): boolean {
        if (href === "/dashboard") {
            return currentPath === "/" || currentPath === "/dashboard";
        }
        return currentPath.startsWith(href);
    }

    // Handle navigation with haptic feedback
    function handleNavClick(item: NavItem, event: MouseEvent) {
        // Provide haptic feedback on supported devices
        if ("vibrate" in navigator) {
            navigator.vibrate(10);
        }
        
        // Close any open menus/modals
        // Navigation will happen naturally via href
    }

    // Handle create button with special action
    function handleCreate(event: MouseEvent) {
        if (!isLoggedIn) {
            event.preventDefault();
            window.location.href = "/auth/login";
            return;
        }
        // Haptic feedback
        if ("vibrate" in navigator) {
            navigator.vibrate(20);
        }
    }
</script>

<nav class="mobile-nav" aria-label="Mobile navigation">
    <div class="nav-container">
        {#each filteredItems as item}
            {@const active = isActive(item.href)}
            <a 
                href={item.href} 
                class="nav-item" 
                class:active
                on:click={(e) => item.label === "Create" ? handleCreate(e) : handleNavClick(item, e)}
                aria-current={active ? "page" : undefined}
            >
                <div class="icon-wrapper" class:has-badge={item.badge && item.badge > 0}>
                    <iconify-icon icon={item.icon} width="24" height="24"></iconify-icon>
                    {#if item.badge && item.badge > 0}
                        <span class="badge">{item.badge > 99 ? "99+" : item.badge}</span>
                    {/if}
                </div>
                <span class="label">{item.label}</span>
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
        
        // Hidden on larger screens
        @media (min-width: 769px) {
            display: none;
        }
    }

    .nav-container {
        display: flex;
        justify-content: space-around;
        align-items: center;
        max-width: 500px;
        margin: 0 auto;
        padding: 0.5rem 0.25rem;
    }

    .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 0.5rem 0.75rem;
        text-decoration: none;
        color: var(--text-muted);
        border-radius: 12px;
        transition: all 0.2s ease;
        min-width: 60px;
        min-height: 44px; // Touch target size
        position: relative;

        &:hover {
            color: var(--accent-1);
            background: rgba(44, 116, 196, 0.1);
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

        &:active {
            transform: scale(0.95);
        }
    }

    .icon-wrapper {
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: background 0.2s ease;

        &.has-badge {
            &::after {
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
    }

    .badge {
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        background: var(--base-red);
        color: white;
        font-size: 11px;
        font-weight: 600;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--card-bg);
    }

    .label {
        font-size: 0.7rem;
        font-weight: 500;
        white-space: nowrap;
    }

    // Ripple effect animation
    @keyframes ripple {
        0% {
            transform: scale(0);
            opacity: 0.5;
        }
        100% {
            transform: scale(4);
            opacity: 0;
        }
    }
</style>