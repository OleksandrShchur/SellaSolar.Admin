/** Mobile bottom-nav inner bar height (shared with AddFab clearance). */
export const BOTTOM_NAV_HEIGHT = 56

/** Vertical padding applied inside LiquidGlass (`6px` top + bottom). */
export const BOTTOM_NAV_GLASS_PADDING_Y = 12

/** Total visual dock height including glass padding. */
export const BOTTOM_NAV_DOCK_HEIGHT = BOTTOM_NAV_HEIGHT + BOTTOM_NAV_GLASS_PADDING_Y

/** Horizontal inset for the floating glass dock. */
export const BOTTOM_NAV_INSET_X = 12

/**
 * Minimum gap between the dock and the screen edge.
 * On iPhone the home indicator only uses the lower part of the ~34px safe area,
 * so most of that inset is empty beige. Keep a small margin above the indicator
 * instead of stacking the full safe area on top of this gap.
 */
export const BOTTOM_NAV_EDGE_GAP = 12

/** CSS length from the screen bottom to the bottom edge of the dock. */
export function bottomNavBottomOffset(): string {
  return `max(${BOTTOM_NAV_EDGE_GAP}px, calc(env(safe-area-inset-bottom, 0px) - 12px))`
}

/**
 * CSS calc for space reserved under content / FAB on mobile.
 * Accounts for dock height + the same bottom offset the dock uses.
 */
export function bottomNavClearance(extraPx = 0): string {
  return `calc(${BOTTOM_NAV_DOCK_HEIGHT + extraPx}px + ${bottomNavBottomOffset()})`
}
