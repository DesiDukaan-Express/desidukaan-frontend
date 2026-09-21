import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

const DRIVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="32" fill="#16A34A" opacity="0.35"/><ellipse cx="36" cy="64" rx="14" ry="4" fill="rgba(0,0,0,0.15)"/><circle cx="36" cy="36" r="27" fill="#16A34A" stroke="#fff" stroke-width="3.5"/><g transform="translate(36,34)" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><circle cx="-11" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="-11" cy="10" r="2" fill="#fff"/><circle cx="12" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="12" cy="10" r="2" fill="#fff"/><line x1="-11" y1="3" x2="-11" y2="17" stroke="#fff" stroke-width="1"/><line x1="-18" y1="10" x2="-4" y2="10" stroke="#fff" stroke-width="1"/><line x1="12" y1="3" x2="12" y2="17" stroke="#fff" stroke-width="1"/><line x1="5" y1="10" x2="19" y2="10" stroke="#fff" stroke-width="1"/><path d="M-11 10 L-6 -2 L2 -4 L6 -2 L12 10" fill="none" stroke="#fff" stroke-width="3.5"/><line x1="-11" y1="10" x2="6" y2="10" stroke="#fff" stroke-width="3.5"/><rect x="-8" y="-8" width="12" height="5" rx="2.5" fill="#fff"/><line x1="10" y1="-2" x2="14" y2="-10" stroke="#fff" stroke-width="3"/><line x1="11" y1="-10" x2="17" y2="-10" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="17" cy="-7" r="2.5" fill="#FBBF24" stroke="#FBBF24" stroke-width="1"/><circle cx="-11" cy="4" r="1.5" fill="#F87171"/></g></svg>`;

const DEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#DC2626"/><circle cx="16" cy="16" r="6" fill="#fff"/><circle cx="16" cy="16" r="3" fill="#DC2626"/></svg>`;

export default function CustomerMapView({ partnerPos, destLat, destLng, style: styleOverride }) {
  const webViewRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const driverDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(DRIVER_SVG);
  const destDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(DEST_SVG);

  const onMessage = useCallback(() => {}, []);

  useEffect(() => {
    if (!loaded || !webViewRef.current || !partnerPos) return;
    webViewRef.current.injectedJavaScript(
      `window.updateDriver(${partnerPos.lat},${partnerPos.lng});true;`
    );
  }, [loaded, partnerPos?.lat, partnerPos?.lng]);

  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    if (destLat != null && destLng != null) {
      webViewRef.current.injectedJavaScript(
        `window.updateDest(${destLat},${destLng});true;`
      );
    }
  }, [loaded, destLat, destLng]);

  const center = partnerPos
    ? [partnerPos.lat, partnerPos.lng]
    : destLat && destLng
      ? [destLat, destLng]
      : [28.6139, 77.209];

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
var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:true,scrollWheelZoom:true,doubleClickZoom:true,touchZoom:true}).setView([${center[0]},${center[1]}],15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20}).addTo(map);
var driverMarker=null;
var destMarker=null;
var routeLine=null;

var _destLat=${destLat != null ? destLat : "null"};
var _destLng=${destLng != null ? destLng : "null"};

window.updateDriver=function(lat,lng){
  var ll=[lat,lng];
  if(driverMarker){driverMarker.setLatLng(ll);}
  else{var icon=L.icon({iconUrl:'${driverDataUrl}',iconSize:[64,64],iconAnchor:[32,58],popupAnchor:[0,-58]});driverMarker=L.marker(ll,{icon:icon,zIndexOffset:1000}).addTo(map).bindTooltip('Partner',{permanent:false,direction:'top'});}
  if(_destLat!==null&&_destLng!==null){
    var dest=[_destLat,_destLng];
    if(routeLine){routeLine.setLatLngs([ll,dest]);}else{routeLine=L.polyline([ll,dest],{color:'#16A34A',weight:4,dashArray:'10 8',opacity:0.75,lineCap:'round',lineJoin:'round'}).addTo(map);}
    map.fitBounds(L.latLngBounds(ll,dest),{padding:[40,40],maxZoom:15,animate:true,duration:0.6});
  }else{map.panTo(ll,{animate:true,duration:0.5});}
};

window.updateDest=function(lat,lng){
  _destLat=lat;_destLng=lng;
  var ll=[lat,lng];
  if(destMarker){destMarker.setLatLng(ll);}
  else{var icon=L.icon({iconUrl:'${destDataUrl}',iconSize:[32,40],iconAnchor:[16,40],popupAnchor:[0,-40]});destMarker=L.marker(ll,{icon:icon}).addTo(map).bindTooltip('Your Location',{permanent:false,direction:'top'});}
  if(driverMarker){
    var dPos=driverMarker.getLatLng();
    if(routeLine){routeLine.setLatLngs([[dPos.lat,dPos.lng],ll]);}else{routeLine=L.polyline([[dPos.lat,dPos.lng],ll],{color:'#16A34A',weight:4,dashArray:'10 8',opacity:0.75,lineCap:'round',lineJoin:'round'}).addTo(map);}
    map.fitBounds(L.latLngBounds([dPos.lat,dPos.lng],ll),{padding:[40,40],maxZoom:15,animate:true,duration:0.6});
  }
};
</script></body></html>`;

  return (
    <View style={[styles.outer, styleOverride]}>
      {!loaded && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color="#16A34A" />
          <Text style={styles.loaderText}>Loading map...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html, originWhiteList: "*" }}
        style={StyleSheet.absoluteFillObject}
        onLoadEnd={() => setLoaded(true)}
        javaScriptEnabled
        onMessage={onMessage}
      />
      <View style={styles.gradientTop} pointerEvents="none" />
      <View style={styles.gradientBottom} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    height: 280,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    position: "relative",
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  loaderWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 10,
  },
  loaderText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
    opacity: 0.5,
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "rgba(0,0,0,0.06)",
    opacity: 0.5,
  },
});
