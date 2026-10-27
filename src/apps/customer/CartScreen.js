import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, Platform, StatusBar,
  Modal, Pressable, ActivityIndicator, Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import useCartStore    from "../../store/cartStore";
import useAuthStore    from "../../store/authStore";
import useAddressStore from "../../store/addressStore";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../theme/ThemeContext";
import { dkBg, dkBorder, dkText } from "../../theme/darkTones";
const BASE_URL   = process.env.EXPO_PUBLIC_API_URL    || "http://localhost:3000/api";

const LIGHT_COLORS = {
  orange: "#F97316",
  orangeDark: "#EA580C",
  green: "#16A34A",
  greenDark: "#15803D",
  greenLight: "#F0FDF4",
  greenBorder: "#BBF7D0",
  greenMid: "#DCFCE7",
  white: "#FFFFFF",
  surface: "#FFFFFF",
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
};

const DARK_COLORS = {
  orange: "#DB7A33",
  orangeDark: "#C9691F",
  green: "#2F9E68",
  greenDark: "#3AA673",
  greenLight: "#172720",
  greenBorder: "#2B4A3B",
  greenMid: "#1C3027",
  white: "#FFFFFF",
  surface: "#171A1F",
  bg: "#0F1216",
  gray100: "#1F2329",
  gray200: "#2E343C",
  gray300: "#3D434C",
  gray400: "#6A727E",
  gray500: "#8A929E",
  gray600: "#A4ABB6",
  gray700: "#BFC5CE",
  gray900: "#ECEFF3",
  red: "#DE5C5C",
  redLight: "#2C1E20",
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
    slot_start:  new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, -1),
    slot_end:    new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, -1),
    start_label: fmt(start),
    end_label:   fmt(end),
  };
}

// Global fallback for styles created outside React components
const C = LIGHT_COLORS;

// Modals removed to consolidate features in Checkout screen.

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

// Fee modality removed...

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
  const { t }        = useTranslation();
  const navigation   = useNavigation();
  const cart         = useCartStore();
  const { token }    = useAuthStore();
  const addressStore = useAddressStore();

  const items    = cart?.items || [];
  const vendorId = cart?.vendorId;
  const vendorName = items[0]?.vendorName || "Store";

  const [deliveryInfo,     setDeliveryInfo]     = useState(null);
  const [loadingInfo,      setLoadingInfo]      = useState(false);

  const subtotal   = items.reduce((s, i) => s + i.price * (i.qty || i.quantity || 0), 0);
  const activeFee  = deliveryInfo?.delivery_fee ?? "failed to fetch";
  const grandTotal = subtotal + activeFee;
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
  //   ─── Fetch real delivery fee as soon as Cart loads ─────────────────────────────────────────
  // Triggers whenever address selection, coordinates, or subtotal changes
