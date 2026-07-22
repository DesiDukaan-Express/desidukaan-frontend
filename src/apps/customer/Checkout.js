import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  Dimensions,
  Linking,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { io } from "socket.io-client";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import useAddressStore from "../../store/addressStore";
import AddressMapView from "../../components/AddressMapView";
import useOrderStore from "../../store/orderStore";


const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3000";

const C = {
  orange: "#F97316",
  orangeDark: "#EA580C",
  green: "#16A34A",
  greenDark: "#15803D",
  greenLight: "#F0FDF4",
  greenBorder: "#BBF7D0",
  greenMid: "#DCFCE7",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray900: "#111827",
  red: "#EF4444",
  redLight: "#FEF2F2",
  amber: "#D97706",
  amberLight: "#FEF3C7",
};

const PAYMENT_METHODS = [
  {
    id: "upi",
    label: "UPI",
    sub: "Google Pay, PhonePe, Paytm & more",
    icon: "smartphone",
    color: "#7C3AED",
    options: ["Google Pay", "PhonePe", "Paytm", "Other UPI"],
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    sub: "Visa, Mastercard, RuPay",
    icon: "credit-card",
    color: "#2563EB",
    options: [],
  },
];

// ─── Responsive hook (identical to CartScreen) ────────────────────────────────
function useBreakpoint() {
  const [w, setW] = React.useState(Dimensions.get("window").width);
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) =>
      setW(window.width),
    );
    return () => sub?.remove?.();
  }, []);
  if (w >= 1024) return { isMobile: false, isTablet: false, isDesktop: true };
  if (w >= 640) return { isMobile: false, isTablet: true, isDesktop: false };
  return { isMobile: true, isTablet: false, isDesktop: false };
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ num, title, icon, children, cardR, px, rightElement }) {
  return (
    <View style={[sec.wrap, { borderRadius: cardR, marginHorizontal: px }]}>
      <View style={sec.header}>
        <View style={sec.numWrap}>
          <Text style={sec.num}>{num}</Text>
        </View>
        <Feather name={icon} size={16} color={C.green} />
        <Text style={sec.title}>{title}</Text>
        {rightElement}
      </View>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  numWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  num: { fontSize: 12, fontWeight: "900", color: C.white },
  title: { fontSize: 16, fontWeight: "800", color: C.gray900, flex: 1 },
});

function SlotBanner({ slot }) {
  if (!slot) return null;
  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  const isToday =
    new Date(slot.start).toDateString() === new Date().toDateString();

  return (
    <View style={slb.wrap}>
      <View style={slb.iconWrap}>
        <Feather name="clock" size={16} color={C.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={slb.label}>
          Delivery window: {isToday ? "Today" : "Tomorrow"}
        </Text>
        <Text style={slb.time}>
          {fmt(slot.start)} – {fmt(slot.end)}
        </Text>
      </View>
    </View>
  );
}
const slb = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.greenLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.greenMid,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: C.green,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  time: { fontSize: 16, fontWeight: "900", color: C.greenDark, marginTop: 2 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  editText: { fontSize: 12, fontWeight: "700", color: C.green },
});

// ─── Cancellation policy ──────────────────────────────────────────────────────
const POLICY_ITEMS = [
  { icon: "check-circle", color: C.green,  text: "Free cancellation before payment is confirmed." },
  { icon: "check-circle", color: C.green,  text: "Return request allowed before payment is processed." },
  { icon: "alert-circle", color: C.amber,  text: "Once payment is confirmed, cancellation may not be possible." },
  { icon: "alert-circle", color: C.amber,  text: "Perishable items (dairy, fresh produce) cannot be returned after delivery." },
  { icon: "info",         color: C.gray400, text: "Contact the vendor directly for disputes via the phone request feature." },
];

