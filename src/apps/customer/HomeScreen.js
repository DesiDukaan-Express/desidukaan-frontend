import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  TextInput,
  Platform,
  Dimensions,
  StatusBar,
  Pressable,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { vendorsAPI, ordersAPI, categoriesAPI } from "../../services/api";
import { io } from "socket.io-client";
import ChatWidget from "./ChatWidget";
import { calculateProportionalPrice } from "../../utils/weightUtils";
import { isStoreCurrentlyOpen } from "../../utils/storeStatus";
import LocationMapPicker from "../../components/LocationMapPicker";
import UseCurrentLocationButton from "../../components/UseCurrentLocationButton";

// Use env var works on device, emulator, and web
// In your .env: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (BASE_URL.includes("/api") ? BASE_URL.split("/api")[0] : "http://localhost:3000");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange: "#F97316",
  orangeDark: "#EA580C",
  orangeLight: "#FFF7ED",
  green: "#16A34A",
  greenDark: "#15803D",
  greenDeep: "#14532D",
  greenLight: "#F0FDF4",
  greenMid: "#DCFCE7",
  greenBorder: "#BBF7D0",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  cyan: "#0891B2",
  cyanLight: "#ECFEFF",
  red: "#DC2626",
  redLight: "#FEF2F2",
};

// ─── Loose item helper ─────────────────────────────────────────────────────────
function parseWeightOptions(p) {
  if (!p) return null;
  const wo = p.weight_options;
  if (Array.isArray(wo) && wo.length > 0) return wo;
  if (typeof wo === "string") {
    try { const parsed = JSON.parse(wo); if (Array.isArray(parsed)) return parsed; } catch { }
  }
  return null;
}
function isLooseItem(p) {
  return p?.item_type === "loose" || parseWeightOptions(p) !== null;
}
function formatWeight(w) {
  if (!w) return "";
  if (typeof w === "string") return w;
  if (typeof w === "object") {
    if (w.weight !== undefined && w.unit) return `${w.weight}${w.unit}`;
    if (w.weight !== undefined) return String(w.weight);
    return w.unit || "";
  }
  return String(w);
}

