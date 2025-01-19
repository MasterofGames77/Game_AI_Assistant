// import NodeCache from 'node-cache';

// interface CacheOptions {
//   ttl?: number;
//   checkPeriod?: number;
// }

// class CacheService {
//   private cache: NodeCache;
  
//   constructor(options: CacheOptions = {}) {
//     this.cache = new NodeCache({
//       stdTTL: options.ttl || 300, // 5 minutes default
//       checkperiod: options.checkPeriod || 60, // Check for expired entries every minute
//     });
//   }

//   async get<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
//     const cached = this.cache.get<T>(key);
//     if (cached !== undefined) {
//       return cached;
//     }

//     try {
//       const fresh = await fetchFn();
//       this.cache.set(key, fresh);
//       return fresh;
//     } catch (error) {
//       console.error(`Cache fetch error for key ${key}:`, error);
//       throw error;
//     }
//   }

//   set(key: string, value: any, ttl?: number): boolean {
//     return this.cache.set(key, value, ttl as number);
//   }

//   invalidate(key: string | string[]): void {
//     if (Array.isArray(key)) {
//       this.cache.del(key);
//     } else {
//       this.cache.del(key);
//     }
//   }

//   flush(): void {
//     this.cache.flushAll();
//   }

//   // Helper method for forum-specific caching
//   async getForumData(forumId: string, fetchFn: () => Promise<any>) {
//     return this.get(`forum:${forumId}`, fetchFn);
//   }

//   invalidateForumCache(forumId: string): void {
//     this.invalidate([
//       `forum:${forumId}`,
//       `forum:${forumId}:topics`,
//       `forum:${forumId}:metadata`
//     ]);
//   }
// }

// // Export a singleton instance
// export const cacheService = new CacheService();

// Usage example:
// const forumData = await cacheService.getForumData('123', () => fetchForumFromDB('123')); 