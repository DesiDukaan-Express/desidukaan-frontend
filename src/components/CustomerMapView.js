/**
 * CustomerMapView — React Native (native platforms)
 * ──────────────────────────────────────────────────
 * Compact, embeddable map for showing the driver's live location inside
 * the customer OrderDetailModal.
 *
 * Platform split: React Native resolver picks this file on iOS/Android,
 * and CustomerMapView.web.js on web.
 */

import React from "react";
import { View, StyleSheet, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";

const DEFAULT_DELTA = { latitudeDelta: 0.03, longitudeDelta: 0.03 };
const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.2090 };

export default function CustomerMapView({ partnerPos, destLat, destLng }) {
  const center = partnerPos
    ? { latitude: partnerPos.lat, longitude: partnerPos.lng }
    : destLat && destLng
      ? { latitude: destLat, longitude: destLng }
      : DEFAULT_CENTER;

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        region={{ ...center, ...DEFAULT_DELTA }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
      >
        {/* Driver marker */}
        {partnerPos && (
          <Marker
            coordinate={{ latitude: partnerPos.lat, longitude: partnerPos.lng }}
            title="Delivery Partner"
          >
            <View style={styles.driverPin}>
              <Text style={styles.driverPinText}>🚚</Text>
            </View>
          </Marker>
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
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  driverPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  driverPinText: { fontSize: 18 },
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
});
