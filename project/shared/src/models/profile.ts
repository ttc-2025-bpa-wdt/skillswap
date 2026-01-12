import { profiles, users } from "shared/mock";
import { User, UserFilter } from "shared/models";
import { type IProfile } from "shared/schema";

export enum ProfileFilter {
    Id = 0b001,
    DisplayName = 0b010,
    Handle = 0b100,
}

export class Profile {
    static async read(value: string, filter: ProfileFilter): Promise<IProfile | null> {
        for (const profile of Object.values(profiles)) {
            if (filter & ProfileFilter.Id && profile.id === value) return profile;

            if (filter & ProfileFilter.DisplayName && profile.displayName === value) return profile;

            if (filter & ProfileFilter.Handle) {
                const user = await User.read(profile.userId, UserFilter.Id);
                if (user && user.handle === value) return profile;
            }
        }

        return null;
    }

    static async search(query: string): Promise<IProfile[]> {
        const results: IProfile[] = [];
        const lowerQuery = query.toLowerCase();

        for (const profile of Object.values(profiles)) {
            const user = await User.read(profile.userId, UserFilter.Id);
            if (
                profile.displayName.toLowerCase().includes(lowerQuery) ||
                (user && user.handle.toLowerCase().includes(lowerQuery)) ||
                profile.bio.toLowerCase().includes(lowerQuery)
            ) {
                results.push(profile);
            }
        }

        return results;
    }

    static async create(profileData: Omit<IProfile, "id">): Promise<IProfile> {
        const newId = profiles.length.toString();
        const newProfile: IProfile = { id: newId, ...profileData };

        profiles.push(newProfile);
        return newProfile;
    }

    static async update(id: string, profileData: Partial<Omit<IProfile, "id">>): Promise<IProfile | null> {
        const profile = await this.read(id, ProfileFilter.Id);
        if (!profile) return null;

        Object.assign(profile, profileData);
        return profile;
    }

    static async delete(id: string): Promise<boolean> {
        const index = profiles.findIndex((profile) => profile.id === id);
        if (index === -1) return false;

        profiles.splice(index, 1);
        return true;
    }
}

export default Profile;
