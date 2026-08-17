import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

// Web map — Leaflet + OpenStreetMap tiles. The marker is draggable; dragging it
// reports new coords via onMarkerDragEnd so the parent can reverse-geocode and
// keep City / Pincode / Street Address in sync with the pin.
export default function AddressMapView({
  region,
  latitude,
  longitude,
  onMarkerDragEnd,
  onRegionChangeComplete,
}) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const lat = latitude != null ? parseFloat(latitude) : region?.latitude;
  const lng = longitude != null ? parseFloat(longitude) : region?.longitude;

  // Fall back to a default India centre so the map never renders blank.
  const centerLat = lat != null ? lat : 28.6139;
  const centerLng = lng != null ? lng : 77.2090;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Inject Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    if (!window.L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsLoaded(true);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Create the map once, then fly to the shared lat/lng whenever it changes.
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.L) return;

    const L = window.L;
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: true,
      }).setView([centerLat, centerLng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap.current);

      leafletMap.current.on("moveend", () => {
        if (onRegionChangeComplete && leafletMap.current) {
          const c = leafletMap.current.getCenter();
          onRegionChangeComplete({
            latitude: c.lat,
            longitude: c.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      });
    } else {
      leafletMap.current.flyTo([centerLat, centerLng], 15, { duration: 0.8 });
    }
  }, [isLoaded, centerLat, centerLng]);

  // Place / update the draggable marker from the shared lat/lng state.
  useEffect(() => {
    if (!isLoaded || !leafletMap.current || !window.L) return;
    if (lat == null || lng == null) return;

    const L = window.L;
    if (markerRef.current) {
      markerRef.current.remove();
    }

    markerRef.current = L.marker([lat, lng], { draggable: true })
      .addTo(leafletMap.current)
      .bindPopup("Your Address")
      .openPopup();

    markerRef.current.on("dragend", () => {
      if (!markerRef.current || !onMarkerDragEnd) return;
      const p = markerRef.current.getLatLng();
      onMarkerDragEnd(p.lat, p.lng);
    });
  }, [isLoaded, lat, lng]);

  return (
    <View style={styles.container}>
      {!isLoaded && <ActivityIndicator size="small" style={styles.loader} />}
      <div
        ref={mapRef}
        style={{ width: "100%", height: "100%", position: "absolute" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
