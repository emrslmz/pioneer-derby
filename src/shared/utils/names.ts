/**
 * Compact display name for tight spaces: first name + initial of the last name.
 * "Grace Hopper" → "Grace H.", "John von Neumann" → "John N.", "Tim Berners-Lee" → "Tim B.".
 * Single-word names are returned unchanged.
 */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return fullName.trim()
  const first = parts[0] as string
  const last = parts[parts.length - 1] as string
  return `${first} ${last.charAt(0).toLocaleUpperCase()}.`
}
