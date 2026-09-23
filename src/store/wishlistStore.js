import { create } from "zustand";
import { wishlistAPI } from "../services/api";

// ─── Wishlist store ─────────────────────────────────────────────────────────
// `ids`   — lightweight list of wishlisted product ids, used to light up the
//           heart icon on product cards without fetching full product data.
// `items` — full wishlist rows (product + vendor), used by WishlistScreen.
//
// All network calls go through `wishlistAPI` (services/api.js) so an expired
// 15-minute access token is refreshed and the request retried automatically.
// (The previous raw `fetch` calls never refreshed the token, so wishlist
// writes started failing with 401 once the token aged out.)

// authStore imports this file, so it is loaded lazily to avoid a require cycle.
const currentToken = async (passed) => {
  if (passed) return passed;
  try {
    const { default: useAuthStore } = await import("./authStore");
    return useAuthStore.getState().token || null;
  } catch {
    return null;
  }
};

const useWishlistStore = create((set, get) => ({
  ids: [],
  items: [],
  loading: false,
  error: null,

  isWishlisted: (productId) => get().ids.includes(productId),

  // Lightweight ids fetch — call on login / app boot so heart icons show the
  // correct state immediately, without loading full product data.
  loadIds: async (token) => {
    const t = await currentToken(token);
    if (!t) return;
    try {
      const data = await wishlistAPI.getIds(t);
      set({ ids: data.data?.ids || [], error: null });
    } catch (e) {
      console.error("loadWishlistIds failed:", e.message);
    }
  },

  // Full wishlist with product + vendor data — call when WishlistScreen opens.
  loadWishlist: async (token) => {
    const t = await currentToken(token);
    if (!t) return;
    set({ loading: true });
    try {
      const data = await wishlistAPI.getAll(t);
      const items = data.data?.items || [];
      set({ items, ids: items.map((i) => i.product_id), loading: false, error: null });
    } catch (e) {
      console.error("loadWishlist failed:", e.message);
      set({ loading: false, error: e.message });
    }
  },

  // Optimistic add — flips the heart instantly, rolls back if the server call fails.
  // Resolves to { ok: true } or { ok: false, error }.
  add: async (productId, token) => {
    const { ids } = get();
    if (ids.includes(productId)) return { ok: true };
    const t = await currentToken(token);
    if (!t) return { ok: false, error: "Please log in to save items to your wishlist." };

    set({ ids: [...ids, productId], error: null });
    try {
      await wishlistAPI.add(productId, t);
      return { ok: true };
    } catch (e) {
      console.error("addToWishlist failed:", e.message);
      set({ ids: get().ids.filter((id) => id !== productId), error: e.message });
      return { ok: false, error: e.message };
    }
  },

  // Optimistic remove — also drops the item from the full list if it's loaded.
  remove: async (productId, token) => {
    const t = await currentToken(token);
    if (!t) return { ok: false, error: "Please log in to manage your wishlist." };

    const { ids, items } = get();
    const prevIds = ids;
    const prevItems = items;
    set({
      ids: ids.filter((id) => id !== productId),
      items: items.filter((i) => i.product_id !== productId),
      error: null,
    });
    try {
      await wishlistAPI.remove(productId, t);
      return { ok: true };
    } catch (e) {
      console.error("removeFromWishlist failed:", e.message);
      // Roll back so the UI doesn't silently drift from the server
      set({ ids: prevIds, items: prevItems, error: e.message });
      return { ok: false, error: e.message };
    }
  },

  toggle: async (productId, token) => {
    const { ids } = get();
    return ids.includes(productId)
      ? get().remove(productId, token)
      : get().add(productId, token);
  },

  clearWishlist: () => set({ ids: [], items: [], loading: false, error: null }),
}));

export default useWishlistStore;