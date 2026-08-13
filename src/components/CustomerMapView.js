/**
 * CustomerMapView — React Native (native platforms)
 * ──────────────────────────────────────────────────
 * Compact, embeddable map for showing the driver's live location inside
 * the customer OrderDetailModal.
 *
 * Platform split: React Native resolver picks this file on iOS/Android,
 * and CustomerMapView.web.js on web.
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Text, Animated, Easing } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

const DEFAULT_DELTA = { latitudeDelta: 0.03, longitudeDelta: 0.03 };
const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.2090 };

function BikeMarker() {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.35, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.15, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={bikeStyles.wrapper}>
      {/* Pulsing ring */}
      <Animated.View
        style={[
          bikeStyles.pulseRing,
          { transform: [{ scale: pulse }], opacity },
        ]}
      />
      {/* Main circle */}
      <View style={bikeStyles.mainCircle}>
        <Text style={bikeStyles.bikeEmoji}>🛵</Text>
      </View>
      {/* Shadow below */}
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
  pulseRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#16A34A",
  },
  mainCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    zIndex: 2,
  },
  bikeEmoji: {
    fontSize: 22,
  },
  shadowDot: {
    position: "absolute",
    bottom: 2,
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.12)",
    zIndex: 0,
  },
});

export default function CustomerMapView({ partnerPos, destLat, destLng }) {
  const mapRef = useRef(null);

  const center = partnerPos
    ? { latitude: partnerPos.lat, longitude: partnerPos.lng }
    : destLat && destLng
      ? { latitude: destLat, longitude: destLng }
      : DEFAULT_CENTER;

  // Fit bounds when both markers are present
  useEffect(() => {
    if (!mapRef.current || !partnerPos || !destLat || !destLng) return;
    const timeout = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: partnerPos.lat, longitude: partnerPos.lng },
          { latitude: destLat, longitude: destLng },
        ],
        { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true }
      );
    }, 300);
    return () => clearTimeout(timeout);
  }, [partnerPos?.lat, partnerPos?.lng, destLat, destLng]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        region={{ ...center, ...DEFAULT_DELTA }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
      >
        {/* Route polyline between driver and destination */}
        {partnerPos && destLat && destLng && (
          <Polyline
            coordinates={[
              { latitude: partnerPos.lat, longitude: partnerPos.lng },
              { latitude: destLat, longitude: destLng },
            ]}
            strokeColor="#16A34A"
            strokeWidth={4}
            lineDashPattern={[10, 8]}
          />
        )}

        {/* Destination marker */}
        {destLat && destLng && (
          <Marker
            coordinate={{ latitude: destLat, longitude: destLng }}
            title="Your Location"
          >
            <View style={styles.destPin}>
              <Text style={styles.destPinText}>📍</Text>
            </View>
          </Marker>
        )}

        {/* Driver marker — animated bike */}
        {partnerPos && (
          <Marker
            coordinate={{ latitude: partnerPos.lat, longitude: partnerPos.lng }}
            title="Partner"
            tracksViewChanges={false}
          >
            <BikeMarker />
          </Marker>
        )}
      </MapView>

      {/* Top gradient overlay */}
      <View style={styles.gradientTop} pointerEvents="none" />
      {/* Bottom gradient overlay */}
      <View style={styles.gradientBottom} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  destPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  destPinText: { fontSize: 16 },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
    opacity: 0.5,
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
    opacity: 0.5,
  },
});
