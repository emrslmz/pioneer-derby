/** Stable ids that tie a tab to its panel (aria-controls / aria-labelledby). */
export const tabId = (group: string, id: string) => `${group}-tab-${id}`
export const tabPanelId = (group: string, id: string) => `${group}-panel-${id}`

export interface TabItem {
  id: string
  label: string
}

/** Arrow / Home / End navigation shared by tabs and segmented controls (WAI-ARIA APG). */
export function nextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
