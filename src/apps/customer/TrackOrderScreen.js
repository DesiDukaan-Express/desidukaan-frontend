import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar, Animated, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { io } from "socket.io-client";
import useAuthStore from "../../store/authStore";

const BASE_URL   = process.env.EXPO_PUBLIC_API_URL    || "http://localhost:3000/api";
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || (BASE_URL.includes('/api') ? BASE_URL.split('/api')[0] : "http://localhost:3000");

const C = {
  orange:      "#F97316", orangeDark:  "#EA580C",
  green:       "#16A34A", greenDark:   "#15803D",
  greenLight:  "#F0FDF4", greenMid:    "#DCFCE7",
  greenBorder: "#BBF7D0",
  white:       "#FFFFFF", bg:          "#F8FAFC",
  gray100:     "#F3F4F6", gray200:     "#E5E7EB",
  gray300:     "#D1D5DB", gray400:     "#9CA3AF",
  gray500:     "#6B7280", gray600:     "#4B5563",
  gray700:     "#374151", gray900:     "#111827",
  cyan:        "#0891B2", cyanLight:   "#ECFEFF",
  amber:       "#D97706", amberLight:  "#FEF3C7",
};

const STATUS_STEPS = [
  { key: "pending",   label: "Order Placed",          icon: "clipboard"    },
  { key: "accepted",  label: "Order Accepted",        icon: "check-circle" },
  { key: "ready",     label: "Ready to Move",         icon: "package"      },
  { key: "picked_up", label: "Out for Delivery",       icon: "truck"        },
  { key: "delivered", label: "Delivered!",              icon: "home"         },
];

const stepIndex = (status) => {
  if (status === "preparing") return 1; // Merged with "Order Accepted"
  if (status === "countered") return 0; // Stays at "Order Placed"
  return STATUS_STEPS.findIndex(s => s.key === status);
};

