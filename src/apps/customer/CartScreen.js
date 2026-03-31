import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, Platform, StatusBar,
  Modal, Pressable, ActivityIndicator, Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { io } from "socket.io-client";
import useCartStore    from "../../store/cartStore";
import useAuthStore    from "../../store/authStore";
import useAddressStore from "../../store/addressStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const C = {
  orange:     "#F97316", orangeDark: "#EA580C",
  green:      "#16A34A", greenDark:  "#15803D",
  greenLight: "#F0FDF4", greenBorder:"#BBF7D0",
  greenMid:   "#DCFCE7",
  white:      "#FFFFFF", bg:         "#F8FAFC",
  gray100:    "#F3F4F6", gray200:    "#E5E7EB",
  gray300:    "#D1D5DB", gray400:    "#9CA3AF",
  gray500:    "#6B7280", gray600:    "#4B5563",
  gray700:    "#374151", gray900:    "#111827",
  red:        "#EF4444", redLight:   "#FEF2F2",
};

// ─── Local time parser (fallback so button always works) ──────────────────────
function parseSlotLocally(input) {
  if (!input?.trim()) return null;
  const txt = input.trim().toLowerCase();

  // Resolve date part
  const now       = new Date();
  const baseDate  = new Date(now);
  if (txt.includes("tomorrow")) baseDate.setDate(baseDate.getDate() + 1);

  // Extract hour tokens like "3pm", "3:30pm", "15:00"
  const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;
  const times  = [];
  let m;
  while ((m = timeRe.exec(txt)) !== null) {
    let h   = parseInt(m[1]);
    const min = parseInt(m[2] || "0");
    const ap  = m[3];
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    times.push({ h, min });
  }

  if (times.length < 2) return null;

  const [s, e] = times;
  const start  = new Date(baseDate);
  start.setHours(s.h, s.min, 0, 0);
  const end    = new Date(baseDate);
  end.setHours(e.h, e.min, 0, 0);

  if (end <= start) return null;
  if (start <= now) return null;

  const fmt = (d) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return {
    valid:       true,
    slot_start:  start.toISOString(),
    slot_end:    end.toISOString(),
    start_label: fmt(start),
    end_label:   fmt(end),
  };
}

