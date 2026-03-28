import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";

const VendorMapView = ({ storeLocation, riders }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. Inject Leaflet CSS & JS from CDN
    if (typeof window === "undefined") return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

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

    // Initialize map if not exists
    if (!leafletMap.current) {
      const center = storeLocation 
        ? [storeLocation.latitude, storeLocation.longitude] 
        : [28.6139, 77.2090];
        
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);
    }

    // Update Store Marker
    if (storeLocation) {
      if (!markersRef.current.store) {
        const storeIcon = L.divIcon({
          className: 'custom-store-icon',
          html: `<div style="width: 24px; height: 24px; border-radius: 12px; background: white; border: 4px solid #0F172A; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><div style="width: 10px; height: 10px; border-radius: 5px; background: #0F172A;"></div></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        markersRef.current.store = L.marker([storeLocation.latitude, storeLocation.longitude], { icon: storeIcon })
          .addTo(leafletMap.current)
          .bindPopup("Your Store");
      } else {
        markersRef.current.store.setLatLng([storeLocation.latitude, storeLocation.longitude]);
      }
    }

    // Update Rider Markers
    const currentRiderIds = new Set();
    if (riders) {
      riders.forEach(rider => {
        currentRiderIds.add(rider.id);
        const riderIcon = L.divIcon({
          className: 'custom-rider-icon',
          html: `<div style="width: 32px; height: 32px; border-radius: 8px; background: #22C55E; display: flex; align-items: center; justify-content: center; border: 2px solid white; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 16px;">🛵</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        if (!markersRef.current[rider.id]) {
          markersRef.current[rider.id] = L.marker([rider.coordinate.latitude, rider.coordinate.longitude], { icon: riderIcon })
            .addTo(leafletMap.current)
            .bindPopup(`<b>${rider.name || "Delivery Partner"}</b><br/>${rider.status || ""}`);
        } else {
          markersRef.current[rider.id].setLatLng([rider.coordinate.latitude, rider.coordinate.longitude]);
        }
      });
    }

    // Cleanup old markers
    Object.keys(markersRef.current).forEach(id => {
      if (id !== 'store' && !currentRiderIds.has(parseInt(id)) && !currentRiderIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

  }, [isLoaded, storeLocation, riders]);

  return (
    <View style={styles.container}>
      {!isLoaded && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#0F172A" />
          <Text style={styles.loadingText}>Initializing Map...</Text>
        </View>
      )}
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '100%', position: 'absolute' }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1F5F9",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.8)'
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B'
  }
});

export default VendorMapView;
