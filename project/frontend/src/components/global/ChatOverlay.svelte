<script lang="ts">
    import { onMount } from "svelte";
    import Icon from '@lib/Icon.svelte';
    import { io, type Socket } from "socket.io-client";
    import { type IUser } from "shared/schema";
    import { apiFetch } from "@lib/api";

    const { user } = $props<{ user: IUser }>();

    let isOpen = $state(false);
    let activeView = $state<"contacts" | "chat">("contacts");
    let conversations = $state<Array<{
        partner: { id: string; handle: string; displayName: string; avatarUrl: string | null };
        lastMessage: { content: string; createdAt: Date; isSent: boolean; status: string };
    }>>([]);
    let messages = $state<Array<{ id: string; senderId: string; senderHandle: string; content: string; createdAt: string }>>([]);
    let activePartnerId = $state<string | null>(null);
    let activePartnerHandle = $state<string>("");
    let newMessage = $state("");
    let loading = $state(false);
    let socket: Socket | null = null;

    async function loadConversations() {
        try {
            const res = await apiFetch("/api/v1/messages");
            const data = await res.json();
            if (data.success) conversations = data.conversations;
        } catch (e) {
            console.error("Failed to load conversations:", e);
        }
    }

    async function loadConversation(partnerId: string) {
        loading = true;
        try {
            const res = await apiFetch(`/api/v1/messages?user=${partnerId}`);
            const data = await res.json();
            if (data.success) {
                messages = data.messages || [];
                activePartnerId = partnerId;
                activeView = "chat";
            }
        } catch (e) {
            console.error("Failed to load conversation:", e);
        }
        loading = false;
    }

    async function sendMessage() {
        if (!newMessage.trim() || !activePartnerId) return;

        const content = newMessage.trim();
        newMessage = "";

        // Optimistic add
        messages = [...messages, {
            id: `temp-${Date.now()}`,
            senderId: user.id,
            senderHandle: user.handle,
            content,
            createdAt: new Date().toISOString(),
        }];

        // Send via socket if connected, else via REST fallback
        if (socket?.connected) {
            socket.emit("message", { handle: activePartnerHandle, content });
        } else {
            try {
                await apiFetch("/api/v1/contact/host", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ hostId: activePartnerId, message: content }),
                });
            } catch (e) {
                console.error("Failed to send message:", e);
            }
        }
    }

    function goBack() {
        activeView = "contacts";
        activePartnerId = null;
    }

    function toggleChat() {
        isOpen = !isOpen;
        if (isOpen && conversations.length === 0) loadConversations();
    }

    onMount(() => {
        // Connect socket
        socket = io({ path: "/socket.io/", withCredentials: true });

        socket.on("connect", () => {
            console.log("Chat socket connected");
        });

        socket.on("message", (msg: { handle: string; content: string }) => {
            // If we're viewing this conversation, add it
            if (activePartnerHandle === msg.handle || activeView === "contacts") {
                messages = [...messages, {
                    id: `socket-${Date.now()}`,
                    senderId: "",
                    senderHandle: msg.handle,
                    content: msg.content,
                    createdAt: new Date().toISOString(),
                }];
            }
            // Refresh conversation list
            loadConversations();
        });

        socket.on("message_queued", () => {
            // Message was queued for offline delivery
        });

        loadConversations();

        return () => {
            socket?.disconnect();
        };
    });
</script>

