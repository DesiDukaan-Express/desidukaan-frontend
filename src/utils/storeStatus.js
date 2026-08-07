// src/utils/storeStatus.js

/**
 * Effective open/closed status of a store for the customer side.
 *
 * A store is OPEN only when BOTH hold:
 *   1. The store-status toggle is ON (vendor.is_open === true)
 *   2. The current local time falls inside [opening_time, closing_time]
 *
 * If the time is outside the window the store is CLOSED regardless of the toggle.
 * Handles overnight stores (e.g. 22:00 → 04:00).
 *
 * Computed locally on the client from the vendor's stored hours + toggle, so it
 * always reflects the current minute without depending on backend caching or a
 * page refresh. Falls back to the server-computed `is_currently_open` when the
 * hour fields aren't available on the object.
 */
export function isStoreCurrentlyOpen(vendor) {
  if (!vendor) return false;

  if (vendor.is_currently_open != null && (!vendor.opening_time || !vendor.closing_time)) {
    return vendor.is_currently_open;
  }

  if (!vendor.is_open) return false;
  if (!vendor.opening_time || !vendor.closing_time) return !!vendor.is_open;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = vendor.opening_time.split(":").map(Number);
  const [closeH, closeM] = vendor.closing_time.split(":").map(Number);
  if (Number.isNaN(openH) || Number.isNaN(closeH)) return !!vendor.is_open;

  const openMinutes = openH * 60 + (openM || 0);
  const closeMinutes = closeH * 60 + (closeM || 0);

  if (closeMinutes < openMinutes) {
    // Overnight shop (e.g. 22:00 → 04:00)
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}
