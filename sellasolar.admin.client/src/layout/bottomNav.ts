/** Floating mobile bottom-nav pill dimensions (shared with AddFab clearance). */
export const BOTTOM_NAV_HEIGHT = 56
/** Gap between the pill and the screen bottom (above safe-area inset). */
export const BOTTOM_NAV_OFFSET = 12

/** CSS calc for space reserved under content / FAB on mobile. */
export function bottomNavClearance(extraPx = 0): string {
  const total = BOTTOM_NAV_HEIGHT + BOTTOM_NAV_OFFSET + extraPx
  return `calc(${total}px + env(safe-area-inset-bottom, 0px))`
}
