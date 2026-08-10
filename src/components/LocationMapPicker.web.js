/**
 * LocationMapPicker — Web (Leaflet + react-leaflet)
 * ────────────────────────────────────────────────
 * Two-way "pick your delivery location" map used inside the Add/Edit address
 * bottom sheet on the web build (Metro picks this file over
 * LocationMapPicker.js on web, matching the existing *.web.js pattern).
 *
 * Two-way sync between the map and the Full-address text field:
 *  • Reverse:  dragging the map -> `moveend` (debounced) -> Nominatim reverse
 *              geocode -> onPick(lat, lng, address) so the field updates.
 *  • Forward:  typing in the field -> debounced Nominatim search (limit=5)
 *              -> onSuggestions([...]) for the parent's autocomplete dropdown.
 *              The map ONLY moves when the parent selects a suggestion and
 *              passes it back through the `focusPoint` prop.
 *
 * A real Leaflet <Marker> is pinned to the resolved location (the map centre):
 * it rides the centre during drags via the `move` event and is confirmed on
 * `moveend` / forward resolution.
 *
 * No API key required: OpenStreetMap tiles + free Nominatim (descriptive
 * User-Agent header sent to respect the usage policy).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { MaterialIcons } from "@expo/vector-icons";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_UA = "KwikPik/1.0 (desidukaan-express; address-picker)";
// Same fallback the app uses elsewhere when no location is known yet
const DEFAULT_CENTER = { lat: 28.5921, lng: 77.3196 };

// Green pin marker — pure ASCII SVG (encodeURIComponent, like the other maps)
const PIN_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
  <path d="M18 0C8.1 0 0 8.1 0 18c0 12 18 28 18 28s18-16 18-28C36 8.1 27.9 0 18 0z" fill="#16A34A" stroke="#fff" stroke-width="2"/>
  <circle cx="18" cy="18" r="8" fill="#fff"/>
  <circle cx="18" cy="18" r="5" fill="#16A34A"/>
</svg>`;

const PIN_ICON = new Icon({
  iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PIN_ICON_SVG)}`,
  iconSize: [36, 46],
  iconAnchor: [18, 46],
  popupAnchor: [0, -40],
});

/**
 * Lives inside <MapContainer>: exposes the Leaflet map instance, keeps the
 * marker centred while dragging, and debounces reverse geocoding.
 */
function MapHarness({ mapApi, markerRef, onMoveEnd }) {
  const map = useMap();
  const timer = useRef(null);

  // Expose map + make sure tiles paint even if the sheet was animating in
  useEffect(() => {
    mapApi.current = map;
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => {
      clearTimeout(t);
      mapApi.current = null;
    };
  }, [map, mapApi]);

  // Marker rides the centre while the map moves; reverse geocode on moveend
  useEffect(() => {
    const handleMove = () => {
      if (markerRef.current) markerRef.current.setLatLng(map.getCenter());
    };
    const handleMoveEnd = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const c = map.getCenter();
        onMoveEnd(c.lat, c.lng);
      }, 400);
    };
    map.on("move", handleMove);
    map.on("moveend", handleMoveEnd);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      map.off("move", handleMove);
      map.off("moveend", handleMoveEnd);
    };
  }, [map, markerRef, onMoveEnd]);

  return null;
}

