/**
 * Sistema de Cache para Mídia (Imagens) e Streaming Seguro (Vídeo/Áudio)
 * Otimizado: Imagens -> Cache Local (Blob)
 *            Vídeos/Áudio -> Streaming via Proxy (Sem Cache Local, apenas navegador)
 */

import { resourceQueue } from './resourceQueue';
import { getProxyUrl } from './urlUtils';

const CACHE_NAME = 'shortsai-media-cache-v1';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const MAX_CACHE_SIZE_MB = 50; // Limita cache a 50MB por arquivo (imagens)
const MAX_CACHE_ENTRIES = 100; // Limite de entradas para evitar exceder localStorage quota

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
        if (typeof window === 'undefined') return;
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
            const stored = localStorage.getItem('media-cache-metadata');
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
            // Convert Map to Object for JSON storage
            const data = Object.fromEntries(this.metadata);
            localStorage.setItem('media-cache-metadata', JSON.stringify(data));
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
                // console.log('[MediaCache] HIT:', url.substring(0, 50));
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
                console.debug('[MediaCache] File too large to cache:', estimatedSize.toFixed(2), 'MB');
                return;
            }

            // LRU: Remove oldest entries if exceeding limit
            if (this.metadata.size >= MAX_CACHE_ENTRIES) {
                const sortedEntries = Array.from(this.metadata.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp);

                // Remove oldest 20%
                const toRemove = Math.ceil(MAX_CACHE_ENTRIES * 0.2);
                for (let i = 0; i < toRemove; i++) {
                    const [oldUrl] = sortedEntries[i];
                    this.metadata.delete(oldUrl);
                    this.cache.delete(oldUrl);
                }
                console.log(`[MediaCache] LRU clean: ${toRemove} items removed`);
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
        } catch (e) {
            console.warn('[MediaCache] Failed to cache:', e);
        }
    }

    /**
     * Main entry point
     * - Images: Fetched, Cached (Blob), Returned as ObjectURL
     * - Video/Audio: NOT Cached locally (Streaming), Returned as ProxyURL
     */
    async fetchAndCache(url: string, type: 'image' | 'video' | 'audio'): Promise<string> {
        if (!url) return '';

        // 1. VIDEOS & AUDIO -> STREAMING STRATEGY
        // Don't cache blobs for video/audio to allow seeking and fast playback
        // Just return the proxy URL so browser handles range requests correctly
        if (type === 'video' || type === 'audio') {
            if (url.startsWith('http') && !url.includes('/api/assets?url=')) {
                return getProxyUrl(url);
            }
            return url;
        }

        // 2. IMAGES -> CACHE STRATEGY
        // Check cache first
        const cached = await this.get(url);
        if (cached) return cached;

        // Fetch from network with resource queue control
        // console.log('[MediaCache] MISS, fetching:', url.substring(0, 50));

        return new Promise((resolve, reject) => {
            // Enqueue using specific type queue (images have higher concurrency)
            // Enqueue using specific type queue (images have higher concurrency)
            /* const cancelQueue = */ resourceQueue.enqueue(async () => {
            try {
                // Always use Proxy for external R2 URLs to avoid CORS
                let fetchUrl = url;
                if (url.startsWith('http') && !url.includes('/assets?url=')) {
                    fetchUrl = getProxyUrl(url);
                }

                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    reject(new Error(`Failed to fetch: ${response.status}`));
                    return;
                }

                const blob = await response.blob();

                // Cache it (fire and forget)
                this.set(url, blob, type).catch(e => {
                    console.warn('[MediaCache] Failed to cache after fetch:', e);
                });

                // Return object URL immediately
                const objectUrl = URL.createObjectURL(blob);
                resolve(objectUrl);
            } catch (err) {
                reject(err);
            }
        }, type);
        });
    }

    async clear() {
        try {
            if (this.cache) {
                const keys = await this.cache.keys();
                await Promise.all(keys.map(request => this.cache!.delete(request)));
            }
            this.metadata.clear();
            localStorage.removeItem('media-cache-metadata');
            console.log('[MediaCache] Cleared all cache');
        } catch (e) {
            console.warn('[MediaCache] Failed to clear cache:', e);
        }
    }
}

export const mediaCache = new MediaCache();
mediaCache.init();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        // Cleanup if needed
    });
}
