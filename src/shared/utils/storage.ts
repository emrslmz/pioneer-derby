/**
 * Safe wrappers around `localStorage`.
 * Storage can be unavailable (private mode, blocked cookies, SSR) — callers always get a value back.
 */
export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // Persistence is a convenience; ignore quota or permission errors.
  }
}
