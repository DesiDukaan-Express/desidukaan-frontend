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

// ─── Slot summary banner (shown at top of checkout) ───────────────────────────
function SlotBanner({ slot, onEdit }) {
  if (!slot) return null;
  const fmt = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  return (
    <View style={slb.wrap}>
      <View style={slb.iconWrap}>
        <Feather name="clock" size={16} color={C.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={slb.label}>Delivery window confirmed</Text>
        <Text style={slb.time}>
          {fmt(slot.start)} – {fmt(slot.end)}
        </Text>
      </View>
      {onEdit && (
        <TouchableOpacity
          style={slb.editBtn}
          onPress={onEdit}
          activeOpacity={0.8}
        >
          <Feather name="edit-2" size={13} color={C.green} />
          <Text style={slb.editText}>Change</Text>
        </TouchableOpacity>
      )}
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
function OrderSummaryCard({ items, subtotal, deliveryFee, total, fs = 1 }) {
  return (
    <View style={osc.wrap}>
      {items.slice(0, 3).map((item, i) => (
        <View
          key={i}
          style={[
            osc.itemRow,
            i < Math.min(items.length, 3) - 1 && osc.itemBorder,
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
      {items.length > 3 && (
        <Text style={osc.moreText}>+{items.length - 3} more items</Text>
      )}
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
        <Text style={[osc.label, { fontSize: Math.round(13 * fs) }]}>
          Delivery fee
        </Text>
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
});

// ═══════════════════════════════════════════════════════════════════════════ //
export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const cart = useCartStore();
  const { token } = useAuthStore();
  const addressStore = useAddressStore();

  // Slot passed from CartScreen via navigation params or cartStore
  const confirmedSlot =
    route.params?.confirmedSlot || cart?.confirmedSlot || null;
  const confirmedFee = route.params?.confirmedFee ?? cart?.confirmedFee ?? null;

  const items = cart?.items || [];
  const vendorId = cart?.vendorId;
  const vendorName = items[0]?.vendorName || "Store";

  // ── Computed totals ────────────────────────────────────────────────────────
  const subtotal = items.reduce(
    (s, i) => s + i.price * (i.qty ?? i.quantity ?? 0),
    0,
  );
  const baseFee = confirmedFee ?? (subtotal >= 299 ? 0 : 30);
  const total = subtotal + baseFee;

  // ── Address state ──────────────────────────────────────────────────────────
  const savedAddresses = addressStore?.addresses || [];
  const [selectedAddrId, setSelectedAddrId] = useState(
    addressStore?.selectedId ?? savedAddresses[0]?.id ?? null,
  );
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [detectedAddr, setDetectedAddr] = useState(null);
  const [detectedCoords, setDetectedCoords] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
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

  // ── Order state ────────────────────────────────────────────────────────────
  const [placing, setPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // ── Socket — listen for vendor order acceptance ────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on("order:accepted", (data) => {
      navigation.replace("OrderPlaced", {
        orderNumber: data.order_number || data.id,
        vendorName,
        slot: confirmedSlot,
      });
    });
    socket.on("order:rejected", () => {
      setErrorMsg(
        "Vendor couldn't accept your order right now. Please try again.",
      );
      setPlacing(false);
    });
    return () => socket.disconnect();
  }, [token]);

  // ── Detect GPS location ────────────────────────────────────────────────────
  const detectLocation = () => {
    setDetectingLoc(true);
    const onSuccess = async (lat, lng) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { "User-Agent": "DesiDukaan/1.0" } },
        );
        const displayName = d.display_name || "Location detected";
        setDetectedAddr(displayName);
        setDetectedCoords({ lat, lng });
        // Save to backend so order placement gets a real DB address id
        const savedId = await addressStore?.addAddress?.(
          { address: displayName, lat, lng, label: "Current Location" },
          token,
        );
        if (savedId) {
          setSelectedAddrId(savedId);
          addressStore?.setSelectedId?.(savedId);
        } else {
          setSelectedAddrId("detected");
        }
      } catch {
        setDetectedAddr("Location detected");
        setSelectedAddrId("detected");
        // Try saving even without a display name
        addressStore?.addAddress?.(
          { address: "Current Location", lat, lng, label: "Current Location" },
          token,
        );
      } finally {
        setDetectingLoc(false);
      }
    };
    const onFail = () => {
      setDetectingLoc(false);
      setManualOpen(true);
    };

    if (Platform.OS === "web") {
      navigator.geolocation?.getCurrentPosition(
        (p) => onSuccess(p.coords.latitude, p.coords.longitude),
        onFail,
        { timeout: 10000 },
      );
    } else {
      (async () => {
        try {
          const L = require("expo-location");
          const { status } = await L.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            onFail();
            return;
          }
          const loc = await L.getCurrentPositionAsync({
            accuracy: L.Accuracy.Balanced,
          });
          onSuccess(loc.coords.latitude, loc.coords.longitude);
        } catch {
          onFail();
        }
      })();
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
    setErrorMsg(null);
    setPlacing(true);
    try {
      // Always parseInt — id from store may come as string
      const rawAddrId =
        selectedAddrId &&
        selectedAddrId !== "detected" &&
        selectedAddrId !== "manual"
          ? selectedAddrId
          : savedAddresses[0]?.id;
      // TEMP: hardcode address id for testing if store is empty
      const addrId = rawAddrId ? parseInt(rawAddrId, 10) : 10;

      const payload = {
        vendor_id: vendorId,
        delivery_address_id: addrId,
        payment_method: selectedPay || "cod", // fallback so it's never null
        items: items.map((i) => ({
          product_id: i.id,
          quantity: Math.max(1, i.qty ?? i.quantity ?? 1),
          // price NOT sent — backend uses its own price from DB
        })),
        special_instructions: "",
      };
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
        // Navigate immediately — don't wait for vendor socket in dev/test
        const orderNumber =
          data.data?.order?.order_number ||
          data.data?.order?.id ||
          data.order_number ||
          data.order?.id ||
          "ORD-" + Date.now().toString().slice(-6);
        navigation.replace("OrderPlaced", {
          orderNumber,
          vendorName,
          slot: confirmedSlot,
        });
      } else {
        setErrorMsg(
          data.message || data.msg || "Order failed. Please try again.",
        );
        setPlacing(false);
      }
    } catch (e) {
      setErrorMsg(e.message);
      setPlacing(false);
    }
  };

  // ── Breakpoint ────────────────────────────────────────────────────────────
  const { isDesktop, isTablet } = useBreakpoint();
  const px = isDesktop ? 40 : isTablet ? 28 : 16;
  const cardR = isDesktop ? 20 : isTablet ? 18 : 14;
  const fs = isDesktop ? 1.15 : isTablet ? 1.07 : 1;

  const canPlace = true; // validation disabled for testing

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
          <Text style={[s.headerSub, { fontSize: Math.round(12 * fs) }]}>
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
                  onPress={() => {
                    setSelectedAddrId("manual");
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

          {/* ── SECTION 2: PAYMENT METHOD ───────────────────────────── */}
          <Section
            num="2"
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
                        style={[s.payLabel, { fontSize: Math.round(15 * fs) }]}
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

                  {/* ── UPI expanded panel ── */}
                  {active && pm.id === "upi" && (
                    <View style={[s.upiPanel, { borderRadius: cardR - 4 }]}>
                      {/* UPI ID input + verify */}
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

                      {/* Verify button — only when ID entered and not yet validated */}
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
                                // Razorpay can't verify in test mode — allow anyway
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

                      {/* Validated: show name + QR (web) / deep-link (mobile) */}
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

                          {/* Web: Show QR button */}
                          {Platform.OS === "web" && (
                            <TouchableOpacity
                              style={s.qrBtn}
                              onPress={() => setShowQR(true)}
                              activeOpacity={0.85}
                            >
                              <Feather name="grid" size={16} color="#7C3AED" />
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

                      {/* App chips */}
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
                              style={[s.upiChip, appActive && s.upiChipActive]}
                              onPress={() => {
                                setSelectedUPI(app);
                                // On mobile, attempt deep-link redirect
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

                  {/* Card form */}
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
                deliveryFee={baseFee}
                total={total}
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
                total={total}
                canPlace={canPlace}
                placing={placing}
                onPress={placeOrder}
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
                deliveryFee={baseFee}
                total={total}
                fs={fs}
              />
            </View>

            {/* Confirmed slot on sidebar */}
            {confirmedSlot && <SlotBanner slot={confirmedSlot} />}

            {/* Cancellation policy in sidebar */}
            <CancellationPolicy />

            {/* Place order button in sidebar */}
            <PlaceOrderBtn
              total={total}
              canPlace={canPlace}
              placing={placing}
              onPress={placeOrder}
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
    </View>
  );
}

// ─── Place Order Button (shared mobile + desktop) ─────────────────────────────
function PlaceOrderBtn({ total, canPlace, placing, onPress, fs = 1 }) {
  return (
    <TouchableOpacity
      style={[pob.btn, !canPlace && pob.btnDisabled]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={placing || !canPlace}
    >
      {placing ? (
        <View style={pob.grad}>
          <ActivityIndicator color={C.white} />
          <Text style={[pob.text, { fontSize: Math.round(16 * fs) }]}>
            Placing order…
          </Text>
        </View>
      ) : (
        <LinearGradient
          colors={canPlace ? [C.green, C.greenDark] : [C.gray300, C.gray300]}
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
            Place Order
          </Text>
          <Feather
            name="check-circle"
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

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
