import { create } from 'zustand';
import { wishlistAPI } from '../services/api';

const useWishlistStore = create((set, get) => ({
  ids: [],
  items: [],
  loading: false,

  loadIds: async (token) => {
    if (!token) return;
    try {
      const res = await wishlistAPI.getIds(token);
      set({ ids: res.data?.ids || [] });
    } catch (e) { console.log('Wishlist loadIds error:', e.message); }
  },

  loadAll: async (token) => {
    if (!token) return;
    set({ loading: true });
    try {
      const res = await wishlistAPI.getAll(token);
      const items = res.data?.items || [];
      set({ items, ids: items.map(i => i.product_id), loading: false });
    } catch (e) { set({ loading: false }); }
  },

  toggle: async (productId, token) => {
    const { ids, items } = get();
    const isWishlisted = ids.includes(productId);
    const nextIds = isWishlisted ? ids.filter(id => id !== productId) : [...ids, productId];
    const nextItems = isWishlisted ? items.filter(i => i.product_id !== productId) : items;
    set({ ids: nextIds, items: nextItems });
    try {
      if (isWishlisted) {
        await wishlistAPI.remove(productId, token);
      } else {
        await wishlistAPI.add(productId, token);
      }
    } catch (e) {
      set({ ids: isWishlisted ? [...ids, productId] : ids.filter(id => id !== productId), items });
    }
  },

  isWishlisted: (productId) => get().ids.includes(productId),

  clearWishlist: () => set({ ids: [], items: [] }),
}));

export default useWishlistStore;
