import { create } from 'zustand';

const useAddressStore = create((set, get) => ({
    addresses : [

    ],

    addAddress : (address) => {
        const {addresses} = get();
        const newAddress = {
            address ,
            id : addresses.length + 1
        }
        set({addresses : [...addresses , newAddress]})
    },

    removeAddress : (address) => {
        const {addresses} = get();
        set({addresses : addresses.filter((elem) => {
            return elem.id === address.id;
        })})
    },

    clearAddresses : () => {
        set({addresses : []})
    }
}));

export default useAddressStore;