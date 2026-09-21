import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

export default function AddressMapView({
  region,
  latitude,
  longitude,
  onMarkerDragEnd,
  onRegionChangeComplete,
}) {
  const webViewRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const lat = latitude != null ? parseFloat(latitude) : region?.latitude;
  const lng = longitude != null ? parseFloat(longitude) : region?.longitude;
  const centerLat = lat != null ? lat : 28.6139;
  const centerLng = lng != null ? lng : 77.2090;

  const onMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "markerDragEnd" && onMarkerDragEnd) {
          onMarkerDragEnd(data.lat, data.lng);
        }
        if (data.type === "mapMoveEnd" && onRegionChangeComplete) {
          onRegionChangeComplete({
            latitude: data.lat,
            longitude: data.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch (_) {}
    },
    [onMarkerDragEnd, onRegionChangeComplete]
  );

  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    webViewRef.current.injectedJavaScript(
      `window.setCoords(${centerLat},${centerLng});true;`
    );
  }, [loaded, centerLat, centerLng]);

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:true}).setView([${centerLat},${centerLng}],15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var marker=L.marker([${centerLat},${centerLng}],{draggable:true}).addTo(map);
marker.on('dragend',function(){var p=marker.getLatLng();window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerDragEnd',lat:p.lat,lng:p.lng}));});
map.on('moveend',function(){var c=map.getCenter();window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapMoveEnd',lat:c.lat,lng:c.lng}));});
window.setCoords=function(lat,lng){map.setView([lat,lng],15);marker.setLatLng([lat,lng]);};
</script></body></html>`;

  return (
    <View style={styles.container}>
      {!loaded && (
        <ActivityIndicator
          size="small"
          style={StyleSheet.absoluteFillObject}
          zIndex={10}
        />
      )}
      <WebView
        ref={webViewRef}
        source={{ html, originWhiteList: "*" }}
        style={StyleSheet.absoluteFillObject}
        onLoadEnd={() => setLoaded(true)}
        javaScriptEnabled
        onMessage={onMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
});
