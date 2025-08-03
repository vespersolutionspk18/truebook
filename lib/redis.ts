// Mock Redis client - no actual Redis needed
export const redis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  keys: async () => [],
};

// Mock rate limiters 
export const rateLimiters = {
  api: {
    limit: async () => ({ success: true, limit: 100, remaining: 99, reset: new Date() })
  },
  vehicleLookup: {
    limit: async () => ({ success: true, limit: 20, remaining: 19, reset: new Date() })
  },
  auth: {
    limit: async () => ({ success: true, limit: 5, remaining: 4, reset: new Date() })
  },
};

// Mock cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    return null;
  },

  async set(key: string, value: any, expirationInSeconds?: number): Promise<void> {
    // No-op
  },

  async del(key: string): Promise<void> {
    // No-op
  },

  async invalidatePattern(pattern: string): Promise<void> {
    // No-op
  },
};

// Mock session storage helpers
export const sessionStore = {
  async get(sessionId: string): Promise<any> {
    return null;
  },

  async set(sessionId: string, data: any, ttlInSeconds: number = 86400): Promise<void> {
    // No-op
  },

  async destroy(sessionId: string): Promise<void> {
    // No-op
  },

  async touch(sessionId: string, ttlInSeconds: number = 86400): Promise<void> {
    // No-op
  },
};

// Mock organization cache helpers
export const orgCache = {
  async get(orgId: string): Promise<any> {
    return null;
  },

  async set(orgId: string, data: any): Promise<void> {
    // No-op
  },

  async invalidate(orgId: string): Promise<void> {
    // No-op
  },

  async getVehicles(orgId: string, page: number = 1): Promise<any> {
    return null;
  },

  async setVehicles(orgId: string, page: number, data: any): Promise<void> {
    // No-op
  },
};