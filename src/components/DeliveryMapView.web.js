import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

// Bold scooter silhouette — same as Customer/VendorMapView
const BIKE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <style>
    @keyframes pulse-ring {
      0% { r: 32; opacity: 0.5; }
      50% { r: 36; opacity: 0.12; }
      100% { r: 32; opacity: 0.5; }
    }
    .pulse-ring { animation: pulse-ring 1.4s ease-in-out infinite; }
  </style>
  <circle cx="36" cy="36" r="32" fill="#16A34A" class="pulse-ring"/>
  <ellipse cx="36" cy="64" rx="14" ry="4" fill="rgba(0,0,0,0.15)"/>
  <circle cx="36" cy="36" r="27" fill="#16A34A" stroke="#fff" stroke-width="3.5"/>
  <g transform="translate(36,34)" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-11" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/>
    <circle cx="-11" cy="10" r="2" fill="#fff"/>
    <circle cx="12" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/>
    <circle cx="12" cy="10" r="2" fill="#fff"/>
    <line x1="-11" y1="3" x2="-11" y2="17" stroke="#fff" stroke-width="1"/>
    <line x1="-18" y1="10" x2="-4" y2="10" stroke="#fff" stroke-width="1"/>
    <line x1="12" y1="3" x2="12" y2="17" stroke="#fff" stroke-width="1"/>
    <line x1="5" y1="10" x2="19" y2="10" stroke="#fff" stroke-width="1"/>
    <path d="M-11 10 L-6 -2 L2 -4 L6 -2 L12 10" fill="none" stroke="#fff" stroke-width="3.5"/>
    <line x1="-11" y1="10" x2="6" y2="10" stroke="#fff" stroke-width="3.5"/>
    <rect x="-8" y="-8" width="12" height="5" rx="2.5" fill="#fff"/>
    <line x1="10" y1="-2" x2="14" y2="-10" stroke="#fff" stroke-width="3"/>
    <line x1="11" y1="-10" x2="17" y2="-10" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="17" cy="-7" r="2.5" fill="#FBBF24" stroke="#FBBF24" stroke-width="1"/>
    <circle cx="-11" cy="4" r="1.5" fill="#F87171"/>
  </g>
</svg>`;

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function DeliveryMapView({ currentRegion, markers }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
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

    const center = currentRegion 
      ? [currentRegion.latitude, currentRegion.longitude] 
      : [28.6139, 77.2090];

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);
    } else {
      leafletMap.current.setView(center);
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers — use bike icon for delivery partner
    if (markers) {
      markers.forEach(m => {
        const markerIcon = L.icon({
          iconUrl: svgToDataUrl(BIKE_SVG),
          iconSize: [64, 64],
          iconAnchor: [32, 58],
          popupAnchor: [0, -58],
        });
        const marker = L.marker([m.coordinate.latitude, m.coordinate.longitude], { icon: markerIcon })
          .addTo(leafletMap.current)
          .bindPopup(m.title);
        markersRef.current.push(marker);
      });
    }

  }, [isLoaded, currentRegion, markers]);

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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1F5F9",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10
  }
});
