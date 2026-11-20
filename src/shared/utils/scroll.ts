/**
 * Scrolls `element` into view inside its nearest scrollable ancestor only — never the page.
 * Auto-scrolling a list must not yank the viewport away from the race (stacked layouts).
 */
export function scrollWithinContainer(element: HTMLElement, smooth = true): void {
  let container = element.parentElement
  while (container && container.scrollHeight <= container.clientHeight) {
    if (container === document.body) return
    container = container.parentElement
  }
  if (!container || container === document.body || container === document.documentElement) return

  const offset = element.getBoundingClientRect().top - container.getBoundingClientRect().top
  container.scrollTo?.({
    top: container.scrollTop + offset,
    behavior: smooth ? 'smooth' : 'auto',
  })
}
