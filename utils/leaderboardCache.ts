/**
 * Leaderboard Cache Utility
 * Provides in-memory caching for leaderboard queries with TTL support
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class LeaderboardCache {
  private cacheData: Map<string, CacheEntry<any>> = new Map();
  private static instance: LeaderboardCache;
  private hits: number = 0;
  private misses: number = 0;

  private constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  public static getInstance(): LeaderboardCache {
    if (!LeaderboardCache.instance) {
      LeaderboardCache.instance = new LeaderboardCache();
    }
    return LeaderboardCache.instance;
  }

  /**
   * Generate cache key from leaderboard parameters
   */
  private generateKey(
    type: string,
    timeframe: string,
    genre?: string,
    limit?: number
  ): string {
    const parts = [type, timeframe];
    if (genre) parts.push(`genre:${genre}`);
    if (limit) parts.push(`limit:${limit}`);
    return `leaderboard:${parts.join(':')}`;
  }

  /**
   * Get cached leaderboard data
   */
  get<T>(
    type: string,
    timeframe: string,
    genre?: string,
    limit?: number
  ): T | null {
    const key = this.generateKey(type, timeframe, genre, limit);
    const entry = this.cacheData.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiry < Date.now()) {
      this.cacheData.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Set leaderboard data in cache
   */
  set<T>(
    type: string,
    timeframe: string,
    value: T,
    ttlSeconds: number = 300, // Default 5 minutes
    genre?: string,
    limit?: number
  ): void {
    const key = this.generateKey(type, timeframe, genre, limit);
    this.cacheData.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Clear cache for specific leaderboard type or all cache
   */
  clear(type?: string, timeframe?: string, genre?: string): void {
    if (!type) {
      // Clear all cache
      this.cacheData.clear();
      return;
    }

    // Clear specific entries
    const keysToDelete: string[] = [];
    const prefix = this.generateKey(type, timeframe || '', genre);

    const keys = Array.from(this.cacheData.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cacheData.delete(key));
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    const entries = Array.from(this.cacheData.entries());
    for (const [key, entry] of entries) {
      if (entry.expiry < now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cacheData.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[LeaderboardCache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(2) + '%'
        : '0%',
      cacheSize: this.cacheData.size,
    };
  }
}

// Export singleton instance
export const leaderboardCache = LeaderboardCache.getInstance();