const themedStyles = React.useMemo(() => ({
  root: { backgroundColor: themeColors.bg },
  header: {
    backgroundColor: themeColors.surface,
    borderBottomColor: themeColors.gray200,
  },
  backBtn: { backgroundColor: themeColors.gray100 },
  headerTitle: { color: themeColors.gray900 },
  headerSub: { color: themeColors.gray500 },
  pageBody: { backgroundColor: themeColors.bg },
  sideCol: {
    backgroundColor: themeColors.bg,
    borderLeftColor: themeColors.gray200,
  },
  itemsCard: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.gray200,
  },
  itemsTitle: { borderBottomColor: themeColors.gray200 },
  itemRowBorder: { borderBottomColor: themeColors.gray200 },
  itemImg: { backgroundColor: themeColors.gray100 },
  itemName: { color: themeColors.gray900 },
  itemUnit: { color: themeColors.gray500 },
  itemPrice: { color: themeColors.gray900 },
  qtyRow: { borderColor: themeColors.green },
  qtyNum: { color: themeColors.gray900 },
  billCard: {
    backgroundColor: themeColors.surface,
    borderColor: themeColors.gray200,
  },
  sideCardTitle: { color: themeColors.gray900 },
  proceedBar: {
    backgroundColor: themeColors.surface,
    borderTopColor: themeColors.gray200,
  },
  proceedTotal: { color: themeColors.gray900 },
  proceedSub: { color: themeColors.gray500 },
  emptyTitle: { color: themeColors.gray900 },
  emptySub: { color: themeColors.gray500 },
}), [themeColors]);

  useEffect(() => {
    if (!vendorId) return;

    // Get the customer's default/selected address from local memory
    const saved = (addressStore?.addresses || []).find(a => a.id === addressStore?.selectedId);
    if (!saved?.lat || !saved?.lng) return; // Skip if they haven't saved a real address yet

    const ctrl = new AbortController();
    setLoadingInfo(true);
    
    (async () => {
      try {
        const queryParamsObj = {
          vendor_id: vendorId,
          customer_lat: saved.lat,
          customer_lng: saved.lng,
          subtotal: subtotal,
        };
        const params = new URLSearchParams(queryParamsObj);
        const res = await fetch(`${BASE_URL}/slots/delivery-info?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
        });
        const json = await res.json();
        
        if (res.ok && json.data) {
          setDeliveryInfo(json.data); 
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('cart delivery-info fetch failed:', e.message);
      } finally {
        // setLoadingInfo(false);
      }
    })();

    return () => ctrl.abort();
  }, [vendorId, addressStore?.selectedId, subtotal, token]);


  // Qty helpers ────────────────────────────────────────────────────────────
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
  const formatWeight = (w) => {
    if (!w) return "";
    if (typeof w === "string") return w;
    if (typeof w === "object") {
      if (w.weight !== undefined && w.unit) return `${w.weight}${w.unit}`;
      if (w.weight !== undefined) return String(w.weight);
      return w.unit || "";
    }
    return String(w);
  };

  // ── Breakpoint (must be before any early return — Rules of Hooks) ───────────
  const { isDesktop, isTablet, isMobile } = useBreakpoint();
  const px    = isDesktop ? 40  : isTablet ? 28 : 16;
  const cardR = isDesktop ? 20  : isTablet ? 18 : 14;
  const fs    = isDesktop ? 1.15 : isTablet ? 1.07 : 1;

  // ── Empty cart ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <View style={[s.root, themedStyles.root]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[s.header, themedStyles.header]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, themedStyles.backBtn]}>
            <Feather name="arrow-left" size={20} color={C.gray900} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, themedStyles.headerTitle]}>{t('cart.title')}</Text>
        </View>
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>🛒</Text>
          <Text style={s.emptyTitle}>{t('cart.empty')}</Text>
          <Text style={s.emptySub}>{t('cart.emptySubtitle')}</Text>
          <TouchableOpacity style={s.shopBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <LinearGradient colors={[C.orange, C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.shopBtnGrad}>
              <Text style={s.shopBtnText}>{t('cart.browseStores') || 'Browse Stores'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }


  // ── Main render ────────────────────────────────────────────────────────────

  return (
<View style={[s.root, themedStyles.root]}>
  <StatusBar
    barStyle={isDark ? "light-content" : "dark-content"}
    backgroundColor={themeColors.surface}
  />

      {/* HEADER */}
      <View style={[s.header, themedStyles.header, { paddingHorizontal: px }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, themedStyles.backBtn]}>
          <Feather name="arrow-left" size={20} color={C.gray900} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={[s.headerTitle, themedStyles.headerTitle, { fontSize: Math.round(20 * fs) }]}>{t('cart.title')}</Text>
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

          {/* Vendor Info Strip */}
          <View style={[s.vendorHeader, { borderRadius: cardR, marginHorizontal: px }]}>
            <LinearGradient
              colors={[C.orange, C.orangeDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.vendorGrad}
            >
              <View style={s.vendorInfo}>
                <View style={s.vendorIcon}>
                  <Feather name="shopping-bag" size={20} color={C.white} />
                </View>
                <View>
                  <Text style={s.orderingFrom}>{t('cart.orderingFrom') || 'Ordering from'}</Text>
                  <Text style={s.vendorNameText}>{vendorName}</Text>
                </View>
              </View>
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
            <View style={[s.itemsCard, themedStyles.itemsCard, { borderRadius: cardR }]}>
              <Text style={[s.itemsTitle, {
                paddingHorizontal: isDesktop ? 22 : 14,
                paddingVertical: isDesktop ? 14 : 10,
                fontSize: Math.round(13 * fs),
              }]}>{vendorName}</Text>

              {items.map((item, idx) => (
                <View key={item.id} style={[
                  s.itemRow,
                  idx < items.length - 1 && [s.itemRowBorder, themedStyles.itemRowBorder],
                  { paddingHorizontal: isDesktop ? 22 : 14, paddingVertical: isDesktop ? 18 : 12 },
                ]}>
                  <Image
                    source={{ uri: item.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200" }}
style={[s.itemImg, themedStyles.itemImg, {
  width: isDesktop ? 70 : isTablet ? 58 : 48,
  height: isDesktop ? 70 : isTablet ? 58 : 48,
  borderRadius: isDesktop ? 14 : 10,
}]}
                    resizeMode="cover"
                  />
                  <View style={s.itemMid}>
                    <Text style={[s.itemName, themedStyles.itemName, { fontSize: Math.round(14 * fs) }]} numberOfLines={1}>{item.name}</Text>
                    {item.unit ? <Text style={[s.itemUnit, themedStyles.itemUnit, { fontSize: Math.round(12 * fs) }]}>{formatWeight(item.unit)}</Text> : null}
                    <Text style={[s.itemPrice, themedStyles.itemPrice, { fontSize: Math.round(15 * fs) }]}>₹{item.price * (item.qty ?? item.quantity ?? 1)}</Text>
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



            {/* Bill summary — inline on mobile/tablet, hidden on desktop (shown in sidebar) */}
            {!isDesktop && (
              <View style={[s.billCard, themedStyles.billCard, { borderRadius: cardR, marginTop: 8 }]}>
                <BillSummary
                  subtotal={subtotal}
                  activeFee={activeFee}
                  grandTotal={grandTotal}
                  fs={fs}
                />
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Proceed bar — bottom of main col on mobile/tablet */}
          {!isDesktop && (
            <View style={[s.proceedBar, themedStyles.proceedBar, { paddingHorizontal: px }]}>
              <View>
                <Text style={[s.proceedTotal, themedStyles.proceedTotal, { fontSize: Math.round(20 * fs) }]}>₹{grandTotal}</Text>
                <Text style={[s.proceedSub, { fontSize: Math.round(11 * fs) }]}>{t('cart.total')}</Text>
              </View>

              <TouchableOpacity 
                onPress={() => navigation.navigate("Checkout")} 
                activeOpacity={0.88} 
                style={[s.proceedBtn, { flex: 1 }]}
              >
                <LinearGradient
                  colors={[C.green, C.greenDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[s.proceedGrad, { borderRadius: Math.round(14 * fs) }]}
                >
                  <Text style={[s.proceedText, { fontSize: Math.round(15 * fs) }]}>{t('cart.proceedToCheckout') || 'Proceed to checkout'}</Text>
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
            <View style={[s.billCard, themedStyles.billCard, s.billCardSide]}>
              <Text style={s.sideCardTitle}>{t('cart.orderSummary') || 'Order Summary'}</Text>
              <BillSummary
                subtotal={subtotal}
                activeFee={activeFee}
                grandTotal={grandTotal}
                fs={fs}
              />
            </View>


            {/* Proceed button in sidebar */}
            <TouchableOpacity 
              onPress={() => navigation.navigate("Checkout")} 
              activeOpacity={0.88} 
              style={s.proceedBtnSide}
            >
              <LinearGradient colors={[C.green, C.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.proceedGradSide}>
                <Text style={s.proceedTextSide}>{t('cart.proceedToCheckout') || 'Proceed to checkout'}</Text>
                <Feather name="arrow-right" size={18} color={C.white} />
              </LinearGradient>
            </TouchableOpacity>


          </View>
        )}

      </View>{/* /pageBody */}

    </View>
  );
}

// ─── BillSummary (shared between inline and sidebar) ──────────────────────────
function BillSummary({ subtotal, activeFee, grandTotal, fs = 1 }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const bs = StyleSheet.create({
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 5,
    },
    label: { fontSize: 14, color: C.gray600 },
    value: { fontSize: 14, fontWeight: "600", color: C.gray900 },
    divider: {
      height: 1,
      backgroundColor: C.gray200,
      marginVertical: 8,
    },
    grandLabel: { fontSize: 16, fontWeight: "900", color: C.gray900 },
    negotiateBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: C.greenLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    negotiateBtnText: { fontSize: 10, fontWeight: "700", color: C.green },
    pendingBadge: {
      backgroundColor: dkBg("#FEF3C7", isDark),
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    pendingBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: dkText("#D97706", isDark),
    },
    agreedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: C.greenMid,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    agreedBadgeText: { fontSize: 10, fontWeight: "700", color: C.green },
    freeHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: C.greenLight,
      borderRadius: 8,
      padding: 8,
      marginTop: 4,
    },
    freeHintText: {
      fontSize: 11,
      color: C.green,
      fontWeight: "600",
      flex: 1,
    },
  });

  // Keep your existing return (...) block here unchanged.
  return (
    <>
      <View style={bs.row}>
        <Text style={[bs.label, { fontSize: Math.round(14 * fs) }]}>{t('cart.itemsTotal') || 'Items total'}</Text>
        <Text style={[bs.value, { fontSize: Math.round(14 * fs) }]}>₹{subtotal}</Text>
      </View>
      <View style={bs.row}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <Text style={[bs.label, { fontSize: Math.round(14 * fs) }]}>{t('cart.deliveryFee') || 'Delivery fee'}</Text>
        </View>
        {activeFee === 0
          ? <Text style={[bs.value, { color: C.green, fontSize: Math.round(14 * fs) }]}>{t('cart.free') || 'FREE'}</Text>
          : <Text style={[bs.value, { fontSize: Math.round(14 * fs) }]}>₹{activeFee}</Text>}
      </View>

      <View style={bs.divider} />
      <View style={bs.row}>
        <Text style={[bs.grandLabel, { fontSize: Math.round(16 * fs) }]}>{t('cart.grandTotal') || 'Grand Total'}</Text>
        <Text style={[bs.grandLabel, { fontSize: Math.round(16 * fs) }]}>₹{grandTotal}</Text>
      </View>
    </>
  );
}

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
  vendorHeader: { height: 70, overflow: "hidden", marginBottom: 12 },
  vendorGrad:   { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 20 },
  vendorInfo:   { flexDirection: "row", alignItems: "center", gap: 12 },
  vendorIcon:   { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  orderingFrom: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.5 },
  vendorNameText: { fontSize: 18, fontWeight: "900", color: C.white },

  deliveryStrip:    { height: 64, overflow: "hidden", marginBottom: 12 },
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