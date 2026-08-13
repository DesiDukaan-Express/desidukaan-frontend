/**
 * CustomerMapView — Web (Leaflet)
 * ────────────────────────────────
 * Compact, embeddable Leaflet map for showing the driver's live location
 * inside the customer OrderDetailModal (web platform).
 *
 * Key design: driver marker is updated *imperatively* (setLatLng) rather than
 * remounting the component, so the map stays stable while the pin glides to
 * the new position smoothly.
 *
 * Platform split: Metro / Expo bundler picks this file on web,
 * CustomerMapView.js on iOS/Android.
 */

import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";

const DEFAULT_CENTER = [28.6139, 77.209]; // New Delhi fallback

// Custom SVG icons — bold scooter silhouette for clear visibility at map scale
// Animated bike marker — Zomato-style with pulsing green ring
const DRIVER_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <style>
    @keyframes pulse-ring {
      0% { r: 32; opacity: 0.5; }
      50% { r: 36; opacity: 0.12; }
      100% { r: 32; opacity: 0.5; }
    }
    .pulse-ring { animation: pulse-ring 1.4s ease-in-out infinite; }
  </style>
  <!-- Pulsing ring -->
  <circle cx="36" cy="36" r="32" fill="#16A34A" class="pulse-ring"/>
  <!-- Shadow -->
  <ellipse cx="36" cy="64" rx="14" ry="4" fill="rgba(0,0,0,0.15)"/>
  <!-- Main green circle background -->
  <circle cx="36" cy="36" r="27" fill="#16A34A" stroke="#fff" stroke-width="3.5"/>
  <!-- Scooter silhouette — bold white on green -->
  <g transform="translate(36,34)" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
    <!-- Rear wheel -->
    <circle cx="-11" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/>
    <circle cx="-11" cy="10" r="2" fill="#fff"/>
    <!-- Front wheel -->
    <circle cx="12" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/>
    <circle cx="12" cy="10" r="2" fill="#fff"/>
    <!-- Wheel spokes — rear -->
    <line x1="-11" y1="3" x2="-11" y2="17" stroke="#fff" stroke-width="1"/>
    <line x1="-18" y1="10" x2="-4" y2="10" stroke="#fff" stroke-width="1"/>
    <!-- Wheel spokes — front -->
    <line x1="12" y1="3" x2="12" y2="17" stroke="#fff" stroke-width="1"/>
    <line x1="5" y1="10" x2="19" y2="10" stroke="#fff" stroke-width="1"/>
    <!-- Body / chassis -->
    <path d="M-11 10 L-6 -2 L2 -4 L6 -2 L12 10" fill="none" stroke="#fff" stroke-width="3.5"/>
    <!-- Floor board -->
    <line x1="-11" y1="10" x2="6" y2="10" stroke="#fff" stroke-width="3.5"/>
    <!-- Seat -->
    <rect x="-8" y="-8" width="12" height="5" rx="2.5" fill="#fff"/>
    <!-- Handlebar stem -->
    <line x1="10" y1="-2" x2="14" y2="-10" stroke="#fff" stroke-width="3"/>
    <!-- Handlebar grip -->
    <line x1="11" y1="-10" x2="17" y2="-10" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
    <!-- Headlight -->
    <circle cx="17" cy="-7" r="2.5" fill="#FBBF24" stroke="#FBBF24" stroke-width="1"/>
    <!-- Tail light -->
    <circle cx="-11" cy="4" r="1.5" fill="#F87171"/>
  </g>
</svg>`;

const DEST_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
  <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#DC2626"/>
  <circle cx="16" cy="16" r="6" fill="#fff"/>
  <circle cx="16" cy="16" r="3" fill="#DC2626"/>
</svg>`;

