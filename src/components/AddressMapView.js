import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function AddressMapView({ region, latitude, longitude, onRegionChangeComplete }) {
  return (
    <MapView
      style={styles.map}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {latitude && longitude && (
        <Marker
          coordinate={{ latitude, longitude }}
          title="Your Address"
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
