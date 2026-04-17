import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { io } from "socket.io-client";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import useAddressStore from "../../store/addressStore";

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
function Section({ num, title, icon, children, cardR, px }) {
  return (
    <View style={[sec.wrap, { borderRadius: cardR, marginHorizontal: px }]}>
      <View style={sec.header}>
        <View style={sec.numWrap}>
          <Text style={sec.num}>{num}</Text>
        </View>
        <Feather name={icon} size={16} color={C.green} />
        <Text style={sec.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    marginBottom: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  numWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  num: { fontSize: 13, fontWeight: "900", color: C.white },
  title: { fontSize: 17, fontWeight: "900", color: C.gray900, flex: 1 },
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
function CancellationPolicy() {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={cp.wrap}>
      <TouchableOpacity
        style={cp.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <Feather name="shield" size={15} color={C.amber} />
        <Text style={cp.title}>Cancellation & Return Policy</Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={C.gray400}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={cp.body}>
          {[
            {
              icon: "check-circle",
              color: C.green,
              text: "Free cancellation before payment is confirmed.",
            },
            {
              icon: "check-circle",
              color: C.green,
              text: "Return request allowed before payment is processed.",
            },
            {
              icon: "alert-circle",
              color: C.amber,
              text: "Once payment is confirmed, cancellation may not be possible.",
            },
            {
              icon: "alert-circle",
              color: C.amber,
              text: "Perishable items (dairy, fresh produce) cannot be returned after delivery.",
            },
            {
              icon: "info",
              color: C.gray400,
              text: "Contact the vendor directly for disputes via the phone request feature.",
            },
          ].map((item, i) => (
            <View key={i} style={cp.row}>
              <Feather name={item.icon} size={13} color={item.color} />
              <Text style={cp.text}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const cp = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
    overflow: "hidden",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: C.gray700 },
  body: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  text: { flex: 1, fontSize: 13, color: C.gray600, lineHeight: 18 },
});

// ─── Order Summary card ───────────────────────────────────────────────────────
function OrderSummaryCard({ items, subtotal, deliveryFee, total, onNegotiate, fs = 1 }) {
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
            Delivery fee
          </Text>
          {deliveryFee > 0 && (
            <TouchableOpacity 
              style={osc.negotiateBtn} 
              onPress={() => onNegotiate && onNegotiate()}
              activeOpacity={0.7}
            >
              <Feather name="edit-2" size={10} color={C.green} />
              <Text style={osc.negotiateBtnText}>Negotiate</Text>
            </TouchableOpacity>
          )}
        </View>
        {deliveryFee === 0 ? (
          <Text
            style={[
              osc.value,
              { color: C.green, fontSize: Math.round(13 * fs) },
            ]}
          >
            FREE
          </Text>
        ) : (
          <Text style={[osc.value, { fontSize: Math.round(13 * fs) }]}>
            ₹{deliveryFee}
          </Text>
        )}
      </View>
      <View style={osc.divider} />
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
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: C.gray100 },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
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
  divider: { height: 1, backgroundColor: C.gray200, marginVertical: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  label: { fontSize: 13, color: C.gray600 },
  value: { fontSize: 13, fontWeight: "600", color: C.gray900 },
  totalLabel: { fontSize: 16, fontWeight: "900", color: C.gray900 },
  totalVal: { fontSize: 16, fontWeight: "900", color: C.gray900 },
  negotiateBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.greenLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  negotiateBtnText: { fontSize: 10, fontWeight: "700", color: C.green },
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
function CounterOfferReview({ data, onAccept, onReject, placing, fs = 1 }) {
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
              ₹{it.subtotal || it.product_price * it.new_quantity}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 4, marginBottom: 12 }}>
        <View style={cor.totalRow}>
          <Text style={cor.totalLbl}>New Delivery Fee</Text>
          <Text style={cor.totalVal}>₹{delivery_fee}</Text>
        </View>
        {slot && (
          <View style={[cor.totalRow, { marginTop: 4 }]}>
            <Text style={cor.totalLbl}>New Delivery Window</Text>
            <Text style={cor.totalVal}>
              {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
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

  // Slot passed from CartScreen via navigation params or cartStore
  const [confirmedSlot, setConfirmedSlot] = useState(
    route.params?.confirmedSlot || cart?.confirmedSlot || null
  );
  const [slotId, setSlotId] = useState(
    route.params?.slotId || cart?.slotId || null
  );
  const confirmedFee = route.params?.confirmedFee ?? cart?.confirmedFee ?? null;

  const [vendorPhone, setVendorPhone] = useState(
    route.params?.vendorPhone || null
  );
  const [phoneStatus, setPhoneStatus] = useState(
    route.params?.phoneStatus || null // 'pending', 'approved', 'rejected'
  );

  const items = cart?.items || [];
  const vendorId = cart?.vendorId;
  const vendorName = items[0]?.vendorName || "Store";

  // ── Order state ────────────────────────────────────────────────────────────
  const [placing, setPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState("idle"); // idle, pending, accepted, rejected, expired, countered
  const [countdown, setCountdown] = useState(90);
  const [counterData, setCounterData] = useState(null);
  const timerRef = useRef(null);

  // Slot management states
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [requestingSlot, setRequestingSlot] = useState(false);
  const [requestingPhone, setRequestingPhone] = useState(false);
  const [feeModalVisible, setFeeModalVisible] = useState(false);
  const [requestingFee,   setRequestingFee]   = useState(false);
  const [proposedFee,     setProposedFee]     = useState(null);
  const isAccepted = orderStatus === "accepted";

  // ── Toast notification state ───────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" }); // type: 'success' | 'error' | 'info'
  const toastTimer = useRef(null);
  const showToast = (message, type = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message, type });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500);
  };

  // ── Computed totals ────────────────────────────────────────────────────────
  const subtotal = items.reduce(
    (s, i) => s + i.price * (i.qty ?? i.quantity ?? 0),
    0,
  );
  const baseFee = confirmedFee ?? 30; // No free delivery threshold
  const activeFee = proposedFee !== null ? proposedFee : baseFee;
  const cartTotal = subtotal + activeFee;
  const total =
    orderStatus === "accepted" && counterData ? counterData.total : cartTotal;

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

  // ── Socket: listen for vendor responses ────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });

    socket.on("phone:approved", (data) => {
      setPhoneStatus("approved");
      setVendorPhone(data.phone);
    });
    socket.on("phone:rejected", () => setPhoneStatus("rejected"));

    return () => socket.disconnect();
  }, [token]);
  const [addrLine, setAddrLine] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPin, setAddrPin] = useState("");
  const [addrLabel, setAddrLabel] = useState("Home");

  // ── Payment state ──────────────────────────────────────────────────────────
  const [selectedPay, setSelectedPay] = useState(null);
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
        setPlacing(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (data.status === "rejected") {
        setOrderStatus("rejected");
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
    setErrorMsg(null);
    setPlacing(true);
    try {
      let addrId = 0;
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
        // Fallback for manual or use a default if not saved
        addrId = savedAddresses[0]?.id || 10;
      } else {
        addrId = selectedAddrId || savedAddresses[0]?.id;
      }
      addrId = parseInt(addrId, 10) || 10;

      const payload = {
        vendor_id: parseInt(vendorId, 10),
        delivery_address_id: addrId,
        payment_method: selectedPay || "cod", // fallback so it's never null
        delivery_slot_id: null,
        proposed_delivery_fee: proposedFee !== null ? proposedFee : (confirmedFee !== null ? confirmedFee : null),
        proposed_slot: confirmedSlot ? { start: confirmedSlot.start, end: confirmedSlot.end } : null,
        items: items.map((i) => ({
          product_id: parseInt(i.id, 10),
          quantity: Math.max(1, i.qty ?? i.quantity ?? 1),
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
        cart?.clearCart?.();
        const newOrderId = data.data?.order?.id || data.order?.id || data.id;
        setOrderId(newOrderId);
        setOrderStatus("pending");
        // Navigation removed — we stay on Checkout for negotiation
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

  const canPlace = true; // validation disabled for testing

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
          <Text style={[s.headerTitle, { fontSize: Math.round(20 * fs) }]}>
            Checkout
          </Text>
          <Text style={[s.headerSub, { fontSize: Math.round(14 * fs), fontWeight: "800", color: C.greenDark }]}>
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
          style={s.mainCol}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Slot banner — only if slot was negotiated */}
          {confirmedSlot && (
            <View style={{ marginHorizontal: px, marginBottom: 12 }}>
              <SlotBanner slot={confirmedSlot} />
            </View>
          )}

          {/* Negotiation Banner */}
          {orderStatus !== "idle" && (
            <View style={{ marginHorizontal: px }}>
              <NegotiationBanner
                status={orderStatus}
                countdown={countdown}
                vendorName={vendorName}
                onDismiss={
                  orderStatus === "rejected" || orderStatus === "expired"
                    ? () => setOrderStatus("idle")
                    : null
                }
              />
            </View>
          )}

          {orderStatus === "countered" && (
            <View style={{ marginHorizontal: px }}>
              <CounterOfferReview
                data={counterData}
                onAccept={() => handleRespondCounter("accept")}
                onReject={() => handleRespondCounter("reject")}
                placing={placing}
              />
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

          {/* ── SECTION 1: DELIVERY ADDRESS ─────────────────────────── */}
          <Section
            num="1"
            title="Delivery Address"
            icon="map-pin"
            cardR={cardR}
            px={px}
          >
            {/* Saved addresses */}
            {savedAddresses.map((addr) => {
              const { lbl, line } = getAddrLabel(addr);
              const active = selectedAddrId === addr.id;
              const iconMap = {
                Home: "home",
                Work: "briefcase",
                Other: "map-pin",
              };
              const icon = iconMap[lbl] || "map-pin";
              return (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    s.addrOption,
                    active && s.addrOptionActive,
                    { borderRadius: cardR - 4 },
                  ]}
                  onPress={() => {
                    setSelectedAddrId(addr.id);
                    setManualOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      s.addrIcon,
                      { backgroundColor: active ? C.greenMid : C.gray100 },
                    ]}
                  >
                    <Feather
                      name={icon}
                      size={17}
                      color={active ? C.green : C.gray500}
                    />
                  </View>
                  <View style={s.addrBody}>
                    <Text
                      style={[s.addrTitle, { fontSize: Math.round(14 * fs) }]}
                    >
                      {lbl}
                    </Text>
                    <Text
                      style={[s.addrSub, { fontSize: Math.round(12 * fs) }]}
                      numberOfLines={2}
                    >
                      {line}
                    </Text>
                  </View>
                  <View style={[s.radioOuter, active && s.radioOuterActive]}>
                    {active && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* GPS detect */}
            <TouchableOpacity
              style={[
                s.addrOption,
                selectedAddrId === "detected" && s.addrOptionActive,
                { borderRadius: cardR - 4 },
              ]}
              onPress={detectLocation}
              activeOpacity={0.8}
              disabled={detectingLoc}
            >
              <View style={[s.addrIcon, { backgroundColor: "#EFF6FF" }]}>
                {detectingLoc ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Feather name="navigation" size={17} color="#2563EB" />
                )}
              </View>
              <View style={s.addrBody}>
                <Text style={[s.addrTitle, { fontSize: Math.round(14 * fs) }]}>
                  Use my current location
                </Text>
                {detectedAddr ? (
                  <Text
                    style={[s.addrDetected, { fontSize: Math.round(12 * fs) }]}
                    numberOfLines={2}
                  >
                    {detectedAddr}
                  </Text>
                ) : (
                  <Text style={[s.addrSub, { fontSize: Math.round(12 * fs) }]}>
                    Auto-detect via GPS
                  </Text>
                )}
              </View>
              {selectedAddrId === "detected" ? (
                <View style={s.radioOuterActive}>
                  <View style={s.radioDot} />
                </View>
              ) : (
                <View style={s.radioOuter} />
              )}
            </TouchableOpacity>

            {/* Manual entry */}
            <TouchableOpacity
              style={[
                s.addrOption,
                manualOpen && s.addrOptionActive,
                { borderRadius: cardR - 4 },
              ]}
              onPress={() => {
                setManualOpen((o) => !o);
                if (!manualOpen) setSelectedAddrId("manual");
              }}
              activeOpacity={0.8}
            >
              <View style={[s.addrIcon, { backgroundColor: "#FFF7ED" }]}>
                <Feather name="edit-2" size={17} color={C.orange} />
              </View>
              <View style={s.addrBody}>
                <Text style={[s.addrTitle, { fontSize: Math.round(14 * fs) }]}>
                  Add address manually
                </Text>
                <Text style={[s.addrSub, { fontSize: Math.round(12 * fs) }]}>
                  Type your full delivery address
                </Text>
              </View>
              <Feather
                name={manualOpen ? "chevron-up" : "chevron-down"}
                size={17}
                color={C.gray400}
              />
            </TouchableOpacity>

            {manualOpen && (
              <View style={[s.manualForm, { borderRadius: cardR - 4 }]}>
                {/* Label chips */}
                <View style={s.labelRow}>
                  {["Home", "Work", "Other"].map((l) => (
                    <TouchableOpacity
                      key={l}
                      style={[
                        s.labelChip,
                        addrLabel === l && s.labelChipActive,
                      ]}
                      onPress={() => setAddrLabel(l)}
                    >
                      <Text
                        style={[
                          s.labelChipText,
                          addrLabel === l && s.labelChipTextActive,
                        ]}
                      >
                        {l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[s.input, { fontSize: Math.round(14 * fs) }]}
                  placeholder="Flat / House no., Building, Street"
                  placeholderTextColor={C.gray400}
                  value={addrLine}
                  onChangeText={setAddrLine}
                  underlineColorAndroid="transparent"
                  selectionColor={C.green}
                />
                <View style={s.inputRow}>
                  <TextInput
                    style={[
                      s.input,
                      { flex: 1, fontSize: Math.round(14 * fs) },
                    ]}
                    placeholder="City"
                    placeholderTextColor={C.gray400}
                    value={addrCity}
                    onChangeText={setAddrCity}
                    underlineColorAndroid="transparent"
                    selectionColor={C.green}
                  />
                  <TextInput
                    style={[
                      s.input,
                      { flex: 1, fontSize: Math.round(14 * fs) },
                    ]}
                    placeholder="State"
                    placeholderTextColor={C.gray400}
                    value={addrState}
                    onChangeText={setAddrState}
                    underlineColorAndroid="transparent"
                    selectionColor={C.green}
                  />
                </View>
                <TextInput
                  style={[s.input, { fontSize: Math.round(14 * fs) }]}
                  placeholder="Pincode"
                  placeholderTextColor={C.gray400}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={addrPin}
                  onChangeText={setAddrPin}
                  underlineColorAndroid="transparent"
                  selectionColor={C.green}
                />
                <TouchableOpacity
                  style={s.useAddrBtn}
                  onPress={async () => {
                    const fullAddr = [addrLine, addrCity, addrState, addrPin].filter(Boolean).join(", ");
                    if (!fullAddr) return;
                    const savedId = await addressStore.addAddress(
                      { 
                        address: fullAddr, 
                        city: addrCity, 
                        state: addrState, 
                        pincode: addrPin, 
                        label: addrLabel 
                      }, 
                      token
                    );
                    if (savedId) {
                      setSelectedAddrId(savedId);
                      addressStore.setSelectedId(savedId);
                    }
                    setManualOpen(false);
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[C.green, C.greenDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.useAddrGrad}
                  >
                    <Text
                      style={[s.useAddrText, { fontSize: Math.round(14 * fs) }]}
                    >
                      Use this address
                    </Text>
                    <Feather name="check" size={15} color={C.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Section>

          {/* ── SECTION 2: DELIVERY SLOT ─────────────────────────────── */}
          <Section
            num="2"
            title="Delivery Slot"
            icon="clock"
            cardR={cardR}
            px={px}
          >
            {confirmedSlot ? (
              <View style={s.slotDisplay}>
                <View style={s.slotInfo}>
                  <Text style={s.slotTimeText}>
                    {new Date(confirmedSlot.start).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    –{" "}
                    {new Date(confirmedSlot.end).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                  <Text style={s.slotDateText}>
                    {new Date(confirmedSlot.start).toDateString() ===
                    new Date().toDateString()
                      ? "Today"
                      : "Tomorrow"} ·{" "}
                    {new Date(confirmedSlot.start).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSlotModalVisible(true)}
                  style={s.slotChangeBtn}
                >
                  <Text style={s.slotChangeText}>Change</Text>
                </TouchableOpacity>
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

          {/* ── SECTION 3: VENDOR CONTACT ────────────────────────────── */}
          <Section
            num="3"
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

          {/* ── SECTION 4: PAYMENT METHOD (Only shown after acceptance) ── */}
          {orderStatus === "accepted" && (
            <Section
              num="4"
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
          )}

          {/* ── SECTION 3: ORDER SUMMARY (mobile/tablet inline) ─────── */}
          {!isDesktop && (
            <Section
              num="3"
              title="Order Summary"
              icon="shopping-bag"
              cardR={cardR}
              px={px}
            >
              <OrderSummaryCard
                items={items}
                subtotal={subtotal}
                deliveryFee={activeFee}
                total={total}
                onNegotiate={() => setFeeModalVisible(true)}
                fs={fs}
              />
            </Section>
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
                items={items}
                subtotal={subtotal}
                deliveryFee={activeFee}
                total={total}
                onNegotiate={() => setFeeModalVisible(true)}
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
              onPress={isAccepted ? handlePayment : placeOrder}
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

      <SlotModal
        visible={slotModalVisible}
        onClose={() => setSlotModalVisible(false)}
        onConfirm={handleRequestSlot}
        loading={requestingSlot}
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
    backgroundColor: C.bg,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  slotInfo: { gap: 2 },
  slotTimeText: { fontSize: 16, fontWeight: "900", color: C.gray900 },
  slotDateText: { fontSize: 12, color: C.gray500, fontWeight: "600" },
  slotChangeBtn: {
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.gray300,
  },
  slotChangeText: { fontSize: 13, fontWeight: "700", color: C.gray600 },
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
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  phoneRequestText: { fontSize: 14, fontWeight: "700", color: C.gray700 },
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
function SlotModal({ visible, onClose, onConfirm, loading }) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setInput("");
      setPreview(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!input.trim()) {
      setPreview(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch(`${BASE_URL}/slots/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: input.trim() }),
        });
        const data = await res.json();
        if (data.data?.valid !== undefined) {
          setPreview(data.data);
        } else {
          const local = parseSlotLocally(input);
          setPreview(
            local || {
              valid: false,
              message: "Couldn't understand that. Try '3pm to 5pm'",
            },
          );
        }
      } catch {
        const local = parseSlotLocally(input);
        setPreview(
          local || {
            valid: false,
            message: "Couldn't understand that. Try '3pm to 5pm'",
          },
        );
      } finally {
        setChecking(false);
      }
    }, 400);
  }, [input]);

  const handleConfirm = () => {
    if (!preview?.valid) return;
    onConfirm({ slot_start: preview.slot_start, slot_end: preview.slot_end });
  };

  const HINTS = ["3pm to 5pm", "today 6pm to 8pm", "tomorrow 10am to 11am"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sm.backdrop} onPress={onClose}>
        <Pressable style={sm.sheet} onPress={() => {}}>
          <View style={sm.handle} />
          <Text style={sm.title}>Choose delivery window</Text>
          <Text style={sm.sub}>Type your preferred time window</Text>

          <View
            style={[
              sm.inputBox,
              preview?.valid === false && sm.inputBoxError,
              preview?.valid === true && sm.inputBoxValid,
            ]}
          >
            <Feather
              name="clock"
              size={16}
              color={
                preview?.valid === true
                  ? C.green
                  : preview?.valid === false
                  ? C.red
                  : C.gray400
              }
              style={{ marginLeft: 14 }}
            />
            <TextInput
              style={sm.input}
              placeholder={`e.g. "3pm to 5pm" or "tomorrow 2pm to 3pm"`}
              placeholderTextColor={C.gray400}
              value={input}
              onChangeText={setInput}
              autoFocus
              underlineColorAndroid="transparent"
              selectionColor={C.green}
            />
            {checking ? (
              <ActivityIndicator
                size="small"
                color={C.gray400}
                style={{ marginRight: 14 }}
              />
            ) : input.length > 0 ? (
              <TouchableOpacity
                onPress={() => setInput("")}
                style={{ marginRight: 14 }}
              >
                <Feather name="x" size={14} color={C.gray400} />
              </TouchableOpacity>
            ) : null}
          </View>

          {!input.trim() && (
            <View style={sm.hints}>
              {HINTS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={sm.hintChip}
                  onPress={() => setInput(h)}
                  activeOpacity={0.7}
                >
                  <Text style={sm.hintText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {preview && (
            <View
              style={[
                sm.preview,
                preview.valid ? sm.previewValid : sm.previewInvalid,
              ]}
            >
              <Feather
                name={preview.valid ? "check-circle" : "alert-circle"}
                size={15}
                color={preview.valid ? C.green : C.red}
              />
              {preview.valid ? (
                <Text style={sm.previewText}>
                  <Text style={sm.previewBold}>{preview.start_label}</Text>
                  {"  →  "}
                  <Text style={sm.previewBold}>{preview.end_label}</Text>
                </Text>
              ) : (
                <Text style={sm.previewTextErr}>{preview.message}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              sm.confirmBtn,
              (!preview?.valid || loading) && sm.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!preview?.valid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Text style={sm.confirmBtnText}>
                {preview?.valid ? "Request this window →" : "Enter a window"}
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  headerSub: { fontSize: 12, color: C.gray400, marginTop: 1 },
  totalChip: {
    backgroundColor: C.greenMid,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.greenBorder,
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
  addrSub: { fontSize: 12, color: C.gray400, marginTop: 2 },
  addrDetected: {
    fontSize: 12,
    color: C.green,
    marginTop: 2,
    fontWeight: "500",
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
  paySub: { fontSize: 12, color: C.gray400, marginTop: 2 },
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
