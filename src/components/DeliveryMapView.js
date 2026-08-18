import React from "react";
import { View, StyleSheet, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";

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

export default function DeliveryMapView({ currentRegion, markers }) {
  return (
    <MapView
      style={styles.map}
      initialRegion={currentRegion || {
        latitude: 28.6139,
        longitude: 77.2090,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      showsUserLocation={true}
    >
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
