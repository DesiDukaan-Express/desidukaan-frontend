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

// Custom SVG icons — pure ASCII, no emoji (btoa doesn't handle multi-byte Unicode)
const DRIVER_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <circle cx="22" cy="22" r="20" fill="#16A34A" stroke="#fff" stroke-width="3"/>
  <rect x="10" y="18" width="14" height="10" rx="2" fill="white"/>
  <polygon points="24,18 36,18 36,28 24,28" fill="white" fill-opacity="0.9"/>
  <circle cx="14" cy="30" r="2.5" fill="#15803D"/>
  <circle cx="30" cy="30" r="2.5" fill="#15803D"/>
  <rect x="10" y="15" width="8" height="5" rx="1" fill="white" fill-opacity="0.7"/>
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

    // Carto Light basemap — no API key needed
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 20 }
    ).addTo(map);

    // ── Driver marker ──
    if (partnerPos) {
      const driverIcon = L.icon({
        iconUrl: svgToDataUrl(DRIVER_ICON_SVG),
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
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
          color: "#3B82F6",
          weight: 3,
          dashArray: "6 8",
          opacity: 0.8,
        },
      ).addTo(map);
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
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
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
        { color: "#3B82F6", weight: 3, dashArray: "6 8", opacity: 0.8 },
      ).addTo(map);
    }

    // Pan map to keep driver centered (with slight animation)
    map.panTo(newLatLng, { animate: true, duration: 0.5 });
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
          borderRadius: 14,
          overflow: "hidden",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
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
