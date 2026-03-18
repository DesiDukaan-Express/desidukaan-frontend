import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Platform, StatusBar, Modal, Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../../store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const C = {
  orange:      "#F97316", orangeDark:  "#EA580C",
  green:       "#16A34A", greenDark:   "#15803D",
  greenLight:  "#F0FDF4", greenMid:    "#DCFCE7",
  greenBorder: "#BBF7D0",
  white:       "#FFFFFF", bg:          "#F8FAFC",
  gray100:     "#F3F4F6", gray200:     "#E5E7EB",
  gray300:     "#D1D5DB", gray400:     "#9CA3AF",
  gray500:     "#6B7280", gray600:     "#4B5563",
  gray700:     "#374151", gray800:     "#1F2937",
  gray900:     "#111827",
  red:         "#DC2626", redLight:    "#FEF2F2",
};

// ─── Status config — matches backend OrderStatus enum exactly ─────────────────
// Backend: pending | accepted | preparing | ready | picked_up | delivered | cancelled | rejected
const STATUS = {
  pending:      { label: "Pending",        color: "#D97706", bg: "#FEF3C7", icon: "clock"        },
  accepted:     { label: "Accepted",       color: "#2563EB", bg: "#EFF6FF", icon: "check-circle"  },
  preparing:    { label: "Preparing",      color: "#7C3AED", bg: "#F5F3FF", icon: "package"       },
  ready:        { label: "Ready",          color: "#0891B2", bg: "#ECFEFF", icon: "star"          },
  picked_up:    { label: "Picked Up",      color: "#0891B2", bg: "#ECFEFF", icon: "truck"         },
  delivered:    { label: "Delivered",      color: "#16A34A", bg: "#F0FDF4", icon: "check"         },
  cancelled:    { label: "Cancelled",      color: "#DC2626", bg: "#FEF2F2", icon: "x-circle"      },
  rejected:     { label: "Rejected",       color: "#DC2626", bg: "#FEF2F2", icon: "x-circle"      },
};
const getStatus = (s) => STATUS[s] || STATUS.pending;

// ─── Order lifecycle steps — matches backend transitions ─────────────────────
const TRACK_STEPS = [
  { key: "pending",   label: "Order Placed",    icon: "shopping-bag" },
  { key: "accepted",  label: "Accepted",         icon: "check-circle" },
  { key: "packing", label: "Getting Packed",   icon: "package"      },
  { key: "ready",     label: "Ready to Move", icon: "star"         },
  { key: "picked_up", label: "Out for Delivery", icon: "truck"        },
  { key: "delivered", label: "Delivered",         icon: "home"         },
];

