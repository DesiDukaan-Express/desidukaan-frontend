import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Text } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

const DEFAULT_DELTA = { latitudeDelta: 0.03, longitudeDelta: 0.03 };
const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.2090 };

function BikeMarker() {
  return (
    <View style={bikeStyles.wrapper}>
      <View style={bikeStyles.mainCircle}>
        <Text style={bikeStyles.bikeEmoji}>🛵</Text>
      </View>
      <View style={bikeStyles.shadowDot} />
    </View>
  );
}

const bikeStyles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
  },
  mainCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  bikeEmoji: {
    fontSize: 24,
  },
  shadowDot: {
    position: "absolute",
    bottom: 2,
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
});

function DestinationMarker({ title }) {
  return (
    <View style={destStyles.wrapper}>
      <View style={destStyles.pin}>
        <Text style={destStyles.emoji}>📍</Text>
      </View>
    </View>
  );
}

const destStyles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 44,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#DC2626",
  },
  emoji: {
    fontSize: 16,
  },
});

export default function DeliveryMapView({ currentRegion, markers, destLat, destLng, destTitle }) {
  const mapRef = useRef(null);

  const hasDest = destLat != null && destLng != null;
  const hasPartner = currentRegion && currentRegion.latitude != null;

  // Fit bounds when both markers are present
  useEffect(() => {
    if (!mapRef.current || !hasPartner || !hasDest) return;
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: currentRegion.latitude, longitude: currentRegion.longitude },
          { latitude: destLat, longitude: destLng },
        ],
        { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true }
      );
    }, 300);
    return () => clearTimeout(timeout);
  }, [currentRegion?.latitude, currentRegion?.longitude, destLat, destLng]);

  const center = hasPartner
    ? { ...currentRegion, ...DEFAULT_DELTA }
    : hasDest
      ? { latitude: destLat, longitude: destLng, ...DEFAULT_DELTA }
      : { ...DEFAULT_CENTER, ...DEFAULT_DELTA };

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={center}
      showsUserLocation={true}
    >
      {/* Route polyline between partner and destination */}
      {hasPartner && hasDest && (
        <Polyline
          coordinates={[
            { latitude: currentRegion.latitude, longitude: currentRegion.longitude },
            { latitude: destLat, longitude: destLng },
          ]}
          strokeColor="#16A34A"
          strokeWidth={4}
          lineDashPattern={[10, 8]}
        />
      )}

      {/* Destination marker */}
      {hasDest && (
        <Marker
          coordinate={{ latitude: destLat, longitude: destLng }}
          title={destTitle || "Destination"}
        >
          <DestinationMarker title={destTitle} />
        </Marker>
      )}

      {/* Partner bike markers (from markers prop) */}
      {markers && markers.map((m, i) => (
        <Marker key={i} coordinate={m.coordinate} title={m.title}>
          <BikeMarker />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
