import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_UA = "KwikPik/1.0 (desidukaan-express; address-picker)";
const DEFAULT_CENTER = { latitude: 28.5921, longitude: 77.3196, latitudeDelta: 0.005, longitudeDelta: 0.005 };

export default function LocationMapPicker({
  initialCoords,
  addressText,
  onPick,
  onSuggestions,
  focusPoint,
  autoReverseOnReady = true,
}) {
  const mapRef = useRef(null);
  const searchTimer = useRef(null);

  const [center, setCenter] = useState(() => {
    const lat = Number(initialCoords?.lat ?? initialCoords?.latitude);
    const lng = Number(initialCoords?.lng ?? initialCoords?.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
    }
    return DEFAULT_CENTER;
  });

  const [markerPos, setMarkerPos] = useState({ latitude: center.latitude, longitude: center.longitude });
  const [resolving, setResolving] = useState(false);
  const [streetSnippet, setStreetSnippet] = useState("");

  const reverseGeocode = async (lat, lng) => {
    setResolving(true);
    try {
      const url = `${NOMINATIM_REVERSE}?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
      const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();

      const addr = data.address || {};
      const full = data.display_name || "";
      const primary =
        addr.building ||
        addr.house_number ||
        addr.road ||
        addr.pedestrian ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.village ||
        addr.town ||
        addr.city ||
        "Selected Location";

      const snippet = [primary, addr.suburb || addr.city_district, addr.city || addr.town || addr.state]
        .filter(Boolean)
        .slice(0, 2)
        .join(", ");

      setStreetSnippet(snippet || full);
      onPick?.(lat, lng, full, data);
    } catch (err) {
      setStreetSnippet(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      onPick?.(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`, null);
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    if (!autoReverseOnReady) return;
    const lat = center.latitude;
    const lng = center.longitude;
    if (lat && lng && lat !== DEFAULT_CENTER.latitude) {
      reverseGeocode(lat, lng);
    }
  }, []);

  useEffect(() => {
    if (!focusPoint) return;
    const lat = Number(focusPoint.lat ?? focusPoint.latitude);
    const lng = Number(focusPoint.lng ?? focusPoint.longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
    setCenter(newRegion);
    setMarkerPos({ latitude: lat, longitude: lng });
    mapRef.current?.animateToRegion(newRegion, 400);

    if (focusPoint.label) {
      setStreetSnippet(focusPoint.label);
      onPick?.(lat, lng, focusPoint.label, focusPoint.raw);
    } else {
      reverseGeocode(lat, lng);
    }
  }, [focusPoint]);

  useEffect(() => {
    if (!addressText || addressText.length < 3) {
      onSuggestions?.([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const url = `${NOMINATIM_SEARCH}?format=jsonv2&q=${encodeURIComponent(addressText)}&limit=5&addressdetails=1&countrycodes=in`;
        const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
        if (!res.ok) return;
        const data = await res.json();
        const items = data.map((item) => ({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          label: item.display_name,
          raw: item,
        }));
        onSuggestions?.(items);
      } catch (err) {
        onSuggestions?.([]);
      }
    }, 450);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [addressText]);

  const handleRegionChangeComplete = (region) => {
    setMarkerPos({ latitude: region.latitude, longitude: region.longitude });
    reverseGeocode(region.latitude, region.longitude);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={center}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        <Marker coordinate={markerPos} title="Delivery Location" />
      </MapView>

      <View style={styles.badge} pointerEvents="none">
        <MaterialIcons name="place" size={14} color="#16A34A" />
        {resolving ? (
          <ActivityIndicator size="small" color="#16A34A" style={{ marginLeft: 4 }} />
        ) : (
          <Text style={styles.badgeText} numberOfLines={1}>
            {streetSnippet || "Drag map to position pin"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
    position: "relative",
  },
  badge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 4,
    flex: 1,
  },
});