const stepIndex = (status) => {
  // rejected/cancelled don't fit the happy path
  if (status === "rejected" || status === "cancelled") return -1;
  return TRACK_STEPS.findIndex(s => s.key === status);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const formatDateShort = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  if (!order) return null;

  const st         = getStatus(order.status);
  const stepIdx    = stepIndex(order.status);
  const isFailed   = order.status === "cancelled" || order.status === "rejected";
  const items      = order.order_items || order.items || [];
  // Backend stores subtotal, delivery_fee, total separately
  const subtotal   = order.subtotal   || 0;
  const deliveryFee= order.delivery_fee ?? 20;
  const total      = order.total      || subtotal + deliveryFee;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={od.backdrop} onPress={onClose}>
        <Pressable style={od.sheet} onPress={() => {}}>
          <View style={od.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Gradient header */}
            <LinearGradient
              colors={[C.orange, C.orangeDark, C.greenDark, C.green]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={od.sheetHeader}
            >
              <View style={{ flex: 1 }}>
                <Text style={od.orderNum}>
                  {order.order_number || `#${order.id?.toString().slice(-6).toUpperCase()}`}
                </Text>
                <Text style={od.orderDate}>{formatDate(order.created_at)}</Text>
              </View>
              <View style={[od.statusChip, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name={st.icon} size={13} color={C.white} />
                <Text style={od.statusChipText}>{st.label}</Text>
              </View>
            </LinearGradient>

            <View style={od.body}>

              {/* ── Order Tracking steps ── */}
              {!isFailed ? (
                <View style={od.trackBox}>
                  <Text style={od.sectionTitle}>Order Tracking</Text>
                  {TRACK_STEPS.map((step, i) => {
                    const done    = stepIdx >= 0 && i <= stepIdx;
                    const current = i === stepIdx;
                    const future  = !done;
                    return (
                      <View key={step.key} style={od.stepRow}>
                        {/* Vertical connector */}
                        <View style={od.stepLeft}>
                          {i > 0 && (
                            <View style={[od.stepConnector, {
                              backgroundColor: i <= stepIdx ? C.green : C.gray200,
                            }]} />
                          )}
                          {/* Step dot */}
                          <View style={[
                            od.stepDot,
                            done    && od.stepDotDone,
                            current && od.stepDotCurrent,
                            future  && od.stepDotFuture,
                          ]}>
                            {done
                              ? <Feather name="check" size={11} color={C.white} />
                              : <Feather name={step.icon} size={11}
                                  color={current ? C.green : C.gray300} />}
                          </View>
                          {/* Line below (not for last) */}
                          {i < TRACK_STEPS.length - 1 && (
                            <View style={[od.stepConnectorBelow, {
                              backgroundColor: i < stepIdx ? C.green : C.gray200,
                            }]} />
                          )}
                        </View>
                        {/* Step label */}
                        <View style={od.stepContent}>
                          <Text style={[
                            od.stepLabel,
                            done    && { color: C.gray900, fontWeight: "700" },
                            current && { color: C.green,  fontWeight: "800" },
                            future  && { color: C.gray400 },
                          ]}>{step.label}</Text>
                          {current && (
                            <View style={od.stepCurrentBadge}>
                              <View style={od.stepCurrentDot} />
                              <Text style={od.stepCurrentText}>Current status</Text>
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
                    Order {order.status === "rejected" ? "Rejected" : "Cancelled"}
                  </Text>
                  {order.cancellation_reason ? (
                    <Text style={od.failedReason}>{order.cancellation_reason}</Text>
                  ) : null}
                </View>
              )}

              {/* ── Items ── */}
              <Text style={od.sectionTitle}>
                Items ({items.length})
              </Text>
              {items.map((item, i) => {
                const p = item.product || {};
                const name  = item.product_name  || p.name  || "Item";
                const price = item.product_price || p.price || item.price || 0;
                const qty   = item.quantity || 1;
                return (
                  <View key={i} style={od.itemRow}>
                    <Image
                      source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200" }}
                      style={od.itemImg} resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={od.itemName} numberOfLines={2}>{name}</Text>
                      <Text style={od.itemUnit}>{p.unit || item.unit || "1 pc"}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={od.itemQty}>×{qty}</Text>
                      <Text style={od.itemPrice}>₹{price * qty}</Text>
                    </View>
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
                  <Text style={[od.billVal, deliveryFee === 0 && { color: C.green }]}>
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </Text>
                </View>
                <View style={[od.billRow, od.billTotal]}>
                  <Text style={od.billTotalLbl}>Total paid</Text>
                  <Text style={od.billTotalVal}>₹{total}</Text>
                </View>
              </View>

              {/* ── Delivery address ── */}
              {order.delivery_address && (
                <View style={od.addressBox}>
                  <View style={od.addressIcon}>
                    <Feather name="map-pin" size={14} color={C.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={od.addressLbl}>Delivery address</Text>
                    <Text style={od.addressVal}>
                      {order.delivery_address?.address_line || order.delivery_address}
                      {order.delivery_address?.city ? `, ${order.delivery_address.city}` : ""}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Payment ── */}
              {order.payment && (
                <View style={od.paymentRow}>
                  <Feather name="credit-card" size={14} color={C.gray500} />
                  <Text style={od.paymentText}>
                    {order.payment.method?.toUpperCase() || "UPI"}
                    {" · "}
                    <Text style={{ color: order.payment.status === "paid" ? C.green : C.gray500, fontWeight: "700" }}>
                      {order.payment.status === "paid" ? "Paid" : "Pending"}
                    </Text>
                  </Text>
                </View>
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
  backdrop:       { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:          { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", overflow: "hidden" },
  handle:         { width: 40, height: 4, backgroundColor: C.gray300, borderRadius: 2, alignSelf: "center", marginTop: 10 },
  sheetHeader:    { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  orderNum:       { fontSize: 17, fontWeight: "900", color: C.white },
  orderDate:      { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 },
  statusChip:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusChipText: { fontSize: 12, fontWeight: "700", color: C.white },
  body:           { padding: 20 },
  sectionTitle:   { fontSize: 15, fontWeight: "800", color: C.gray900, marginBottom: 14, marginTop: 4 },

  // Tracking
  trackBox:             { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.gray100 },
  stepRow:              { flexDirection: "row", gap: 14, minHeight: 40 },
  stepLeft:             { alignItems: "center", width: 28 },
  stepConnector:        { width: 2, height: 14, marginBottom: 2 },
  stepConnectorBelow:   { width: 2, flex: 1, minHeight: 14, marginTop: 2 },
  stepDot:              { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  stepDotDone:          { backgroundColor: C.green,  borderColor: C.green   },
  stepDotCurrent:       { backgroundColor: C.white,  borderColor: C.green, shadowColor: C.green, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  stepDotFuture:        { backgroundColor: C.gray100, borderColor: C.gray200 },
  stepContent:          { flex: 1, paddingTop: 4, paddingBottom: 12 },
  stepLabel:            { fontSize: 14, fontWeight: "500" },
  stepCurrentBadge:     { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  stepCurrentDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  stepCurrentText:      { fontSize: 11, color: C.green, fontWeight: "600" },

  // Failed
  failedBox:    { alignItems: "center", backgroundColor: C.redLight, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#FCA5A5" },
  failedIcon:   { marginBottom: 10 },
  failedTitle:  { fontSize: 17, fontWeight: "800", color: C.red },
  failedReason: { fontSize: 13, color: C.gray600, marginTop: 6, textAlign: "center" },

  // Items
  itemRow:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  itemImg:      { width: 48, height: 48, borderRadius: 10, backgroundColor: C.gray100 },
  itemName:     { fontSize: 14, fontWeight: "600", color: C.gray900 },
  itemUnit:     { fontSize: 12, color: C.gray400, marginTop: 2 },
  itemQty:      { fontSize: 12, color: C.gray500, fontWeight: "600" },
  itemPrice:    { fontSize: 15, fontWeight: "800", color: C.gray900, marginTop: 2 },

  // Bill
  billBox:      { backgroundColor: C.white, borderRadius: 16, padding: 16, marginTop: 20, marginBottom: 12, borderWidth: 1, borderColor: C.gray100 },
  billRow:      { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  billLbl:      { fontSize: 14, color: C.gray500 },
  billVal:      { fontSize: 14, fontWeight: "600", color: C.gray900 },
  billTotal:    { borderTopWidth: 1, borderTopColor: C.gray200, marginTop: 4, paddingTop: 12 },
  billTotalLbl: { fontSize: 15, fontWeight: "800", color: C.gray900 },
  billTotalVal: { fontSize: 17, fontWeight: "900", color: C.gray900 },

  // Address
  addressBox:   { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.greenLight, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.greenBorder },
  addressIcon:  { width: 28, height: 28, borderRadius: 8, backgroundColor: C.greenMid, alignItems: "center", justifyContent: "center" },
  addressLbl:   { fontSize: 11, color: C.green, fontWeight: "700", marginBottom: 2 },
  addressVal:   { fontSize: 13, color: C.gray700, fontWeight: "500", lineHeight: 18 },

  // Payment
  paymentRow:   { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  paymentText:  { fontSize: 13, color: C.gray500, fontWeight: "500" },
});

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({ order, onPress }) {
  const st       = getStatus(order.status);
  const stepIdx  = stepIndex(order.status);
  const items    = order.order_items || order.items || [];
  const subtotal = order.subtotal || 0;
  const total    = order.total    || subtotal;
  const itemCount = items.reduce((s, i) => s + (i.quantity || 1), 0)
    || order.item_count || 0;
  const isFailed = order.status === "cancelled" || order.status === "rejected";

  return (
    <TouchableOpacity style={oc.card} onPress={onPress} activeOpacity={0.88}>
      {/* Top row */}
      <View style={oc.top}>
        <View style={[oc.storeIcon, { backgroundColor: isFailed ? "#FEF2F2" : C.greenLight }]}>
          <Feather name="shopping-bag" size={16} color={isFailed ? C.red : C.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={oc.storeName} numberOfLines={1}>
            {order.vendor?.shop_name || order.vendor_name || "DesiDukaan Store"}
          </Text>
          <Text style={oc.dateText}>{formatDateShort(order.created_at)}</Text>
        </View>
        <View style={[oc.statusBadge, { backgroundColor: st.bg }]}>
          <Feather name={st.icon} size={11} color={st.color} />
          <Text style={[oc.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Order number */}
      <Text style={oc.orderNum}>
        {order.order_number || `#${order.id?.toString().slice(-6).toUpperCase()}`}
      </Text>

      {/* Item thumbnails */}
      {items.length > 0 && (
        <View style={oc.thumbsRow}>
          {items.slice(0, 4).map((item, i) => {
            const p = item.product || {};
            return (
              <Image
                key={i}
                source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100" }}
                style={oc.thumb} resizeMode="cover"
              />
            );
          })}
          {items.length > 4 && (
            <View style={oc.thumbMore}>
              <Text style={oc.thumbMoreText}>+{items.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom row */}
      <View style={oc.bottom}>
        <View>
          <Text style={oc.itemCount}>
            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? "s" : ""}` : ""}
          </Text>
          <Text style={oc.totalText}>₹{total}</Text>
        </View>
        <TouchableOpacity style={oc.detailBtn} onPress={onPress} activeOpacity={0.8}>
          <Text style={oc.detailText}>View Details</Text>
          <Feather name="chevron-right" size={13} color={C.green} />
        </TouchableOpacity>
      </View>

      {/* Progress bar — only for active non-failed orders */}
      {!isFailed && stepIdx >= 0 && stepIdx < TRACK_STEPS.length - 1 && (
        <View style={oc.progressWrap}>
          <View style={[oc.progressBar, {
            width: `${((stepIdx + 1) / TRACK_STEPS.length) * 100}%`,
          }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const oc = StyleSheet.create({
  card:        { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.gray100, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  top:         { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  storeIcon:   { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.greenBorder },
  storeName:   { fontSize: 15, fontWeight: "800", color: C.gray900 },
  dateText:    { fontSize: 12, color: C.gray400, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: "700" },
  orderNum:    { fontSize: 12, color: C.gray400, fontWeight: "600", marginBottom: 10 },
  thumbsRow:   { flexDirection: "row", gap: 8, marginBottom: 12 },
  thumb:       { width: 52, height: 52, borderRadius: 10, backgroundColor: C.gray100 },
  thumbMore:   { width: 52, height: 52, borderRadius: 10, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
  thumbMoreText:{ fontSize: 13, fontWeight: "700", color: C.gray500 },
  bottom:      { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  itemCount:   { fontSize: 12, color: C.gray400 },
  totalText:   { fontSize: 17, fontWeight: "900", color: C.gray900, marginTop: 1 },
  detailBtn:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.greenLight, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.greenBorder },
  detailText:  { fontSize: 13, fontWeight: "700", color: C.green },
  progressWrap:{ height: 3, backgroundColor: C.gray100, borderRadius: 2, marginTop: 12, overflow: "hidden" },
  progressBar: { height: 3, backgroundColor: C.green, borderRadius: 2 },
});

// ═════════════════════════════════════════════════════════════════════════════
export default function MyOrdersScreen() {
  const navigation = useNavigation();
  const { token }  = useAuthStore();

  const [orders,      setOrders]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [activeTab,   setActiveTab]   = useState("all");
  const [detailOrder, setDetailOrder] = useState(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : data.data?.orders || data.data || data.orders || [];
      setOrders(list);
    } catch (e) { console.error("MyOrders:", e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = () => { setRefreshing(true); fetchOrders(true); };

  // Active = any non-terminal status
  const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready", "picked_up"];
  const PAST_STATUSES   = ["delivered", "cancelled", "rejected"];

  const filtered = orders.filter(o => {
    if (activeTab === "active") return ACTIVE_STATUSES.includes(o.status);
    if (activeTab === "past")   return PAST_STATUSES.includes(o.status);
    return true;
  });

  const activeCount = orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length;
  const pastCount   = orders.filter(o => PAST_STATUSES.includes(o.status)).length;

  const goBack = () => navigation.goBack();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <LinearGradient
        colors={[C.orange, C.orangeDark, C.greenDark, C.green]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.appName}>DesiDukaan</Text>
          <Text style={s.headerTitle}>My Orders</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => fetchOrders(true)} activeOpacity={0.8}>
          <Feather name="refresh-cw" size={16} color={C.white} />
        </TouchableOpacity>
      </LinearGradient>

      {/* TABS */}
      <View style={s.tabs}>
        {[
          { key: "all",    label: "All",    count: orders.length },
          { key: "active", label: "Active", count: activeCount   },
          { key: "past",   label: "Past",   count: pastCount     },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[s.tabBubble, activeTab === tab.key && s.tabBubbleActive]}>
                <Text style={[s.tabBubbleText, activeTab === tab.key && s.tabBubbleTextActive]}>
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
          <Text style={s.loadingText}>Fetching your orders…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Feather name="shopping-bag" size={30} color={C.gray300} />
          </View>
          <Text style={s.emptyTitle}>
            {activeTab === "active" ? "No active orders"
              : activeTab === "past" ? "No past orders"
              : "No orders yet"}
          </Text>
          <Text style={s.emptySub}>
            {activeTab === "all"
              ? "Your order history will appear here"
              : "Check back later"}
          </Text>
          {activeTab === "all" && (
            <TouchableOpacity
              style={s.shopBtn}
              onPress={() => navigation.navigate("CustomerApp", { screen: "CustomerTabNavigator", params: { screen: "Home" } })}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[C.green, C.greenDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />
          }
        >
          {/* Active orders notice */}
          {activeTab !== "past" && activeCount > 0 && (
            <View style={s.activeBanner}>
              <View style={s.activeBannerDot} />
              <Text style={s.activeBannerText}>
                {activeCount} active order{activeCount !== 1 ? "s" : ""} in progress
              </Text>
            </View>
          )}

          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onPress={() => setDetailOrder(order)}
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
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 15, color: C.gray400, fontWeight: "500" },

  header:      { paddingTop: Platform.OS === "android" ? 28 : 36, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn:     { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" },
  headerMid:   { flex: 1 },
  appName:     { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.8)", letterSpacing: 0.5 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.white },
  refreshBtn:  { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" },

  tabs:              { flexDirection: "row", backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  tab:               { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.gray200 },
  tabActive:         { backgroundColor: C.green, borderColor: C.green },
  tabLabel:          { fontSize: 13, fontWeight: "600", color: C.gray600 },
  tabLabelActive:    { color: C.white },
  tabBubble:         { backgroundColor: C.gray100, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  tabBubbleActive:   { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBubbleText:     { fontSize: 10, fontWeight: "800", color: C.gray500 },
  tabBubbleTextActive:{ color: C.white },

  list:        { padding: 16, paddingTop: 12 },

  activeBanner:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenLight, borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.greenBorder },
  activeBannerDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  activeBannerText: { fontSize: 13, color: C.green, fontWeight: "600" },

  emptyWrap:    { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 24, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle:   { fontSize: 20, fontWeight: "800", color: C.gray800, textAlign: "center" },
  emptySub:     { fontSize: 14, color: C.gray400, textAlign: "center", marginTop: 6, marginBottom: 24 },
  shopBtn:      { borderRadius: 14, overflow: "hidden" },
  shopBtnGrad:  { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 14 },
  shopBtnText:  { fontSize: 16, fontWeight: "800", color: C.white },
});