import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

export default function AddressMapView({ region, latitude, longitude }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.L) return;

    const L = window.L;
    const center = [region.latitude, region.longitude];

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(center, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);
    } else {
      leafletMap.current.setView(center, 14);
    }

    // Update marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude])
        .addTo(leafletMap.current)
        .bindPopup("Your Address")
        .openPopup();
    }

  }, [isLoaded, region, latitude, longitude]);

  return (
    <View style={styles.container}>
      {!isLoaded && <ActivityIndicator size="small" style={styles.loader} />}
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '100%', position: 'absolute' }} 
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
    zIndex: 10
  }
});
