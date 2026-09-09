import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, Alert, Share, Platform,
  SafeAreaView, Modal, Pressable, ActivityIndicator,
  Switch, Linking, useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import AddressMapView from "../../components/AddressMapView";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";


const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const C = {
  orange: "#F97316", orangeDark: "#EA580C", orangeLight: "#FFF7ED",
  green: "#16A34A", greenDark: "#15803D",
  greenLight: "#F0FDF4", greenBorder: "#BBF7D0",
  greenMid: "#DCFCE7",
  blue: "#3B82F6", blueLight: "#EFF6FF",
  purple: "#8B5CF6", purpleLight: "#F5F3FF",
  white: "#FFFFFF", bg: "#F8FAFC",
  gray100: "#F3F4F6", gray200: "#E5E7EB",
  gray300: "#D1D5DB", gray400: "#9CA3AF",
  gray500: "#6B7280", gray600: "#4B5563",
  gray700: "#374151", gray900: "#111827",
  red: "#EF4444", redLight: "#FEF2F2",
};

// ─── Avatar initials ──────────────────────────────────────────────────────
function Avatar({ name, size = 64 }) {
  const initials = (name || "?")
    .trim().split(" ").slice(0, 2)
    .map(w => w[0]?.toUpperCase() || "").join("");
  return (
    <LinearGradient
      colors={[C.orange, C.green]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ color: C.white, fontWeight: "900", fontSize: size * 0.36, letterSpacing: 1 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────
function EditModal({ visible, field, label, value, keyboardType = "default", onSave, onClose, saving }) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { if (visible) setDraft(value || ""); }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={em.backdrop} onPress={onClose}>
        <Pressable style={em.sheet} onPress={() => { }}>
          <View style={em.handle} />
          <Text style={em.title}>Edit {label}</Text>
          <View style={em.inputBox}>
            <TextInput
              style={em.input}
              value={draft}
              onChangeText={setDraft}
              keyboardType={keyboardType}
              autoFocus
              autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
              underlineColorAndroid="transparent"
              selectionColor={C.green}
              returnKeyType="done"
              onSubmitEditing={() => onSave(draft.trim())}
            />
          </View>
          <View style={em.btns}>
            <TouchableOpacity style={em.cancel} onPress={onClose}>
              <Text style={em.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[em.save, (!draft.trim() || saving) && em.saveOff]}
              onPress={() => onSave(draft.trim())}
              disabled={!draft.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={em.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const em = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 16 },
  inputBox: { backgroundColor: C.gray100, borderRadius: 14, borderWidth: 1.5, borderColor: C.greenBorder, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  input: { fontSize: 16, color: C.gray900, fontWeight: "600", ...Platform.select({ web: { outlineStyle: "none" } }) },
  btns: { flexDirection: "row", gap: 12 },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.gray100, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: C.gray600 },
  save: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.green, alignItems: "center" },
  saveOff: { backgroundColor: C.greenMid },
  saveText: { fontSize: 15, fontWeight: "800", color: C.white },
});

// ─── Info row (tappable field) ────────────────────────────────────────────
function InfoRow({ label, value, onEdit, editable = true, icon = "user" }) {
  return (
    <View style={ir.row}>
      <View style={[ir.fieldIconWrap, !editable && ir.fieldIconWrapOff]}>
        <Feather name={icon} size={15} color={editable ? C.green : C.gray400} />
      </View>
      <View style={ir.left}>
        <Text style={ir.label}>{label}</Text>
        <Text style={[ir.value, !value && ir.valuePlaceholder]}>
          {value || `Add ${label.toLowerCase()}`}
        </Text>
      </View>
      {editable && (
        <TouchableOpacity style={ir.editBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="edit-2" size={13} color={C.green} />
        </TouchableOpacity>
      )}
      {!editable && (
        <View style={ir.lockWrap}>
          <Feather name="lock" size={13} color={C.gray300} />
        </View>
      )}
    </View>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  fieldIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.greenMid, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fieldIconWrapOff: { backgroundColor: C.gray100 },
  left: { flex: 1 },
  label: { fontSize: 11, fontWeight: "700", color: C.gray400, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 5 },
  value: { fontSize: 16, fontWeight: "600", color: C.gray900 },
  valuePlaceholder: { color: C.gray400, fontWeight: "400", fontStyle: "italic" },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.greenMid, alignItems: "center", justifyContent: "center" },
  lockWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
});

// ─── Address card ─────────────────────────────────────────────────────────
function AddressCard({ addr, isSelected, onSelect, onRemove }) {
  const text = typeof addr.address === "string" ? addr.address : addr.address_line || "Saved address";
  return (
    <TouchableOpacity
      style={[adc.card, isSelected && adc.cardActive]}
      onPress={() => onSelect(addr)} activeOpacity={0.8}
    >
      <View style={[adc.icon, isSelected && adc.iconActive]}>
        <Feather name="map-pin" size={13} color={isSelected ? C.white : C.gray500} />
      </View>
      <Text style={[adc.text, isSelected && adc.textActive]} numberOfLines={2}>{text}</Text>
      {isSelected
        ? <View style={adc.tick}><Feather name="check" size={11} color={C.white} /></View>
        : <TouchableOpacity onPress={() => onRemove(addr)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={15} color={C.gray300} />
        </TouchableOpacity>
      }
    </TouchableOpacity>
  );
}
const adc = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16,
    backgroundColor: C.white, marginBottom: 10, borderWidth: 1, borderColor: C.gray100,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  cardActive: { borderColor: C.greenBorder, backgroundColor: C.greenLight, shadowOpacity: 0.08 },
  icon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconActive: { backgroundColor: C.green },
  text: { flex: 1, fontSize: 13.5, color: C.gray700, fontWeight: "500", lineHeight: 19 },
  textActive: { color: C.greenDark, fontWeight: "700" },
  activeLabel: { fontSize: 11, color: C.green, fontWeight: "700", marginTop: 3 },
  tick: { width: 22, height: 22, borderRadius: 7, backgroundColor: C.green, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});

// ─── Row menu item ────────────────────────────────────────────────────────
const TINTS = {
  orange: { bg: C.orangeLight, fg: C.orangeDark },
  green: { bg: C.greenMid, fg: C.greenDark },
  blue: { bg: C.blueLight, fg: C.blue },
  purple: { bg: C.purpleLight, fg: C.purple },
};
function MenuItem({ icon, label, onPress, danger, right, sub, tint }) {
  const t = tint ? TINTS[tint] : null;
  return (
    <TouchableOpacity
      style={[mi.row, danger && mi.rowDanger]}
      onPress={onPress} activeOpacity={0.75}
    >
      <View style={[mi.iconWrap, danger && mi.iconDanger, t && { backgroundColor: t.bg }]}>
        <Feather name={icon} size={16} color={danger ? C.red : (t ? t.fg : C.gray600)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[mi.label, danger && mi.labelDanger]}>{label}</Text>
        {sub ? <Text style={mi.sub}>{sub}</Text> : null}
      </View>
      {right !== undefined ? right : <Feather name="chevron-right" size={15} color={danger ? "#FECACA" : C.gray300} />}
    </TouchableOpacity>
  );
}
const mi = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 15, paddingHorizontal: 16,
    backgroundColor: C.white, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: C.gray100,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  rowDanger: { borderColor: "#FECACA", backgroundColor: C.redLight, shadowOpacity: 0 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
  iconDanger: { backgroundColor: "#FEE2E2" },
  label: { fontSize: 15, color: C.gray900, fontWeight: "600" },
  labelDanger: { color: C.red },
  sub: { fontSize: 12, color: C.gray400, marginTop: 2 },
});

