export function safeParseJSONB<T>(jsonb: unknown, fallback: T): T {
    if (jsonb === null || jsonb === undefined) return fallback;

    if (typeof jsonb === 'object') {
        // Already an object, but verify it matches shape if T is specific? 
        // For now return as is.
        return jsonb as T;
    }

    try {
        const parsed = typeof jsonb === 'string' ? JSON.parse(jsonb) : jsonb;

        if (Array.isArray(fallback)) {
            if (!Array.isArray(parsed)) return fallback;
        } else if (typeof fallback === 'object') {
            if (typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
        }

        return parsed as T;
    } catch (err) {
        console.error('JSONB Parse Error', err);

        if (typeof jsonb === 'string') {
            try {
                // Simple repair: replace '}' or ']' issues? 
                const repaired = jsonb.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
                return JSON.parse(repaired) as T;
            } catch {
                return fallback;
            }
        }

        return fallback;
    }
}
