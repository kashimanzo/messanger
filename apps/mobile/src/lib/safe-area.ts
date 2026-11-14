/**
 * Safe-area spacing.
 * Top: prefer system inset (status bar is not overlaid).
 * Bottom: Android gesture/nav bars often still overlap; keep a floor.
 */
export const SAFE_TOP = 'env(safe-area-inset-top, 0px)';
export const SAFE_BOTTOM = 'max(20px, env(safe-area-inset-bottom, 0px))';
export const SAFE_LEFT = 'env(safe-area-inset-left, 0px)';
export const SAFE_RIGHT = 'env(safe-area-inset-right, 0px)';
