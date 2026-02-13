import pako from 'pako';

/**
 * Compresses data with gzip, encodes as base64, and stores in localStorage.
 */
export function setCompressed<T>(key: string, value: T): void {
    const json = JSON.stringify(value);
    const compressed = pako.gzip(json);
    // Convert Uint8Array to base64 in chunks to avoid call stack overflow
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < compressed.length; i += chunkSize) {
        binary += String.fromCharCode(...compressed.subarray(i, i + chunkSize));
    }
    localStorage.setItem(key, btoa(binary));
}

/**
 * Retrieves data from localStorage, decodes base64, and decompresses with gzip.
 */
export function getCompressed<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const binary = atob(item);
    const compressed = Uint8Array.from(binary, c => c.charCodeAt(0));
    const json = pako.ungzip(compressed, { to: 'string' });
    return JSON.parse(json);
}

/**
 * One-time cleanup: Delete old IndexedDB database.
 */
export function deleteOldIndexedDB(): void {
    try {
        const request = indexedDB.deleteDatabase('monkeysnow');
        request.onsuccess = () => console.log('Deleted old IndexedDB database');
        request.onerror = () => console.warn('Failed to delete old IndexedDB');
    } catch {
        // IndexedDB not available — ignore
    }
}
