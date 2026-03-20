import { create } from "zustand";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const useAddressStore = create((set, get) => ({
  addresses:  [],
  selectedId: null,

  setSelectedId: (id) => set({ selectedId: id }),

  // Saves to backend and stores the real DB id locally
  addAddress: async (address, token) => {
    try {
      const res = await fetch(`${BASE_URL}/addresses`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          label:       address.label    || "Home",
          address_line: address.address || address.address_line,
          city:        address.city     || "Kolkata",
          state:       address.state    || "West Bengal",
          pincode:     address.pincode  || "700001",
          latitude:    address.lat      || null,
          longitude:   address.lng      || null,
        }),
      });
      const data = await res.json();
      const saved = data.data?.address || data.address;

      if (saved?.id) {
        const newAddress = {
          id:           saved.id,          // real DB id
          label:        saved.label,
          address_line: saved.address_line,
          address:      saved.address_line,
          lat:          saved.latitude,
          lng:          saved.longitude,
        };
        set(state => ({ addresses: [...state.addresses, newAddress] }));
        return saved.id;
      }
    } catch (e) {
      console.error("addAddress failed:", e.message);
    }

    // Fallback — store locally only if backend fails
    const { addresses } = get();
    const localId = addresses.length > 0
      ? Math.max(...addresses.map(a => a.id)) + 1 : 1;
    const newAddress = {
      id:           localId,
      label:        address.label    || "Home",
      address_line: address.address  || address.address_line,
      address:      address.address  || address.address_line,
      lat:          address.lat      || null,
      lng:          address.lng      || null,
    };
    set(state => ({ addresses: [...state.addresses, newAddress] }));
    return localId;
  },

  // Load addresses from backend on login
  loadAddresses: async (token) => {
    try {
      const res  = await fetch(`${BASE_URL}/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data.data?.addresses || data.addresses || [];
      const mapped = list.map(a => ({
        id:           a.id,
        label:        a.label,
        address_line: a.address_line,
        address:      a.address_line,
        lat:          a.latitude,
        lng:          a.longitude,
      }));
      set({ addresses: mapped, selectedId: mapped[0]?.id || null });
    } catch (e) {
      console.error("loadAddresses failed:", e.message);
    }
  },

  removeAddress: (id) => {
    set(state => ({
      addresses:  state.addresses.filter(a => a.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  clearAddresses: () => set({ addresses: [], selectedId: null }),
}));

export default useAddressStore;