// ─── Slot picker modal ────────────────────────────────────────────────────────
function SlotModal({ visible, earliestLabel, onClose, onConfirm, loading }) {
  const [input,    setInput]    = useState("");
  const [preview,  setPreview]  = useState(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!visible) { setInput(""); setPreview(null); }
  }, [visible]);

  useEffect(() => {
    if (!input.trim()) { setPreview(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        // Try backend parser first
        const res  = await fetch(`${BASE_URL}/slots/parse`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ input: input.trim() }),
        });
        const data = await res.json();
        if (data.data?.valid !== undefined) {
          setPreview(data.data);
        } else {
          // Fallback to local parse
          const local = parseSlotLocally(input);
          setPreview(local || { valid: false, message: "Couldn't understand that. Try '3pm to 5pm'" });
        }
      } catch {
        // Network error — use local parser
        const local = parseSlotLocally(input);
        setPreview(local || { valid: false, message: "Couldn't understand that. Try '3pm to 5pm'" });
      } finally { setChecking(false); }
    }, 400);
  }, [input]);

  const handleConfirm = () => {
    if (!preview?.valid) return;
    onConfirm({ slot_start: preview.slot_start, slot_end: preview.slot_end });
  };

  const HINTS = ["3pm to 5pm", "today 6pm to 8pm", "tomorrow 10am to 11am"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sm.backdrop} onPress={onClose}>
        <Pressable style={sm.sheet} onPress={() => {}}>
          <View style={sm.handle} />
          <Text style={sm.title}>Choose delivery window</Text>
          {earliestLabel
            ? <Text style={sm.sub}>Earliest: <Text style={sm.subBold}>{earliestLabel}</Text></Text>
            : <Text style={sm.sub}>Type your preferred time window</Text>}

          <View style={[
            sm.inputBox,
            preview?.valid === false && sm.inputBoxError,
            preview?.valid === true  && sm.inputBoxValid,
          ]}>
            <Feather name="clock" size={16}
              color={preview?.valid === true ? C.green : preview?.valid === false ? C.red : C.gray400}
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
            {checking
              ? <ActivityIndicator size="small" color={C.gray400} style={{ marginRight: 14 }} />
              : input.length > 0
              ? <TouchableOpacity onPress={() => setInput("")} style={{ marginRight: 14 }}>
                  <Feather name="x" size={14} color={C.gray400} />
                </TouchableOpacity>
              : null}
          </View>

          {/* Hint chips — shown when input is empty */}
          {!input.trim() && (
            <View style={sm.hints}>
              {HINTS.map(h => (
                <TouchableOpacity key={h} style={sm.hintChip} onPress={() => setInput(h)} activeOpacity={0.7}>
                  <Text style={sm.hintText}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Preview result */}
          {preview && (
            <View style={[sm.preview, preview.valid ? sm.previewValid : sm.previewInvalid]}>
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
            style={[sm.confirmBtn, (!preview?.valid || loading) && sm.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!preview?.valid || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={sm.confirmBtnText}>
                  {preview?.valid ? "Request this window →" : "Enter a time window above"}
                </Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sm = StyleSheet.create({
  backdrop:           { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end" },
  sheet:              { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  handle:             { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title:              { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 4 },
  sub:                { fontSize: 13, color: C.gray400, marginBottom: 16 },
  subBold:            { fontWeight: "700", color: C.greenDark },
  inputBox:           { flexDirection: "row", alignItems: "center", backgroundColor: C.gray100, borderRadius: 14, borderWidth: 1.5, borderColor: "transparent", minHeight: 52, paddingRight: 4 },
  inputBoxError:      { borderColor: C.red, backgroundColor: C.redLight },
  inputBoxValid:      { borderColor: C.green, backgroundColor: C.greenLight },
  input:              { flex: 1, fontSize: 15, color: C.gray900, paddingLeft: 10, paddingVertical: 14, ...Platform.select({ web: { outlineStyle: "none" } }) },
  hints:              { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  hintChip:           { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 },
  hintText:           { fontSize: 13, color: C.gray600, fontWeight: "600" },
  preview:            { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, padding: 12, borderRadius: 12 },
  previewValid:       { backgroundColor: C.greenLight },
  previewInvalid:     { backgroundColor: C.redLight },
  previewText:        { fontSize: 14, color: C.greenDark },
  previewBold:        { fontWeight: "800" },
  previewTextErr:     { fontSize: 13, color: C.red, flex: 1 },
  confirmBtn:         { marginTop: 18, backgroundColor: C.green, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  confirmBtnDisabled: { backgroundColor: C.greenMid },
  confirmBtnText:     { fontSize: 15, fontWeight: "800", color: C.white },
});

// ─── Delivery fee negotiation modal ──────────────────────────────────────────
function FeeModal({ visible, currentFee, onClose, onPropose, loading }) {
  const [proposed, setProposed] = useState("");

  useEffect(() => {
    if (!visible) setProposed("");
  }, [visible]);

  const value = parseInt(proposed) || 0;
  const valid  = proposed.trim() !== "" && value >= 0 && value < (currentFee ?? 30);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fm.backdrop} onPress={onClose}>
        <Pressable style={fm.sheet} onPress={() => {}}>
          <View style={fm.handle} />
          <Text style={fm.title}>Negotiate delivery fee</Text>
          <Text style={fm.sub}>
            Current fee: <Text style={fm.subBold}>₹{currentFee ?? 30}</Text>
            {"   "}Propose a lower amount
          </Text>

          <View style={[fm.inputBox, valid && fm.inputBoxValid]}>
            <Text style={fm.rupee}>₹</Text>
            <TextInput
              style={fm.input}
              placeholder="0"
              placeholderTextColor={C.gray400}
              value={proposed}
              onChangeText={t => setProposed(t.replace(/\D/g, ""))}
              keyboardType="numeric"
              autoFocus
              underlineColorAndroid="transparent"
              selectionColor={C.green}
            />
          </View>

          <View style={fm.hints}>
            {[0, Math.round((currentFee ?? 30) * 0.5), Math.round((currentFee ?? 30) * 0.75)].map(v => (
              <TouchableOpacity key={v} style={fm.hintChip} onPress={() => setProposed(String(v))} activeOpacity={0.7}>
                <Text style={fm.hintText}>{v === 0 ? "Free (₹0)" : `₹${v}`}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {valid && (
            <View style={fm.preview}>
              <Feather name="check-circle" size={14} color={C.green} />
              <Text style={fm.previewText}>You're proposing <Text style={fm.previewBold}>₹{value}</Text> (save ₹{(currentFee ?? 30) - value})</Text>
            </View>
          )}

          <TouchableOpacity
            style={[fm.confirmBtn, (!valid || loading) && fm.confirmBtnDisabled]}
            onPress={() => valid && onPropose(value)}
            disabled={!valid || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={fm.confirmBtnText}>Send proposal to vendor</Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fm = StyleSheet.create({
  backdrop:           { flex: 1, backgroundColor: "rgba(0,0,0,0.48)", justifyContent: "flex-end" },
  sheet:              { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  handle:             { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title:              { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 4 },
  sub:                { fontSize: 13, color: C.gray400, marginBottom: 16 },
  subBold:            { fontWeight: "700", color: C.gray700 },
  inputBox:           { flexDirection: "row", alignItems: "center", backgroundColor: C.gray100, borderRadius: 14, borderWidth: 1.5, borderColor: "transparent", minHeight: 56, paddingHorizontal: 18 },
  inputBoxValid:      { borderColor: C.green, backgroundColor: C.greenLight },
  rupee:              { fontSize: 22, fontWeight: "900", color: C.gray700, marginRight: 6 },
  input:              { flex: 1, fontSize: 28, fontWeight: "900", color: C.gray900, ...Platform.select({ web: { outlineStyle: "none" } }) },
  hints:              { flexDirection: "row", gap: 8, marginTop: 14 },
  hintChip:           { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 },
  hintText:           { fontSize: 13, fontWeight: "700", color: C.gray600 },
  preview:            { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: C.greenLight },
  previewText:        { fontSize: 13, color: C.greenDark },
  previewBold:        { fontWeight: "800" },
  confirmBtn:         { marginTop: 18, backgroundColor: C.green, paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  confirmBtnDisabled: { backgroundColor: C.greenMid },
  confirmBtnText:     { fontSize: 15, fontWeight: "800", color: C.white },
});

// ═══════════════════════════════════════════════════════════════════════════ //
export default function CartScreen() {
  const navigation   = useNavigation();
  const cart         = useCartStore();
  const { token }    = useAuthStore();
  const addressStore = useAddressStore();

  const items    = cart?.items || [];
  const vendorId = cart?.vendorId;
  const vendorName = items[0]?.vendorName || "Store";

  // ── Delivery info from backend ─────────────────────────────────────────────
  const [deliveryInfo,     setDeliveryInfo]     = useState(null);
  const [loadingInfo,      setLoadingInfo]      = useState(false);

  // ── Slot state ─────────────────────────────────────────────────────────────
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [confirmedSlot,    setConfirmedSlot]    = useState(null);
  const [requestingSlot,   setRequestingSlot]   = useState(false);

  // ── Fee negotiation state ──────────────────────────────────────────────────
  const [feeModalVisible,  setFeeModalVisible]  = useState(false);
  const [proposedFee,      setProposedFee]      = useState(null); // customer's proposal
  const [confirmedFee,     setConfirmedFee]     = useState(null); // agreed fee
  const [requestingFee,    setRequestingFee]    = useState(false);

  // ── Phone request ──────────────────────────────────────────────────────────
  const [phoneStatus,      setPhoneStatus]      = useState(null);
  const [vendorPhone,      setVendorPhone]      = useState(null);
  const [requestingPhone,  setRequestingPhone]  = useState(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const selectedAddr = addressStore?.addresses?.find(a => a.id === addressStore?.selectedId)
    || addressStore?.addresses?.[0];

  const baseFee   = deliveryInfo?.delivery_fee ?? 30;
  const activeFee = confirmedFee ?? proposedFee ?? baseFee;
  const subtotal  = items.reduce((s, i) => s + i.price * (i.qty || i.quantity || 0), 0);
  const grandTotal = subtotal + activeFee;

  const etaLabel  = loadingInfo ? "…" : deliveryInfo ? `${deliveryInfo.eta_minutes} min` : "~30 min";
  const distLabel = deliveryInfo ? `${deliveryInfo.distance_km} km away` : "";

  // ── Fetch delivery info ────────────────────────────────────────────────────
  useEffect(() => {
    if (!vendorId || !selectedAddr?.lat || !selectedAddr?.lng) return;
    setLoadingInfo(true);
    fetch(`${BASE_URL}/slots/delivery-info?vendor_id=${vendorId}&customer_lat=${selectedAddr.lat}&customer_lng=${selectedAddr.lng}`)
      .then(r => r.json())
      .then(d => { if (d.data) setDeliveryInfo(d.data); })
      .catch(() => {})
      .finally(() => setLoadingInfo(false));
  }, [vendorId, selectedAddr]);

  // ── Socket: listen for all vendor responses ────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const socket = io(`${BASE_URL.replace('/api', '')}`, { auth: { token } });

    // Phone events
    socket.on("phone:approved", (data) => { setPhoneStatus("approved"); setVendorPhone(data.phone); });
    socket.on("phone:rejected", ()      => setPhoneStatus("rejected"));

    return () => socket.disconnect();
  }, [token]);

  // ── Slot actions ───────────────────────────────────────────────────────────
  const handleRequestSlot = async ({ slot_start, slot_end }) => {
    setConfirmedSlot({ start: slot_start, end: slot_end });
    setSlotModalVisible(false);
  };

  // ── Fee actions ────────────────────────────────────────────────────────────
  const handleProposefee = async (amount) => {
    setProposedFee(amount);
    setFeeModalVisible(false);
  };

  // ── Phone ──────────────────────────────────────────────────────────────────
  const handleRequestPhone = async () => {
    if (!vendorId) return;
    setRequestingPhone(true);
    try {
      await fetch(`${BASE_URL}/slots/phone-request`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ vendor_id: vendorId }),
      });
      setPhoneStatus("pending");
    } catch {}
    finally { setRequestingPhone(false); }
  };


  // ── Qty helpers ────────────────────────────────────────────────────────────
  const handleIncrease = useCallback((item) => {
    cart?.addItem?.({ id: item.id, name: item.name, price: item.price, image: item.image, unit: item.unit }, cart.vendorId);
  }, [cart]);

  const handleDecrease = useCallback((item) => {
    cart?.removeItem?.(item.id);
  }, [cart]);

  // ── Formatters ─────────────────────────────────────────────────────────────
  const fmtTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };
  const fmtSlot = (slot) => slot ? `${fmtTime(slot.start)} – ${fmtTime(slot.end)}` : "";

  // ── Breakpoint (must be before any early return — Rules of Hooks) ───────────
  const { isDesktop, isTablet, isMobile } = useBreakpoint();
  const px    = isDesktop ? 40  : isTablet ? 28 : 16;
  const cardR = isDesktop ? 20  : isTablet ? 18 : 14;
  const fs    = isDesktop ? 1.15 : isTablet ? 1.07 : 1;

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" />
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color={C.gray900} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Cart</Text>
        </View>
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>🛒</Text>
          <Text style={s.emptyTitle}>Your cart is empty</Text>
          <Text style={s.emptySub}>Add items from a store to get started</Text>
          <TouchableOpacity style={s.shopBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <LinearGradient colors={[C.orange, C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.shopBtnGrad}>
              <Text style={s.shopBtnText}>Browse Stores</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }


  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: isDesktop ? C.bg : C.white }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* HEADER */}
      <View style={[s.header, { paddingHorizontal: px }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={C.gray900} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={[s.headerTitle, { fontSize: Math.round(20 * fs) }]}>My Cart</Text>
          <Text style={[s.headerSub, { fontSize: Math.round(12 * fs) }]}>{vendorName}</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{items.length}</Text>
        </View>
      </View>

      {/* PAGE BODY — side-by-side on desktop */}
      <View style={[s.pageBody, isDesktop && s.pageBodyDesktop]}>

        {/* ── MAIN / LEFT COLUMN ─────────────────────────────────────── */}
        <View style={[
          s.mainCol,
          isDesktop && s.mainColDesktop,
          isTablet  && s.mainColTablet,
        ]}>

          {/* Delivery ETA strip */}
          <View style={[s.deliveryStrip, { borderRadius: cardR, marginHorizontal: px }]}>
            <LinearGradient
              colors={[C.green, C.greenDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.deliveryGrad, { paddingHorizontal: isDesktop ? 22 : 14, paddingVertical: isDesktop ? 16 : 12 }]}
            >
              <View style={s.deliveryLeft}>
                <View style={[s.deliveryIconWrap, isDesktop && { width: 44, height: 44, borderRadius: 13 }]}>
                  <Feather name="clock" size={isDesktop ? 20 : 16} color={C.white} />
                </View>
                <View>
                  <Text style={[s.deliveryEta, { fontSize: Math.round(14 * fs) }]}>{etaLabel} delivery</Text>
                  {distLabel ? <Text style={[s.deliveryDist, { fontSize: Math.round(11 * fs) }]}>{distLabel}</Text> : null}
                </View>
              </View>
              {/* Desktop: sidebar handles slot picking — strip shows ETA/distance only */}
              {!isDesktop && (
                confirmedSlot ? (
                  <View style={s.slotConfirmed}>
                    <Feather name="check-circle" size={13} color={C.white} />
                    <Text style={[s.slotConfirmedText, { fontSize: Math.round(12 * fs) }]}>{fmtSlot(confirmedSlot)}</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={s.slotPickBtn} onPress={() => setSlotModalVisible(true)} activeOpacity={0.85}>
                    <Feather name="calendar" size={13} color={C.green} />
                    <Text style={[s.slotPickText, { fontSize: Math.round(13 * fs) }]}>Pick slot</Text>
                  </TouchableOpacity>
                )
              )}
            </LinearGradient>
          </View>

          {/* Items + phone (scrollable part of main col) */}
          <ScrollView
            style={s.itemsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: px, paddingTop: 8 }}
          >
            {/* Items card */}
            <View style={[s.itemsCard, { borderRadius: cardR }]}>
              <Text style={[s.itemsTitle, {
                paddingHorizontal: isDesktop ? 22 : 14,
                paddingVertical: isDesktop ? 14 : 10,
                fontSize: Math.round(13 * fs),
              }]}>{vendorName}</Text>

              {items.map((item, idx) => (
                <View key={item.id} style={[
                  s.itemRow,
                  idx < items.length - 1 && s.itemRowBorder,
                  { paddingHorizontal: isDesktop ? 22 : 14, paddingVertical: isDesktop ? 18 : 12 },
                ]}>
                  <Image
                    source={{ uri: item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200" }}
                    style={[s.itemImg, {
                      width:  isDesktop ? 70 : isTablet ? 58 : 48,
                      height: isDesktop ? 70 : isTablet ? 58 : 48,
                      borderRadius: isDesktop ? 14 : 10,
                    }]}
                    resizeMode="cover"
                  />
                  <View style={s.itemMid}>
                    <Text style={[s.itemName, { fontSize: Math.round(14 * fs) }]} numberOfLines={1}>{item.name}</Text>
                    {item.unit ? <Text style={[s.itemUnit, { fontSize: Math.round(12 * fs) }]}>{item.unit}</Text> : null}
                    <Text style={[s.itemPrice, { fontSize: Math.round(15 * fs) }]}>₹{item.price}</Text>
                  </View>
                  <View style={[s.qtyRow, { borderRadius: isDesktop ? 12 : 9 }]}>
                    <TouchableOpacity
                      style={[s.qtyBtn, { paddingHorizontal: isDesktop ? 12 : 8, paddingVertical: isDesktop ? 10 : 6 }]}
                      onPress={() => handleDecrease(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="minus" size={isDesktop ? 16 : 13} color={C.green} />
                    </TouchableOpacity>
                    <Text style={[s.qtyNum, { fontSize: Math.round(14 * fs), minWidth: isDesktop ? 30 : 20 }]}>
                      {item.qty ?? item.quantity ?? 0}
                    </Text>
                    <TouchableOpacity
                      style={[s.qtyBtn, { paddingHorizontal: isDesktop ? 12 : 8, paddingVertical: isDesktop ? 10 : 6 }]}
                      onPress={() => handleIncrease(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="plus" size={isDesktop ? 16 : 13} color={C.green} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Phone strip */}
            <View style={[s.phoneStrip, { borderRadius: cardR, marginTop: 8 }]}>
              <Feather name="phone" size={isDesktop ? 16 : 13} color={C.gray400} />
              <Text style={[s.phoneText, { fontSize: Math.round(13 * fs) }]} numberOfLines={1}>
                {phoneStatus === "approved" && vendorPhone ? `Vendor: ${vendorPhone}`
                  : phoneStatus === "pending"  ? "Waiting for vendor…"
                  : phoneStatus === "rejected" ? "Vendor declined"
                  : "Need to contact the store?"}
              </Text>
              {!phoneStatus && (
                <TouchableOpacity style={s.phoneBtn} onPress={handleRequestPhone} disabled={requestingPhone}>
                  {requestingPhone
                    ? <ActivityIndicator size="small" color={C.green} />
                    : <Text style={[s.phoneBtnText, { fontSize: Math.round(13 * fs) }]}>Request</Text>}
                </TouchableOpacity>
              )}
            </View>

            {/* Bill summary — inline on mobile/tablet, hidden on desktop (shown in sidebar) */}
            {!isDesktop && (
              <View style={[s.billCard, { borderRadius: cardR, marginTop: 8 }]}>
                <BillSummary
                  subtotal={subtotal}
                  activeFee={activeFee}
                  baseFee={baseFee}
                  confirmedFee={confirmedFee}
                  proposedFee={proposedFee}
                  grandTotal={grandTotal}
                  onNegotiate={() => setFeeModalVisible(true)}
                  fs={fs}
                />
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Proceed bar — bottom of main col on mobile/tablet */}
          {!isDesktop && (
            <View style={[s.proceedBar, { paddingHorizontal: px }]}>
              <View>
                <Text style={[s.proceedTotal, { fontSize: Math.round(20 * fs) }]}>₹{grandTotal}</Text>
                <Text style={[s.proceedSub, { fontSize: Math.round(11 * fs) }]}>total</Text>
              </View>

              <TouchableOpacity 
                onPress={() => navigation.navigate("Checkout", { 
                  confirmedSlot, 
                  confirmedFee, 
                  vendorPhone,
                  phoneStatus
                })} 
                activeOpacity={0.88} 
                style={[s.proceedBtn, { flex: 1 }]}
              >
                <LinearGradient
                  colors={[C.green, C.greenDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[s.proceedGrad, { borderRadius: Math.round(14 * fs) }]}
                >
                  <Text style={[s.proceedText, { fontSize: Math.round(15 * fs) }]}>Proceed to checkout</Text>
                  <Feather name="arrow-right" size={16} color={C.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>{/* /mainCol */}

        {/* ── SIDEBAR — desktop only ─────────────────────────────────── */}
        {isDesktop && (
          <View style={s.sideCol}>

            {/* Bill card */}
            <View style={[s.billCard, s.billCardSide]}>
              <Text style={s.sideCardTitle}>Order Summary</Text>
              <BillSummary
                subtotal={subtotal}
                activeFee={activeFee}
                baseFee={baseFee}
                confirmedFee={confirmedFee}
                proposedFee={proposedFee}
                grandTotal={grandTotal}
                onNegotiate={() => setFeeModalVisible(true)}
                fs={fs}
              />
            </View>


            {/* Proceed button in sidebar */}
            <TouchableOpacity 
              onPress={() => navigation.navigate("Checkout", { 
                confirmedSlot, 
                confirmedFee, 
                vendorPhone,
                phoneStatus
              })} 
              activeOpacity={0.88} 
              style={s.proceedBtnSide}
            >
              <LinearGradient colors={[C.green, C.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.proceedGradSide}>
                <Text style={s.proceedTextSide}>Proceed to checkout</Text>
                <Feather name="arrow-right" size={18} color={C.white} />
              </LinearGradient>
            </TouchableOpacity>

            {/* Confirmed slot card on desktop */}
            {confirmedSlot && (
              <View style={s.slotSideCard}>
                <Feather name="check-circle" size={18} color={C.green} />
                <View>
                  <Text style={s.slotSideTitle}>Delivery window confirmed</Text>
                  <Text style={s.slotSideTime}>{fmtSlot(confirmedSlot)}</Text>
                </View>
              </View>
            )}

            {/* Pick slot CTA on desktop sidebar if not confirmed */}
            {!confirmedSlot && (
              <TouchableOpacity style={s.slotSideCTA} onPress={() => setSlotModalVisible(true)} activeOpacity={0.85}>
                <Feather name="calendar" size={16} color={C.green} />
                <View>
                  <Text style={s.slotSideCTATitle}>Schedule delivery</Text>
                  <Text style={s.slotSideCTASub}>Pick a delivery window</Text>
                </View>
                <Feather name="chevron-right" size={14} color={C.gray400} />
              </TouchableOpacity>
            )}
          </View>
        )}

      </View>{/* /pageBody */}

      {/* MODALS */}
      <SlotModal
        visible={slotModalVisible}
        earliestLabel={deliveryInfo?.earliest_label}
        onClose={() => setSlotModalVisible(false)}
        onConfirm={handleRequestSlot}
        loading={requestingSlot}
      />
      <FeeModal
        visible={feeModalVisible}
        currentFee={baseFee}
        onClose={() => setFeeModalVisible(false)}
        onPropose={handleProposefee}
        loading={requestingFee}
      />
    </View>
  );
}

// ─── BillSummary (shared between inline and sidebar) ──────────────────────────
function BillSummary({ subtotal, activeFee, baseFee, confirmedFee, proposedFee, grandTotal, onNegotiate, fs = 1 }) {
  return (
    <>
      <View style={bs.row}>
        <Text style={[bs.label, { fontSize: Math.round(14 * fs) }]}>Items total</Text>
        <Text style={[bs.value, { fontSize: Math.round(14 * fs) }]}>₹{subtotal}</Text>
      </View>
      <View style={bs.row}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <Text style={[bs.label, { fontSize: Math.round(14 * fs) }]}>Delivery fee</Text>
          {confirmedFee == null && proposedFee == null && (
            <TouchableOpacity style={bs.negotiateBtn} onPress={onNegotiate} activeOpacity={0.8}>
              <Feather name="edit-2" size={10} color={C.green} />
              <Text style={bs.negotiateBtnText}>Negotiate</Text>
            </TouchableOpacity>
          )}
          {proposedFee != null && confirmedFee == null && (
            <View style={bs.pendingBadge}>
              <Text style={bs.pendingBadgeText}>₹{proposedFee} proposed</Text>
            </View>
          )}
          {confirmedFee != null && (
            <View style={bs.agreedBadge}>
              <Feather name="check" size={9} color={C.green} />
              <Text style={bs.agreedBadgeText}>Agreed</Text>
            </View>
          )}
        </View>
        {activeFee === 0
          ? <Text style={[bs.value, { color: C.green, fontSize: Math.round(14 * fs) }]}>FREE</Text>
          : <Text style={[bs.value, { fontSize: Math.round(14 * fs) }]}>₹{activeFee}</Text>}
      </View>
      {subtotal < 299 && confirmedFee == null && proposedFee == null && (
        <View style={bs.freeHint}>
          <Feather name="info" size={11} color={C.green} />
          <Text style={[bs.freeHintText, { fontSize: Math.round(11 * fs) }]}>Add ₹{299 - subtotal} more for free delivery</Text>
        </View>
      )}
      <View style={bs.divider} />
      <View style={bs.row}>
        <Text style={[bs.grandLabel, { fontSize: Math.round(16 * fs) }]}>Grand total</Text>
        <Text style={[bs.grandLabel, { fontSize: Math.round(16 * fs) }]}>₹{grandTotal}</Text>
      </View>
    </>
  );
}

const bs = StyleSheet.create({
  row:              { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  label:            { fontSize: 14, color: C.gray600 },
  value:            { fontSize: 14, fontWeight: "600", color: C.gray900 },
  divider:          { height: 1, backgroundColor: C.gray100, marginVertical: 8 },
  grandLabel:       { fontSize: 16, fontWeight: "900", color: C.gray900 },
  negotiateBtn:     { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.greenLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  negotiateBtnText: { fontSize: 10, fontWeight: "700", color: C.green },
  pendingBadge:     { backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  pendingBadgeText: { fontSize: 10, fontWeight: "700", color: "#D97706" },
  agreedBadge:      { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.greenMid, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  agreedBadgeText:  { fontSize: 10, fontWeight: "700", color: C.green },
  freeHint:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.greenLight, borderRadius: 8, padding: 8, marginTop: 4 },
  freeHintText:     { fontSize: 11, color: C.green, fontWeight: "600", flex: 1 },
});

// ─── Responsive hook ─────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = React.useState(Dimensions.get("window").width);
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setW(window.width));
    return () => sub?.remove?.();
  }, []);
  if (w >= 1024) return { isMobile: false, isTablet: false, isDesktop: true };
  if (w >= 640)  return { isMobile: false, isTablet: true,  isDesktop: false };
  return               { isMobile: true,  isTablet: false, isDesktop: false };
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },

  // Header
  header:          { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.white, paddingTop: Platform.OS === "android" ? 28 : 36, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  backBtn:         { width: 38, height: 38, borderRadius: 12, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
  headerMid:       { flex: 1 },
  headerTitle:     { fontSize: 20, fontWeight: "900", color: C.gray900, lineHeight: 24 },
  headerSub:       { fontSize: 12, color: C.gray400, marginTop: 1 },
  headerBadge:     { width: 28, height: 28, borderRadius: 14, backgroundColor: C.green, alignItems: "center", justifyContent: "center" },
  headerBadgeText: { fontSize: 12, fontWeight: "800", color: C.white },

  // Page layout
  pageBody:         { flex: 1, flexDirection: "row" },
  pageBodyDesktop:  { /* side-by-side enforced by children widths */ },

  // Main column
  mainCol:          { flex: 1, flexDirection: "column" },
  mainColTablet:    { /* flex:1 fills remaining space */ },
  mainColDesktop:   { flex: 1 /* sidebar is fixed width, this fills rest */ },

  // Sidebar (desktop)
  sideCol:          { width: 360, backgroundColor: C.bg, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 16, borderLeftWidth: 1, borderLeftColor: C.gray200 },

  // Delivery strip
  deliveryStrip:    { marginTop: 14, marginBottom: 8, overflow: "hidden" },
  deliveryGrad:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  deliveryLeft:     { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  deliveryIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  deliveryEta:      { fontSize: 14, fontWeight: "800", color: C.white },
  deliveryDist:     { fontSize: 11, color: "rgba(255,255,255,0.72)", marginTop: 2 },
  slotPickBtn:      { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  slotPickText:     { fontSize: 12, fontWeight: "800", color: C.green },
  slotConfirmed:    { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  slotConfirmedText:{ fontSize: 12, fontWeight: "700", color: C.white },

  // Counter banners
  counterBanner:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", marginBottom: 8, padding: 14, borderWidth: 1, borderColor: "#FDE68A" },
  counterTitle:      { fontSize: 13, fontWeight: "700", color: "#92400E" },
  counterSub:        { fontSize: 11, color: "#B45309", marginTop: 2 },
  counterAccept:     { backgroundColor: C.green, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  counterAcceptText: { fontSize: 13, fontWeight: "700", color: C.white },
  counterReject:     { width: 30, height: 30, borderRadius: 9, backgroundColor: C.redLight, alignItems: "center", justifyContent: "center" },

  // Items
  itemsScroll:   { flex: 1 },
  itemsCard:     { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, overflow: "hidden" },
  itemsTitle:    { fontSize: 13, fontWeight: "700", color: C.green, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  itemRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: C.gray100 },
  itemImg:       { backgroundColor: C.gray100 },
  itemMid:       { flex: 1 },
  itemName:      { fontSize: 14, fontWeight: "700", color: C.gray900 },
  itemUnit:      { fontSize: 12, color: C.gray400, marginTop: 2 },
  itemPrice:     { fontSize: 15, fontWeight: "800", color: C.gray900, marginTop: 4 },
  qtyRow:        { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: C.green, overflow: "hidden" },
  qtyBtn:        {},
  qtyNum:        { fontWeight: "800", color: C.gray900, textAlign: "center" },

  // Phone strip
  phoneStrip:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: C.gray200 },
  phoneText:     { flex: 1, fontSize: 12, color: C.gray600 },
  phoneBtn:      { backgroundColor: C.greenLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  phoneBtnText:  { fontSize: 12, fontWeight: "700", color: C.green },

  // Bill card (shared container)
  billCard:      { backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200, padding: 16 },
  billCardSide:  { borderRadius: 18, padding: 20 },

  // Sidebar elements
  sideCardTitle:    { fontSize: 17, fontWeight: "900", color: C.gray900, marginBottom: 14 },
  proceedBtnSide:   { borderRadius: 16, overflow: "hidden" },
  proceedGradSide:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18 },
  proceedTextSide:  { fontSize: 17, fontWeight: "900", color: C.white },
  slotSideCard:     { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: C.greenLight, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.greenBorder },
  slotSideTitle:    { fontSize: 13, fontWeight: "700", color: C.green },
  slotSideTime:     { fontSize: 16, fontWeight: "900", color: C.greenDark, marginTop: 3 },
  slotSideCTA:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: C.green, ...Platform.select({ web: { borderStyle: "dashed" }, default: { borderStyle: "solid" } }) },
  slotSideCTATitle: { fontSize: 14, fontWeight: "700", color: C.green },
  slotSideCTASub:   { fontSize: 12, color: C.gray400, marginTop: 2 },

  // Proceed bar (mobile/tablet)
  proceedBar:   { flexDirection: "row", alignItems: "center", backgroundColor: C.white, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 28 : 14, borderTopWidth: 1, borderTopColor: C.gray100, gap: 14 },
  proceedTotal: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  proceedSub:   { fontSize: 10, color: C.gray400, fontWeight: "600" },
  proceedBtn:   { },
  proceedGrad:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  proceedText:  { fontSize: 15, fontWeight: "900", color: C.white },

  // Empty cart
  emptyWrap:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyEmoji: { fontSize: 54, marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: C.gray900 },
  emptySub:   { fontSize: 14, color: C.gray400 },
  shopBtn:    { marginTop: 14, borderRadius: 14, overflow: "hidden" },
  shopBtnGrad:{ paddingHorizontal: 28, paddingVertical: 14 },
  shopBtnText:{ fontSize: 15, fontWeight: "800", color: C.white },
});