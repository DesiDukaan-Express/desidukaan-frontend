import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Platform, StatusBar, Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";

const C = {
  green:      "#16A34A", greenDark:  "#15803D",
  greenLight: "#F0FDF4", greenMid:   "#DCFCE7",
  greenBorder:"#BBF7D0",
  orange:     "#F97316", orangeDark: "#EA580C",
  white:      "#FFFFFF", bg:         "#F8FAFC",
  gray100:    "#F3F4F6", gray200:    "#E5E7EB",
  gray400:    "#9CA3AF", gray500:    "#6B7280",
  gray600:    "#4B5563", gray900:    "#111827",
};

// ─── Countdown ring ───────────────────────────────────────────────────────────
function CountdownRing({ seconds, total }) {
  const pct = seconds / total;
  // Simple animated border approach for RN
  return (
    <View style={cr.wrap}>
      <View style={[cr.track]} />
      <View style={cr.inner}>
        <Text style={cr.num}>{seconds}</Text>
      </View>
    </View>
  );
}
const cr = StyleSheet.create({
  wrap:  { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  track: { position: "absolute", width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: C.greenBorder },
  inner: { alignItems: "center", justifyContent: "center" },
  num:   { fontSize: 13, fontWeight: "900", color: C.green },
});

// ═════════════════════════════════════════════════════════════════════════════
export default function OrderPlaced() {
  const navigation  = useNavigation();
  const route       = useRoute();

  const orderNumber = route.params?.orderNumber || null;
  const vendorName  = route.params?.vendorName  || "Store";
  const slot        = route.params?.slot        || null; // { start, end }

  const [countdown, setCountdown] = useState(5);

  // ── Animations ─────────────────────────────────────────────────────────────
  const scaleAnim    = useRef(new Animated.Value(0)).current;
  const opacityAnim  = useRef(new Animated.Value(0)).current;
  const ringScale    = useRef(new Animated.Value(0.7)).current;
  const ringOpacity  = useRef(new Animated.Value(0.6)).current;
  const slideUp      = useRef(new Animated.Value(30)).current;
  const cardScale    = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Sequence: ring expands → circle bounces in → content slides up
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

  // ── Auto-redirect countdown ─────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigation.navigate("CustomerApp", {
            screen: "CustomerTabNavigator",
            params: { screen: "Home" },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const goHome = () => navigation.navigate("CustomerApp", {
    screen: "CustomerTabNavigator",
    params: { screen: "Home" },
  });

  const goOrders = () => navigation.navigate("CustomerApp", {
    screen: "CustomerTabNavigator",
    params: { screen: "Orders" },
  });

  // ── Slot formatter ──────────────────────────────────────────────────────────
  const fmtTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const { width: W } = Dimensions.get("window");
  const isWide = W >= 640;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Subtle gradient background */}
      <LinearGradient
        colors={[C.greenLight, C.white, C.white]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[s.content, isWide && { maxWidth: 480, alignSelf: "center", width: "100%" }]}>

        {/* ── Check circle ─────────────────────────────────────────────── */}
        <View style={s.circleWrap}>
          {/* Outer glow ring */}
          <Animated.View style={[s.ring, {
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
          }]} />
          {/* Green circle */}
          <Animated.View style={[s.circle, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={[C.green, C.greenDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.circleGrad}
            >
              <Feather name="check" size={52} color={C.white} strokeWidth={3} />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* ── Text content ─────────────────────────────────────────────── */}
        <Animated.View style={[s.textWrap, {
          opacity: opacityAnim,
          transform: [{ translateY: slideUp }],
        }]}>
          <Text style={s.title}>Order Placed! 🎉</Text>

          {orderNumber && (
            <View style={s.orderNumWrap}>
              <Feather name="hash" size={13} color={C.green} />
              <Text style={s.orderNum}>{orderNumber}</Text>
            </View>
          )}

          <Text style={s.subtitle}>
            Your order has been placed with{" "}
            <Text style={s.subtitleBold}>{vendorName}</Text>.
            {"\n"}We'll notify you once it's confirmed.
          </Text>
        </Animated.View>

        {/* ── Info card ────────────────────────────────────────────────── */}
        <Animated.View style={[s.infoCard, {
          opacity: opacityAnim,
          transform: [{ scale: cardScale }],
        }]}>

          {/* Delivery slot row — only if slot was confirmed */}
          {slot?.start && slot?.end ? (
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="clock" size={15} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Delivery window</Text>
                <Text style={s.infoValue}>{fmtTime(slot.start)} – {fmtTime(slot.end)}</Text>
              </View>
              <View style={s.confirmedBadge}>
                <Text style={s.confirmedText}>Confirmed</Text>
              </View>
            </View>
          ) : (
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="clock" size={15} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Estimated delivery</Text>
                <Text style={s.infoValue}>~30 minutes</Text>
              </View>
            </View>
          )}

          <View style={s.infoDivider} />

          {/* Status row */}
          <View style={s.infoRow}>
            <View style={[s.infoIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="loader" size={15} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Order status</Text>
              <Text style={s.infoValue}>Waiting for vendor confirmation</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <Animated.View style={[s.actions, { opacity: opacityAnim }]}>

          {/* Track order */}
          <TouchableOpacity style={s.trackBtn} onPress={goOrders} activeOpacity={0.88}>
            <LinearGradient
              colors={[C.green, C.greenDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.trackGrad}
            >
              <Feather name="map-pin" size={16} color={C.white} />
              <Text style={s.trackText}>Track Order</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Back to home */}
          <TouchableOpacity style={s.homeBtn} onPress={goHome} activeOpacity={0.8}>
            <Feather name="home" size={15} color={C.gray600} />
            <Text style={s.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>

        </Animated.View>

        {/* ── Auto-redirect note ───────────────────────────────────────── */}
        <Animated.View style={[s.redirectRow, { opacity: opacityAnim }]}>
          <CountdownRing seconds={countdown} total={5} />
          <Text style={s.redirectText}>Redirecting to home in {countdown}s</Text>
        </Animated.View>

      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.white },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 20 },

  // Circle
  circleWrap:  { alignItems: "center", justifyContent: "center", marginBottom: 4 },
  ring:        { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: C.greenLight, borderWidth: 2, borderColor: C.greenBorder },
  circle:      { width: 120, height: 120, borderRadius: 60, overflow: "hidden", shadowColor: C.green, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  circleGrad:  { flex: 1, alignItems: "center", justifyContent: "center" },

  // Text
  textWrap:    { alignItems: "center", gap: 8 },
  title:       { fontSize: 30, fontWeight: "900", color: C.gray900, letterSpacing: -0.5, textAlign: "center" },
  orderNumWrap:{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.greenMid, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  orderNum:    { fontSize: 13, fontWeight: "800", color: C.green },
  subtitle:    { fontSize: 15, color: C.gray500, textAlign: "center", lineHeight: 22 },
  subtitleBold:{ fontWeight: "700", color: C.gray900 },

  // Info card
  infoCard:    { width: "100%", backgroundColor: C.white, borderRadius: 20, borderWidth: 1.5, borderColor: C.gray200, padding: 18, gap: 4, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  infoIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoLabel:   { fontSize: 11, color: C.gray400, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  infoValue:   { fontSize: 15, fontWeight: "800", color: C.gray900, marginTop: 1 },
  infoDivider: { height: 1, backgroundColor: C.gray100, marginVertical: 4 },
  confirmedBadge: { backgroundColor: C.greenMid, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  confirmedText:  { fontSize: 11, fontWeight: "700", color: C.green },

  // Buttons
  actions:     { width: "100%", gap: 10 },
  trackBtn:    { borderRadius: 16, overflow: "hidden" },
  trackGrad:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  trackText:   { fontSize: 16, fontWeight: "900", color: C.white },
  homeBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 16, backgroundColor: C.gray100 },
  homeBtnText: { fontSize: 15, fontWeight: "700", color: C.gray600 },

  // Redirect
  redirectRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  redirectText:{ fontSize: 12, color: C.gray400, fontWeight: "500" },
});