import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { FontAwesome5 } from "@expo/vector-icons";

const VendorMapView = ({ storeLocation, riders, silverMapStyle, destinationLocation }) => {
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

      {destinationLocation?.latitude && (
        <Marker coordinate={destinationLocation}>
          <View style={styles.destMarker}>
            <View style={styles.destMarkerIcon}>
              <FontAwesome5 name="map-marker-alt" size={12} color="#fff" />
            </View>
            <View style={styles.destLabel}>
              <Text style={styles.destLabelText}>Deliver here</Text>
            </View>
          </View>
        </Marker>
      )}
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
  destMarker: { alignItems: 'center' },
  destMarkerIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E24B4A', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  destLabel: { backgroundColor: '#E24B4A', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginTop: 3 },
  destLabelText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

export default VendorMapView;
