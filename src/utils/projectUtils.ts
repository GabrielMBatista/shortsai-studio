/**
 * Utility functions for project data manipulation
 */

/**
 * Validates if a string is a "real" title and not a placeholder/fallback.
 */
const isValidTitle = (title: string | null | undefined): boolean => {
    if (!title || typeof title !== 'string') return false;
    const lower = title.toLowerCase().trim();
    if (lower.length < 3 || lower.length > 100) return false;

    // Allow standard titles but block common system values
    const blockers = ['untitled project', 'projeto sem título', 'sem título', 'video', 'project', 'json', 'data', 'undefined', 'null'];
    if (blockers.some(b => lower.includes(b))) return false;

    // Explicit exclusions if it looks like an ID
    if (/^[a-f0-9-]{36}$/.test(lower)) return false; // UUID

    return true;
};

/**
 * Aggressive recursive search for title.
 * Uses BFS to favor top-level keys but goes deep.
 */
const findTitleDeep = (obj: any, depth: number = 0): string | null => {
    if (!obj || typeof obj !== 'object' || depth > 8) return null; // Very deep

    // 1. Exact Match Priority Keys (The "Good" Keys)
    const priorityKeys = [
        'titulo_otimizado', 'titulo', 'tittle', 'title',
        'projectTitle', 'videoTitle', 'scriptTitle', 'headline',
        'id_da_semana', 'tema_dia', 'cronograma', 'weekId',
        'name', 'topic', 'subject'
    ];

    for (const key of priorityKeys) {
        if (obj[key] && typeof obj[key] === 'string' && isValidTitle(obj[key])) {
            return obj[key];
        }
    }

    // 2. Fuzzy / Loose Search (Any key containing "title", "name", "tema")
    // Only at top levels to avoid grabbing random nested noise
    if (depth < 2) {
        for (const key in obj) {
            const lowerKey = key.toLowerCase();''
            if ((lowerKey.includes('title') || lowerKey.includes('título') || lowerKey.includes('name')) &&
                typeof obj[key] === 'string' && isValidTitle(obj[key])) {
                return obj[key];
            }
        }
    }

    // 3. Recurse (DFS)
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            const found = findTitleDeep(obj[key], depth + 1);
            if (found) return found;
        }
    }

    return null;
};

/**
 * Extracts a human-readable title from a string that might be a recursive JSON or a plain string.
 * Handles cases where the title is embedded in a JSON structure.
 * 
 * @param rawTitle The raw title string or JSON string from generatedTitle or topic
 * @param fallback The fallback string to return if no title can be extracted
 * @returns The extracted title or the fallback
 */
export const extractProjectTitle = (rawTitle: string | null | undefined, fallback: string = 'Untitled Project'): string => {
    if (!rawTitle) return fallback;

    // If it's a simple string that looks like a valid title, return it.
    // BUT if it looks like JSON/Array, we MUST parse it.
    const trimmed = typeof rawTitle === 'string' ? rawTitle.trim() : String(rawTitle);

    // JSON Detection
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const json = JSON.parse(trimmed);
            const found = findTitleDeep(json);
            if (found) return found;

            // If parsed but no title found, check if it's a schedule with 'cronograma'
            if (json.cronograma && json.id_da_semana) return json.id_da_semana;
        } catch (e) {
            // Parse error
        }

        // CRITICAL: If it looks like JSON but we failed to parse or extract, 
        // NEVER return the raw JSON string. Return fallback.
        return fallback;
    }

    // If we are here, it's not JSON. Check if it's a valid title string.
    if (!isValidTitle(trimmed)) {
        return fallback;
    }

    return trimmed;
};

/**
 * Generic deep finder for multiple keys
 */
const findValueDeep = (obj: any, keys: string[], depth: number = 0): string | string[] | null => {
    if (!obj || typeof obj !== 'object' || depth > 6) return null; // Increased depth to 6

    for (const key of keys) {
        if (obj[key]) {
            // Strong match
            return obj[key];
        }
    }

    // Recurse
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            const found = findValueDeep(obj[key], keys, depth + 1);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Extracts a human-readable description from a string that might be a recursive JSON.
 * Falls back to aggressively harvesting text from hook/scenes/content/text fields.
 */
export const extractProjectDescription = (rawDesc: string | null | undefined, fallback: string = ''): string => {
    if (!rawDesc) return fallback;
    const trimmed = typeof rawDesc === 'string' ? rawDesc.trim() : String(rawDesc);

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const json = JSON.parse(trimmed);

            // 1. Explicit Description Key
            const found = findValueDeep(json, ['description', 'generatedDescription', 'desc', 'generated_description', 'resumo', 'summary', 'overview', 'caption', 'mensagem_nuclear', 'tema_espiritual']);
            if (found && typeof found === 'string' && found.length > 5) return found;

            // 2. Aggressive Synthesis
            const fragments: string[] = [];

            const harvestText = (obj: any, depth: number) => {
                if (!obj || depth > 5) return;

                if (Array.isArray(obj)) {
                    obj.forEach(item => harvestText(item, depth + 1));
                    return;
                }

                if (typeof obj === 'object') {
                    // Check for high-value text keys
                    const keys = ['hook', 'hook_falado', 'narration', 'text', 'visualDescription', 'content', 'script'];
                    for (const k of keys) {
                        if (obj[k] && typeof obj[k] === 'string' && obj[k].length > 10) {
                            fragments.push(obj[k]);
                        }
                    }

                    if (Array.isArray(obj.scenes)) {
                        obj.scenes.forEach((s: any) => harvestText(s, depth + 1));
                    }

                    // Recurse children
                    for (const k in obj) {
                        // Avoid redefining scenes recursion or going into irrelevant metadata
                        if (typeof obj[k] === 'object' && k !== 'scenes' && k !== 'meta_global') {
                            harvestText(obj[k], depth + 1);
                        }
                    }
                }
            };

            harvestText(json, 0);

            if (fragments.length > 0) {
                const unique = Array.from(new Set(fragments));
                const joined = unique.join(' ').trim();
                return joined.length > 300 ? joined.substring(0, 300) + '...' : joined;
            }

        } catch (e) {
            // Ignore
        }
        return fallback; // Don't return raw JSON
    }

    return trimmed;
};

/**
 * Extracts hashtags array from a string/JSON.
 */
export const extractProjectHashtags = (rawTags: string | string[] | null | undefined): string[] => {
    if (!rawTags) return [];

    // If it's already an array, use it
    if (Array.isArray(rawTags)) return rawTags;

    const trimmed = String(rawTags).trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const json = JSON.parse(trimmed);
            // If it's a direct array
            if (Array.isArray(json)) return json;

            // Search for keys
            const found = findValueDeep(json, ['hashtags', 'generated_shorts_hashtags', 'tags', 'keywords', 'generated_tiktok_hashtags']);
            if (Array.isArray(found)) return found;
            if (typeof found === 'string') return found.split(',').map(s => s.trim());
        } catch (e) {
            // Ignore
        }
        return []; // Return empty if failed parse
    }

    // Split string by commas or spaces if it looks like a list
    if (trimmed.includes(',')) return trimmed.split(',').map(s => s.trim());

    // As a last result, if it's just a string, return it as one tag (unless it looks like JSON garbage)
    if (trimmed.length < 50) return [trimmed];

    return [];
};
