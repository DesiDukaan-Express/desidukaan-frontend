import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar, Animated, ScrollView, Modal, Pressable, Linking
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { io } from "socket.io-client";
import useAuthStore from "../../store/authStore";
import { useTranslation } from "react-i18next";

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
            <Text style={mapS.badgeText}>Partner</Text>
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
  const { t } = useTranslation();
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

  const refreshOrder = async () => {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      const o = d.data?.order || d.order;
      if (o) {
        setOrder(o);
        setLastUpdate(new Date());
      }
    } catch (e) {
      console.error("Refresh order error:", e);
    }
  };

  // ── Socket — listen for delivery partner location & status ──────────────────
  useEffect(() => {
    if (!token || !orderId) return;
    const socket = io(SOCKET_URL, { 
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("[WS] Connected to server");
      // Aggressively join order tracking room
      socket.emit("track:join", { order_id: orderId });
      socket.emit("track:join", { order_id: String(orderId) });
    });
    
    socket.on("disconnect", () => {
      setConnected(false);
      console.log("[WS] Disconnected from server");
    });

    // Join order tracking room immediately too
    socket.emit("track:join", { order_id: orderId });

    // Listen for partner location updates
    socket.on("delivery_location_update", (data) => {
      const oid = data.order_id || data.orderId;
      if (oid && String(oid) !== String(orderId)) return;
      
      setPartnerPos({ lat: data.latitude, lng: data.longitude });
      setLastUpdate(new Date());
    });

    // Listen for order status changes (generic)
    socket.on("order:update", (data) => {
      console.log("[WS] order:update received", data);
      const oid = data.order_id || data.orderId;
      if (oid && String(oid) !== String(orderId)) return;
      
      refreshOrder();
    });

    // Listen for delivery status updates (explicit delivery status change)
    socket.on("delivery_status_update", (data) => {
      console.log("[WS] delivery_status_update received", data);
      const oid = data.order_id || data.orderId;
      if (oid && String(oid) !== String(orderId)) return;

      refreshOrder();
    });

    // Listen for partner being assigned
    socket.on("delivery_assigned", (data) => {
      console.log("[WS] delivery_assigned received", data);
      const oid = data.order_id || data.orderId;
      if (oid && String(oid) !== String(orderId)) return;
      
      refreshOrder();
    });

    // Poll partner location every 15s as fallback
    const locationPoll = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/delivery/track/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const d = await res.json();
          if (d.data?.latitude) {
            setPartnerPos({ lat: d.data.latitude, lng: d.data.longitude });
            setLastUpdate(new Date());
          }
        }
      } catch {}
    }, 15000);

    // Poll order status every 20s as fallback for missed WebSocket events
    const statusPoll = setInterval(refreshOrder, 20000);

    return () => {
      socket.disconnect();
      clearInterval(locationPoll);
      clearInterval(statusPoll);
    };
  }, [orderId, token]);


  const currentStepIdx = order ? stepIndex(order.status) : -1;
  const isDelivered    = order?.status === "delivered";
  const isActive       = order && !["delivered", "cancelled", "rejected"].includes(order.status);
  const destLat        = order?.delivery_address?.latitude;
  const destLng        = order?.delivery_address?.longitude;
  const partner        = order?.delivery?.partner;
  const partnerName    = partner?.user?.name || "Delivery Partner";
  const partnerPhone   = partner?.user?.phone;

  const [showDetails,   setShowDetails]   = useState(false);

  if (loading) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={C.green} />
        <Text style={{ marginTop: 12, color: C.gray400 }}>{t('orders.loadingOrderInfo', 'Loading order info…')}</Text>
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
          <Text style={s.headerTitle}>{t('orders.trackDelivery', 'Track Delivery')}</Text>
          <Text style={s.headerSub}>{orderNumber || `Order #${orderId}`}</Text>
        </View>
        
        {/* Detail Button */}
        <TouchableOpacity 
          style={s.detailIconBtn} 
          onPress={() => setShowDetails(true)}
          activeOpacity={0.7}
        >
          <Feather name="file-text" size={20} color={C.white} />
        </TouchableOpacity>

        {/* Live indicator */}
        {isActive && (
          <View style={s.livePill}>
            <PulseDot color={C.white} />
            <Text style={s.liveText}>{t('common.live', 'LIVE')}</Text>
          </View>
        )}
      </LinearGradient>

      {/* ── ORDER DETAIL MODAL (Inside Track Screen) ── */}
      <OrderDetailModal 
        visible={showDetails} 
        order={order} 
        onClose={() => setShowDetails(false)} 
      />

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
            {connected ? t('orders.connectedLive', 'Connected — live updates active') : t('orders.reconnecting', 'Reconnecting…')}
          </Text>
          {lastUpdate && (
            <Text style={s.lastUpdate}>
              {t('orders.lastUpdate', 'Last')}: {lastUpdate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Text>
          )}
        </View>

        {/* ETA CARD */}
        {isActive && (
          <View style={s.etaCard}>
            <View style={s.etaCardHeader}>
              <View style={s.etaIconBg}>
                <Feather name="clock" size={20} color={C.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.etaTitleText}>{t('orders.estimatedArrival', 'Estimated Arrival')}</Text>
                <Text style={s.etaValueText}>
                  {(() => {
                    let etaMins = order?.delivery_estimate_mins ?? null;
                    if (etaMins == null) {
                      if (order?.status === 'picked_up') etaMins = 15;
                      else if (order?.status === 'ready') etaMins = 20;
                      else etaMins = 30;
                    }
                    if (etaMins < 60) return `~${etaMins} mins`;
                    const h = Math.floor(etaMins / 60);
                    const m = etaMins % 60;
                    return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
                  })()}
                </Text>
              </View>
              {order?.delivery_distance_km != null && (
                <View style={s.etaBadge}>
                  <Feather name="map-pin" size={12} color={C.gray500} />
                  <Text style={s.etaBadgeText}>{t('orders.kmAway', '{{dist}} km away', { dist: order.delivery_distance_km })}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Partner location / details */}
        {partner ? (
          <View style={s.partnerCard}>
            <View style={s.partnerIconWrap}>
              <Feather name="user" size={22} color={C.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.partnerLabel}>{t('orders.deliveryPartnerAssigned', 'Delivery Partner Assigned')}</Text>
              <Text style={s.partnerTitle}>{partnerName}</Text>
              {partnerPos ? (
                <Text style={s.partnerCoord}>
                  📍 {parseFloat(partnerPos.lat).toFixed(5)}, {parseFloat(partnerPos.lng).toFixed(5)}
                </Text>
              ) : (
                <Text style={s.partnerCoord}>{t('orders.waitingLiveLocation', 'Waiting for live location updates…')}</Text>
              )}
            </View>
            {partnerPhone && (
              <TouchableOpacity
                style={s.callBtn}
                onPress={() => Linking.openURL(`tel:${partnerPhone}`)}
                activeOpacity={0.7}
              >
                <Feather name="phone" size={18} color={C.white} />
              </TouchableOpacity>
            )}
            {isActive && partnerPos && <PulseDot color={C.green} />}
          </View>
        ) : (
          <View style={s.waitCard}>
            <Feather name="clock" size={18} color={C.amber} />
            <View style={{ flex: 1 }}>
              <Text style={s.waitTitle}>{t('orders.waitingPartnerAssignment', 'Waiting for partner assignment…')}</Text>
              <Text style={s.waitSub}>{t('orders.partnerAssignedSoon', 'A delivery partner will be assigned to your order soon.')}</Text>
            </View>
          </View>
        )}

        {/* PROGRESS STEPS */}
        <View style={s.stepsCard}>
          <Text style={s.stepsTitle}>{t('orders.orderProgress', 'Order Progress')}</Text>
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
                    {t(`orders.step.${step.key}`, step.label)}
                  </Text>
                  {current && (
                    <View style={s.currentBadge}>
                      <PulseDot color={C.green} />
                      <Text style={s.currentBadgeText}>{t('orders.currentStatus', 'Current status')}</Text>
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
                <Text style={s.deliveredTitle}>{t('orders.orderDeliveredTitle', 'Order Delivered! 🎉')}</Text>
                <Text style={s.deliveredSub}>{t('orders.orderDeliveredSub', 'Your order has been delivered successfully')}</Text>
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
  detailIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    marginRight: 8,
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
  partnerLabel: { fontSize: 11, fontWeight: "600", color: C.gray400, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  partnerCoord: { fontSize: 12, color: C.gray400, fontFamily: Platform.OS === "web" ? "monospace" : undefined },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

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

  // ETA Card
  etaCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  etaCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  etaIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  etaTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.orange,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  etaValueText: {
    fontSize: 18,
    fontWeight: "900",
    color: C.orangeDark,
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  etaBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.gray600,
  },
});

// ─── Order Detail Modal Helper ───────────────────────────────────────────────
function OrderDetailModal({ visible, order, onClose }) {
  const { t } = useTranslation();
  if (!order) return null;
  const items = order.items || order.order_items || [];
  const subtotal = order.subtotal || items.reduce((s, i) => s + (i.product_price || i.price || 0) * (i.quantity || 1), 0);
  const deliveryFee = order.delivery_fee ?? 20;
  const total = order.total || (subtotal + deliveryFee);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={od.backdrop} onPress={onClose}>
        <Pressable style={od.sheet} onPress={() => {}}>
          <View style={od.handle} />
          <View style={od.header}>
            <Text style={od.title}>{t('orders.orderSummary', 'Order Summary')}</Text>
            <TouchableOpacity onPress={onClose} style={od.closeBtn}>
              <Feather name="x" size={20} color={C.gray400} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={od.content}>
            {/* ETA Banner */}
            {(() => {
              const isActive = order && !["delivered", "cancelled", "rejected"].includes(order.status);
              if (!isActive) return null;
              let etaMins = order.delivery_estimate_mins ?? null;
              if (etaMins == null) {
                if (order.status === 'picked_up') etaMins = 15;
                else if (order.status === 'ready') etaMins = 20;
                else etaMins = 30;
              }
              return (
                <View style={od.etaBanner}>
                  <View style={od.etaBannerLeft}>
                    <View style={od.etaIconBg}>
                      <Feather name="clock" size={16} color={C.orange} />
                    </View>
                    <View>
                      <Text style={od.etaBannerTitle}>{t('orders.estimatedDelivery', 'Estimated Delivery')}</Text>
                      <Text style={od.etaBannerLabel}>~{etaMins} mins</Text>
                    </View>
                  </View>
                  {order.delivery_distance_km != null && (
                    <View style={od.etaBadge}>
                      <Feather name="map-pin" size={11} color={C.gray500} />
                      <Text style={od.etaBadgeText}>{order.delivery_distance_km} km</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            <Text style={od.sectionTitle}>{t('orders.items', 'Items')}</Text>
            {items.map((item, i) => (
              <View key={i} style={od.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={od.itemName}>{item.product_name || item.name || "Item"}</Text>
                  <Text style={od.itemUnit}>{item.unit || "1 pc"}</Text>
                </View>
                <Text style={od.itemQty}>×{item.quantity || 1}</Text>
                <Text style={od.itemPrice}>₹{(item.product_price || item.price || 0) * (item.quantity || 1)}</Text>
              </View>
            ))}

            <View style={od.billBox}>
              <View style={od.billRow}>
                <Text style={od.billLabel}>{t('orders.subtotal', 'Subtotal')}</Text>
                <Text style={od.billValue}>₹{subtotal}</Text>
              </View>
              <View style={od.billRow}>
                <Text style={od.billLabel}>{t('orders.deliveryFee', 'Delivery Fee')}</Text>
                <Text style={od.billValue}>₹{deliveryFee}</Text>
              </View>
              <View style={[od.billRow, { borderTopWidth: 1, borderTopColor: C.gray100, marginTop: 8, paddingTop: 8 }]}>
                <Text style={[od.billLabel, { fontWeight: "800", color: C.gray900 }]}>{t('orders.totalPaid', 'Total Paid')}</Text>
                <Text style={[od.billValue, { fontWeight: "900", color: C.gray900, fontSize: 16 }]}>₹{total}</Text>
              </View>
            </View>

            <View style={od.statusBox}>
              <Text style={od.statusLabel}>{t('orders.currentStatus', 'Current Status')}</Text>
              <Text style={[od.statusValue, { color: C.green }]}>{(order.status || "").replace("_", " ").toUpperCase()}</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const od = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "80%" },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900 },
  closeBtn: { padding: 4 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: C.gray500, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  itemName: { fontSize: 15, fontWeight: "700", color: C.gray900 },
  itemUnit: { fontSize: 12, color: C.gray400, marginTop: 2 },
  itemQty: { fontSize: 14, fontWeight: "600", color: C.gray500 },
  itemPrice: { fontSize: 15, fontWeight: "800", color: C.gray900, minWidth: 60, textAlign: "right" },
  billBox: { backgroundColor: C.gray100, borderRadius: 16, padding: 16, marginTop: 12 },
  billRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  billLabel: { fontSize: 14, color: C.gray500 },
  billValue: { fontSize: 14, fontWeight: "700", color: C.gray900 },
  statusBox: { marginTop: 20, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.greenBorder, backgroundColor: C.greenLight, alignItems: "center" },
  statusLabel: { fontSize: 11, fontWeight: "800", color: C.green, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  statusValue: { fontSize: 16, fontWeight: "900" },

  // ETA Banner
  etaBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  etaBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  etaIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  etaBannerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.orange,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  etaBannerLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: C.orangeDark,
  },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  etaBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.gray600,
  },
});
