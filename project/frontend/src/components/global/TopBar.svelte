<script lang="ts">
    import Button from "../base/Button.svelte";
    import SearchBar from "../base/SearchBar.svelte";
    import NotificationBell from "../notifications/NotificationBell.svelte";
    import ThemeToggle from "./ThemeToggle.svelte";
    import { type IUser, UserRole } from "shared/schema";

    export let user: IUser | null = null;
    export let isAdmin: boolean = false;
    export let isDemo: boolean = false;
    export let notificationCount: number = 0;
    $: isLoggedIn = user !== null;

    let menuOpen = false;
    let currentPath = typeof window !== "undefined" ? window.location.pathname : "";

    import { onMount } from "svelte";
    onMount(() => {
        const update = () => { currentPath = window.location.pathname; menuOpen = false; };
        window.addEventListener("popstate", update);
        document.addEventListener("astro:after-swap", update);
        return () => {
            window.removeEventListener("popstate", update);
            document.removeEventListener("astro:after-swap", update);
        };
    });

    function toggleMenu(value?: boolean) {
        menuOpen = value ?? !menuOpen;
    }
</script>

<div class="topbar">
    <div class="logo">
        <a href={isLoggedIn ? "/dashboard" : "/"}>
            <img src="/images/logos/logo-lg-transparent.png" alt="SkillSwap" aria-label="SkillSwap Logo" />
        </a>
    </div>

    <!-- Desktop nav (hidden on mobile) -->
    <nav>
        <a href="/" class:active={currentPath === "/" || currentPath === ""}>Home</a>
        <a href="/about" class:active={currentPath.startsWith("/about")}>About</a>
        <a href="/#features">Features</a>
        <a href="/about#contact">Contact</a>

        <SearchBar class="search" placeholder="Find skills, mentors, or groups..." />

        <div class="auth-buttons">
            {#if isAdmin}
                <Button href="/admin" variant="secondary" size="sm">Admin</Button>
            {/if}
            <ThemeToggle />
            {#if isLoggedIn}
                <NotificationBell {notificationCount} />
                {#if !isDemo}
                    <Button href="/settings" variant="secondary" size="sm">Settings</Button>
                {/if}
                <Button href="/profile" variant="primary" size="sm">Profile</Button>
            {:else}
                <Button href="/auth/login" variant="secondary" size="sm">Login</Button>
                <Button href="/auth/register" variant="primary" size="sm">Register</Button>
            {/if}
        </div>
    </nav>

    <!-- Mobile actions (hidden on desktop) -->
    <div class="mobile-actions">
        {#if isLoggedIn}
            <a href="/notifications" class="mobile-icon-btn" aria-label="Notifications">
                <iconify-icon icon="mdi:bell" width="22" height="22"></iconify-icon>
                {#if notificationCount > 0}
                    <span class="mobile-badge">{notificationCount > 99 ? "99+" : notificationCount}</span>
                {/if}
            </a>
        {/if}
        <button type="button" class="hamburger" class:open={menuOpen} on:click={() => toggleMenu()} aria-label="Toggle menu">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
        </button>
    </div>
</div>

{#if isDemo}
    <div class="demo-banner">
        <iconify-icon icon="mdi:information-outline" width="16" height="16"></iconify-icon>
        Demo mode — you can browse, but can't make changes.
    </div>
{/if}

<!-- Dropdown Menu (mobile) -->
{#if menuOpen}
    <div class="dropdown-menu" class:open={menuOpen}>
        <a href="/" on:click={() => toggleMenu(false)}>
            <iconify-icon icon="mdi:home" width="20" height="20"></iconify-icon>
            Home
        </a>
        <a href="/about" on:click={() => toggleMenu(false)}>
            <iconify-icon icon="mdi:information" width="20" height="20"></iconify-icon>
            About
        </a>
        <a href="/#features" on:click={() => toggleMenu(false)}>
            <iconify-icon icon="mdi:star" width="20" height="20"></iconify-icon>
            Features
        </a>
        <a href="/about#contact" on:click={() => toggleMenu(false)}>
            <iconify-icon icon="mdi:email" width="20" height="20"></iconify-icon>
            Contact
        </a>

        <div class="dropdown-divider"></div>

        {#if isAdmin}
            <a href="/admin" on:click={() => toggleMenu(false)}>
                <iconify-icon icon="mdi:shield" width="20" height="20"></iconify-icon>
                Admin
            </a>
        {/if}

        {#if isLoggedIn}
            {#if !isDemo}
                <a href="/settings" on:click={() => toggleMenu(false)}>
                    <iconify-icon icon="mdi:cog" width="20" height="20"></iconify-icon>
                    Settings
                </a>
            {/if}
            <a href="/profile" on:click={() => toggleMenu(false)}>
                <iconify-icon icon="mdi:account" width="20" height="20"></iconify-icon>
                Profile
            </a>
        {:else}
            <a href="/auth/login" on:click={() => toggleMenu(false)}>
                <iconify-icon icon="mdi:login" width="20" height="20"></iconify-icon>
                Login
            </a>
            <a href="/auth/register" on:click={() => toggleMenu(false)}>
                <iconify-icon icon="mdi:account-plus" width="20" height="20"></iconify-icon>
                Register
            </a>
        {/if}

        <div class="dropdown-divider"></div>

        <div class="dropdown-theme">
            <span>Theme</span>
            <ThemeToggle />
        </div>
    </div>

    <!-- Overlay -->
    <div class="overlay" on:click={() => toggleMenu(false)} role="presentation" aria-hidden="true"></div>
{/if}

<style lang="scss">
    .topbar {
        display: flex;
        align-items: center;
        gap: 3rem;
        height: 4rem;
        padding: 0 2rem;
        box-sizing: border-box;
        border-bottom: 1px solid var(--accent-3);
        position: sticky;
        top: 0;
        z-index: 50;
        background: var(--background);

        .logo {
            img {
                height: 40px;
                width: auto;
            }
        }

        nav {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex: 1;

            a {
                text-decoration: none;
                color: var(--foreground);
                font-weight: 500;
                font-size: 0.95rem;
                &:hover {
                    color: var(--accent-1);
                }
                &.active {
                    color: var(--accent-1);
                }
            }

            .auth-buttons {
                display: flex;
                gap: 1rem;
                margin-left: auto;
            }

            @media (max-width: 768px) {
                display: none;
            }
        }

        .mobile-actions {
            display: none;
            align-items: center;
            gap: 0.25rem;
            margin-left: auto;

            @media (max-width: 768px) {
                display: flex;
            }
        }

        .mobile-icon-btn {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            color: var(--foreground);
            text-decoration: none;
            border-radius: 50%;
            transition: background 0.2s;

            &:hover {
                background: rgba(0, 0, 0, 0.05);
            }
        }

        .mobile-badge {
            position: absolute;
            top: 2px;
            right: 2px;
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
            line-height: 1;
        }

        @media (max-width: 768px) {
            height: 3rem;
            padding: 0 1rem;
            gap: 0;

            .logo img {
                height: 32px;
            }
        }
    }

    // Hamburger button (3-bar animated to X)
    .hamburger {
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 40px;
        height: 40px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        gap: 5px;

        @media (max-width: 768px) {
            display: flex;
        }

        .bar {
            display: block;
            width: 22px;
            height: 2px;
            background: var(--foreground);
            border-radius: 1px;
            transition: transform 0.2s ease, opacity 0.2s ease;
        }

        &.open {
            .bar:nth-child(1) {
                transform: translateY(7px) rotate(45deg);
            }
            .bar:nth-child(2) {
                opacity: 0;
            }
            .bar:nth-child(3) {
                transform: translateY(-7px) rotate(-45deg);
            }
        }
    }

    // Dropdown menu (replaces flyout)
    .dropdown-menu {
        position: fixed;
        top: 3rem;
        left: 0;
        right: 0;
        background: var(--card-bg);
        border-bottom: 1px solid var(--accent-3);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        z-index: 100;
        padding: 0.5rem 0;
        animation: slideDown 0.2s ease;

        @media (min-width: 769px) {
            display: none;
        }

        a {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.875rem 1.25rem;
            border: none;
            background: none;
            color: var(--foreground);
            font-size: 0.95rem;
            font-weight: 500;
            text-decoration: none;
            min-height: 44px;
            box-sizing: border-box;
            transition: background 0.15s;

            &:hover,
            &:active {
                background: rgba(0, 0, 0, 0.04);
                color: var(--accent-1);
            }

            iconify-icon {
                flex-shrink: 0;
            }
        }
    }

    .dropdown-divider {
        height: 1px;
        background: var(--accent-3);
        margin: 0.25rem 1rem;
    }

    .dropdown-theme {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.25rem;
        font-size: 0.95rem;
        color: var(--text-muted);
    }

    .overlay {
        position: fixed;
        top: 3rem;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 90;

        @media (min-width: 769px) {
            display: none;
        }
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .demo-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.4rem 1rem;
        background: rgba(255, 152, 0, 0.12);
        color: #e67e00;
        font-size: 0.85rem;
        font-weight: 500;
        text-align: center;
        border-bottom: 1px solid rgba(255, 152, 0, 0.25);
    }
</style>