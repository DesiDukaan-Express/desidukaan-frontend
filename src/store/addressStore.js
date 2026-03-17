import { create } from 'zustand';

const useAddressStore = create((set, get) => ({
  addresses:  [],
  selectedId: null, // id of the address currently active (set from HomeScreen)

  setSelectedId: (id) => set({ selectedId: id }),

  // address: { address: string, lat: number, lng: number }
  addAddress: (address) => {
    const { addresses } = get();
    const newAddress = {
      id:      addresses.length + 1,
      address: address.address,
      lat:     address.lat || null,
      lng:     address.lng || null,
    };
    set({ addresses: [...addresses, newAddress] });
  },

  removeAddress: (address) => {
    const { addresses } = get();
    set({ addresses: addresses.filter((elem) => elem.id !== address.id) });
  },

  clearAddresses: () => {
    set({ addresses: [], selectedId: null });
  },
}));

export default useAddressStore;