import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, Alert, Share, Platform,
  SafeAreaView, Modal, Pressable, ActivityIndicator,
Switch, Linking, useWindowDimensions, Image,
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
  purple: "#39865A",
  purpleLight: "#E5F5E9",

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


// ─── Avatar with profile image ────────────────────────────────────────────
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
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
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
        borderRadius: size * 0.3,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: C.white,
          fontWeight: "900",
          fontSize: size * 0.36,
          letterSpacing: 1,
        }}
      >
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
row: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  paddingVertical: 16,
  paddingHorizontal: 4,
  borderBottomWidth: 1,
  borderBottomColor: C.gray100,
},
  fieldIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fieldIconWrapOff: {
    backgroundColor: C.gray100,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },

label: {
  fontSize: 12,
  color: C.gray500,
  fontWeight: "600",
  marginBottom: 4,
},

value: {
  fontSize: 14,
  color: C.gray900,
  fontWeight: "700",
  lineHeight: 21,
},

  valuePlaceholder: {
    color: C.gray400,
    fontWeight: "500",
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lockWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
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
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  padding: 16,
  borderRadius: 16,
  backgroundColor: C.white,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: C.gray200,
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 1,
},

  cardActive: {
    borderColor: C.green,
    backgroundColor: C.greenLight,
    shadowOpacity: 0.07,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconActive: {
    backgroundColor: C.green,
  },
  text: {
    flex: 1,
    fontSize: 14,
    color: C.gray700,
    fontWeight: "500",
    lineHeight: 20,
  },
  textActive: {
    color: C.greenDark,
    fontWeight: "700",
  },
  activeLabel: {
    fontSize: 11,
    color: C.greenDark,
    fontWeight: "800",
    marginTop: 5,
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
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
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.035,
  shadowRadius: 8,
  elevation: 1,
},

iconWrap: {
  width: 42,
  height: 42,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
},

label: {
  fontSize: 14,
  color: C.gray900,
  fontWeight: "700",
},

sub: {
  fontSize: 12,
  color: C.gray500,
  marginTop: 4,
  lineHeight: 17,
},


rowDanger: {
  borderColor: "#FECACA",
  backgroundColor: C.redLight,
},
iconDanger: {
  backgroundColor: C.redLight,
},
labelDanger: {
  color: C.red,
},


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
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
    marginTop: 26,
  },
  tick: {
    width: 4,
    height: 18,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
    color: C.greenDark,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
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
  const scrollViewRef = useRef(null);
const [addressSectionY, setAddressSectionY] = useState(0);
  

const scrollToAddresses = () => {
  scrollViewRef.current?.scrollTo({
    y: Math.max(0, addressSectionY - 20),
    animated: true,
  });
};

const { width: winW } = useWindowDimensions();

const isDesktop = winW >= 1024;
const isWide = winW > 600;

const [showLanguage, setShowLanguage] = useState(false);

// Responsive spacing for mobile, tablet, and laptop
const hPad = isDesktop ? 32 : isWide ? 24 : 20;

  const [showLogout, setShowLogout] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [editField, setEditField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [detailAddr, setDetailAddr] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  // ── Select profile photo ────────────────────────────────────────────────
const handleProfilePhoto = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to choose a profile picture."
      );
      return;
    }

    if (!token) {
      Alert.alert(
        "Not authenticated",
        "Please log in again and try again."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];

    setUploadingPhoto(true);

    // 1. Upload image to backend
    const mimeType = asset.mimeType || "image/jpeg";

    const uploadResult = await uploadAPI.upload(
      asset.uri,
      mimeType,
      token
    );

    if (!uploadResult?.url) {
      throw new Error("Image upload did not return a URL.");
    }

    console.log("Uploaded profile image URL:", uploadResult.url);

    // 2. Save image URL to user's profile
    const response = await fetch(`${BASE_URL}/auth/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        profile_image_url: uploadResult.url,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.msg ||
        data?.message ||
        "Failed to update profile picture."
      );
    }

    // 3. Update Zustand user immediately
    if (data.user) {
      updateUser(data.user);
    } else {
      updateUser({
        profile_image_url: uploadResult.url,
      });
    }

    Alert.alert(
      "Success",
      "Your profile picture has been updated."
    );
  } catch (error) {
    console.error("Profile photo upload error:", error);

    Alert.alert(
      "Upload failed",
      error?.message ||
        "Could not upload your profile picture. Please try again."
    );
  } finally {
    setUploadingPhoto(false);
  }
};

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
        ref={scrollViewRef}
        style={{ opacity: fadeO }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >


        {/* ── Profile banner ─────────────────────────────────────── */}
        
      
{/* Responsive top section: greeting + profile banner */}
<View
  style={[
    s.topHeroRow,
    {
      paddingHorizontal: hPad,
      flexDirection: "column",
    },
  ]}
>
  {/* Greeting card */}
  <View style={s.greetingTopCard}>
    <View style={s.greetingWelcomeRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.greetingText}>Welcome back,</Text>
        <Text style={s.greetingName} numberOfLines={1}>
          {user?.name?.split(" ")[0] || "there"}!
        </Text>
        <Text style={s.greetingSub}>
          Shop local. Support local.
        </Text>
      </View>

      <View style={s.greetingLeafCircle}>
        <Feather name="feather" size={30} color={C.green} />
      </View>
    </View>

    <View style={s.greetingDecorativeRow}>
      <View style={s.greetingAccentLine} />
      <Text style={s.greetingFooter}>
        Your neighbourhood, your marketplace.
      </Text>
    </View>
  </View>

  {/* Profile banner */}
  <Animated.View
    style={[
      s.hero,
      {
        flex: isDesktop ? 1 : undefined,
        width: isDesktop ? undefined : "100%",
        transform: [{ translateY: slideY }],
      },
    ]}
  >
    {/* Decorative background circles */}
    <View style={s.heroDecorCircle1} pointerEvents="none" />
    <View style={s.heroDecorCircle2} pointerEvents="none" />

    {/* Profile information */}
    <View
      style={[
        s.heroMain,
        {
          flexDirection: isDesktop ? "row" : "column",
          alignItems: isDesktop ? "center" : "flex-start",
        },
      ]}
    >
      {/* Profile photo */}
      <TouchableOpacity
        style={s.avatarRing}
        onPress={handleProfilePhoto}
        disabled={uploadingPhoto}
        activeOpacity={0.85}
        accessibilityLabel="Change profile picture"
      >
        <View style={s.avatarOuter}>
          <Avatar
            name={user?.name}
            imageUrl={user?.profile_image_url}
            size={88}
          />

          <View style={s.verifiedDot}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Feather name="camera" size={17} color={C.white} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Profile details */}
      <View style={s.heroInfo}>
        <Text style={s.heroName} numberOfLines={2}>
          {user?.name || "Guest"}
        </Text>

        <View style={s.heroDetailRow}>
          <Feather name="phone" size={16} color={C.greenDark} />
          <Text style={s.heroDetailText}>
            {user?.phone || "Add phone number"}
          </Text>
        </View>

        <View style={s.heroDetailRow}>
          <Feather name="mail" size={16} color={C.greenDark} />
          <Text style={s.heroDetailText} numberOfLines={2}>
            {user?.email || "Add email address"}
          </Text>
        </View>

        <View style={s.roleBadge}>
          <Text style={s.roleBadgeText}>
            {(user?.role || "customer").charAt(0).toUpperCase() +
              (user?.role || "customer").slice(1)}
          </Text>
        </View>

        {memberSince && (
          <Text style={s.heroSince}>
            {t("profile.memberSince", { date: memberSince })}
          </Text>
        )}
      </View>

      {/* Edit profile button */}
      <TouchableOpacity
        style={s.heroEditButton}
        onPress={() =>
          setEditField({
            field: "name",
            label: t("profile.name"),
            value: user?.name,
          })
        }
        activeOpacity={0.8}
      >
        <Feather name="edit-2" size={15} color={C.greenDark} />
        <Text style={s.heroEditText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
</View>
{/* End responsive top section */}


        {/* ── Profile shortcut cards ─────────────────────────── */}
        <View
          style={[
            s.shortcutGrid,
            { paddingHorizontal: hPad },
          ]}
        >
          <TouchableOpacity
            style={[s.shortcutCard, s.shortcutGreen]}
            onPress={() => navigation.navigate("Orders")}
            activeOpacity={0.8}
          >
            <View style={s.shortcutTop}>
              <View style={[s.shortcutIcon, { backgroundColor: "#DCFCE7" }]}>
                <Feather name="shopping-bag" size={22} color="#15803D" />
              </View>
              <Feather name="chevron-right" size={20} color="#64748B" />
            </View>
            <Text style={s.shortcutTitle}>My Orders</Text>
            <Text style={s.shortcutSub}>Track your orders</Text>
          </TouchableOpacity>


<TouchableOpacity
  style={[s.shortcutCard, s.shortcutGreen]}
onPress={scrollToAddresses}
  activeOpacity={0.8}
>
  <View style={s.shortcutTop}>
    <View
      style={[
        s.shortcutIcon,
        { backgroundColor: "#D1FAE5" },
      ]}
    >
      <Feather
        name="map-pin"
        size={22}
        color="#047857"
      />
    </View>

    <Feather
      name="chevron-right"
      size={20}
      color="#64748B"
    />
  </View>

  <Text style={s.shortcutTitle}>Addresses</Text>
  <Text style={s.shortcutSub}>Manage addresses</Text>
</TouchableOpacity>



          <TouchableOpacity
            style={[s.shortcutCard, s.shortcutBlue]}
            onPress={() => setShowPayments(true)}
            activeOpacity={0.8}
          >
            <View style={s.shortcutTop}>
              <View style={[s.shortcutIcon, { backgroundColor: "#DBEAFE" }]}>
                <Feather name="credit-card" size={22} color="#2563EB" />
              </View>
              <Feather name="chevron-right" size={20} color="#2563EB" />
            </View>
            <Text style={s.shortcutTitle}>Payment Methods</Text>
            <Text style={s.shortcutSub}>Manage payments</Text>
          </TouchableOpacity>
        </View>
        {/* ── Body ────────────────────────────────────────────────────── */}
        {/* ── Responsive profile body ── */}
<View
  style={[
    s.bodyLayout,
    {
      paddingHorizontal: hPad,
      flexDirection: isDesktop ? "row" : "column",
    },
  ]}
>
  {/* Main content column */}
  <View style={s.mainColumn}>

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
{/* Delivery addresses */}
<View
  onLayout={(event) => {
    const node = event.target;

    if (Platform.OS === "web" && node?.getBoundingClientRect) {
      const sectionTop = node.getBoundingClientRect().top;
      const scrollTop =
        scrollViewRef.current?.getScrollableNode?.()?.getBoundingClientRect?.().top;

      if (typeof scrollTop === "number") {
        setAddressSectionY(
          sectionTop - scrollTop +
          (scrollViewRef.current?.getScrollableNode?.()?.scrollTop || 0)
        );
      }
    } else {
      setAddressSectionY(event.nativeEvent.layout.y);
    }
  }}
>
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
          </View>
 {/* App */}
         <SectionLabel title={t('profile.app')} />
          <MenuItem
            icon="gift"
            label={t('profile.inviteFriends')}
            sub={t('profile.inviteFriendsSub')}
            onPress={handleInvite}
          />

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


          {/* Right-side column — visible alongside content on desktop */}

          <View style={s.sideColumn}>

{/* Account overview */}

            {/* Saved address overview */}
            <View style={s.sideCard}>
              <View style={s.sideTitleRow}>
                <Feather name="map-pin" size={17} color={C.green} />
                <Text style={s.sideTitle}>Delivery Addresses</Text>
              </View>

              <View style={s.addressSummary}>
                <Text style={s.addressSummaryNumber}>
                  {addressStore?.addresses?.length ?? 0}
                </Text>
                <Text style={s.addressSummaryText}>
                  saved {(addressStore?.addresses?.length ?? 0) === 1
                    ? "address"
                    : "addresses"}
                </Text>
              </View>

              <Text style={s.sideLinkSub}>
                {addressStore?.addresses?.length
                  ? "Your saved delivery locations are ready to use."
                  : "Add a delivery address to make checkout easier."}
              </Text>
            </View>

            {/* Help and policies */}
            <View style={s.sideCard}>
              <View style={s.sideTitleRow}>
                <Feather name="help-circle" size={17} color={C.green} />
                <Text style={s.sideTitle}>Need Help?</Text>
              </View>

              <TouchableOpacity
                style={s.sideLink}
                onPress={() => navigation.navigate("Support")}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.sideLinkTitle}>Customer Support</Text>
                  <Text style={s.sideLinkSub}>We're here to help you</Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.gray400} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sideLink}
                onPress={() => navigation.navigate("Terms")}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.sideLinkTitle}>Terms & Conditions</Text>
                  <Text style={s.sideLinkSub}>Read our terms of service</Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.gray400} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.sideLink}
                onPress={() => navigation.navigate("Privacy")}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.sideLinkTitle}>Privacy Policy</Text>
                  <Text style={s.sideLinkSub}>Learn how we protect your data</Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.gray400} />
              </TouchableOpacity>
            </View>

            {/* Local shopping promotional card */}
            <LinearGradient
              colors={[C.greenDark, C.green]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.localPromo}
            >
              <View style={s.promoIcon}>
                <Feather name="heart" size={22} color={C.white} />
              </View>

              <Text style={s.localPromoTitle}>
                Support Local Stores
              </Text>

              <Text style={s.localPromoText}>
                Every order helps nearby shops grow and brings your community closer.
              </Text>

              <TouchableOpacity
                style={s.promoFooter}
                onPress={() => navigation.navigate("Orders")}
                activeOpacity={0.8}
              >
                <Text style={s.promoFooterText}>Explore your orders</Text>
                <Feather name="arrow-up-right" size={15} color={C.white} />
              </TouchableOpacity>
            </LinearGradient>

          </View>
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
  root: {
  flex: 1,
  backgroundColor: "#EAF4EB",
},

  // Hero — rounded bottom edge + decorative circles for depth


  // Profile banner

hero: {
  position: "relative",
  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: 22,
  borderRadius: 22,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: "#A2D9AE",
  backgroundColor: "#C8EED0",
  marginTop: 16,
},



heroDecorCircle1: {
  position: "absolute",
  top: -55,
  right: -25,
  width: 180,
  height: 180,
  borderRadius: 90,
  backgroundColor: "rgba(34,134,75,0.13)",
},

heroDecorCircle2: {
  position: "absolute",
  bottom: -65,
  right: 100,
  width: 150,
  height: 150,
  borderRadius: 75,
  backgroundColor: "rgba(34,134,75,0.10)",
},


heroMain: {
flexDirection: "row",
alignItems: "center",
gap: 16,
width: "100%",
},


  avatarRing: {
    padding: 5,
    borderRadius: 100,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#E0F2E5",
  },

  avatarOuter: {
    position: "relative",
  },

  verifiedDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.greenDark,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

heroInfo: {
flex: 1,
minWidth: 0,
gap: 8,
justifyContent: "center",
},


heroName: {
  fontSize: 22,
  fontWeight: "900",
  color: "#104C29",
  flexShrink: 1,
},



  heroDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

heroDetailText: {
flex: 1,
minWidth: 0,
fontSize: 14,
color: C.gray900,
},



  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#C7EBD1",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 3,
  },

  roleBadgeText: {
    fontSize: 12,
    color: "#086B3C",
    fontWeight: "800",
  },

  heroSince: {
    fontSize: 12,
    color: C.gray600,
    marginTop: 2,
  },

heroEditButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#E5F8E9",
  borderWidth: 1,
  borderColor: "#91CFA0",
  borderRadius: 24,
  paddingVertical: 10,
  paddingHorizontal: 12,
  gap: 5,
  flexShrink: 0,
},


heroEditText: {
fontSize: 13,
fontWeight: "700",
color: C.greenDark,
flexShrink: 0,
},

  // Stats wrapper — a plain sibling AFTER the hero (not inside its
  // overflow:hidden box), pulled up with a negative marginTop so it overlaps
  // the green area. Because it paints after the hero, the overlap renders on
  // top instead of being clipped.
  statsWrap: { marginTop: -64 },

stats: {
  flexDirection: "row",
  backgroundColor: C.white,
  borderRadius: 22,
  paddingVertical: 22,
  paddingHorizontal: 8,
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.10,
  shadowRadius: 18,
  elevation: 5,
  borderWidth: 1,
  borderColor: C.gray100,
},
  statItem: { flex: 1, alignItems: "center", gap: 6 },
  statIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statNum: { fontSize: 19, fontWeight: "900", color: C.gray900 },
  
statLabel: {
  fontSize: 11,
  color: C.gray500,
  fontWeight: "600",
  textAlign: "center",
},
  statSep: { width: 1, backgroundColor: C.gray200 },

  // Cards — soft shadow instead of a flat border
  
screen: {
  flex: 1,
  backgroundColor: "#EAF4EB",
},

card: {
  backgroundColor: "#F7FCF7",
  borderColor: "#C5E3CB",
  borderWidth: 1,
  borderRadius: 20,
  paddingHorizontal: 16,
  paddingVertical: 8,
  shadowColor: "#14532D",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
},

  // Empty address
  
emptyBox: {
  alignItems: "center",
  paddingVertical: 36,
  paddingHorizontal: 20,
  gap: 10,
  backgroundColor: C.white,
  borderRadius: 20,
  borderWidth: 1.5,
  borderColor: C.gray200,
  ...Platform.select({
    web: { borderStyle: "dashed" },
    default: { borderStyle: "solid" },
  }),
},
emptyTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: C.gray700,
  textAlign: "center",
},
emptySub: {
  fontSize: 13,
  color: C.gray500,
  textAlign: "center",
  paddingHorizontal: 16,
  lineHeight: 20,
},

  
  // Responsive two-column profile layout

bodyLayout: {
  width: "100%",
  maxWidth: 1440,
  alignSelf: "center",
  gap: 22,
  paddingTop: 8,
  paddingBottom: 24,
},

mainColumn: {
  flex: 1.6,
  minWidth: 0,
},

sideColumn: {
  flex: 1,
  minWidth: 0,
  gap: 14,
},


shortcutGrid: {
  width: "100%",
  maxWidth: 1440,
  alignSelf: "center",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 12,
  paddingTop: 18,
  paddingBottom: 10,
},


shortcutCard: {
  flexGrow: 1,
  flexBasis: 180,
  minWidth: 145,
  padding: 16,
  borderRadius: 18,
  borderWidth: 1,
  marginBottom: 0,
  shadowColor: "#14532D",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.08,
  shadowRadius: 7,
  elevation: 2,
},

shortcutGreen: {
  backgroundColor: "#DDF4E1",
  borderColor: "#A9DDB5",
},

shortcutRed: {
  backgroundColor: "#E7F6E9",
  borderColor: "#B6E0BE",
},

shortcutBlue: {
  backgroundColor: "#D9F0DE",
  borderColor: "#A4D9B0",
},

shortcutTop: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
},

shortcutIcon: {
  width: 46,
  height: 46,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
},

shortcutTitle: {
  fontSize: 15,
  fontWeight: "800",
  color: "#173D25",
  marginBottom: 5,
},

shortcutSub: {
  fontSize: 12,
  lineHeight: 18,
  color: "#4E7057",
},

shortcutIconWrap: {
  backgroundColor: "#BFE8C7",
  borderRadius: 13,
},

  // Right-side information cards
sideCard: {
  backgroundColor: "#E5F4E7",
  borderRadius: 18,
  padding: 20,
  borderWidth: 1,
  borderColor: "#B9DDBF",
  shadowColor: "#173D25",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
},
  sideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sideTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.gray900,
  },
  quickStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: C.gray100,
  },
  quickStatIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gray900,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: C.gray500,
    lineHeight: 17,
  },
  addressSummary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  addressSummaryNumber: {
    fontSize: 30,
    fontWeight: "900",
    color: C.greenDark,
  },
  addressSummaryText: {
    fontSize: 14,
    color: C.gray600,
    fontWeight: "600",
  },
  sideLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.gray100,
  },
  sideLinkTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gray900,
    marginBottom: 4,
  },
  sideLinkSub: {
    fontSize: 12,
    lineHeight: 18,
    color: C.gray500,
  },

  // Local shopping promotional card
  localPromo: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  localPromoTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: C.white,
    marginBottom: 8,
  },
  localPromoText: {
    fontSize: 13,
    lineHeight: 21,
    color: "rgba(255,255,255,0.85)",
  },
  promoFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  promoFooterText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.white,
  },

accountSummaryRow: {
  flexDirection: "row",
  alignItems: "stretch",
  justifyContent: "space-between",
  backgroundColor: "#F7FCF8",
  borderRadius: 14,
  paddingVertical: 14,
},
accountSummaryItem: {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 4,
  gap: 6,
},
accountSummaryIcon: {
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#E4F5E8",
  marginBottom: 4,
},
accountSummaryValue: {
  fontSize: 13,
  fontWeight: "700",
  color: C.gray900,
  textAlign: "center",
},
accountSummaryLabel: {
  fontSize: 11,
  color: C.gray500,
  textAlign: "center",
},
accountSummaryDivider: {
  width: 1,
  backgroundColor: C.gray200,
  marginVertical: 6,
},


topHeroRow: {
  width: "100%",
  maxWidth: 1440,
  alignSelf: "center",
  gap: 12,
  alignItems: "stretch",
  marginTop: 12,
  marginBottom: 8,
},

greetingTopCard: {
  width: "100%",
  minWidth: 0,
  paddingHorizontal: 22,
  paddingVertical: 18,
  borderRadius: 20,
  backgroundColor: "#DDF4DF",
  borderWidth: 1,
  borderColor: "#B7E4BE",
  overflow: "hidden",
  borderRadius: 22,
},

greetingWelcomeRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
},

greetingText: {
  fontSize: 14,
  color: "#52745B",
  fontWeight: "600",
},

greetingName: {
  fontSize: 25,
  lineHeight: 34,
  color: "#14532D",
  fontWeight: "800",
  marginTop: 3,
},

greetingSub: {
  fontSize: 14,
  lineHeight: 20,
  color: "#326D43",
  marginTop: 5,
},

greetingLeafCircle: {
  width: 60,
  height: 60,
  borderRadius: 20,
  backgroundColor: "#B8E8C2",
  borderWidth: 1,
  borderColor: "#9AD9A8",
  alignItems: "center",
  justifyContent: "center",
},

greetingDecorativeRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 9,
  marginTop: 14,
},

greetingAccentLine: {
  width: 30,
  height: 4,
  borderRadius: 3,
  backgroundColor: "#22864B",
},

greetingFooter: {
  flex: 1,
  fontSize: 12,
  lineHeight: 17,
  color: "#326D43",
  fontWeight: "600",
},

profileBanner: {
  backgroundColor: "#C9EFD0",
  borderColor: "#9FD9AB",
  borderWidth: 1,
  borderRadius: 22,
},

});