// ─── Address Detail Modal ─────────────────────────────────────────────────
function AddressDetailModal({ addr, isSelected, onSelect, onRemove, onClose }) {
  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    if (addr?.lat && addr?.lng) {
      setRegion({
        latitude: parseFloat(addr.lat),
        longitude: parseFloat(addr.lng),
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [addr]);

  if (!addr) return null;
  const text = typeof addr.address === "string" ? addr.address : addr.address_line || "Saved address";
  return (
    <Modal visible={!!addr} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={adm.backdrop} onPress={onClose}>
        <Pressable style={adm.sheet} onPress={() => { }}>
          <View style={adm.handle} />
          <Text style={adm.title}>Address details</Text>

          {/* Map Preview */}
          {addr.lat && addr.lng && (
            <View style={adm.mapWrapper}>
              <AddressMapView
                region={region}
                latitude={parseFloat(addr.lat)}
                longitude={parseFloat(addr.lng)}
                onRegionChangeComplete={setRegion}
              />
            </View>
          )}

          {/* Address text */}
          <View style={adm.addrBox}>
            <View style={[adm.addrIcon, isSelected && adm.addrIconActive]}>
              <Feather name="map-pin" size={18} color={isSelected ? C.white : C.gray500} />
            </View>
            <Text style={adm.addrText}>{text}</Text>
          </View>

          {/* Coordinates if available */}
          {addr.lat && addr.lng && (
            <View style={adm.coordRow}>
              <Feather name="navigation" size={13} color={C.gray400} />
              <Text style={adm.coordText}>
                {parseFloat(addr.lat).toFixed(6)}, {parseFloat(addr.lng).toFixed(6)}
              </Text>
            </View>
          )}

          {/* Active badge */}
          {isSelected && (
            <View style={adm.activeBadge}>
              <Feather name="check-circle" size={14} color={C.green} />
              <Text style={adm.activeBadgeText}>This is your active delivery address</Text>
            </View>
          )}

          {/* Actions */}
          <View style={adm.actions}>
            {!isSelected && (
              <TouchableOpacity style={adm.selectBtn} onPress={() => onSelect(addr)} activeOpacity={0.85}>
                <Feather name="check" size={15} color={C.white} />
                <Text style={adm.selectBtnText}>Set as delivery address</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[adm.removeBtn, isSelected && { opacity: 0.4 }]}
              onPress={() => !isSelected && onRemove(addr)}
              disabled={isSelected}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={15} color={C.red} />
              <Text style={adm.removeBtnText}>
                {isSelected ? "Can't delete active address" : "Remove address"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const adm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 20 },
  mapWrapper: { height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: C.gray200 },
  addrBox: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: C.gray100, borderRadius: 14, padding: 16, marginBottom: 12 },
  addrIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.gray200, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addrIconActive: { backgroundColor: C.green },
  addrText: { flex: 1, fontSize: 15, color: C.gray800 ?? C.gray900, fontWeight: "500", lineHeight: 22 },
  coordRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, marginBottom: 12 },
  coordText: { fontSize: 12, color: C.gray400, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenLight, borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: C.greenBorder },
  activeBadgeText: { fontSize: 13, color: C.green, fontWeight: "600", flex: 1 },
  actions: { gap: 10 },
  selectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.green, paddingVertical: 15, borderRadius: 14 },
  selectBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.redLight, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#FECACA" },
  removeBtnText: { fontSize: 14, fontWeight: "700", color: C.red },
});

