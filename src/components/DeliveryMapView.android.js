import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

const BIKE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="32" fill="#16A34A" opacity="0.35"/><ellipse cx="36" cy="64" rx="14" ry="4" fill="rgba(0,0,0,0.15)"/><circle cx="36" cy="36" r="27" fill="#16A34A" stroke="#fff" stroke-width="3.5"/><g transform="translate(36,34)" fill="#fff" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><circle cx="-11" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="-11" cy="10" r="2" fill="#fff"/><circle cx="12" cy="10" r="7" fill="none" stroke="#fff" stroke-width="3"/><circle cx="12" cy="10" r="2" fill="#fff"/><line x1="-11" y1="3" x2="-11" y2="17" stroke="#fff" stroke-width="1"/><line x1="-18" y1="10" x2="-4" y2="10" stroke="#fff" stroke-width="1"/><line x1="12" y1="3" x2="12" y2="17" stroke="#fff" stroke-width="1"/><line x1="5" y1="10" x2="19" y2="10" stroke="#fff" stroke-width="1"/><path d="M-11 10 L-6 -2 L2 -4 L6 -2 L12 10" fill="none" stroke="#fff" stroke-width="3.5"/><line x1="-11" y1="10" x2="6" y2="10" stroke="#fff" stroke-width="3.5"/><rect x="-8" y="-8" width="12" height="5" rx="2.5" fill="#fff"/><line x1="10" y1="-2" x2="14" y2="-10" stroke="#fff" stroke-width="3"/><line x1="11" y1="-10" x2="17" y2="-10" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="17" cy="-7" r="2.5" fill="#FBBF24" stroke="#FBBF24" stroke-width="1"/><circle cx="-11" cy="4" r="1.5" fill="#F87171"/></g></svg>`;

const DEST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="#DC2626"/><circle cx="16" cy="16" r="6" fill="#fff"/><circle cx="16" cy="16" r="3" fill="#DC2626"/></svg>`;

export default function DeliveryMapView({ currentRegion, markers, destLat, destLng, destTitle }) {
  const webViewRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const markersJson = JSON.stringify(
    (markers || []).map((m) => ({
      lat: m.coordinate.latitude,
      lng: m.coordinate.longitude,
      title: m.title || "",
    }))
  );

  const onMessage = useCallback(() => {}, []);

  const hasPartner = currentRegion && currentRegion.latitude != null;
  const hasDest = destLat != null && destLng != null;
  const center = hasPartner
    ? [currentRegion.latitude, currentRegion.longitude]
    : hasDest
      ? [destLat, destLng]
      : [28.6139, 77.209];

  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    if (hasPartner) {
      webViewRef.current.injectedJavaScript(
        `window.updateCenter(${currentRegion.latitude},${currentRegion.longitude});true;`
      );
    }
  }, [loaded, currentRegion?.latitude, currentRegion?.longitude]);

  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    webViewRef.current.injectedJavaScript(
      `window.updateMarkers(${markersJson});true;`
    );
  }, [loaded, markersJson]);

  useEffect(() => {
    if (!loaded || !webViewRef.current || !hasDest) return;
    webViewRef.current.injectedJavaScript(
      `window.updateDest(${destLat},${destLng},${JSON.stringify(destTitle || "Destination")});true;`
    );
  }, [loaded, destLat, destLng, destTitle]);

  const bikeDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(BIKE_SVG);
  const destDataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(DEST_SVG);

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
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${center[0]},${center[1]}],15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:20}).addTo(map);
var partnerMarkers=[];
var destMarkerObj=null;
var routeLine=null;

window.updateCenter=function(lat,lng){map.setView([lat,lng]);};

window.updateMarkers=function(arr){
  partnerMarkers.forEach(function(m){m.remove();});
  partnerMarkers=[];
  arr.forEach(function(m){
    var icon=L.icon({iconUrl:'${bikeDataUrl}',iconSize:[64,64],iconAnchor:[32,58],popupAnchor:[0,-58]});
    var mk=L.marker([m.lat,m.lng],{icon:icon}).addTo(map).bindPopup(m.title);
    partnerMarkers.push(mk);
  });
  if(arr.length>0){
    var c=arr[0];
    if(destMarkerObj){
      var dPos=destMarkerObj.getLatLng();
      if(routeLine){routeLine.setLatLngs([[c.lat,c.lng],[dPos.lat,dPos.lng]]);}else{routeLine=L.polyline([[c.lat,c.lng],[dPos.lat,dPos.lng]],{color:'#16A34A',weight:4,dashArray:'10 8',opacity:0.75,lineCap:'round',lineJoin:'round'}).addTo(map);}
      map.fitBounds(L.latLngBounds([c.lat,c.lng],[dPos.lat,dPos.lng]),{padding:[40,40],maxZoom:15,animate:true,duration:0.8});
    }
  }
};

window.updateDest=function(lat,lng,title){
  var ll=[lat,lng];
  if(destMarkerObj){destMarkerObj.setLatLng(ll);}
  else{var icon=L.icon({iconUrl:'${destDataUrl}',iconSize:[32,40],iconAnchor:[16,40],popupAnchor:[0,-40]});destMarkerObj=L.marker(ll,{icon:icon}).addTo(map).bindTooltip(title,{permanent:false,direction:'top'});}
  if(partnerMarkers.length>0){
    var pPos=partnerMarkers[0].getLatLng();
    if(routeLine){routeLine.setLatLngs([[pPos.lat,pPos.lng],ll]);}else{routeLine=L.polyline([[pPos.lat,pPos.lng],ll],{color:'#16A34A',weight:4,dashArray:'10 8',opacity:0.75,lineCap:'round',lineJoin:'round'}).addTo(map);}
    map.fitBounds(L.latLngBounds([pPos.lat,pPos.lng],ll),{padding:[40,40],maxZoom:15,animate:true,duration:0.8});
  }
};
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1F5F9",
  },
});
