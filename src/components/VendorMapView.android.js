import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

const BIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="32" fill="#22C55E" opacity="0.35"/><ellipse cx="36" cy="64" rx="14" ry="4" fill="rgba(0,0,0,0.15)"/><circle cx="36" cy="36" r="27" fill="#22C55E" stroke="#fff" stroke-width="3.5"/><g transform="translate(36,34)" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><circle cx="-11" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="-11" cy="10" r="2" fill="#fff"/><circle cx="12" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="12" cy="10" r="2" fill="#fff"/><line x1="-11" y1="3" x2="-11" y2="17" stroke="#fff" stroke-width="1"/><line x1="-18" y1="10" x2="-4" y2="10" stroke="#fff" stroke-width="1"/><line x1="12" y1="3" x2="12" y2="17" stroke="#fff" stroke-width="1"/><line x1="5" y1="10" x2="19" y2="10" stroke="#fff" stroke-width="1"/><path d="M-11 10 L-6 -2 L2 -4 L6 -2 L12 10" fill="none" stroke="#fff" stroke-width="3.5"/><line x1="-11" y1="10" x2="6" y2="10" stroke="#fff" stroke-width="3.5"/><rect x="-8" y="-8" width="12" height="5" rx="2.5" fill="#fff"/><line x1="10" y1="-2" x2="14" y2="-10" stroke="#fff" stroke-width="3"/><line x1="11" y1="-10" x2="17" y2="-10" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="17" cy="-7" r="2.5" fill="#FBBF24" stroke="#FBBF24" stroke-width="1"/><circle cx="-11" cy="4" r="1.5" fill="#F87171"/></g></svg>`;

const BIKE_DATA_URL = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(BIKE_SVG);

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

const VendorMapView = ({ storeLocation, riders, silverMapStyle, destinationLocation }) => {
  const webViewRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const ridersJson = JSON.stringify(riders || []);

  const onMessage = useCallback(() => {}, []);

  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    const sl = storeLocation || { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };
    webViewRef.current.injectJavaScript(
      `window.updateStore(${sl.latitude},${sl.longitude});true;`
    );
  }, [loaded, storeLocation?.latitude, storeLocation?.longitude]);

  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.updateRiders(${ridersJson});true;`
    );
  }, [loaded, ridersJson]);

  useEffect(() => {
    if (!loaded || !webViewRef.current || !destinationLocation) return;
    webViewRef.current.injectJavaScript(
      `window.updateDest(${destinationLocation.latitude},${destinationLocation.longitude});true;`
    );
  }, [loaded, destinationLocation?.latitude, destinationLocation?.longitude]);

  const sl = storeLocation || { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG };

  const html = useMemo(() => `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head><body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${sl.latitude},${sl.longitude}],14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(map);
var storeMarker=L.marker([${sl.latitude},${sl.longitude}]).addTo(map).bindPopup('Your Store');
var riderMarkers={};
var destMarker=null;
window.updateStore=function(lat,lng){storeMarker.setLatLng([lat,lng]);};
window.updateDest=function(lat,lng){if(!destMarker){destMarker=L.marker([lat,lng]).addTo(map).bindTooltip('Deliver here',{permanent:false,direction:'top'});}else{destMarker.setLatLng([lat,lng]);}};
window.updateRiders=function(arr){var ids={};arr.forEach(function(r){ids[r.id]=true;if(!riderMarkers[r.id]){var icon=L.icon({iconUrl:'${BIKE_DATA_URL}',iconSize:[64,64],iconAnchor:[32,58],popupAnchor:[0,-58]});riderMarkers[r.id]=L.marker([r.coordinate.latitude,r.coordinate.longitude],{icon:icon}).addTo(map).bindPopup(r.name||'Delivery Partner');}else{riderMarkers[r.id].setLatLng([r.coordinate.latitude,r.coordinate.longitude]);}});Object.keys(riderMarkers).forEach(function(id){if(!ids[id]){riderMarkers[id].remove();delete riderMarkers[id];}});};
</script></body></html>`, [sl.latitude, sl.longitude]);

  return (
    <View style={styles.container}>
      {!loaded && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#0F172A" />
          <Text style={styles.loadingText}>Initializing Map...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html, originWhiteList: "*" }}
        style={StyleSheet.absoluteFillObject}
        onLoadEnd={() => setLoaded(true)}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        onMessage={onMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1F5F9",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(241,245,249,0.8)",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748B",
  },
});

export default VendorMapView;