// encodeURIComponent handles full Unicode range (unlike btoa which is Latin1-only)
function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function CustomerMapView({ partnerPos, destLat, destLng }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);   // Leaflet map instance
  const driverMarker  = useRef(null);   // Leaflet Marker for driver
  const destMarker    = useRef(null);   // Leaflet Marker for destination
  const routeLine     = useRef(null);   // Leaflet Polyline for route
  const [ready, setReady] = useState(false);

  // ── 1. Bootstrap Leaflet (CSS + JS) once ────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeaflet = () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id  = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!window.L) {
        const script = document.createElement("script");
        script.src   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => setReady(true);
        document.head.appendChild(script);
      } else {
        setReady(true);
      }
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        driverMarker.current = null;
        destMarker.current = null;
        routeLine.current = null;
      }
    };
  }, []);

  // ── 2. Initialize map once Leaflet is ready ──────────────────────────────
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    const L = window.L;

    const center = partnerPos
      ? [partnerPos.lat, partnerPos.lng]
      : destLat && destLng
        ? [destLat, destLng]
        : DEFAULT_CENTER;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView(center, 15);

    // Carto Voyager basemap — colorful, no API key needed
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 20 }
    ).addTo(map);

    // ── Driver marker ──
    if (partnerPos) {
      const driverIcon = L.icon({
        iconUrl: svgToDataUrl(DRIVER_ICON_SVG),
        iconSize: [64, 64],
        iconAnchor: [32, 58],
        popupAnchor: [0, -58],
      });
      driverMarker.current = L.marker([partnerPos.lat, partnerPos.lng], {
        icon: driverIcon,
        title: "Partner",
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindTooltip("Partner", { permanent: false, direction: "top" });
    }

    // ── Destination marker ──
    if (destLat && destLng) {
      const destIcon = L.icon({
        iconUrl: svgToDataUrl(DEST_ICON_SVG),
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
      });
      destMarker.current = L.marker([destLat, destLng], {
        icon: destIcon,
        title: "Your Location",
      })
        .addTo(map)
        .bindTooltip("Your Location", { permanent: false, direction: "top" });
    }

    // ── Route polyline between driver and destination ──
    if (partnerPos && destLat && destLng) {
      routeLine.current = L.polyline(
        [
          [partnerPos.lat, partnerPos.lng],
          [destLat, destLng],
        ],
        {
          color: "#16A34A",
          weight: 4,
          dashArray: "10 8",
          opacity: 0.75,
          lineCap: "round",
          lineJoin: "round",
        },
      ).addTo(map);
    }

    // ── Auto fit-bounds to show both markers with padding ──
    if (partnerPos && destLat && destLng) {
      const bounds = L.latLngBounds(
        [partnerPos.lat, partnerPos.lng],
        [destLat, destLng]
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.8 });
    }

    mapRef.current = map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── 3. Update driver marker imperatively (smooth, no re-render) ──────────
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;

    if (!partnerPos) return;

    const newLatLng = L.latLng(partnerPos.lat, partnerPos.lng);

    if (driverMarker.current) {
      // Smoothly glide the existing marker to the new position
      driverMarker.current.setLatLng(newLatLng);
    } else {
      // Create marker for the first time (hook fired before map init completed)
      const driverIcon = L.icon({
        iconUrl: svgToDataUrl(DRIVER_ICON_SVG),
        iconSize: [64, 64],
        iconAnchor: [32, 58],
        popupAnchor: [0, -58],
      });
      driverMarker.current = L.marker(newLatLng, {
        icon: driverIcon,
        title: "Partner",
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindTooltip("Partner", { permanent: false, direction: "top" });
    }

    // Update route polyline to keep it anchored to the moving driver
    if (routeLine.current && destLat && destLng) {
      routeLine.current.setLatLngs([
        newLatLng,
        L.latLng(destLat, destLng),
      ]);
    } else if (!routeLine.current && destLat && destLng) {
      // Create polyline if it doesn't exist yet (driver pos arrived after init)
      routeLine.current = L.polyline(
        [
          newLatLng,
          L.latLng(destLat, destLng),
        ],
        { color: "#16A34A", weight: 4, dashArray: "10 8", opacity: 0.75, lineCap: "round", lineJoin: "round" },
      ).addTo(map);
    }

    // Fit bounds to show both driver and destination
    if (destLat && destLng) {
      const bounds = L.latLngBounds(newLatLng, L.latLng(destLat, destLng));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true, duration: 0.6 });
    } else {
      // Pan map to keep driver centered (with slight animation)
      map.panTo(newLatLng, { animate: true, duration: 0.5 });
    }
  }, [partnerPos, ready]);

  return (
    <View style={styles.outer}>
      {!ready && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color="#16A34A" />
          <Text style={styles.loaderText}>Loading map…</Text>
        </View>
      )}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          borderRadius: 18,
          overflow: "hidden",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
      {/* Top gradient overlay for depth */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 32,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.10), transparent)",
          borderRadius: "18px 18px 0 0",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
      {/* Bottom gradient overlay for depth */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 32,
          background: "linear-gradient(to top, rgba(0,0,0,0.10), transparent)",
          borderRadius: "0 0 18px 18px",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    height: 280,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 10,
  },
  loaderText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
});
