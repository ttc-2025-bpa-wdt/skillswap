<script lang="ts">
    import Button from "../base/Button.svelte";
    import SearchBar from "../base/SearchBar.svelte";
    import { type IUser, UserRole } from "shared/schema";

    export let user: IUser | null = null;
    export let isAdmin: boolean = false;
    $: isLoggedIn = user !== null;

    let flyoutActive = false;

    function toggle(value?: boolean) {
        flyoutActive = value ?? !flyoutActive;
    }
</script>

<div class="topbar">
    <div class="logo">
        <a href="/">
            <img src="/images/logos/logo-lg-transparent.png" alt="SkillSwap" aria-label="SkillSwap Logo" />
        </a>
    </div>

    <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/#features">Features</a>
        <a href="/about#contact">Contact</a>

        <SearchBar class="search" placeholder="Find skills, mentors, or groups..." />

        <div class="auth-buttons">
            {#if isAdmin}
                <Button href="/admin" variant="secondary" size="sm">Admin</Button>
            {/if}
            {#if isLoggedIn}
                <Button href="/settings" variant="secondary" size="sm">Settings</Button>
                <Button href="/profile" variant="primary" size="sm">Profile</Button>
            {:else}
                <Button href="/auth/login" variant="secondary" size="sm">Login</Button>
                <Button href="/auth/register" variant="primary" size="sm">Register</Button>
            {/if}
        </div>
    </nav>

    <button type="button" data-hamburger on:click={() => toggle()} aria-label="Toggle menu">&#9776;</button>
</div>

<!-- Flyout Menu -->
<div class="flyout" class:active={flyoutActive}>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/#features">Features</a>
    {#if isAdmin}
        <a href="/admin">Admin</a>
    {/if}
    <a href="/about#contact">Contact</a>
    {#if isLoggedIn}
        <a href="/settings">Settings</a>
        <a href="/profile">Profile</a>
    {:else}
        <a href="/auth/login">Login</a>
        <a href="/auth/register">Register</a>
    {/if}
</div>

<!-- Overlay -->
{#if flyoutActive}
    <div class="overlay active" on:click={() => toggle(false)} role="presentation" aria-hidden="true"></div>
{/if}

<style lang="scss">
    // @use "@styles/mixins.scss"; // Svelte scss support might need configuration for aliases

    .topbar {
        display: flex;
        align-items: center;
        gap: 3rem;
        height: 4rem;
        padding: 0 2rem;
        box-sizing: border-box;
        border-bottom: 1px solid var(--accent-3);
        position: relative;
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
            }

            .auth-buttons {
                display: flex;
                gap: 1rem;
                margin-left: auto;
            }

            @media (max-width: 900px) {
                display: none;
            }
        }

        [data-hamburger] {
            display: none;
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--foreground);
            cursor: pointer;
            margin-left: auto;

            @media (max-width: 900px) {
                display: block;
            }
        }
    }

    .flyout {
        position: fixed;
        top: 4rem; // below topbar
        right: 0;
        bottom: 0;
        width: 250px;
        background: var(--card-bg);
        border-left: 1px solid var(--accent-3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 100;
        display: flex;
        flex-direction: column;
        padding: 2rem;
        gap: 1.5rem;
        box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);

        &.active {
            transform: translateX(0);
        }

        a {
            text-decoration: none;
            color: var(--foreground);
            font-size: 1.1rem;
            font-weight: 500;

            &:hover {
                color: var(--accent-1);
            }
        }
    }

    .overlay {
        position: fixed;
        top: 4rem;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 90;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;

        &.active {
            opacity: 1;
            pointer-events: auto;
        }
    }
</style>