// ─── Section header ───────────────────────────────────────────────────────
function SectionLabel({ title }) {
  return (
    <View style={secStyles.wrap}>
      <View style={secStyles.tick} />
      <Text style={secStyles.text}>{title}</Text>
    </View>
  );
}
const secStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, marginTop: 30 },
  tick: { width: 3, height: 14, borderRadius: 2, backgroundColor: C.green },
  text: { fontSize: 12, fontWeight: "800", color: C.gray500, letterSpacing: 0.8, textTransform: "uppercase" },
});

// ─── Logout modal ─────────────────────────────────────────────────────────
function LogoutModal({ visible, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={lm.backdrop} onPress={onCancel}>
        <Pressable style={lm.card} onPress={() => { }}>
          <LinearGradient colors={["#FEF2F2", "#FFF"]} style={lm.iconWrap}>
            <Feather name="log-out" size={26} color={C.red} />
          </LinearGradient>
          <Text style={lm.title}>Log out?</Text>
          <Text style={lm.sub}>Your cart and session will be cleared.</Text>
          <View style={lm.btns}>
            <TouchableOpacity style={lm.cancel} onPress={onCancel}>
              <Text style={lm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={lm.confirm} onPress={onConfirm}>
              <Text style={lm.confirmText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const lm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 28, width: "82%", alignItems: "center", gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  sub: { fontSize: 13, color: C.gray400, textAlign: "center", lineHeight: 20 },
  btns: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.gray100, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: C.gray700 },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.red, alignItems: "center" },
  confirmText: { fontSize: 15, fontWeight: "700", color: C.white },
});

// ─── Payment placeholder modal ────────────────────────────────────────────
function PaymentModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm2.backdrop} onPress={onClose}>
        <Pressable style={pm2.sheet} onPress={() => { }}>
          <View style={pm2.handle} />
          <Text style={pm2.title}>Payment Methods</Text>
          <View style={pm2.placeholder}>
            <Feather name="credit-card" size={36} color={C.gray300} />
            <Text style={pm2.placeholderTitle}>Coming soon</Text>
            <Text style={pm2.placeholderSub}>Razorpay integration for UPI & cards will be available soon.</Text>
          </View>
          <TouchableOpacity style={pm2.closeBtn} onPress={onClose}>
            <Text style={pm2.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const pm2 = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 20 },
  placeholder: { alignItems: "center", paddingVertical: 32, gap: 10, backgroundColor: C.gray100, borderRadius: 16, marginBottom: 20 },
  placeholderTitle: { fontSize: 16, fontWeight: "800", color: C.gray500 },
  placeholderSub: { fontSize: 13, color: C.gray400, textAlign: "center", paddingHorizontal: 24 },
  closeBtn: { backgroundColor: C.gray100, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  closeBtnText: { fontSize: 15, fontWeight: "700", color: C.gray600 },
});

