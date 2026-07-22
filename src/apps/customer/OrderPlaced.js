import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Platform, StatusBar, Dimensions, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { io } from "socket.io-client";
import useAuthStore from "../../store/authStore";
import { useTranslation } from "react-i18next";

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

const C = {
  green:      "#16A34A", greenDark:  "#15803D",
  greenLight: "#F0FDF4", greenMid:   "#DCFCE7",
  greenBorder:"#BBF7D0",
  orange:     "#F97316", orangeDark: "#EA580C",
  red:        "#EF4444", redLight:   "#FEF2F2",
  white:      "#FFFFFF", bg:         "#F8FAFC",
  gray100:    "#F3F4F6", gray200:    "#E5E7EB",
  gray400:    "#9CA3AF", gray500:    "#6B7280",
  gray600:    "#4B5563", gray900:    "#111827",
};

// Countdown ring component removed


// ═════════════════════════════════════════════════════════════════════════════
export default function OrderPlaced() {
  const { t }       = useTranslation();
  const navigation  = useNavigation();
  const route       = useRoute();
  const { token }   = useAuthStore();

  const orderId     = route.params?.orderId     || null;
  const orderNumber = route.params?.orderNumber || "ORD-000";
  const vendorName  = route.params?.vendorName  || "Store";
  const slot        = route.params?.slot        || null;

  const [status, setStatus] = useState("accepted"); // Default to accepted after payment flow

  // ── Animations ─────────────────────────────────────────────────────────────
  const scaleAnim    = useRef(new Animated.Value(0)).current;
  const opacityAnim  = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.7)).current;
  const ringOpacity  = useRef(new Animated.Value(0.6)).current;
  const slideUp      = useRef(new Animated.Value(30)).current;
  const cardScale    = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(slideUp,     { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.spring(cardScale,   { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Sockets ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !orderId) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on("connect", () => console.log("OrderPlaced: Socket connected"));

    socket.on("order:update", (data) => {
      console.log("Order update received:", data);
      if (String(data.order_id) === String(orderId)) {
        if (data.status === "accepted") setStatus("accepted");
        if (data.status === "rejected") setStatus("rejected");
      }
    });

    return () => socket.disconnect();
  }, [token, orderId]);

  // Timer removed - order is confirmed after payment in this flow

  const goHome = () => navigation.navigate("CustomerApp", {
    screen: "CustomerTabNavigator",
    params: { screen: "Home" },
  });

  const goOrders = () => navigation.navigate("CustomerApp", {
    screen: "CustomerTabNavigator",
    params: { screen: "Orders" },
  });

  const handlePayment = () => {
    alert("Payment feature coming soon!");
  };

  const fmtTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const { width: W } = Dimensions.get("window");
  const isWide = W >= 640;

  // ── Helper for status UI ────────────────────────────────────────────────────
  const getStatusConfig = () => {
    switch(status) {
      case "accepted": return { title: t('orders.orderConfirmed') || "Order Confirmed!", sub: t('orders.storeAccepted') || "The store has accepted your order.", icon: "check-circle", color: C.green, bg: C.greenLight };
      case "rejected": return { title: t('orders.orderDeclined') || "Order Declined", sub: t('orders.storeDeclinedSub') || "The store couldn't fulfill your order.", icon: "x-circle", color: C.red, bg: C.redLight };
      case "expired":  return { title: t('orders.requestExpired') || "Request Expired", sub: t('orders.storeExpiredSub') || "The store didn't respond in time.", icon: "clock", color: C.orange, bg: "#FFF7ED" };
      default:         return { title: t('orders.orderSent') || "Order Sent! 🚀", sub: t('orders.waitingConfirmation') || "Waiting for store confirmation...", icon: "loader", color: C.orange, bg: "#FEF3C7" };
    }
  };
  const cfg = getStatusConfig();

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <LinearGradient
        colors={[cfg.bg, C.white, C.white]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[s.content, isWide && { maxWidth: 480, alignSelf: "center", width: "100%" }]}>

        {/* ── Visual indicator ─────────────────────────────────────────── */}
        <View style={s.circleWrap}>
          <Animated.View style={[s.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity, borderColor: cfg.color + '40' }]} />
          <Animated.View style={[s.circle, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={[status === 'rejected' ? C.red : (status === 'accepted' ? C.green : C.orange), status === 'rejected' ? '#DC2626' : (status === 'accepted' ? C.greenDark : C.orangeDark)]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.circleGrad}
            >
              {status === 'waiting' ? (
                <ActivityIndicator size="large" color={C.white} />
              ) : (
                <Feather name={status === 'accepted' ? "check" : (status === 'rejected' ? "x" : "alert-circle")} size={52} color={C.white} strokeWidth={3} />
              )}
            </LinearGradient>
          </Animated.View>
        </View>

        {/* ── Status Text ──────────────────────────────────────────────── */}
        <Animated.View style={[s.textWrap, { opacity: opacityAnim, transform: [{ translateY: slideUp }] }]}>
          <Text style={s.title}>{cfg.title}</Text>

          {orderNumber && (
            <View style={[s.orderNumWrap, { backgroundColor: cfg.color + '20' }]}>
              <Feather name="hash" size={13} color={cfg.color} />
              <Text style={[s.orderNum, { color: cfg.color }]}>{orderNumber}</Text>
            </View>
          )}

          <Text style={s.subtitle}>
            {t('orders.orderWith', { name: vendorName }) || `Order with ${vendorName}.`}{"\n"}
            {cfg.sub}
          </Text>
        </Animated.View>

        {/* ── Negotiation Timer removed ── */}

        {/* ── Detail Card ───────────────────────────────────────────────── */}
        <Animated.View style={[s.infoCard, { opacity: opacityAnim, transform: [{ scale: cardScale }] }]}>
          <View style={s.infoRow}>
            <View style={s.infoIconWrap}>
              <Feather name="shopping-bag" size={15} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>{t('orders.estimatedDelivery') || "Estimated Delivery"}</Text>
              <Text style={s.infoValue}>{t('orders.estimatedDeliveryVal') || "~30 minutes"}</Text>
            </View>
          </View>

          <View style={s.infoDivider} />

          <View style={s.infoRow}>
            <View style={[s.infoIconWrap, { backgroundColor: cfg.bg }]}>
              <Feather name={cfg.icon} size={15} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>{t('orders.currentStatus') || "Current Status"}</Text>
              <Text style={[s.infoValue, { color: cfg.color }]}>{status === 'waiting' ? (t('orders.waitingForStore') || 'Waiting for store…') : status.toUpperCase()}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <Animated.View style={[s.actions, { opacity: opacityAnim }]}>
          {status === "accepted" && (
            <TouchableOpacity style={s.trackBtn} onPress={goHome} activeOpacity={0.88}>
              <LinearGradient colors={[C.green, C.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.trackGrad}>
                <Feather name="home" size={16} color={C.white} />
                <Text style={s.trackText}>{t('orders.proceedToHome') || "Proceed to Home"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.homeBtn} onPress={(status === 'rejected' || status === 'expired') ? goHome : goOrders} activeOpacity={0.8}>
            <Feather name={(status === 'rejected' || status === 'expired') ? "home" : "list"} size={15} color={C.gray600} />
            <Text style={s.homeBtnText}>{(status === 'rejected' || status === 'expired') ? (t('orders.backToHome') || "Back to Home") : (t('orders.goToMyOrders') || "Go to My Orders")}</Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 20 },
  circleWrap:  { alignItems: "center", justifyContent: "center", marginBottom: 4 },
  ring:        { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: C.white, borderWidth: 2 },
  circle:      { width: 120, height: 120, borderRadius: 60, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
  circleGrad:  { flex: 1, alignItems: "center", justifyContent: "center" },
  textWrap:    { alignItems: "center", gap: 8 },
  title:       { fontSize: 30, fontWeight: "900", color: C.gray900, letterSpacing: -0.5, textAlign: "center" },
  orderNumWrap:{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  orderNum:    { fontSize: 13, fontWeight: "800" },
  subtitle:    { fontSize: 15, color: C.gray500, textAlign: "center", lineHeight: 22 },
  subtitleBold:{ fontWeight: "700", color: C.gray900 },
  timerRow:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF7ED", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: "#FFEDD5" },
  timerText:   { fontSize: 13, fontWeight: "700", color: C.orange },
  infoCard:    { width: "100%", backgroundColor: C.white, borderRadius: 20, borderWidth: 1.5, borderColor: C.gray200, padding: 18, gap: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  infoIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel:   { fontSize: 11, color: C.gray400, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  infoValue:   { fontSize: 15, fontWeight: "800", color: C.gray900, marginTop: 1 },
  infoDivider: { height: 1, backgroundColor: C.gray100, marginVertical: 4 },
  actions:     { width: "100%", gap: 10 },
  trackBtn:    { borderRadius: 16, overflow: "hidden" },
  trackGrad:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  trackText:   { fontSize: 16, fontWeight: "900", color: C.white },
  homeBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: C.gray100 },
  homeBtnText: { fontSize: 15, fontWeight: "700", color: C.gray600 },
});