<div class="chat-widget">
    <button class="chat-fab" on:click={toggleChat} aria-label={isOpen ? "Close chat" : "Open chat"}>
        <Icon icon={isOpen ? "mdi:close" : "mdi:message-outline"} width={28} height={28} />
    </button>

    {#if isOpen}
        <div class="chat-window">
            <header class="chat-header">
                {#if activeView === "chat"}
                    <button class="icon-btn" on:click={goBack} aria-label="Back">
                        <Icon icon="mdi:chevron-left" width={20} height={20} />
                    </button>
                {/if}
                <div class="header-title">
                    <h3>{activeView === "chat" ? activePartnerHandle : "Messages"}</h3>
                </div>
            </header>

            {#if activeView === "contacts"}
                <div class="contact-list">
                    {#if conversations.length === 0}
                        <p class="empty">No conversations yet</p>
                    {:else}
                        {#each conversations as conv}
                            <button class="contact-item" on:click={() => loadConversation(conv.partner.id)}>
                                <img
                                    src={conv.partner.avatarUrl || "/images/avatar/default.png"}
                                    alt=""
                                    class="avatar"
                                />
                                <div class="contact-info">
                                    <strong>{conv.partner.displayName || conv.partner.handle}</strong>
                                    <span class="handle">@{conv.partner.handle}</span>
                                    <p class="last-msg">{conv.lastMessage.content}</p>
                                </div>
                                <span class="time">
                                    {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                                </span>
                            </button>
                        {/each}
                    {/if}
                </div>
            {:else}
                <div class="message-list">
                    {#if loading}
                        <p class="loading">Loading...</p>
                    {:else if messages.length === 0}
                        <p class="empty">No messages yet. Say hello!</p>
                    {:else}
                        {#each messages as msg}
                            <div class="message-bubble" class:sent={msg.senderId === user.id || msg.senderHandle === user.handle}>
                                {#if msg.senderId !== user.id && msg.senderHandle !== user.handle}
                                    <span class="sender">{msg.senderHandle}</span>
                                {/if}
                                <p>{msg.content}</p>
                            </div>
                        {/each}
                    {/if}
                </div>

                <form class="message-input" on:submit|preventDefault={sendMessage}>
                    <input
                        type="text"
                        bind:value={newMessage}
                        placeholder="Type a message..."
                        maxlength="1000"
                    />
                    <button type="submit" disabled={!newMessage.trim()}>
                        <Icon icon="mdi:send" width={20} height={20} />
                    </button>
                </form>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .chat-widget {
        position: fixed;
        bottom: 4.5rem;
        right: 1.5rem;
        z-index: 1000;

        @media (max-width: 768px) {
            bottom: 4.25rem;
            right: 1rem;
        }
    }

    .chat-fab {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--accent-1);
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;

        &:hover { transform: scale(1.05); }
        &:active { transform: scale(0.95); }
    }

    .chat-window {
        position: absolute;
        bottom: 70px;
        right: 0;
        width: 380px;
        height: 500px;
        background: var(--card-bg);
        border: 1px solid var(--accent-3);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;

        @media (max-width: 480px) {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            border-radius: 0;
        }
    }

    .chat-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--accent-3);
        background: var(--accent-1);
        color: white;

        h3 { margin: 0; font-size: 1rem; }

        .icon-btn {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0.25rem;
            display: flex;
            align-items: center;
        }
    }

    .contact-list, .message-list {
        flex: 1;
        overflow-y: auto;
    }

    .contact-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        border-bottom: 1px solid var(--accent-3);
        cursor: pointer;
        text-align: left;
        width: 100%;
        color: var(--foreground);

        &:hover { background: rgba(0, 0, 0, 0.03); }

        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
        }

        .contact-info {
            flex: 1;
            min-width: 0;

            strong { display: block; font-size: 0.9rem; }
            .handle { font-size: 0.8rem; color: var(--text-muted); }
            .last-msg {
                margin: 0.2rem 0 0;
                font-size: 0.8rem;
                color: var(--text-muted);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
        }

        .time { font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; }
    }

    .message-bubble {
        max-width: 75%;
        margin: 0.5rem 1rem;
        padding: 0.5rem 0.75rem;
        border-radius: 12px;
        background: var(--accent-3);
        font-size: 0.9rem;

        &.sent {
            margin-left: auto;
            background: var(--accent-1);
            color: white;
        }

        .sender {
            display: block;
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-bottom: 0.2rem;
        }

        p { margin: 0; word-wrap: break-word; }
    }

    .empty, .loading {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
    }

    .message-input {
        display: flex;
        gap: 0.5rem;
        padding: 0.75rem;
        border-top: 1px solid var(--accent-3);

        input {
            flex: 1;
            padding: 0.5rem 0.75rem;
            border: 1px solid var(--accent-3);
            border-radius: 8px;
            background: var(--background);
            color: var(--foreground);
            font-size: 0.9rem;

            &:focus { outline: none; border-color: var(--accent-1); }
        }

        button {
            background: var(--accent-1);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;

            &:disabled { opacity: 0.5; cursor: not-allowed; }
        }
    }
</style>