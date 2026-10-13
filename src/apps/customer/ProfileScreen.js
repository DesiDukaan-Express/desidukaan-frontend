import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated, Alert, Share, Platform,
  SafeAreaView, Modal, Pressable, ActivityIndicator,
  Switch, useWindowDimensions, RefreshControl,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import AddressMapView from "../../components/AddressMapView";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { useTheme } from "../../theme/ThemeContext";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Profile-only dark palette ────────────────────────────────────────────
// Calm navy surfaces, one soft-blue accent, muted slate text. Only applied on
// this screen in dark mode; the light theme and other screens are unchanged.
// Keys keep the same names as ThemeContext so every existing style still works.
const PROFILE_DARK = {
  bg: "#0B0F17", surface: "#111722",
  gray100: "#1A2230", gray200: "#273143", gray300: "#3A4559",
  gray400: "#6B778A", gray500: "#8E9AAE", gray600: "#A9B4C6",
  gray700: "#C7D0DE", gray900: "#F1F5F9",
  // accent family (was green) -> soft blue
  green: "#6BA6F5", greenDark: "#7DB2F7",
  greenLight: "#131B2B", greenMid: "#16213A", greenBorder: "#263653",
  primary: "#2F6FE0",            // filled buttons (white text)
  blue: "#6BA6F5", blueLight: "#16213A",
  purple: "#A592F0", purpleLight: "#1D1B31",
  orange: "#F0A04B", orangeLight: "#2A2119",
  red: "#EF6B6B", redLight: "#2A1B1F",
  gold: "#F2A93B",
  // emerald tile (addresses)
  tileGreenBg: "#14241D", tileGreenFg: "#5BC58A",
  line: "#1C2434",               // hairlines / card borders
};

function useProfileColors() {
  const { colors: C, isDark } = useTheme();
  return useMemo(
    () => (isDark
      ? { ...C, ...PROFILE_DARK }
      : { ...C, primary: C.green, tileGreenBg: C.greenMid, tileGreenFg: C.greenDark, line: C.gray100 }),
    [C, isDark]
  );
}


// ─── Avatar initials ──────────────────────────────────────────────────────
function Avatar({ name, size = 64, onPress, editable = false }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const initials = (name || "?").trim().slice(0, 1).toUpperCase();
  const content = (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: isDark ? C.surface : "rgba(255,255,255,0.25)",
        alignItems: "center", justifyContent: "center",
        borderWidth: isDark ? 1.5 : 2, borderColor: isDark ? C.gray200 : "rgba(255,255,255,0.5)",
      }}
    >
      <Text style={{ color: C.white, fontWeight: "800", fontSize: size * 0.42 }}>
        {initials}
      </Text>
      {editable && (
        <View style={{
          position: "absolute", bottom: -2, left: -2,
          width: size * 0.32, height: size * 0.32, borderRadius: size * 0.16,
          backgroundColor: isDark ? C.gray100 : C.overlayDark, borderWidth: 2, borderColor: isDark ? C.gray200 : C.white,
          alignItems: "center", justifyContent: "center",
        }}>
          <Feather name="camera" size={size * 0.15} color={C.white} />
        </View>
      )}
    </View>
  );
  if (!editable) return content;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
    >
      {content}
    </TouchableOpacity>
  );
}

// ─── Hero background: gradient in light, flat in dark ─────────────────────
function HeroBg({ isDark, colors, style, children }) {
  if (isDark) return <View style={style}>{children}</View>;
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────
function EditModal({ visible, field, label, value, keyboardType = "default", onSave, onClose, saving }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const em = useMemo(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: isDark ? 1 : 0, borderColor: C.line },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 16 },
  inputBox: { backgroundColor: C.gray100, borderRadius: 14, borderWidth: 1.5, borderColor: C.greenBorder, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 },
  input: { fontSize: 16, color: C.gray900, fontWeight: "600", ...Platform.select({ web: { outlineStyle: "none" } }) },
  btns: { flexDirection: "row", gap: 12 },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.gray100, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: C.gray600 },
  save: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: C.primary, alignItems: "center" },
  saveOff: { backgroundColor: isDark ? C.gray200 : C.greenMid },
  saveText: { fontSize: 15, fontWeight: "800", color: C.white },
}), [C, isDark]);
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

