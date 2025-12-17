/**
 * Utility functions for project data manipulation
 */

/**
 * Extracts a human-readable title from a string that might be a recursive JSON or a plain string.
 * Handles cases where the title is embedded in a JSON structure under keys like 'titulo', 'projectTitle', etc.
 * 
 * @param rawTitle The raw title string or JSON string from generatedTitle or topic
 * @param fallback The fallback string to return if no title can be extracted (default: 'Untitled Project')
 * @returns The extracted title or the fallback
 */
export const extractProjectTitle = (rawTitle: string | null | undefined, fallback: string = 'Untitled Project'): string => {
    if (!rawTitle) return fallback;

    // If it's not a string, try to convert or return fallback. 
    // In TS rawTitle is string|null|undefined but runtime might differ.
    if (typeof rawTitle !== 'string') return String(rawTitle);

    const trimmed = rawTitle.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            const json = JSON.parse(trimmed);

            // Priority list of keys to look for
            // 'titulo' is high priority based on user feedback
            const possibleKeys = [
                'titulo',
                'projectTitle',
                'videoTitle',
                'title',
                'scriptTitle',
                'name',
                'topic',
                'id_da_semana', // Use week ID as title if it's a schedule object
                'tema_dia'      // Daily theme as fallback
            ];

            for (const key of possibleKeys) {
                if (json[key] && typeof json[key] === 'string' && json[key].trim().length > 0) {
                    return json[key];
                }
            }

            // If strictly a wrapper like { "title": "..." } but the key was missed above, 
            // we've covered most.

            // If the JSON is deeper, we might want to return the rawTitle so the user checks it 
            // OR return fallback. Returning rawTitle (the JSON) is what the user dislikes.
            // But if we return "Untitled Project" for a valid JSON that we just couldn't parse, 
            // that's also annoying.
            // However, the User specifically asked to extract the title.
            // If we can't find one, maybe we return the fallback.

            // Let's try to be smart: if it interprets as an object but has no title keys, 
            // check if it has 'cronograma'.
            if (json.cronograma) {
                return json.id_da_semana || fallback;
            }

            // If we really can't find a title, return fallback to avoid showing raw JSON
            return fallback;
        } catch (e) {
            // If JSON parse fails, it might be a title that just starts with { (unlikely but possible)
            // or malformed JSON. Return original text to be safe.
            return rawTitle;
        }
    }

    return rawTitle;
};
