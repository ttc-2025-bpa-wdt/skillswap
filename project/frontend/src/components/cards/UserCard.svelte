<script lang="ts">
    import Card from "@components/base/Card.svelte";
    import { User, UserFilter } from "shared/models";
    import { profileTags, type IProfile, type IUser } from "shared/schema";

    export let payload: Partial<IProfile>;
    export let user: IUser | null = null;
    
    const { userId, displayName, avatarUrl, tags, stats, skills } = payload as IProfile;

    export async function load(): Promise<{ user: IUser | null }> {
        const user = await User.read(userId, UserFilter.Id);
        return { user };
    }

    $: handle = user?.handle || "__unk";
</script>

{#if user}
    <Card class="user-card" href={`/profile/${handle}`}>
        <div class="user-pane">
            <img src={avatarUrl} alt={displayName} class="avatar large" />
            <div class="rating">
                {stats.rating.toFixed(1)}
            </div>
        </div>

        <div class="separator"></div>

        <div class="user-content">
            <h3 class="user-name">{displayName}</h3>
            <p class="user-role">{tags.map((tag) => profileTags[tag]?.name).join(", ")}</p>
            <div class="skills-tags">
                {#each skills as skill}
                    <span class="tag">{skill}</span>
                {/each}
            </div>
        </div>
    </Card>
{:else}
    {#await load() then data}
        <svelte:self payload={payload} user={data.user} />
    {:catch}
        <div class="user-card error">
            <p>Error loading user</p>
        </div>
    {/await}
{/if}

<style lang="scss">
    :global(.user-card) {
        display: flex;
        align-items: flex-start;
        flex-direction: row;
        padding: 1rem;
        gap: 1rem;
        cursor: pointer;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 600px) {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;

            .separator {
                display: none;
            }
        }
    }

    .user-pane {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;

        @media (max-width: 600px) {
            width: 100%;
            margin-bottom: 0.5rem;
        }

        .avatar.large {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
            background: linear-gradient(135deg, #e0e0e0, #f5f5f5);
        }

        .rating {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            font-size: 0.85rem;
            font-weight: 600;

            &::before {
                content: "★";
                color: #f1c40f;
                padding-right: 2px;
            }
        }
    }

    .separator {
        width: 1px;
        min-height: 60px;
        align-self: stretch;
        background-color: var(--accent-3);
        opacity: 0.5;
    }

    .user-content {
        flex: 1;

        @media (max-width: 600px) {
            width: 100%;
        }

        .user-name {
            font-family: "Montserrat", sans-serif;
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.1rem;
            color: var(--foreground);
        }

        .user-role {
            font-size: 0.9rem;
            color: var(--foreground);
            opacity: 0.6;
            margin-bottom: 0.75rem;
            margin-top: 0;
        }

        .skills-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;

            .tag {
                background: var(--background);
                border: 1px solid var(--accent-3);
                padding: 0.15rem 0.6rem;
                border-radius: 12px;
                font-size: 0.8rem;
                color: var(--foreground);
            }
        }
    }
</style>
