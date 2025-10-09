interface RateLimitEntry {
  count: number;
  firstRequestTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  constructor(
    private windowSeconds: number = 60,
    private maxRequests: number = 100
  ) {}

  /**
   * Check if a key has exceeded its rate limit
   * @param key Unique identifier for the rate limit (e.g. IP, API key)
   * @returns true if allowed, false if limit exceeded
   */
  checkLimit(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    // No existing entry - create new
    if (!entry) {
      this.limits.set(key, {
        count: 1,
        firstRequestTime: now
      });
      return true;
    }

    // Check if window has expired
    const windowExpired = (now - entry.firstRequestTime) > this.windowSeconds * 1000;
    if (windowExpired) {
      this.limits.set(key, {
        count: 1,
        firstRequestTime: now
      });
      return true;
    }

    // Increment counter
    entry.count++;

    // Check if over limit
    return entry.count <= this.maxRequests;
  }

  /**
   * Get number of requests remaining for a key
   */
  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) {
      return this.maxRequests;
    }

    const now = Date.now();
    const windowExpired = (now - entry.firstRequestTime) > this.windowSeconds * 1000;
    if (windowExpired) {
      return this.maxRequests;
    }

    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get seconds remaining in current window
   */
  getWindowSecondsRemaining(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) {
      return this.windowSeconds;
    }

    const now = Date.now();
    const elapsed = (now - entry.firstRequestTime) / 1000;
    return Math.max(0, this.windowSeconds - elapsed);
  }

  /**
   * Clear rate limit data for a key
   */
  clearLimit(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Get current request count for a key
   */
  getCurrentCount(key: string): number {
    return this.limits.get(key)?.count || 0;
  }
}