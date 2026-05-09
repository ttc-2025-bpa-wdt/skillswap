<script lang="ts">
    import { onMount } from "svelte";
    import Icon from '@lib/Icon.svelte';
    import { apiFetch } from "@lib/api";

    export let notificationCount: number = 0;
    export let isOpen: boolean = false;

    let notifications: any[] = [];
    let loading: boolean = false;

    $: hasUnread = notificationCount > 0;

    function toggleDropdown() {
        isOpen = !isOpen;
        if (isOpen) {
            fetchNotifications();
        }
    }

    function closeDropdown() {
        isOpen = false;
    }

    async function fetchNotifications() {
        loading = true;
        try {
            const response = await apiFetch("/api/v1/notifications?limit=10");
            const data = await response.json();
            if (data.success) {
                notifications = data.notifications;
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
        loading = false;
    }

    async function markAsRead(notificationId: string) {
        try {
            await apiFetch(`/api/v1/notifications/${notificationId}`, {
                method: "PATCH",
            });
            notifications = notifications.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n
            );
            notificationCount = Math.max(0, notificationCount - 1);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    }

    async function markAllAsRead() {
        try {
            await apiFetch("/api/v1/notifications/read-all", {
                method: "PATCH",
            });
            notifications = notifications.map((n) => ({ ...n, read: true }));
            notificationCount = 0;
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    }

    function getNotificationIcon(type: string): string {
        switch (type) {
            case "MESSAGE":
                return "mdi:message";
            case "SESSION_JOIN":
                return "mdi:account-plus";
            case "SESSION_REMINDER":
                return "mdi:clock";
            case "SESSION_CANCEL":
                return "mdi:calendar-remove";
            case "NEW_REVIEW":
                return "mdi:star";
            case "ACHIEVEMENT_UNLOCKED":
                return "mdi:trophy";
            case "FOLLOW":
                return "mdi:account-follow";
            default:
                return "mdi:bell";
        }
    }

    function formatTimeAgo(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest(".notification-bell")) {
            closeDropdown();
        }
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    });
</script>

<div class="notification-bell" aria-label="Notifications">
    <button
        class="bell-button"
        on:click|stopPropagation={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
    >
        <Icon icon="mdi:bell" width={24} height={24} />
        {#if hasUnread}
            <span class="badge">{notificationCount > 99 ? "99+" : notificationCount}</span>
        {/if}
    </button>

    {#if isOpen}
        <div class="dropdown" role="menu" on:click|stopPropagation>
            <div class="dropdown-header">
                <h3>Notifications</h3>
                {#if notificationCount > 0}
                    <button class="mark-all-read" on:click={markAllAsRead}>
                        Mark all as read
                    </button>
                {/if}
            </div>

            <div class="dropdown-content">
                {#if loading}
                    <div class="loading">Loading...</div>
                {:else if notifications.length === 0}
                    <div class="empty">No notifications</div>
                {:else}
                    {#each notifications as notification}
                        <div
                            class="notification-item"
                            class:unread={!notification.read}
                            role="menuitem"
                            on:click={() => markAsRead(notification.id)}
                        >
                            <div class="notification-icon">
                                <Icon
                                    icon={getNotificationIcon(notification.type)}
                                    width={20}
                                    height={20}
                                />
                            </div>
                            <div class="notification-content">
                                <strong>{notification.title}</strong>
                                <p>{notification.body}</p>
                                <span class="time">{formatTimeAgo(notification.createdAt)}</span>
                            </div>
                            {#if !notification.read}
                                <div class="unread-dot"></div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="dropdown-footer">
                <a href="/notifications">View all notifications</a>
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
    .notification-bell {
        position: relative;
    }

    .bell-button {
        position: relative;
        background: none;
        border: none;
        padding: 0.5rem;
        cursor: pointer;
        color: var(--foreground);
        border-radius: 50%;
        transition: background 0.2s ease;

        &:hover {
            background: rgba(0, 0, 0, 0.05);
        }

        &:active {
            background: rgba(0, 0, 0, 0.1);
        }
    }

    .badge {
        position: absolute;
        top: 0;
        right: 0;
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
    }

    .dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        width: 360px;
        max-height: 480px;
        background: var(--card-bg);
        border: 1px solid var(--accent-3);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 200;
        overflow: hidden;

        @media (max-width: 480px) {
            position: fixed;
            top: 60px;
            left: 10px;
            right: 10px;
            width: auto;
        }
    }

    .dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--accent-3);

        h3 {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
        }

        .mark-all-read {
            background: none;
            border: none;
            color: var(--accent-1);
            font-size: 0.85rem;
            cursor: pointer;

            &:hover {
                text-decoration: underline;
            }
        }
    }

    .dropdown-content {
        max-height: 320px;
        overflow-y: auto;
    }

    .loading,
    .empty {
        padding: 2rem;
        text-align: center;
        color: var(--text-muted);
    }

    .notification-item {
        display: flex;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: background 0.2s ease;

        &:hover {
            background: rgba(0, 0, 0, 0.03);
        }

        &.unread {
            background: rgba(44, 116, 196, 0.05);
        }
    }

    .notification-icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--accent-3);
        border-radius: 50%;
        flex-shrink: 0;
    }

    .notification-content {
        flex: 1;
        min-width: 0;

        strong {
            display: block;
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
        }

        p {
            margin: 0;
            font-size: 0.85rem;
            color: var(--text-muted);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .time {
            font-size: 0.75rem;
            color: var(--text-muted);
        }
    }

    .unread-dot {
        width: 8px;
        height: 8px;
        background: var(--accent-1);
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 6px;
    }

    .dropdown-footer {
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--accent-3);
        text-align: center;

        a {
            color: var(--accent-1);
            text-decoration: none;
            font-size: 0.85rem;

            &:hover {
                text-decoration: underline;
            }
        }
    }
</style>