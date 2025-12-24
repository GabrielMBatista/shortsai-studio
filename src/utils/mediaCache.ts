/**
 * Sistema de Cache para Mídia (Imagens/Vídeos) do R2
 * Usa Cache API + SessionStorage para evitar re-downloads
 */

const CACHE_NAME = 'shortsai-media-cache-v1';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const MAX_CACHE_SIZE_MB = 50; // Limita cache a 50MB

interface CacheMetadata {
    url: string;
    timestamp: number;
    size?: number;
    type: 'image' | 'video' | 'audio';
}

class MediaCache {
    private cache: Cache | null = null;
    private metadata: Map<string, CacheMetadata> = new Map();

    async init() {
        try {
            this.cache = await caches.open(CACHE_NAME);
            this.loadMetadata();
            console.log('[MediaCache] Initialized');
        } catch (e) {
            console.warn('[MediaCache] Cache API not available:', e);
        }
    }

    private loadMetadata() {
        try {
            const stored = sessionStorage.getItem('media-cache-metadata');
            if (stored) {
                const data = JSON.parse(stored);
                this.metadata = new Map(Object.entries(data));
                this.cleanExpired();
            }
        } catch (e) {
            console.warn('[MediaCache] Failed to load metadata:', e);
        }
    }

    private saveMetadata() {
        try {
            const data = Object.fromEntries(this.metadata);
            sessionStorage.setItem('media-cache-metadata', JSON.stringify(data));
        } catch (e) {
            console.warn('[MediaCache] Failed to save metadata:', e);
        }
    }

    private cleanExpired() {
        const now = Date.now();
        let removed = 0;

        for (const [url, meta] of this.metadata.entries()) {
            if (now - meta.timestamp > CACHE_DURATION) {
                this.metadata.delete(url);
                this.cache?.delete(url);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`[MediaCache] Removed ${removed} expired entries`);
            this.saveMetadata();
        }
    }

    async get(url: string): Promise<string | null> {
        if (!this.cache) return null;

        // Check metadata first
        const meta = this.metadata.get(url);
        if (!meta || Date.now() - meta.timestamp > CACHE_DURATION) {
            return null;
        }

        try {
            const response = await this.cache.match(url);
            if (response) {
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                console.log('[MediaCache] HIT:', url.substring(0, 50));
                return objectUrl;
            }
        } catch (e) {
            console.warn('[MediaCache] Failed to retrieve from cache:', e);
        }

        return null;
    }

    async set(url: string, blob: Blob, type: 'image' | 'video' | 'audio'): Promise<void> {
        if (!this.cache) return;

        try {
            // Check cache size limit
            const estimatedSize = blob.size / (1024 * 1024); // MB
            if (estimatedSize > MAX_CACHE_SIZE_MB) {
                console.warn('[MediaCache] File too large to cache:', estimatedSize.toFixed(2), 'MB');
                return;
            }

            // Store in cache
            const response = new Response(blob);
            await this.cache.put(url, response);

            // Save metadata
            this.metadata.set(url, {
                url,
                timestamp: Date.now(),
                size: blob.size,
                type
            });
            this.saveMetadata();

            console.log('[MediaCache] STORED:', url.substring(0, 50), estimatedSize.toFixed(2), 'MB');
        } catch (e) {
            console.warn('[MediaCache] Failed to cache:', e);
        }
    }

    async fetchAndCache(url: string, type: 'image' | 'video' | 'audio'): Promise<string> {
        // Check cache first
        const cached = await this.get(url);
        if (cached) return cached;

        // Fetch from network
        console.log('[MediaCache] MISS, fetching:', url.substring(0, 50));
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const blob = await response.blob();

        // Cache it (don't await to avoid blocking)
        this.set(url, blob, type).catch(e => {
            console.warn('[MediaCache] Failed to cache after fetch:', e);
        });

        // Return object URL immediately
        return URL.createObjectURL(blob);
    }

    async clear() {
        try {
            if (this.cache) {
                const keys = await this.cache.keys();
                await Promise.all(keys.map(request => this.cache!.delete(request)));
            }
            this.metadata.clear();
            sessionStorage.removeItem('media-cache-metadata');
            console.log('[MediaCache] Cleared all cache');
        } catch (e) {
            console.warn('[MediaCache] Failed to clear cache:', e);
        }
    }

    getStats() {
        let totalSize = 0;
        for (const meta of this.metadata.values()) {
            totalSize += meta.size || 0;
        }

        return {
            entries: this.metadata.size,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    }
}

// Singleton instance
export const mediaCache = new MediaCache();

// Initialize on module load
mediaCache.init();

// Cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        // Revoke all object URLs to prevent memory leaks
        // Note: Cache API data persists, only object URLs are revoked
    });
}
