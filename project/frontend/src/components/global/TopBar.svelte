<script lang="ts">
    import Button from "../base/Button.svelte";
    import SearchBar from "../base/SearchBar.svelte";
    import NotificationBell from "../notifications/NotificationBell.svelte";
    import ThemeToggle from "./ThemeToggle.svelte";
    import { type IUser, UserRole } from "shared/schema";
    import Icon from '@lib/Icon.svelte';

    export let user: IUser | null = null;
    export let isAdmin: boolean = false;
    export let isDemo: boolean = false;
    export let notificationCount: number = 0;
    $: isLoggedIn = user !== null;

    let currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    let menuOpen = false;

    const routeMap: Record<string, { title: string; back?: string }> = {
        "/dashboard": { title: "Dashboard" },
        "/settings": { title: "Settings", back: "Back" },
        "/profile": { title: "Profile", back: "Back" },
        "/notifications": { title: "Notifications", back: "Back" },
        "/chat": { title: "Messages", back: "Back" },
        "/session/create": { title: "New Session", back: "Back" },
        "/about": { title: "About" },
        "/": { title: "Home" },
    };

    $: routeInfo = routeMap[currentPath] || { title: "SkillSwap" };
    $: pageTitle = routeInfo.title;
    $: backLabel = routeInfo.back || "";

    function toggleMenu() { menuOpen = !menuOpen; }
    function closeMenu() { menuOpen = false; }
    function goBack() { window.history.back(); }

    import { onMount } from "svelte";
    onMount(() => {
        const update = () => { currentPath = window.location.pathname; };
        window.addEventListener("popstate", update);
        document.addEventListener("astro:after-swap", update);
        return () => {
            window.removeEventListener("popstate", update);
            document.removeEventListener("astro:after-swap", update);
        };
    });
</script>

