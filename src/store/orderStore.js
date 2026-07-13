import { create } from 'zustand';

const useOrderStore = create((set, get) => ({
    orders: [
        {
            id: "1",
            name: "Gupta General Store",
            time: "2 days ago",
            image:
                "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400",
        },
        {
            id: "3",
            name: "Fresh Veggie Mart",
            time: "1 week ago",
            image:
                "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
        },
        {
            id: "4",
            name: "Sharma Dairy Store",
            time: "3 days ago",
            image:
                "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
        },
        {
            id: "5",
            name: "Daily Needs Kirana",
            time: "4 days ago",
            image:
                "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400",
        },
    ],

    pendingOrder: null,

    addOrder: (newOrder) => {
        const { orders } = get();

        set({ orders: [newOrder, ...orders] });
    },


    setPendingOrder: (order) => {
        set({ pendingOrder: order });
    },


    updatePendingOrder: (updatedData) => {
        set((state) => ({
            pendingOrder: state.pendingOrder
                ? { ...state.pendingOrder, ...updatedData }
                : updatedData,
        }));
    },


    clearPendingOrder: () => {
        set({ pendingOrder: null });
    },
}));

export default useOrderStore;