// ═════════════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user, token, logout, updateUser, setActiveRole } = useAuthStore();
  const { clearCart } = useCartStore();
  const addressStore = useAddressStore();
  const { width: winW } = useWindowDimensions();
  const isWide = winW > 600;
  const [showLanguage, setShowLanguage] = useState(false);
  const contentMaxW = Math.min(winW, 640);
  const hPad = isWide ? Math.max(24, Math.floor((winW - contentMaxW) / 2)) : 20;

  const [showLogout, setShowLogout] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [editField, setEditField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [detailAddr, setDetailAddr] = useState(null);

  // Load notification preference from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem("notif_enabled")
      .then(v => { if (v !== null) setNotifEnabled(v === "true" || v === true); })
      .catch(() => { });
  }, []);

  // Animations
  const fadeO = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeO, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Save field ─────────────────────────────────────────────────────────
  const handleSave = async (value) => {
    if (!value || !editField) return;
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [editField.field]: value }),
      });
      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        setEditField(null);
      } else {
        Alert.alert("Couldn't save", data.msg || "Please try again");
      }
    } catch {
      Alert.alert("Network error", "Please check your connection and try again");
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle notifications ───────────────────────────────────────────────
  const handleNotifToggle = async (val) => {
    setNotifEnabled(val);
    await AsyncStorage.setItem("notif_enabled", String(val));
  };

  // ── Invite ─────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    try {
      await Share.share({
        message: "🛒 DesiDukaan — order groceries from nearby kirana stores!\n\nJoin with my invite and get ₹150 credit:\nhttps://desidukaan.app/invite",
      });
    } catch { }
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearCart();
    addressStore.clearAddresses?.();
    logout();
    setShowLogout(false);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  return (
    <SafeAreaView style={s.root}>
      <Animated.ScrollView
        style={{ opacity: fadeO }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ translateY: slideY }] }}>
          <LinearGradient
            colors={[C.greenDark, C.green, "#22c55e"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.hero, { paddingHorizontal: hPad }]}
          >
            {/* Decorative accents */}
            <View style={s.heroDecorCircle1} pointerEvents="none" />
            <View style={s.heroDecorCircle2} pointerEvents="none" />

            {/* Top row */}
            <View style={s.heroTop}>
              <Text style={s.heroLabel}>{t('profile.myProfile')}</Text>
            </View>

            {/* Avatar + name */}
            <View style={s.heroMain}>
              <View style={s.avatarRing}>
                <View style={s.avatarOuter}>
                  <Avatar name={user?.name} size={72} />
                  <View style={s.verifiedDot}>
                    <Feather name="check" size={9} color={C.white} />
                  </View>
                </View>
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroName} numberOfLines={1}>{user?.name || "Guest"}</Text>
                <View style={s.heroPill}>
                  <Feather name="phone" size={11} color={C.green} />
                  <Text style={s.heroPillText}>{user?.phone || "—"}</Text>
                </View>
                {memberSince && <Text style={s.heroSince}>{t('profile.memberSince', { date: memberSince })}</Text>}
              </View>
            </View>
          </LinearGradient>

          {/* Stats — sits OUTSIDE the hero's overflow:hidden box so the
              overlap isn't clipped; it overlaps upward via negative marginTop
              on statsWrap instead, and paints on top since it's a later sibling */}
          <View style={[s.statsWrap, { paddingHorizontal: hPad }]}>
            <View style={s.stats}>
              <View style={s.statItem}>
                <View style={[s.statIconWrap, { backgroundColor: C.greenMid }]}>
                  <Feather name="map-pin" size={13} color={C.greenDark} />
                </View>
                <Text style={s.statNum}>{addressStore?.addresses?.length ?? 0}</Text>
                <Text style={s.statLabel}>{t('profile.savedAddresses')}</Text>
              </View>
              <View style={s.statSep} />
              <View style={s.statItem}>
                <View style={[s.statIconWrap, { backgroundColor: C.orangeLight }]}>
                  <Feather name="credit-card" size={13} color={C.orangeDark} />
                </View>
                <Text style={s.statNum}>₹150</Text>
                <Text style={s.statLabel}>{t('profile.credits')}</Text>
              </View>
              <View style={s.statSep} />
              <View style={s.statItem}>
                <View style={[s.statIconWrap, { backgroundColor: C.blueLight }]}>
                  <Feather name="user" size={13} color={C.blue} />
                </View>
                <Text style={[s.statNum, { fontSize: 12.5 }]} numberOfLines={1}>
                  {(user?.role || "customer").toUpperCase()}
                </Text>
                <Text style={s.statLabel}>{t('profile.account')}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: hPad }}>

          {/* Personal info */}
          <SectionLabel title={t('profile.personalInfo')} />
          <View style={s.card}>
            <InfoRow
              label={t('profile.name')}
              value={user?.name}
              onEdit={() => setEditField({ field: "name", label: t('profile.name'), value: user?.name })}
            />
            <InfoRow
              label={t('profile.email')}
              value={user?.email}
              onEdit={() => setEditField({ field: "email", label: t('profile.email'), value: user?.email, keyboardType: "email-address" })}
            />
            <View style={[ir.row, { borderBottomWidth: 0 }]}>
              <View style={[ir.fieldIconWrap, ir.fieldIconWrapOff]}>
                <Feather name="phone" size={15} color={C.gray400} />
              </View>
              <View style={ir.left}>
                <Text style={ir.label}>{t('profile.phone')}</Text>
                <Text style={ir.value}>{user?.phone || "—"}</Text>
              </View>
              <View style={ir.lockWrap}>
                <Feather name="lock" size={13} color={C.gray300} />
              </View>
            </View>
          </View>

          {/* Delivery addresses */}
          <SectionLabel title={t('profile.deliveryAddresses')} />
          {addressStore?.addresses?.length === 0 ? (
            <View style={s.emptyBox}>
              <Feather name="map-pin" size={24} color={C.gray300} />
              <Text style={s.emptyTitle}>{t('profile.noAddresses')}</Text>
              <Text style={s.emptySub}>{t('profile.noAddressesSub')}</Text>
            </View>
          ) : (
            <>
              {addressStore.addresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[adc.card, addr.id === addressStore.selectedId && adc.cardActive]}
                  onPress={() => setDetailAddr(addr)}
                  activeOpacity={0.8}
                >
                  <View style={[adc.icon, addr.id === addressStore.selectedId && adc.iconActive]}>
                    <Feather name="map-pin" size={13} color={addr.id === addressStore.selectedId ? C.white : C.gray500} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[adc.text, addr.id === addressStore.selectedId && adc.textActive]} numberOfLines={2}>
                      {typeof addr.address === "string" ? addr.address : addr.address_line || "Saved address"}
                    </Text>
                    {addr.id === addressStore.selectedId && (
                      <Text style={adc.activeLabel}>Active delivery address</Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={15} color={addr.id === addressStore.selectedId ? C.green : C.gray300} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Activity */}
          <SectionLabel title={t('profile.activity')} />
          <MenuItem
            icon="shopping-bag"
            label={t('profile.orderHistory')}
            sub={t('profile.orderHistorySub')}
            onPress={() => navigation.navigate("Orders")}
          />
          <MenuItem
            icon="gift"
            label={t('profile.inviteFriends')}
            sub={t('profile.inviteFriendsSub')}
            onPress={handleInvite}
          />

          {/* App */}
          <SectionLabel title={t('profile.app')} />
          <MenuItem
            icon="bell"
            label={t('profile.pushNotifications')}
            sub={notifEnabled ? t('profile.enabled') : t('profile.disabled')}
            onPress={() => handleNotifToggle(!notifEnabled)}
            right={
              <Switch
                value={notifEnabled === true}
                onValueChange={handleNotifToggle}
                trackColor={{ false: C.gray200, true: C.greenMid }}
                thumbColor={notifEnabled === true ? C.green : C.gray400}
                ios_backgroundColor={C.gray200}
              />
            }
          />
          <MenuItem
            icon="globe"
            label={t('profile.language')}
            sub={t('profile.languageSub')}
            onPress={() => setShowLanguage(true)}
          />
          <MenuItem
            icon="credit-card"
            label={t('profile.paymentMethods')}
            sub={t('profile.paymentMethodsSub')}
            onPress={() => setShowPayments(true)}
          />
          <MenuItem
            icon="help-circle"
            label={t('profile.helpSupport')}
            sub={t('profile.helpSupportSub')}
            onPress={() => navigation.navigate("Support")}
          />
          <MenuItem
            icon="shield"
            label={t('auth.privacyPolicy')}
            onPress={() => navigation.navigate("Privacy")}
          />
          <MenuItem
            icon="file-text"
            label={t('profile.termsConditions')}
            onPress={() => navigation.navigate("Terms")}
          />

          {/* Account */}
          <SectionLabel title={t('profile.accountSection')} />
          <MenuItem
            icon="shuffle"
            label="Switch Profile"
            sub="Switch between Customer, Vendor & Delivery"
            tint="blue"
            onPress={async () => { await setActiveRole(null); }}
          />
          <MenuItem
            icon="log-out"
            label={t('profile.logout')}
            onPress={() => setShowLogout(true)}
            danger
            right={null}
          />

        </View>
      </Animated.ScrollView>

      {/* Modals */}
      <AddressDetailModal
        addr={detailAddr}
        isSelected={detailAddr?.id === addressStore.selectedId}
        onSelect={(a) => { addressStore.setSelectedId(a.id); setDetailAddr(null); }}
        onRemove={(a) => { addressStore.removeAddress(a.id, token); setDetailAddr(null); }}
        onClose={() => setDetailAddr(null)}
      />
      <EditModal
        visible={!!editField}
        field={editField?.field}
        label={editField?.label}
        value={editField?.value}
        keyboardType={editField?.keyboardType}
        onSave={handleSave}
        onClose={() => setEditField(null)}
        saving={saving}
      />
      <PaymentModal visible={showPayments} onClose={() => setShowPayments(false)} />
      <LogoutModal
        visible={showLogout}
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />
      {/* Language Picker Modal */}
      <Modal
        visible={showLanguage}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguage(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowLanguage(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={{ width: 44, height: 5, backgroundColor: C.gray200, borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
            <LanguageSwitcher inline onClose={() => setShowLanguage(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero — rounded bottom edge + decorative circles for depth
  hero: {
    paddingTop: Platform.OS === "android" ? 32 : 24, paddingBottom: 44,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroDecorCircle1: { position: "absolute", top: -50, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.08)" },
  heroDecorCircle2: { position: "absolute", top: 70, right: 50, width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.07)" },

  heroTop: { marginBottom: 24 },
  heroLabel: { fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase" },
  heroMain: { flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 28 },

  avatarRing: { padding: 4, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.22)" },
  avatarOuter: { position: "relative" },
  verifiedDot: {
    position: "absolute", bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.green, borderWidth: 2.5, borderColor: C.white,
    alignItems: "center", justifyContent: "center",
  },

  heroInfo: { flex: 1 },
  heroName: { fontSize: 24, fontWeight: "900", color: C.white, letterSpacing: -0.3, flexWrap: "wrap" },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.white, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  heroPillText: { fontSize: 13, fontWeight: "700", color: C.green },
  heroSince: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 6 },

  // Stats wrapper — a plain sibling AFTER the hero (not inside its
  // overflow:hidden box), pulled up with a negative marginTop so it overlaps
  // the green area. Because it paints after the hero, the overlap renders on
  // top instead of being clipped.
  statsWrap: { marginTop: -64 },
  stats: {
    flexDirection: "row", backgroundColor: C.white, borderRadius: 22, paddingVertical: 20,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 6,
    borderWidth: 1, borderColor: C.gray100,
  },
  statItem: { flex: 1, alignItems: "center", gap: 6 },
  statIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statNum: { fontSize: 19, fontWeight: "900", color: C.gray900 },
  statLabel: { fontSize: 11.5, color: C.gray400, fontWeight: "600" },
  statSep: { width: 1, backgroundColor: C.gray200 },

  // Cards — soft shadow instead of a flat border
  card: {
    backgroundColor: C.white, borderRadius: 18, paddingHorizontal: 18, marginTop: 8,
    borderWidth: 1, borderColor: C.gray100,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },

  // Empty address
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8, backgroundColor: C.white, borderRadius: 16, borderWidth: 1.5, borderColor: C.gray200, ...Platform.select({ web: { borderStyle: "dashed" }, default: { borderStyle: "solid" } }) },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.gray500 },
  emptySub: { fontSize: 13, color: C.gray400, textAlign: "center", paddingHorizontal: 24, lineHeight: 19 },
});





