/**
 * Generic LRU Cache with TTL Support
 * Implements Least Recently Used (LRU) eviction policy with time-to-live (TTL)
 * 
 * Features:
 * - Max size limit with LRU eviction
 * - TTL support for automatic expiration
 * - Periodic cleanup of expired entries
 * - Cache hit/miss metrics
 * - Memory-efficient implementation
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
  lastAccessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  expiredRemovals: number;
  size: number;
  maxSize: number;
  hitRate: string;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;
  private evictions: number = 0;
  private expiredRemovals: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number;

  /**
   * Create a new LRU cache
   * @param maxSize - Maximum number of entries (default: 1000)
   * @param defaultTTL - Default TTL in milliseconds (default: 1 hour)
   * @param cleanupIntervalMs - Cleanup interval in milliseconds (default: 5 minutes)
   */
  constructor(
    maxSize: number = 1000,
    defaultTTL: number = 60 * 60 * 1000, // 1 hour
    cleanupIntervalMs: number = 5 * 60 * 1000 // 5 minutes
  ) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cleanupIntervalMs = cleanupIntervalMs;
    
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Get value from cache
   * Updates access time for LRU tracking
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (entry.expiry < now) {
      this.cache.delete(key);
      this.misses++;
      this.expiredRemovals++;
      return null;
    }
    
    // Update last accessed time (for LRU)
    entry.lastAccessed = now;
    // Move to end of Map (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * Evicts least recently used entry if at max size
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiry = now + (ttl || this.defaultTTL);
    
    // If key already exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.expiry = expiry;
      entry.lastAccessed = now;
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return;
    }
    
    // If at max size, evict least recently used
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    // Add new entry
    this.cache.set(key, {
      value,
      expiry,
      lastAccessed: now
    });
  }

  /**
   * Evict least recently used entry
   * The first entry in the Map is the least recently used
   */
  private evictLRU(): void {
    if (this.cache.size === 0) return;
    
    // Get first (oldest) entry
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.evictions++;
    }
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      this.expiredRemovals++;
      return false;
    }
    
    // Update access time
    entry.lastAccessed = Date.now();
    this.cache.delete(key);
    this.cache.set(key, entry);
    return true;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expiredRemovals = 0;
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get max cache size
   */
  get maxSizeLimit(): number {
    return this.maxSize;
  }

  /**
   * Set max cache size
   * Evicts entries if new size is smaller
   */
  setMaxSize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // Evict entries if over new limit
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }
  }

  /**
   * Remove expired entries
   * Returns number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Convert to array for compatibility with lower TypeScript targets
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.expiry < now) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.expiredRemovals++;
    });
    
    return keysToDelete.length;
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      const removed = this.cleanup();
      if (removed > 0) {
        console.log(`[LRUCache] Cleaned up ${removed} expired entries`);
      }
    }, this.cleanupIntervalMs);
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const total = this.hits + this.misses;
    const hitRate = total > 0 
      ? ((this.hits / total) * 100).toFixed(2) + '%'
      : '0%';
    
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      expiredRemovals: this.expiredRemovals,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate
    };
  }

  /**
   * Reset metrics (keeps cache data)
   */
  resetMetrics(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.expiredRemovals = 0;
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache utilization percentage
   */
  getUtilization(): number {
    return this.maxSize > 0 
      ? (this.cache.size / this.maxSize) * 100 
      : 0;
  }
}

/**
 * Cache Manager - Centralized cache management and monitoring
 */
export class CacheManager {
  private static instance: CacheManager;
  private caches: Map<string, LRUCache<any>> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start metrics collection
    this.startMetricsCollection();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Register a cache for monitoring
   */
  registerCache(name: string, cache: LRUCache<any>): void {
    this.caches.set(name, cache);
  }

  /**
   * Get all cache metrics
   */
  getAllMetrics(): Record<string, CacheMetrics> {
    const metrics: Record<string, CacheMetrics> = {};
    
    // Convert to array for compatibility with lower TypeScript targets
    for (const [name, cache] of Array.from(this.caches.entries())) {
      metrics[name] = cache.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Get total memory usage estimate (rough calculation)
   */
  getTotalMemoryEstimate(): {
    totalEntries: number;
    totalMaxSize: number;
    averageUtilization: number;
  } {
    let totalEntries = 0;
    let totalMaxSize = 0;
    let totalUtilization = 0;
    let cacheCount = 0;
    
    // Convert to array for compatibility with lower TypeScript targets
    for (const cache of Array.from(this.caches.values())) {
      totalEntries += cache.size;
      totalMaxSize += cache.maxSizeLimit;
      totalUtilization += cache.getUtilization();
      cacheCount++;
    }
    
    return {
      totalEntries,
      totalMaxSize,
      averageUtilization: cacheCount > 0 ? totalUtilization / cacheCount : 0
    };
  }

  /**
   * Cleanup all caches
   */
  cleanupAll(): number {
    let totalRemoved = 0;
    
    // Convert to array for compatibility with lower TypeScript targets
    for (const cache of Array.from(this.caches.values())) {
      totalRemoved += cache.cleanup();
    }
    
    return totalRemoved;
  }

  /**
   * Start periodic metrics collection and logging
   */
  private startMetricsCollection(): void {
    // Log metrics every 15 minutes
    this.metricsInterval = setInterval(() => {
      const metrics = this.getAllMetrics();
      const memory = this.getTotalMemoryEstimate();
      
      console.log('[CacheManager] Cache Metrics Summary:', {
        timestamp: new Date().toISOString(),
        memory,
        caches: metrics
      });
    }, 15 * 60 * 1000); // 15 minutes
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

