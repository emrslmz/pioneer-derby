import { onBeforeUnmount, onMounted } from 'vue'

/** Normalised key: lower-case letters, `space`, `escape`, or the printed character (`?`, `1`). */
export type ShortcutKey = string
export type ShortcutMap = Readonly<Record<ShortcutKey, (event: KeyboardEvent) => void>>

const TYPING_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const ACTIVATABLE_SELECTOR =
  'button, a[href], summary, [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"]'

export function normaliseKey(event: KeyboardEvent): ShortcutKey {
  if (event.key === ' ' || event.code === 'Space') return 'space'
  return event.key.toLowerCase()
}

/** Whether a global shortcut should ignore this event (typing, modifiers, native activation). */
export function shouldIgnore(event: KeyboardEvent, key: ShortcutKey): boolean {
  if (event.defaultPrevented || event.repeat) return true
  if (event.ctrlKey || event.metaKey || event.altKey) return true
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest(TYPING_SELECTOR)) return true
  // Space already activates a focused button; don't fire a second action on top.
  return key === 'space' && Boolean(target?.closest(ACTIVATABLE_SELECTOR))
}

/** Global single-key shortcuts (X8), active while the calling component is mounted. */
export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  const onKeydown = (event: KeyboardEvent) => {
    const key = normaliseKey(event)
    const handler = shortcuts[key]
    if (!handler || shouldIgnore(event, key)) return
    event.preventDefault()
    handler(event)
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
