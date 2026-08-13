import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { FontAwesome5 } from "@expo/vector-icons";

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
      <Animated.View style={[bikeStyles.pulseRing, { transform: [{ scale: pulse }], opacity }]} />
      <View style={bikeStyles.mainCircle}>
        <Text style={bikeStyles.bikeEmoji}>🛵</Text>
      </View>
      <View style={bikeStyles.shadowDot} />
    </View>
  );
}

const bikeStyles = StyleSheet.create({
  wrapper: { alignItems: "center", justifyContent: "center", width: 56, height: 56 },
  pulseRing: { position: "absolute", width: 56, height: 56, borderRadius: 28, backgroundColor: "#22C55E" },
  mainCircle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#22C55E",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#FFFFFF",
    shadowColor: "#22C55E", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 8, zIndex: 2,
  },
  bikeEmoji: { fontSize: 22 },
  shadowDot: {
    position: "absolute", bottom: 2, width: 18, height: 6,
    borderRadius: 3, backgroundColor: "rgba(0,0,0,0.12)", zIndex: 0,
  },
});

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
        <Marker key={rider.id} coordinate={rider.coordinate} tracksViewChanges={false}>
          <BikeMarker />
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
  destMarker: { alignItems: 'center' },
  destMarkerIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#E24B4A', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  destLabel: { backgroundColor: '#E24B4A', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginTop: 3 },
  destLabelText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});

export default VendorMapView;
