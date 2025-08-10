// lib/cache.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

class GrokCache {
  constructor() {
    this.memoryCache = new Map();
    this.cacheTimers = new Map();
  }

  // Generate a unique cache key
  getCacheKey(tool, params) {
    const paramString = JSON.stringify(params || {});
    return `${tool}:${paramString}`;
  }

  // Get cache duration based on tool type and user tier
  getCacheDuration(tool, isPremium = false, isEnterprise = false) {
    const durations = {
      // Free tier gets longest cache
      free: {
        trending: 6 * 60 * 60 * 1000,      // 6 hours
        'analyze-token': 24 * 60 * 60 * 1000, // 24 hours
        'contract-meme': 12 * 60 * 60 * 1000, // 12 hours
        translate: 24 * 60 * 60 * 1000,    // 24 hours
        'trend-meme': 3 * 60 * 60 * 1000,  // 3 hours
        default: 6 * 60 * 60 * 1000        // 6 hours
      },
      // Premium gets fresher data
      premium: {
        trending: 1 * 60 * 60 * 1000,      // 1 hour
        'analyze-token': 6 * 60 * 60 * 1000,  // 6 hours
        'contract-meme': 3 * 60 * 60 * 1000,  // 3 hours
        translate: 12 * 60 * 60 * 1000,    // 12 hours
        'trend-meme': 30 * 60 * 1000,      // 30 minutes
        default: 1 * 60 * 60 * 1000        // 1 hour
      },
      // Enterprise gets real-time with minimal cache
      enterprise: {
        trending: 5 * 60 * 1000,           // 5 minutes
        'analyze-token': 15 * 60 * 1000,   // 15 minutes
        'contract-meme': 10 * 60 * 1000,   // 10 minutes
        translate: 1 * 60 * 60 * 1000,     // 1 hour
        'trend-meme': 5 * 60 * 1000,       // 5 minutes
        default: 5 * 60 * 1000             // 5 minutes
      }
    };

    const tier = isEnterprise ? 'enterprise' : (isPremium ? 'premium' : 'free');
    return durations[tier][tool] || durations[tier].default;
  }

  // Check memory cache first (fastest)
  async getFromMemory(key) {
    const cached = this.memoryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[Cache] Memory hit for ${key}`);
      return cached.data;
    }
    return null;
  }

  // Check database cache (persistent)
  async getFromDatabase(key) {
    try {
      const { data, error } = await supabase
        .from('api_cache')
        .select('*')
        .eq('cache_key', key)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (data && !error) {
        console.log(`[Cache] Database hit for ${key}`);
        // Also store in memory for faster access
        this.memoryCache.set(key, {
          data: data.response_data,
          expiresAt: new Date(data.expires_at).getTime()
        });
        return data.response_data;
      }
    } catch (error) {
      console.error('[Cache] Database read error:', error);
    }
    return null;
  }

  // Get from cache (memory -> database -> null)
  async get(tool, params, userTier = 'free') {
    const key = this.getCacheKey(tool, params);
    
    // Try memory first
    let cached = await this.getFromMemory(key);
    if (cached) return cached;

    // Try database
    cached = await this.getFromDatabase(key);
    if (cached) return cached;

    console.log(`[Cache] Miss for ${key}`);
    return null;
  }

  // Store in both memory and database
  async set(tool, params, data, userTier = 'free') {
    const key = this.getCacheKey(tool, params);
    const isPremium = userTier === 'premium' || userTier === 'enterprise';
    const isEnterprise = userTier === 'enterprise';
    const duration = this.getCacheDuration(tool, isPremium, isEnterprise);
    const expiresAt = Date.now() + duration;

    // Store in memory
    this.memoryCache.set(key, {
      data: data,
      expiresAt: expiresAt
    });

    // Clean up old timer if exists
    if (this.cacheTimers.has(key)) {
      clearTimeout(this.cacheTimers.get(key));
    }

    // Set timer to remove from memory when expired
    const timer = setTimeout(() => {
      this.memoryCache.delete(key);
      this.cacheTimers.delete(key);
    }, duration);
    this.cacheTimers.set(key, timer);

    // Store in database for persistence
    try {
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: key,
          tool: tool,
          request_params: params,
          response_data: data,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date().toISOString()
        }, {
          onConflict: 'cache_key'
        });
      
      console.log(`[Cache] Stored ${key} for ${duration/1000/60} minutes`);
    } catch (error) {
      console.error('[Cache] Database write error:', error);
    }

    return data;
  }

  // Clear expired entries from database (run periodically)
  async cleanExpired() {
    try {
      const { error } = await supabase
        .from('api_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (!error) {
        console.log('[Cache] Cleaned expired entries');
      }
    } catch (error) {
      console.error('[Cache] Cleanup error:', error);
    }
  }

  // Force refresh cache for specific tool/params
  async invalidate(tool, params = null) {
    if (params) {
      const key = this.getCacheKey(tool, params);
      this.memoryCache.delete(key);
      
      await supabase
        .from('api_cache')
        .delete()
        .eq('cache_key', key);
      
      console.log(`[Cache] Invalidated ${key}`);
    } else {
      // Invalidate all entries for this tool
      for (const [key] of this.memoryCache) {
        if (key.startsWith(`${tool}:`)) {
          this.memoryCache.delete(key);
        }
      }
      
      await supabase
        .from('api_cache')
        .delete()
        .eq('tool', tool);
      
      console.log(`[Cache] Invalidated all ${tool} entries`);
    }
  }

  // Get cache statistics
  getStats() {
    const stats = {
      memoryEntries: this.memoryCache.size,
      memorySizeEstimate: 0,
      tools: {}
    };

    for (const [key, value] of this.memoryCache) {
      const tool = key.split(':')[0];
      stats.tools[tool] = (stats.tools[tool] || 0) + 1;
      // Rough estimate of memory usage
      stats.memorySizeEstimate += JSON.stringify(value).length;
    }

    stats.memorySizeMB = (stats.memorySizeEstimate / 1024 / 1024).toFixed(2);
    return stats;
  }
}

// Create singleton instance
const cache = new GrokCache();

// Clean expired entries every hour
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.cleanExpired();
  }, 60 * 60 * 1000);
}

export default cache;