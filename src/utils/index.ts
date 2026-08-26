


export function createPageUrl(pageName: string) {
    const [path, ...queryParts] = pageName.split('?');
    const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : '';
    return '/' + path.toLowerCase().replace(/ /g, '-') + query;
}

/** Lê parâmetro de URL de forma case-insensitive (ex.: clientId vs clientid). */
export function getUrlSearchParam(
    params: URLSearchParams,
    key: string,
    ...fallbackKeys: string[]
): string | null {
    const keys = [key, ...fallbackKeys];
    for (const k of keys) {
        const value = params.get(k);
        if (value) return value;
    }
    const lowerKeys = new Set(keys.map((k) => k.toLowerCase()));
    for (const [k, v] of params.entries()) {
        if (lowerKeys.has(k.toLowerCase()) && v) return v;
    }
    return null;
}