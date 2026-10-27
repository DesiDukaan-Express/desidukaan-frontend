import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Animated, Alert, Share, Platform,
  SafeAreaView, Modal, Pressable, ActivityIndicator,
  Switch, useWindowDimensions, Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import AddressMapView from "../../components/AddressMapView";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { uploadAPI } from "../../services/api";
import { useTheme } from "../../theme/ThemeContext";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const C = {
  orange: "#F59E0B",
  orangeDark: "#B45309",
  orangeLight: "#FFF3D6",

  green: "#22864B",
  greenDark: "#14532D",
  greenLight: "#E8F7EB",
  greenBorder: "#A9DDB5",
  greenMid: "#C9EFD1",

  blue: "#22864B",
  blueLight: "#E0F3E5",

  white: "#FFFFFF",
  bg: "#EAF4EB",

  gray100: "#F0F6F0",
  gray200: "#DCE9DE",
  gray300: "#C2D4C5",
  gray400: "#879B8B",
  gray500: "#627568",
  gray600: "#455B4A",
  gray700: "#304A36",
  gray900: "#173D25",

  red: "#DC4545",
  redLight: "#FFF1F0",
};

// ─── Avatar ───────────────────────────────────────────────────────────────
function Avatar({ name, imageUrl, size = 64 }) {
  const initials = (name || "?")
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={[C.orange, C.green]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: C.white, fontWeight: "900", fontSize: size * 0.36, letterSpacing: 1 }}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────
function EditModal({ visible, label, value, keyboardType = "default", onSave, onClose, saving }) {
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

// ─── Info row ─────────────────────────────────────────────────────────────
function InfoRow({ label, value, onEdit, editable = true, icon = "user", last = false }) {
  return (
    <View style={[ir.row, last && { borderBottomWidth: 0 }]}>
      <View style={[ir.iconWrap, !editable && ir.iconWrapOff]}>
        <Feather name={icon} size={15} color={editable ? C.green : C.gray400} />
      </View>
      <View style={ir.left}>
        <Text style={ir.label}>{label}</Text>
        <Text style={[ir.value, !value && ir.placeholder]}>
          {value || `Add ${String(label).toLowerCase()}`}
        </Text>
      </View>
      {editable ? (
        <TouchableOpacity style={ir.editBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="edit-2" size={13} color={C.green} />
        </TouchableOpacity>
      ) : (
        <View style={ir.lockWrap}>
          <Feather name="lock" size={13} color={C.gray300} />
        </View>
      )}
    </View>
  );
}
const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconWrapOff: { backgroundColor: C.gray100 },
  left: { flex: 1, minWidth: 0 },
  label: { fontSize: 12, color: C.gray500, fontWeight: "600", marginBottom: 4 },
  value: { fontSize: 14, color: C.gray900, fontWeight: "700", lineHeight: 21 },
  placeholder: { color: C.gray400, fontWeight: "500" },
  editBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  lockWrap: { width: 32, height: 32, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});

// ─── Address card styles (used in Addresses tab) ──────────────────────────
const adc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.white,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  cardActive: { borderColor: C.green, backgroundColor: C.greenLight },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconActive: { backgroundColor: C.green },
  text: { fontSize: 14, color: C.gray700, fontWeight: "500", lineHeight: 20 },
  textActive: { color: C.greenDark, fontWeight: "700" },
  activeLabel: { fontSize: 11, color: C.greenDark, fontWeight: "800", marginTop: 5 },
});

// ─── Menu item ────────────────────────────────────────────────────────────
const TINTS = {
  orange: { bg: C.orangeLight, fg: C.orangeDark },
  green: { bg: C.greenMid, fg: C.greenDark },
  blue: { bg: C.blueLight, fg: C.blue },
};
function MenuItem({ icon, label, onPress, danger, right, sub, tint }) {
  const t = tint ? TINTS[tint] : null;
  return (
    <TouchableOpacity style={[mi.row, danger && mi.rowDanger]} onPress={onPress} activeOpacity={0.75}>
      <View style={[mi.iconWrap, danger && mi.iconDanger, t && { backgroundColor: t.bg }]}>
        <Feather name={icon} size={16} color={danger ? C.red : t ? t.fg : C.gray600} />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: C.white,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  label: { fontSize: 14, color: C.gray900, fontWeight: "700" },
  sub: { fontSize: 12, color: C.gray500, marginTop: 4, lineHeight: 17 },
  rowDanger: { borderColor: "#FECACA", backgroundColor: C.redLight },
  iconDanger: { backgroundColor: C.redLight },
  labelDanger: { color: C.red },
});