<div class="topbar" class:compact-mobile={isLoggedIn}>
    <!-- LOGGED OUT MOBILE: hamburger bar -->
    <div class="mobile-bar" class:mobile-hidden={isLoggedIn}>
        <a href="/" class="mobile-logo">
            <img src="/images/logos/logo-lg-transparent.png" alt="SkillSwap" aria-label="SkillSwap Logo" />
        </a>
        <button class="hamburger" on:click={toggleMenu} aria-label="Menu">
            <Icon icon={menuOpen ? "mdi:close" : "mdi:menu"} width={28} height={28} />
        </button>
    </div>

    <!-- LOGGED IN MOBILE: breadcrumb header -->
    <div class="mobile-header" class:mobile-hidden={!isLoggedIn}>
        {#if backLabel}
            <button class="back-btn" on:click={goBack} aria-label="Go back">
                <Icon icon="mdi:chevron-left" width={22} height={22} />
                <span class="back-label">{backLabel}</span>
            </button>
        {:else}
            <div class="back-spacer"></div>
        {/if}
        <span class="page-title">{pageTitle}</span>
        <div class="header-actions">
            <NotificationBell {notificationCount} />
            <ThemeToggle />
        </div>
    </div>

    <!-- DESKTOP: full nav -->
    <nav>
        <div class="logo">
            <a href={isLoggedIn ? "/dashboard" : "/"}>
                <img src="/images/logos/logo-lg-transparent.png" alt="SkillSwap" aria-label="SkillSwap Logo" />
            </a>
        </div>

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
</div>

<!-- Hamburger dropdown overlay (logged out, mobile only) -->
{#if menuOpen && !isLoggedIn}
    <div class="dropdown-backdrop" on:click={closeMenu} on:keydown={(e) => e.key === "Escape" && closeMenu()}></div>
    <div class="mobile-dropdown">
        <a href="/" on:click={closeMenu}>Home</a>
        <a href="/about" on:click={closeMenu}>About</a>
        <a href="/#features" on:click={closeMenu}>Features</a>
        <a href="/about#contact" on:click={closeMenu}>Contact</a>
        <SearchBar placeholder="Find skills, mentors..." />
        <div class="dropdown-divider"></div>
        <div class="dropdown-auth">
            <Button href="/auth/login" variant="secondary" size="sm" block>Log In</Button>
            <Button href="/auth/register" variant="primary" size="sm" block>Sign Up</Button>
        </div>
        <div class="dropdown-theme">
            <ThemeToggle />
        </div>
    </div>
{/if}

{#if isDemo}
    <div class="demo-banner">
        <Icon icon="mdi:information-outline" width={16} height={16} />
        Demo mode — you can browse, but can't make changes.
    </div>
{/if}

<style lang="scss">
    .topbar {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        height: 4rem;
        padding: 0 2rem;
        box-sizing: border-box;
        border-bottom: 1px solid var(--accent-3);
        position: sticky;
        top: 0;
        z-index: 50;
        background: var(--background);

        .logo {
            display: flex;
            align-items: center;
            flex-shrink: 0;

            img {
                height: 36px;
                width: auto;
            }
        }

        nav {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            flex: 1;
            min-width: 0;

            a {
                text-decoration: none;
                color: var(--foreground);
                font-weight: 500;
                font-size: 0.95rem;
                white-space: nowrap;

                &:hover { color: var(--accent-1); }
                &.active { color: var(--accent-1); }
            }

            :global(.search) {
                flex: 1;
                min-width: 120px;
                max-width: 300px;
                margin: auto 0;
            }

            .auth-buttons {
                display: flex;
                gap: 0.5rem;
                margin-left: auto;
                flex-shrink: 0;
            }
        }

        // Hide desktop nav on mobile
        nav {
            @media (max-width: 768px) {
                display: none;
            }
        }

        // Hide logo on mobile (mobile-bar/mobile-header handle it)
        .logo {
            @media (max-width: 768px) {
                display: none;
            }
        }

        @media (max-width: 768px) {
            height: auto;
            padding: 0;
            gap: 0;
        }
    }

    // === MOBILE BAR (logged out) ===
    .mobile-bar {
        display: none;

        @media (max-width: 768px) {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1rem;
            height: 48px;
            width: 100%;
            border-bottom: 1px solid var(--accent-3);
            background: var(--background);
        }

        .mobile-logo {
            display: flex;
            align-items: center;

            img {
                height: 28px;
                width: auto;
            }
        }

        .hamburger {
            background: none;
            border: none;
            color: var(--foreground);
            cursor: pointer;
            padding: 0.25rem;
            border-radius: 8px;
            transition: background 0.2s;

            &:hover { background: rgba(0, 0, 0, 0.05); }
        }
    }

    // === COMPACT HEADER (logged in) ===
    .mobile-header {
        display: none;

        @media (max-width: 768px) {
            display: flex;
            align-items: center;
            padding: 0 1rem;
            height: 48px;
            gap: 0.5rem;
            width: 100%;
            border-bottom: 1px solid var(--accent-3);
            background: var(--background);
        }

        .back-btn {
            display: flex;
            align-items: center;
            gap: 2px;
            background: none;
            border: none;
            color: var(--accent-1);
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            padding: 0.25rem 0;
            flex-shrink: 0;
            font-family: inherit;
        }

        .back-spacer {
            width: 60px;
            flex-shrink: 0;
        }

        .page-title {
            flex: 1;
            text-align: center;
            font-family: "Montserrat", sans-serif;
            font-weight: 600;
            font-size: 1rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--foreground);
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 0;
            flex-shrink: 0;

            :global(.theme-toggle) {
                padding: 0.35rem;
            }

            :global(.bell-button) {
                padding: 0.35rem;
            }
        }
    }

    // === HAMBURGER DROPDOWN ===
    .dropdown-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 40;

        @media (min-width: 769px) { display: none; }
    }

    .mobile-dropdown {
        display: flex;
        flex-direction: column;
        padding: 1rem;
        background: var(--card-bg);
        border-bottom: 1px solid var(--accent-3);
        gap: 0.5rem;
        animation: slideDown 0.2s ease-out;
        position: relative;
        z-index: 50;

        @media (min-width: 769px) { display: none; }

        a {
            text-decoration: none;
            color: var(--foreground);
            font-weight: 500;
            font-size: 0.95rem;
            padding: 0.6rem 0.5rem;
            border-radius: 8px;
            transition: background 0.15s;

            &:hover { background: rgba(0, 0, 0, 0.05); }
        }

        .dropdown-divider {
            height: 1px;
            background: var(--accent-3);
            margin: 0.25rem 0;
        }

        .dropdown-auth {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.25rem;
        }

        .dropdown-theme {
            display: flex;
            justify-content: center;
            margin-top: 0.5rem;
        }
    }

    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
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

    .mobile-hidden {
        @media (max-width: 768px) {
            display: none !important;
        }
    }
</style>