export default function LocationMapPicker({
  initialCoords,
  addressText,
  onPick,
  onSuggestions,
  focusPoint,
  autoReverseOnReady = true,
}) {
  const [ready, setReady] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [initialLocating, setInitialLocating] = useState(false); // seed geocode overlay
  const [notice, setNotice] = useState(null); // { type: 'err', msg } | { type: 'hint', msg }
  const hadInitial =
    initialCoords &&
    typeof initialCoords.lat === "number" &&
    typeof initialCoords.lng === "number";
  const initialRef = useRef(
    hadInitial
      ? { lat: initialCoords.lat, lng: initialCoords.lng, isReal: true }
      : { ...DEFAULT_CENTER, isReal: false },
  );
  const [markerPos, setMarkerPos] = useState({
    lat: initialRef.current.lat,
    lng: initialRef.current.lng,
  });

  const mapApi = useRef(null);
  const markerRef = useRef(null);
  const seqRef = useRef(0); // reverse geocode stale guard
  const forwardSeqRef = useRef(0); // forward search stale guard (race protection)
  const lastPushedTextRef = useRef(null); // last text we pushed via onPick (loop guard)
  const lastReverseRef = useRef(null); // last reverse-geocoded centre (skip zoom-only moves)
  const suppressReverseTextRef = useRef(false); // skip text overwrite after programmatic flyTo
  const forwardTimer = useRef(null);
  const prevTextRef = useRef(addressText || "");
  const seededRef = useRef(false);
  const lastFocusKeyRef = useRef(null);

  // Leaflet CSS is injected once (matches the other web map components).
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  // ── Fly to a chosen suggestion (selection -> map + marker) ───────────────
  // Runs before the watcher effect so the echoed text change is recognised
  // and does not re-open the dropdown.
  useEffect(() => {
    if (!focusPoint || focusPoint.lat == null || focusPoint.lng == null) return;
    if (lastFocusKeyRef.current === focusPoint.key) return;
    lastFocusKeyRef.current = focusPoint.key;
    const lat = focusPoint.lat;
    const lng = focusPoint.lng;
    setMarkerPos({ lat, lng });
    lastPushedTextRef.current = focusPoint.displayName || null;
    const map = mapApi.current;
    if (map) {
      suppressReverseTextRef.current = true; // don't overwrite the chosen label
      map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [focusPoint]);

  // ── Forward search (typed text -> suggestions for the parent's dropdown) ──
  const runSearch = useCallback(
    (query) => {
      const q = (query || "").trim();
      if (q.length < 3) {
        onSuggestions([]);
        return;
      }
      const seq = ++forwardSeqRef.current;
      fetch(
        `${NOMINATIM_SEARCH}?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
        { headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "en" } },
      )
        .then((r) => r.json())
        .then((results) => {
          if (seq !== forwardSeqRef.current) return; // discard stale response
          if (!Array.isArray(results)) {
            onSuggestions([]);
            return;
          }
          const list = results
            .filter((r) => r && r.lat && r.lon)
            .map((r) => ({
              display_name: r.display_name || r.name || "",
              lat: parseFloat(r.lat),
              lng: parseFloat(r.lon),
            }))
            .filter((s) => s.display_name);
          onSuggestions(list);
        })
        .catch(() => {
          if (seq !== forwardSeqRef.current) return;
          onSuggestions([]);
        });
    },
    [onSuggestions],
  );

  // Debounced forward search whenever the text changes (skips our own echo)
  useEffect(() => {
    const changed = prevTextRef.current !== addressText;
    prevTextRef.current = addressText;
    if (!changed) return;
    const text = (addressText || "").trim();
    if (text.length < 3) {
      onSuggestions([]);
      return;
    }
    if (text === lastPushedTextRef.current) {
      onSuggestions([]); // echo from reverse geocode / selection — no dropdown
      return;
    }
    if (forwardTimer.current) clearTimeout(forwardTimer.current);
    forwardTimer.current = setTimeout(() => runSearch(text), 700);
    return () => {
      if (forwardTimer.current) {
        clearTimeout(forwardTimer.current);
        forwardTimer.current = null;
      }
    };
  }, [addressText, runSearch, onSuggestions]);

  // ── Reverse geocode (map centre -> text + shared coords) ─────────────────
  const handleMoveEnd = useCallback(
    (lat, lng) => {
      setMarkerPos({ lat, lng });
      const suppressText = suppressReverseTextRef.current;
      suppressReverseTextRef.current = false;
      // Skip zoom-only moveends that don't change the centre
      if (
        lastReverseRef.current &&
        Math.abs(lastReverseRef.current.lat - lat) < 1e-6 &&
        Math.abs(lastReverseRef.current.lng - lng) < 1e-6
      ) {
        return;
      }
      lastReverseRef.current = { lat, lng };
      onPick(lat, lng, null); // coords immediately, address below
      const seq = ++seqRef.current;
      setNotice(null);
      fetch(
        `${NOMINATIM_REVERSE}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "en" } },
      )
        .then((r) => r.json())
        .then((d) => {
          if (seq !== seqRef.current) return; // stale — a newer pan superseded us
          if (suppressText) return; // keep the label the user chose
          if (d && d.display_name) {
            lastPushedTextRef.current = d.display_name;
            onPick(lat, lng, d.display_name);
          } else {
            setNotice({ type: "err", msg: "Couldn't auto-detect the address — please type it below." });
          }
        })
        .catch(() => {
          if (seq !== seqRef.current) return;
          setNotice({ type: "err", msg: "Couldn't auto-detect the address — please type it below." });
        });
    },
    [onPick],
  );

  // ── Silent forward locate used on mount when there are no saved coords ───
  // Positions the map on the pre-filled address text (edit mode) without
  // showing suggestions. No map movement happens from user typing anymore —
  // only the suggestion dropdown, which the parent renders.
  const seedLocate = useCallback((query) => {
    const q = (query || "").trim();
    if (q.length < 3) return;
    const seq = ++forwardSeqRef.current;
    setInitialLocating(true);
    fetch(
      `${NOMINATIM_SEARCH}?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "en" } },
    )
      .then((r) => r.json())
      .then((results) => {
        if (seq !== forwardSeqRef.current) return;
        setInitialLocating(false);
        const first = Array.isArray(results) && results.length > 0 ? results[0] : null;
        if (!first || !first.lat || !first.lon) {
          setNotice({ type: "err", msg: "Couldn't locate this address automatically — pick it on the map." });
          return;
        }
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        lastPushedTextRef.current = first.display_name || q;
        setMarkerPos({ lat, lng });
        const map = mapApi.current;
        if (map) {
          suppressReverseTextRef.current = true; // keep the pre-filled text
          map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
        }
      })
      .catch(() => {
        if (seq !== forwardSeqRef.current) return;
        setInitialLocating(false);
        setNotice({ type: "err", msg: "Couldn't locate this address automatically — pick it on the map." });
      });
  }, []);

  // ── Seed on mount ────────────────────────────────────────────────────────
  // Prefer saved coordinates (edit mode). If none and the field is prefilled,
  // silently locate the text so the map opens on the right place.
  useEffect(() => {
    if (!ready || seededRef.current) return;
    seededRef.current = true;
    const init = initialRef.current;
    if (init.isReal) {
      setMarkerPos({ lat: init.lat, lng: init.lng });
      if (autoReverseOnReady) handleMoveEnd(init.lat, init.lng);
    } else if (addressText && addressText.trim().length >= 3) {
      seedLocate(addressText.trim());
    }
  }, [ready, addressText, autoReverseOnReady, handleMoveEnd, seedLocate]);

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNotice({ type: "err", msg: "Geolocation isn't available in this browser." });
      return;
    }
    setLocLoading(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocLoading(false);
        const map = mapApi.current;
        if (map) {
          map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), { animate: true, duration: 0.8 });
        } else {
          onPick(latitude, longitude, null);
        }
      },
      () => {
        setLocLoading(false);
        setNotice({ type: "err", msg: "Location permission denied — drag the map or type your address instead." });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <View style={styles.wrap}>
      <MapContainer
        center={[initialRef.current.lat, initialRef.current.lng]}
        zoom={15}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={true}
        whenReady={() => setReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Marker ref={markerRef} position={[markerPos.lat, markerPos.lng]} icon={PIN_ICON} zIndexOffset={500} />
        <MapHarness mapApi={mapApi} markerRef={markerRef} onMoveEnd={handleMoveEnd} />
      </MapContainer>

      {(!ready || initialLocating) && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color="#16A34A" />
          <Text style={styles.loaderText}>
            {initialLocating ? "Finding address…" : "Loading map…"}
          </Text>
        </View>
      )}

      {/* Use current location */}
      <TouchableOpacity
        style={styles.locBtn}
        onPress={handleUseMyLocation}
        activeOpacity={0.85}
      >
        {locLoading ? (
          <ActivityIndicator size="small" color="#16A34A" />
        ) : (
          <MaterialIcons name="my-location" size={18} color="#16A34A" />
        )}
        <Text style={styles.locBtnText}>Use current location</Text>
      </TouchableOpacity>

      {/* Status pill: hint or error */}
      {notice ? (
        <View style={[styles.notice, notice.type === "err" ? styles.noticeErr : styles.noticeHint]}>
          <MaterialIcons
            name={notice.type === "err" ? "info-outline" : "open-with"}
            size={14}
            color={notice.type === "err" ? "#B45309" : "#15803D"}
          />
          <Text style={[styles.noticeText, notice.type === "err" && styles.noticeTextErr]}>
            {notice.msg}
          </Text>
        </View>
      ) : (
        <View style={styles.hintPill} pointerEvents="none">
          <MaterialIcons name="open-with" size={13} color="#15803D" />
          <Text style={styles.hintText}>Drag the map to set your location</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 260,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 20,
  },
  loaderText: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  locBtn: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 15,
  },
  locBtnText: { fontSize: 13, fontWeight: "700", color: "#15803D" },
  hintPill: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    zIndex: 15,
  },
  hintText: { fontSize: 11, fontWeight: "600", color: "#15803D" },
  notice: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 8,
    borderRadius: 10,
    zIndex: 15,
  },
  noticeHint: { backgroundColor: "rgba(255,255,255,0.92)" },
  noticeErr: { backgroundColor: "#FEF3C7" },
  noticeText: { flex: 1, fontSize: 11, color: "#15803D", lineHeight: 16, fontWeight: "600" },
  noticeTextErr: { color: "#92400E", fontWeight: "500" },
});
