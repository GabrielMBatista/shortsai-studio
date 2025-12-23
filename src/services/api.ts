export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Construct URL. If API_BASE_URL is absolute, use it. If relative, use it.
    // If API_BASE_URL is just a host (e.g. http://localhost:3333) and endpoint is /folders,
    // we might need to append /api if the backend expects it.
    // However, we assume API_BASE_URL is configured correctly (e.g. http://localhost:3333/api).
    // If VITE_API_URL is missing, it defaults to '/api'.

    // Fix: If API_BASE_URL ends with /api and endpoint starts with /api, remove one /api
    let finalBase = API_BASE_URL;
    let finalEndpoint = normalizedEndpoint;

    if (finalBase.endsWith('/api') && finalEndpoint.startsWith('/api/')) {
        finalEndpoint = finalEndpoint.substring(4); // Remove leading /api
    }

    const url = `${finalBase}${finalEndpoint}`;

    try {
        const res = await fetch(url, {
            ...options,
            headers,
            credentials: 'include', // Ensure cookies are sent
        });

        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = `API Error ${res.status}: ${res.statusText}`;
            try {
                // Try to parse JSON error
                const jsonError = JSON.parse(errorText);
                if (jsonError.error) errorMessage = jsonError.error;
                if (jsonError.details) errorMessage += ` - ${JSON.stringify(jsonError.details)}`;
            } catch (e) {
                // If not JSON, use text (truncated)
                errorMessage += ` - ${errorText.substring(0, 100)}`;
            }

            const error = new Error(errorMessage);
            (error as any).status = res.status;
            throw error;
        }

        const text = await res.text();
        return text ? JSON.parse(text) : {};
    } catch (error) {
        if (endpoint === '/usage') {
            throw error;
        }
        console.warn(`API Request failed for ${endpoint} (${url}):`, error);
        throw error;
    }
}