// ─── Address detail modal ─────────────────────────────────────────────────
function AddressDetailModal({ addr, isSelected, onSelect, onRemove, onClose }) {
  const [region, setRegion] = useState({
    latitude: 28.6139,
    longitude: 77.209,
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

          <View style={adm.addrBox}>
            <View style={[adm.addrIcon, isSelected && adm.addrIconActive]}>
              <Feather name="map-pin" size={18} color={isSelected ? C.white : C.gray500} />
            </View>
            <Text style={adm.addrText}>{text}</Text>
          </View>

          {addr.lat && addr.lng && (
            <View style={adm.coordRow}>
              <Feather name="navigation" size={13} color={C.gray400} />
              <Text style={adm.coordText}>
                {parseFloat(addr.lat).toFixed(6)}, {parseFloat(addr.lng).toFixed(6)}
              </Text>
            </View>
          )}

          {isSelected && (
            <View style={adm.activeBadge}>
              <Feather name="check-circle" size={14} color={C.green} />
              <Text style={adm.activeBadgeText}>This is your active delivery address</Text>
            </View>
          )}

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
  addrText: { flex: 1, fontSize: 15, color: C.gray900, fontWeight: "500", lineHeight: 22 },
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
    <View style={sec.wrap}>
      <View style={sec.tick} />
      <Text style={sec.text}>{title}</Text>
    </View>
  );
}
const sec = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 13, marginTop: 26 },
  tick: { width: 4, height: 18, borderRadius: 3, backgroundColor: C.green },
  text: { fontSize: 12, fontWeight: "800", color: C.greenDark, letterSpacing: 0.7, textTransform: "uppercase" },
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
  card: { backgroundColor: C.white, borderRadius: 24, padding: 28, width: "82%", maxWidth: 400, alignItems: "center", gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  sub: { fontSize: 13, color: C.gray400, textAlign: "center", lineHeight: 20 },
  btns: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.gray100, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: C.gray700 },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.red, alignItems: "center" },
  confirmText: { fontSize: 15, fontWeight: "700", color: C.white },
});

