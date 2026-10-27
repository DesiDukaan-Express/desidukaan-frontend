import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  Animated,
  Linking,
  Dimensions,
} from "react-native";
import { Feather, FontAwesome, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { io } from "socket.io-client";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { productReviewsAPI } from "../../services/productReviews";
import { TextInput, Alert } from "react-native";
import { useTranslation } from "react-i18next";

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (process.env.EXPO_PUBLIC_API_URL?.includes("/api")
    ? process.env.EXPO_PUBLIC_API_URL.split("/api")[0]
    : "http://localhost:3000");
import { downloadInvoice } from "../../utils/invoiceGenerator";
import useDriverLocation from "../../hooks/useDriverLocation";
import CustomerMapView from "../../components/CustomerMapView";
import { useTheme } from "../../theme/ThemeContext";

import { dkBg, dkBorder, themeCfg } from "../../theme/darkTones";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const TIP_PRESETS = [10, 20, 50, 100];

const C = {

green: "#16803D",
greenDark: "#116530",
greenLight: "#F0F9F2",
greenMid: "#DDF2E2",
greenBorder: "#CBE5D1",
bg: "#F5F8F5",
gray100: "#F1F4F1",
gray200: "#E1E8E2",
gray300: "#C8D3CA",
gray400: "#93A197",
gray500: "#68766B",
gray600: "#4C5B4F",
gray700: "#344638",
gray800: "#243629",
gray900: "#172D1E",

};


// ─── Status config — matches backend OrderStatus enum exactly ─────────────────
// Backend: pending | accepted | preparing | ready | picked_up | delivered | cancelled | rejected
const STATUS = {
  pending: { label: "Pending", color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  accepted: {
    label: "Accepted",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: "check-circle",
  },
  preparing: {
    label: "Preparing",
    color: "#7C3AED",
    bg: "#F5F3FF",
    icon: "package",
  },
  ready: { label: "Ready", color: "#0891B2", bg: "#ECFEFF", icon: "star" },
  picked_up: {
    label: "Picked Up",
    color: "#0891B2",
    bg: "#ECFEFF",
    icon: "truck",
  },
  delivered: {
    label: "Delivered",
    color: "#16A34A",
    bg: "#F0FDF4",
    icon: "check",
  },
  cancelled: {
    label: "Cancelled",
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "x-circle",
  },
  rejected: {
    label: "Rejected",
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "x-circle",
  },
};
const getStatus = (s, isDark) => themeCfg(STATUS[s] || STATUS.pending, isDark);

// ─── Order lifecycle steps — matches backend transitions ─────────────────────
const TRACK_STEPS = [
  { key: "pending", label: "Order Placed", icon: "shopping-bag" },
  { key: "accepted", label: "Accepted", icon: "check-circle" },
  { key: "ready", label: "Ready to Move", icon: "star" },
  { key: "picked_up", label: "Out for Delivery", icon: "truck" },
  { key: "delivered", label: "Delivered", icon: "home" },
];

const stepIndex = (status) => {
  // rejected/cancelled don't fit the happy path
  if (status === "rejected" || status === "cancelled") return -1;
  if (status === "preparing") return 1; // Merged with "Accepted"
  return TRACK_STEPS.findIndex((s) => s.key === status);
};

// ─── Haversine distance (km) between two lat/lng points ───────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Status → header message mapping ─────────────────────────────────────────
const STATUS_HEADER_TEXTS = {
  pending: "Order Placed",
  accepted: "Order Accepted",
  preparing: "Order is being prepared",
  ready: "Ready for pickup",
  picked_up: "Order is on the way",
  delivered: "Delivered!",
  cancelled: "Order Cancelled",
  rejected: "Order Rejected",
};
const getHeaderText = (s) => STATUS_HEADER_TEXTS[s] || "Order Placed";

// ─── Status → partner message mapping ────────────────────────────────────────
const PARTNER_STATUS_MSGS = {
  accepted: "I have accepted your order and am heading to the store",
  preparing: "I am at the store preparing your order",
  ready: "I have your order and am ready to head your way",
  picked_up: "I have picked up your order and am on the way to your location",
};
const getPartnerMsg = (s) => PARTNER_STATUS_MSGS[s] || "Your delivery partner is on the way";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const formatDateShort = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ─── Live Driver Location Map ────────────────────────────────────────────────
// Shown inside the OrderDetailModal for active delivery statuses.
const MAP_ACTIVE_STATUSES = ["accepted", "preparing", "ready", "picked_up"];

// ─── ETA helpers ──────────────────────────────────────────────────────────────
const ACTIVE_ETA_STATUSES = ["pending", "accepted", "preparing", "ready", "picked_up"];

const formatETA = (mins) => {
  if (mins == null) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const getETALabel = (status, mins) => {
  if (mins == null) return null;
  const t = formatETA(mins);
  if (status === "picked_up") return `Arriving in ~${t}`;
  if (status === "ready") return `Pickup ready · ~${t} away`;
  return `Est. delivery in ~${t}`;
};

function DriverLocationMap({ order, token, partnerPos: externalPos, connected: externalConnected, lastUpdate: externalLastUpdate }) {
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const dlm = useMemo(() => StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.greenBorder,
    marginBottom: 20,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
    backgroundColor: C.greenLight,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.greenMid,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.gray900,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  mapWrap: {
    position: "relative",
  },
  locatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,250,252,0.88)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
    minHeight: 220,
  },
  locatingText: {
    fontSize: 13,
    color: C.gray500,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.gray100,
    backgroundColor: C.surface,
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  connText: {
    flex: 1,
    fontSize: 11,
    color: C.gray500,
    fontWeight: "500",
  },
  lastUpdate: {
    fontSize: 10,
    color: C.gray400,
    fontWeight: "500",
  },
}), [C]);
  const hasDriver = !!(
    order?.delivery_partner_id ||
    order?.delivery_partner ||
    order?.delivery?.partner_id ||
    order?.delivery?.partner
  );

  const initialLocation =
    order?.delivery?.partner?.current_lat &&
      order?.delivery?.partner?.current_lng
      ? {
        lat: order.delivery.partner.current_lat,
        lng: order.delivery.partner.current_lng,
      }
      : order?.delivery_partner?.current_lat &&
        order?.delivery_partner?.current_lng
        ? {
          lat: order.delivery_partner.current_lat,
          lng: order.delivery_partner.current_lng,
        }
        : null;

  const hookData = useDriverLocation(
    order?.id,
    token,
    order?.status,
    hasDriver,
    initialLocation,
  );

  const partnerPos = externalPos ?? hookData.partnerPos;
  const connected = externalConnected ?? hookData.connected;
  const lastUpdate = externalLastUpdate ?? hookData.lastUpdate;

  // Pulsing "LIVE" badge animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const destLat = order?.delivery_address?.latitude;
  const destLng = order?.delivery_address?.longitude;

  const isLocating = !partnerPos;

  // Distance & ETA from driver to customer
  const distKm = partnerPos?.lat && destLat && destLng
    ? haversineKm(partnerPos.lat, partnerPos.lng, destLat, destLng)
    : null;
  const distDisplay = distKm != null ? Number(distKm) : null;
  const etaMins = distDisplay != null ? Math.max(2, Math.round(distDisplay * 4)) : null;
  const etaLabel = etaMins != null
    ? etaMins < 60
      ? `~${etaMins} min`
      : (() => { const h = Math.floor(etaMins / 60); const m = etaMins % 60; return m > 0 ? `~${h}h ${m}m` : `~${h}h`; })()
    : null;

  const [showFullMap, setShowFullMap] = useState(false);
  const SCREEN_H = Dimensions.get("window").height;

  return (
    <>
      <View style={dlm.card}>
        {/* Card header */}
        <View style={dlm.header}>
          <View style={dlm.headerLeft}>
            <View style={dlm.mapIconBg}>
              <Feather name="map" size={14} color={C.green} />
            </View>
            <Text style={dlm.headerTitle}>Driver Location</Text>
          </View>
          <View style={dlm.headerRight}>
            <TouchableOpacity
              style={dlm.viewBtn}
              onPress={() => setShowFullMap(true)}
              activeOpacity={0.7}
            >
              <Feather name="maximize-2" size={13} color={C.green} />
              <Text style={dlm.viewBtnText}>View</Text>
            </TouchableOpacity>
            <View style={dlm.liveBadge}>
              <Animated.View style={[dlm.liveDot, { opacity: pulseAnim }]} />
              <Text style={dlm.liveText}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* Map */}
        <View style={dlm.mapWrap}>
          <CustomerMapView
            partnerPos={partnerPos}
            destLat={destLat}
            destLng={destLng}
          />

          {/* Arriving banner on map */}
          {partnerPos && etaMins != null && (
            <View style={dlm.mapArriveBanner}>
              <Feather name="navigation" size={14} color={C.green} />
              <Text style={dlm.mapArriveText}>
                Arriving in{" "}
                <Text style={dlm.mapArriveBold}>
                  ~{etaMins} {etaMins === 1 ? "min" : "mins"}
                </Text>
              </Text>
            </View>
          )}

          {/* Locating overlay — shown until first position arrives */}
          {isLocating && (
            <View style={dlm.locatingOverlay}>
              <ActivityIndicator size="small" color={C.green} />
              <Text style={dlm.locatingText}>
                {hasDriver
                  ? "Locating driver…"
                  : "Waiting for driver assignment…"}
              </Text>
            </View>
          )}
        </View>

        {/* Status row */}
        <View style={dlm.statusRow}>
          <View
            style={[
              dlm.connDot,
              { backgroundColor: connected ? C.green : C.gray300 },
            ]}
          />
          <Text style={dlm.connText}>
            {connected ? "Connected — live updates" : "Reconnecting…"}
          </Text>
          {lastUpdate && (
            <Text style={dlm.lastUpdate}>
              {lastUpdate.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </Text>
          )}
        </View>
      </View>

      {/* ── Full-Screen Map Modal ── */}
      <Modal
        visible={showFullMap}
        animationType="slide"
        onRequestClose={() => setShowFullMap(false)}
      >
        <View style={dlm.fullScreenWrap}>
          {/* Header row */}
          <View style={dlm.fullMapHeader}>
            <View style={dlm.fullMapHeaderLeft}>
              <View style={dlm.mapIconBg}>
                <Feather name="map" size={14} color={C.green} />
              </View>
              <Text style={dlm.fullMapTitle}>Live Tracking</Text>
            </View>
            <View style={dlm.fullMapHeaderRight}>
              {partnerPos && (
                <View style={dlm.fullMapLiveBadge}>
                  <Animated.View style={[dlm.liveDot, { opacity: pulseAnim }]} />
                  <Text style={dlm.liveText}>LIVE</Text>
                </View>
              )}
              <TouchableOpacity
                style={dlm.fullMapCloseBtn}
                onPress={() => setShowFullMap(false)}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color={C.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Arriving banner on full map */}
          {partnerPos && etaMins != null && (
            <View style={dlm.fullMapArriveBanner}>
              <Feather name="navigation" size={15} color={C.green} />
              <Text style={dlm.fullMapArriveText}>
                Arriving in{" "}
                <Text style={dlm.fullMapArriveBold}>
                  ~{etaMins} {etaMins === 1 ? "min" : "mins"}
                </Text>
              </Text>
            </View>
          )}

          {/* Full map — fills remaining space */}
          <View style={dlm.fullMapContainer}>
            <CustomerMapView
              partnerPos={partnerPos}
              destLat={destLat}
              destLng={destLng}
              style={{ height: "100%", borderRadius: 0 }}
            />

            {/* Locating overlay */}
            {isLocating && (
              <View style={dlm.locatingOverlayFull}>
                <ActivityIndicator size="small" color={C.green} />
                <Text style={dlm.locatingText}>
                  {hasDriver ? "Locating driver…" : "Waiting for driver assignment…"}
                </Text>
              </View>
            )}
          </View>

          {/* Bottom info bar */}
          <View style={dlm.fullMapInfoBar}>
            <View style={dlm.fullMapInfoLeft}>
              <View style={[dlm.connDot, { backgroundColor: connected ? C.green : C.gray300 }]} />
              <Text style={dlm.fullMapInfoText}>
                {connected ? "Connected — live updates" : "Reconnecting…"}
              </Text>
            </View>
            {lastUpdate && (
              <Text style={dlm.fullMapInfoTime}>
                {lastUpdate.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}



// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const od = useMemo(() => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.gray300,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  // Polished status header (colored banner)
  statusCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusCardDelivered: {
    backgroundColor: C.green,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconGreen: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusIconBlue: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusIconRed: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: C.white,
    lineHeight: 21,
  },
  statusLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.surface,
  },
  statusLiveText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.8,
  },
  // Compact order number row
  orderNumRow: {
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
    minHeight: 280,
  },
  locatingOverlayFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,250,252,0.88)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  orderNumCompact: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray600,
  },
  orderDateCompact: {
    fontSize: 11,
    color: C.gray400,
    marginLeft: "auto",
  },
  // Partner info card
  partnerInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.greenBorder,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  partnerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerInfoName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.gray900,
    marginBottom: 3,
  },
  partnerInfoMsg: {
    fontSize: 12,
    color: C.gray500,
    lineHeight: 17,
  },
  partnerCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  body: { padding: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.gray900,
    marginBottom: 14,
    marginTop: 4,
  },

  // Tracking
  trackBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.gray100,
  },
  stepRow: { flexDirection: "row", gap: 14, minHeight: 40 },
  stepLeft: { alignItems: "center", width: 28 },
  stepConnector: { width: 2, height: 14, marginBottom: 2 },
  stepConnectorBelow: { width: 2, flex: 1, minHeight: 14, marginTop: 2 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  stepDotDone: { backgroundColor: C.green, borderColor: C.green },
  stepDotCurrent: {
    backgroundColor: C.surface,
    borderColor: C.green,
    shadowColor: C.green,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  stepDotFuture: { backgroundColor: C.gray100, borderColor: C.gray200 },
  stepContent: { flex: 1, paddingTop: 4, paddingBottom: 12 },
  stepLabel: { fontSize: 14, fontWeight: "500" },
  stepCurrentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  stepCurrentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  stepCurrentText: { fontSize: 11, color: C.green, fontWeight: "600" },

  // Failed
  failedBox: {
    alignItems: "center",
    backgroundColor: C.redLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  failedIcon: { marginBottom: 10 },
  failedTitle: { fontSize: 17, fontWeight: "800", color: C.red },
  failedReason: {
    fontSize: 13,
    color: C.gray600,
    marginTop: 6,
    textAlign: "center",
  },

  // Items
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  itemImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.gray100,
  },
  itemName: { fontSize: 14, fontWeight: "600", color: C.gray900 },
  itemUnit: { fontSize: 12, color: C.gray400, marginTop: 2 },
  itemQty: { fontSize: 12, color: C.gray500, fontWeight: "600" },
  itemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: C.gray900,
    marginTop: 2,
  },

  // Bill
  billBox: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.gray100,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  billLbl: { fontSize: 14, color: C.gray500 },
  billVal: { fontSize: 14, fontWeight: "600", color: C.gray900 },
  billTotal: {
    borderTopWidth: 1,
    borderTopColor: C.gray200,
    marginTop: 4,
    paddingTop: 12,
  },
  billTotalLbl: { fontSize: 15, fontWeight: "800", color: C.gray900 },
  billTotalVal: { fontSize: 17, fontWeight: "900", color: C.gray900 },

  // Address
  addressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.greenLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  addressIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.greenMid,
    alignItems: "center",
    justifyContent: "center",
  },
  addressLbl: {
    fontSize: 11,
    color: C.green,
    fontWeight: "700",
    marginBottom: 2,
  },
  addressVal: {
    fontSize: 13,
    color: C.gray700,
    fontWeight: "500",
    lineHeight: 18,
  },

  // Payment
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  paymentText: { fontSize: 13, color: C.gray500, fontWeight: "500" },

  // Track button
  trackBtn: { borderRadius: 14, overflow: "hidden", marginTop: 16 },
  trackBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
  },
  trackBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  // Invoice button
  invoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.green,
    marginTop: 10,
    backgroundColor: C.surface,
  },
  invoiceBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.green,
  },

  // ETA Banner (inside detail modal)
  etaBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: dkBg("#FFF7ED", isDark),
    borderWidth: 1,
    borderColor: dkBorder("#FED7AA", isDark),
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
    backgroundColor: dkBg("#FFEDD5", isDark),
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
    backgroundColor: C.surface,
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.white,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.green,
  },
  // ── Half-Screen Map Modal ──
  fullScreenWrap: {
    flex: 1,
    backgroundColor: C.gray50,
  },
  fullMapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: C.green,
  },
  fullMapHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullMapHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fullMapTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.white,
  },
  fullMapLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  fullMapCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullMapContainer: {
    flex: 1,
    position: "relative",
  },
  fullMapInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.white,
  },
  fullMapInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  fullMapInfoText: {
    fontSize: 12,
    color: C.gray500,
    fontWeight: "500",
  },
  fullMapInfoTime: {
    fontSize: 11,
    color: C.gray400,
    fontWeight: "500",
  },
  mapArriveBanner: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  mapArriveText: {
    fontSize: 13,
    color: C.gray600,
    fontWeight: "500",
  },
  mapArriveBold: {
    fontSize: 16,
    color: C.green,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  fullMapArriveBanner: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 26,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
  },
  fullMapArriveText: {
    fontSize: 14,
    color: C.gray600,
    fontWeight: "500",
  },
  fullMapArriveBold: {
    fontSize: 18,
    color: C.green,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});

// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const [fullOrder, setFullOrder] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tipSent, setTipSent] = useState(false);
  const [selectedTip, setSelectedTip] = useState(null);
  const [customTip, setCustomTip] = useState("");
  const [tipSending, setTipSending] = useState(false);

  // Per-item product reviews (read-only display for delivered orders)
  const [itemRatingsMap, setItemRatingsMap] = useState({});
  const [itemRatingsLoading, setItemRatingsLoading] = useState(false);

  // Use fullOrder if available for more details, otherwise fallback to order
  const displayOrder = fullOrder || order;

  const hasDriver = !!(
    displayOrder?.delivery_partner_id ||
    displayOrder?.delivery_partner ||
    displayOrder?.delivery?.partner_id ||
    displayOrder?.delivery?.partner
  );
  const deliveryStatus = displayOrder?.delivery?.status;

  useEffect(() => {
    if (order?.id) {
      fetchFullOrder();
    } else {
      setFullOrder(null);
    }
  }, [order?.id, order?.status]);

  const fetchFullOrder = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${BASE_URL}/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFullOrder(data.data?.order || data.order || data);
    } catch (e) {
      console.error("FetchFullOrder error:", e);
    } finally {
      setFetching(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setGenerating(true);
    try {
      await downloadInvoice(order.id, order.order_number || order.id);
    } catch (e) {
      console.error("Invoice error:", e);
    } finally {
      setGenerating(false);
    }
  };

  // Reset tip state whenever a different order is opened
  useEffect(() => {
    setTipSent(false);
    setSelectedTip(null);
    setCustomTip("");
  }, [order?.id]);

  // Fetch per-item product reviews for read-only display in delivered orders
  useEffect(() => {
    if (!order || order.status !== "delivered") return;
    const items = order.order_items || order.items || [];
    const productIds = items.map(i => i.product_id).filter(Boolean);
    if (productIds.length === 0) return;

    setItemRatingsLoading(true);
    productReviewsAPI.getBulk(productIds, token, order.id)
      .then(res => {
        if (res.success) {
          const map = {};
          Object.entries(res.data).forEach(([pid, info]) => {
            map[pid] = info;
          });
          setItemRatingsMap(map);
        }
      })
      .catch(() => { })
      .finally(() => setItemRatingsLoading(false));
  }, [order?.id, order?.status, token]);

  const handleSendTip = () => {
    if (!(selectedTip || customTip)) return;
    Alert.alert("Tipping coming soon", "Tips aren't available yet. Hang tight!");
  };

  // ── Live driver location & ETA — MUST be before early return (hooks rule) ──
  const initialLocation =
    order?.delivery?.partner?.current_lat &&
      order?.delivery?.partner?.current_lng
      ? { lat: order.delivery.partner.current_lat, lng: order.delivery.partner.current_lng }
      : order?.delivery_partner?.current_lat && order?.delivery_partner?.current_lng
        ? { lat: order.delivery_partner.current_lat, lng: order.delivery_partner.current_lng }
        : null;

  // Ref-based callback ensures stale closures aren't passed to the hook
  const fetchFullOrderRef = useRef(fetchFullOrder);
  fetchFullOrderRef.current = fetchFullOrder;

  const { partnerPos, connected, lastUpdate } = useDriverLocation(
    order?.id,
    token,
    order?.status,
    hasDriver,
    initialLocation,
    fetchFullOrderRef.current,
  );

  const destLat = order?.delivery_address?.latitude;
  const destLng = order?.delivery_address?.longitude;

  const rawDist = partnerPos?.lat ? haversineKm(partnerPos.lat, partnerPos.lng, destLat, destLng) : order?.delivery_distance_km;
  const currentDistKm = rawDist != null ? Number(rawDist) : null;
  const liveEtaMins = (() => {
    if (currentDistKm != null && partnerPos?.lat && destLat && destLng) {
      return Math.max(2, Math.round(currentDistKm * 4));
    }
    if (order?.status === 'picked_up') return 15;
    if (order?.status === 'ready') return 20;
    return 30;
  })();

  const isActive = order && !["delivered", "cancelled", "rejected"].includes(order.status);
  const showMap = hasDriver && order?.status === "picked_up";
  const headerStatusText = getHeaderText(order?.status);
  const partnerName = order?.delivery?.partner?.user?.name || order?.delivery_partner?.user?.name || "Delivery Partner";
  const partnerPhone = order?.delivery?.partner?.user?.phone || order?.delivery_partner?.user?.phone;
  const partnerMsg = getPartnerMsg(order?.status);

  if (!order) return null;

  const st = getStatus(order.status);
  const stepIdx = stepIndex(order.status);
  const isFailed = order.status === "cancelled" || order.status === "rejected";
  const isDelivered = order?.status === "delivered";
  const canTip = order?.status === "picked_up" || order?.status === "delivered";
  const items = displayOrder.order_items || displayOrder.items || [];
  const subtotal = displayOrder.subtotal || 0;
  const deliveryFee = displayOrder.delivery_fee ?? 20;
  const total = displayOrder.total || subtotal + deliveryFee;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={od.backdrop} onPress={onClose}>
        <Pressable style={od.sheet} onPress={() => { }}>
          <View style={od.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* ── Order number row (compact) — first ── */}
            <View style={od.orderNumRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="package" size={14} color={C.gray400} />
                <Text style={od.orderNumCompact}>
                  {order.order_number || `#${order.id?.toString().slice(-6).toUpperCase()}`}
                </Text>
              </View>
              <Text style={od.orderDateCompact}>{formatDate(order.created_at)}</Text>
            </View>

            {/* ── Colored status banner ── */}
            <View style={[od.statusCard, {
              backgroundColor: (() => {
                const s = order?.status;
                if (["accepted", "preparing", "ready", "delivered"].includes(s)) return C.green;
                if (s === "picked_up") return "#0E7490";
                if (s === "pending") return "#D97706";
                if (["cancelled", "rejected"].includes(s)) return C.gray500;
                return C.green;
              })()
            }]}>
              <View style={od.statusRow}>
                <View style={od.statusIconBg}>
                  <Feather name={order?.status === "picked_up" ? "truck" : order?.status === "delivered" ? "check-circle" : isFailed ? "x-circle" : "package"} size={26} color={C.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={od.statusLabel}>
                    {order?.status === "delivered" ? "DELIVERED"
                      : isFailed ? (order?.status || "").toUpperCase()
                        : order?.status === "picked_up" ? "OUT FOR DELIVERY"
                          : order?.status === "ready" ? "READY FOR PICKUP"
                            : order?.status === "preparing" ? "PREPARING"
                              : order?.status === "accepted" ? "ACCEPTED"
                                : "ORDER PLACED"}
                  </Text>
                  <Text style={od.statusTitle}>
                    {isActive
                      ? partnerPos?.lat
                        ? (
                          <>
                            {"Arriving in "}
                            <Text style={od.statusEtaBold}>
                              ~{liveEtaMins} {liveEtaMins === 1 ? "min" : "mins"}
                            </Text>
                          </>
                        )
                        : hasDriver
                          ? "Locating driver…"
                          : order?.status === "ready"
                            ? "Waiting for partner assignment…"
                            : order?.status === "pending"
                              ? "Waiting for vendor to confirm…"
                              : "Preparing your order…"
                      : order?.status === "delivered"
                        ? "Order delivered successfully!"
                        : order?.status === "cancelled" || order?.status === "rejected"
                          ? `This order was ${order.status}`
                          : ""}
                  </Text>
                </View>
                {isActive && (
                  <View style={od.statusLivePill}>
                    <Animated.View style={od.statusLiveDot} />
                    <Text style={od.statusLiveText}>LIVE</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={od.body}>
              {/* ── Driver Location Map — only for active delivery statuses ── */}
              {showMap && (
                <DriverLocationMap
                  order={displayOrder}
                  token={token}
                  partnerPos={partnerPos}
                  connected={connected}
                  lastUpdate={lastUpdate}
                />
              )}

              {/* ── TIP & FEEDBACK SECTION ── */}
              {canTip && (
                <View style={od.tipFeedbackCard}>
                  {/* ── Tipping ── */}
                  {!tipSent ? (
                    <>
                      <View style={od.tfHeader}>
                        <View style={od.tfIconBg}>
                          <Feather name="heart" size={18} color={C.orange} />
                        </View>
                        <View>
                          <Text style={od.tfTitle}>{t('orders.tipTitle', 'Show some love')}</Text>
                          <Text style={od.tfSubtitle}>{t('orders.tipSubtitle', 'Thank your delivery partner')}</Text>
                        </View>
                      </View>
                      <View style={od.tipPresets}>
                        {TIP_PRESETS.map((amt) => (
                          <TouchableOpacity
                            key={amt}
                            style={[od.tipPresetBtn, selectedTip === amt && od.tipPresetBtnActive]}
                            onPress={() => { setSelectedTip(amt); setCustomTip(""); }}
                            activeOpacity={0.7}
                          >
                            <Text style={[od.tipPresetRupee, selectedTip === amt && od.tipPresetRupeeActive]}>₹</Text>
                            <Text style={[od.tipPresetAmount, selectedTip === amt && od.tipPresetAmountActive]}>{amt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={od.tipCustomRow}>
                        <View style={od.tipCustomInputWrap}>
                          <Text style={od.tipCurrency}>₹</Text>
                          <TextInput
                            style={od.tipCustomInput}
                            placeholder={t('orders.customTip', 'Custom amount')}
                            placeholderTextColor={C.gray400}
                            keyboardType="number-pad"
                            maxLength={4}
                            value={customTip}
                            onChangeText={(t) => { setCustomTip(t); setSelectedTip(null); }}
                          />
                        </View>
                        <TouchableOpacity
                          style={[od.tipSendBtn, (!(selectedTip || customTip) || tipSending) && { opacity: 0.5 }]}
                          onPress={handleSendTip}
                          disabled={!(selectedTip || customTip) || tipSending}
                          activeOpacity={0.7}
                        >
                          {tipSending ? (
                            <ActivityIndicator size="small" color={C.white} />
                          ) : (
                            <>
                              <Feather name="heart" size={14} color={C.white} />
                              <Text style={od.tipSendBtnText}>{t('orders.sendTip', 'Send Tip')}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <View style={od.tipSuccess}>
                      <Feather name="heart" size={24} color={C.green} />
                      <Text style={od.tipSuccessText}>{t('orders.tipThanks', 'Thank you for tipping!')}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── Delivery Partner Card ── */}
              {hasDriver && isActive && (
                <View style={od.partnerInfoCard}>
                  <View style={od.partnerAvatar}>
                    <Feather name="user" size={22} color={C.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={od.partnerInfoName}>
                      I{`'`}m {partnerName}, your delivery partner
                    </Text>
                    <Text style={od.partnerInfoMsg}>{partnerMsg}</Text>
                  </View>
                  {partnerPhone && (
                    <TouchableOpacity
                      style={od.partnerCallBtn}
                      onPress={() => Linking.openURL(`tel:${partnerPhone}`)}
                      activeOpacity={0.7}
                    >
                      <Feather name="phone" size={18} color={C.white} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ── Order Tracking steps ── */}
              {!isFailed ? (
                <View style={od.trackBox}>
                  <Text style={od.sectionTitle}>Order Tracking</Text>
                  {TRACK_STEPS.map((step, i) => {
                    const done = stepIdx >= 0 && i <= stepIdx;
                    const current = i === stepIdx;
                    const future = !done;
                    return (
                      <View key={step.key} style={od.stepRow}>
                        {/* Vertical connector */}
                        <View style={od.stepLeft}>
                          {i > 0 && (
                            <View
                              style={[
                                od.stepConnector,
                                {
                                  backgroundColor:
                                    i <= stepIdx ? C.green : C.gray200,
                                },
                              ]}
                            />
                          )}
                          {/* Step dot */}
                          <View
                            style={[
                              od.stepDot,
                              done && od.stepDotDone,
                              current && od.stepDotCurrent,
                              future && od.stepDotFuture,
                            ]}
                          >
                            {done ? (
                              <Feather name="check" size={11} color={C.white} />
                            ) : (
                              <Feather
                                name={step.icon}
                                size={11}
                                color={current ? C.green : C.gray300}
                              />
                            )}
                          </View>
                          {/* Line below (not for last) */}
                          {i < TRACK_STEPS.length - 1 && (
                            <View
                              style={[
                                od.stepConnectorBelow,
                                {
                                  backgroundColor:
                                    i < stepIdx ? C.green : C.gray200,
                                },
                              ]}
                            />
                          )}
                        </View>
                        {/* Step label */}
                        <View style={od.stepContent}>
                          <Text
                            style={[
                              od.stepLabel,
                              done && { color: C.gray900, fontWeight: "700" },
                              current && { color: C.green, fontWeight: "800" },
                              future && { color: C.gray400 },
                            ]}
                          >
                            {step.label}
                          </Text>
                          {current && (
                            <View style={od.stepCurrentBadge}>
                              <View style={od.stepCurrentDot} />
                              <Text style={od.stepCurrentText}>
                                Current status
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                /* Failed / cancelled state */
                <View style={od.failedBox}>
                  <View style={od.failedIcon}>
                    <Feather name="x-circle" size={28} color={C.red} />
                  </View>
                  <Text style={od.failedTitle}>
                    Order{" "}
                    {order.status === "rejected" ? "Rejected" : "Cancelled"}
                  </Text>
                  {order.cancellation_reason ? (
                    <Text style={od.failedReason}>
                      {order.cancellation_reason}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* ── Items ── */}
              <Text style={od.sectionTitle}>Items ({items.length})</Text>
              {items.map((item, i) => {
                const p = item.product || {};
                const name = item.product_name || p.name || "Item";
                const price = item.product_price || p.price || item.price || 0;
                const qty = item.quantity || 1;
                const pid = item.product_id;
                const alreadyRated = pid && itemRatingsMap[pid]?.ratedInOrder;
                return (
                  <View key={i}>
                    <View style={od.itemRow}>
                      <Image
                        source={{
                          uri:
                            p.image_url ||
                            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                        }}
                        style={od.itemImg}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={od.itemName} numberOfLines={2}>
                          {name}
                        </Text>
                        <Text style={od.itemUnit}>
                          {p.unit || item.unit || "1 pc"}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={od.itemQty}>×{qty}</Text>
                        <Text style={od.itemPrice}>₹{price * qty}</Text>
                      </View>
                    </View>
                    {/* Per-item review display (delivered orders only) */}
                    {isDelivered && pid && itemRatingsLoading && (
                      <View style={od.itemRatingRow}>
                        <ActivityIndicator size="small" color={C.yellow} />
                      </View>
                    )}
                    {isDelivered && pid && !itemRatingsLoading && alreadyRated && (
                      <View style={od.itemRatingRow}>
                        <View>
                          <View style={od.itemRatingDone}>
                            <Text style={od.itemRatingDoneText}>Rated </Text>
                            {[1, 2, 3, 4, 5].map(s => (
                              <MaterialIcons
                                key={s}
                                name={s <= (itemRatingsMap[pid]?.myRatingInOrder || 0) ? "star" : "star-outline"}
                                size={14}
                                color={s <= (itemRatingsMap[pid]?.myRatingInOrder || 0) ? "#F59E0B" : "#D1D5DB"}
                              />
                            ))}
                          </View>
                          {itemRatingsMap[pid]?.myComment && (
                            <Text style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic", marginLeft: 4, marginTop: 2 }}>
                              {itemRatingsMap[pid].myComment}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* ── Bill ── */}
              <View style={od.billBox}>
                <Text style={od.sectionTitle}>Bill Summary</Text>
                <View style={od.billRow}>
                  <Text style={od.billLbl}>Items total</Text>
                  <Text style={od.billVal}>₹{subtotal}</Text>
                </View>
                <View style={od.billRow}>
                  <Text style={od.billLbl}>Delivery fee</Text>
                  <Text
                    style={[
                      od.billVal,
                      deliveryFee === 0 && { color: C.green },
                    ]}
                  >
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </Text>
                </View>
                <View style={[od.billRow, od.billTotal]}>
                  <Text style={od.billTotalLbl}>Total paid</Text>
                  <Text style={od.billTotalVal}>₹{total}</Text>
                </View>

                {/* GST Breakdown if available */}
                {displayOrder.gst_amount > 0 && (
                  <View
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: C.gray100,
                      borderStyle: "dashed",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.gray400,
                        textAlign: "right",
                      }}
                    >
                      Includes ₹{displayOrder.gst_amount} GST (5%)
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Invoice Button ── */}
              {displayOrder.status !== "pending" && (
                <TouchableOpacity
                  style={[od.invoiceBtn, generating && { opacity: 0.7 }]}
                  onPress={handleDownloadInvoice}
                  disabled={generating || fetching}
                >
                  {generating ? (
                    <ActivityIndicator size="small" color={C.green} />
                  ) : (
                    <>
                      <Feather name="file-text" size={16} color={C.green} />
                      <Text style={od.invoiceBtnText}>Download Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* ── Delivery address ── */}
              {displayOrder.delivery_address && (
                <View style={od.addressBox}>
                  <View style={od.addressIcon}>
                    <Feather name="map-pin" size={14} color={C.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={od.addressLbl}>Delivery address</Text>
                    <Text style={od.addressVal}>
                      {(() => {
                        const line = displayOrder.delivery_address?.address_line ||
                          (typeof displayOrder.delivery_address === "string" ? displayOrder.delivery_address : "");
                        const city = displayOrder.delivery_address?.city || "";
                        // Only show city if it's not already mentioned in the address line
                        const shouldAppendCity = city && !line.toLowerCase().includes(city.toLowerCase());
                        return shouldAppendCity ? `${line}, ${city}` : line;
                      })()}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Payment ── */}
              {displayOrder.payment && (
                <View style={od.paymentRow}>
                  <Feather name="credit-card" size={14} color={C.gray500} />
                  <Text style={od.paymentText}>
                    {displayOrder.payment.method?.toUpperCase() || "UPI"}
                    {" · "}
                    <Text
                      style={{
                        color:
                          displayOrder.payment.status === "paid" ? C.green : C.gray500,
                        fontWeight: "700",
                      }}
                    >
                      {displayOrder.payment.status === "paid" ? "Paid" : "Pending"}
                    </Text>
                  </Text>
                </View>
              )}

              {/* ── Track button — shown when order is active/out-for-delivery ── */}
              {["accepted", "preparing", "ready", "picked_up"].includes(
                order.status,
              ) &&
                (order.delivery_partner_id || order.delivery_partner) && (
                  <TouchableOpacity
                    style={od.trackBtn}
                    onPress={() => {
                      onClose();
                      navigation.navigate("TrackOrder", {
                        orderId: order.id,
                        orderNumber:
                          order.order_number ||
                          `#${String(order.id).slice(-6).toUpperCase()}`,
                      });
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#0891B2", "#0E7490"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={od.trackBtnGrad}
                    >
                      <Feather name="navigation" size={16} color="#fff" />
                      <Text style={od.trackBtnText}>
                        Track Partner
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

              <View style={{ height: 24 }} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const od = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.gray300,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  // Polished status header (colored banner)
  statusCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusCardDelivered: {
    backgroundColor: C.green,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconGreen: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusIconBlue: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusIconRed: { backgroundColor: "rgba(255,255,255,0.18)" },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: C.white,
    lineHeight: 21,
  },
  statusEtaBold: {
    fontSize: 20,
    fontWeight: "900",
    color: C.white,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  statusLivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.white,
  },
  statusLiveText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.8,
  },
  // Compact order number row
  orderNumRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  orderNumCompact: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray600,
    paddingVertical: 4,
    paddingLeft: 4,
  },
  orderDateCompact: {
    fontSize: 11,
    color: C.gray400,
    paddingVertical: 4,
    paddingRight: 4,
  },
  // Partner info card
  partnerInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.greenBorder,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  partnerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerInfoName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.gray900,
    marginBottom: 3,
  },
  partnerInfoMsg: {
    fontSize: 12,
    color: C.gray500,
    lineHeight: 17,
  },
  partnerCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  body: { padding: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.gray900,
    marginBottom: 14,
    marginTop: 4,
  },

              {/* ── Delivery address ── */}
              {displayOrder.delivery_address && (
                <View style={od.addressBox}>
                  <View style={od.addressIcon}>
                    <Feather name="map-pin" size={14} color={C.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={od.addressLbl}>Delivery address</Text>
                    <Text style={od.addressVal}>
                      {(() => {
                        const line = displayOrder.delivery_address?.address_line ||
                          (typeof displayOrder.delivery_address === "string" ? displayOrder.delivery_address : "");
                        const city = displayOrder.delivery_address?.city || "";
                        // Only show city if it's not already mentioned in the address line
                        const shouldAppendCity = city && !line.toLowerCase().includes(city.toLowerCase());
                        return shouldAppendCity ? `${line}, ${city}` : line;
                      })()}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Payment ── */}
              {displayOrder.payment && (
                <View style={od.paymentRow}>
                  <Feather name="credit-card" size={14} color={C.gray500} />
                  <Text style={od.paymentText}>
                    {displayOrder.payment.method?.toUpperCase() || "UPI"}
                    {" · "}
                    <Text
                      style={{
                        color:
                          displayOrder.payment.status === "paid" ? C.green : C.gray500,
                        fontWeight: "700",
                      }}
                    >
                      {displayOrder.payment.status === "paid" ? "Paid" : "Pending"}
                    </Text>
                  </Text>
                </View>
              )}

  // Items
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  itemImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.gray100,
  },
  itemName: { fontSize: 14, fontWeight: "600", color: C.gray900 },
  itemUnit: { fontSize: 12, color: C.gray400, marginTop: 2 },
  itemQty: { fontSize: 12, color: C.gray500, fontWeight: "600" },
  itemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: C.gray900,
    marginTop: 2,
  },
  itemRatingRow: {
    paddingLeft: 60,
    paddingBottom: 8,
  },
  itemRatingDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  itemRatingDoneText: {
    fontSize: 12,
    color: C.green,
    fontWeight: "600",
    marginRight: 2,
  },
  itemRatingInteractive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  itemRatingLabel: {
    fontSize: 12,
    color: C.gray500,
    fontWeight: "600",
    marginRight: 2,
  },
  submitRatingsBtn: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  submitRatingsBtnText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "700",
  },

  // Bill
  billBox: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.gray100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  statusIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  statusTitleText: {
    fontSize: 16,
    fontWeight: "800",
    color: C.gray900,
    letterSpacing: -0.2,
  },
  subheadText: {
    fontSize: 13,
    color: C.gray500,
    marginTop: 2,
    fontWeight: "500",
  },
  menuBtn: {
    padding: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: C.gray100,
  },
  thumbsContainer: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  thumbBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gray100,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  thumbMoreBox: {
    backgroundColor: C.gray100,
    borderColor: C.gray200,
  },
  thumbMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray600,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.green,
  },
  actionDivider: {
    width: 1,
    height: "100%",
    backgroundColor: C.gray100,
  },

  // ETA chip
  etaChipRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 2,
  },
  etaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: dkBg("#FFF7ED", isDark),
    borderWidth: 1,
    borderColor: dkBorder("#FED7AA", isDark),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  etaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.orangeDark,
  },

  // ── Tip & Feedback Modal Styles ──
  tipFeedbackCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.gray200,
    marginBottom: 16,
  },
  tfHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  tfIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  tfTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.gray900,
  },
  tfSubtitle: {
    fontSize: 12,
    color: C.gray500,
  },
  tipPresets: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  tipPresetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    borderWidth: 2,
    borderColor: C.greenBorder,
  },
  tipPresetBtnActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  tipPresetRupee: {
    fontSize: 13,
    fontWeight: "700",
    color: C.green,
  },
  tipPresetRupeeActive: {
    color: "rgba(255,255,255,0.8)",
  },
  tipPresetAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: C.greenDark,
    marginTop: 2,
  },
  tipPresetAmountActive: {
    color: C.white,
  },
  tipCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tipCustomInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.gray100,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  tipCurrency: {
    fontSize: 17,
    fontWeight: "700",
    color: C.gray500,
    marginRight: 4,
  },
  tipCustomInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: C.gray900,
    paddingVertical: 0,
  },
  tipSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.green,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 14,
  },
  tipSendBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white,
  },
  tipSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  tipSuccessText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.green,
  },
  tfDivider: {
    height: 1,
    backgroundColor: C.gray100,
    marginVertical: 16,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feedbackInput: {
    flex: 1,
    backgroundColor: C.gray100,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: C.gray900,
  },
  feedbackSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Order Card ───────────────────────────────────────────────────────────────
const formatCardDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;

  return `${datePart}, ${hours}:${minutesStr} ${ampm}`;
};


function OrderCard({ order, onPress, onRate, onViewRating, alreadyRated, onReorder, onDownloadInvoice, isFirstDelivered }) {
  const { t } = useTranslation();
  const st = getStatus(order.status, isDark);
  const stepIdx = stepIndex(order.status);
  const items = order.order_items || order.items || [];
  const subtotal = order.subtotal || 0;
  const total = order.total || subtotal;
  const isFailed = order.status === "cancelled" || order.status === "rejected";

  let statusTitle = st.label;
  if (order.status === "delivered") {
    const createdTs = order.created_at ? new Date(order.created_at) : null;
    const deliveredTs = order.actual_delivery_time
      ? new Date(order.actual_delivery_time)
      : order.delivery?.delivered_at
        ? new Date(order.delivery.delivered_at)
        : null;
    if (createdTs && deliveredTs) {
      const elapsedMins = Math.round((deliveredTs - createdTs) / 60000);
      statusTitle = `Arrived in ${elapsedMins} ${elapsedMins === 1 ? 'minute' : 'minutes'}`;
    } else {
      statusTitle = "Delivered";
    }
    const mins = order.delivery_time_mins || (10 + (order.id % 15));
    statusTitle = t('orders.arrivedInMins', { mins, defaultValue: `Arrived in ${mins} minutes` });
  } else if (order.status === "picked_up") {
    statusTitle = t('orders.arrivingSoon', 'Arriving soon / Out for delivery');
  } else if (order.status === "preparing") {
    statusTitle = t('orders.preparingInShop', 'Preparing in shop');
  } else if (order.status === "ready") {
    statusTitle = t('orders.readyForPickup', 'Ready for pickup');
  } else if (order.status === "accepted") {
    statusTitle = t('orders.orderAccepted', 'Order accepted');
  } else if (order.status === "pending") {
    statusTitle = t('orders.orderPlaced', 'Order placed');
  }

  let iconBg = C.greenLight;
  let iconColor = C.green;
  let iconName = "check";

  if (isFailed) {
    iconBg = C.redLight;
    iconColor = C.red;
    iconName = "x";
  } else if (order.status === "pending") {
    iconBg = "#FEF3C7";
    iconColor = "#D97706";
    iconName = "clock";
  } else if (order.status === "accepted") {
    iconBg = "#EFF6FF";
    iconColor = "#2563EB";
    iconName = "check-circle";
  } else if (order.status === "preparing") {
    iconBg = "#F5F3FF";
    iconColor = "#7C3AED";
    iconName = "package";
  } else if (order.status === "ready" || order.status === "picked_up") {
    iconBg = "#ECFEFF";
    iconColor = "#0891B2";
    iconName = order.status === "picked_up" ? "truck" : "star";
  }

  const showDownloadInvoice = order.status === "delivered" && isFirstDelivered;

  // ETA chip — prefers distance-based haversine ETA (matches live tracking calc),
  // then server estimate, then stage-based fallback
  let etaMins = null;
  if (ACTIVE_ETA_STATUSES.includes(order.status)) {
    if (order.delivery_distance_km != null) {
      etaMins = Math.max(2, Math.round(order.delivery_distance_km * 4));
    } else if (order.delivery_estimate_mins != null) {
      etaMins = order.delivery_estimate_mins;
    } else {
      if (order.status === 'picked_up') etaMins = 15;
      else if (order.status === 'ready') etaMins = 20;
      else etaMins = 30;
    }
  }
  const showETA = etaMins != null;
  const etaLabel = showETA ? getETALabel(order.status, etaMins) : null;
  const distKm = order.delivery_distance_km ?? null;


  return (
    <View style={oc.card}>
      {/* Top row */}
      <TouchableOpacity style={oc.topRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[oc.statusIconBg, { backgroundColor: iconBg }]}>
          <Feather name={iconName} size={20} color={iconColor} />
        </View>
        <View style={oc.headerTextContainer}>
          <Text style={oc.statusTitleText}>{statusTitle}</Text>
          <Text style={oc.subheadText}>₹{total} • {formatCardDate(order.created_at)}</Text>
        </View>
        <TouchableOpacity style={oc.menuBtn} onPress={onPress}>
          <Feather name="more-vertical" size={20} color={C.gray500} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* ETA Chip — only for active orders */}
      {showETA && (
        <View style={oc.etaChipRow}>
          <View style={oc.etaChip}>
            <Feather name="clock" size={12} color={C.orange} />
            <Text style={oc.etaChipText}>{etaLabel}</Text>
            {distKm != null && (
              <Text style={oc.etaDistText}>· {t('orders.kmAway', { dist: distKm, defaultValue: `${distKm} km` })}</Text>
            )}
          </View>
        </View>
      )}

      {/* Divider */}
      <View style={oc.cardDivider} />

      {/* Thumbnails list */}
      {items.length > 0 && (
        <TouchableOpacity style={oc.thumbsContainer} onPress={onPress} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {items.slice(0, 4).map((item, i) => {
              const p = item.product || {};
              const imgUri =
                p.image_url ||
                item.product_image ||
                item.image_url ||
                item.image ||
                p.image ||
                "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100";
              return (
                <View key={i} style={oc.thumbBox}>
                  <Image
                    source={{ uri: imgUri }}
                    style={oc.thumbImg}
                    resizeMode="cover"
                  />
                </View>
              );
            })}
            {items.length > 4 && (
              <View style={[oc.thumbBox, oc.thumbMoreBox]}>
                <Text style={oc.thumbMoreText}>+{items.length - 4}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Divider */}
      <View style={oc.cardDivider} />

      {/* Actions Row */}
      <View style={oc.actionsRow}>
        {order.status === "delivered" ? (
          <>
            {showDownloadInvoice ? (
              <TouchableOpacity style={oc.actionBtn} onPress={onDownloadInvoice} activeOpacity={0.7}>
                <Text style={oc.actionBtnText}>{t('orders.downloadInvoice', 'Download invoice')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={oc.actionBtn} onPress={onReorder} activeOpacity={0.7}>
                <Text style={oc.actionBtnText}>{t('orders.reorder', 'Reorder')}</Text>
              </TouchableOpacity>
            )}

            <View style={oc.actionDivider} />

            {(() => {
              const ratingVal = order.user_rating || order.rating || (order.reviews?.[0]?.vendor_rating);
              const num = ratingVal ? parseInt(ratingVal, 10) || 5 : 5;
              const starsText = "★".repeat(Math.max(1, Math.min(5, num)));
              return (
                <TouchableOpacity
                  style={oc.actionBtn}
                  onPress={alreadyRated ? () => onViewRating(order) : onRate}
                  activeOpacity={0.7}
                >
                  {alreadyRated ? (
                    <Text style={[oc.actionBtnText, { color: C.gray600 }]}>
                      You rated <Text style={{ color: C.yellow, fontWeight: "900" }}>{starsText}</Text>
                    </Text>
                  ) : (
                    <Text style={oc.actionBtnText}>
                      {t('orders.rateOrder', 'Rate order')}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })()}
          </>
        ) : (
          <>
            {["accepted", "preparing", "ready", "picked_up"].includes(order.status) &&
              (order.delivery_partner_id || order.delivery_partner) ? (
              <TouchableOpacity style={oc.actionBtn} onPress={onPress} activeOpacity={0.7}>
                <Text style={oc.actionBtnText}>{t('orders.trackOrder', 'Track Order')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={oc.actionBtn} onPress={onPress} activeOpacity={0.7}>
                <Text style={oc.actionBtnText}>{t('orders.viewDetails', 'View Details')}</Text>
              </TouchableOpacity>
            )}

            <View style={oc.actionDivider} />

            <TouchableOpacity style={oc.actionBtn} onPress={onPress} activeOpacity={0.7}>
              <Text style={oc.actionBtnText}>{t('orders.support', 'Support')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}



// ═════════════════════════════════════════════════════════════════════════════
export default function MyOrdersScreen() {
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;
  const s = useMemo(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontSize: 15, color: C.gray400, fontWeight: "500" },

  header: {
    paddingTop: Platform.OS === "android" ? 36 : 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: isDark ? C.bg : C.surface,
  },
  backBtn: {
    width: isDark ? 40 : 38,
    height: isDark ? 40 : 38,
    borderRadius: isDark ? 12 : 19,
    backgroundColor: isDark ? C.surface : C.gray100,
    borderWidth: isDark ? 1 : 0,
    borderColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: C.gray900, 
    flex: 1,
    letterSpacing: -0.5,
  },
  refreshBtn: {
    width: isDark ? undefined : 38,
    height: isDark ? 40 : 38,
    paddingHorizontal: isDark ? 16 : 0,
    flexDirection: "row",
    gap: 8,
    borderRadius: isDark ? 12 : 19,
    backgroundColor: isDark ? C.surface : C.gray100,
    borderWidth: isDark ? 1 : 0,
    borderColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: { fontSize: 13.5, fontWeight: "700", color: C.gray800 },

  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: isDark ? 14 : 12,
    backgroundColor: isDark ? C.bg : C.surface,
    borderBottomWidth: isDark ? 0 : 1,
    borderBottomColor: C.gray100,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: isDark ? C.surface : C.gray100,
    borderRadius: isDark ? 14 : 12,
    borderWidth: isDark ? 1 : 0,
    borderColor: C.gray100,
    paddingHorizontal: isDark ? 16 : 12,
    height: isDark ? 52 : 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.gray900,
    fontWeight: "600",
    padding: 0,
    outlineStyle: "none",
  },
  clearBtn: {
    padding: 4,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: isDark ? C.bg : C.surface,
    paddingHorizontal: 16,
    paddingVertical: isDark ? 14 : 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: isDark ? 20 : 16,
    paddingVertical: isDark ? 10 : 8,
    borderRadius: isDark ? 12 : 20,
    borderWidth: isDark ? 1 : 1.5,
    borderColor: isDark ? C.gray100 : C.gray200,
    backgroundColor: isDark ? C.surface : "transparent",
  },
  tabActive: isDark
    ? { backgroundColor: C.greenMid, borderColor: C.greenBorder }
    : { backgroundColor: C.green, borderColor: C.green },
  tabLabel: { fontSize: 13, fontWeight: isDark ? "700" : "600", color: isDark ? C.gray800 : C.gray600 },
  tabLabelActive: { color: C.white },
  tabBubble: {
    backgroundColor: C.gray100,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBubbleActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBubbleText: { fontSize: 10, fontWeight: "800", color: C.gray500 },
  tabBubbleTextActive: { color: C.white },

  list: { padding: 16, paddingTop: 12 },

  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.greenLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  activeBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  activeBannerText: { fontSize: 13, color: C.green, fontWeight: "600" },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyIllo: { width: 170, height: 150, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyIlloCircle: { position: "absolute", top: 0, width: 136, height: 136, borderRadius: 68, backgroundColor: C.surface, borderWidth: 1, borderColor: C.gray100 },
  emptyIlloBag: { position: "absolute", top: 30, width: 66, height: 78, borderRadius: 8, backgroundColor: C.gray200, alignItems: "center", justifyContent: "center" },
  emptyIlloGround: { position: "absolute", bottom: 10, width: 164, height: 2, borderRadius: 1, backgroundColor: C.gray200 },
  emptyIlloLeafL: { position: "absolute", bottom: 12, left: 4, transform: [{ rotate: "-20deg" }] },
  emptyIlloLeafR: { position: "absolute", bottom: 12, right: 4, transform: [{ scaleX: -1 }, { rotate: "-20deg" }] },
  emptySpark: { position: "absolute", fontSize: 11, color: C.gray300 },
  emptyTitle: {
    fontSize: isDark ? 22 : 20,
    fontWeight: isDark ? "900" : "800",
    color: isDark ? C.gray900 : C.gray800,
    textAlign: "center",
  },
  emptySub: {
    fontSize: isDark ? 15 : 14,
    color: isDark ? C.gray500 : C.gray400,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
  },
  shopBtn: { borderRadius: isDark ? 12 : 14, overflow: "hidden" },
  shopBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: isDark ? 32 : 28,
    paddingVertical: isDark ? 17 : 14,
  },
  shopBtnText: { fontSize: 16, fontWeight: "800", color: C.white },
}), [C]);
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const { addItem, updateQty, clearCart } = useCartStore();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [detailOrder, setDetailOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewMode, setReviewMode] = useState(null); // null | "select" | "product" | "shop"
  const [viewRatingOrder, setViewRatingOrder] = useState(null);
  const [viewRatingLoading, setViewRatingLoading] = useState(false);
  const [fetchedRating, setFetchedRating] = useState(null);
  const [storeRating, setStoreRating] = useState(0);
  const [storeComment, setStoreComment] = useState("");
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [deliveryComment, setDeliveryComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [shopFeedback, setShopFeedback] = useState("");
  const [productRatings, setProductRatings] = useState({});
  const [productComments, setProductComments] = useState({});
  const [productRatingsSubmitting, setProductRatingsSubmitting] = useState(false);

  const handleOpenViewRating = async (order) => {
    setViewRatingOrder(order);
    setViewRatingLoading(true);
    const rev = order.reviews?.[0] || {};
    const initialStoreRating = order.user_rating || order.rating || rev.vendor_rating || null;
    const initialStoreComment = order.review_comment || rev.comment || "";
    const initialDeliveryRating = rev.partner_rating || null;
    const initialDeliveryComment = rev.partner_comment || "";

    setFetchedRating({
      storeRating: initialStoreRating,
      storeComment: initialStoreComment,
      deliveryRating: initialDeliveryRating,
      deliveryComment: initialDeliveryComment
    });

    try {
      const res = await fetch(`${BASE_URL}/orders/${order.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const o = data.data?.order || data.order;
      if (o) {
        const oRev = o.reviews?.[0] || {};
        setFetchedRating({
          storeRating: o.user_rating ?? oRev.vendor_rating ?? initialStoreRating,
          storeComment: o.review_comment ?? oRev.comment ?? initialStoreComment,
          deliveryRating: oRev.partner_rating ?? initialDeliveryRating,
          deliveryComment: oRev.partner_comment ?? initialDeliveryComment,
        });
      }
    } catch (e) {
      console.error("Fetch rating error:", e);
    } finally {
      setViewRatingLoading(false);
    }
  };

  const submitReview = async () => {
    if (storeRating === 0) {
      Alert.alert("Please select a store rating");
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/orders/${reviewOrder.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendor_rating: storeRating,
          comment: storeComment,
          partner_rating: deliveryRating > 0 ? deliveryRating : null,
          partner_comment: deliveryComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const currentOrderId = reviewOrder.id;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === currentOrderId
              ? { ...o, has_reviewed: true, user_rating: storeRating }
              : o
          )
        );
        setReviewOrder(null);
        setStoreRating(0);
        setStoreComment("");
        setDeliveryRating(0);
        setDeliveryComment("");
        fetchOrders(true);
        Alert.alert("Thank you!", "Shop review submitted.");
      } else {
        Alert.alert("Error", data.message || "Failed to submit review.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to submit review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const submitProductReviews = async () => {
    const items = reviewOrder.order_items || reviewOrder.items || [];
    const orderId = reviewOrder.id;
    const toSubmit = items
      .map((item) => {
        const pid = item.product_id;
        if (!pid) return null;
        const r = productRatings[pid];
        if (!r) return null;
        return {
          product_id: pid,
          rating: r,
          order_id: orderId,
          ...(productComments[pid]?.trim() ? { comment: productComments[pid].trim() } : {}),
        };
      })
      .filter(Boolean);

    if (toSubmit.length === 0) {
      Alert.alert("Please rate at least one product");
      return;
    }
    setProductRatingsSubmitting(true);
    try {
      const res = await productReviewsAPI.submitBulk(toSubmit, token);
      if (res.success) {
        const currentOrderId = reviewOrder.id;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === currentOrderId
              ? { ...o, has_reviewed: true }
              : o
          )
        );
        setReviewOrder(null);
        setReviewMode(null);
        setProductRatings({});
        setProductComments({});
        Alert.alert("Thank you!", "Product ratings submitted.");
      } else {
        Alert.alert("Error", res.message || "Failed to submit ratings.");
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to submit ratings.");
    } finally {
      setProductRatingsSubmitting(false);
    }
  };

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/orders/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.data?.orders || data.data || data.orders || [];

        setOrders(list);

        // ── Sync detailOrder if it's open ──
        setDetailOrder((prev) => {
          if (!prev) return null;
          const updated = list.find((o) => o.id === prev.id);
          return updated ? { ...updated } : prev;
        });
      } catch (e) {
        console.error("MyOrders:", e.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => console.log("[OrdersWS] Connected"));

    // Listen for any order updates for this user
    socket.on("order:update", (data) => {
      console.log("[OrdersWS] Order update received", data);
      fetchOrders(true);
      // If the detail modal is open for this order, it will refresh too because it uses the order object from the list
    });

    socket.on("delivery_status_update", (data) => {
      console.log("[OrdersWS] Delivery update received", data);
      fetchOrders(true);
    });

    return () => socket.disconnect();
  }, [token, fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  // Active = any non-terminal status
  const ACTIVE_STATUSES = [
    "pending",
    "accepted",
    "preparing",
    "ready",
    "picked_up",
  ];
  const PAST_STATUSES = ["delivered", "cancelled", "rejected"];

  const handleReorder = (order) => {
    const items = order.order_items || order.items || [];
    if (items.length === 0) {
      Alert.alert("Error", "No items found in this order to reorder.");
      return;
    }

    const vendorId = order.vendor_id || order.vendor?.id;

    // Clear cart first so we can fill it with the reordered items cleanly
    clearCart();

    // Add each item
    items.forEach(item => {
      const p = item.product || {};
      const name = item.product_name || p.name || "Item";
      const price = item.product_price || p.price || item.price || 0;
      const qty = item.quantity || 1;
      const prod = {
        id: p.id || item.product_id,
        name: name,
        price: price,
        image: p.image_url,
        unit: p.unit || item.unit || "1 pc"
      };

      addItem(prod, vendorId);
      if (qty > 1) {
        updateQty(prod.id, qty);
      }
    });

    Alert.alert(
      "Reordered!",
      "All items have been added to your cart.",
      [
        {
          text: "Go to Cart",
          onPress: () => navigation.navigate("Cart")
        },
        {
          text: "OK",
          style: "cancel"
        }
      ]
    );
  };

  const filtered = orders.filter((o) => {
    if (activeTab === "active" && !ACTIVE_STATUSES.includes(o.status)) return false;
    if (activeTab === "past" && !PAST_STATUSES.includes(o.status)) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const shopName = (o.vendor?.shop_name || o.vendor_name || "").toLowerCase();
      const orderNum = (o.order_number || o.id?.toString() || "").toLowerCase();

      const matchesShop = shopName.includes(query);
      const matchesOrderNum = orderNum.includes(query);

      const items = o.order_items || o.items || [];
      const matchesItems = items.some(item => {
        const name = (item.product_name || item.product?.name || "").toLowerCase();
        return name.includes(query);
      });

      return matchesShop || matchesOrderNum || matchesItems;
    }

    return true;
  });

  const activeCount = orders.filter((o) =>
    ACTIVE_STATUSES.includes(o.status),
  ).length;
  const pastCount = orders.filter((o) =>
    PAST_STATUSES.includes(o.status),
  ).length;

  const goBack = () => navigation.goBack();

  const firstDelivered = filtered.find(o => o.status === "delivered");
  const firstDeliveredId = firstDelivered ? firstDelivered.id : null;

  const handleDownloadInvoice = async (order) => {
    if (!order) return;
    try {
      await downloadInvoice(order.id, order.order_number || order.id);
    } catch (e) {
      console.error("Invoice download error:", e);
      Alert.alert("Error", "Could not download invoice. Please try again.");
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? 'light-content' : (Platform.OS === 'ios' ? 'dark-content' : 'default')} backgroundColor={isDark ? C.bg : "#FFFFFF"} />


{/* HEADER */}
<View style={s.header}>
  <TouchableOpacity
    style={s.backBtn}
    onPress={goBack}
    activeOpacity={0.8}
  >
    <Feather name="arrow-left" size={22} color={C.greenDark} />
  </TouchableOpacity>

  <View style={s.headerTextWrap}>
    <Text style={s.headerTitle}>
      {t('orders.myOrders', 'My Orders') || 'My Orders'}
    </Text>
    <Text style={s.headerSubtitle}>
      Track, manage, and revisit your grocery orders
    </Text>
  </View>

  <TouchableOpacity
    style={s.refreshBtn}
    onPress={() => fetchOrders(true)}
    activeOpacity={0.8}
  >
    <Feather name="refresh-cw" size={19} color={C.greenDark} />
  </TouchableOpacity>
</View>


      {/* SEARCH BAR */}
      <View style={s.searchBarContainer}>
        <View style={s.searchBar}>
          <Feather name="search" size={18} color={C.gray400} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder={t('orders.searchPlaceholder', 'Search your grocery orders')}
            placeholderTextColor={isDark ? C.gray500 : C.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={s.clearBtn}>
              <Feather name="x" size={16} color={C.gray400} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* TABS */}
      <View style={s.tabs}>
        {[
          { key: "all", label: t('orders.tabAll', 'All'), count: orders.length },
          { key: "active", label: t('orders.active', 'Active'), count: activeCount },
          { key: "past", label: t('orders.past', 'Past'), count: pastCount },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}
            >
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View
                style={[
                  s.tabBubble,
                  activeTab === tab.key && s.tabBubbleActive,
                ]}
              >
                <Text
                  style={[
                    s.tabBubbleText,
                    activeTab === tab.key && s.tabBubbleTextActive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* BODY */}

{loading ? (
  <View style={s.centered}>
    <ActivityIndicator size="large" color={C.green} />
    <Text style={s.loadingText}>
      {t('orders.fetchingOrders', 'Fetching your orders…')}
    </Text>
  </View>
) : filtered.length === 0 ? (
  <View style={s.emptyWrap}>
    <View style={s.emptyIconWrap}>
      <Image
        source={require("../../../assets/orders-empty.png")}
        style={s.emptyIllustration}
        resizeMode="contain"
      />
    </View>

    <Text style={s.emptyTitle}>
      {activeTab === "active"
        ? t('orders.noActiveOrders', 'No active orders')
        : activeTab === "past"
          ? t('orders.noPastOrders', 'No past orders')
          : t('orders.noOrders', 'No orders yet')}
    </Text>

    <Text style={s.emptySub}>
      {activeTab === "all"
        ? "Your order history will appear here"
        : "Check back later"}
    </Text>

    {activeTab === "all" && (
      <TouchableOpacity
        style={s.shopBtn}
        onPress={() =>
          navigation.navigate("CustomerApp", {
            screen: "CustomerTabNavigator",
            params: { screen: "Home" },
          })
        }
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={[C.green, C.greenDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.shopBtnGrad}
        >
          <Text style={s.shopBtnText}>Start Shopping</Text>
          <Feather name="arrow-right" size={15} color={C.white} />
        </LinearGradient>
      </TouchableOpacity>
    )}
  </View>
) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.green}
            />
          }
        >
          {/* Active orders notice */}
          {activeTab !== "past" && activeCount > 0 && (
            <View style={s.activeBanner}>
              <View style={s.activeBannerDot} />
              <Text style={s.activeBannerText}>
                {activeCount} active order{activeCount !== 1 ? "s" : ""} in
                progress
              </Text>
            </View>
          )}

          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => setDetailOrder(order)}
              onRate={() => {
                setReviewOrder(order);
                setStoreRating(0);
                setStoreComment("");
                setDeliveryRating(0);
                setDeliveryComment("");
              }}
              onViewRating={(o) => handleOpenViewRating(o)}
              alreadyRated={!!order.has_reviewed}
              onReorder={() => handleReorder(order)}
              onDownloadInvoice={() => handleDownloadInvoice(order)}
              isFirstDelivered={order.id === firstDeliveredId}
            />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ORDER DETAIL MODAL */}
      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />

      {/* ── REVIEW MODAL ── */}
      <Modal
        visible={!!reviewOrder}
        animationType="slide"
        transparent
        onRequestClose={() => { setReviewOrder(null); setReviewMode(null); }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => { setReviewOrder(null); setReviewMode(null); }}
        >
          <Pressable
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              maxHeight: "85%",
            }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <View style={{ width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />

            {/* ═══════ SELECT VIEW ═══════ */}
            {reviewMode === "select" && (
              <>
                <Text style={{ fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 4 }}>
                  Rate Your Order
                </Text>
                <Text style={{ fontSize: 13, color: C.gray400, marginBottom: 20 }}>
                  {reviewOrder?.vendor?.shop_name || "Your order"}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {/* Delivery Rating */}
                  {(reviewOrder?.delivery_partner_id || reviewOrder?.delivery_partner || reviewOrder?.delivery?.partner_id) && (
                    <View style={{ marginBottom: 24 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: C.gray800, marginBottom: 12 }}>
                        Rate delivery
                      </Text>
                      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity key={star} onPress={() => setDeliveryRating(star)}>
                            <Text style={{ fontSize: 32, opacity: star <= deliveryRating ? 1 : 0.25 }}>⭐</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        style={{
                          backgroundColor: C.gray100,
                          borderRadius: 12,
                          padding: 14,
                          fontSize: 14,
                          color: C.gray900,
                          minHeight: 80,
                          textAlignVertical: "top",
                          borderWidth: 1,
                          borderColor: C.gray200,
                        }}
                        placeholder="How was the delivery experience? (optional)"
                        placeholderTextColor={C.gray400}
                        multiline
                        value={deliveryComment}
                        onChangeText={setDeliveryComment}
                      />
                    </View>
                  )}

                  {/* Store Rating */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: C.gray800, marginBottom: 12 }}>
                      Rate store
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setStoreRating(star)}>
                          <Text style={{ fontSize: 32, opacity: star <= storeRating ? 1 : 0.25 }}>⭐</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={{
                        backgroundColor: C.gray100,
                        borderRadius: 12,
                        padding: 14,
                        fontSize: 14,
                        color: C.gray900,
                        minHeight: 80,
                        textAlignVertical: "top",
                        borderWidth: 1,
                        borderColor: C.gray200,
                      }}
                      placeholder="How was the store experience? (optional)"
                      placeholderTextColor={C.gray400}
                      multiline
                      value={storeComment}
                      onChangeText={setStoreComment}
                    />
                  </View>
                </ScrollView>

                <TouchableOpacity
                  onPress={submitShopReview}
                  disabled={reviewLoading || reviewRating === 0}
                  style={{
                    backgroundColor: reviewLoading || reviewRating === 0 ? C.gray200 : C.green,
                    borderRadius: 14,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  {reviewLoading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: "800", color: C.white }}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── VIEW SUBMITTED RATING SLIDE-UP MODAL ── */}
      <Modal
        visible={!!viewRatingOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setViewRatingOrder(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setViewRatingOrder(null)}
        >
          <Pressable
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
            onPress={() => { }}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: C.gray200,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray900 }}>
                Your Submitted Ratings
              </Text>
              <TouchableOpacity onPress={() => setViewRatingOrder(null)} style={{ padding: 4 }}>
                <Feather name="x" size={20} color={C.gray500} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, marginBottom: 20 }}>
              {viewRatingOrder?.vendor?.shop_name || "Your order"} · {formatCardDate(viewRatingOrder?.created_at)}
            </Text>

            {/* Rating Stars & Details Card */}
            {viewRatingLoading ? (
              <View style={{ padding: 30, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={C.green} size="small" />
                <Text style={{ fontSize: 13, color: C.gray400, marginTop: 10 }}>Fetching your review…</Text>
              </View>
            ) : (() => {
              const sRatingVal = fetchedRating?.storeRating ?? viewRatingOrder?.user_rating ?? null;
              const sNum = sRatingVal != null ? (typeof sRatingVal === "number" ? sRatingVal : parseInt(sRatingVal, 10)) : null;
              const sComment = fetchedRating?.storeComment || viewRatingOrder?.review_comment || "";

              const dRatingVal = fetchedRating?.deliveryRating;
              const dNum = dRatingVal != null ? (typeof dRatingVal === "number" ? dRatingVal : parseInt(dRatingVal, 10)) : null;
              const dComment = fetchedRating?.deliveryComment || "";

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                  {/* Store Rating */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: C.gray900, marginBottom: 8, marginLeft: 4 }}>
                      Store: {viewRatingOrder?.vendor?.shop_name || "Store"}
                    </Text>
                    <View
                      style={{
                        backgroundColor: C.gray100,
                        borderWidth: 1,
                        borderColor: C.gray200,
                        borderRadius: 16,
                        padding: 20,
                        alignItems: "center",
                      }}
                    >
                      {sNum !== null ? (
                        <>
                          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text key={star} style={{ fontSize: 36, opacity: star <= sNum ? 1 : 0.25 }}>⭐</Text>
                            ))}
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray900, marginBottom: sComment ? 12 : 0 }}>
                            {sNum} out of 5 stars
                          </Text>
                          {sComment ? (
                            <View style={{ backgroundColor: C.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.gray200, width: "100%" }}>
                              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: C.gray800, lineHeight: 20 }}>{sComment}</Text>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, fontStyle: "italic", marginTop: 4 }}>No written comment provided</Text>
                          )}
                        </>
                      ) : (
                        <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray400 }}>
                          Not Rated
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Delivery Rating */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: C.gray900, marginBottom: 8, marginLeft: 4 }}>
                      Delivery: {viewRatingOrder?.delivery?.partner?.user?.name || viewRatingOrder?.delivery_partner?.user?.name || "Partner"}
                    </Text>
                    <View
                      style={{
                        backgroundColor: C.gray100,
                        borderWidth: 1,
                        borderColor: C.gray200,
                        borderRadius: 16,
                        padding: 20,
                        alignItems: "center",
                      }}
                    >
                      {dNum !== null ? (
                        <>
                          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text key={star} style={{ fontSize: 36, opacity: star <= dNum ? 1 : 0.25 }}>⭐</Text>
                            ))}
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray900, marginBottom: dComment ? 12 : 0 }}>
                            {dNum} out of 5 stars
                          </Text>
                          {dComment ? (
                            <View style={{ backgroundColor: C.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.gray200, width: "100%" }}>
                              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: C.gray800, lineHeight: 20 }}>{dComment}</Text>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, fontStyle: "italic", marginTop: 4 }}>No written comment provided</Text>
                          )}
                        </>
                      ) : (
                        <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray400 }}>
                          Not Rated
                        </Text>
                      )}
                    </View>
                  </View>
                </ScrollView>
              );
            })()}

            <TouchableOpacity
              onPress={() => setViewRatingOrder(null)}
              style={{
                backgroundColor: C.green,
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.white }}>
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontSize: 15, color: C.gray400, fontWeight: "500" },

header: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 24,
  paddingTop: 20,
  paddingBottom: 16,
  gap: 16,
  backgroundColor: "#FFFFFF",
},
backBtn: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: "#F0FAF3",
  borderWidth: 1,
  borderColor: "#D9F3E2",
  alignItems: "center",
  justifyContent: "center",
},
headerTextWrap: {
  flex: 1,
  gap: 3,
},
headerTitle: {
  fontSize: 26,
  fontWeight: "900",
  color: "#123F32",
},
headerSubtitle: {
  fontSize: 14,
  color: "#78909C",
  fontWeight: "500",
},
refreshBtn: {
  width: 52,
  height: 52,
  borderRadius: 26,
  backgroundColor: "#F0FAF3",
  borderWidth: 1,
  borderColor: "#D9F3E2",
  alignItems: "center",
  justifyContent: "center",
},



  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },


searchBar: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#F1F4F8",
  borderRadius: 17,
  paddingHorizontal: 18,
  height: 56,
  borderWidth: 1,
  borderColor: "#EEF1F5",
},


  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.gray900,
    fontWeight: "600",
    padding: 0,
    outlineStyle: "none",
  },
  clearBtn: {
    padding: 4,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },


tab: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 28,
  borderWidth: 1,
  borderColor: "#E4EAF0",
  backgroundColor: "#FFFFFF",
  minHeight: 46,
},
tabActive: {
  backgroundColor: "#079447",
  borderColor: "#079447",
},
tabLabel: {
  fontSize: 15,
  fontWeight: "700",
  color: "#60758A",
},
tabLabelActive: {
  color: "#FFFFFF",
  fontWeight: "800",
},


  tabBubble: {
    backgroundColor: C.gray100,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBubbleActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBubbleText: { fontSize: 10, fontWeight: "800", color: C.gray500 },
  tabBubbleTextActive: { color: C.white },

  list: { padding: 16, paddingTop: 12 },

  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.greenLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  activeBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  activeBannerText: { fontSize: 13, color: C.green, fontWeight: "600" },



emptyWrap: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 24,
  paddingVertical: 32,
  marginHorizontal: 24,
  marginBottom: 20,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#D8F4DE",
  backgroundColor: "#F0FCEF",
  overflow: "hidden",
},
emptyIconWrap: {
  width: 116,
  height: 116,
  borderRadius: 34,
  backgroundColor: "#DDF8E3",
  borderWidth: 1,
  borderColor: "#C9F0D2",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 22,
},


emptyIllustration: {
  width: 320,
  height: 260,
},

emptyTitle: {
  fontSize: 27,
  lineHeight: 34,
  fontWeight: "900",
  color: "#075C3D",
  textAlign: "center",
  letterSpacing: -0.6,
},
emptySub: {
  fontSize: 16,
  lineHeight: 24,
  color: "#56877B",
  fontWeight: "500",
  textAlign: "center",
  marginTop: 8,
  marginBottom: 24,
  maxWidth: 560,
},
shopBtn: {
  borderRadius: 30,
  overflow: "hidden",
  elevation: 4,
  shadowColor: "#075C3D",
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
},
shopBtnGrad: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  paddingHorizontal: 34,
  paddingVertical: 17,
},
shopBtnText: {
  fontSize: 16,
  fontWeight: "800",
  color: "#FFFFFF",
},

});