// ─── Map component — Web: uses iframe with OpenStreetMap, Native: placeholder ──
function DeliveryMap({ partnerLat, partnerLng, destLat, destLng }) {
  if (Platform.OS === "web") {
    const centerLat = partnerLat ?? destLat ?? 28.6139;
    const centerLng = partnerLng ?? destLng ?? 77.2090;
    const zoom = 14;
    // Build an iframe with two markers using OpenStreetMap + Leaflet via public tile
    const markerParam = partnerLat && partnerLng
      ? `&marker=${partnerLat},${partnerLng}`
      : "";
    const destParam  = destLat && destLng
      ? `&marker=${destLat},${destLng}`
      : "";
    // Using embed.openstreetmap.org for simplicity (no API key needed)
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.02},${centerLat - 0.02},${centerLng + 0.02},${centerLat + 0.02}&layer=mapnik${markerParam}${destParam}`;
    return (
      <View style={mapS.wrap}>
        <iframe
          src={src}
          style={{ width: "100%", height: "100%", border: "none", borderRadius: 16 }}
          title="Delivery Tracking Map"
          allowFullScreen
        />
        {/* Overlay labels */}
        {partnerLat && (
          <View style={mapS.partnerBadge}>
            <Feather name="truck" size={13} color={C.white} />
            <Text style={mapS.badgeText}>Delivery Partner</Text>
          </View>
        )}
      </View>
    );
  }

  // Native fallback — map placeholder with pulsing dot
  return (
    <View style={[mapS.wrap, { alignItems: "center", justifyContent: "center", backgroundColor: C.gray100 }]}>
      <Feather name="map" size={48} color={C.gray300} />
      <Text style={{ marginTop: 12, fontSize: 14, color: C.gray400, textAlign: "center" }}>
        Live map available on web.{"\n"}Partner location is updating below.
      </Text>
    </View>
  );
}
const mapS = StyleSheet.create({
  wrap:         { height: 280, borderRadius: 16, overflow: "hidden", backgroundColor: C.gray200, marginBottom: 16, position: "relative" },
  partnerBadge: { position: "absolute", bottom: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.green, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeText:    { fontSize: 12, fontWeight: "700", color: C.white },
});

// ─── Pulsing dot for live indicator ──────────────────────────────────────────
function PulseDot({ color = C.green }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color + "40", transform: [{ scale }], position: "absolute" }} />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════ //
export default function TrackOrderScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token }  = useAuthStore();
  const { orderId, orderNumber } = route.params || {};

  const [order,         setOrder]         = useState(null);
  const [partnerPos,    setPartnerPos]    = useState(null); // { lat, lng }
  const [loading,       setLoading]       = useState(true);
  const [connected,     setConnected]     = useState(false);
  const [lastUpdate,    setLastUpdate]    = useState(null);
  const socketRef = useRef(null);

  // ── Fetch initial order data ────────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || !token) return;
    (async () => {
      try {
        const res  = await fetch(`${BASE_URL}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const o = data.data?.order || data.order;
        if (o) setOrder(o);

        // Initial location fetch
        if (o && ["picked_up", "ready", "preparing", "accepted"].includes(o.status)) {
          const locRes = await fetch(`${BASE_URL}/delivery/track/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (locRes.ok) {
            const locData = await locRes.json();
            if (locData.data?.latitude) {
              setPartnerPos({ lat: locData.data.latitude, lng: locData.data.longitude });
              setLastUpdate(new Date());
            }
          }
        }
      } catch (e) {
        console.error("Track order fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, token]);

  // ── Socket — listen for delivery partner location ──────────────────────────
  useEffect(() => {
    if (!token || !orderId) return;
    const socket = io(SOCKET_URL, { 
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // Join order tracking room
    socket.emit("track:join", { order_id: orderId });

    // Listen for partner location updates
    socket.on("delivery_location_update", (data) => {
      // The backend emits delivery_location_update to the user room
      // Data contains: { partnerId, latitude, longitude, deliveryId, orderId }
      // We check if it matches our order (orderId might be added to backend, 
      // or we can match by deliveryId if we had it. For now, we update if it's there)
      if (data.orderId && String(data.orderId) !== String(orderId)) return;
      
      setPartnerPos({ lat: data.latitude, lng: data.longitude });
      setLastUpdate(new Date());
    });

    // Listen for order status changes
    socket.on("order:update", (data) => {
      console.log("WebSocket order:update received:", data);
      if (String(data.order_id) !== String(orderId)) return;
      setOrder(prev => prev ? { ...prev, status: data.status } : prev);
    });

    // Listen for delivery status updates (more detailed)
    socket.on("delivery_status_update", (data) => {
      console.log("WebSocket delivery_status_update received:", data);
      if (String(data.order_id) !== String(orderId)) return;
      
      // Update order status if it's included or map it
      const orderStatusMap = {
        picked_up: 'picked_up',
        delivered: 'delivered',
        failed: 'cancelled'
      };
      
      const newStatus = orderStatusMap[data.status] || data.status;
      setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
    });

    // Listen for partner being assigned
    socket.on("delivery_assigned", (data) => {
      console.log("WebSocket delivery_assigned received:", data);
      if (String(data.order_id) !== String(orderId)) return;
      
      // Force a refresh of order data to get partner details
      (async () => {
        try {
          const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await res.json();
          const o = d.data?.order || d.order;
          if (o) setOrder(o);
        } catch (e) {
          console.error("Refresh order error:", e);
        }
      })();
    });

    // Poll for location every 15s as a fallback
    const poll = setInterval(async () => {
      try {
        // Fix: Use the correct delivery tracking endpoint
        const res  = await fetch(`${BASE_URL}/delivery/track/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          // Fix: Backend returns latitude/longitude in d.data
          if (d.data?.latitude) {
            setPartnerPos({ lat: d.data.latitude, lng: d.data.longitude });
            setLastUpdate(new Date());
          }
        }
      } catch {}
    }, 15000);

    return () => {
      socket.disconnect();
      clearInterval(poll);
    };
  }, [orderId, token]);

  const currentStepIdx = order ? stepIndex(order.status) : -1;
  const isDelivered    = order?.status === "delivered";
  const isActive       = order && !["delivered", "cancelled", "rejected"].includes(order.status);
  const destLat        = order?.delivery_address?.latitude;
  const destLng        = order?.delivery_address?.longitude;

  if (loading) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={C.green} />
        <Text style={{ marginTop: 12, color: C.gray400 }}>Loading order info…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient
        colors={[C.orange, C.orangeDark, C.greenDark, C.green]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Track Delivery</Text>
          <Text style={s.headerSub}>{orderNumber || `Order #${orderId}`}</Text>
        </View>
        {/* Live indicator */}
        {isActive && (
          <View style={s.livePill}>
            <PulseDot color={C.white} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

        {/* MAP */}
        <DeliveryMap
          partnerLat={partnerPos?.lat}
          partnerLng={partnerPos?.lng}
          destLat={destLat}
          destLng={destLng}
        />

        {/* Connection status */}
        <View style={s.connectionRow}>
          <View style={[s.connDot, { backgroundColor: connected ? C.green : C.gray300 }]} />
          <Text style={s.connText}>
            {connected ? "Connected — live updates active" : "Reconnecting…"}
          </Text>
          {lastUpdate && (
            <Text style={s.lastUpdate}>
              Last: {lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Text>
          )}
        </View>

        {/* Partner location details */}
        {partnerPos ? (
          <View style={s.partnerCard}>
            <View style={s.partnerIconWrap}>
              <Feather name="truck" size={22} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.partnerTitle}>Delivery Partner</Text>
              <Text style={s.partnerCoord}>
                {parseFloat(partnerPos.lat).toFixed(5)}, {parseFloat(partnerPos.lng).toFixed(5)}
              </Text>
            </View>
            {isActive && <PulseDot color={C.green} />}
          </View>
        ) : (
          <View style={s.waitCard}>
            <Feather name="clock" size={18} color={C.amber} />
            <View style={{ flex: 1 }}>
              <Text style={s.waitTitle}>Waiting for partner location…</Text>
              <Text style={s.waitSub}>Location will appear once the partner is on the way</Text>
            </View>
          </View>
        )}

        {/* PROGRESS STEPS */}
        <View style={s.stepsCard}>
          <Text style={s.stepsTitle}>Order Progress</Text>
          {STATUS_STEPS.map((step, i) => {
            const done    = currentStepIdx >= 0 && i <= currentStepIdx;
            const current = i === currentStepIdx;
            const future  = !done;
            return (
              <View key={step.key} style={s.stepRow}>
                <View style={s.stepLeftCol}>
                  {i > 0 && (
                    <View style={[s.stepLine, { backgroundColor: i <= currentStepIdx ? C.green : C.gray200 }]} />
                  )}
                  <View style={[
                    s.stepDot,
                    done    && s.stepDotDone,
                    current && s.stepDotCurrent,
                    future  && s.stepDotFuture,
                  ]}>
                    {done
                      ? <Feather name="check" size={12} color={C.white} />
                      : <Feather name={step.icon} size={12} color={current ? C.green : C.gray300} />}
                  </View>
                  {i < STATUS_STEPS.length - 1 && (
                    <View style={[s.stepLineBelow, { backgroundColor: i < currentStepIdx ? C.green : C.gray200 }]} />
                  )}
                </View>
                <View style={s.stepContent}>
                  <Text style={[
                    s.stepLabel,
                    done    && { color: C.gray900, fontWeight: "700" },
                    current && { color: C.green,  fontWeight: "800" },
                    future  && { color: C.gray400 },
                  ]}>
                    {step.label}
                  </Text>
                  {current && (
                    <View style={s.currentBadge}>
                      <PulseDot color={C.green} />
                      <Text style={s.currentBadgeText}>Current status</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivery complete overlay */}
        {isDelivered && (
          <View style={s.deliveredCard}>
            <LinearGradient
              colors={[C.green, C.greenDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.deliveredGrad}
            >
              <Feather name="check-circle" size={28} color={C.white} />
              <View style={{ flex: 1 }}>
                <Text style={s.deliveredTitle}>Order Delivered! 🎉</Text>
                <Text style={s.deliveredSub}>Your order has been delivered successfully</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: Platform.OS === "android" ? 28 : 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: C.white },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  livePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  liveText: { fontSize: 11, fontWeight: "800", color: C.white, letterSpacing: 1 },

  body: { padding: 16 },

  connectionRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginBottom: 12,
  },
  connDot:    { width: 8, height: 8, borderRadius: 4 },
  connText:   { flex: 1, fontSize: 12, color: C.gray500, fontWeight: "500" },
  lastUpdate: { fontSize: 11, color: C.gray400 },

  partnerCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.greenBorder, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  partnerIconWrap: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: C.green,
    alignItems: "center", justifyContent: "center",
  },
  partnerTitle: { fontSize: 14, fontWeight: "800", color: C.gray900, marginBottom: 3 },
  partnerCoord: { fontSize: 12, color: C.gray400, fontFamily: Platform.OS === "web" ? "monospace" : undefined },

  waitCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: C.amberLight, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#FDE68A", marginBottom: 16,
  },
  waitTitle: { fontSize: 14, fontWeight: "700", color: C.amber },
  waitSub:   { fontSize: 12, color: "#92400E", marginTop: 2, lineHeight: 17 },

  stepsCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.gray200, marginBottom: 16,
  },
  stepsTitle: { fontSize: 15, fontWeight: "900", color: C.gray900, marginBottom: 16 },

  stepRow:     { flexDirection: "row", gap: 14, minHeight: 44 },
  stepLeftCol: { alignItems: "center", width: 30 },
  stepLine:    { width: 2, height: 12, marginBottom: 2 },
  stepLineBelow: { width: 2, flex: 1, minHeight: 12, marginTop: 2 },
  stepDot:     { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  stepDotDone:    { backgroundColor: C.green,    borderColor: C.green   },
  stepDotCurrent: { backgroundColor: C.white,    borderColor: C.green, shadowColor: C.green, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  stepDotFuture:  { backgroundColor: C.gray100,  borderColor: C.gray200 },
  stepContent: { flex: 1, paddingTop: 4, paddingBottom: 16 },
  stepLabel:   { fontSize: 14, fontWeight: "500", color: C.gray600 },

  currentBadge:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  currentBadgeText: { fontSize: 11, color: C.green, fontWeight: "700" },

  deliveredCard: { borderRadius: 18, overflow: "hidden", marginBottom: 12 },
  deliveredGrad: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20 },
  deliveredTitle: { fontSize: 17, fontWeight: "900", color: C.white },
  deliveredSub:   { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },
});
