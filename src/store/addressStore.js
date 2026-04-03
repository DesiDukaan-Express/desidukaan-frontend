import { create } from "zustand";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const useAddressStore = create((set, get) => ({
  addresses:  [],
  selectedId: null,
  currentLocation: { lat: null, lng: null, displayName: "Detecting location...", loading: false, error: null },

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

  // ── Session-based location fetching ─────────────────────────────────────────
  fetchLocation: async (force = false) => {
    const { currentLocation } = get();
    if (!force && currentLocation.lat && currentLocation.lng) return;

    set(state => ({ currentLocation: { ...state.currentLocation, loading: true, error: null } }));

    const onCoords = async (lat, lng) => {
      let displayName = "Detected Location";
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { "User-Agent": "DesiDukaan/1.0" } }
        );
        const d = await res.json();
        if (d?.display_name) {
          const parts = d.display_name.split(",");
          displayName = [parts[0]?.trim(), parts[1]?.trim()].filter(Boolean).join(", ");
        }
      } catch (e) {
        console.error("Reverse geocode failed:", e);
      }
      set({ currentLocation: { lat, lng, displayName, loading: false, error: null } });
    };

    const fallback = () => {
      set({ currentLocation: { lat: 28.5921, lng: 77.3196, displayName: "Noida, UP", loading: false, error: "Permission denied" } });
    };

    if (Platform.OS === "web") {
      if (!navigator?.geolocation) { fallback(); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => onCoords(p.coords.latitude, p.coords.longitude),
        () => fallback(),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      try {
        const Location = require("expo-location");
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { fallback(); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        onCoords(loc.coords.latitude, loc.coords.longitude);
      } catch (e) {
        console.error("Native location fail:", e);
        fallback();
      }
    }
  },
}));

export default useAddressStore;