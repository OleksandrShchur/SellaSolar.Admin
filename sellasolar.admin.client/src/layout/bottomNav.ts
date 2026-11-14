/** Mobile bottom-nav inner bar height (shared with AddFab clearance). */
export const BOTTOM_NAV_HEIGHT = 56

/** Vertical padding applied inside LiquidGlass (`6px` top + bottom). */
export const BOTTOM_NAV_GLASS_PADDING_Y = 12

/** Total visual dock height including glass padding. */
export const BOTTOM_NAV_DOCK_HEIGHT = BOTTOM_NAV_HEIGHT + BOTTOM_NAV_GLASS_PADDING_Y

/** Horizontal inset for the floating glass dock. */
export const BOTTOM_NAV_INSET_X = 12

/** Bottom inset above the safe-area for the floating glass dock. */
export const BOTTOM_NAV_INSET_BOTTOM = 12

/**
 * CSS calc for space reserved under content / FAB on mobile.
 * Accounts for dock height + floating bottom inset + safe-area + optional extra gap.
 */
export function bottomNavClearance(extraPx = 0): string {
  const total = BOTTOM_NAV_DOCK_HEIGHT + BOTTOM_NAV_INSET_BOTTOM + extraPx
  return `calc(${total}px + env(safe-area-inset-bottom, 0px))`
}
