/** Mobile bottom-nav bar height (shared with AddFab clearance). */
export const BOTTOM_NAV_HEIGHT = 56

/** CSS calc for space reserved under content / FAB on mobile. */
export function bottomNavClearance(extraPx = 0): string {
  const total = BOTTOM_NAV_HEIGHT + extraPx
  return `calc(${total}px + env(safe-area-inset-bottom, 0px))`
}