// ─── Payment modal ────────────────────────────────────────────────────────
function PaymentModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm.backdrop} onPress={onClose}>
        <Pressable style={pm.sheet} onPress={() => { }}>
          <View style={pm.handle} />
          <Text style={pm.title}>Payment Methods</Text>
          <View style={pm.placeholder}>
            <Feather name="credit-card" size={36} color={C.gray300} />
            <Text style={pm.placeholderTitle}>Coming soon</Text>
            <Text style={pm.placeholderSub}>Razorpay integration for UPI & cards will be available soon.</Text>
          </View>
          <TouchableOpacity style={pm.closeBtn} onPress={onClose}>
            <Text style={pm.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const pm = StyleSheet.create({
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

// ─── Tab panel helpers ────────────────────────────────────────────────────
function PanelHeader({ icon, title, sub }) {
  return (
    <View style={s.panelHeader}>
      <View style={s.panelIcon}>
        <Feather name={icon} size={18} color={C.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.panelTitle}>{title}</Text>
        {sub ? <Text style={s.panelSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function LinkRow({ title, sub, icon, onPress }) {
  return (
    <TouchableOpacity style={s.linkRow} onPress={onPress} activeOpacity={0.75}>
      <View style={s.linkIcon}>
        <Feather name={icon} size={16} color={C.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.linkTitle}>{title}</Text>
        <Text style={s.linkSub}>{sub}</Text>
      </View>
      <Feather name="chevron-right" size={17} color={C.gray400} />
    </TouchableOpacity>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user, token, logout, updateUser, setActiveRole } = useAuthStore();
  const { clearCart } = useCartStore();
  const addressStore = useAddressStore();

  const { width: winW } = useWindowDimensions();
  const isDesktop = winW >= 1024;
  const isWide = winW > 600;
  const hPad = isDesktop ? 32 : isWide ? 24 : 16;

  const [activeTab, setActiveTab] = useState("orders"); // orders | addresses | payments | help
  const [showLanguage, setShowLanguage] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [editField, setEditField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [detailAddr, setDetailAddr] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const addresses = addressStore?.addresses || [];
  const { mode, setMode } = useTheme();
const [showThemes, setShowThemes] = useState(false);

  // Load notification preference
  useEffect(() => {
    AsyncStorage.getItem("notif_enabled")
      .then((v) => { if (v !== null) setNotifEnabled(v === "true"); })
      .catch(() => { });
  }, []);

  // Entrance animation
  const fadeO = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeO, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Profile photo upload ────────────────────────────────────────────────
  const handleProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access to choose a profile picture.");
        return;
      }
      if (!token) {
        Alert.alert("Not authenticated", "Please log in again and try again.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploadingPhoto(true);

      const mimeType = asset.mimeType || "image/jpeg";
      const uploadResult = await uploadAPI.upload(asset.uri, mimeType, token);
      if (!uploadResult?.url) throw new Error("Image upload did not return a URL.");

      const response = await fetch(`${BASE_URL}/auth/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profile_image_url: uploadResult.url }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.msg || data?.message || "Failed to update profile picture.");
      }

      if (data.user) updateUser(data.user);
      else updateUser({ profile_image_url: uploadResult.url });

      Alert.alert("Success", "Your profile picture has been updated.");
    } catch (error) {
      console.error("Profile photo upload error:", error);
      Alert.alert("Upload failed", error?.message || "Could not upload your profile picture. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Save field ──────────────────────────────────────────────────────────
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

  // ── Notifications ───────────────────────────────────────────────────────
  const handleNotifToggle = async (val) => {
    setNotifEnabled(val);
    try { await AsyncStorage.setItem("notif_enabled", String(val)); } catch { }
  };

  // ── Invite ──────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    try {
      await Share.share({
        message:
          "🛒 DesiDukaan — order groceries from nearby kirana stores!\n\nJoin with my invite and get ₹150 credit:\nhttps://desidukaan.app/invite",
      });
    } catch { }
  };

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearCart();
    addressStore.clearAddresses?.();
    logout();
    setShowLogout(false);
  };

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Home");
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  const roleLabel = (user?.role || "customer").charAt(0).toUpperCase() + (user?.role || "customer").slice(1);

  const tabs = [
    { key: "orders", label: "My Orders", icon: "shopping-bag" },
    { key: "addresses", label: "Addresses", icon: "map-pin" },
    { key: "payments", label: "Payment Methods", icon: "credit-card" },
    { key: "help", label: "Need Help", icon: "help-circle" },
  ];

  // ── Tab content ─────────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case "orders":
        return (
          <View>
            <PanelHeader icon="shopping-bag" title="My Orders" sub="Track and review your orders" />
            <View style={s.emptyBox}>
              <Feather name="package" size={28} color={C.gray300} />
              <Text style={s.emptyTitle}>View your order history</Text>
              <Text style={s.emptySub}>See current deliveries, past orders and reorder in one tap.</Text>
              <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate("Orders")} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Open My Orders</Text>
                <Feather name="arrow-right" size={15} color={C.white} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case "addresses":
        return (
          <View>
            <PanelHeader
              icon="map-pin"
              title={t("profile.deliveryAddresses")}
              sub={`${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`}
            />
            {addresses.length === 0 ? (
              <View style={s.emptyBox}>
                <Feather name="map-pin" size={24} color={C.gray300} />
                <Text style={s.emptyTitle}>{t("profile.noAddresses")}</Text>
                <Text style={s.emptySub}>{t("profile.noAddressesSub")}</Text>
              </View>
            ) : (
              addresses.map((addr) => {
                const active = addr.id === addressStore.selectedId;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[adc.card, active && adc.cardActive]}
                    onPress={() => setDetailAddr(addr)}
                    activeOpacity={0.8}
                  >
                    <View style={[adc.icon, active && adc.iconActive]}>
                      <Feather name="map-pin" size={13} color={active ? C.white : C.gray500} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[adc.text, active && adc.textActive]} numberOfLines={2}>
                        {typeof addr.address === "string" ? addr.address : addr.address_line || "Saved address"}
                      </Text>
                      {active && <Text style={adc.activeLabel}>Active delivery address</Text>}
                    </View>
                    <Feather name="chevron-right" size={15} color={active ? C.green : C.gray300} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );

      case "payments":
        return (
          <View>
            <PanelHeader icon="credit-card" title="Payment Methods" sub="UPI, cards and wallets" />
            <View style={s.emptyBox}>
              <Feather name="credit-card" size={28} color={C.gray300} />
              <Text style={s.emptyTitle}>Manage payment methods</Text>
              <Text style={s.emptySub}>Razorpay integration for UPI & cards will be available soon.</Text>
              <TouchableOpacity style={s.primaryBtn} onPress={() => setShowPayments(true)} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>View payment options</Text>
                <Feather name="arrow-right" size={15} color={C.white} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case "help":
      default:
        return (
          <View>
            <PanelHeader icon="help-circle" title="Need Help?" sub="Support, terms and privacy" />
            <LinkRow
              icon="message-circle"
              title="Customer Support"
              sub="We're here to help you"
              onPress={() => navigation.navigate("Support")}
            />
            <LinkRow
              icon="file-text"
              title="Terms & Conditions"
              sub="Read our terms of service"
              onPress={() => navigation.navigate("Terms")}
            />
            <LinkRow
              icon="shield"
              title="Privacy Policy"
              sub="Learn how we protect your data"
              onPress={() => navigation.navigate("Privacy")}
            />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Fixed header */}
      <View style={s.backHeader}>
        <TouchableOpacity style={s.backButton} onPress={goBack} activeOpacity={0.75}>
          <Feather name="arrow-left" size={19} color={C.gray900} />
          <Text style={s.backHeaderText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeO }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome banner + profile info ── */}
        <View style={[s.topHeroRow, { paddingHorizontal: hPad }]}>
          {/* Welcome banner */}
          <View style={s.greetingTopCard}>
            <View style={s.greetingWelcomeRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.greetingText}>Welcome back,</Text>
                <Text style={s.greetingName} numberOfLines={1}>
                  {user?.name?.split(" ")[0] || "there"}!
                </Text>
                <Text style={s.greetingSub}>Shop local. Support local.</Text>
              </View>
              <View style={s.greetingLeafCircle}>
                <Feather name="feather" size={30} color={C.green} />
              </View>
            </View>
            <View style={s.greetingDecorativeRow}>
              <View style={s.greetingAccentLine} />
              <Text style={s.greetingFooter}>Your neighbourhood, your marketplace.</Text>
            </View>
          </View>

          {/* Profile information */}
          <Animated.View style={[s.hero, { transform: [{ translateY: slideY }] }]}>
            <View style={s.heroDecorCircle1} pointerEvents="none" />
            <View style={s.heroDecorCircle2} pointerEvents="none" />

            <View style={[s.heroMain, { flexDirection: isWide ? "row" : "column", alignItems: isWide ? "center" : "flex-start" }]}>
              <TouchableOpacity
                style={s.avatarRing}
                onPress={handleProfilePhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.85}
                accessibilityLabel="Change profile picture"
              >
                <View style={s.avatarOuter}>
                  <Avatar name={user?.name} imageUrl={user?.profile_image_url} size={88} />
                  <View style={s.cameraDot}>
                    {uploadingPhoto
                      ? <ActivityIndicator size="small" color={C.white} />
                      : <Feather name="camera" size={16} color={C.white} />}
                  </View>
                </View>
              </TouchableOpacity>

              <View style={s.heroInfo}>
                <Text style={s.heroName} numberOfLines={2}>{user?.name || "Guest"}</Text>

                <View style={s.heroDetailRow}>
                  <Feather name="phone" size={16} color={C.greenDark} />
                  <Text style={s.heroDetailText}>{user?.phone || "Add phone number"}</Text>
                </View>

                <View style={s.heroDetailRow}>
                  <Feather name="mail" size={16} color={C.greenDark} />
                  <Text style={s.heroDetailText} numberOfLines={2}>{user?.email || "Add email address"}</Text>
                </View>

                <View style={s.roleBadge}>
                  <Text style={s.roleBadgeText}>{roleLabel}</Text>
                </View>

                {memberSince && (
                  <Text style={s.heroSince}>{t("profile.memberSince", { date: memberSince })}</Text>
                )}
              </View>

              <TouchableOpacity
                style={s.heroEditButton}
                onPress={() => setEditField({ field: "name", label: t("profile.name"), value: user?.name })}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={15} color={C.greenDark} />
                <Text style={s.heroEditText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        {/* ── Body: left = About, right = tabs ── */}
        <View style={[s.bodyLayout, { paddingHorizontal: hPad, flexDirection: isDesktop ? "row" : "column" }]}>
          {/* Left column — personal details */}
          <View style={[s.leftColumn, isDesktop && { flex: 1, maxWidth: 420 }]}>
            <View style={s.card}>
              <Text style={s.cardHeading}>{t("profile.personalInfo")}</Text>
              <InfoRow
                icon="user"
                label={t("profile.name")}
                value={user?.name}
                onEdit={() => setEditField({ field: "name", label: t("profile.name"), value: user?.name })}
              />
              <InfoRow
                icon="mail"
                label={t("profile.email")}
                value={user?.email}
                onEdit={() =>
                  setEditField({
                    field: "email",
                    label: t("profile.email"),
                    value: user?.email,
                    keyboardType: "email-address",
                  })
                }
              />
              <InfoRow
                icon="phone"
                label={t("profile.phone")}
                value={user?.phone || "—"}
                editable={false}
                last
              />
            </View>
          </View>

          {/* Right column — tabs + panel */}
          <View style={[s.rightColumn, isDesktop && { flex: 2 }]}>
            <View style={s.profileTabs}>
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[s.profileTab, active && s.profileTabActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.75}
                  >
                    <Feather name={tab.icon} size={17} color={active ? C.green : C.gray600} />
                    <Text style={[s.profileTabText, active && s.profileTabTextActive]} numberOfLines={1}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.panel}>{renderTabContent()}</View>
          </View>
        </View>

        {/* ── App + Account sections (bottom) ── */}
        <View style={[s.bottomWrap, { paddingHorizontal: hPad }]}>
          <SectionLabel title={t("profile.app")} />
          <MenuItem
            icon="gift"
            label={t("profile.inviteFriends")}
            sub={t("profile.inviteFriendsSub")}
            tint="orange"
            onPress={handleInvite}
          />
          <MenuItem
            icon="globe"
            label="Language"
            sub="Change app language"
            tint="green"
            onPress={() => setShowLanguage(true)}
          />
          <MenuItem
            icon="bell"
            label={t("profile.pushNotifications")}
            sub={notifEnabled ? t("profile.enabled") : t("profile.disabled")}
            tint="blue"
            onPress={() => handleNotifToggle(!notifEnabled)}
            right={
              <Switch
                value={notifEnabled === true}
                onValueChange={handleNotifToggle}
                trackColor={{ false: C.gray200, true: C.greenMid }}
                thumbColor={notifEnabled ? C.green : C.gray400}
                ios_backgroundColor={C.gray200}
              />
            }
          />

<MenuItem
  icon="moon"
  label="Themes"
  sub={`Current theme: ${mode === "default" ? "System" : mode === "dark" ? "Dark" : "Light"}`}
  tint="orange"
  onPress={() => setShowThemes(true)}
/>

          <SectionLabel title={t("profile.accountSection")} />
          <MenuItem
            icon="shuffle"
            label="Switch Profile"
            sub="Switch between Customer, Vendor & Delivery"
            tint="blue"
            onPress={async () => { await setActiveRole(null); }}
          />
          <MenuItem
            icon="log-out"
            label={t("profile.logout")}
            onPress={() => setShowLogout(true)}
            danger
            right={null}
          />
        </View>
      </Animated.ScrollView>

      {/* ── Modals ── */}
      <AddressDetailModal
        addr={detailAddr}
        isSelected={detailAddr?.id === addressStore.selectedId}
        onSelect={(a) => { addressStore.setSelectedId(a.id); setDetailAddr(null); }}
        onRemove={(a) => { addressStore.removeAddress(a.id, token); setDetailAddr(null); }}
        onClose={() => setDetailAddr(null)}
      />
      <EditModal
        visible={!!editField}
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

      {/* Language picker */}
      <Modal visible={showLanguage} transparent animationType="slide" onRequestClose={() => setShowLanguage(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
          onPress={() => setShowLanguage(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: "80%",
            }}
            onPress={() => { }}
          >
            <View style={{ width: 44, height: 5, backgroundColor: C.gray200, borderRadius: 3, alignSelf: "center", marginBottom: 16 }} />
            <LanguageSwitcher inline onClose={() => setShowLanguage(false)} />
          </Pressable>
        </Pressable>
      </Modal>
            {/* Theme picker */}
      <Modal
        visible={showThemes}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemes(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowThemes(false)}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                width: 44,
                height: 5,
                backgroundColor: C.gray200,
                borderRadius: 3,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            <Text style={{ fontSize: 21, fontWeight: "900", color: C.gray900, marginBottom: 6 }}>
              Choose Theme
            </Text>
            <Text style={{ fontSize: 13, color: C.gray500, marginBottom: 16 }}>
              Select how DesiDukaan looks.
            </Text>

            {[
              { label: "Light Mode", value: "light", icon: "sun" },
              { label: "Dark Mode", value: "dark", icon: "moon" },
              { label: "System Default", value: "default", icon: "smartphone" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={async () => {
                  try {
                    await setMode(option.value);
                    setShowThemes(false);
                  } catch (error) {
                    console.error("Failed to change theme:", error);
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                  paddingHorizontal: 14,
                  marginBottom: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: mode === option.value ? C.green : C.gray200,
                  backgroundColor: mode === option.value ? C.greenLight : C.white,
                }}
              >
                <Feather name={option.icon} size={20} color={C.green} />

                <Text style={{ flex: 1, marginLeft: 14, fontSize: 15, fontWeight: "700", color: C.gray900 }}>
                  {option.label}
                </Text>

                {mode === option.value && (
                  <Feather name="check-circle" size={20} color={C.green} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={() => setShowThemes(false)}
              style={{
                paddingVertical: 13,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.gray500 }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  backHeader: {
    width: "100%",
    minHeight: 52,
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    justifyContent: "center",
    zIndex: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  backHeaderText: { fontSize: 14, fontWeight: "700", color: C.gray900 },

  // Top section
  topHeroRow: {
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  greetingTopCard: {
    width: "100%",
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: "#DDF4DF",
    borderWidth: 1,
    borderColor: "#B7E4BE",
    overflow: "hidden",
    borderRadius: 22,
  },
  greetingWelcomeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  greetingText: { fontSize: 14, color: "#52745B", fontWeight: "600" },
  greetingName: { fontSize: 25, lineHeight: 34, color: C.greenDark, fontWeight: "800", marginTop: 3 },
  greetingSub: { fontSize: 14, lineHeight: 20, color: "#326D43", marginTop: 5 },
  greetingLeafCircle: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: "#B8E8C2",
    borderWidth: 1, borderColor: "#9AD9A8", alignItems: "center", justifyContent: "center",
  },
  greetingDecorativeRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14 },
  greetingAccentLine: { width: 30, height: 4, borderRadius: 3, backgroundColor: C.green },
  greetingFooter: { flex: 1, fontSize: 12, lineHeight: 17, color: "#326D43", fontWeight: "600" },

  // Profile banner
  hero: {
    position: "relative",
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#A2D9AE",
    backgroundColor: "#C8EED0",
  },
  heroDecorCircle1: {
    position: "absolute", top: -55, right: -25, width: 180, height: 180,
    borderRadius: 90, backgroundColor: "rgba(34,134,75,0.13)",
  },
  heroDecorCircle2: {
    position: "absolute", bottom: -65, right: 100, width: 150, height: 150,
    borderRadius: 75, backgroundColor: "rgba(34,134,75,0.10)",
  },
  heroMain: { gap: 16, width: "100%" },
  avatarRing: { padding: 5, borderRadius: 100, backgroundColor: C.white, borderWidth: 1, borderColor: "#E0F2E5" },
  avatarOuter: { position: "relative" },
  cameraDot: {
    position: "absolute", bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.greenDark, borderWidth: 3, borderColor: C.white,
    alignItems: "center", justifyContent: "center",
  },
  heroInfo: { flex: 1, minWidth: 0, gap: 8, justifyContent: "center" },
  heroName: { fontSize: 22, fontWeight: "900", color: "#104C29", flexShrink: 1 },
  heroDetailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroDetailText: { flex: 1, minWidth: 0, fontSize: 14, color: C.gray900 },
  roleBadge: { alignSelf: "flex-start", backgroundColor: "#C7EBD1", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 3 },
  roleBadgeText: { fontSize: 12, color: "#086B3C", fontWeight: "800" },
  heroSince: { fontSize: 12, color: C.gray600, marginTop: 2 },
  heroEditButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#E5F8E9", borderWidth: 1, borderColor: "#91CFA0",
    borderRadius: 24, paddingVertical: 10, paddingHorizontal: 14, gap: 6, flexShrink: 0,
  },
  heroEditText: { fontSize: 13, fontWeight: "700", color: C.greenDark },

  // Body
  bodyLayout: {
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
    gap: 16,
    paddingTop: 8,
  },
  leftColumn: { minWidth: 0 },
  rightColumn: { minWidth: 0, gap: 12 },

  card: {
    backgroundColor: "#F7FCF7",
    borderColor: "#C5E3CB",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardHeading: {
    fontSize: 12, fontWeight: "800", color: C.greenDark, letterSpacing: 0.7,
    textTransform: "uppercase", paddingVertical: 8, paddingHorizontal: 4,
  },

  // Tabs
  profileTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    padding: 6,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  profileTab: {
    flexGrow: 1,
    flexBasis: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    minHeight: 44,
  },
  profileTabActive: { backgroundColor: C.greenLight, borderBottomWidth: 2, borderBottomColor: C.green },
  profileTabText: { fontSize: 13, fontWeight: "600", color: C.gray600, flexShrink: 1 },
  profileTabTextActive: { color: C.greenDark, fontWeight: "800" },

  // Tab panel
  panel: {
    backgroundColor: "#F7FCF7",
    borderColor: "#C5E3CB",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    minHeight: 220,
  },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  panelIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center" },
  panelTitle: { fontSize: 17, fontWeight: "800", color: C.gray900 },
  panelSub: { fontSize: 12, color: C.gray500, marginTop: 3 },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.gray200,
    ...Platform.select({ web: { borderStyle: "dashed" }, default: { borderStyle: "solid" } }),
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: C.gray700, textAlign: "center" },
  emptySub: { fontSize: 13, color: C.gray500, textAlign: "center", paddingHorizontal: 16, lineHeight: 20 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8,
    backgroundColor: C.green, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: C.white },

  // Help links
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, marginBottom: 10, backgroundColor: C.white,
    borderRadius: 14, borderWidth: 1, borderColor: C.gray200,
  },
  linkIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center" },
  linkTitle: { fontSize: 14, fontWeight: "700", color: C.gray900, marginBottom: 3 },
  linkSub: { fontSize: 12, lineHeight: 18, color: C.gray500 },

  // Bottom sections
  bottomWrap: { width: "100%", maxWidth: 1440, alignSelf: "center", paddingBottom: 8 },
});
