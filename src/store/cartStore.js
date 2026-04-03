import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  vendorId: null,

  addItem: (product, vid) => {
    const { items, vendorId: currentVendor } = get();
    const vendorId = vid || product.vendorId;

    if (currentVendor && vendorId && currentVendor !== vendorId) {
      set({ items: [{ ...product, qty: 1 }], vendorId });
      return;
    }

    const existing = items.find(i => i.id === product.id);
    if (existing) {
      set({ items: items.map(i => i.id === product.id ? { ...i, qty: (i.qty || 1) + 1 } : i) });
    } else {
      set({ items: [...items, { ...product, qty: 1 , image : product.image || product.img }], vendorId: vendorId || currentVendor });
    }
  },

  updateQty: (productId, qty) => {
    const { items } = get();
    if (qty <= 0) {
      const newItems = items.filter(i => i.id !== productId);
      set({ items: newItems, vendorId: newItems.length === 0 ? null : get().vendorId });
    } else {
      set({ items: items.map(i => i.id === productId ? { ...i, qty } : i) });
    }
  },

  removeItem: (productId) => {
    const { items } = get();
    const existing = items.find(i => i.id === productId);
    if (!existing) return;
    
    if (existing.qty <= 1) {
      const newItems = items.filter(i => i.id !== productId);
      set({ items: newItems, vendorId: newItems.length === 0 ? null : get().vendorId });
    } else {
      set({ items: items.map(i => i.id === productId ? { ...i, qty: i.qty - 1 } : i) });
    }
  },

  clearCart: () => set({ items: [], vendorId: null, proposedFee: null }),

  getTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.qty, 0);
  },

  proposedFee: null,
  setProposedFee: (fee) => set({ proposedFee: fee }),
}));

export default useCartStore;