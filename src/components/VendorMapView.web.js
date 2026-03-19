import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";

const VendorMapView = ({ storeLocation, riders }) => {
  return (
    <View style={styles.container}>
      {/* Background Static Grid Representation */}
      <View style={styles.gridContainer}>
        {[...Array(20)].map((_, i) => (
          <View key={i} style={styles.gridLine} />
        ))}
      </View>

      <View style={styles.centerMarker}>
        <View style={styles.storeMarker}>
          <View style={styles.storeMarkerOuter}>
            <View style={styles.storeMarkerInner} />
          </View>
          <View style={styles.storeLabel}>
            <Text style={styles.storeLabelText}>Your Store</Text>
          </View>
        </View>
      </View>

      {/* Mock Rider Indicators for Web */}
      <View style={styles.mockRider1}>
        <View style={styles.riderMarker}>
          <View style={styles.riderMarkerDot} />
          <View style={styles.riderMarkerIcon}>
            <FontAwesome5 name="truck" size={12} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.mockRider2}>
        <View style={styles.riderMarker}>
          <View style={styles.riderMarkerDot} />
          <View style={styles.riderMarkerIcon}>
            <FontAwesome5 name="truck" size={12} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.placeholderOverlay}>
        <MaterialIcons name="map" size={48} color="#94A3B8" />
        <Text style={styles.placeholderText}>Interactive map is mobile-only</Text>
        <Text style={styles.subText}>Current view is a preview of rider proximities</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  gridLine: {
    height: 1,
    width: "100%",
    backgroundColor: "#000",
    marginBottom: 20,
  },
  centerMarker: {
    position: "absolute",
    zIndex: 2,
  },
  placeholderOverlay: {
    position: "absolute",
    bottom: 80,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    zIndex: 3,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginTop: 8,
  },
  subText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  storeMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  storeMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  storeMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0F172A",
  },
  storeLabel: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  storeLabelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  riderMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  riderMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
    marginBottom: -4,
    zIndex: 1,
  },
  riderMarkerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  mockRider1: {
    position: "absolute",
    top: "30%",
    left: "20%",
  },
  mockRider2: {
    position: "absolute",
    top: "60%",
    right: "25%",
  },
});

export default VendorMapView;
