import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";

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
        <Marker key={i} coordinate={m.coordinate} title={m.title} />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
