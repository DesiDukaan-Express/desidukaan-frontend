import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function AddressMapView({
  region,
  latitude,
  longitude,
  onMarkerDragEnd,
  onRegionChangeComplete,
}) {
  const lat = latitude != null ? parseFloat(latitude) : region?.latitude;
  const lng = longitude != null ? parseFloat(longitude) : region?.longitude;
  const mapRegion = region || {
    latitude: lat != null ? lat : 28.6139,
    longitude: lng != null ? lng : 77.209,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <MapView
      style={styles.map}
      region={mapRegion}
      onRegionChangeComplete={onRegionChangeComplete}
    >
      {lat != null && lng != null && (
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          title="Your Address"
          draggable={!!onMarkerDragEnd}
          onDragEnd={(e) =>
            onMarkerDragEnd && onMarkerDragEnd(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)
          }
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
