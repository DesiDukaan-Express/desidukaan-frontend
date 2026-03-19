import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { FontAwesome5 } from "@expo/vector-icons";

const VendorMapView = ({ storeLocation, riders, silverMapStyle }) => {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: storeLocation.latitude,
        longitude: storeLocation.longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0121,
      }}
      customMapStyle={silverMapStyle}
    >
      <Marker coordinate={storeLocation}>
        <View style={styles.storeMarker}>
          <View style={styles.storeMarkerOuter}>
            <View style={styles.storeMarkerInner} />
          </View>
          <View style={styles.storeLabel}>
            <Text style={styles.storeLabelText}>Your Store</Text>
          </View>
        </View>
      </Marker>

      {riders.map((rider) => (
        <Marker key={rider.id} coordinate={rider.coordinate}>
          <View style={styles.riderMarker}>
            <View style={styles.riderMarkerDot} />
            <View style={styles.riderMarkerIcon}>
              <FontAwesome5 name="truck" size={12} color="#fff" />
            </View>
          </View>
        </Marker>
      ))}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
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
});

export default VendorMapView;
