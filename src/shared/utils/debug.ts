/** `?debug=1` turns on developer tooling such as the analytics event panel (X5). */
export function isDebugMode(search = globalThis.location?.search ?? ''): boolean {
  return new URLSearchParams(search).get('debug') === '1'
}
