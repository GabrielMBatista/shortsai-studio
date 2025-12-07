
export const getProxyUrl = (url: string) => {
    // If it's already a data URI or local blob, return as is
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;

    // Sanity check for bad env vars
    if (url.includes('undefined/')) {
        console.error("❌ Invalid Asset URL detected (env var missing?):", url);
    }

    // Use the API proxy to bypass CORS
    // Assuming VITE_API_URL is set, otherwise default to location.origin/api if relative, or hardcoded for dev
    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    // If it's already a proxy URL, don't double wrap
    if (url.includes('/assets?url=')) return url;

    return `${apiUrl}/assets?url=${encodeURIComponent(url)}`;
};
