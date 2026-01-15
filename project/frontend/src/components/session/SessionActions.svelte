<script lang="ts">
    import Button from "@components/base/Button.svelte";

    export let sessionId: string;
    export let isRegistered: boolean = false;
    export let initialRating: number = 0;

    let showContactModal = false;
    let registered = isRegistered;
    let message = "";
    // let rating = 5; // Controlled via star UI now
    let userRating = initialRating;
    let loading = false;
    let error = "";
    let success = "";

    async function register() {
        loading = true;
        error = "";
        try {
            const res = await fetch("/api/v1/session/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });
            const data = await res.json();
            if (data.success) {
                registered = true;
                success = "Successfully registered!";
            } else {
                if (data.error === "Already registered") {
                    registered = true;
                    success = "You are already registered.";
                } else {
                    error = data.error || "Failed to register";
                }
            }
        } catch (e) {
            error = "An error occurred";
        }
        loading = false;
    }

    async function contactHost() {
        loading = true;
        error = "";
        try {
            const res = await fetch("/api/v1/contact/host", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, message }),
            });
            const data = await res.json();
            if (data.success) {
                showContactModal = false;
                success = "Message sent!";
                message = "";
            } else {
                error = data.error || "Failed to send message";
            }
        } catch (e) {
            error = "An error occurred";
        }
        loading = false;
    }

    async function rateSession(rating: number) {
        userRating = rating;
        try {
            const res = await fetch("/api/v1/session/rate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, rating }),
            });

            const text = await res.text();
            try {
                const data = JSON.parse(text);
                if (!data.success) {
                    error = data.error || "Failed to rate";
                } else {
                    success = "Rating updated!";
                }
            } catch (jsonError) {
                console.error("Failed to parse JSON response:", text);
                error = `Server error: ${res.status} ${res.statusText}`;
            }
        } catch (e) {
            console.error("Fetch error:", e);
            error = "Network error: Failed to submit rating";
        }
    }
</script>

<div class="actions-container">
    <div class="actions">
        {#if registered}
            <Button variant="outline" size="lg" disabled>Registered</Button>
        {:else}
            <Button variant="primary" size="lg" onclick={register} disabled={loading}>
                {loading ? "Registering..." : "Register for Session"}
            </Button>
        {/if}

        <Button variant="outline" size="lg" onclick={() => (showContactModal = true)}>Contact Host</Button>
    </div>

    {#if registered}
        <div class="rating-box">
            <span>Rate this session:</span>
            <div class="stars">
                {#each [1, 2, 3, 4, 5] as star}
                    <button class="star-btn" onclick={() => rateSession(star)}>
                        <iconify-icon
                            icon={userRating >= star ? "material-symbols:star" : "material-symbols:star-outline"}
                            width="24"
                            height="24"
                            aria-label="Star"
                        ></iconify-icon>
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>

{#if error}
    <p class="error">{error}</p>
{/if}

{#if success}
    <p class="success">{success}</p>
{/if}

{#if showContactModal}
    <div
        class="modal-backdrop"
        onclick={() => (showContactModal = false)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === "Escape" && (showContactModal = false)}
    >
        <div
            class="modal-content"
            onclick={(e) => e.stopPropagation()}
            role="document"
            tabindex="0"
            onkeydown={(e) => e.key === "Escape" && (showContactModal = false)}
        >
            <h3>Contact Host</h3>

            <div class="form-group">
                <label>Message</label>
                <textarea bind:value={message} rows="4"></textarea>
            </div>

            <div class="modal-actions">
                <Button variant="secondary" size="md" onclick={() => (showContactModal = false)}>Cancel</Button>
                <Button variant="primary" size="md" onclick={contactHost} disabled={loading}>Send</Button>
            </div>
        </div>
    </div>
{/if}

<style>
    .actions-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .actions {
        display: flex;
        gap: 1rem;

        @media (max-width: 600px) {
            flex-direction: column;
        }
    }

    .rating-box {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 0.5rem;
    }

    .stars {
        display: flex;
        gap: 0.25rem;
    }

    .star-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        color: var(--base-yellow, gold); /* Use base yellow */
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .star-btn:hover {
        opacity: 0.8;
    }

    .error {
        color: #bc2035;
        margin-top: 0.5rem;
        font-weight: bold;
    }
    .success {
        color: var(--accent-2, green);
        margin-top: 0.5rem;
        font-weight: bold;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(2px);
    }

    .modal-content {
        background: var(--card-bg, white);
        padding: 2rem;
        border-radius: 8px;
        width: 100%;
        max-width: 500px;
        box-shadow: var(--shadow-md, 0 4px 20px rgba(0, 0, 0, 0.1));
        color: var(--foreground, #333);
    }

    h3 {
        margin-top: 0;
        color: var(--accent-1, #333);
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }

    .form-group textarea,
    .form-group input {
        width: 100%;
        padding: 0.8rem;
        border: 1px solid var(--accent-3, #ddd);
        border-radius: 4px;
        font-family: inherit;
        background: var(--background, #f9f9f9);
        color: inherit;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1.5rem;
    }
</style>