// ─── Card header (icon + title + optional action link) ───────────────────
function CardHeader({ icon, iconBg, iconColor, title, actionLabel, onAction }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const ch = useMemo(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "800", color: C.gray900 },
  actionBtn: { backgroundColor: C.greenMid, paddingHorizontal: 14, paddingVertical: 8, borderRadius: isDark ? 12 : 10, borderWidth: isDark ? 1 : 0, borderColor: C.line },
  actionText: { fontSize: 12.5, fontWeight: "800", color: C.greenDark },
}), [C, isDark]);
  return (
    <View style={ch.row}>
      <View style={ch.left}>
        <View style={[ch.iconWrap, { backgroundColor: isDark ? "transparent" : iconBg }, isDark && { width: 26, height: 26 }]}>
          <Feather name={icon} size={isDark ? 20 : 16} color={iconColor} />
        </View>
        <Text style={ch.title}>{title}</Text>
      </View>
      {actionLabel ? (
        <TouchableOpacity
          style={ch.actionBtn} onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button" accessibilityLabel={actionLabel}
        >
          <Text style={ch.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Info row (tappable field, chevron style) ─────────────────────────────
function InfoRow({ label, value, onPress, icon = "user", last = false, locked = false, lockedHint }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const ir = useMemo(() => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  fieldIconWrap: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.greenMid, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  fieldIconWrapLocked: { backgroundColor: C.gray100 },
  left: { flex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  label: { fontSize: 13.5, fontWeight: "700", color: C.gray900 },
  verifiedTag: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.greenMid, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 },
  verifiedTagText: { fontSize: 9.5, fontWeight: "800", color: C.greenDark },
  value: { fontSize: 13, color: C.gray500, fontWeight: "500" },
  valuePlaceholder: { color: C.gray400, fontStyle: "italic" },
}), [C, isDark]);
  return (
    <TouchableOpacity
      style={[ir.row, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={locked ? 1 : 0.7}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, ${lockedHint || "cannot be changed"}` : `Edit ${label}`}
    >
      <View style={[ir.fieldIconWrap, locked && ir.fieldIconWrapLocked]}>
        <Feather name={icon} size={15} color={locked ? C.gray400 : C.green} />
      </View>
      <View style={ir.left}>
        <View style={ir.labelRow}>
          <Text style={ir.label}>{label}</Text>
          {locked && (
            <View style={ir.verifiedTag}>
              <Feather name="check" size={9} color={C.greenDark} />
              <Text style={ir.verifiedTagText}>Verified</Text>
            </View>
          )}
        </View>
        <Text style={[ir.value, !value && ir.valuePlaceholder]}>
          {value || `Add ${label.toLowerCase()}`}
        </Text>
      </View>
      {locked
        ? <Feather name="lock" size={14} color={C.gray300} />
        : <Feather name="chevron-right" size={16} color={C.gray300} />}
    </TouchableOpacity>
  );
}

// ─── Row menu item (icon + label + sub + right control) ───────────────────
function MenuItem({ icon, label, onPress, danger, right, sub, iconBg, iconColor, last = false }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const mi = useMemo(() => StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 2,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14.5, color: C.gray900, fontWeight: "700" },
  labelDanger: { color: C.red },
  sub: { fontSize: 12, color: C.gray400, marginTop: 2, fontWeight: "500" },
  subDanger: { color: "#F87171" },
}), [C, isDark]);
  return (
    <TouchableOpacity
      style={[mi.row, last && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}
      onPress={onPress} activeOpacity={0.75}
      accessibilityRole="button" accessibilityLabel={sub ? `${label}, ${sub}` : label}
    >
      <View style={[mi.iconWrap, { backgroundColor: iconBg || (danger && isDark ? C.redLight : C.gray100) }]}>
        <Feather name={icon} size={16} color={iconColor || (danger && isDark ? C.red : C.gray600)} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[mi.label, danger && mi.labelDanger]}>{label}</Text>
        {sub ? <Text style={[mi.sub, danger && mi.subDanger]}>{sub}</Text> : null}
      </View>
      {right !== undefined ? right : <Feather name="chevron-right" size={15} color={danger ? "#FCA5A5" : C.gray300} />}
    </TouchableOpacity>
  );
}

// ─── Quick action button ───────────────────────────────────────────────────
function QuickAction({ icon, label, bg, color, onPress }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const qa = useMemo(() => StyleSheet.create({
  btn: { flexBasis: "48%", flexGrow: 1, borderRadius: 16, paddingVertical: 18, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: isDark ? 1 : 0, borderColor: C.line },
  label: { fontSize: 12.5, fontWeight: "700" },
}), [C, isDark]);
  return (
    <TouchableOpacity
      style={[qa.btn, { backgroundColor: isDark ? C.gray100 : bg }]} onPress={onPress} activeOpacity={0.8}
      accessibilityRole="button" accessibilityLabel={label}
    >
      <Feather name={icon} size={20} color={color} />
      <Text style={[qa.label, { color: C.gray700 }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Stat item (with action link) ──────────────────────────────────────────
function StatItem({ icon, iconBg, iconColor, value, label, action, onAction }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const st = useMemo(() => StyleSheet.create({
  item: { flexDirection: "row", alignItems: "flex-start", gap: isDark ? 14 : 10 },
  iconWrap: { width: isDark ? 44 : 36, height: isDark ? 44 : 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  value: { fontSize: isDark ? 17 : 16, fontWeight: "900", color: C.gray900 },
  label: { fontSize: isDark ? 12.5 : 11, color: C.gray500, fontWeight: "600", marginTop: 1 },
  action: { fontSize: isDark ? 12.5 : 11, color: C.green, fontWeight: "800" },
}), [C, isDark]);
  return (
    <View style={st.item}>
      <View style={[st.iconWrap, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View>
        <Text style={st.value} numberOfLines={1}>{value}</Text>
        <Text style={st.label}>{label}</Text>
        {action ? (
          <TouchableOpacity
            onPress={onAction} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button" accessibilityLabel={`${action} ${label}`}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 3 }}>
              <Text style={st.action}>{action}</Text>
              <Feather name="chevron-right" size={11} color={C.green} />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ─── Address row (used inside Delivery Address card + Manage modal) ──────
function AddressRow({ addr, isSelected, onPress }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const adc = useMemo(() => StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14,
    backgroundColor: C.surface, marginBottom: 10, borderWidth: 1, borderColor: C.gray100,
  },
  cardActive: { borderColor: C.greenBorder, backgroundColor: C.greenLight },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  iconActive: { backgroundColor: C.primary },
  text: { fontSize: 13.5, color: C.gray700, fontWeight: "600", lineHeight: 19 },
  textActive: { color: C.greenDark, fontWeight: "800" },
  activeLabel: { fontSize: 11.5, color: C.green, fontWeight: "700", marginTop: 3 },
}), [C, isDark]);
  const text = typeof addr.address === "string" ? addr.address : addr.address_line || "Saved address";
  return (
    <TouchableOpacity
      style={[adc.card, isSelected && adc.cardActive]}
      onPress={onPress} activeOpacity={0.8}
    >
      <View style={[adc.icon, isSelected && adc.iconActive]}>
        <Feather name="map-pin" size={14} color={isSelected ? C.white : C.gray500} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[adc.text, isSelected && adc.textActive]} numberOfLines={2}>{text}</Text>
        {isSelected && <Text style={adc.activeLabel}>Active delivery address</Text>}
      </View>
      <Feather name="chevron-right" size={15} color={isSelected ? C.green : C.gray300} />
    </TouchableOpacity>
  );
}

// ─── Address Detail Modal ─────────────────────────────────────────────────
function AddressDetailModal({ addr, isSelected, onSelect, onRemove, onClose }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const adm = useMemo(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: isDark ? 1 : 0, borderColor: C.line },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 20 },
  mapWrapper: { height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: C.gray200 },
  addrBox: { flexDirection: "row", alignItems: "flex-start", gap: 14, backgroundColor: C.gray100, borderRadius: 14, padding: 16, marginBottom: 12 },
  addrIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.gray200, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addrIconActive: { backgroundColor: C.primary },
  addrText: { flex: 1, fontSize: 15, color: C.gray900, fontWeight: "500", lineHeight: 22 },
  coordRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, marginBottom: 12 },
  coordText: { fontSize: 12, color: C.gray400, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.greenLight, borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: C.greenBorder },
  activeBadgeText: { fontSize: 13, color: C.green, fontWeight: "600", flex: 1 },
  actions: { gap: 10 },
  selectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.primary, paddingVertical: 15, borderRadius: 14 },
  selectBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.redLight, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: C.mode === "dark" ? "#4A3336" : "#FECACA" },
  removeBtnText: { fontSize: 14, fontWeight: "700", color: C.red },
}), [C, isDark]);
  const [region, setRegion] = useState({
    latitude: 28.6139, longitude: 77.2090, latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  useEffect(() => {
    if (addr?.lat && addr?.lng) {
      setRegion({
        latitude: parseFloat(addr.lat), longitude: parseFloat(addr.lng),
        latitudeDelta: 0.005, longitudeDelta: 0.005,
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

// ─── Manage Addresses modal ────────────────────────────────────────────────
function AddressesModal({ visible, addresses, selectedId, onSelect, onClose, onOpenDetail }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const am = useMemo(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: isDark ? 1 : 0, borderColor: C.line },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 16 },
  closeBtn: { backgroundColor: C.gray100, paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 12 },
  closeBtnText: { fontSize: 15, fontWeight: "700", color: C.gray600 },
}), [C, isDark]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={am.backdrop} onPress={onClose}>
        <Pressable style={am.sheet} onPress={() => { }}>
          <View style={am.handle} />
          <Text style={am.title}>Manage Addresses</Text>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {(!addresses || addresses.length === 0) ? (
              <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
                <Feather name="map-pin" size={22} color={C.gray300} />
                <Text style={{ color: C.gray400, fontSize: 13 }}>No saved addresses yet</Text>
              </View>
            ) : (
              addresses.map(a => (
                <AddressRow
                  key={a.id}
                  addr={a}
                  isSelected={a.id === selectedId}
                  onPress={() => onOpenDetail(a)}
                />
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={am.closeBtn} onPress={onClose}>
            <Text style={am.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Logout modal ─────────────────────────────────────────────────────────
function LogoutModal({ visible, onConfirm, onCancel }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const lm = useMemo(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.surface, borderRadius: 24, padding: 28, width: "82%", alignItems: "center", gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  sub: { fontSize: 13, color: C.gray400, textAlign: "center", lineHeight: 20 },
  btns: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.gray100, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: C.gray700 },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.red, alignItems: "center" },
  confirmText: { fontSize: 15, fontWeight: "700", color: C.white },
}), [C, isDark]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={lm.backdrop} onPress={onCancel}>
        <Pressable style={lm.card} onPress={() => { }}>
          <LinearGradient colors={C.mode === "dark" ? [C.redLight, C.surface] : ["#FEF2F2", "#FFF"]} style={lm.iconWrap}>
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

// ─── Payment placeholder modal ────────────────────────────────────────────
function PaymentModal({ visible, onClose }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const pm2 = useMemo(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: isDark ? 1 : 0, borderColor: C.line },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "900", color: C.gray900, marginBottom: 20 },
  placeholder: { alignItems: "center", paddingVertical: 32, gap: 10, backgroundColor: C.gray100, borderRadius: 16, marginBottom: 20 },
  placeholderTitle: { fontSize: 16, fontWeight: "800", color: C.gray500 },
  placeholderSub: { fontSize: 13, color: C.gray400, textAlign: "center", paddingHorizontal: 24 },
  closeBtn: { backgroundColor: C.gray100, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  closeBtnText: { fontSize: 15, fontWeight: "700", color: C.gray600 },
}), [C, isDark]);
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

// ─── Bottom nav bar ─────────────────────────────────────────────────────────
function BottomNav({ active, onNavigate, cartCount }) {
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const bn = useMemo(() => StyleSheet.create({
  wrap: {
    flexDirection: "row", backgroundColor: isDark ? C.bg : C.surface, borderTopWidth: 1, borderTopColor: C.line,
    paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 22 : 10, paddingHorizontal: 10,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6, borderRadius: 14 },
  itemActive: { backgroundColor: C.greenMid, borderWidth: isDark ? 1 : 0, borderColor: C.line },
  badge: {
    position: "absolute", top: -6, right: -10, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { color: C.white, fontSize: 9.5, fontWeight: "800" },
  label: { fontSize: 11, color: C.gray400, fontWeight: "600" },
  labelActive: { color: C.green, fontWeight: "800" },
}), [C, isDark]);
  const items = [
    { key: "Home", label: "Home", icon: "home" },
    { key: "Cart", label: "Cart", icon: "shopping-cart", badge: cartCount },
    { key: "Orders", label: "Orders", icon: "clipboard" },
    { key: "Profile", label: "Profile", icon: "user" },
  ];
  return (
    <View style={bn.wrap}>
      {items.map(it => {
        const isActive = it.key === active;
        return (
          <TouchableOpacity
            key={it.key}
            style={[bn.item, isActive && bn.itemActive]}
            onPress={() => onNavigate(it.key)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={it.label}
            accessibilityState={{ selected: isActive }}
          >
            <View>
              <Feather name={it.icon} size={19} color={isActive ? C.green : C.gray400} />
              {!!it.badge && (
                <View style={bn.badge}>
                  <Text style={bn.badgeText}>{it.badge}</Text>
                </View>
              )}
            </View>
            <Text style={[bn.label, isActive && bn.labelActive]}>{it.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user, token, logout, updateUser, setActiveRole } = useAuthStore();
  const cartStore = useCartStore();
  const addressStore = useAddressStore();
  const { mode, setMode } = useTheme();
  const C = useProfileColors();
  const isDark = C.mode === "dark";
  const s = useMemo(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Hero
  hero: {
    paddingTop: Platform.OS === "android" ? 32 : 24, paddingBottom: isDark ? 22 : 44,
    borderBottomLeftRadius: isDark ? 0 : 28, borderBottomRightRadius: isDark ? 0 : 28,
    overflow: "hidden",
  },
  heroDecorCircle1: { position: "absolute", top: -50, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.08)" },
  heroDecorCircle2: { position: "absolute", top: 70, right: 50, width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.07)" },

  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  heroLabel: { fontSize: 12.5, fontWeight: "800", color: isDark ? C.gray500 : "rgba(255,255,255,0.75)", letterSpacing: 1.2 },
  editProfileBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderWidth: 1.3, borderColor: isDark ? C.line : "rgba(255,255,255,0.55)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: isDark ? C.surface : "transparent",
  },
  editProfileText: { fontSize: 13, fontWeight: "700", color: isDark ? C.green : C.white },

  heroMain: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: isDark ? 4 : 28, flexWrap: "wrap" },
  avatarOuter: { position: "relative" },
  verifiedDot: {
    position: "absolute", bottom: isDark ? 0 : -2, right: isDark ? 0 : -2,
    width: isDark ? 30 : 22, height: isDark ? 30 : 22, borderRadius: isDark ? 15 : 11,
    backgroundColor: isDark ? C.gray100 : C.green, borderWidth: isDark ? 2 : 2.5, borderColor: isDark ? C.gray200 : C.white,
    alignItems: "center", justifyContent: "center",
  },

  heroInfo: { flex: 1, minWidth: 180 },
  heroNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  heroName: { fontSize: 24, fontWeight: "900", color: isDark ? C.gray900 : C.white, letterSpacing: -0.3 },
  premiumPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: isDark ? C.goldLight : "rgba(0,0,0,0.18)", borderWidth: 1, borderColor: C.gold,
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20,
  },
  premiumEmoji: { fontSize: 12 },
  premiumText: { fontSize: 12, fontWeight: "800", color: C.gold },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isDark ? C.gray100 : C.white, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  heroPillText: { fontSize: 13, fontWeight: "700", color: isDark ? C.gray900 : C.green },
  sinceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroSince: { fontSize: 12, color: isDark ? C.gray500 : "rgba(255,255,255,0.75)" },

  statsWrap: { marginTop: isDark ? 0 : -46 },
  stats: {
    flexDirection: "row", flexWrap: "wrap", backgroundColor: C.surface, borderRadius: isDark ? 24 : 20, padding: isDark ? 22 : 18,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0 : 0.12, shadowRadius: 18, elevation: isDark ? 0 : 6,
    borderWidth: 1, borderColor: C.line,
  },
  statCell: { width: "50%", paddingVertical: isDark ? 14 : 10, paddingRight: 8 },

  // Grid (single column, stacked full-width cards for phone)
  gridWrap: { marginTop: isDark ? 14 : 18 },
  gridRow: { flexDirection: "column", gap: 14, marginBottom: 14 },

  card: {
    backgroundColor: C.surface, borderRadius: isDark ? 24 : 18, padding: isDark ? 20 : 18, marginTop: 8,
    borderWidth: 1, borderColor: C.line,
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0 : 0.06, shadowRadius: 16, elevation: isDark ? 0 : 2,
  },

  qaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 8, backgroundColor: C.gray100, borderRadius: 16 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: C.gray500 },
  emptySub: { fontSize: 12.5, color: C.gray400, textAlign: "center", paddingHorizontal: 20, lineHeight: 18 },
  emptyCta: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, marginTop: 6,
  },
  emptyCtaText: { fontSize: 12.5, fontWeight: "800", color: C.white },
}), [C, isDark]);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const hPad = 16;

  const [showLogout, setShowLogout] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [editField, setEditField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [detailAddr, setDetailAddr] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        addressStore?.fetchAddresses?.(token),
        cartStore?.fetchCart?.(token),
      ]);
    } catch {
      // best-effort refresh; existing data stays on screen
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem("notif_enabled")
      .then(v => { if (v !== null) setNotifEnabled(v === "true" || v === true); })
      .catch(() => { });
  }, []);

  const fadeO = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeO, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

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

  const handleNotifToggle = async (val) => {
    setNotifEnabled(val);
    await AsyncStorage.setItem("notif_enabled", String(val));
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: "🛒 DesiDukaan — order groceries from nearby kirana stores!\n\nJoin with my invite and get ₹150 credit:\nhttps://desidukaan.app/invite",
      });
    } catch { }
  };

  const handleLogout = () => {
    cartStore.clearCart?.();
    addressStore.clearAddresses?.();
    logout();
    setShowLogout(false);
  };

  const handleBottomNav = (key) => {
    if (key === "Profile") return;
    navigation.navigate(key);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  const addresses = addressStore?.addresses ?? [];
  const activeAddress = addresses.find(a => a.id === addressStore.selectedId) || addresses[0];
  const cartCount = cartStore?.items?.length ?? 0;
  const isPremium = user?.isPremium ?? true;
  const loyaltyPoints = user?.loyaltyPoints ?? 3;

  const gridCardStyle = [s.card];

  return (
    <SafeAreaView style={s.root}>
      <Animated.ScrollView
        style={{ opacity: fadeO }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.green}
            colors={[C.green]}
          />
        }
      >
        {/* ── Hero header ─────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ translateY: slideY }] }}>
          <HeroBg
            isDark={isDark}
            colors={[C.greenDark, C.green, "#22c55e"]}
            style={[s.hero, { paddingHorizontal: hPad }]}
          >
            {!isDark && <View style={s.heroDecorCircle1} pointerEvents="none" />}
            {!isDark && <View style={s.heroDecorCircle2} pointerEvents="none" />}

            <View style={s.heroTopRow}>
              <Text style={s.heroLabel}>{t('profile.myProfile', 'My Profile').toUpperCase()}</Text>
              <TouchableOpacity
                style={s.editProfileBtn}
                activeOpacity={0.8}
                onPress={() => setEditField({ field: "name", label: "Name", value: user?.name })}
                accessibilityRole="button"
                accessibilityLabel="Edit profile name"
              >
                <Feather name="edit-2" size={13} color={isDark ? C.green : C.white} />
                <Text style={s.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <View style={s.heroMain}>
              <View style={s.avatarOuter}>
                <Avatar
                  name={user?.name} size={isDark ? 96 : 72} editable
                  onPress={() => Alert.alert("Change photo", "Photo upload is coming soon.")}
                />
                <View style={s.verifiedDot}>
                  <Feather name={isDark ? "map-pin" : "shield"} size={isDark ? 13 : 10} color={isDark ? C.gray600 : C.white} />
                </View>
              </View>
              <View style={s.heroInfo}>
                <View style={s.heroNameRow}>
                  <Text style={s.heroName} numberOfLines={1}>{user?.name || "Guest"}</Text>
                  {isPremium && (
                    <View style={s.premiumPill}>
                      {isDark
                        ? <MaterialCommunityIcons name="crown" size={14} color={C.gold} />
                        : <Text style={s.premiumEmoji}>👑</Text>}
                      <Text style={s.premiumText}>Premium Member</Text>
                    </View>
                  )}
                </View>
                <View style={s.heroPill}>
                  <Feather name="phone" size={11} color={isDark ? C.gray500 : C.green} />
                  <Text style={s.heroPillText}>{user?.phone || "—"}</Text>
                </View>
                {memberSince && (
                  <View style={s.sinceRow}>
                    <Feather name="calendar" size={12} color={isDark ? C.gray500 : "rgba(255,255,255,0.75)"} />
                    <Text style={s.heroSince}>Member since {memberSince}</Text>
                  </View>
                )}
              </View>
            </View>
          </HeroBg>

          {/* Stats — overlaps the hero bottom edge, 2x2 grid on phone */}
          <View style={[s.statsWrap, { paddingHorizontal: hPad }]}>
            <View style={s.stats}>
              <View style={s.statCell}>
                <StatItem
                  icon="map-pin" iconBg={C.tileGreenBg} iconColor={C.tileGreenFg}
                  value={String(addresses.length)} label="Addresses"
                  action="Manage" onAction={() => setShowAddresses(true)}
                />
              </View>
              <View style={s.statCell}>
                <StatItem
                  icon="credit-card" iconBg={isDark ? C.blueLight : C.greenMid} iconColor={isDark ? C.blue : C.greenDark}
                  value="₹150" label="Credits"
                  action="View transactions" onAction={() => Alert.alert("Transactions", "Transaction history coming soon.")}
                />
              </View>
              <View style={s.statCell}>
                <StatItem
                  icon="user" iconBg={C.blueLight} iconColor={C.blue}
                  value={(user?.role || "Customer").replace(/^\w/, c => c.toUpperCase())} label="Account Type"
                  action="Upgrade" onAction={() => Alert.alert("Upgrade", "Account upgrade options coming soon.")}
                />
              </View>
              <View style={s.statCell}>
                <StatItem
                  icon="star" iconBg={C.purpleLight} iconColor={C.purple}
                  value={String(loyaltyPoints)} label="Loyalty Points"
                  action="Redeem" onAction={() => Alert.alert("Redeem", "Loyalty point redemption coming soon.")}
                />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Body (stacked, full-width cards) ───────────────────────── */}
        <View style={[s.gridWrap, { paddingHorizontal: hPad }]}>

          {/* Row 1 */}
          <View style={s.gridRow}>
            {/* Personal Information */}
            <View style={gridCardStyle}>
              <CardHeader
                icon="user" iconBg={C.greenMid} iconColor={C.greenDark}
                title="Personal Information"
                actionLabel="Edit All"
                onAction={() => setEditField({ field: "name", label: "Full Name", value: user?.name })}
              />
              <InfoRow
                label="Full Name" icon="user" value={user?.name}
                onPress={() => setEditField({ field: "name", label: "Full Name", value: user?.name })}
              />
              <InfoRow
                label="Email Address" icon="mail" value={user?.email}
                onPress={() => setEditField({ field: "email", label: "Email Address", value: user?.email, keyboardType: "email-address" })}
              />
              <InfoRow
                label="Phone Number" icon="phone" value={user?.phone} last
                locked lockedHint="can't be changed here"
                onPress={() => Alert.alert("Phone Number", "Your verified phone number can't be changed here. Contact support if you need to update it.")}
              />
            </View>

            {/* Delivery Address */}
            <View style={gridCardStyle}>
              <CardHeader
                icon="map-pin" iconBg={C.greenMid} iconColor={C.greenDark}
                title="Delivery Address"
                actionLabel="Manage Addresses"
                onAction={() => setShowAddresses(true)}
              />
              {activeAddress ? (
                <AddressRow
                  addr={activeAddress}
                  isSelected={activeAddress.id === addressStore.selectedId}
                  onPress={() => setDetailAddr(activeAddress)}
                />
              ) : (
                <View style={s.emptyBox}>
                  <Feather name="map-pin" size={22} color={C.gray300} />
                  <Text style={s.emptyTitle}>No saved addresses</Text>
                  <Text style={s.emptySub}>Add a delivery address to get started</Text>
                  <TouchableOpacity
                    style={s.emptyCta}
                    activeOpacity={0.85}
                    onPress={() => setShowAddresses(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Add delivery address"
                  >
                    <Feather name="plus" size={14} color={C.white} />
                    <Text style={s.emptyCtaText}>Add Address</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View style={gridCardStyle}>
              <CardHeader icon="zap" iconBg={C.greenMid} iconColor={C.greenDark} title="Quick Actions" />
              <View style={s.qaGrid}>
                <QuickAction
                  icon="truck" label="Track Order" bg={C.greenLight} color={C.green}
                  onPress={() => navigation.navigate("Orders")}
                />
                <QuickAction
                  icon="heart" label="Wishlist" bg={C.redLight} color={C.red}
                  onPress={() => navigation.navigate("Wishlist")}
                />
                <QuickAction
                  icon="gift" label="Refer & Earn" bg={C.blueLight} color={C.blue}
                  onPress={handleInvite}
                />
                <QuickAction
                  icon="help-circle" label="Help & Support" bg={C.orangeLight} color={C.orange}
                  onPress={() => navigation.navigate("Support")}
                />
              </View>
            </View>
          </View>

          {/* Row 2 */}
          <View style={s.gridRow}>
            {/* App Settings */}
            <View style={gridCardStyle}>
              <CardHeader icon="settings" iconBg={C.purpleLight} iconColor={C.purple} title="App Settings" />
              <MenuItem
                icon="bell" iconBg={C.purpleLight} iconColor={C.purple}
                label="Push Notifications"
                sub={notifEnabled ? "Enabled" : "Disabled"}
                onPress={() => handleNotifToggle(!notifEnabled)}
                right={
                  <Switch
                    value={notifEnabled === true}
                    onValueChange={handleNotifToggle}
                    trackColor={{ false: C.gray200, true: isDark ? C.primary : C.greenMid }}
                    thumbColor={notifEnabled === true ? (isDark ? C.white : C.green) : C.gray400}
                    ios_backgroundColor={C.gray200}
                  />
                }
              />
              <MenuItem
                icon="globe" iconBg={C.purpleLight} iconColor={C.purple}
                label="Language" sub={t('profile.languageSub', 'English')}
                onPress={() => setShowLanguage(true)}
              />
              <MenuItem
                icon={isDark ? "moon" : "sun"} iconBg={C.purpleLight} iconColor={C.purple}
                label="Theme"
                sub={mode === "default" ? `Default (${isDark ? "Dark" : "Light"})` : mode === "dark" ? "Dark Mode" : "Light Mode"}
                last
                onPress={() => setShowTheme(true)}
              />
            </View>

            {/* Security & Privacy */}
            <View style={gridCardStyle}>
              <CardHeader icon="shield" iconBg={C.greenMid} iconColor={C.greenDark} title="Security & Privacy" />
              <MenuItem
                icon="credit-card" iconBg={C.purpleLight} iconColor={C.purple}
                label="Payment Methods" sub="Manage UPI, cards & wallets"
                onPress={() => setShowPayments(true)}
              />
              <MenuItem
                icon="shield" iconBg={C.purpleLight} iconColor={C.purple}
                label="Privacy Policy" sub="Your data is safe with us"
                onPress={() => navigation.navigate("Privacy")}
              />
              <MenuItem
                icon="lock" iconBg={C.purpleLight} iconColor={C.purple}
                label="Security" sub="Manage account security" last
                onPress={() => Alert.alert("Security", "Password & 2-factor settings coming soon.")}
              />
            </View>

            {/* Account */}
            <View style={gridCardStyle}>
              <CardHeader icon="user" iconBg={C.blueLight} iconColor={C.blue} title="Account" />
              <MenuItem
                icon="shuffle" iconBg={C.blueLight} iconColor={C.blue}
                label="Switch Profile" sub="Switch between Customer, Vendor & Delivery"
                onPress={async () => { await setActiveRole(null); }}
              />
              <MenuItem
                icon="log-out"
                label="Log Out" sub="Securely log out from your account"
                danger last
                onPress={() => setShowLogout(true)}
              />
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Bottom nav */}
      <BottomNav active="Profile" onNavigate={handleBottomNav} cartCount={cartCount} />

      {/* Modals */}
      <AddressDetailModal
        addr={detailAddr}
        isSelected={detailAddr?.id === addressStore.selectedId}
        onSelect={(a) => { addressStore.setSelectedId(a.id); setDetailAddr(null); }}
        onRemove={(a) => { addressStore.removeAddress(a.id, token); setDetailAddr(null); }}
        onClose={() => setDetailAddr(null)}
      />
      <AddressesModal
        visible={showAddresses}
        addresses={addresses}
        selectedId={addressStore.selectedId}
        onSelect={(a) => addressStore.setSelectedId(a.id)}
        onOpenDetail={(a) => { setShowAddresses(false); setDetailAddr(a); }}
        onClose={() => setShowAddresses(false)}
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
              backgroundColor: C.surface,
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
      <Modal
        visible={showTheme}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTheme(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowTheme(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
            }}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={{ width: 44, height: 5, backgroundColor: C.gray200, borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: C.gray900, marginBottom: 4 }}>Theme</Text>
            <Text style={{ fontSize: 13, color: C.gray400, marginBottom: 18 }}>Choose how DesiDukaan looks on this device.</Text>
            {[
              { key: 'light', icon: 'sun', title: 'Light', sub: 'Always use light mode' },
              { key: 'dark', icon: 'moon', title: 'Dark', sub: 'Always use dark mode' },
              { key: 'default', icon: 'smartphone', title: 'Default', sub: "Match your device's system setting" },
            ].map((opt, idx) => {
              const selected = mode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { setMode(opt.key); setShowTheme(false); }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.title} theme${selected ? ', selected' : ''}`}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    paddingVertical: 14,
                    borderBottomWidth: idx < 2 ? 1 : 0, borderBottomColor: C.gray100,
                  }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: selected ? C.greenMid : C.gray100,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Feather name={opt.icon} size={18} color={selected ? C.greenDark : C.gray500} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: C.gray900 }}>{opt.title}</Text>
                    <Text style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{opt.sub}</Text>
                  </View>
                  {selected && <Feather name="check-circle" size={20} color={C.green} />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}