function CancellationPolicy() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Trigger row — never expands inline */}
      <TouchableOpacity
        style={cp.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Feather name="shield" size={15} color={C.amber} />
        <Text style={cp.triggerTitle}>Cancellation & Return Policy</Text>
        <Feather name="chevron-right" size={15} color={C.gray400} />
      </TouchableOpacity>

      {/* Bottom-sheet Modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={cp.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={cp.sheet} onPress={() => {}}>
            <View style={cp.handle} />
            <View style={cp.sheetHeader}>
              <View style={cp.sheetIconWrap}>
                <Feather name="shield" size={20} color={C.amber} />
              </View>
              <Text style={cp.sheetTitle}>Cancellation & Return Policy</Text>
              <TouchableOpacity style={cp.closeBtn} onPress={() => setOpen(false)}>
                <Feather name="x" size={15} color={C.gray600} />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 36, paddingHorizontal: 20, gap: 14 }}
            >
              {POLICY_ITEMS.map((item, i) => (
                <View key={i} style={cp.row}>
                  <View style={[cp.iconCircle, { backgroundColor: item.color + "18" }]}>
                    <Feather name={item.icon} size={15} color={item.color} />
                  </View>
                  <Text style={cp.text}>{item.text}</Text>
                </View>
              ))}
              <View style={cp.footerNote}>
                <Feather name="info" size={12} color={C.gray400} />
                <Text style={cp.footerText}>
                  Policies apply per order and may vary by vendor.
                </Text>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
const cp = StyleSheet.create({
  trigger:       { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFBEB", borderRadius: 14, borderWidth: 1, borderColor: "#FDE68A", padding: 14 },
  triggerTitle:  { flex: 1, fontSize: 14, fontWeight: "700", color: "#92400E" },
  backdrop:      { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end" },
  sheet:         { backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, maxHeight: "80%" },
  handle:        { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetHeader:   { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.gray100, marginBottom: 14 },
  sheetIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.amberLight, alignItems: "center", justifyContent: "center" },
  sheetTitle:    { flex: 1, fontSize: 16, fontWeight: "900", color: C.gray900 },
  closeBtn:      { width: 30, height: 30, borderRadius: 10, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
  row:           { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconCircle:    { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  text:          { flex: 1, fontSize: 13, color: C.gray600, lineHeight: 19 },
  footerNote:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.gray100, borderRadius: 10, padding: 12, marginTop: 4 },
  footerText:    { flex: 1, fontSize: 11, color: C.gray500, lineHeight: 16 },
});

// ─── Order Summary card ───────────────────────────────────────────────────────
function OrderSummaryCard({ items, subtotal, deliveryFee, baseFee, total, onNegotiate, deliveryTypePref = "standard", fs = 1 }) {
  return (
    <View style={osc.wrap}>
      {items.map((item, i) => (
        <View
          key={i}
          style={[
            osc.itemRow,
            i < items.length - 1 && osc.itemBorder,
          ]}
        >
          <View style={osc.itemDot} />
          <Text
            style={[osc.itemName, { fontSize: Math.round(13 * fs) }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={[osc.itemQty, { fontSize: Math.round(12 * fs) }]}>
            ×{item.qty ?? item.quantity ?? 1}
          </Text>
          <Text style={[osc.itemPrice, { fontSize: Math.round(13 * fs) }]}>
            ₹{item.price * (item.qty ?? item.quantity ?? 1)}
          </Text>
        </View>
      ))}

      <View style={osc.divider} />
      <View style={osc.row}>
        <Text style={[osc.label, { fontSize: Math.round(13 * fs) }]}>
          Items total
        </Text>
        <Text style={[osc.value, { fontSize: Math.round(13 * fs) }]}>
          ₹{subtotal}
        </Text>
      </View>

      <View style={osc.row}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[osc.label, { fontSize: Math.round(13 * fs) }]}>
            Delivery ({deliveryTypePref === "quick" ? "Quick ⚡" : "Standard"})
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {baseFee != null && baseFee !== deliveryFee && (
            <Text style={{ fontSize: 12, color: C.gray400, textDecorationLine: "line-through" }}>
              ₹{baseFee}
            </Text>
          )}
          {deliveryFee === 0 ? (
            <Text style={[osc.value, { color: C.green, fontSize: Math.round(13 * fs) }]}>FREE</Text>
          ) : (
            <Text style={[osc.value, { fontSize: Math.round(13 * fs) }]}>₹{deliveryFee}</Text>
          )}
          {deliveryFee > 0 && (
            <TouchableOpacity
              style={osc.negotiateBtn}
              onPress={() => onNegotiate && onNegotiate()}
              activeOpacity={0.7}
            >
              <Text style={osc.negotiateBtnText}>NEGOTIATE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={osc.dottedDivider} />
      <View style={osc.row}>
        <Text style={[osc.totalLabel, { fontSize: Math.round(16 * fs) }]}>
          Total payable
        </Text>
        <Text style={[osc.totalVal, { fontSize: Math.round(16 * fs) }]}>
          ₹{total}
        </Text>
      </View>
    </View>
  );
}
const osc = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 0,
    borderWidth: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: C.gray100 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green, flexShrink: 0 },
  itemName: { flex: 1, fontSize: 13, color: C.gray700, fontWeight: "500" },
  itemQty: { fontSize: 12, color: C.gray400 },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray900,
    minWidth: 48,
    textAlign: "right",
  },
  moreText: { fontSize: 12, color: C.gray400, paddingVertical: 6 },
  divider: { height: 1, backgroundColor: C.gray200, marginVertical: 10 },
  dottedDivider: { borderTopWidth: 2, borderTopColor: C.gray200, borderStyle: "dashed", marginVertical: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  label: { fontSize: 13, color: C.gray500 },
  value: { fontSize: 13, fontWeight: "600", color: C.gray900 },
  totalLabel: { fontSize: 15, fontWeight: "900", color: C.gray900 },
  totalVal: { fontSize: 16, fontWeight: "900", color: C.green },
  negotiateBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FDBA74", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  negotiateBtnText: { fontSize: 10, fontWeight: "700", color: C.orange },
});
// ─── Delivery Type Selector styles ───────────────────────────────────────────
const dts = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, backgroundColor: '#FAFAFA',
  },
  pillActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  pillQuick: { borderColor: '#FDE68A' },
  pillQuickActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  pillIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  pillBody: { flex: 1 },
  pillTitle: { fontSize: 13, fontWeight: '800', color: '#374151' },
  pillTitleActive: { color: '#FFFFFF' },
  pillTitleQuickActive: { color: '#FFFFFF' },
  pillSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  pillSubActive: { color: 'rgba(255,255,255,0.85)' },
  pillSubQuickActive: { color: 'rgba(255,255,255,0.85)' },
  pillFee: { fontSize: 14, fontWeight: '900', color: '#111827' },
  pillFeeActive: { color: '#FFFFFF' },
  pillFeeQuickActive: { color: '#FFFFFF' },
  breakdown: {
    backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, gap: 8,
    borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4,
  },
  bRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bLabel: { flex: 1, fontSize: 12, color: '#6B7280' },
  bVal: { fontSize: 12, fontWeight: '700', color: '#374151' },
  negotiatedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  negotiatedNoteText: { flex: 1, fontSize: 12, color: '#15803D', fontWeight: '600' },
});


// ─── Negotiation Banner (Shown while waiting or after response) ──────────────
function NegotiationBanner({ status, countdown, vendorName, onDismiss }) {
  const configs = {
    pending: {
      title: "Waiting for Store...",
      sub: `Waiting for ${vendorName} to accept your order.`,
      icon: "clock",
      color: C.orange,
      bg: "#FFF7ED",
      border: "#FFEDD5",
    },
    accepted: {
      title: "Order Confirmed!",
      sub: "The store has accepted your order. Please complete the payment.",
      icon: "check-circle",
      color: C.green,
      bg: C.greenLight,
      border: C.greenBorder,
    },
    rejected: {
      title: "Order Declined",
      sub: "The store couldn't fulfill your order right now.",
      icon: "x-circle",
      color: C.red,
      bg: C.redLight,
      border: "#FCA5A5",
    },
    expired: {
      title: "Request Expired",
      sub: "The store didn't respond in time. Please try again.",
      icon: "alert-triangle",
      color: C.gray600,
      bg: C.gray100,
      border: C.gray200,
    },
    countered: {
      title: "Review Adjustments",
      sub: "The store suggested some changes to your order.",
      icon: "edit-3",
      color: "#7C3AED",
      bg: "#F5F3FF",
      border: "#DDD6FE",
    },
  };

  const cfg = configs[status];
  if (!cfg) return null;

  return (
    <View style={[nb.wrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[nb.iconWrap, { backgroundColor: cfg.color + "20" }]}>
        {status === "pending" ? (
          <Text style={[nb.timer, { color: cfg.color }]}>{countdown}s</Text>
        ) : (
          <Feather name={cfg.icon} size={18} color={cfg.color} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[nb.title, { color: cfg.color }]}>{cfg.title}</Text>
        <Text style={nb.sub}>{cfg.sub}</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <Feather name="x" size={16} color={C.gray400} />
        </TouchableOpacity>
      )}
    </View>
  );
}
const nb = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginVertical: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timer: { fontSize: 13, fontWeight: "900" },
  title: { fontSize: 15, fontWeight: "900" },
  sub: { fontSize: 12, color: C.gray500, marginTop: 1 },
});

// ─── Counter Offer Review Component ──────────────────────────────────────────
function CounterOfferReview({ data, onAccept, onReject, placing, fs = 1, deliveryTypePref, deliveryInfo, confirmedSlot }) {
  if (!data) return null;
  const { items = [], delivery_fee = 0, total = 0, note = "", slot = null } = data;

  return (
    <View style={cor.wrap}>
      <View style={cor.header}>
        <Feather name="info" size={16} color="#7C3AED" />
        <Text style={cor.headerText}>Vendor Adjustments</Text>
      </View>

      {note ? <Text style={cor.note}>"{note}"</Text> : null}

      <View style={cor.items}>
        {items.map((it, idx) => (
          <View key={idx} style={cor.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={cor.itemName}>{it.product_name}</Text>
              <Text style={cor.itemSub}>
                {it.available ? `${it.new_quantity} units` : "Out of stock"}
              </Text>
            </View>
            <Text
  style={[
    cor.itemPrice,
    !it.available && { textDecorationLine: "line-through", opacity: 0.5 },
  ]}
>
  ₹{it.available !== false ? (it.new_quantity * it.product_price) : 0}
</Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 4, marginBottom: 12 }}>
        <View style={cor.totalRow}>
          <Text style={cor.totalLbl}>New Delivery Fee</Text>
          <Text style={cor.totalVal}>₹{delivery_fee}</Text>
        </View>
        <View style={[cor.totalRow, { marginTop: 4 }]}>
          <Text style={cor.totalLbl}>Delivery Time</Text>
          <Text style={cor.totalVal}>
            {slot
              ? "Specified by new slot"
              : (deliveryTypePref === "quick"
                ? `⚡ ~${deliveryInfo?.quick_eta_minutes ?? 15} mins (Quick)`
                : `~${deliveryInfo?.eta_minutes ?? 30} mins (Standard)`)
            }
          </Text>
        </View>
        <View style={[cor.totalRow, { marginTop: 4 }]}>
          <Text style={cor.totalLbl}>Delivery Slot</Text>
          <Text style={cor.totalVal}>
            {(() => {
              const activeSlot = slot || confirmedSlot;
              if (!activeSlot) return "As soon as possible";
              const startStr = new Date(activeSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endStr = new Date(activeSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dayStr = new Date(activeSlot.start).toDateString() === new Date().toDateString() ? "Today" : "Tomorrow";
              return `${dayStr}, ${startStr} - ${endStr}`;
            })()}
          </Text>
        </View>
        <View style={[cor.totalRow, { marginTop: 4 }]}>
          <Text style={cor.grandLbl}>New Total</Text>
          <Text style={cor.grandVal}>₹{total}</Text>
        </View>
      </View>

      <View style={cor.actions}>
        <TouchableOpacity
          style={[cor.btn, cor.btnReject]}
          onPress={() => onReject()}
          disabled={placing}
        >
          <Text style={cor.btnRejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[cor.btn, cor.btnAccept]}
          onPress={() => onAccept()}
          disabled={placing}
        >
          <Text style={cor.btnAcceptText}>Accept & Pay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cor = StyleSheet.create({
  wrap: {
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  headerText: { fontSize: 13, fontWeight: "800", color: "#7C3AED", letterSpacing: 0.5 },
  note: {
    fontSize: 13,
    color: C.gray600,
    fontStyle: "italic",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  items: { gap: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: "#DDD6FE", paddingBottom: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { fontSize: 14, fontWeight: "600", color: C.gray900 },
  itemSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: "700", color: C.gray900 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLbl: { fontSize: 13, color: C.gray500 },
  totalVal: { fontSize: 13, fontWeight: "600", color: C.gray900 },
  grandLbl: { fontSize: 15, fontWeight: "800", color: C.gray900 },
  grandVal: { fontSize: 18, fontWeight: "900", color: "#7C3AED" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnReject: { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray300 },
  btnRejectText: { color: C.gray600, fontWeight: "700" },
  btnAccept: { backgroundColor: "#7C3AED" },
  btnAcceptText: { color: C.white, fontWeight: "800" },
});

// ═══════════════════════════════════════════════════════════════════════════ //
export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const cart = useCartStore();
  const { token } = useAuthStore();
  const addressStore = useAddressStore();
  const setPendingOrder = useOrderStore((s) => s.setPendingOrder);
  const updatePendingOrder = useOrderStore((s) => s.updatePendingOrder);
  const clearPendingOrder = useOrderStore((s) => s.clearPendingOrder);
  const pendingOrderFromStore = useOrderStore((s) => s.pendingOrder);
  const isResumingPendingOrder = !!route.params?.resumePendingOrder;
  const resumeOrder = isResumingPendingOrder
    ? route.params?.pendingOrder || pendingOrderFromStore || null
    : null;

  // Slot passed from CartScreen via navigation params or cartStore
  const [confirmedSlot, setConfirmedSlot] = useState(() => {
    const raw = route.params?.confirmedSlot || resumeOrder?.confirmedSlot || resumeOrder?.slot || resumeOrder?.delivery_slot || cart?.confirmedSlot || null;
    if (!raw) return null;
    if (raw.start && raw.end) return { start: raw.start, end: raw.end };
    const start = raw.vendor_slot_start || raw.slot_start || raw.start || null;
    const end = raw.vendor_slot_end || raw.slot_end || raw.end || null;
    if (start && end) return { start, end };
    return null;
  });
  const [slotId, setSlotId] = useState(
    route.params?.slotId || cart?.slotId || null
  );
  const confirmedFee = route.params?.confirmedFee ?? resumeOrder?.confirmedFee ?? cart?.confirmedFee ?? null;

  const [vendorPhone, setVendorPhone] = useState(
    route.params?.vendorPhone || null
  );
  const [phoneStatus, setPhoneStatus] = useState(
    route.params?.phoneStatus || null // 'pending', 'approved', 'rejected'
  );

  const items = isResumingPendingOrder ? [] : (cart?.items || []);
  const vendorId = route.params?.vendorId || resumeOrder?.vendor_id || resumeOrder?.vendorId || cart?.vendorId;
  const vendorName =
    route.params?.vendorName ||
    resumeOrder?.vendorName ||
    resumeOrder?.vendor?.shop_name ||
    items[0]?.vendorName ||
    "Store";

  // ── Snapshot of cart items/subtotal taken before cart is cleared on order submit ──
  const [snapshotItems, setSnapshotItems] = useState(
    route.params?.snapshotItems || resumeOrder?.snapshotItems || null
  );
  const [snapshotSubtotal, setSnapshotSubtotal] = useState(
    route.params?.snapsgithotSubtotal ?? resumeOrder?.snapshotSubtotal ?? null
  );

  // ── Order state ────────────────────────────────────────────────────────────
  const [placing, setPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [orderId, setOrderId] = useState(route.params?.orderId || resumeOrder?.id || null);
  const [orderStatus, setOrderStatus] = useState(
    route.params?.initialOrderStatus || resumeOrder?.status || "idle"
  ); // idle, pending, accepted, rejected, expired, countered
  const [countdown, setCountdown] = useState(90);
  const [counterData, setCounterData] = useState(() => {
    const rawCounter = resumeOrder?.counter_offer || null;
    if (!rawCounter) return null;
    const rawSlot = rawCounter.slot || rawCounter.delivery_slot || null;
    const slot = rawSlot ? {
      start: rawSlot.vendor_slot_start || rawSlot.slot_start || rawSlot.start,
      end: rawSlot.vendor_slot_end || rawSlot.slot_end || rawSlot.end,
    } : null;
    return {
      ...rawCounter,
      slot,
    };
  });
  const timerRef = useRef(null);
  const scrollViewRef = useRef(null);       // ref to main ScrollView
  const paymentSectionY = useRef(0);        // Y-offset of payment section inside scroll

  // Slot management states
  const [vendor, setVendor] = useState(null);
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [requestingSlot, setRequestingSlot] = useState(false);
  const [requestingPhone, setRequestingPhone] = useState(false);
  const [feeModalVisible, setFeeModalVisible] = useState(false);
  const [requestingFee,   setRequestingFee]   = useState(false);
  const [proposedFee,     setProposedFee]     = useState(route.params?.proposedFee ?? resumeOrder?.proposedFee ?? null);
  const isAccepted = orderStatus === "accepted";

  // ── Delivery type preference ──────────────────────────────────────────────
  // 'standard' = normal delivery, 'quick' = faster but pricier
  const [deliveryTypePref, setDeliveryTypePref] = useState(
    route.params?.deliveryTypePref || resumeOrder?.deliveryTypePref || resumeOrder?.delivery_type_pref || 'standard'
  );

  // ── Live delivery fee info from backend ──────────────────────────────────
  const [deliveryInfo, setDeliveryInfo] = useState(null);  // {fees, eta_minutes, quick_eta_minutes, ...}
  const [fetchingDeliveryInfo, setFetchingDeliveryInfo] = useState(false);

  // ── Negotiation modal visibility ───────────────────────────────────────────
  const [negotiationModalVisible, setNegotiationModalVisible] = useState(false);

  // Show modal automatically when status changes to pending/countered/accepted/rejected/expired
  useEffect(() => {
    if (orderStatus !== "idle") {
      setNegotiationModalVisible(true);
    }
  }, [orderStatus]);

  // ── Toast notification state ───────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" }); // type: 'success' | 'error' | 'info'
  const toastTimer = useRef(null);
  const showToast = (message, type = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message, type });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  };

  // ── Computed totals ────────────────────────────────────────────────────────
  // Use snapshot once order has been placed (cart is cleared at that point)
  const displayItems = snapshotItems ?? items;
  const liveSubtotal = items.reduce(
    (s, i) => s + i.price * (i.qty ?? i.quantity ?? 0),
    0,
  );
  const subtotal = snapshotSubtotal ?? liveSubtotal;

  // Fee priority: negotiated (proposedFee) > live delivery-info > confirmed from cart > fallback 20
  const liveFees = deliveryInfo?.fees;
  const liveStandardFee = liveFees?.standard_fee ?? null;
  const liveQuickFee    = liveFees?.quick_fee    ?? null;
  const liveActiveFee   = deliveryTypePref === 'quick' ? (liveQuickFee ?? liveStandardFee) : liveStandardFee;

  const baseFee = confirmedFee ?? liveStandardFee ?? 20;
  const activeFee = proposedFee !== null ? proposedFee : (liveActiveFee !== null ? liveActiveFee : baseFee);
  const cartTotal = subtotal + activeFee;
  // counterData.total takes priority when countered or accepted-after-counter
  const total =
    counterData?.total != null && ["countered", "accepted"].includes(orderStatus)
      ? counterData.total
      : cartTotal;

  // ── Address state ──────────────────────────────────────────────────────────
  const savedAddresses = (addressStore?.addresses || []).filter(a => a.label !== "Current Location");
  const [selectedAddrId, setSelectedAddrId] = useState(
    addressStore?.selectedId || (savedAddresses.length > 0 ? savedAddresses[0].id : null)
  );
  const currentLocation = addressStore?.currentLocation || {};
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [detectedAddr, setDetectedAddr] = useState(currentLocation.displayName || null);
  const [detectedCoords, setDetectedCoords] = useState(currentLocation.lat ? { lat: currentLocation.lat, lng: currentLocation.lng } : null);
  const [manualOpen, setManualOpen] = useState(false);

  // ── Fetch vendor details (for timings) ─────────────────────────────────────
  useEffect(() => {
    if (!vendorId) return;
    (async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${BASE_URL}/vendors/${vendorId}`, { headers });
        const data = await res.json();
        setVendor(data.data?.vendor || data.vendor || null);
      } catch (e) {
        console.error("Error fetching vendor timings:", e.message);
      }
    })();
  }, [vendorId, token]);

  // ── Fetch live delivery fee info ─────────────────────────────────────────
  // Triggers whenever address selection, coordinates, or subtotal changes
  useEffect(() => {
    if (!vendorId) return;

    // Resolve customer lat/lng from current selection
    let customerLat = null;
    let customerLng = null;

    if (selectedAddrId === 'detected' && detectedCoords?.lat) {
      customerLat = detectedCoords.lat;
      customerLng = detectedCoords.lng;
    } else if (selectedAddrId && selectedAddrId !== 'manual') {
      const saved = (addressStore?.addresses || []).find(a => a.id === selectedAddrId);
      if (saved?.lat) { customerLat = saved.lat; customerLng = saved.lng; }
    }

    if (!customerLat || !customerLng) return; // can't compute without coords

    const ctrl = new AbortController();
    setFetchingDeliveryInfo(true);
    (async () => {
      try {
        const queryParamsObj = {
          vendor_id: vendorId,
          customer_lat: customerLat,
          customer_lng: customerLng,
          subtotal: liveSubtotal,
        };
        if (confirmedSlot?.start) {
          queryParamsObj.slot_start = confirmedSlot.start;
        }
        const params = new URLSearchParams(queryParamsObj);
        const res = await fetch(`${BASE_URL}/slots/delivery-info?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (res.ok) setDeliveryInfo(json.data || null);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('delivery-info fetch failed:', e.message);
      } finally {
        setFetchingDeliveryInfo(false);
      }
    })();

    return () => ctrl.abort();
  }, [vendorId, selectedAddrId, detectedCoords, liveSubtotal, confirmedSlot, token]);

  const [addrLine, setAddrLine] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPin, setAddrPin] = useState("");
  const [addrLabel, setAddrLabel] = useState("Home");

  // Geocoding for manual address
  const [manualRegion, setManualRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [manualCoords, setManualCoords] = useState({ lat: null, lng: null });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const full = [addrLine, addrCity, addrPin].filter(Boolean).join(", ");
      if (full.length > 5) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(full)}&format=json&limit=1`,
            { headers: { "User-Agent": "DesiDukaan/1.0" } }
          );
          const data = await res.json();
          if (data?.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setManualCoords({ lat, lng: lon });
            setManualRegion(prev => ({ ...prev, latitude: lat, longitude: lon }));
          }
        } catch (e) {
          console.error("Manual geocode fail:", e);
        }
      }
    }, 1200);
    return () => clearTimeout(delayDebounceFn);
  }, [addrLine, addrCity, addrPin]);

  // ── Payment state ──────────────────────────────────────────────────────────
  const [selectedPay, setSelectedPay] = useState(route.params?.selectedPay || resumeOrder?.selectedPay || null);
  const [selectedUPI, setSelectedUPI] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [upiValidating, setUpiValidating] = useState(false);
  const [upiValidated, setUpiValidated] = useState(false); // true = VPA verified
  const [upiError, setUpiError] = useState(null);
  const [showQR, setShowQR] = useState(false); // web QR modal
  const [cardNum, setCardNum] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");

  // ── Socket — listen for vendor order responses ────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });

    socket.on("order:update", (data) => {
      if (orderId && String(data.order_id) !== String(orderId)) return;
      if (data.status === "accepted") {
        setOrderStatus("accepted");
        updatePendingOrder({ status: "accepted", order_number: data.order_number });
        setPlacing(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (data.status === "rejected") {
        setOrderStatus("rejected");
        updatePendingOrder({ status: "rejected", cancellation_reason: data.reason });
        setPlacing(false);
        setErrorMsg(data.reason || "Vendor couldn't accept your order.");
        if (timerRef.current) clearInterval(timerRef.current);
      }
    });

    socket.on("order:countered", async (data) => {
      if (orderId && String(data.order_id) !== String(orderId)) return;
      if (data.counter_offer) {
        setCounterData({
          items: data.counter_offer.items,
          delivery_fee: data.counter_offer.delivery_fee,
          total: data.counter_offer.total,
          note: data.counter_offer.note,
          slot: data.counter_offer.slot || data.counter_offer.delivery_slot,
        });
        updatePendingOrder({ status: "countered", counter_offer: data.counter_offer });
        setOrderStatus("countered");
        setPlacing(false);
      } else {
        // Fallback to fetch if data not in socket
        try {
          const res = await fetch(`${BASE_URL}/orders/${data.order_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await res.json();
          if (d.success || d.data) {
            const order = d.data?.order || d.order;
            setCounterData({
              items: order.counter_offer_items,
              delivery_fee: order.delivery_fee,
              total: order.total,
              note: order.vendor_note,
              slot: order.delivery_slot,
            });
            setOrderStatus("countered");
            setPlacing(false);
          }
        } catch (e) {
          console.error("Fetch counter error:", e);
        }
      }
    });

    socket.on("phone:approved", (data) => {
  setPhoneStatus("approved");
  setVendorPhone(data.phone);
});
socket.on("phone:rejected", () => setPhoneStatus("rejected"));

    socket.on("phone:update", (data) => {
      if (data.status === "approved" && data.phone) {
        setPhoneStatus("approved");
        setVendorPhone(data.phone);
        showToast(`✅ Vendor shared their number: ${data.phone}`, "success");
      } else if (data.status === "approved") {
        setPhoneStatus("approved");
        showToast("✅ Vendor approved your contact request!", "success");
      } else if (data.status === "rejected") {
        setPhoneStatus("rejected");
        showToast("❌ Vendor declined the contact request.", "error");
      }
    });

    return () => socket.disconnect();
  }, [token, orderId]);

  // ── Fetch order details on mount if resuming ───────────────────────────────
  useEffect(() => {
    if (orderId && token && (orderStatus === "pending" || orderStatus === "countered" || orderStatus === "accepted")) {
      (async () => {
        try {
          const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d = await res.json();
          if (res.ok && (d.success || d.data)) {
            const order = d.data?.order || d.order;
            // Sync status
            if (order.status) {
              setOrderStatus(order.status);
            }
            
            // Sync vendor phone/contact status
            if (order.vendorPhone) {
              setVendorPhone(order.vendorPhone);
            }
            if (order.phoneStatus) {
              setPhoneStatus(order.phoneStatus);
            }

            // Sync slot
            if (order.delivery_slot) {
              const parsedSlot = {
                start: order.delivery_slot.vendor_slot_start || order.delivery_slot.slot_start,
                end: order.delivery_slot.vendor_slot_end || order.delivery_slot.slot_end,
              };
              setConfirmedSlot(parsedSlot);
            }

            // Sync counter data if countered
            if (order.status === "countered") {
              setCounterData({
                items: order.counter_offer_items,
                delivery_fee: order.delivery_fee,
                total: order.total,
                note: order.vendor_note,
                slot: order.delivery_slot ? {
                  start: order.delivery_slot.vendor_slot_start || order.delivery_slot.slot_start,
                  end: order.delivery_slot.vendor_slot_end || order.delivery_slot.slot_end,
                } : null,
              });
            }
          }
        } catch (e) {
          console.error("Error fetching order details on mount:", e);
        }
      })();
    }
  }, [orderId, token]);

  // ── Negotiation Timer Logic ────────────────────────────────────────────────
  useEffect(() => {
    if (orderStatus === "pending") {
      setCountdown(90);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setOrderStatus("expired");
            setPlacing(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [orderStatus]);

  // ── Detect GPS location ────────────────────────────────────────────────────
  const detectLocation = async () => {
    setDetectingLoc(true);
    try {
      await addressStore.fetchLocation(true); // force fresh detect if they click the button
      const fresh = addressStore.currentLocation;
      if (fresh.lat) {
        setDetectedAddr(fresh.displayName);
        setDetectedCoords({ lat: fresh.lat, lng: fresh.lng });
        // Don't save to backend automatically anymore — keep it as "detected" session state
        setSelectedAddrId("detected");
      } else {
        setManualOpen(true);
      }
    } catch (e) {
      setManualOpen(true);
    } finally {
      setDetectingLoc(false);
    }
  };

  // ── Resolve address text for payload ──────────────────────────────────────
  const resolveAddress = () => {
    if (selectedAddrId === "detected") return detectedAddr || "GPS location";
    if (selectedAddrId === "manual")
      return (
        [addrLine, addrCity, addrState, addrPin].filter(Boolean).join(", ") ||
        "Manual address"
      );
    const saved = savedAddresses.find((a) => a.id === selectedAddrId);
    return saved?.address_line || saved?.address || "Test address";
  };

  // ── Place order ────────────────────────────────────────────────────────────
  const placeOrder = async () => {
    console.log("placeOrder function INVOKED"); // START LOG
    if (!confirmedSlot) {
      setErrorMsg("Please select a delivery slot before placing your order.");
      Alert.alert("Delivery Slot Required", "Please select a delivery slot before placing your order.");
      return;
    }
    setErrorMsg(null);
    setPlacing(true);
    try {
      let addrId = null;
      if (selectedAddrId === "detected") {
        const allAddrs = addressStore?.addresses || [];
        const existing = allAddrs.find(a =>
          a.label === "Current Location" &&
          (a.address_line === detectedAddr || a.address === detectedAddr)
        );
        if (existing) {
          addrId = existing.id;
        } else {
          const savedId = await addressStore.addAddress(
            { address: detectedAddr, lat: detectedCoords?.lat, lng: detectedCoords?.lng, label: "Current Location" },
            token
          );
          addrId = savedId;
        }
      } else if (selectedAddrId === "manual") {
        addrId = savedAddresses[0]?.id || null;
      } else {
        addrId = selectedAddrId || savedAddresses[0]?.id || null;
      }

      // Guard: ensure we have a real numeric address ID before proceeding
      addrId = addrId ? parseInt(addrId, 10) : null;
      if (!addrId || isNaN(addrId)) {
        setErrorMsg("Please select or add a delivery address before placing your order.");
        setPlacing(false);
        return;
      }

      const payload = {
        vendor_id: parseInt(vendorId, 10),
        delivery_address_id: addrId,
        payment_method: selectedPay || "cod", // fallback so it's never null
        delivery_slot_id: null,
        delivery_type_pref: deliveryTypePref || 'standard',
        proposed_delivery_fee: proposedFee !== null ? proposedFee : (confirmedFee !== null ? confirmedFee : null),
        proposed_slot: confirmedSlot ? { start: confirmedSlot.start, end: confirmedSlot.end } : null,
        items: items.map((i) => ({
          product_id: parseInt(i.id, 10),
          quantity: Math.max(1, i.qty ?? i.quantity ?? 1),
          unit: i.unit, // Pass unit for loose item pricing ratio
          // price NOT sent — backend uses its own price from DB
        })),
        special_instructions: "",
      };

      console.log("PLACING ORDER PAYLOAD:", JSON.stringify(payload, null, 2)); // LOG PAYLOAD

      const res = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {

    const orderItemsSnapshot = items.slice();
    const orderSubtotalSnapshot = liveSubtotal;

    setSnapshotItems(orderItemsSnapshot);
    setSnapshotSubtotal(orderSubtotalSnapshot);

    const order = data.data?.order || data.order || data;

    setPendingOrder({
      ...order,
      id: order.id,
      status: order.status || "pending",
      vendorId,
      vendorName,
      selectedPay,
      confirmedSlot,
      confirmedFee,
      proposedFee,
      deliveryTypePref,
      snapshotItems: orderItemsSnapshot,
      snapshotSubtotal: orderSubtotalSnapshot,
    });

    // Keep customer on the screen so the countdown timer + counter-offer modal stays visible
    setOrderId(order.id);
    setOrderStatus("pending");  // triggers the 90s countdown & modal
    setNegotiationModalVisible(true);
    setPlacing(false);

    cart?.clearCart?.();

    showToast("Order sent! Waiting for store to respond...", "success");
} else {
        console.log("ORDER CREATION FAILED", data); // LOG ERROR DATA
        setErrorMsg(
          data.errors?.join(', ') || data.message || data.msg || "Order failed. Please try again.",
        );
        setPlacing(false);
      }
    } catch (e) {
      console.error("placeOrder EXCEPTION:", e); // LOG EXCEPTION
      setErrorMsg(e.message);
      setPlacing(false);
    }
  };

  // ── Handle Payment ─────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!selectedPay) {
      setErrorMsg("Please select a payment method to proceed.");
      return;
    }
    setErrorMsg(null);
    setPlacing(true);
    // Simulate payment processing for now as requested
    setTimeout(() => {
      setPlacing(false);
      clearPendingOrder();
      navigation.replace("OrderPlaced", {
        orderId,
        orderNumber: `ORD-${orderId}`,
        vendorName,
        slot: confirmedSlot,
      });
    }, 1500);
  };

  // ── Slot actions ───────────────────────────────────────────────────────────
  const handleRequestSlot = async ({ slot_start, slot_end }) => {
    setConfirmedSlot({ start: slot_start, end: slot_end });
    setSlotId(null); // clear any previously confirmed DB slot ID
    setSlotModalVisible(false);
  };

  const handleRequestPhone = async () => {
    if (!vendorId) return;
    setRequestingPhone(true);
    try {
      await fetch(`${BASE_URL}/slots/phone-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      setPhoneStatus("pending");
    } catch (e) {
      console.error("phone request:", e.message);
    } finally {
      setRequestingPhone(false);
    }
  };

  const handleRespondCounter = async (action) => {
    setErrorMsg(null);
    setPlacing(true);
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/respond-counter`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (res.ok) {
        if (action === "accept") {
          // ── Apply counter offer details when customer accepts ──
          if (counterData) {
            // Update slot to the new one proposed by vendor (if any)
            if (counterData.slot) {
              setConfirmedSlot({ start: counterData.slot.start, end: counterData.slot.end });
            }
            // Lock the delivery fee to the counter-offered fee
            if (counterData.delivery_fee != null) {
              setProposedFee(counterData.delivery_fee);
            }
          }
          setOrderStatus("accepted");
        } else {
          setOrderStatus("rejected");
          navigation.navigate("CustomerApp", {
            screen: "CustomerTabNavigator",
            params: { screen: "Home" },
          });
        }
      } else {
        setErrorMsg(d.message || "Failed to respond. Please try again.");
      }
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setPlacing(false);
    }
  };

  // ── Breakpoint ────────────────────────────────────────────────────────────
  const { isDesktop, isTablet } = useBreakpoint();
  const px = isDesktop ? 40 : isTablet ? 28 : 16;
  const cardR = isDesktop ? 20 : isTablet ? 18 : 14;
  const fs = isDesktop ? 1.15 : isTablet ? 1.07 : 1;

  const minOrderValue = vendor?.min_order_value ?? 0;
  const isBelowMinOrder = liveSubtotal < minOrderValue;
  const canPlace = !isBelowMinOrder && confirmedSlot !== null;

  // ── Status Polling Fallback ───────────────────────────────────────────────
  useEffect(() => {
    if (!orderId || !token) return;
    if (orderStatus !== "pending" && orderStatus !== "countered") return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await res.json();
        const order = d.data?.order || d.order;
        if (!order) return;

        if (order.status !== orderStatus) {
          if (order.status === "countered") {
            setCounterData({
              items: order.counter_offer_items,
              delivery_fee: order.delivery_fee,
              total: order.total,
              note: order.vendor_note,
              slot: order.delivery_slot && order.delivery_slot.start_time ? {
                start: order.delivery_slot.start_time,
                end: order.delivery_slot.end_time,
              } : null,
            });
          }
          updatePendingOrder({
            status: order.status,
            counter_offer: order.counter_offer_items,
            delivery_fee: order.delivery_fee,
            total: order.total,
          });
          setOrderStatus(order.status);
          setPlacing(false);
        }
      } catch (e) {
        // fail silently for polling
      }
    }, 5000); // poll every 5s

    return () => clearInterval(poll);
  }, [orderId, orderStatus, token]);

  // ── Address label display ─────────────────────────────────────────────────
  const getAddrLabel = (addr) => {
    const lbl = addr.label || "Address";
    const line = addr.address_line || addr.address || "";
    return { lbl, line };
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: isDesktop ? C.bg : C.white }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* HEADER */}
      <View style={[s.header, { paddingHorizontal: px }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={C.gray900} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={[s.headerTitle, { fontSize: Math.round(20 * fs), color: C.orange }]}>
            Checkout
          </Text>
          <Text style={[s.headerSub, { fontSize: Math.round(12 * fs), color: C.gray500, fontWeight: "400" }]}>
            {vendorName}
          </Text>
        </View>
        {/* Total chip in header */}
        <View style={s.totalChip}>
          <Text style={s.totalChipText}>₹{total}</Text>
        </View>
      </View>

      {/* PAGE BODY */}
      <View style={[s.pageBody, isDesktop && s.pageBodyDesktop]}>
        {/* ══ MAIN / LEFT COLUMN ══════════════════════════════════════════ */}
        <ScrollView
          ref={scrollViewRef}
          style={s.mainCol}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Slot banner — only if slot was negotiated */}
          {confirmedSlot && (
            <View style={{ marginHorizontal: px, marginBottom: 12 }}>
              <SlotBanner slot={confirmedSlot} />
            </View>
          )}

          {/* Error banner */}
          {errorMsg && (
            <View
              style={[
                s.errorBanner,
                { marginHorizontal: px, borderRadius: cardR },
              ]}
            >
              <Feather name="alert-circle" size={15} color={C.red} />
              <Text style={s.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={() => setErrorMsg(null)}>
                <Feather name="x" size={14} color={C.red} />
              </TouchableOpacity>
            </View>
          )}

          {/* Min Order warning banner */}
          {isBelowMinOrder && (
            <View
              style={[
                s.errorBanner,
                { marginHorizontal: px, borderRadius: cardR, backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", marginBottom: 12 },
              ]}
            >
              <Feather name="alert-circle" size={15} color={C.red} />
              <Text style={[s.errorText, { color: C.red, fontWeight: "700" }]}>
                Minimum order value for {vendorName} is ₹{minOrderValue}. Please add ₹{Math.round(minOrderValue - liveSubtotal)} more worth of items to place the order.
              </Text>
            </View>
          )}


          {/* ── SECTION 2: DELIVERY TYPE ──────────────────────────────── */}
          <Section
            num="2"
            title="Delivery Type"
            icon="truck"
            cardR={cardR}
            px={px}
          >
            {/* Standard / Quick toggle pills */}
            <View style={dts.row}>
              <TouchableOpacity
                style={[dts.pill, deliveryTypePref === 'standard' && dts.pillActive]}
                onPress={() => { if (proposedFee === null) setDeliveryTypePref('standard'); }}
                activeOpacity={0.85}
              >
                <View style={dts.pillIconWrap}>
                  <Feather name="package" size={18} color={deliveryTypePref === 'standard' ? C.white : C.gray500} />
                </View>
                <View style={dts.pillBody}>
                  <Text style={[dts.pillTitle, deliveryTypePref === 'standard' && dts.pillTitleActive]}>Standard</Text>
                  <Text style={[dts.pillSub, deliveryTypePref === 'standard' && dts.pillSubActive]}>
                    {deliveryInfo ? `~${deliveryInfo.eta_minutes} min` : 'Regular speed'}
                  </Text>
                </View>
                <Text style={[dts.pillFee, deliveryTypePref === 'standard' && dts.pillFeeActive]}>
                  {fetchingDeliveryInfo ? '...' :
                    liveStandardFee === 0 ? 'FREE' :
                    liveStandardFee != null ? `₹${liveStandardFee}` : `₹${baseFee}`
                  }
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[dts.pill, dts.pillQuick, deliveryTypePref === 'quick' && dts.pillQuickActive]}
                onPress={() => { if (proposedFee === null) setDeliveryTypePref('quick'); }}
                activeOpacity={0.85}
              >
                <View style={dts.pillIconWrap}>
                  <Feather name="zap" size={18} color={deliveryTypePref === 'quick' ? C.white : '#D97706'} />
                </View>
                <View style={dts.pillBody}>
                  <Text style={[dts.pillTitle, deliveryTypePref === 'quick' && dts.pillTitleQuickActive]}>Quick</Text>
                  <Text style={[dts.pillSub, deliveryTypePref === 'quick' && dts.pillSubQuickActive]}>
                    {deliveryInfo ? `~${deliveryInfo.quick_eta_minutes} min` : 'Faster delivery'}
                  </Text>
                </View>
                <Text style={[dts.pillFee, deliveryTypePref === 'quick' && dts.pillFeeQuickActive]}>
                  {fetchingDeliveryInfo ? '...' :
                    liveQuickFee != null ? `₹${liveQuickFee}` : '—'
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {/* Transparent fee breakdown */}
            {deliveryInfo?.fees && (
              <View style={dts.breakdown}>
                <View style={dts.bRow}>
                  <Feather name="map-pin" size={12} color={C.gray400} />
                  <Text style={dts.bLabel}>Distance charge</Text>
                  <Text style={dts.bVal}>₹{deliveryInfo.fees.distance_based_fee}</Text>
                </View>
                <View style={dts.bRow}>
                  <Feather name="shield" size={12} color={C.gray400} />
                  <Text style={dts.bLabel}>Min floor (₹20 or 2% of order)</Text>
                  <Text style={dts.bVal}>₹{deliveryInfo.fees.floor_used}</Text>
                </View>
                {deliveryInfo.fees.demand_surcharge_pct > 0 && (
                  <View style={dts.bRow}>
                    <Feather name="cloud-rain" size={12} color={C.amber} />
                    <Text style={[dts.bLabel, { color: C.amber }]}>Demand surcharge ({deliveryInfo.fees.demand_surcharge_pct}%)</Text>
                    <Text style={[dts.bVal, { color: C.amber }]}>+{deliveryInfo.fees.demand_surcharge_pct}%</Text>
                  </View>
                )}
                {deliveryTypePref === 'quick' && (
                  deliveryInfo.fees.quick_delivery_fee > 0 ? (
                    <View style={dts.bRow}>
                      <Feather name="zap" size={12} color={C.orange} />
                      <Text style={[dts.bLabel, { color: C.orange }]}>Flat Quick Delivery Surcharge</Text>
                      <Text style={[dts.bVal, { color: C.orange }]}>+₹{deliveryInfo.fees.quick_delivery_fee}</Text>
                    </View>
                  ) : (
                    <View style={dts.bRow}>
                      <Feather name="zap" size={12} color={C.orange} />
                      <Text style={[dts.bLabel, { color: C.orange }]}>Quick surcharge ({deliveryInfo.fees.quick_delivery_pct}%)</Text>
                      <Text style={[dts.bVal, { color: C.orange }]}>+{deliveryInfo.fees.quick_delivery_pct}%</Text>
                    </View>
                  )
                )}
                {deliveryInfo.fees.is_bad_weather && deliveryInfo.fees.weather_surcharge > 0 && (
                  <View style={dts.bRow}>
                    <Feather name="cloud-rain" size={12} color={C.red} />
                    <Text style={[dts.bLabel, { color: C.red }]}>Bad Weather Surcharge</Text>
                    <Text style={[dts.bVal, { color: C.red }]}>+₹{deliveryInfo.fees.weather_surcharge}</Text>
                  </View>
                )}
                {deliveryInfo.fees.is_free_delivery && deliveryTypePref === 'standard' && (
                  <View style={dts.bRow}>
                    <Feather name="gift" size={12} color={C.green} />
                    <Text style={[dts.bLabel, { color: C.green }]}>Free delivery threshold reached!</Text>
                    <Text style={[dts.bVal, { color: C.green }]}>FREE</Text>
                  </View>
                )}
                {deliveryInfo.fees.free_delivery_threshold != null && !deliveryInfo.fees.is_free_delivery && (
                  <View style={[dts.bRow, { backgroundColor: C.greenLight, borderRadius: 8, padding: 6, marginTop: 4 }]}>
                    <Feather name="info" size={12} color={C.green} />
                    <Text style={[dts.bLabel, { color: C.green, flex: 1 }]}>
                      Add ₹{Math.round(deliveryInfo.fees.free_delivery_threshold - liveSubtotal)} more for FREE standard delivery
                    </Text>
                  </View>
                )}
              </View>
            )}

            {proposedFee !== null && (
              <View style={dts.negotiatedNote}>
                <Feather name="check-circle" size={13} color={C.green} />
                <Text style={dts.negotiatedNoteText}>Using negotiated fee ₹{proposedFee} — delivery type locked</Text>
              </View>
            )}
          </Section>

          {/* ── SECTION 3: DELIVERY SLOT ──────────────────────────────── */}
          <Section
            num="3"
            title="Delivery Slot"
            icon="clock"
            cardR={cardR}
            px={px}
            rightElement={
              confirmedSlot ? (
                <TouchableOpacity onPress={() => setSlotModalVisible(true)}>
                  <Text style={{ color: C.green, fontWeight: "700", fontSize: 14 }}>Change</Text>
                </TouchableOpacity>
              ) : null
            }
          >
            {confirmedSlot ? (
              <View style={[s.slotDisplay, { backgroundColor: C.greenLight, borderColor: C.greenBorder }]}>
                <View style={s.slotInfo}>
                  <Text style={[s.slotDateText, { color: C.gray500, fontWeight: "500", fontSize: 12 }]}>Selected Slot</Text>
                  <Text style={[s.slotTimeText, { color: C.greenDark }]}>
                    {new Date(confirmedSlot.start).toDateString() === new Date().toDateString() ? "Today" : "Tomorrow"},{" "}
                    {new Date(confirmedSlot.start).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    {" – "}
                    {new Date(confirmedSlot.end).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </Text>
                </View>
                <Feather name="check-circle" size={24} color={C.green} />
              </View>
            ) : (
              <TouchableOpacity
                style={s.slotPickBtn}
                onPress={() => setSlotModalVisible(true)}
              >
                <Feather name="plus-circle" size={18} color={C.green} />
                <Text style={s.slotPickText}>Choose a delivery window</Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── SECTION 4: VENDOR CONTACT ────────────────────────────── */}
          <Section
            num="4"
            title="Vendor Contact"
            icon="phone"
            cardR={cardR}
            px={px}
          >
            {phoneStatus === "approved" ? (
              <View style={s.phoneBox}>
                <Feather name="phone-call" size={18} color={C.green} />
                <View style={{ flex: 1 }}>
                  <Text style={s.phoneValue}>{vendorPhone || "Shared"}</Text>
                  <Text style={s.phoneLabel}>Vendor contact approved</Text>
                </View>
                {vendorPhone && (
                  <TouchableOpacity
                    style={s.callBtn}
                    onPress={() => Linking.openURL(`tel:${vendorPhone}`)}
                    activeOpacity={0.85}
                  >
                    <Feather name="phone" size={14} color={C.white} />
                    <Text style={s.callBtnText}>Call</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : phoneStatus === "pending" ? (
              <View style={s.phoneWait}>
                <ActivityIndicator size="small" color={C.amber} />
                <Text style={s.phoneWaitText}>Request pending approval...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={s.phoneRequestBtn}
                onPress={handleRequestPhone}
                disabled={requestingPhone}
              >
                <Feather name="shield" size={16} color={C.gray600} />
                <Text style={s.phoneRequestText}>
                  {requestingPhone ? "Requesting..." : "Request Shop Contact"}
                </Text>
              </TouchableOpacity>
            )}
          </Section>

          {/* ── SECTION 5: PAYMENT METHOD (Only shown after acceptance) ── */}
          {orderStatus === "accepted" && (
            <View onLayout={(e) => { paymentSectionY.current = e.nativeEvent.layout.y; }}>
            <Section
              num="5"
              title="Payment Method"
              icon="credit-card"
              cardR={cardR}
              px={px}
            >
              {PAYMENT_METHODS.map((pm) => {
                const active = selectedPay === pm.id;
                return (
                  <View key={pm.id}>
                    <TouchableOpacity
                      style={[
                        s.payOption,
                        active && s.payOptionActive,
                        { borderRadius: cardR - 4 },
                      ]}
                      onPress={() => setSelectedPay(active ? null : pm.id)}
                      activeOpacity={0.85}
                    >
                      {/* ... existing pay option content ... */}
                      <View
                        style={[
                          s.payIcon,
                          {
                            backgroundColor: pm.color + "18",
                            borderRadius: cardR - 6,
                          },
                        ]}
                      >
                        <Feather
                          name={pm.icon}
                          size={isDesktop ? 22 : 19}
                          color={pm.color}
                        />
                      </View>
                      <View style={s.payBody}>
                        <Text
                          style={[
                            s.payLabel,
                            { fontSize: Math.round(15 * fs) },
                          ]}
                        >
                          {pm.label}
                        </Text>
                        <Text
                          style={[s.paySub, { fontSize: Math.round(12 * fs) }]}
                        >
                          {pm.sub}
                        </Text>
                      </View>
                      <View style={[s.radioOuter, active && s.radioOuterActive]}>
                        {active && <View style={s.radioDot} />}
                      </View>
                    </TouchableOpacity>

                    {/* expansion logic remains same... */}
                    {active && pm.id === "upi" && (
                      <View style={[s.upiPanel, { borderRadius: cardR - 4 }]}>
                        <Text
                          style={[
                            s.upiFieldLabel,
                            { fontSize: Math.round(12 * fs) },
                          ]}
                        >
                          Enter UPI ID
                        </Text>
                        <View
                          style={[
                            s.upiInputRow,
                            upiError && s.upiInputRowErr,
                            upiValidated && s.upiInputRowOk,
                          ]}
                        >
                          <Feather
                            name="at-sign"
                            size={15}
                            color={
                              upiValidated
                                ? C.green
                                : upiError
                                  ? C.red
                                  : C.gray400
                            }
                          />
                          <TextInput
                            style={[
                              s.upiInput,
                              { fontSize: Math.round(14 * fs) },
                            ]}
                            placeholder="yourname@upi"
                            placeholderTextColor={C.gray400}
                            value={upiId}
                            autoCapitalize="none"
                            autoCorrect={false}
                            onChangeText={(t) => {
                              setUpiId(t);
                              setUpiValidated(false);
                              setUpiError(null);
                              setSelectedUPI(null);
                            }}
                            underlineColorAndroid="transparent"
                            selectionColor={C.green}
                          />
                          {upiValidating && (
                            <ActivityIndicator size="small" color={C.green} />
                          )}
                          {upiValidated && !upiValidating && (
                            <Feather
                              name="check-circle"
                              size={16}
                              color={C.green}
                            />
                          )}
                        </View>
                        {upiError && (
                          <Text style={s.upiErrorText}>{upiError}</Text>
                        )}

                        {upiId.trim().length > 3 &&
                          !upiValidated &&
                          !upiValidating && (
                            <TouchableOpacity
                              style={s.verifyBtn}
                              activeOpacity={0.85}
                              onPress={async () => {
                                setUpiValidating(true);
                                setUpiError(null);
                                try {
                                  const res = await fetch(
                                    `${BASE_URL}/payments/verify-upi`,
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}`,
                                      },
                                      body: JSON.stringify({
                                        upi_id: upiId.trim(),
                                      }),
                                    },
                                  );
                                  const d = await res.json();
                                  if (d.valid || d.data?.valid) {
                                    setUpiValidated(true);
                                    setSelectedUPI("upi_id");
                                  } else {
                                    setUpiError(
                                      d.message ||
                                        "Invalid UPI ID. Please check and try again.",
                                    );
                                  }
                                } catch {
                                  setUpiValidated(true);
                                  setSelectedUPI("upi_id");
                                } finally {
                                  setUpiValidating(false);
                                }
                              }}
                            >
                              <Text
                                style={[
                                  s.verifyBtnText,
                                  { fontSize: Math.round(13 * fs) },
                                ]}
                              >
                                Verify UPI ID
                              </Text>
                            </TouchableOpacity>
                          )}

                        {upiValidated && (
                          <>
                            <View style={s.upiVerifiedRow}>
                              <Feather
                                name="check-circle"
                                size={14}
                                color={C.green}
                              />
                              <Text
                                style={[
                                  s.upiVerifiedText,
                                  { fontSize: Math.round(13 * fs) },
                                ]}
                              >
                                UPI ID verified
                              </Text>
                            </View>

                            {Platform.OS === "web" && (
                              <TouchableOpacity
                                style={s.qrBtn}
                                onPress={() => setShowQR(true)}
                                activeOpacity={0.85}
                              >
                                <Feather
                                  name="grid"
                                  size={16}
                                  color="#7C3AED"
                                />
                                <Text
                                  style={[
                                    s.qrBtnText,
                                    { fontSize: Math.round(13 * fs) },
                                  ]}
                                >
                                  Show QR to scan & pay
                                </Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}

                        <View style={s.upiDividerRow}>
                          <View style={s.upiDividerLine} />
                          <Text style={s.upiDividerText}>or pay using app</Text>
                          <View style={s.upiDividerLine} />
                        </View>

                        <View style={s.paySubRow}>
                          {pm.options.map((app) => {
                            const deepLinks = {
                              "Google Pay": `tez://upi/pay?pa=${upiId || "merchant@upi"}&pn=DesiDukaan&am=${total}&cu=INR`,
                              PhonePe: `phonepe://pay?pa=${upiId || "merchant@upi"}&pn=DesiDukaan&am=${total}&cu=INR`,
                              Paytm: `paytmmp://pay?pa=${upiId || "merchant@upi"}&pn=DesiDukaan&am=${total}&cu=INR`,
                              "Other UPI": `upi://pay?pa=${upiId || "merchant@upi"}&pn=DesiDukaan&am=${total}&cu=INR`,
                            };
                            const appActive = selectedUPI === app;
                            return (
                              <TouchableOpacity
                                key={app}
                                style={[
                                  s.upiChip,
                                  appActive && s.upiChipActive,
                                ]}
                                onPress={() => {
                                  setSelectedUPI(app);
                                  if (Platform.OS !== "web") {
                                    const { Linking } = require("react-native");
                                    Linking.canOpenURL(deepLinks[app]).then(
                                      (ok) => {
                                        if (ok) Linking.openURL(deepLinks[app]);
                                      },
                                    );
                                  }
                                }}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    s.upiChipText,
                                    appActive && s.upiChipTextActive,
                                    { fontSize: Math.round(13 * fs) },
                                  ]}
                                >
                                  {app}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {active && pm.id === "card" && (
                      <View style={[s.cardForm, { borderRadius: cardR - 4 }]}>
                        <View style={s.inputWrap}>
                          <Feather
                            name="credit-card"
                            size={15}
                            color={C.gray400}
                          />
                          <TextInput
                            style={[
                              s.cardInput,
                              { fontSize: Math.round(14 * fs) },
                            ]}
                            placeholder="Card number"
                            placeholderTextColor={C.gray400}
                            keyboardType="number-pad"
                            maxLength={19}
                            value={cardNum}
                            onChangeText={(t) =>
                              setCardNum(
                                t
                                  .replace(/\D/g, "")
                                  .replace(/(.{4})/g, "$1 ")
                                  .trim(),
                              )
                            }
                            underlineColorAndroid="transparent"
                            selectionColor={C.green}
                          />
                        </View>
                        <View style={s.inputRow}>
                          <View style={[s.inputWrap, { flex: 1 }]}>
                            <Feather
                              name="calendar"
                              size={15}
                              color={C.gray400}
                            />
                            <TextInput
                              style={[
                                s.cardInput,
                                { fontSize: Math.round(14 * fs) },
                              ]}
                              placeholder="MM/YY"
                              placeholderTextColor={C.gray400}
                              keyboardType="number-pad"
                              maxLength={5}
                              value={cardExpiry}
                              onChangeText={(t) => {
                                const c = t.replace(/\D/g, "");
                                setCardExpiry(
                                  c.length > 2
                                    ? `${c.slice(0, 2)}/${c.slice(2)}`
                                    : c,
                                );
                              }}
                              underlineColorAndroid="transparent"
                              selectionColor={C.green}
                            />
                          </View>
                          <View style={[s.inputWrap, { flex: 1 }]}>
                            <Feather name="lock" size={15} color={C.gray400} />
                            <TextInput
                              style={[
                                s.cardInput,
                                { fontSize: Math.round(14 * fs) },
                              ]}
                              placeholder="CVV"
                              placeholderTextColor={C.gray400}
                              keyboardType="number-pad"
                              maxLength={4}
                              secureTextEntry
                              value={cardCVV}
                              onChangeText={setCardCVV}
                              underlineColorAndroid="transparent"
                              selectionColor={C.green}
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </Section>
          </View>
          )}

          {/* ── ORDER SUMMARY (mobile/tablet inline) ─────────────────── */}
          {!isDesktop && (
            <View style={[sec.wrap, { borderRadius: cardR, marginHorizontal: px }]}>
              <Text style={[sec.title, { marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.gray100 }]}>Order Summary</Text>
              <OrderSummaryCard
                items={displayItems}
                subtotal={subtotal}
                deliveryFee={activeFee}
                baseFee={baseFee}
                total={total}
                onNegotiate={() => setFeeModalVisible(true)}
                deliveryTypePref={deliveryTypePref}
                fs={fs}
              />
            </View>
          )}

          {/* ── CANCELLATION POLICY — only on mobile/tablet (sidebar has it on desktop) */}
          {!isDesktop && (
            <View style={{ marginHorizontal: px, marginBottom: 12 }}>
              <CancellationPolicy />
            </View>
          )}

          {/* Place order button — mobile/tablet bottom of scroll */}
          {!isDesktop && (
            <View style={{ marginHorizontal: px }}>
              <PlaceOrderBtn
                status={orderStatus}
                total={total}
                canPlace={canPlace}
                placing={placing}
                onPress={orderStatus === "accepted" ? handlePayment : placeOrder}
                fs={fs}
              />
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ══ SIDEBAR — desktop only ═══════════════════════════════════ */}
        {isDesktop && (
          <View style={s.sideCol}>
            {/* Order Summary */}
            <View style={s.sideCard}>
              <Text style={s.sideCardTitle}>Order Summary</Text>
              <OrderSummaryCard
                items={displayItems}
                subtotal={subtotal}
                deliveryFee={activeFee}
                baseFee={baseFee}
                total={total}
                onNegotiate={() => setFeeModalVisible(true)}
                deliveryTypePref={deliveryTypePref}
                fs={fs}
              />
            </View>

            {/* Confirmed slot on sidebar */}
            {confirmedSlot && <SlotBanner slot={confirmedSlot} />}

            {/* Cancellation policy in sidebar */}
            <CancellationPolicy />

            {/* Place order button in sidebar */}
            <PlaceOrderBtn
              status={orderStatus}
              total={total}
              canPlace={canPlace}
              placing={placing}
              onPress={orderStatus === "accepted" ? handlePayment : placeOrder}
              fs={fs}
            />
          </View>
        )}
      </View>
      {/* /pageBody */}

      {/* ── QR Modal (web only) ─────────────────────────────────────── */}
      {Platform.OS === "web" && showQR && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setShowQR(false)}
        >
          <Pressable style={qr.backdrop} onPress={() => setShowQR(false)}>
            <Pressable style={qr.card} onPress={() => {}}>
              <View style={qr.header}>
                <Text style={qr.title}>Scan to Pay</Text>
                <TouchableOpacity
                  onPress={() => setShowQR(false)}
                  style={qr.closeBtn}
                >
                  <Feather name="x" size={18} color={C.gray600} />
                </TouchableOpacity>
              </View>
              {/* QR rendered as SVG via a UPI deep-link URL encoded into a public QR service */}
              <View style={qr.qrWrap}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `upi://pay?pa=${upiId}&pn=DesiDukaan&am=${total}&cu=INR&tn=DesiDukaan+Order`,
                  )}`}
                  alt="UPI QR Code"
                  style={{ width: 200, height: 200, borderRadius: 8 }}
                />
              </View>
              <Text style={qr.upiLabel}>{upiId}</Text>
              <Text style={qr.amtLabel}>₹{total}</Text>
              <Text style={qr.sub}>
                Scan with any UPI app — Google Pay, PhonePe, Paytm, etc.
              </Text>
              <TouchableOpacity
                style={qr.doneBtn}
                onPress={() => {
                  setShowQR(false);
                  placeOrder();
                }}
                activeOpacity={0.88}
              >
                <Text style={qr.doneBtnText}>I've paid — Place Order</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}


      {/* ── Negotiation / Wait for Store Modal ────────────────────────── */}
      <Modal
        visible={negotiationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (["rejected", "expired", "accepted"].includes(orderStatus)) {
            setNegotiationModalVisible(false);
          }
        }}
      >
        <Pressable
          style={negModal.backdrop}
          onPress={() => {
            if (["rejected", "expired", "accepted"].includes(orderStatus)) {
              setNegotiationModalVisible(false);
            }
          }}
        >
          <Pressable style={negModal.card} onPress={(e) => e.stopPropagation()}>
            {/* Close button — only when dismissible */}
            {["rejected", "expired", "accepted"].includes(orderStatus) && (
              <TouchableOpacity
                style={negModal.closeBtn}
                onPress={() => {
                  setNegotiationModalVisible(false);
                  if (orderStatus === "rejected" || orderStatus === "expired") {
                    setOrderStatus("idle");
                  }
                }}
              >
                <Feather name="x" size={16} color={C.gray600} />
              </TouchableOpacity>
            )}

            <NegotiationBanner
              status={orderStatus}
              countdown={countdown}
              vendorName={vendorName}
              onDismiss={null}
            />

            {orderStatus === "countered" && (
              <CounterOfferReview
                data={counterData}
                onAccept={() => { handleRespondCounter("accept"); }}
                onReject={() => { handleRespondCounter("reject"); setNegotiationModalVisible(false); }}
                placing={placing}
                deliveryTypePref={deliveryTypePref}
                deliveryInfo={deliveryInfo}
                confirmedSlot={confirmedSlot}
              />
            )}

            {(orderStatus === "pending" || orderStatus === "accepted") && (
              <View style={{
                backgroundColor: "#F8FAFC",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "#E2E8F0",
                padding: 16,
                marginTop: 14,
                marginBottom: 4,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: C.gray900,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 12,
                  textAlign: "center"
                }}>
                  {counterData && orderStatus === "accepted" ? "Counter Offer — Final Details" : "Selected Delivery Details"}
                </Text>

                {/* Delivery Time Row */}
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                }}>
                  <Text style={{ fontSize: 13, color: C.gray500, fontWeight: "600" }}>Delivery Time</Text>
                  <Text style={{ fontSize: 13, color: C.gray900, fontWeight: "700" }}>
                    {deliveryTypePref === "quick"
                      ? `⚡ ~${deliveryInfo?.quick_eta_minutes ?? 15} mins (Quick)`
                      : `~${deliveryInfo?.eta_minutes ?? 30} mins (Standard)`
                    }
                  </Text>
                </View>

                {/* Slot Row — uses counter slot if accepted after counter, else original confirmedSlot */}
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: "#F1F5F9",
                }}>
                  <Text style={{ fontSize: 13, color: C.gray500, fontWeight: "600" }}>Delivery Slot</Text>
                  <Text style={{ fontSize: 13, color: C.gray900, fontWeight: "700" }}>
                    {(() => {
                      // After accepting a counter offer, show the counter's slot (already merged into confirmedSlot)
                      const activeSlot = confirmedSlot;
                      if (!activeSlot) return "As soon as possible";
                      const startStr = new Date(activeSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const endStr = new Date(activeSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const dayStr = new Date(activeSlot.start).toDateString() === new Date().toDateString() ? "Today" : "Tomorrow";
                      return `${dayStr}, ${startStr} - ${endStr}`;
                    })()}
                  </Text>
                </View>

                {/* Delivery Charges Row — show counter fee when available */}
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                }}>
                  <Text style={{ fontSize: 13, color: C.gray500, fontWeight: "600" }}>Delivery Charges</Text>
                  <Text style={{ fontSize: 13, color: C.greenDark, fontWeight: "800" }}>
                    ₹{counterData && orderStatus === "accepted"
                      ? (counterData.delivery_fee ?? activeFee)
                      : activeFee}
                  </Text>
                </View>

                {/* Vendor phone row — shown when approved */}
                {phoneStatus === "approved" && vendorPhone && (
                  <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#F1F5F9",
                    marginTop: 4,
                  }}>
                    <Text style={{ fontSize: 13, color: C.gray500, fontWeight: "600" }}>Vendor Phone</Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${vendorPhone}`)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6,
                        backgroundColor: C.greenLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    >
                      <Feather name="phone" size={13} color={C.green} />
                      <Text style={{ fontSize: 13, fontWeight: "800", color: C.greenDark }}>{vendorPhone}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {orderStatus === "accepted" && (
              <TouchableOpacity
                style={negModal.proceedBtn}
                onPress={() => {
                  setNegotiationModalVisible(false);
                  // Navigate to dedicated PaymentScreen with all final order data
                  const finalSlot = counterData?.slot
                    ? { start: counterData.slot.start, end: counterData.slot.end }
                    : confirmedSlot;
                  const finalFee = counterData?.delivery_fee != null
                    ? counterData.delivery_fee
                    : activeFee;
                  const finalTotal = counterData?.total != null ? counterData.total : total;
                  navigation.navigate("Payment", {
                    orderId,
                    orderNumber: `ORD-${orderId}`,
                    vendorName,
                    items: displayItems,
                    subtotal,
                    deliveryFee: finalFee,
                    total: finalTotal,
                    confirmedSlot: finalSlot,
                    deliveryTypePref,
                    vendorPhone,
                    phoneStatus,
                    preSelectedPay: selectedPay,
                  });
                }}
                activeOpacity={0.85}
              >
                <Feather name="credit-card" size={16} color={C.white} />
                <Text style={negModal.proceedBtnText}>Proceed to Payment</Text>
              </TouchableOpacity>
            )}

            {orderStatus === "pending" && (
              <>
                <View style={negModal.pendingNote}>
                  <Feather name="info" size={13} color={C.amber} />
                  <Text style={negModal.pendingNoteText}>
                    Waiting for store response. Timer is running — we'll alert you here.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[negModal.proceedBtn, { backgroundColor: C.gray600, marginTop: 10 }]}
                  onPress={() => {
                    setNegotiationModalVisible(false);
                    navigation.navigate("CustomerApp", {
                      screen: "CustomerTabNavigator",
                      params: { screen: "Home" },
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name="home" size={16} color={C.white} />
                  <Text style={negModal.proceedBtnText}>Browse while waiting</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Show negotiation status chip on main screen when modal closed ── */}
      {orderStatus !== "idle" && !negotiationModalVisible && (
        <TouchableOpacity
          style={negModal.statusChip}
          onPress={() => setNegotiationModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={[negModal.chipDot, {
            backgroundColor:
              orderStatus === "accepted" ? C.green :
              orderStatus === "pending" ? C.orange :
              orderStatus === "countered" ? "#7C3AED" : C.red
          }]} />
          <Text style={negModal.chipText}>
            {orderStatus === "accepted" ? "Order Accepted — Tap to pay" :
             orderStatus === "pending" ? `Waiting for store... ${countdown}s` :
             orderStatus === "countered" ? "Store sent adjustments — Tap to review" :
             orderStatus === "rejected" ? "Order Declined" : "Request Expired"}
          </Text>
          <Feather name="chevron-up" size={14} color={C.gray600} />
        </TouchableOpacity>
      )}

      <SlotModal
        visible={slotModalVisible}
        onClose={() => setSlotModalVisible(false)}
        onConfirm={handleRequestSlot}
        loading={requestingSlot}
        vendor={vendor}
      />

      <FeeModal
        visible={feeModalVisible}
        currentFee={activeFee}
        onClose={() => setFeeModalVisible(false)}
        onPropose={(fee) => {
          setProposedFee(fee);
          setFeeModalVisible(false);
        }}
      />

      {/* ── In-app Toast Notification ─────────────────────────────── */}
      {toast.visible && (
        <View
          style={[
            toastStyle.wrap,
            toast.type === "success" && toastStyle.success,
            toast.type === "error" && toastStyle.error,
          ]}
          pointerEvents="none"
        >
          <Text style={toastStyle.text}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}
// ─── Place Order Button (shared mobile + desktop) ─────────────────────────────
function PlaceOrderBtn({ status, total, canPlace, placing, onPress, fs = 1 }) {
  const isAccepted = status === "accepted";
  const label = isAccepted
    ? "Pay Now"
    : status === "pending"
      ? "Waiting for store..."
      : "Send Order Request";
  const icon = isAccepted ? "credit-card" : "send";

  return (
    <TouchableOpacity
      style={[pob.btn, (!canPlace || status === "pending") && pob.btnDisabled]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={placing || !canPlace || status === "pending"}
    >
      {placing ? (
        <View style={pob.grad}>
          <ActivityIndicator color={C.white} />
          <Text style={[pob.text, { fontSize: Math.round(16 * fs) }]}>
            Processing...
          </Text>
        </View>
      ) : (
        <LinearGradient
          colors={
            canPlace && status !== "pending"
              ? [C.green, C.greenDark]
              : [C.gray300, C.gray300]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={pob.grad}
        >
          <View style={pob.totalWrap}>
            <Text style={[pob.totalAmt, { fontSize: Math.round(18 * fs) }]}>
              ₹{total}
            </Text>
            <Text style={[pob.totalLbl, { fontSize: Math.round(10 * fs) }]}>
              TOTAL
            </Text>
          </View>
          <View style={pob.divider} />
          <Text style={[pob.text, { fontSize: Math.round(16 * fs) }]}>
            {label}
          </Text>
          <Feather
            name={icon}
            size={isFinite(fs) ? Math.round(18 * fs) : 18}
            color={C.white}
          />
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}
const pob = StyleSheet.create({
  btn: { borderRadius: 16, overflow: "hidden", marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  grad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    paddingHorizontal: 20,
  },
  totalWrap: { alignItems: "center" },
  totalAmt: { fontSize: 18, fontWeight: "900", color: C.white },
  totalLbl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: "900",
    color: C.white,
    flex: 1,
    textAlign: "center",
  },
});

/* Additional Styles for Slot/Contact */
const extraStyles = {
  slotPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.greenLight,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: C.green,
  },
  slotPickText: { fontSize: 15, fontWeight: "700", color: C.green },
  slotDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.greenLight,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  slotInfo: { gap: 2 },
  slotTimeText: { fontSize: 16, fontWeight: "900", color: C.greenDark },
  slotDateText: { fontSize: 12, color: C.green, fontWeight: "600" },
  slotChangeBtn: {
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  slotChangeText: { fontSize: 13, fontWeight: "700", color: C.green },
  phoneBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.greenLight,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.greenBorder,
    flexWrap: "wrap",
  },
  phoneValue: { fontSize: 18, fontWeight: "900", color: C.greenDark },
  phoneLabel: { fontSize: 12, color: C.green, width: "100%", marginTop: 2 },
  phoneWait: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.amberLight,
  },
  phoneWaitText: { fontSize: 14, color: C.amber, fontWeight: "700" },
  phoneRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.gray100,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  phoneRequestText: { fontSize: 14, fontWeight: "700", color: C.gray600 },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.green,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  callBtnText: { fontSize: 13, fontWeight: "800", color: C.white },
};

// ─── Local time parser (fallback) ───────────────────────────────────────────
function parseSlotLocally(input) {
  if (!input?.trim()) return null;
  const txt = input.trim().toLowerCase();
  const now = new Date();
  const baseDate = new Date(now);
  if (txt.includes("tomorrow")) baseDate.setDate(baseDate.getDate() + 1);
  const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;
  const times = [];
  let m;
  while ((m = timeRe.exec(txt)) !== null) {
    let h = parseInt(m[1]);
    const min = parseInt(m[2] || "0");
    const ap = m[3];
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    times.push({ h, min });
  }
  if (times.length < 2) return null;
  const [s, e] = times;
  const start = new Date(baseDate);
  start.setHours(s.h, s.min, 0, 0);
  const end = new Date(baseDate);
  end.setHours(e.h, e.min, 0, 0);
  if (end <= start) return null;
  if (start <= now) return null;
  const fmt = (d) =>
    d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  return {
    valid: true,
    slot_start: new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, -1),
    slot_end: new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, -1),
    start_label: fmt(start),
    end_label: fmt(end),
  };
}

// ─── Fee Modal ───────────────────────────────────────────────────────────────
function FeeModal({ visible, currentFee, onClose, onPropose }) {
  const [val, setVal] = useState(String(currentFee || ""));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fm.backdrop} onPress={onClose}>
        <Pressable style={fm.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={fm.handle} />
          <Text style={fm.title}>Negotiate delivery fee</Text>
          <Text style={fm.sub}>Enter what you'd like to pay for delivery</Text>
          <View style={fm.inputBox}>
            <Text style={fm.rupee}>₹</Text>
            <TextInput
              style={fm.input}
              value={val}
              onChangeText={setVal}
              keyboardType="number-pad"
              autoFocus
            />
          </View>
          <TouchableOpacity 
            style={fm.confirmBtn} 
            onPress={() => onPropose(parseInt(val || "0", 10))}
          >
            <Text style={fm.confirmBtnText}>Confirm Proposal</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 4 },
  sub: { fontSize: 13, color: C.gray400, marginBottom: 16 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: C.gray100, borderRadius: 14, paddingHorizontal: 16, height: 60 },
  rupee: { fontSize: 24, fontWeight: "900", color: C.gray500, marginRight: 8 },
  input: { flex: 1, fontSize: 24, fontWeight: "900", color: C.gray900 },
  confirmBtn: { marginTop: 20, backgroundColor: C.green, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { fontSize: 16, fontWeight: "800", color: C.white },
});

// ─── Slot picker modal ────────────────────────────────────────────────────────
const SLOT_OPTIONS = [
  { label: "7 – 9 AM",   start: 7,  end: 9  },
  { label: "9 – 11 AM",  start: 9,  end: 11 },
  { label: "11 AM – 1 PM", start: 11, end: 13 },
  { label: "1 – 3 PM",   start: 13, end: 15 },
  { label: "3 – 5 PM",   start: 15, end: 17 },
  { label: "5 – 7 PM",   start: 17, end: 19 },
  { label: "7 – 9 PM",   start: 19, end: 21 },
];

function SlotModal({ visible, onClose, onConfirm, loading, vendor }) {
  const [day, setDay] = useState("today");
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (visible) {
      setDay("today");
      setSelectedSlot(null);
    }
  }, [visible]);

  const timeToDec = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    return h + m / 60;
  };

  const getISODate = (hour) => {
    const d = new Date();
    if (day === "tomorrow") d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;

  const isSlotDisabled = (slot) => {
    if (day === "tomorrow") return false;
    // Disable if slot start is within 1 hour from now
    return slot.start <= nowHour + 1;
  };

  const isSlotOutsideHours = (slot) => {
    if (!vendor) return false;
    const open = timeToDec(vendor.opening_time);
    const close = timeToDec(vendor.closing_time);
    if (open === null || close === null) return false;
    return slot.start < open || slot.end > close;
  };

  const handleConfirm = () => {
    if (!selectedSlot) return;
    onConfirm({ slot_start: getISODate(selectedSlot.start), slot_end: getISODate(selectedSlot.end) });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sm.backdrop} onPress={onClose}>
        <Pressable style={sm.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={sm.handle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={sm.title}>Choose delivery window</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Feather name="x" size={22} color={C.gray500} />
            </TouchableOpacity>
          </View>
          <Text style={sm.sub}>Pick a time slot for your delivery</Text>

          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontWeight: '700', marginBottom: 10, color: C.gray700 }}>Select Day</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['today', 'tomorrow'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    sm.hintChip,
                    day === d && { borderColor: C.green, backgroundColor: C.greenLight }
                  ]}
                  onPress={() => { setDay(d); setSelectedSlot(null); }}
                >
                  <Text style={[sm.hintText, day === d && { color: C.green }]}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={{ fontWeight: '700', marginBottom: 10, color: C.gray700 }}>Available Slots</Text>
          <View style={sm.slotGrid}>
            {SLOT_OPTIONS.map((slot) => {
              const disabled = isSlotDisabled(slot);
              const outsideHours = isSlotOutsideHours(slot);
              const unavailable = disabled || outsideHours;
              const active = selectedSlot?.label === slot.label;
              return (
                <TouchableOpacity
                  key={slot.label}
                  style={[
                    sm.slotChip,
                    active && sm.slotChipActive,
                    unavailable && sm.slotChipDisabled,
                  ]}
                  onPress={() => !unavailable && setSelectedSlot(slot)}
                  activeOpacity={unavailable ? 1 : 0.75}
                >
                  <Feather
                    name="clock"
                    size={12}
                    color={active ? C.white : unavailable ? C.gray300 : C.green}
                  />
                  <Text style={[
                    sm.slotChipText,
                    active && sm.slotChipTextActive,
                    unavailable && sm.slotChipTextDisabled,
                  ]}>{slot.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedSlot && (
            <View style={[sm.preview, sm.previewValid]}>
              <Feather name="check-circle" size={16} color={C.green} />
              <Text style={sm.previewText}>
                Delivery on <Text style={sm.previewBold}>{day === 'today' ? 'Today' : 'Tomorrow'}</Text>, window: <Text style={sm.previewBold}>{selectedSlot.label}</Text>
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[sm.confirmBtn, (!selectedSlot || loading) && sm.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedSlot || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Text style={sm.confirmBtnText}>
                {selectedSlot ? "Confirm this slot →" : "Select a slot"}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.gray200,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: C.gray900,
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: C.gray400, marginBottom: 16 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.gray100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    minHeight: 52,
    paddingRight: 4,
  },
  inputBoxError: { borderColor: C.red, backgroundColor: C.redLight },
  inputBoxValid: { borderColor: C.green, backgroundColor: C.greenLight },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.gray900,
    paddingLeft: 10,
    paddingVertical: 14,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  hints: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  hintChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.gray100,
    borderWidth: 1.5,
    borderColor: C.gray200,
  },
  hintText: { fontSize: 13, color: C.gray600, fontWeight: "600" },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
  },
  previewValid: { backgroundColor: C.greenLight },
  previewInvalid: { backgroundColor: C.redLight },
  previewText: { fontSize: 14, color: C.greenDark },
  previewBold: { fontWeight: "800" },
  previewTextErr: { fontSize: 13, color: C.red, flex: 1 },
  confirmBtn: {
    marginTop: 18,
    backgroundColor: C.green,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmBtnDisabled: { backgroundColor: C.greenMid },
  confirmBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  slotChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.greenBorder,
    backgroundColor: C.greenLight,
  },
  slotChipActive: {
    backgroundColor: C.green,
    borderColor: C.greenDark,
  },
  slotChipDisabled: {
    backgroundColor: C.gray100,
    borderColor: C.gray200,
  },
  slotChipText: { fontSize: 13, fontWeight: "700", color: C.green },
  slotChipTextActive: { color: C.white },
  slotChipTextDisabled: { color: C.gray300 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  ...extraStyles,

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.white,
    paddingTop: Platform.OS === "android" ? 28 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  headerSub: { fontSize: 12, color: C.green, marginTop: 1, fontWeight: "700" },
  totalChip: {
    backgroundColor: C.greenMid,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  totalChipText: { fontSize: 14, fontWeight: "900", color: C.greenDark },

  // Page layout
  pageBody: { flex: 1, flexDirection: "row" },
  pageBodyDesktop: {},
  mainCol: { flex: 1 },

  // Sidebar
  sideCol: {
    width: 380,
    backgroundColor: C.bg,
    borderLeftWidth: 1,
    borderLeftColor: C.gray200,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  sideCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  sideCardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: C.gray900,
    marginBottom: 14,
  },

  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.redLight,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: { flex: 1, fontSize: 13, color: C.red, fontWeight: "500" },

  // Address options
  addrOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  addrOptionActive: { borderColor: C.green, backgroundColor: C.greenLight },
  addrIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addrBody: { flex: 1 },
  addrTitle: { fontSize: 14, fontWeight: "700", color: C.gray900 },
  addrSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  addrDetected: {
    fontSize: 12,
    color: C.green,
    marginTop: 2,
    fontWeight: "600",
  },

  // Radio buttons
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.gray300,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOuterActive: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
  },

  // Address action buttons (2-col GPS + Manual)
  addrActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  addrActionBtnActive: { borderColor: C.green, backgroundColor: C.greenLight },
  addrActionBtnOrange: { borderColor: C.orange, backgroundColor: C.orange },
  addrActionText: { fontSize: 12, fontWeight: "600", textAlign: "center" },

  // Manual form
  manualForm: {
    backgroundColor: C.gray100,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  labelRow: { flexDirection: "row", gap: 8 },
  labelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  labelChipActive: { borderColor: C.green, backgroundColor: C.greenLight },
  labelChipText: { fontSize: 13, fontWeight: "600", color: C.gray500 },
  labelChipTextActive: { color: C.green },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.gray900,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  inputRow: { flexDirection: "row", gap: 10 },
  useAddrBtn: { borderRadius: 12, overflow: "hidden", marginTop: 4 },
  useAddrGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
  },
  useAddrText: { fontSize: 14, fontWeight: "800", color: C.white },

  // Payment
  payOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  payOptionActive: { borderColor: C.green, backgroundColor: C.greenLight },
  payIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  payBody: { flex: 1 },
  payLabel: { fontSize: 15, fontWeight: "700", color: C.gray900 },
  paySub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  paySubRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  upiChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  upiChipActive: { borderColor: C.green, backgroundColor: C.greenLight },
  upiChipText: { fontSize: 13, fontWeight: "600", color: C.gray600 },
  upiChipTextActive: { color: C.green },

  // Card form
  cardForm: {
    backgroundColor: C.gray100,
    padding: 12,
    gap: 10,
    marginBottom: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  cardInput: {
    flex: 1,
    fontSize: 14,
    color: C.gray900,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },

  // UPI panel
  upiPanel: { backgroundColor: C.bg, padding: 14, gap: 10, marginBottom: 8 },
  upiFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.gray600,
    marginBottom: 2,
  },
  upiInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  upiInputRowErr: { borderColor: C.red, backgroundColor: C.redLight },
  upiInputRowOk: { borderColor: C.green, backgroundColor: C.greenLight },
  upiInput: {
    flex: 1,
    fontSize: 14,
    color: C.gray900,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  upiErrorText: {
    fontSize: 12,
    color: C.red,
    fontWeight: "500",
    marginTop: -4,
  },
  verifyBtn: {
    backgroundColor: "#7C3AED18",
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  verifyBtnText: { fontSize: 13, fontWeight: "700", color: "#7C3AED" },
  upiVerifiedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  upiVerifiedText: { fontSize: 13, color: C.green, fontWeight: "600" },
  qrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  qrBtnText: { fontSize: 13, fontWeight: "700", color: "#7C3AED" },
  upiDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  upiDividerLine: { flex: 1, height: 1, backgroundColor: C.gray200 },
  upiDividerText: { fontSize: 11, color: C.gray400, fontWeight: "600" },
  mapWrapper: {
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: C.gray200,
  },
});

// ─── QR modal styles ──────────────────────────────────────────────────────────
const qr = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: 320,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  qrWrap: {
    padding: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.gray200,
    marginVertical: 8,
  },
  upiLabel: { fontSize: 14, fontWeight: "700", color: C.gray700 },
  amtLabel: { fontSize: 28, fontWeight: "900", color: C.gray900 },
  sub: { fontSize: 12, color: C.gray400, textAlign: "center", lineHeight: 17 },
  doneBtn: {
    backgroundColor: C.green,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 4,
    width: "100%",
    alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
});

// ─── In-app Toast StyleSheet ─────────────────────────────────────────────────
const toastStyle = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 20,
    backgroundColor: C.gray900,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    zIndex: 9999,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  success: { backgroundColor: C.green },
  error: { backgroundColor: "#DC2626" },
  text: { color: C.white, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});

// ─── Negotiation Modal Styles ─────────────────────────────────────────────────
const negModal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 440,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  proceedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.green,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  proceedBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
  pendingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: C.amberLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  pendingNoteText: { flex: 1, fontSize: 12, color: C.amber, fontWeight: "600", lineHeight: 17 },
  // Status chip shown at bottom of screen when modal is dismissed
  statusChip: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.gray200,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chipDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  chipText: { flex: 1, fontSize: 13, fontWeight: "700", color: C.gray700 },
});