// ─── Gradient Text ─────────────────────────────────────────────────────────────
function GradientText({ text, style }) {
  if (Platform.OS === "web") {
    return (
      <Text
        style={[
          style,
          {
            background: `linear-gradient(90deg, ${C.orange}, ${C.green})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          },
        ]}
      >
        {text}
      </Text>
    );
  }
  const half = Math.ceil(text.length / 2);
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
      <Text style={[style, { color: C.orange }]}>{text.slice(0, half)}</Text>
      <Text style={[style, { color: C.green }]}>{text.slice(half)}</Text>
    </View>
  );
}

// ─── Address Picker Modal ──────────────────────────────────────────────────────
function AddressPicker({
  visible,
  addresses,
  selectedId,
  onClose,
  onSelect,
  onSaveNew,
  onUpdate,
  onDelete,
  initialCoords,
}) {
  const { t } = useTranslation();
  // mode: 'list' | 'add' | 'edit'
  const [mode, setMode] = React.useState("list");
  const [editingAddr, setEditingAddr] = React.useState(null);
  const [inputText, setInputText] = React.useState("");
  const [inputLabel, setInputLabel] = React.useState("");
  const [inputErr, setInputErr] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  // Picked location from the map (web)
  const [pickLat, setPickLat] = React.useState(null);
  const [pickLng, setPickLng] = React.useState(null);
  // Autocomplete suggestions + point to fly the map to on selection
  const [suggestions, setSuggestions] = React.useState([]);
  const [focusPoint, setFocusPoint] = React.useState(null);
  const suggestionSelectRef = React.useRef(false);
  const focusSeqRef = React.useRef(0);
  const [locating, setLocating] = React.useState(false);
  const [locError, setLocError] = React.useState("");

  React.useEffect(() => {
    if (!visible) {
      setMode("list");
      setEditingAddr(null);
      setInputText("");
      setInputLabel("");
      setInputErr("");
      setSaving(false);
      setPickLat(null);
      setPickLng(null);
      setSuggestions([]);
      setFocusPoint(null);
      suggestionSelectRef.current = false;
      setLocating(false);
      setLocError("");
    }
  }, [visible]);

  const openAdd = () => {
    setEditingAddr(null);
    setInputText("");
    setInputLabel("");
    setInputErr("");
    setPickLat(null);
    setPickLng(null);
    setSuggestions([]);
    setFocusPoint(null);
    suggestionSelectRef.current = false;
    setLocating(false);
    setLocError("");
    setMode("add");
  };

  const openEdit = (addr) => {
    setEditingAddr(addr);
    setInputText(addr.address_line || addr.address || "");
    setInputLabel(addr.label || t("home.labelPlaceholder"));
    setInputErr("");
    setPickLat(addr.lat || null);
    setPickLng(addr.lng || null);
    setSuggestions([]);
    setFocusPoint(null);
    suggestionSelectRef.current = false;
    setMode("edit");
  };

  // Called by the map with the current centre + optional reverse-geocoded address.
  // Keeps the shared lat/lng state and the text field in sync with the map.
  const handleMapPick = React.useCallback((lat, lng, address) => {
    setPickLat(lat);
    setPickLng(lng);
    if (address) {
      setInputText(address);
      setInputErr("");
    }
  }, []);

  // User picked one of the autocomplete suggestions: adopt its label, move the
  // map to it, and close the dropdown.
  const selectSuggestion = React.useCallback((s) => {
    suggestionSelectRef.current = true;
    setInputText(s.display_name);
    setInputErr("");
    setPickLat(s.lat);
    setPickLng(s.lng);
    setFocusPoint({ key: ++focusSeqRef.current, lat: s.lat, lng: s.lng, displayName: s.display_name });
    setSuggestions([]);
  }, []);

  // "Use current location" in the Add-new-address form: geolocate, reverse-geocode,
  // fill the field and fly the map. Address is only saved when the user taps Save.
  const handleUseCurrentLocation = React.useCallback(async () => {
    setLocating(true);
    setLocError("");
    if (!navigator?.geolocation) {
      setLocError(t("home.locErrorUnavailable"));
      setLocating(false);
      return;
    }
    let pos;
    try {
      pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        })
      );
    } catch (e) {
      setLocError(e?.code === 1 ? t("home.locErrorDenied") : t("home.locErrorUnavailable"));
      setLocating(false);
      return;
    }
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    let displayName = "";
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      displayName = data?.display_name || "";
    } catch (err) {
      displayName = "";
    }
    if (!displayName) {
      setLocError(t("home.locErrorUnavailable"));
      setLocating(false);
      return;
    }
    setPickLat(lat);
    setPickLng(lng);
    setInputText(displayName);
    setInputErr("");
    setSuggestions([]);
    setFocusPoint({ key: ++focusSeqRef.current, lat, lng, displayName });
    setLocating(false);
  }, [t]);

  const handleSaveAdd = () => {
    if (inputText.trim().length < 5) {
      setInputErr(t("home.addressError"));
      return;
    }
    onSaveNew(inputText.trim(), { lat: pickLat, lng: pickLng });
    setMode("list");
    setInputText("");
    setInputErr("");
  };

  const handleSaveEdit = async () => {
    if (inputText.trim().length < 5) {
      setInputErr(t("home.addressError"));
      return;
    }
    setSaving(true);
    const patch = {
      address_line: inputText.trim(),
      label: inputLabel.trim() || editingAddr.label || t("home.labelPlaceholder"),
    };
    if (pickLat && pickLng) {
      patch.latitude = pickLat;
      patch.longitude = pickLng;
    }
    await onUpdate?.(editingAddr.id, patch);
    setSaving(false);
    setMode("list");
    setEditingAddr(null);
    setInputText("");
    setInputLabel("");
  };

  // helper: pick icon name by label
  const getAddrIcon = (label) => {
    const l = (label || "").toLowerCase();
    if (l.includes("home")) return "home";
    if (l.includes("office") || l.includes("work")) return "business";
    return "location-on";
  };

  const isFormMode = mode === "add" || mode === "edit";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={ap.backdrop} onPress={onClose}>
        <Pressable style={ap.sheet} onPress={() => { }}>
          {/* Handle */}
          <View style={ap.handle} />

          {/* Header */}
          <View style={ap.titleRow}>
            <Text style={ap.title}>
              {mode === "add"
                ? t("home.addNewAddress")
                : mode === "edit"
                  ? t("home.editAddress")
                  : t("home.selectAddress")}
            </Text>
            <TouchableOpacity
              onPress={() => (isFormMode ? setMode("list") : onClose())}
              style={ap.closeBtn}
            >
              <MaterialIcons
                name={isFormMode ? "arrow-back" : "close"}
                size={18}
                color={C.gray600}
              />
            </TouchableOpacity>
          </View>

          {isFormMode ? (
            /* ── Add / Edit Form ── */
            <View style={ap.formWrap}>
              {/* Label field (only shown in edit) */}
              {mode === "edit" && (
                <>
                  <Text style={ap.formLabel}>{t("home.labelHint")}</Text>
                  <View style={[ap.inputBoxSingle, inputErr ? ap.inputBoxError : null]}>
                    <MaterialIcons
                      name="label"
                      size={15}
                      color={C.green}
                      style={{ marginLeft: 14 }}
                    />
                    <TextInput
                      style={ap.input}
                      placeholder={t("home.labelPlaceholder")}
                      placeholderTextColor={C.gray400}
                      value={inputLabel}
                      onChangeText={(t) => setInputLabel(t)}
                      underlineColorAndroid="transparent"
                    />
                  </View>
                  <View style={{ height: 12 }} />
                </>
              )}

              {/* Map location picker (web) — pin stays centred, map pans below */}
              <UseCurrentLocationButton
                onPress={handleUseCurrentLocation}
                loading={locating}
                style={ap.locBtn}
              />
              {locError ? <Text style={ap.locErrorText}>{locError}</Text> : null}
              <LocationMapPicker
                initialCoords={
                  mode === "edit"
                    ? editingAddr?.lat && editingAddr?.lng
                      ? { lat: editingAddr.lat, lng: editingAddr.lng }
                      : null
                    : initialCoords
                }
                addressText={inputText}
                focusPoint={focusPoint}
                autoReverseOnReady={mode === "add"}
                onPick={handleMapPick}
                onSuggestions={setSuggestions}
              />
              <View style={{ height: 14 }} />

              <Text style={ap.formLabel}>{t("home.fullAddress")}</Text>
              <View style={[ap.inputBox, inputErr ? ap.inputBoxError : null]}>
                <MaterialIcons
                  name="location-on"
                  size={15}
                  color={inputErr ? C.red : C.green}
                  style={{ marginLeft: 14 }}
                />
                <TextInput
                  style={ap.input}
                  placeholder={t("home.addressPlaceholder")}
                  placeholderTextColor={C.gray400}
                  value={inputText}
                  onChangeText={(text) => {
                    setInputText(text);
                    setInputErr("");
                    if (text.trim().length < 3) setSuggestions([]);
                  }}
                  onKeyPress={(e) => {
                    if (e.nativeEvent?.key === "Escape") setSuggestions([]);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!suggestionSelectRef.current) setSuggestions([]);
                      suggestionSelectRef.current = false;
                    }, 120);
                  }}
                  multiline
                  numberOfLines={3}
                  autoFocus
                  underlineColorAndroid="transparent"
                />
              </View>
              {inputErr ? <Text style={ap.inputErr}>{inputErr}</Text> : null}

              {/* Autocomplete suggestions dropdown (web) */}
              {suggestions.length > 0 && (
                <View style={ap.suggestWrap}>
                  <View style={ap.suggestHeader}>
                    <Text style={ap.suggestHeaderText}>{t("home.suggestions")}</Text>
                  </View>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 176 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {suggestions.map((s, i) => (
                      <Pressable
                        key={`${s.lat}-${s.lng}-${i}`}
                        style={({ pressed, hovered }) => [
                          ap.suggestRow,
                          (pressed || hovered) && ap.suggestRowActive,
                          i === suggestions.length - 1 && ap.suggestRowLast,
                        ]}
                        onPressIn={() => selectSuggestion(s)}
                      >
                        <View style={ap.suggestIconWrap}>
                          <MaterialIcons name="location-on" size={16} color={C.green} />
                        </View>
                        <Text style={ap.suggestText} numberOfLines={2}>
                          {s.display_name}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
              <TouchableOpacity
                style={[
                  ap.saveBtn,
                  (inputText.trim().length < 5 || saving) && ap.saveBtnDisabled,
                ]}
                onPress={mode === "edit" ? handleSaveEdit : handleSaveAdd}
                activeOpacity={0.85}
                disabled={inputText.trim().length < 5 || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <MaterialIcons name="check" size={16} color={C.white} />
                    <Text style={ap.saveBtnText}>
                      {mode === "edit" ? t("home.updateAddress") : t("home.saveAddress")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Address List ── */
            <>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                {addresses.length === 0 ? (
                  <View style={ap.emptyWrap}>
                    <MaterialIcons name="location-on" size={32} color={C.gray300} />
                    <Text style={ap.emptyText}>{t("home.noSavedAddresses")}</Text>
                  </View>
                ) : (
                  addresses.map((addr) => {
                    const isActive = addr.id === selectedId;
                    const displayText = addr.address_line || addr.address || "";
                    const iconName = getAddrIcon(addr.label);
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[ap.addrCard, isActive && ap.addrCardActive]}
                        onPress={() => onSelect(addr)}
                        activeOpacity={0.85}
                      >
                        {/* Icon badge */}
                        <View style={[ap.addrIconBadge, isActive && ap.addrIconBadgeActive]}>
                          <MaterialIcons name={iconName} size={20} color={isActive ? C.white : C.gray500} />
                        </View>

                        {/* Content */}
                        <View style={{ flex: 1 }}>
                          <View style={ap.addrCardTopRow}>
                            <Text style={[ap.addrLabel, isActive && ap.addrLabelActive]}>
                              {addr.label || t("home.labelPlaceholder")}
                            </Text>
                            {/* Radio / Check indicator */}
                            {isActive ? (
                              <View style={ap.checkCircle}>
                                <MaterialIcons name="check" size={13} color={C.white} />
                              </View>
                            ) : (
                              <View style={ap.radioCircle} />
                            )}
                          </View>
                          <Text style={ap.addrText} numberOfLines={2}>{displayText}</Text>
                          {/* Action buttons */}
                          <View style={ap.addrActions}>
                            <TouchableOpacity
                              style={ap.editBtn}
                              onPress={() => openEdit(addr)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <MaterialIcons name="edit" size={14} color={C.gray700} />
                              <Text style={ap.editBtnText}>{t("common.edit")}</Text>
                            </TouchableOpacity>
                            {!isActive && (
                              <TouchableOpacity
                                style={ap.deleteBtn}
                                onPress={() => onDelete && onDelete(addr.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <MaterialIcons name="delete" size={18} color={C.red} />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>

              {/* Add new address */}
              <TouchableOpacity style={ap.addNewBtn} onPress={openAdd} activeOpacity={0.85}>
                <MaterialIcons name="add" size={20} color={C.green} />
                <Text style={ap.addNewText}>{t("home.addNewAddress")}</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}


const ap = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: C.gray200,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800", color: C.gray900 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { alignItems: "center", paddingVertical: 36, gap: 10 },
  emptyText: { fontSize: 14, color: C.gray400 },
  // New card-style address row
  addrCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  addrCardActive: {
    borderColor: C.green,
    borderWidth: 2,
    backgroundColor: C.greenLight,
  },
  addrIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  addrIconBadgeActive: { backgroundColor: C.green },
  addrCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  addrLabel: { fontSize: 15, fontWeight: "700", color: C.gray900, textTransform: "capitalize" },
  addrLabelActive: { color: C.green },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.gray300,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  addrText: { fontSize: 13, color: C.gray500, lineHeight: 18 },
  addrActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.gray100,
  },
  editBtnText: { fontSize: 12, fontWeight: "600", color: C.gray700 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.redLight,
    alignItems: "center",
    justifyContent: "center",
  },
  // Add new button (dashed)
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: C.green,
    backgroundColor: C.greenLight,
  },
  addNewText: { fontSize: 15, fontWeight: "700", color: C.green },
  // Form
  formWrap: { paddingTop: 4 },
  formLabel: { fontSize: 12, fontWeight: "700", color: C.gray700, marginBottom: 8, letterSpacing: 0.2 },
  locBtn: { marginBottom: 12 },
  locErrorText: { fontSize: 12, color: C.red, marginTop: 6, marginBottom: 4, lineHeight: 16 },
  inputBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.gray100,
    borderRadius: 14,
    minHeight: 90,
    paddingVertical: 12,
    paddingRight: 14,
  },
  inputBoxError: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.gray900,
    paddingLeft: 10,
    paddingTop: 0,
    fontWeight: "500",
    textAlignVertical: "top",
    lineHeight: 22,
    ...Platform.select({ web: { outlineStyle: "none" } }),
  },
  inputErr: { fontSize: 12, color: C.red, marginTop: 6, fontWeight: "500" },
  // Autocomplete suggestions dropdown
  suggestWrap: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
    overflow: "hidden",
  },
  suggestHeader: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: C.gray100,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  suggestHeaderText: { fontSize: 11, fontWeight: "700", color: C.gray500, letterSpacing: 0.3 },
  suggestRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  suggestRowActive: { backgroundColor: C.greenLight },
  suggestRowLast: { borderBottomWidth: 0 },
  suggestIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  suggestText: { flex: 1, fontSize: 13, color: C.gray800, fontWeight: "500", lineHeight: 18 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: C.green,
  },
  saveBtnDisabled: { backgroundColor: C.greenMid },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
  // Single-line input box for label field in edit mode
  inputBoxSingle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.gray100,
    borderRadius: 14,
    paddingVertical: 12,
    paddingRight: 14,
  },
});

// ─── Store Picker Modal ────────────────────────────────────────────────────────
function StorePicker({ visible, item, vendors, onClose, onSelectStore }) {
  const { t } = useTranslation();
  if (!item) return null;

  const itemNormName = item.name ? item.name.trim().toLowerCase() : "";

  const vendorsWithItem = vendors.filter((v) =>
    v._inventory?.some((inv) => {
      if (!inv.product) return false;
      const invActive = inv.is_active ?? true;
      const prodActive = inv.product.is_active ?? true;
      if (!invActive || !prodActive) return false;

      const matchId = item.id && Number(inv.product.id || inv.product_id) === Number(item.id);
      const matchName = itemNormName && inv.product.name?.trim()?.toLowerCase() === itemNormName;
      return matchId || matchName;
    }),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sp.backdrop} onPress={onClose}>
        <Pressable style={sp.sheet} onPress={() => { }}>
          <View style={sp.handle} />
          <Text style={sp.sheetTitle}>{t("home.chooseStore")}</Text>
          <Text style={sp.sheetSub}>
            {t("home.storeHasItem", { name: item.name })}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 16 }}
          >
            {vendorsWithItem.length === 0 ? (
              <View style={sp.emptyWrap}>
                <MaterialIcons name="error-outline" size={32} color={C.gray300} />
                <Text style={sp.emptyText}>
                  {t("home.noStoresNearby")}
                </Text>
              </View>
            ) : (
              vendorsWithItem.map((v) => {
                const invItem = v._inventory?.find((inv) => {
                  if (!inv.product) return false;
                  const matchId = item.id && Number(inv.product.id || inv.product_id) === Number(item.id);
                  const matchName = itemNormName && inv.product.name?.trim()?.toLowerCase() === itemNormName;
                  return matchId || matchName;
                });
                const price = invItem?.product?.price ?? item.price;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={sp.storeRow}
                    onPress={() => onSelectStore(v, item)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{
                        uri:
                          v.shop_image_url ||
                          `https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&sig=${v.id}`,
                      }}
                      style={sp.storeImg}
                    />
                    <View style={sp.storeInfo}>
                      <Text style={sp.storeName}>{v.shop_name}</Text>
                      <View style={sp.storeMeta}>
                        <MaterialIcons name="location-on" size={11} color={C.green} />
                        <Text style={sp.storeMetaText}>
                          {v.distance_km
                            ? `${parseFloat(v.distance_km).toFixed(1)} km`
                            : t("home.nearby")}
                        </Text>
                        <View style={sp.dot} />
                        <MaterialIcons name="access-time" size={11} color={C.gray400} />
                        <Text style={sp.storeMetaText}>{t("home.deliveryTime")}</Text>
                      </View>
                      <Text style={sp.storePrice}>
                        ₹{price} <Text style={sp.storeUnit}>· {formatWeight(item.selectedWeight || item.unit)}</Text>
                      </Text>
                    </View>
                    <View style={sp.addStoreBtn}>
                      <Text style={sp.addStoreBtnText}>{t("common.add")}</Text>
                      <MaterialIcons name="arrow-forward" size={13} color={C.white} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity style={sp.cancelBtn} onPress={onClose}>
            <Text style={sp.cancelText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sp = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.gray200,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  sheetSub: { fontSize: 14, color: C.gray500, marginTop: 4 },
  itemName: { fontWeight: "700", color: C.gray800 },
  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: C.gray400, textAlign: "center" },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
    gap: 14,
  },
  storeImg: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: C.gray100,
  },
  storeInfo: { flex: 1 },
  storeName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.gray900,
    marginBottom: 4,
  },
  storeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  storeMetaText: { fontSize: 12, color: C.gray500 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.gray300 },
  storePrice: { fontSize: 14, fontWeight: "700", color: C.gray900 },
  storeUnit: { color: C.gray400, fontWeight: "400" },
  addStoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.green,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addStoreBtnText: { fontSize: 14, fontWeight: "800", color: C.white },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: C.gray100,
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: C.gray600 },
});

const CAT_FALLBACK_IMGS = {
  "Dairy, Bread & Eggs": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80",
  "Fruits & Vegetables": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80",
  "Cold Drinks & Juices": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80",
  "Snacks & Munchies": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
  "Breakfast & Instant Food": "https://images.unsplash.com/photo-1569058242252-62324e7d5567?w=400&q=80",
  "Sweet Tooth": "https://images.unsplash.com/photo-1582231229718-4c5931bc1184?w=400&q=80",
  "Bakery & Biscuits": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
  "Tea, Coffee & Milk Drinks": "https://images.unsplash.com/photo-1544787210-2211d7c309c7?w=400&q=80",
  "Atta, Rice & Dal": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
  "Masala, Oil & More": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80",
  "Sauces & Spreads": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&q=80",
  "Cleaning Essentials": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
  "Personal Care": "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80",
  "Home & Office": "https://images.unsplash.com/photo-1586075010633-2445c9ff093b?w=400&q=80",
  _default: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
};

// ─── Category accent colours (top-level) ──────────────────────────────────────
const CAT_ACCENT = {
  "Dairy, Bread & Eggs": { bg: "#EFF6FF", accent: "#2563EB", icon: "🥛" },
  "Fruits & Vegetables": { bg: "#ECFDF5", accent: "#059669", icon: "🍎" },
  "Cold Drinks & Juices": { bg: "#F0FDF4", accent: "#16A34A", icon: "🧃" },
  "Snacks & Munchies": { bg: "#FFF7ED", accent: "#EA580C", icon: "🍿" },
  "Breakfast & Instant Food": { bg: "#FEF9C3", accent: "#CA8A04", icon: "🥣" },
  "Sweet Tooth": { bg: "#FDF4FF", accent: "#9333EA", icon: "🍫" },
  "Bakery & Biscuits": { bg: "#FFF1F2", accent: "#E11D48", icon: "🍪" },
  "Tea, Coffee & Milk Drinks": { bg: "#F5F5F4", accent: "#57534E", icon: "☕" },
  "Atta, Rice & Dal": { bg: "#FEFCE8", accent: "#A16207", icon: "🌾" },
  "Masala, Oil & More": { bg: "#FFF7ED", accent: "#C2410C", icon: "🌶️" },
  "Sauces & Spreads": { bg: "#F0FDFA", accent: "#0D9488", icon: "🥫" },
  "Cleaning Essentials": { bg: "#F0F9FF", accent: "#0284C7", icon: "🧼" },
  "Personal Care": { bg: "#FAF5FF", accent: "#7C3AED", icon: "🧴" },
  "Home & Office": { bg: "#F8FAFC", accent: "#475569", icon: "🖇️" },
  "Bread": { bg: "#FFFBEB", accent: "#D97706", icon: "🍞" },
  "Chips": { bg: "#FEF2F2", accent: "#EF4444", icon: "🍟" },
  "Milk": { bg: "#F0F9FF", accent: "#0EA5E9", icon: "🥛" },
  "Rice": { bg: "#FEFCE8", accent: "#EAB308", icon: "🌾" },
  _default: { bg: "#F3F4F6", accent: "#6B7280", icon: "📦" },
};

// ─── Store category metadata (for filter chips on Nearby Stores) ───────────────
const STORE_CATEGORY_META = {
  grocery: { icon: "🛒", color: "#16A34A", bg: "#F0FDF4" },
  medical: { icon: "💊", color: "#2563EB", bg: "#EFF6FF" },
  restaurant: { icon: "🍽️", color: "#EA580C", bg: "#FFF7ED" },
  bakery: { icon: "🥖", color: "#D97706", bg: "#FFFBEB" },
  dairy: { icon: "🥛", color: "#0EA5E9", bg: "#F0F9FF" },
  electronics: { icon: "📱", color: "#7C3AED", bg: "#FAF5FF" },
  stationery: { icon: "✏️", color: "#475569", bg: "#F8FAFC" },
  general: { icon: "🏪", color: "#6B7280", bg: "#F3F4F6" },
  _default: { icon: "🏪", color: "#6B7280", bg: "#F3F4F6" },
};






// ─── Build 3-level hierarchy from flat inventory ───────────────────────────────
// Returns: { [topCatName]: { [subCatName]: inventoryItem[] } }
// We use the category NAME only (no parent_id from API categories since inventory
// only gives us product.category). The apiCategoryTree provides parent lookup.
function buildHierarchyFromInventory(allInventoryItems, getCategoryName, apiCategories) {
  const parentOf = {};
  const catById = {};
  if (apiCategories && apiCategories.length > 0) {
    apiCategories.forEach(c => { catById[c.id] = c; });
    apiCategories.forEach(c => {
      if (c.parent_id && catById[c.parent_id]) {
        parentOf[c.name] = catById[c.parent_id].name;
      } else {
        parentOf[c.name] = null;
      }
    });
  }

  const getAncestors = (catName) => {
    if (!catName) return [];
    const chain = [catName];
    let curr = catName;
    const visited = new Set([curr]);
    while (curr && parentOf.hasOwnProperty(curr) && parentOf[curr] !== null) {
      curr = parentOf[curr];
      if (visited.has(curr)) break;
      visited.add(curr);
      chain.unshift(curr);
    }
    return chain;
  };

  const hierarchy = {};

  allInventoryItems.forEach(inv => {
    const catName = getCategoryName(inv);
    if (!catName) return;

    const chain = getAncestors(catName);
    if (chain.length === 0) return;

    const topCat = chain[0];
    if (!hierarchy[topCat]) hierarchy[topCat] = {};

    if (chain.length === 1) {
      if (!hierarchy[topCat]["All"]) hierarchy[topCat]["All"] = [];
      hierarchy[topCat]["All"].push(inv);
    } else {
      for (let i = 1; i < chain.length; i++) {
        const subCatName = chain[i];
        if (!hierarchy[topCat][subCatName]) hierarchy[topCat][subCatName] = [];
        hierarchy[topCat][subCatName].push(inv);
      }
    }

    const directCat = chain[chain.length - 1];
    if (!hierarchy[directCat]) hierarchy[directCat] = {};
    if (!hierarchy[directCat]["All"]) hierarchy[directCat]["All"] = [];
    hierarchy[directCat]["All"].push(inv);
  });

  return hierarchy;
}

// ─── Category Browse Sheet ─────────────────────────────────────────────────────
function CategoryBrowseSheet({
  visible, category, hierarchy, onClose,
  onAdd, onRemove, getCartQty, onOpenWeightPicker, vendors,
  onStoreSelect, apiCategories, onItemDetail, allInventoryItems,
}) {
  const { t } = useTranslation();
  const [subCatPath, setSubCatPath] = React.useState([]);

  React.useEffect(() => {
    if (visible) {
      setSubCatPath([]);
    }
  }, [visible, category]);

  const catAccent = category ? (CAT_ACCENT[category] || CAT_ACCENT._default) : CAT_ACCENT._default;
  const apiCat = category && apiCategories ? apiCategories.find(c => c.name === category) : null;

  // Active subcategory at the end of current path
  const activeSubCat = subCatPath.length > 0 ? subCatPath[subCatPath.length - 1] : null;

  const findCategoryNode = (nodes, targetName) => {
    if (!nodes || !targetName) return null;
    const targetLower = targetName.trim().toLowerCase();
    for (const node of nodes) {
      if (node.name?.trim()?.toLowerCase() === targetLower) return node;
      if (node.children && node.children.length > 0) {
        const found = findCategoryNode(node.children, targetName);
        if (found) return found;
      }
    }
    return null;
  };

  // Direct child subcategories at current level (from API tree or hierarchy)
  const currentChildSubCats = React.useMemo(() => {
    const targetCat = activeSubCat || category;
    const subCatsSet = new Set();

    const node = findCategoryNode(apiCategories, targetCat);
    if (node && node.children && node.children.length > 0) {
      node.children.forEach(c => { if (c.name) subCatsSet.add(c.name); });
    }

    if (hierarchy && hierarchy[targetCat]) {
      Object.keys(hierarchy[targetCat]).forEach(k => {
        if (k !== "All") subCatsSet.add(k);
      });
    }

    return Array.from(subCatsSet);
  }, [activeSubCat, category, apiCategories, hierarchy]);

  // Determine items for current active subcategory or category
  const subCatItems = React.useMemo(() => {
    if (!category) return [];
    const targetCat = activeSubCat || category;
    const targetLower = targetCat.trim().toLowerCase();

    // Map variant names (singular/plural)
    const SYNONYMS = {
      grocery: "groceries", groceries: "grocery",
      snack: "snacks", snacks: "snack",
      beverage: "beverages", beverages: "beverage",
      fruit: "fruits", fruits: "fruit",
      medicine: "medicines", medicines: "medicine",
    };

    const allowedNames = new Set([targetLower]);
    if (SYNONYMS[targetLower]) allowedNames.add(SYNONYMS[targetLower]);

    // Add descendant subcategories from apiCategories tree
    const collectDescendants = (nodes) => {
      for (const node of nodes || []) {
        const nodeLower = node.name?.trim()?.toLowerCase();
        if (nodeLower && allowedNames.has(nodeLower)) {
          const addChildren = (children) => {
            for (const child of children || []) {
              if (child.name) {
                const cLower = child.name.trim().toLowerCase();
                allowedNames.add(cLower);
                if (SYNONYMS[cLower]) allowedNames.add(SYNONYMS[cLower]);
              }
              if (child.children?.length) addChildren(child.children);
            }
          };
          if (node.children) addChildren(node.children);
        } else if (node.children?.length) {
          collectDescendants(node.children);
        }
      }
    };
    collectDescendants(apiCategories);

    let items = [];

    // 1. Collect from hierarchy
    if (hierarchy) {
      Object.keys(hierarchy).forEach(topKey => {
        const topLower = topKey.trim().toLowerCase();
        // If we are looking for a top category or specific subcategory
        if (allowedNames.has(topLower)) {
          Object.keys(hierarchy[topKey]).forEach(subKey => {
            if (!activeSubCat || subKey.trim().toLowerCase() === targetLower || allowedNames.has(subKey.trim().toLowerCase())) {
              items.push(...(hierarchy[topKey][subKey] || []));
            }
          });
        } else {
          // Check subcategories inside other top-level keys
          Object.keys(hierarchy[topKey]).forEach(subKey => {
            if (subKey.trim().toLowerCase() === targetLower || allowedNames.has(subKey.trim().toLowerCase())) {
              items.push(...(hierarchy[topKey][subKey] || []));
            }
          });
        }
      });
    }

    // 2. Collect from allInventoryItems
    if (allInventoryItems && allInventoryItems.length > 0) {
      allInventoryItems.forEach((inv) => {
        if (!inv.product) return;
        const catObj = inv.product.category;
        let rawCat = "";
        if (typeof catObj === "object" && catObj?.name) rawCat = catObj.name;
        else if (typeof catObj === "string") rawCat = catObj;
        else if (inv.product.category_id && apiCategories) {
          const foundNode = apiCategories.find(c => Number(c.id) === Number(inv.product.category_id));
          if (foundNode) rawCat = foundNode.name;
        }

        const catLower = rawCat ? rawCat.trim().toLowerCase() : "";
        if (catLower && allowedNames.has(catLower)) {
          items.push(inv);
        }
      });
    }

    // 3. Deduplicate by unique inventory item / product id
    const seen = new Set();
    return items.filter(inv => {
      if (!inv?.id && !inv?.product?.id) return false;
      const key = inv.product?.id || inv.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [category, activeSubCat, hierarchy, apiCategories, allInventoryItems]);

  if (!visible || !category) return null;

  const showSubCatGrid = currentChildSubCats.length > 0;

  const handlePopPath = () => {
    setSubCatPath(prev => prev.slice(0, -1));
  };

  const handlePushPath = (sc) => {
    setSubCatPath(prev => [...prev, sc]);
  };

  const prevTitle = subCatPath.length > 1
    ? subCatPath[subCatPath.length - 2]
    : category;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={cbs.backdrop} onPress={onClose}>
        <Pressable style={cbs.sheet} onPress={() => { }}>
          <View style={cbs.handle} />

          {/* ── Header ── */}
          <View style={[cbs.header, { borderBottomColor: catAccent.bg }]}>
            <View style={[cbs.catIconWrap, { backgroundColor: catAccent.bg }]}>
              {apiCat?.image_url ? (
                <Image source={{ uri: apiCat.image_url }} style={cbs.catHeaderImg} resizeMode="cover" />
              ) : (
                <Text style={cbs.catIconEmoji}>{catAccent.icon}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={cbs.headerCat}>{t("home.categoryLabel")}</Text>
              <Text style={cbs.headerTitle}>{activeSubCat || category}</Text>
            </View>
            <TouchableOpacity style={cbs.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={16} color={C.gray500} />
            </TouchableOpacity>
          </View>

          {/* Back Navigation Bar when navigated into a subcategory */}
          {subCatPath.length > 0 && (
            <View style={cbs.backRow}>
              <TouchableOpacity
                style={[cbs.backToSubCatsBtn, { backgroundColor: catAccent.bg }]}
                onPress={handlePopPath}
                activeOpacity={0.8}
              >
                <MaterialIcons name="arrow-back" size={16} color={catAccent.accent} />
                <Text style={[cbs.backToSubCatsText, { color: catAccent.accent }]}>
                  Back to {prevTitle}
                </Text>
              </TouchableOpacity>
              <Text style={cbs.activeSubCatTitle}>{activeSubCat}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* ── Section 1: Subcategories (if any) ── */}
            {showSubCatGrid && (
              <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
                <Text style={cbs.subCatGridTitle}>
                  {subCatPath.length === 0 ? t("home.selectSubCategory") : `Subcategories of ${activeSubCat}`}
                </Text>
                <View style={cbs.subCatGrid}>
                  {currentChildSubCats.map(sc => {
                    const subCatNode = findCategoryNode(apiCategories, sc);
                    const subItems = hierarchy[category]?.[sc] || hierarchy[sc]?.["All"] || (hierarchy[sc] ? Object.values(hierarchy[sc]).flat() : []);
                    const count = subItems.length;
                    const firstItemImg = subItems[0]?.product?.image_url;
                    const displayImg = subCatNode?.image_url || subCatNode?.image || firstItemImg;

                    return (
                      <TouchableOpacity
                        key={sc}
                        style={[cbs.subCatCard, { borderColor: catAccent.bg }]}
                        onPress={() => handlePushPath(sc)}
                        activeOpacity={0.85}
                      >
                        <View style={[cbs.subCatCardIconWrap, { backgroundColor: catAccent.bg }]}>
                          {displayImg ? (
                            <Image source={{ uri: displayImg }} style={cbs.subCatCardImg} resizeMode="cover" />
                          ) : (
                            <Text style={cbs.subCatCardEmoji}>{catAccent.icon || "📂"}</Text>
                          )}
                        </View>
                        <View style={cbs.subCatCardInfo}>
                          <Text style={cbs.subCatCardName} numberOfLines={2}>{sc}</Text>
                          {count > 0 && (
                            <Text style={cbs.subCatCardCount}>{t("home.itemsCount", { count })}</Text>
                          )}
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={catAccent.accent} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Section 2: Items in Category ── */}
            <View style={{ borderTopWidth: showSubCatGrid ? 1 : 0, borderTopColor: "#E2E8F0", paddingTop: showSubCatGrid ? 12 : 4 }}>
              {showSubCatGrid && (
                <Text style={[cbs.subCatGridTitle, { paddingHorizontal: 16, marginBottom: 8 }]}>
                  Items in {activeSubCat || category}
                </Text>
              )}

              {/* Column Headers */}
              <View style={cbs.tableHeader}>
                <Text style={[cbs.thCell, { flex: 2 }]}>{t("home.colProduct")}</Text>
                <Text style={[cbs.thCell, { flex: 1, textAlign: "center" }]}>{t("home.brand")}</Text>
                <Text style={[cbs.thCell, { flex: 1, textAlign: "center" }]}>{t("home.qtyUnit")}</Text>
                <Text style={[cbs.thCell, { width: 80, textAlign: "right" }]}>{t("home.price")}</Text>
              </View>

              {/* Product Rows */}
              {subCatItems.length === 0 ? (
                <View style={cbs.emptyWrap}>
                  <MaterialIcons name="inventory" size={32} color={C.gray300} />
                  <Text style={cbs.emptyText}>{t("home.noSubCatItems")}</Text>
                </View>
              ) : (
                subCatItems.map((inv, idx) => {
                  const p = inv.product;
                  if (!p) return null;
                  const qty = getCartQty(p.id);
                  const loose = isLooseItem(p);
                  const hasMrp = p.mrp && p.mrp > p.price;
                  const discPct = hasMrp ? Math.round((1 - p.price / p.mrp) * 100) : 0;
                  const vendorName = inv._vendorName || "";

                  const item = {
                    id: p.id, name: p.name, price: p.price,
                    img: p.image_url || null, unit: p.unit || "1 pc",
                    orig: hasMrp ? p.mrp : null, category,
                    item_type: p.item_type, weight_options: p.weight_options,
                  };

                  return (
                    <View key={`${p.id}-${idx}`} style={[
                      cbs.productRow,
                      idx % 2 === 0 && cbs.productRowAlt,
                    ]}>
                      {/* Image + Name */}
                      <View style={[cbs.productCell, { flex: 2, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                        <View style={cbs.productImgWrap}>
                          <Image
                            source={{
                              uri: p.image_url ||
                                CAT_FALLBACK_IMGS[category] ||
                                CAT_FALLBACK_IMGS._default
                            }}
                            style={cbs.productImg}
                            resizeMode="cover"
                          />
                          {hasMrp && (
                            <View style={cbs.discPill}>
                              <Text style={cbs.discPillText}>{discPct}%</Text>
                            </View>
                          )}
                          {loose && (
                            <View style={[cbs.discPill, { backgroundColor: "#0891B2" }]}>
                              <Text style={cbs.discPillText}>{t("home.loose")}</Text>
                            </View>
                          )}
                          <TouchableOpacity
                            style={cbs.eyeBtn}
                            activeOpacity={0.7}
                            onPress={() => onItemDetail && onItemDetail(item, p)}
                          >
                            <MaterialIcons name="visibility" size={11} color={C.white} />
                          </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={cbs.productName} numberOfLines={2}>{p.name}</Text>
                          {p.description ? (
                            <Text style={cbs.productDesc} numberOfLines={1}>{p.description}</Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Brand (vendor) */}
                      <View style={[cbs.productCell, { flex: 1, alignItems: "center" }]}>
                        <Text style={cbs.brandText} numberOfLines={2}>{vendorName}</Text>
                      </View>

                      {/* Qty / Unit (Particulars) */}
                      <View style={[cbs.productCell, { flex: 1, alignItems: "center" }]}>
                        <Text style={cbs.unitText}>{p.unit || "1 pc"}</Text>
                      </View>

                      {/* Price + ADD */}
                      <View style={[cbs.productCell, { width: 80, alignItems: "flex-end" }]}>
                        <Text style={cbs.priceText}>₹{p.price}</Text>
                        {hasMrp && <Text style={cbs.mrpText}>₹{p.mrp}</Text>}
                        {qty === 0 ? (
                          <TouchableOpacity
                            style={[cbs.addBtn, loose && { backgroundColor: "#0891B2" }]}
                            activeOpacity={0.8}
                            onPress={() => {
                              if (loose) onOpenWeightPicker && onOpenWeightPicker(item);
                              else onAdd(item);
                            }}
                          >
                            <Text style={cbs.addBtnText}>{loose ? t("home.select") : t("common.add")}</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={cbs.qtyRow}>
                            <TouchableOpacity style={cbs.qtyBtn} onPress={() => onRemove(item)}>
                              <MaterialIcons name="remove" size={10} color={C.white} />
                            </TouchableOpacity>
                            <Text style={cbs.qtyNum}>{qty}</Text>
                            <TouchableOpacity style={cbs.qtyBtn} onPress={() => onAdd(item)}>
                              <MaterialIcons name="add" size={10} color={C.white} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
              <View style={{ height: 24 }} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cbs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: "88%",
    flex: 1,
  },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    marginBottom: 0,
  },
  catIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  catHeaderImg: { width: "100%", height: "100%" },
  catIconEmoji: { fontSize: 24 },
  headerCat: { fontSize: 11, color: C.gray400, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.gray100, alignItems: "center", justifyContent: "center",
  },

  // Sub-category pills
  subCatRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 6, flexDirection: "row" },
  subCatChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: C.gray200,
    backgroundColor: C.white,
  },
  subCatChipText: { fontSize: 11, fontWeight: "700", color: C.gray700 },
  subCatCount: {
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 8, backgroundColor: C.gray100,
  },
  subCatCountText: { fontSize: 9, fontWeight: "800", color: C.gray500 },

  // Table header
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.gray100,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.gray200,
  },
  thCell: { fontSize: 10, fontWeight: "800", color: C.gray400, textTransform: "uppercase", letterSpacing: 0.4 },

  // Product rows
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
    gap: 8,
  },
  productRowAlt: { backgroundColor: "#FAFAFA" },
  productCell: { justifyContent: "center" },
  productImgWrap: { width: 52, height: 52, borderRadius: 10, overflow: "hidden", backgroundColor: C.gray100, flexShrink: 0, position: "relative" },
  productImg: { width: "100%", height: "100%" },
  eyeBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  discPill: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.orange,
    paddingVertical: 1,
    alignItems: "center",
  },
  discPillText: { fontSize: 8, color: C.white, fontWeight: "800" },
  productName: { fontSize: 13, fontWeight: "700", color: C.gray900, lineHeight: 18 },
  productDesc: { fontSize: 11, color: C.gray400, marginTop: 2 },
  brandText: { fontSize: 12, fontWeight: "600", color: C.green, textAlign: "center" },
  unitText: { fontSize: 13, fontWeight: "700", color: C.gray700, textAlign: "center" },
  priceText: { fontSize: 14, fontWeight: "900", color: C.gray900 },
  mrpText: { fontSize: 10, color: C.gray400, textDecorationLine: "line-through", marginTop: 1 },
  addBtn: {
    marginTop: 4,
    backgroundColor: C.green, borderRadius: 7,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addBtnText: { fontSize: 11, fontWeight: "800", color: C.white },
  qtyRow: {
    marginTop: 4,
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.green, borderRadius: 7, overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 7, paddingVertical: 5 },
  qtyNum: { fontSize: 11, fontWeight: "800", color: C.white, minWidth: 18, textAlign: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, color: C.gray400 },

  // Custom subcategory grid
  subCatGridContainer: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 40 },
  subCatGridTitle: { fontSize: 13, fontWeight: "600", color: C.gray500, marginBottom: 16 },
  subCatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  subCatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: C.white,
    gap: 12,
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  subCatCardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  subCatCardImg: { width: "100%", height: "100%" },
  subCatCardEmoji: { fontSize: 20 },
  subCatCardInfo: { flex: 1 },
  subCatCardName: { fontSize: 13, fontWeight: "800", color: C.gray900, lineHeight: 16 },
  subCatCardCount: { fontSize: 11, color: C.gray400, marginTop: 2, fontWeight: "600" },

  // Back row styles
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
    justifyContent: "space-between",
  },
  backToSubCatsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  backToSubCatsText: { fontSize: 12, fontWeight: "800" },
  activeSubCatTitle: { fontSize: 15, fontWeight: "800", color: C.gray800 },
});

// ─── Vendor type display config ──────────────────────────────────────────────
const VENDOR_TYPE_META = {
  ration: { label: "Ration Store", bg: "#FEF9C3", color: "#92400E" },
  vegetables: { label: "Vegetables", bg: "#DCFCE7", color: "#14532D" },
  fruits: { label: "Fruits", bg: "#ECFDF5", color: "#065F46" },
};

// ─── Item Card (grid, used inside CategoryBrowseSheet) ────────────────────────
function ItemCard({ item, onAdd, onRemove, qty, cardWidth, onOpenWeightPicker }) {
  const { t } = useTranslation();
  const size = cardWidth || 130;
  const imgUri =
    item.img ||
    item.image_url ||
    CAT_FALLBACK_IMGS[item.category] ||
    CAT_FALLBACK_IMGS._default;
  const hasMrp = item.orig && item.orig > item.price;
  const discPct = hasMrp ? Math.round((1 - item.price / item.orig) * 100) : 0;
  const loose = isLooseItem(item);

  return (
    <View style={[ic.card, { width: size }]}>
      <View style={ic.imgWrap}>
        {loose && (
          <View style={[ic.badge, { backgroundColor: C.cyan, right: 6, left: "auto", top: 6 }]}>
            <Text style={ic.badgeText}>{t("home.loose")}</Text>
          </View>
        )}
        {hasMrp && (
          <View style={[ic.badge, { top: 6, left: 6 }]}>
            <Text style={ic.badgeText}>{t("home.discountOff", { count: discPct })}</Text>
          </View>
        )}
        <Image
          source={{ uri: imgUri }}
          style={[ic.img, { width: size - 16, height: size - 16 }]}
          resizeMode="cover"
        />
      </View>
      <View style={ic.info}>
        <Text style={ic.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={ic.unit}>{item.unit}</Text>
        <View style={ic.priceRow}>
          <Text style={ic.price}>₹{item.price}</Text>
          {hasMrp && <Text style={ic.orig}>₹{item.orig}</Text>}
        </View>
        {qty === 0 ? (
          <TouchableOpacity
            style={[ic.addBtn, loose && { backgroundColor: C.cyan }]}
            onPress={() => {
              if (loose) onOpenWeightPicker && onOpenWeightPicker(item);
              else onAdd(item);
            }}
            activeOpacity={0.8}
          >
            {loose ? (
              <MaterialIcons name="tune" size={12} color={C.white} />
            ) : (
              <MaterialIcons name="add" size={12} color={C.white} />
            )}
            <Text style={ic.addText}>{loose ? t("home.select") : t("common.add")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={ic.qtyRow}>
            <TouchableOpacity style={ic.qtyBtn} onPress={() => onRemove(item)}>
              <MaterialIcons name="remove" size={10} color={C.white} />
            </TouchableOpacity>
            <Text style={ic.qtyNum}>{qty}</Text>
            <TouchableOpacity style={ic.qtyBtn} onPress={() => onAdd(item)}>
              <MaterialIcons name="add" size={10} color={C.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Popular Item Card (horizontal scroll, HTML-reference style) ───────────────
function PopularItemCard({ item, onAdd, onRemove, qty, onOpenWeightPicker, onPress }) {
  const { t } = useTranslation();
  const CARD_W = 160;
  const IMG_H = 100;

  const imgUri =
    item.img ||
    item.image_url ||
    CAT_FALLBACK_IMGS[item.category] ||
    CAT_FALLBACK_IMGS._default;
  const hasMrp = item.orig && item.orig > item.price;
  const discPct = hasMrp ? Math.round((1 - item.price / item.orig) * 100) : 0;
  const loose = isLooseItem(item);
  const available = item.isAvailableNearby !== false;

  return (
    <TouchableOpacity
      style={[pic.card, !available && { opacity: 0.55 }]}
      onPress={available ? onPress : undefined}
      activeOpacity={available ? 0.85 : 1}
    >
      {/* ── Image section ── */}
      <View style={[pic.imgWrap, { height: IMG_H }]}>
        {/* Out of stock or Discount badge – top-left */}
        {!available ? (
          <View style={[pic.discBadge, { backgroundColor: "#EF4444", left: 6, top: 6 }]}>
            <Text style={pic.discBadgeText}>Out of stock</Text>
          </View>
        ) : (
          hasMrp && (
            <View style={pic.discBadge}>
              <Text style={pic.discBadgeText}>{t("home.discountOffUpper", { count: discPct })}</Text>
            </View>
          )
        )}
        {/* Loose badge – top-right */}
        {loose && (
          <View style={[pic.discBadge, { right: 32, left: 'auto', backgroundColor: C.cyan }]}>
            <Text style={pic.discBadgeText}>{t("home.loose")}</Text>
          </View>
        )}
        <TouchableOpacity
          style={pic.eyeBtn}
          onPress={(e) => { e.stopPropagation?.(); onPress?.(); }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="visibility" size={14} color={C.white} />
        </TouchableOpacity>
        <Image
          source={{ uri: imgUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>

      {/* ── Info section ── */}
      <View style={pic.info}>
        <Text style={pic.name} numberOfLines={1}>{item.name}</Text>
        <Text style={pic.unit}>{item.unit}</Text>

        {/* Price + Add button row */}
        <View style={pic.priceRow}>
          <View>
            <Text style={pic.price}>₹{qty > 0 ? item.price * qty : item.price}</Text>
            {hasMrp && <Text style={pic.orig}>₹{item.orig}</Text>}
          </View>

          {!available ? (
            <View style={[pic.addBtn, { backgroundColor: "#9CA3AF" }]}>
              <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "700" }}>N/A</Text>
            </View>
          ) : qty === 0 ? (
            <TouchableOpacity
              style={pic.addBtn}
              onPress={() => {
                if (loose) onOpenWeightPicker && onOpenWeightPicker(item);
                else onAdd(item);
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={loose ? 'tune' : 'add'}
                size={18}
                color={C.white}
              />
            </TouchableOpacity>
          ) : (
            <View style={pic.qtyRow}>
              <TouchableOpacity
                style={pic.qtyBtn}
                onPress={() => onRemove(item)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons name="remove" size={12} color={C.white} />
              </TouchableOpacity>
              <Text style={pic.qtyNum}>{qty}</Text>
              <TouchableOpacity
                style={pic.qtyBtn}
                onPress={() => onAdd(item)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons name="add" size={12} color={C.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const pic = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.gray200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imgWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: C.gray100,
  },
  discBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    backgroundColor: C.orange,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderBottomRightRadius: 8,
  },
  discBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.3,
  },
  eyeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  info: {
    padding: 10,
    paddingTop: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: C.gray900,
    marginBottom: 2,
    lineHeight: 18,
  },
  unit: {
    fontSize: 11,
    color: C.gray400,
    fontWeight: '500',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: C.gray900,
  },
  orig: {
    fontSize: 10,
    color: C.gray400,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.green,
    borderRadius: 10,
    overflow: 'hidden',
  },
  qtyBtn: { paddingHorizontal: 7, paddingVertical: 7 },
  qtyNum: { fontSize: 12, fontWeight: '800', color: C.white, minWidth: 18, textAlign: 'center' },
});

const ic = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  imgWrap: {
    padding: 8,
    paddingBottom: 0,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    zIndex: 2,
    backgroundColor: C.orange,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, color: C.white, fontWeight: "800" },
  img: {
    borderRadius: 14,
    backgroundColor: C.gray100,
  },
  info: { padding: 10, paddingTop: 6 },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray900,
    lineHeight: 17,
    marginBottom: 3,
  },
  unit: { fontSize: 11, color: C.gray400, marginBottom: 6, fontWeight: "500" },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginBottom: 8,
  },
  price: { fontSize: 15, fontWeight: "900", color: C.gray900 },
  orig: { fontSize: 10, color: C.gray400, textDecorationLine: "line-through" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: C.green,
  },
  addText: { fontSize: 12, fontWeight: "800", color: C.green },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.green,
    borderRadius: 10,
    overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  qtyNum: { fontSize: 12, fontWeight: "800", color: C.white },
});

// ─── Weight Picker Modal ───────────────────────────────────────────────────
// ─── Weight Picker Modal ───────────────────────────────────────────────────
function WeightPickerModal({ item, onClose, onAdd }) {
  const { t } = useTranslation();
  const safeItem = item || {};
  const weightOptions = parseWeightOptions(safeItem) || [safeItem.unit || "1 pc"];
  const [selected, setSelected] = useState(weightOptions[0]);

  useEffect(() => {
    if (item) {
      const opts = parseWeightOptions(item) || [item.unit || "1 pc"];
      setSelected(opts[0]);
    }
  }, [item]);

  if (!item) return null;

  const selectedWeightStr = formatWeight(selected);
  const selectedPrice = calculateProportionalPrice(item.price, selectedWeightStr, item.unit || "1kg");

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={wp.backdrop} onPress={onClose}>
        <Pressable style={wp.sheet} onPress={() => { }}>
          <View style={wp.handle} />

          {/* Header */}
          <View style={wp.header}>
            <Image
              source={{ uri: item.img || item.image_url || CAT_FALLBACK_IMGS[item.category] || CAT_FALLBACK_IMGS._default }}
              style={wp.thumb} resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <View style={wp.looseBadge}>
                <MaterialIcons name="water-drop" size={10} color={C.cyan} />
                <Text style={wp.looseBadgeText}>{t("home.looseItem")}</Text>
              </View>
              <Text style={wp.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={wp.basePriceText}>
                ₹{selectedPrice}{" "}
                <Text style={wp.perUnit}>
                  for {selectedWeightStr} (₹{item.price}/{item.unit || "1kg"})
                </Text>
              </Text>
            </View>
          </View>

          {/* Weight chips */}
          <Text style={wp.pickLabel}>{t("home.selectQuantity")}</Text>
          <View style={wp.optionsGrid}>
            {weightOptions.map(w => {
              const formatted = formatWeight(w);
              const isActive = selected === w;
              const chipPrice = calculateProportionalPrice(item.price, formatted, item.unit || "1kg");
              return (
                <TouchableOpacity
                  key={formatted}
                  style={[wp.chip, isActive && wp.chipActive]}
                  onPress={() => setSelected(w)}
                  activeOpacity={0.8}
                >
                  <Text style={[wp.chipText, isActive && wp.chipTextActive]}>
                    {formatted} • ₹{chipPrice}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Add button */}
          <TouchableOpacity
            style={wp.addBtn}
            activeOpacity={0.88}
            onPress={() => { onAdd(item, selected); onClose(); }}
          >
            <LinearGradient
              colors={[C.green, C.greenDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={wp.addBtnGrad}
            >
              <MaterialIcons name="shopping-cart" size={16} color={C.white} />
              <Text style={wp.addBtnText}>
                Add {selectedWeightStr} to Cart • ₹{selectedPrice}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const wp = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, zIndex: 9999 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  header: { flexDirection: "row", gap: 14, marginBottom: 24, alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: C.gray100 },
  looseBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.cyanLight || "#ECFEFF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  looseBadgeText: { fontSize: 11, fontWeight: "700", color: C.cyan },
  productName: { fontSize: 16, fontWeight: "800", color: C.gray900, lineHeight: 21, marginBottom: 4 },
  basePriceText: { fontSize: 15, fontWeight: "700", color: C.green },
  perUnit: { fontSize: 12, fontWeight: "400", color: C.gray400 },
  pickLabel: { fontSize: 12, fontWeight: "700", color: C.gray500, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  chip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: C.gray200, backgroundColor: C.gray100 },
  chipActive: { borderColor: C.green, backgroundColor: C.greenLight },
  chipText: { fontSize: 14, fontWeight: "700", color: C.gray600 },
  chipTextActive: { color: C.green },
  addBtn: { borderRadius: 16, overflow: "hidden", marginTop: 10 },
  addBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  addBtnText: { fontSize: 16, fontWeight: "800", color: C.white },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Item Detail Modal (animated slide-up + blurred backdrop) ─────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function ItemDetailModal({ item, onClose, onAdd, onRemove, qty }) {
  const { t } = useTranslation();
  const { width: W, height: H } = Dimensions.get("window");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const backdropDark = useRef(new Animated.Value(0)).current;
  const backdropBlur1 = useRef(new Animated.Value(0)).current;
  const backdropBlur2 = useRef(new Animated.Value(0)).current;
  const backdropBlur3 = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const imgScale = useRef(new Animated.Value(1.08)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    if (item) {
      isClosing.current = false;
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.82);
      slideAnim.setValue(100);
      backdropDark.setValue(0);
      backdropBlur1.setValue(0);
      backdropBlur2.setValue(0);
      backdropBlur3.setValue(0);
      contentSlide.setValue(30);
      contentFade.setValue(0);
      imgScale.setValue(1.08);

      Animated.parallel([
        Animated.timing(backdropDark, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(backdropBlur1, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(backdropBlur2, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(backdropBlur3, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 45, friction: 9, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.spring(contentSlide, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
          Animated.timing(contentFade, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(imgScale, { toValue: 1, tension: 40, friction: 10, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [item]);

  const handleClose = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.parallel([
      Animated.timing(backdropDark, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropBlur1, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropBlur2, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropBlur3, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 260, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 60, duration: 280, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!item) return null;

  const p = item.product || item;
  const name = p.name || item.name;
  const price = p.price || item.price;
  const mrp = p.mrp || item.orig;
  const unit = p.unit || item.unit || "1 pc";
  const description = p.description || item.description;
  const imgUri = p.image_url || item.img;
  const hasDiscount = mrp && mrp > price;
  const discountPct = hasDiscount ? Math.round((1 - price / mrp) * 100) : 0;
  const currentQty = qty || 0;

  return (
    <Modal visible transparent onRequestClose={handleClose} statusBarTranslucent animationType="none">
      {/* ── Layered blur backdrop ─────────────────────────────────── */}
      <Animated.View style={[dm.blurLayer, dm.blurLayer1, {
        opacity: backdropBlur1,
        transform: [{ scale: backdropDark.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1] }) }],
      }]} />
      <Animated.View style={[dm.blurLayer, dm.blurLayer2, {
        opacity: backdropBlur2,
        transform: [{ scale: backdropDark.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
      }]} />
      <Animated.View style={[dm.blurLayer, dm.blurLayer3, {
        opacity: backdropBlur3,
      }]} />
      <Animated.View style={[dm.darkOverlay, { opacity: backdropDark }]} />

      {/* ── Pressable dismiss area ────────────────────────────────── */}
      <Pressable style={dm.backdropPress} onPress={handleClose}>
        <View style={StyleSheet.absoluteFillObject} />
      </Pressable>

      {/* ── Card ──────────────────────────────────────────────────── */}
      <View style={dm.centerWrap} pointerEvents="box-none">
        <Animated.View style={[dm.card, {
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          opacity: fadeAnim,
        }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ maxHeight: "100%" }}>
            {/* Image header */}
            <View style={dm.imgWrap}>
              <Animated.Image
                source={{ uri: imgUri || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80" }}
                style={[dm.img, { transform: [{ scale: imgScale }] }]}
                resizeMode="cover"
              />
              <LinearGradient colors={["rgba(0,0,0,0.12)", "transparent", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.55)"]} style={StyleSheet.absoluteFillObject} />
              <TouchableOpacity onPress={handleClose} style={dm.closeBtn} activeOpacity={0.7}>
                <Feather name="x" size={15} color="#fff" />
              </TouchableOpacity>
              {hasDiscount && (
                <View style={dm.discBadge}>
                  <Text style={dm.discBadgeText}>{t("home.discountOffUpper", { count: discountPct })}</Text>
                </View>
              )}
              <View style={dm.priceOnImg}>
                <Text style={dm.priceOnImgText}>₹{price}</Text>
                {hasDiscount && <Text style={dm.mrpOnImgText}>₹{mrp}</Text>}
              </View>
            </View>

            {/* Body content */}
            <Animated.View style={[dm.body, {
              opacity: contentFade,
              transform: [{ translateY: contentSlide }],
            }]}>
              <Text style={dm.name}>{name}</Text>
              <Text style={dm.unit}>{unit}</Text>

              {description ? (
                <View style={dm.descBox}>
                  <View style={dm.descIconRow}>
                    <MaterialIcons name="info-outline" size={13} color={C.green} />
                    <Text style={dm.descLabel}>{t("home.description")}</Text>
                  </View>
                  <Text style={dm.descText}>{description}</Text>
                </View>
              ) : null}

              {hasDiscount && (
                <View style={dm.savingsPill}>
                  <MaterialIcons name="savings" size={14} color="#D97706" />
                  <Text style={dm.savingsText}>{t("home.youSave", { amount: mrp - price })}</Text>
                </View>
              )}

              {/* Divider with dots */}
              <View style={dm.dividerRow}>
                <View style={dm.dividerLine} />
                <View style={dm.dividerDot} />
                <View style={dm.dividerLine} />
              </View>

              <View style={dm.actionRow}>
                <View>
                  <Text style={dm.totalLabel}>{t("home.totalUpper")}</Text>
                  <Text style={dm.totalPrice}>₹{price}</Text>
                </View>
                {currentQty === 0 ? (
                  <TouchableOpacity style={dm.addBtn} onPress={() => { onAdd(item); handleClose(); }} activeOpacity={0.85}>
                    <MaterialIcons name="shopping-cart" size={16} color="#fff" />
                    <Text style={dm.addBtnText}>{t("home.addToCart")}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={dm.qtyRow}>
                    <TouchableOpacity style={dm.qtyBtn} onPress={() => onRemove(item)}>
                      <Feather name="minus" size={15} color="#fff" />
                    </TouchableOpacity>
                    <Text style={dm.qtyNum}>{currentQty}</Text>
                    <TouchableOpacity style={dm.qtyBtn} onPress={() => onAdd(item)}>
                      <Feather name="plus" size={15} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
          </ScrollView>

          {/* Bottom handle bar */}
          <View style={dm.handleWrap}>
            <View style={dm.handleBar} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  /* ── Blur backdrop layers ──────────────────────────────────────── */
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  blurLayer1: {
    backgroundColor: "rgba(180, 190, 210, 0.28)",
  },
  blurLayer2: {
    backgroundColor: "rgba(120, 130, 160, 0.22)",
  },
  blurLayer3: {
    backgroundColor: "rgba(80, 90, 120, 0.18)",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 25, 0.65)",
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 24,
  },
  card: {
    width: "100%", maxWidth: 380, maxHeight: "82%", backgroundColor: C.white,
    borderRadius: 26, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.38, shadowRadius: 40, elevation: 24,
  },
  imgWrap: { width: "100%", height: 210, backgroundColor: "#F3F4F5", position: "relative", overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  closeBtn: {
    position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.5)", borderWidth: 1.2, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  discBadge: {
    position: "absolute", top: 12, left: 12, backgroundColor: C.orange,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    shadowColor: C.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
  },
  discBadgeText: { fontSize: 11, color: C.white, fontWeight: "800" },
  priceOnImg: { position: "absolute", bottom: 12, left: 16, flexDirection: "row", alignItems: "baseline", gap: 6 },
  priceOnImgText: {
    fontSize: 30, fontWeight: "900", color: C.white,
    textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  mrpOnImgText: { fontSize: 14, color: "rgba(255,255,255,0.55)", textDecorationLine: "line-through" },
  body: { padding: 20 },
  name: { fontSize: 20, fontWeight: "900", color: C.gray900, lineHeight: 26, marginBottom: 4 },
  unit: { fontSize: 13, color: C.gray400, fontWeight: "500", marginBottom: 14 },
  descBox: {
    backgroundColor: C.greenLight, borderRadius: 14, padding: 14, marginBottom: 14,
    borderLeftWidth: 3.5, borderLeftColor: C.green,
  },
  descIconRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  descLabel: { fontSize: 10, fontWeight: "800", color: C.green, textTransform: "uppercase", letterSpacing: 0.6 },
  descText: { fontSize: 13.5, color: C.gray600, lineHeight: 20 },
  savingsPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FEF3C7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
  },
  savingsText: { fontSize: 12.5, color: "#92400E", fontWeight: "700" },
  dividerRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.gray100 },
  dividerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.gray200 },
  actionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  totalLabel: { fontSize: 10, color: C.gray400, fontWeight: "600", marginBottom: 2 },
  totalPrice: { fontSize: 26, fontWeight: "900", color: C.green },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.green, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
    shadowColor: C.green, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  addBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  qtyRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.green, borderRadius: 14, overflow: "hidden",
    shadowColor: C.green, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  qtyBtn: { paddingHorizontal: 18, paddingVertical: 13 },
  qtyNum: { fontSize: 16, fontWeight: "900", color: "#fff", minWidth: 34, textAlign: "center" },
  handleWrap: { alignItems: "center", paddingBottom: 8, paddingTop: 2 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.gray200 },
});

// ═════════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { t } = useTranslation();
  const { token, user } = useAuthStore();
  const navigation = useNavigation();
  const goToSearch = (focusField) => {
    const validFields = ["stores", "categories", "items"];
    const field = validFields.includes(focusField) ? focusField : null;
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Search',
        params: field ? { focusField: field } : undefined,
      })
    );
  };
  const addressStore = useAddressStore();
  const cart = useCartStore();

  const { currentLocation } = addressStore;

  const [selectedAddrId, setSelectedAddrId] = useState(addressStore.selectedId || null);


  // Derive locationShort label from selected address or GPS detecting
  const locationShort = useMemo(() => {
    if (selectedAddrId) {
      const found = addressStore?.addresses?.find((a) => a.id === selectedAddrId);
      if (found) {
        const addrText = found.address_line || found.address || "";
        const parts = addrText.split(",");
        return (
          [parts[0]?.trim(), parts[1]?.trim()].filter(Boolean).join(", ") ||
          addrText
        );
      }
    }
    return currentLocation.displayName || t("home.setLocation");
  }, [selectedAddrId, addressStore.addresses, currentLocation.displayName, t]);

  // Address picker state moved up to avoid ReferenceError in locationCoords

  const locationCoords = useMemo(() => {
    // If a specific address is selected, use its coordinates
    if (selectedAddrId) {
      const found = addressStore?.addresses?.find(a => a.id === selectedAddrId);
      if (found?.lat && found?.lng) return { lat: found.lat, lng: found.lng };
    }
    // Fallback to GPS detection
    return currentLocation.lat
      ? { lat: currentLocation.lat, lng: currentLocation.lng }
      : null;
  }, [currentLocation.lat, currentLocation.lng, selectedAddrId, addressStore.addresses]);
  const locationLoading = currentLocation.loading;

  const [vendors, setVendors] = useState([]);
  const vendorsRef = useRef(vendors);
  vendorsRef.current = vendors;
  const [recentOrders, setRecentOrders] = useState([]);
  // Kept for backward-compat (fetchPopularProducts still writes to it) but no
  // longer used in the popularItems derivation — popular items are now derived
  // entirely from live inventory, which the backend keeps current via global
  // product:updated socket broadcasts.
  const [popularFromAPI, setPopularFromAPI] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Store category filter
  const [selectedStoreCategory, setSelectedStoreCategory] = useState(null);
  const [storeCategories, setStoreCategories] = useState([]);

  // Category hierarchy from API
  const [apiCategories, setApiCategories] = useState([]);

  // Category browse sheet
  const [catSheetVisible, setCatSheetVisible] = useState(false);
  const [catSheetCategory, setCatSheetCategory] = useState(null);

  // Store picker
  const [pickerItem, setPickerItem] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loosePickerItem, setLoosePickerItem] = useState(null);
  const [popularDetailItem, setPopularDetailItem] = useState(null);
  const [catDetailItem, setCatDetailItem] = useState(null);

  // Address picker
  const [addrPickerVisible, setAddrPickerVisible] = useState(false);

  // Responsive
  const [winW, setWinW] = useState(() =>
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.innerWidth
      : Dimensions.get("window").width,
  );
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const wide = winW > 700;

  // ── Single source of truth for cart — read directly from cartStore ──────────
  // Do NOT maintain local itemQtys — it diverges from VendorStoreScreen changes
  const cartItems = cart?.items || [];
  const cartCount = cartItems.reduce((s, i) => s + (i.qty || 0), 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * (i.qty || 0), 0);
  const getCartQty = useCallback(
    (itemId) => cartItems.find((i) => i.id === itemId)?.qty || 0,
    [cartItems],
  );

  // Sync with addressStore
  useEffect(() => {
    if (addressStore.selectedId) {
      setSelectedAddrId(addressStore.selectedId);
    }
  }, [addressStore.selectedId]);

  // ── Animations ───────────────────────────────────────────────────────────────
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(16)).current;
  const floatingY = useRef(new Animated.Value(120)).current;
  const vendorListAnim = useRef(new Animated.Value(0)).current;
  const vendorListY = useRef(new Animated.Value(12)).current;
  const prevLoadingVendors = useRef(true);

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(contentY, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (wide) return;
    Animated.spring(floatingY, {
      toValue: cartCount > 0 ? 0 : 120,
      tension: 70,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [cartCount, wide]);

  useEffect(() => {
    if (prevLoadingVendors.current && !loadingVendors && vendors.length > 0) {
      vendorListAnim.setValue(0);
      vendorListY.setValue(12);
      Animated.parallel([
        Animated.timing(vendorListAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(vendorListY, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevLoadingVendors.current = loadingVendors;
  }, [loadingVendors, vendors.length]);

  useEffect(() => {
    if (locationCoords) {
      fetchNearbyVendors(locationCoords.lat, locationCoords.lng);
      fetchPopularProducts(locationCoords.lat, locationCoords.lng);
    }
  }, [locationCoords?.lat, locationCoords?.lng]);

  // ── Auto-refresh store open/closed status (no manual refresh needed) ─────────
  // Every 60s: force a re-render so the time-based OPEN/CLOSED check flips at the
  // minute boundary, and lightly re-pull the vendor list (status fields only — no
  // inventory re-fetch) to pick up toggle / hour changes from the vendor or admin.
  const [, forceStatusRefresh] = useReducer((x) => x + 1, 0);
  const refreshVendorStatus = useCallback(async () => {
    if (!locationCoords) return;
    try {
      const res = await vendorsAPI.getNearby(
        locationCoords.lat,
        locationCoords.lng,
        10,
        selectedStoreCategory,
      );
      const fresh = res.data || [];
      setVendors((prev) =>
        prev.map((v) => {
          const f = fresh.find((x) => x.id === v.id);
          return f
            ? {
              ...v,
              is_open: f.is_open,
              opening_time: f.opening_time,
              closing_time: f.closing_time,
              is_currently_open: f.is_currently_open,
            }
            : v;
        }),
      );
    } catch {
      // keep current statuses; the local time check still re-runs each minute
    }
  }, [locationCoords, selectedStoreCategory]);

  useEffect(() => {
    const interval = setInterval(() => {
      forceStatusRefresh();
      refreshVendorStatus();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshVendorStatus]);

  // ── Real-time store open/close updates ──────────────────────────────────────
  // The backend broadcasts 'shop:statusChanged' (with is_open) whenever a vendor
  // toggles their Store Status — for BOTH open and close directions. Update the
  // matching vendor in local state immediately so no manual refresh is needed.
  useEffect(() => {
    let socket;
    try {
      socket = io(SOCKET_URL, {
        auth: token ? { token } : {},
        transports: ["websocket"],
      });
      socket.on("shop:statusChanged", ({ vendorId, is_open }) => {
        if (vendorId == null || is_open === undefined) return;
        setVendors((prev) =>
          prev.map((v) =>
            v.id === Number(vendorId) || String(v.id) === String(vendorId)
              ? { ...v, is_open, is_currently_open: is_open }
              : v,
          ),
        );
      });
    } catch {
      // socket best-effort — the 60s status poll still covers sync
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [token]);

  // ── Real-time product updates for Popular Items / Home screen ──────────────────
  // The backend emits product:updated to ALL connected clients (global broadcast),
  // so we receive events for ANY vendor without needing store:join rooms.
  // We also join store:{vendorId} rooms as a belt-and-suspenders fallback.
  // Uses vendorsRef to avoid stale closures — the ref always holds the latest
  // vendors state without triggering effect re-runs on every state change.
  useEffect(() => {
    if (!token) return;
    let socket;
    const joinedRooms = new Set();

    const setupSocket = () => {
      try {
        socket = io(SOCKET_URL, {
          auth: { token },
          transports: ["websocket"],
        });

        socket.on("connect", () => {
          // Join store rooms for all vendors that currently have inventory
          const cur = vendorsRef.current;
          cur.forEach((v) => {
            if (v._inventory?.length && v.id && !joinedRooms.has(v.id)) {
              socket.emit("store:join", { storeId: v.id });
              joinedRooms.add(v.id);
            }
          });
        });

        socket.on("product:updated", ({ productId, available, vendorId, ...changed }) => {
          if (productId == null || vendorId == null) return;
          const pid = Number(productId);
          const vid = Number(vendorId);

          setVendors((prev) =>
            prev.map((vendor) => {
              if (vendor.id !== vid) return vendor;
              const inv = vendor._inventory || [];
              return {
                ...vendor,
                _inventory: inv.map((item) => {
                  const itemPid = Number(item.product_id || item.product?.id);
                  if (itemPid !== pid) return item;
                  const nextProduct = item.product ? { ...item.product } : { id: pid };
                  Object.keys(changed).forEach((k) => {
                    if (changed[k] !== undefined) nextProduct[k] = changed[k];
                  });
                  if (available !== undefined) {
                    nextProduct.is_active = available;
                    return { ...item, is_active: available, product: nextProduct };
                  }
                  return { ...item, product: nextProduct };
                }),
              };
            }),
          );
        });

        socket.on("product:deleted", ({ productId, vendorId }) => {
          if (productId == null || vendorId == null) return;
          const pid = Number(productId);
          const vid = Number(vendorId);

          setVendors((prev) =>
            prev.map((vendor) => {
              if (vendor.id !== vid) return vendor;
              const inv = vendor._inventory || [];
              return {
                ...vendor,
                _inventory: inv.filter(
                  (item) =>
                    Number(item.product_id || item.product?.id) !== pid,
                ),
              };
            }),
          );
        });
      } catch {
        // socket best-effort — page load still fetches fresh inventory
      }
    };

    setupSocket();

    // Periodically join rooms for newly-loaded vendors (ref always has latest list)
    const rejoinInterval = setInterval(() => {
      if (socket?.connected) {
        const cur = vendorsRef.current;
        cur.forEach((v) => {
          if (v._inventory?.length && v.id && !joinedRooms.has(v.id)) {
            socket.emit("store:join", { storeId: v.id });
            joinedRooms.add(v.id);
          }
        });
      }
    }, 5000);

    return () => {
      clearInterval(rejoinInterval);
      if (socket) socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (token) fetchRecentOrders();
  }, [token]);

  // Fetch category hierarchy (public endpoint — no auth needed)
  useEffect(() => {
    categoriesAPI.getAll()
      .then(res => setApiCategories(res.data?.categories || []))
      .catch(() => setApiCategories([]));
  }, []);

  // Fetch store categories for filter chips
  useEffect(() => {
    vendorsAPI.getStoreCategories()
      .then(res => setStoreCategories(res.data?.categories || []))
      .catch(() => setStoreCategories([]));
  }, []);

  // ── Handled by addressStore ──────────────────────────────────────────────────


  // ── Fetch popular products via api.js (respects BASE_URL + headers) ──────────
  const fetchPopularProducts = async (lat, lng) => {
    try {
      const res = await fetch(
        `${BASE_URL}/products/popular?lat=${lat}&lng=${lng}&radius_km=10&limit=12`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {},
      );
      const data = await res.json();
      const list = data.data || [];
      setPopularFromAPI(
        list.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit || "1 pc",
          price: p.price,
          orig: p.mrp != null && p.mrp > p.price ? p.mrp : null,
          img: p.image_url || null,
          category: p.category?.name || "Other",
          item_type: p.item_type,
          weight_options: p.weight_options,
        })),
      );
    } catch {
      // Silently fail — inventory-based fallback handles it
    }
  };

  // ── Fetch vendors then inventory — FIXED stale closure ───────────────────────
  // We pass the fresh vendor list directly to fetchInventoryForVendors
  // instead of reading from state (which hasn't updated yet)
  const fetchNearbyVendors = async (lat, lng, storeCategory = null) => {
    setLoadingVendors(true);
    try {
      const res = await vendorsAPI.getNearby(lat, lng, 10, storeCategory);
      const list = res.data || [];

      setVendors(list);
      setLoadingVendors(false);

      await fetchInventoryForVendors(list);
    } catch {
      setVendors([]);
      setLoadingVendors(false);
    }
  };

  const fetchInventoryForVendors = async (vendorList) => {
    if (!vendorList.length) return;
    setLoadingInventory(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const results = await Promise.all(
        vendorList.map((v) =>
          fetch(`${BASE_URL}/inventory/vendor/${v.id}?active_only=true`, { headers })
            .then((r) => r.json())
            .then((d) => {
              // Handle both array and wrapped response shapes
              const inv = Array.isArray(d) ? d : d.data || d.inventory || [];
              return { vendorId: v.id, inventory: inv };
            })
            .catch(() => ({ vendorId: v.id, inventory: [] })),
        ),
      );

      // Attach _inventory to each vendor — use functional updater
      // so we always merge against the latest state
      setVendors((prev) =>
        prev.map((v) => {
          const found = results.find((r) => r.vendorId === v.id);
          return { ...v, _inventory: found?.inventory || [] };
        }),
      );
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const res = await ordersAPI.getMyOrders(token, 1);
      setRecentOrders(res.data?.orders?.slice(0, 3) || []);
    } catch { }
  };

  // ── Derive categories from vendor inventories ──────────────────────────────
  const allInventoryItems = useMemo(() => {
    const items = [];
    vendors.forEach((v) => {
      (v._inventory || []).forEach((inv) => {
        if ((inv.product?.is_active ?? true) && inv.product) {
          items.push({ ...inv, _vendorId: v.id, _vendorName: v.shop_name });
        }
      });
    });
    return items;
  }, [vendors]);

  // ── Address Handlers ────────────────────────────────────────────────────────

  const normalizeCatName = (name) => {
    if (!name) return null;
    const EXCLUDE = new Set(["Personal Care", "personal care", "PersonalCare"]);
    if (EXCLUDE.has(name)) return null;
    const MAP = {
      Grocery: "Groceries",
      Snack: "Snacks",
      Beverage: "Beverages",
      Fruit: "Fruits",
      Medicine: "Medicines",
    };
    return MAP.hasOwnProperty(name) ? MAP[name] : name;
  };

  const getCategoryName = useCallback((inv) => {
    const p = inv.product;
    const cat = p?.category;
    let raw;
    if (cat && typeof cat === "object" && cat.name) raw = cat.name;
    else if (typeof cat === "string" && cat) raw = cat;
    else return null;
    return normalizeCatName(raw);
  }, []);

  const dynamicCategories = useMemo(() => {
    const seen = new Set();
    const cats = [];

    // Find all top-level categories (those without parent_id)
    const topLevelCats = apiCategories.filter(c => !c.parent_id);

    topLevelCats.forEach(c => {
      if (c.name && !seen.has(c.name)) {
        seen.add(c.name);

        const accent = CAT_ACCENT[c.name] || CAT_ACCENT._default;
        const fallbackImg = CAT_FALLBACK_IMGS[c.name] || CAT_FALLBACK_IMGS._default;

        cats.push({
          label: c.name,
          tag: c.name,
          img: c.image_url || fallbackImg,
          bg: accent.bg,
          accent: accent.accent,
          icon: accent.icon
        });
      }
    });
    // Preserve the backend order (display_order ASC from /products/categories),
    // NOT alphabetical — admin drag-and-drop reorder must show up here.
    return cats;
  }, [apiCategories]);

  // ── 3-level hierarchy for CategoryBrowseSheet ─────────────────────────────
  const categoryHierarchy = useMemo(
    () => buildHierarchyFromInventory(allInventoryItems, getCategoryName, apiCategories),
    [allInventoryItems, getCategoryName, apiCategories],
  );

  // ── Popular items — derived from live inventory only ────────────────────────
  // Backend broadcasts product:updated globally, so _inventory is always current.
  // No need for a separate popularFromAPI — it was stale after mount.
  const popularItems = useMemo(() => {
    const seenNames = new Set();
    const items = [];

    // Helper: Check if product has stock & active status in any nearby vendor
    const isStockAvailable = (productName, productId) => {
      return vendors.some((v) => {
        return (v._inventory || []).some((inv) => {
          if (!inv.product) return false;
          const matchId = productId && Number(inv.product_id || inv.product.id) === Number(productId);
          const matchName = productName && inv.product.name?.trim().toLowerCase() === productName.trim().toLowerCase();
          if (!matchId && !matchName) return false;

          const invActive = inv.is_active ?? true;
          const prodActive = inv.product.is_active ?? true;
          if (!invActive || !prodActive) return false;

          if (inv.stock_qty !== undefined && inv.stock_qty !== null && Number(inv.stock_qty) <= 0) return false;

          return true;
        });
      });
    };

    // First add all inventory items
    allInventoryItems.forEach((inv) => {
      const p = inv.product;
      if (!p?.id || !p?.name) return;
      const normName = p.name.trim().toLowerCase();
      if (seenNames.has(normName)) return;
      seenNames.add(normName);

      const catName = getCategoryName(inv) || "Other";
      const available = isStockAvailable(p.name, p.id);

      items.push({
        id: p.id,
        name: p.name,
        unit: p.unit || "1 pc",
        price: p.price,
        orig: p.mrp != null && p.mrp > p.price ? p.mrp : null,
        img: p.image_url || null,
        category: catName,
        item_type: p.item_type,
        weight_options: p.weight_options,
        isAvailableNearby: available,
      });
    });

    // Next add API products if available, marking whether available in nearby inventory
    if (popularFromAPI.length > 0) {
      popularFromAPI.forEach((p) => {
        if (!p?.id || !p?.name) return;
        const normName = p.name.trim().toLowerCase();
        if (seenNames.has(normName)) return;
        seenNames.add(normName);

        const available = isStockAvailable(p.name, p.id);
        items.push({
          ...p,
          isAvailableNearby: available,
        });
      });
    }

    return items;
  }, [popularFromAPI, allInventoryItems, vendors, getCategoryName]);

  // ── Address Handlers ────────────────────────────────────────────────────────
  const openAddressPicker = () => {
    // if (!selectedAddrId && addressStore?.addresses?.length > 0) {
    //   setSelectedAddrId(addressStore.addresses[0].id);
    // }
    setAddrPickerVisible(true);
  };

  const handleSelectAddress = (addr) => {
    setSelectedAddrId(addr.id);
    addressStore?.setSelectedId?.(addr.id);
    setAddrPickerVisible(false);
    if (addr.lat && addr.lng) {
      fetchNearbyVendors(addr.lat, addr.lng);
      fetchPopularProducts(addr.lat, addr.lng);
    }
  };


  // ── Cart helpers — reads from cartStore, no local qty state ───────────────
  // In handleAdd — check if THIS item is in cart, not just whether vendorId exists
  const handleAdd = useCallback(
    (item, selectedWeight = null) => {
      if (item.isAvailableNearby === false || item.product?.is_active === false) return;
      if (isLooseItem(item) && !selectedWeight) {
        setLoosePickerItem(item);
        return;
      }

      const itemInCart = cartItems.some((i) => i.id === item.id);
      const unitToUse = formatWeight(selectedWeight || item.unit);
      const finalPrice = isLooseItem(item)
        ? calculateProportionalPrice(item.price, unitToUse, item.unit || "1kg")
        : item.price;

      if (!itemInCart) {
        // Item not in cart at all — always show store picker so user picks a vendor
        setPickerItem({ ...item, selectedWeight: unitToUse, finalPrice });
        setPickerVisible(true);
        return;
      }

      // Item already in cart — just increment under the existing vendor
      cart?.addItem?.(
        {
          id: item.id,
          name: item.name,
          price: finalPrice,
          img: item.img,
          unit: unitToUse,
        },
        cart?.vendorId,
      );
    },
    [cart, cartItems],
  );

  const handleRemove = useCallback(
    (item) => {
      cart?.removeItem?.(item.id);
    },
    [cart],
  );

  const handleStoreSelect = useCallback(
    (vendor, item) => {
      setPickerVisible(false);
      cart?.addItem?.(
        {
          id: item.id,
          name: item.name,
          price: item.finalPrice || item.price,
          img: item.img,
          unit: item.selectedWeight || item.unit,
        },
        vendor.id,
      );
      navigation.navigate("VendorStore", {
        vendorId: vendor.id,
        vendorName: vendor.shop_name,
      });
    },
    [cart, navigation],
  );

  // ── Utilities ──────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("home.goodMorning");
    if (h < 17) return t("home.goodAfternoon");
    if (h < 21) return t("home.goodEvening");
    return t("home.goodNight");
  };

  const getStatusColor = (s) =>
    ({
      pending: "#D97706",
      accepted: "#2563EB",
      preparing: "#7C3AED",
      ready: C.green,
      delivered: C.greenDark,
      cancelled: "#DC2626",
    })[s] || C.gray400;

  const firstName = user?.name?.trim().split(" ")[0] || null;

  const hPad = winW >= 1024 ? 48 : winW >= 700 ? 28 : 16;
  const cols = wide ? (winW > 1200 ? 6 : winW > 900 ? 5 : 4) : 3;
  const cardW = Math.floor((winW - hPad * 2 - 12 * (cols - 1)) / cols);

  const showCategories = !loadingInventory && dynamicCategories.length > 0;
  const showPopular = !loadingInventory && popularItems.length > 0;
  const openStoreCount = vendors.filter((vendor) => isStoreCurrentlyOpen(vendor)).length;
  const nearestStoreDistance = vendors
    .map((vendor) => Number(vendor.distance_km))
    .filter((distance) => Number.isFinite(distance))
    .sort((a, b) => a - b)[0];
  const heroTitle = locationCoords
    ? t("home.heroTitleLocation")
    : t("home.heroTitleNoLocation");
  const heroSub = locationCoords
    ? t("home.heroSubLocation", { count: openStoreCount || vendors.length || t("home.local") })
    : t("home.heroSubNoLocation");
  const homeStats = [
    {
      icon: "storefront",
      value: vendors.length ? `${vendors.length}` : "--",
      label: t("home.nearbyStores"),
    },
    {
      icon: "inventory-2",
      value: popularItems.length ? `${popularItems.length}+` : "--",
      label: t("home.popularPicks"),
    },
    {
      icon: "near-me",
      value: nearestStoreDistance ? t("home.kmDistance", { count: nearestStoreDistance.toFixed(1) }) : t("home.nearYou"),
      label: t("home.closestStore"),
    },
  ];
  const quickActions = [
    { icon: "search", label: t("home.findStores"), onPress: goToSearch },
    { icon: "shopping-bag", label: t("home.openStores"), onPress: goToSearch },
  ];


  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <Animated.View style={[s.headerWrap, { opacity: headerOpacity }]}>
        {wide ? (
          <View style={[s.headerRow, { paddingHorizontal: hPad }]}>
            <TouchableOpacity
              style={s.brandSection}
              onPress={() => navigation.navigate("Home")}
              activeOpacity={0.8}
            >
              <View style={s.miniLogoWrap}>
                <LinearGradient
                  colors={["#147538", "#0EE627"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.miniLogo}
                >
                  <MaterialIcons name="storefront" size={17} color={C.white} />
                </LinearGradient>
              </View>
              {winW >= 900 && (
                <Text style={s.brandName}>
                  Kwik<Text style={s.brandAccent}>Pik</Text>
                </Text>
              )}
            </TouchableOpacity>
            <View style={s.headerDivider} />
            {/* {winW >= 900 && (
              <>
                <View style={s.brandSection}>
                  <View style={s.miniLogoWrap}>
                    <LinearGradient
                      colors={[C.orange, C.orangeDark]}
                      style={s.miniLogo}
                    >
                      <MaterialIcons name="shopping-cart" size={15} color={C.white} />
                    </LinearGradient>
                  </View>
                  <GradientText text="KwikPik" style={s.brandName} />
                </View>
                <View style={s.headerDivider} />
              </>
            )} */}
            <TouchableOpacity
              style={s.locationBtn}
              onPress={openAddressPicker}
              activeOpacity={0.75}
            >
              {locationLoading ? (
                <View style={s.locLoadRow}>
                  <ActivityIndicator
                    size="small"
                    color={C.green}
                    style={{ transform: [{ scale: 0.7 }] }}
                  />
                  <Text style={s.locLoadText}>{t("home.locating")}</Text>
                </View>
              ) : (
                <>
                  <Text style={s.locationTop}>{t("home.deliveringTo")}</Text>
                  <View style={s.locationBottomRow}>
                    <Text style={s.locationBottom} numberOfLines={1}>
                      {locationShort || t("home.setLocation")}
                    </Text>
                    <MaterialIcons name="expand-more" size={13} color={C.gray500} />
                  </View>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.webSearch}
              onPress={goToSearch}
              activeOpacity={0.8}
            >
              <MaterialIcons name="search" size={16} color={C.gray400} />
              <Text style={s.webSearchText} numberOfLines={1}>
                {winW < 850 ? t("home.searchShort") : t("home.searchPlaceholderWeb")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.accountBtn}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <MaterialIcons name="person" size={16} color={C.green} />
              {winW >= 900 && (
                <Text style={s.accountBtnText} numberOfLines={1}>
                  {firstName || t("home.account")}
                </Text>
              )}
              <MaterialIcons name="expand-more" size={13} color={C.gray500} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.cartBtn, cartCount > 0 && s.cartBtnActive]}
              onPress={() => navigation.navigate("Cart")}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="shopping-cart"
                size={16}
                color={cartCount > 0 ? C.white : C.green}
              />
              {winW >= 850 && (
                <Text
                  style={[s.cartBtnText, cartCount > 0 && { color: C.white }]}
                >
                  {cartCount > 0
                    ? t("home.itemsInCart", { count: cartCount })
                    : t("cart.title_short")}
                </Text>
              )}
              {cartCount > 0 && (
                <View style={s.cartBtnBadge}>
                  <Text style={s.cartBtnBadgeText}>₹{cartTotal}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Mobile header row: location (left) + account (right) ── */}
            <View style={[s.mobileRow1, { paddingHorizontal: hPad }]}>
              <TouchableOpacity
                style={s.mobileLocBtn}
                onPress={openAddressPicker}
                activeOpacity={0.75}
              >
                {locationLoading ? (
                  <View style={s.locLoadRow}>
                    <ActivityIndicator
                      size="small"
                      color={C.green}
                      style={{ transform: [{ scale: 0.7 }] }}
                    />
                    <Text style={s.locLoadText}>{t("home.locating")}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="location-on" size={20} color={C.green} />
                    <View style={{ flexShrink: 1 }}>
                      <Text style={s.locationTop}>{t("home.deliveringTo")}</Text>
                      <View style={s.locationBottomRow}>
                        <Text style={s.mobileLocBottom} numberOfLines={1}>
                          {locationShort || t("home.setLocation")}
                        </Text>
                        <MaterialIcons
                          name="expand-more"
                          size={15}
                          color={C.gray700}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              {/* Account icon — clean circle */}
              <TouchableOpacity
                style={s.mobileBrandBtn}
                onPress={() => navigation.navigate("Home")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#147538", "#0EE627"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.mobileBrandMark}
                >
                  <MaterialIcons name="storefront" size={18} color={C.white} />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.mobileProfileBtn}
                onPress={() => navigation.navigate("Profile")}
                activeOpacity={0.8}
              >
                <MaterialIcons name="account-circle" size={36} color={C.green} />
              </TouchableOpacity>
            </View>

            {/* ── Rounded pill search bar with mic ── */}
            <TouchableOpacity
              style={[s.mobileSearch, { marginHorizontal: hPad }]}
              onPress={goToSearch}
              activeOpacity={0.9}
            >
              <MaterialIcons name="search" size={18} color={C.gray400} />
              <Text style={s.mobileSearchText}>{t("home.searchHint")}</Text>
              <MaterialIcons name="mic" size={18} color={C.green} />
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentY }],
        }}
        contentContainerStyle={s.scroll}
      >
        {/* 1. GREETING */}
        <View style={s.legacyGreetingRow}>
          <Text style={s.greetingLine}>
            {getGreeting()}{firstName ? "," : "!"}
            {firstName ? (
              <Text style={s.greetingName}> {firstName}</Text>
            ) : null}
          </Text>
          <Text style={s.greetingEmoji}>👋</Text>
          <Text style={s.greetingSub}>
            {t("home.heroSubHeader")}
          </Text>
        </View>

        {/* 2. HERO BANNER */}
        <View style={[s.bannerWrap, { paddingHorizontal: hPad }]}>
          <View style={[s.heroIntro, wide && s.heroIntroWide]}>
            <View style={{ flex: 1 }}>
              <Text style={s.greetingKicker}>{getGreeting()}</Text>
              <Text style={s.heroIntroTitle}>
                {firstName ? t("home.welcomeBack", { name: firstName }) : t("home.welcomeGuest")}
              </Text>
            </View>
          </View>
          <View style={[s.heroBanner, { minHeight: wide ? 260 : 250 }]}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=85&sig=banner",
              }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                "rgba(17,24,39,0.86)",
                "rgba(21,128,61,0.76)",
                "rgba(249,115,22,0.38)",
                "rgba(17,24,39,0.12)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[s.heroLeft, { width: wide ? "62%" : "100%" }]}>
              <View style={s.heroBadge}>
                <MaterialIcons name="verified" size={13} color={C.green} />
                <Text style={s.heroBadgeText}>{t("home.freshFromNearby")}</Text>
              </View>
              <Text style={s.heroTitle}>{heroTitle}</Text>
              <Text style={s.heroSub}>{heroSub}</Text>
              {/* <View style={s.heroActions}>
                <TouchableOpacity
                  style={s.heroCTA}
                  onPress={goToSearch}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="search" size={16} color={C.white} />
                  <Text style={s.heroCTAText}>Start Shopping</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.heroGhostCTA}
                  onPress={openAddressPicker}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="location-on" size={15} color={C.white} />
                  <Text style={s.heroGhostText}>Change Address</Text>
                </TouchableOpacity>
              </View> */}
              {wide && (
                <View style={s.heroStats}>
                  {homeStats.map((stat) => (
                    <View key={stat.label} style={s.heroStat}>
                      <MaterialIcons name={stat.icon} size={16} color={C.white} />
                      <Text style={s.heroStatValue}>{stat.value}</Text>
                      <Text style={s.heroStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 3. CATEGORY ROW — mobile only (replaces stat boxes + quick actions on phones) */}
        {!wide && dynamicCategories.length > 0 && (
          <View style={s.mobileCatRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: hPad,
                paddingRight: hPad,
                paddingBottom: 8,
                gap: 10,
              }}
            >
              {dynamicCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  style={s.mobileCatChip}
                  onPress={() => {
                    const root = navigation.getParent?.() || navigation;
                    root.navigate("Search", { category: cat.label });
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[s.mobileCatIcon, { backgroundColor: cat.bg }]}>
                    <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                  </View>
                  <Text style={s.mobileCatChipText} numberOfLines={1}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick actions rail — desktop/tablet only */}
        {wide && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingLeft: hPad,
              paddingRight: hPad,
              paddingBottom: 8,
              gap: 10,
            }}
            style={s.quickActionRail}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={s.quickAction}
                onPress={action.onPress}
                activeOpacity={0.85}
              >
                <View style={s.quickActionIcon}>
                  <MaterialIcons name={action.icon} size={17} color={C.green} />
                </View>
                <Text style={s.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={[s.sectionHeader, { paddingHorizontal: hPad }]}>
          <View>
            <Text style={s.sectionTitle}>{t("home.nearbyStoresTitle")}</Text>
            <Text style={s.sectionSub}>{t("home.deliveringToYourLocation")}</Text>
          </View>
          <TouchableOpacity onPress={() => goToSearch("stores")}>
            <Text style={s.viewAll}>{t("home.explore")}</Text>
          </TouchableOpacity>
        </View>

        {/* Store Category Filter Chips */}
        {storeCategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: hPad, paddingBottom: 8, gap: 8 }}
            style={{ marginBottom: 8 }}
          >
            {/* All chip */}
            <TouchableOpacity
              style={[
                s.storeCatChip,
                selectedStoreCategory === null && s.storeCatChipActive,
              ]}
              onPress={() => {
                setSelectedStoreCategory(null);
                if (locationCoords) fetchNearbyVendors(locationCoords.lat, locationCoords.lng, null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[
                s.storeCatChipText,
                selectedStoreCategory === null && s.storeCatChipTextActive,
              ]}>
                🏪 {t("home.all")}
              </Text>
            </TouchableOpacity>
            {storeCategories.map(cat => {
              const isActive = selectedStoreCategory === cat;
              const catMeta = STORE_CATEGORY_META[cat] || STORE_CATEGORY_META._default;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[s.storeCatChip, isActive && s.storeCatChipActive]}
                  onPress={() => {
                    const newCat = isActive ? null : cat;
                    setSelectedStoreCategory(newCat);
                    if (locationCoords) fetchNearbyVendors(locationCoords.lat, locationCoords.lng, newCat);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.storeCatChipText, isActive && s.storeCatChipTextActive]}>
                    {catMeta.icon} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {loadingVendors ? (
          <View style={[s.loadingRow, { paddingHorizontal: hPad }]}>
            <ActivityIndicator size="small" color={C.green} />
            <Text style={s.loadingText}>{t("home.findingStores")}</Text>
          </View>
        ) : vendors.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <MaterialIcons name="location-on" size={26} color={C.green} />
            </View>
            <Text style={s.emptyTitle}>{t("home.noStoresNearby")}</Text>
            <Text style={s.emptySub}>{t("home.tryUpdatingLocation")}</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: vendorListAnim, transform: [{ translateY: vendorListY }] }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingLeft: hPad,
              paddingRight: 8,
              paddingBottom: 6,
            }}
          >
            {vendors.map((vendor) => {
              const isOpen = isStoreCurrentlyOpen(vendor);
              return (
                <TouchableOpacity
                  key={vendor.id}
                  style={[s.storeCard, wide && s.storeCardWide]}
                  disabled={!isOpen}
                  onPress={isOpen ? () =>
                    navigation.navigate("VendorStore", {
                      vendorId: vendor.id,
                      vendorName: vendor.shop_name,
                    })
                    : undefined}
                  activeOpacity={isOpen ? 0.88 : 1}
                >
                  {/* Everything except the CLOSED badge — dimmed when closed */}
                  <View
                    style={[
                      s.cardContent,
                      !isStoreCurrentlyOpen(vendor) && s.cardContentClosed,
                    ]}
                  >
                    <View style={s.storeImgWrap}>
                      <Image
                        source={{
                          uri:
                            vendor.shop_image_url ||
                            `https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&sig=${vendor.id}`,
                        }}
                        style={s.storeImg}
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.5)"]}
                        style={s.storeImgOverlay}
                      />
                      <View style={s.ratingBadge}>
                        <MaterialIcons name="star" size={10} color="#FBBF24" />
                        <Text style={s.ratingText}>
                          {vendor.avg_rating
                            ? parseFloat(vendor.avg_rating).toFixed(1)
                            : t("home.new")}
                        </Text>
                      </View>
                    </View>
                    <View style={s.storeInfo}>
                      <Text style={s.storeName} numberOfLines={1}>
                        {vendor.shop_name}
                      </Text>
                      <View style={s.storeMetaRow}>
                        <MaterialIcons name="location-on" size={10} color={C.green} />
                        <Text style={s.storeMeta}>
                          {vendor.distance_km
                            ? t("home.kmDistance", { count: parseFloat(vendor.distance_km).toFixed(1) })
                            : t("home.nearby")}
                        </Text>
                        <View style={s.metaDot} />
                        <MaterialIcons name="access-time" size={10} color={C.gray400} />
                        <Text style={s.storeMeta}>{t("home.deliveryTime")}</Text>
                      </View>
                      <View style={s.storeTagRow}>
                        {/* Min order — orange pill */}
                        <View style={[s.storeTag, { backgroundColor: C.orangeLight, borderColor: "#FED7AA" }]}>
                          <Text style={[s.storeTagText, { color: C.orangeDark }]}>
                            {t("home.minOrder", { min: vendor.min_order || 99 })}
                          </Text>
                        </View>
                        {isStoreCurrentlyOpen(vendor) && (
                          <View
                            style={[
                              s.storeTag,
                              {
                                backgroundColor: C.greenLight,
                                borderColor: C.greenBorder,
                              },
                            ]}
                          >
                            <Text style={[s.storeTagText, { color: C.green }]}>
                              {t("home.acceptingOrders")}
                            </Text>
                          </View>
                        )}
                        {vendor.vendor_type && vendor.vendor_type !== "all" &&
                          VENDOR_TYPE_META[vendor.vendor_type] && (
                            <View
                              style={[
                                s.storeTag,
                                {
                                  backgroundColor: VENDOR_TYPE_META[vendor.vendor_type].bg,
                                  borderColor: VENDOR_TYPE_META[vendor.vendor_type].bg,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  s.storeTagText,
                                  { color: VENDOR_TYPE_META[vendor.vendor_type].color },
                                ]}
                              >
                                {VENDOR_TYPE_META[vendor.vendor_type].label}
                              </Text>
                            </View>
                          )}
                      </View>
                    </View>
                  </View>

                  {/* OPEN/CLOSED pill — solid, no dot. Kept OUTSIDE the dimmed
                    wrapper so it always renders at full opacity and stays
                    clearly legible even on a CLOSED (dimmed) card. */}
                  <View
                    style={[
                      s.statusBadge,
                      {
                        backgroundColor: isStoreCurrentlyOpen(vendor)
                          ? C.green
                          : "rgba(0,0,0,0.72)",
                      },
                    ]}
                  >
                    <Text style={s.statusText}>
                      {isStoreCurrentlyOpen(vendor) ? t("home.open") : t("home.closed")}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          </Animated.View>
        )}

        {/* 4. SHOP BY CATEGORY */}
        {showCategories && (
          <>
            <View
              style={[
                s.sectionHeader,
                { marginTop: 24, paddingHorizontal: hPad },
              ]}
            >
              <Text style={s.sectionTitle}>{t("home.shopByCategory")}</Text>
              <TouchableOpacity onPress={() => goToSearch("categories")}>
                <Text style={s.viewAll}>{t("home.viewAll")}</Text>
              </TouchableOpacity>
            </View>
            {/* 4-column clean tile grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                paddingHorizontal: hPad,
                paddingBottom: 8,
                rowGap: 16,
                columnGap: 0,
              }}
            >
              {dynamicCategories.map((cat) => {
                const catCols = winW >= 1024 ? 10 : winW >= 768 ? 6 : winW >= 480 ? 5 : 4;
                const catItemW = (winW - (hPad * 2)) / catCols;
                const tileSize = catItemW * 0.72;

                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[s.catCard, { width: catItemW }]}
                    onPress={() => {
                      setCatSheetCategory(cat.label);
                      setCatSheetVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Square tile with image */}
                    <View
                      style={[
                        s.catTile,
                        {
                          width: tileSize,
                          height: tileSize,
                          backgroundColor: cat.bg,
                        },
                      ]}
                    >
                      <Image
                        source={{ uri: cat.img }}
                        style={{ width: tileSize * 0.72, height: tileSize * 0.72 }}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={s.catCardLabel} numberOfLines={2}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {loadingInventory && vendors.length > 0 && (
          <View
            style={[s.loadingRow, { paddingHorizontal: hPad, marginTop: 28 }]}
          >
            <ActivityIndicator size="small" color={C.green} />
            <Text style={s.loadingText}>{t("home.loadingProducts")}</Text>
          </View>
        )}

        {/* 5. POPULAR ITEMS — horizontal scroll like HTML reference */}
        {showPopular && (
          <>
            <View
              style={[
                s.sectionHeader,
                { marginTop: 28, paddingHorizontal: hPad },
              ]}
            >
              <Text style={s.sectionTitle}>{t("home.popularItemsTitle")}</Text>
              <TouchableOpacity onPress={() => goToSearch("items")}>
                <Text style={s.viewAll}>{t("home.seeAll")}</Text>
              </TouchableOpacity>
            </View>
            {/* Horizontal scroll cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingLeft: hPad,
                paddingRight: 8,
                paddingBottom: 8,
                gap: 14,
              }}
            >
              {popularItems.map((item) => (
                <PopularItemCard
                  key={item.id}
                  item={item}
                  qty={getCartQty(item.id)}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  onOpenWeightPicker={setLoosePickerItem}
                  onPress={() => setPopularDetailItem(item)}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* 6. RECENT ORDERS */}
        {recentOrders.length > 0 && (
          <>
            <View
              style={[
                s.sectionHeader,
                { marginTop: 28, paddingHorizontal: hPad },
              ]}
            >
              <Text style={s.sectionTitle}>{t("home.recentOrders")}</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
                <Text style={s.viewAll}>{t("home.viewAll")}</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[s.orderCard, { marginHorizontal: hPad }]}
                onPress={() => navigation.navigate("Orders")}
                activeOpacity={0.85}
              >
                <Image
                  source={{
                    uri:
                      order.vendor?.shop_image_url ||
                      `https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&sig=${order.vendor_id}`,
                  }}
                  style={s.orderImg}
                />
                <View style={s.orderInfo}>
                  <Text style={s.orderStore} numberOfLines={1}>
                    {order.vendor?.shop_name || t("home.store")}
                  </Text>
                  <Text style={s.orderMeta}>
                    {order.order_number} · ₹{order.total}
                  </Text>
                </View>
                <View
                  style={[
                    s.statusPill,
                    { backgroundColor: getStatusColor(order.status) + "18" },
                  ]}
                >
                  <Text
                    style={[
                      s.statusPillText,
                      { color: getStatusColor(order.status) },
                    ]}
                  >
                    {order.status.charAt(0).toUpperCase() +
                      order.status.slice(1)}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={15}
                  color={C.gray300}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: wide ? 60 : 130 }} />
      </Animated.ScrollView>

      {/* ══ ADDRESS PICKER MODAL ═══════════════════════════════════════════ */}
      <AddressPicker
        visible={addrPickerVisible}
        addresses={(addressStore?.addresses || []).filter(a => a.label !== "Current Location")}
        selectedId={selectedAddrId}
        initialCoords={locationCoords}
        onClose={() => setAddrPickerVisible(false)}
        onSelect={handleSelectAddress}
        onDelete={(id) => addressStore.removeAddress(id, token)}
        onUpdate={async (id, patch) => {
          await addressStore.updateAddress(id, patch, token);
        }}
        onSaveNew={async (text, coords) => {
          let lat = coords?.lat ?? null,
            lng = coords?.lng ?? null;
          if (!lat || !lng) {
            try {
              const encoded = encodeURIComponent(text);
              const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
                { headers: { "User-Agent": "KwikPik/1.0" } },
              );
              const results = await res.json();
              if (results?.length > 0) {
                lat = parseFloat(results[0].lat);
                lng = parseFloat(results[0].lon);
              }
            } catch { }
          }

          // addAddress now returns the real ID
          const newId = await addressStore?.addAddress?.({ address: text, lat, lng }, token);
          if (newId) {
            setSelectedAddrId(newId);
            addressStore?.setSelectedId?.(newId);
          }
          if (lat && lng) {
            fetchNearbyVendors(lat, lng);
            fetchPopularProducts(lat, lng);
          }
          setAddrPickerVisible(false);
        }}
      />

      {/* ══ WEIGHPICKER MODAL ═════════════════════════════════════════════ */}
      <WeightPickerModal
        item={loosePickerItem}
        onClose={() => setLoosePickerItem(null)}
        onAdd={handleAdd}
      />

      {/* ══ POPULAR ITEM DETAIL MODAL ══════════════════════════════════════ */}
      <ItemDetailModal
        item={popularDetailItem}
        qty={popularDetailItem ? getCartQty(popularDetailItem.id) : 0}
        onClose={() => setPopularDetailItem(null)}
        onAdd={(item) => handleAdd(item)}
        onRemove={(item) => handleRemove(item)}
      />

      {/* ══ CATEGORY ITEM DETAIL MODAL ══════════════════════════════════════ */}
      <ItemDetailModal
        item={catDetailItem}
        qty={catDetailItem ? getCartQty(catDetailItem.id) : 0}
        onClose={() => setCatDetailItem(null)}
        onAdd={(item) => handleAdd(item)}
        onRemove={(item) => handleRemove(item)}
      />

      {/* ══ STORE PICKER MODAL ═════════════════════════════════════════════ */}
      <StorePicker
        visible={pickerVisible}
        item={pickerItem}
        vendors={vendors}
        onClose={() => setPickerVisible(false)}
        onSelectStore={handleStoreSelect}
      />

      {/* ══ CATEGORY BROWSE SHEET ══════════════════════════════════════════ */}
      <CategoryBrowseSheet
        visible={catSheetVisible}
        category={catSheetCategory}
        hierarchy={categoryHierarchy}
        allInventoryItems={allInventoryItems}
        onClose={() => setCatSheetVisible(false)}
        onAdd={handleAdd}
        onRemove={handleRemove}
        getCartQty={getCartQty}
        onOpenWeightPicker={setLoosePickerItem}
        vendors={vendors}
        onStoreSelect={handleStoreSelect}
        apiCategories={apiCategories}
        onItemDetail={(item, product) => {
          setCatSheetVisible(false);
          setTimeout(() => {
            setCatDetailItem({
              id: product.id,
              name: product.name,
              price: product.price,
              img: product.image_url || null,
              unit: product.unit || "1 pc",
              orig: product.mrp && product.mrp > product.price ? product.mrp : null,
              description: product.description || null,
              category: catSheetCategory,
              item_type: product.item_type,
              weight_options: product.weight_options,
            });
          }, 300);
        }}
      />

      {/* <ChatWidget /> */}

      {/* ══ FLOATING CART — mobile ══════════════════════════════════════════ */}
      {!wide && cartCount > 0 && (
        <Animated.View
          style={[s.floatingCart, { transform: [{ translateY: floatingY }] }]}
        >
          <View style={s.floatingLeft}>
            {/* Basket icon with orange count badge */}
            <View style={{ position: "relative" }}>
              <MaterialIcons name="shopping-basket" size={30} color={C.white} />
              <View style={s.floatingCountBadge}>
                <Text style={s.floatingCountBadgeText}>{cartCount}</Text>
              </View>
            </View>
            <View>
              <Text style={s.floatingItems}>
                {t("home.itemsAdded", { count: cartCount })}
              </Text>
              <Text style={s.floatingTotal}>{t("home.totalAmount", { amount: cartTotal })}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.floatingCTA}
            onPress={() => navigation.navigate("Cart")}
            activeOpacity={0.85}
          >
            <Text style={s.floatingCTAText}>{t("home.viewCart")}</Text>
            <MaterialIcons name="arrow-forward" size={14} color={C.white} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles (unchanged from your original) ────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  headerWrap: {
    backgroundColor: C.white,
    paddingTop: Platform.OS === "android" ? 18 : 22,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  accentLine: { height: 0 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 20,
    paddingTop: 4,
    gap: 0,
  },
  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  miniLogoWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  miniLogo: { flex: 1, alignItems: "center", justifyContent: "center" },
  brandName: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    color: C.gray900,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  brandAccent: { color: "#0EE627" },
  headerDivider: {
    width: 1,
    height: 38,
    backgroundColor: C.gray200,
    marginHorizontal: 16,
    flexShrink: 0,
  },
  locationBtn: {
    flexShrink: 0,
    minWidth: 120,
    maxWidth: 220,
    justifyContent: "center",
    marginRight: 16,
  },
  locLoadRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locLoadText: { fontSize: 12, color: C.gray500 },
  locationTop: {
    fontSize: 12,
    color: C.gray500,
    fontWeight: "500",
    lineHeight: 15,
  },
  locationBottomRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationBottom: {
    fontSize: 17,
    fontWeight: "800",
    color: C.gray900,
    flexShrink: 1,
  },
  webSearch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.gray100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 10,
    minWidth: 80,
  },
  webSearchText: { flex: 1, fontSize: 15, color: C.gray400 },
  accountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gray200,
    marginRight: 8,
    flexShrink: 0,
  },
  accountBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gray700,
    maxWidth: 90,
  },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.gray100,
    flexShrink: 0,
  },
  cartBtnActive: { backgroundColor: C.green, borderColor: C.green },
  cartBtnText: { fontSize: 14, fontWeight: "700", color: C.gray700 },
  cartBtnBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cartBtnBadgeText: { fontSize: 11, fontWeight: "800", color: C.white },
  mobileRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingTop: 4,
  },
  mobileLocBtn: { flex: 1, marginRight: 8 },
  mobileLocBottom: { fontSize: 18, fontWeight: "700", color: C.gray900, flexShrink: 1 },
  mobileProfileBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  mobileBrandBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    marginRight: 8,
    overflow: "hidden",
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 3,
  },
  mobileBrandMark: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileAvatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.greenLight,
    overflow: "hidden",
  },
  mobileSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.gray100,
    borderRadius: 9999,
    borderWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  mobileSearchText: { flex: 1, fontSize: 15, color: C.gray400 },
  scroll: { paddingBottom: 40 },
  legacyGreetingRow: { display: "none" },
  greetingRow: { paddingTop: 14, paddingBottom: 12 },
  greetingLine: {
    fontSize: 22,
    color: C.gray900,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    lineHeight: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  greetingName: {
    color: C.gray900,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  greetingEmoji: { fontSize: 24, marginTop: 2 },
  greetingSub: { fontSize: 13, color: C.gray500, marginTop: 4, fontWeight: "400" },
  bannerWrap: { marginBottom: 14 },
  heroIntro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  heroIntroWide: { paddingTop: 18 },
  greetingKicker: {
    fontSize: 12,
    color: C.green,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroIntroTitle: {
    fontSize: 22,
    color: C.gray900,
    fontWeight: "900",
    lineHeight: 29,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  deliveryPromise: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.orangeLight,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  deliveryPromiseText: {
    fontSize: 11,
    color: C.orangeDark,
    fontWeight: "800",
  },
  heroBanner: {
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "center",
  },
  heroLeft: { paddingHorizontal: 22, paddingVertical: 22, zIndex: 2 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.greenDark,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: C.white,
    lineHeight: 34,
    marginBottom: 8,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 520,
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  heroCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.green,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9999,
    shadowColor: C.greenDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroCTAText: { fontSize: 14, fontWeight: "800", color: C.white },
  heroGhostCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroGhostText: { fontSize: 13, fontWeight: "800", color: C.white },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroStat: {
    minWidth: 96,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: "900",
    color: C.white,
    marginTop: 4,
  },
  heroStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.78)",
    marginTop: 1,
    fontWeight: "600",
  },
  quickActionRail: { marginBottom: 16 },
  mobileCatRow: { marginBottom: 8 },
  mobileCatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 128,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  mobileCatIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileCatChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.gray800,
    flexShrink: 1,
  },
  quickAction: {
    minWidth: 132,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.gray200,
    paddingHorizontal: 12,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  quickActionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.gray800,
  },
  infoPillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoPillText: { fontSize: 12, color: C.gray500, fontWeight: "500" },
  infoPillDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.gray300,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.gray900,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  sectionSub: { fontSize: 12, color: C.gray400, marginTop: 2 },
  viewAll: { fontSize: 13, color: C.green, fontWeight: "700", marginTop: 2 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  loadingText: { fontSize: 14, color: C.gray400 },
  emptyBox: { alignItems: "center", paddingVertical: 36 },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.gray700 },
  emptySub: { fontSize: 13, color: C.gray400, marginTop: 3 },
  storeImgWrap: { position: "relative" },
  storeImg: { width: "100%", height: 180 },
  // CLOSED cards dim all inner content (image, name, meta, tags) to ~50% so they
  // read as clearly unavailable at a glance. The CLOSED badge is a sibling of
  // this wrapper (not a descendant) so React Native's group-opacity can't fade it.
  cardContent: { opacity: 1 },
  cardContentClosed: { opacity: 0.5 },
  storeImgOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
  },
  statusBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusText: { fontSize: 10, color: C.white, fontWeight: "800", letterSpacing: 0.5 },
  ratingBadge: {
    position: "absolute",
    bottom: 9,
    right: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  ratingText: { fontSize: 11, fontWeight: "800", color: C.gray900 },
  storeInfo: { padding: 14 },
  storeName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.gray900,
    marginBottom: 5,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  storeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 9,
  },
  storeMeta: { fontSize: 11, color: C.gray500 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.gray300,
  },
  storeTagRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  storeTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: C.gray100,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  storeTagText: { fontSize: 10, color: C.gray600, fontWeight: "600" },
  storeCard: {
    position: "relative",
    width: 280,
    marginRight: 18,
    marginBottom: 4,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.gray200,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  storeCardWide: { width: 320 },
  // ── Legacy catChip kept for SearchScreen compatibility ──
  catChip: { alignItems: "center", marginRight: 22, width: 124 },
  catChipWide: { width: 144 },
  catImg: { width: "100%", height: "100%" },
  catLabel: { fontSize: 15, color: C.gray900, fontWeight: "800", textAlign: "center" },

  // ── New category card (HomeScreen) ─────────────────────────────────────────
  catCard: {
    alignItems: 'center',
    marginBottom: 4,
  },
  // New HTML-style clean tile
  catTile: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  // Keep legacy styles for CategoryBrowseSheet compatibility
  catCardBand: {
    borderRadius: 22,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: C.white,
    padding: 9,
  },
  catCardEmojiWrap: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCardEmoji: { textAlign: 'center' },
  catCardImgWrap: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  catCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.gray800,
    textAlign: 'center',
    paddingHorizontal: 2,
    lineHeight: 13,
  },
  // keep catImgWrap for compatibility
  catImgWrap: {
    width: 114, height: 114, borderRadius: 28, overflow: 'hidden',
    marginBottom: 10, elevation: 3,
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  orderImg: { width: 54, height: 54, borderRadius: 12, marginRight: 12 },
  orderInfo: { flex: 1 },
  orderStore: { fontSize: 14, fontWeight: "700", color: C.gray900 },
  orderMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 13,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.gray200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  floatingCart: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: C.green,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 18,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 99,
  },
  floatingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  floatingCountBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: C.orange,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.green,
  },
  floatingCountBadgeText: { fontSize: 9, fontWeight: "900", color: C.white },
  floatingBadge: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingBadgeText: { fontSize: 14, fontWeight: "900", color: C.white },
  floatingItems: { fontSize: 14, fontWeight: "700", color: C.white },
  floatingTotal: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  floatingCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11,
  },
  floatingCTAText: { fontSize: 14, fontWeight: "800", color: C.white },

  // Store category filter chips
  storeCatChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.gray100,
    borderWidth: 1.5,
    borderColor: C.gray200,
  },
  storeCatChipActive: {
    backgroundColor: C.greenLight,
    borderColor: C.green,
  },
  storeCatChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray700,
  },
  storeCatChipTextActive: {
    color: C.green,
  },
});


