import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  vendorId: null,

  addItem: (product, vendorId) => {
    const { items, vendorId: currentVendor } = get();

    // Clear cart if switching vendors
    if (currentVendor && currentVendor !== vendorId) {
      set({ items: [{ ...product, qty: 1 }], vendorId });
      return;
    }

    const existing = items.find(i => i.id === product.id);
    if (existing) {
      set({ items: items.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i) });
    } else {
      set({ items: [...items, { ...product, qty: 1 }], vendorId });
    }
  },

  removeItem: (productId) => {
    const { items } = get();
    const existing = items.find(i => i.id === productId);
    if (existing?.qty === 1) {
      set({ items: items.filter(i => i.id !== productId) });
    } else {
      set({ items: items.map(i => i.id === productId ? { ...i, qty: i.qty - 1 } : i) });
    }
  },

  clearCart: () => set({ items: [], vendorId: null }),

  getTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.qty, 0);
  },
}));

export default useCartStore;