import "shared/config"; // load dotenv before creating pool
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "shared/prisma";

export interface DbCacheConfig {
    key: string;
    ttl: number;
}

interface CacheEntry {
    value: any;
    expiresAt: number;
}

export class DataCache {
    private static cache: Record<string, CacheEntry> = {};

    public static async read<T>({ key, ttl }: DbCacheConfig, read: () => Promise<T | null>): Promise<T | null> {
        const now = Date.now();
        const cached = this.cache[key] as CacheEntry | undefined;
        if (cached && cached.expiresAt > now) return cached.value as T;

        const value = await read();
        if (value !== null) this.cache[key] = { value, expiresAt: now + ttl };

        return value;
    }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

export const db = new PrismaClient({
    adapter: new PrismaPg(pool),
});