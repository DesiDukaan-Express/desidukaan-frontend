import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
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
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import { useNavigation } from "@react-navigation/native";
import { vendorsAPI, ordersAPI, categoriesAPI } from "../../services/api";
import { calculateProportionalPrice } from "../../utils/weightUtils";

// ── Use env var — works on device, emulator, and web ─────────────────────────
// In your .env: EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange: "#F97316",
  orangeDark: "#EA580C",
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
  onUseLocation,
  onDelete,
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const [inputErr, setInputErr] = React.useState("");

  React.useEffect(() => {
    if (!visible) {
      setShowForm(false);
      setInputText("");
      setInputErr("");
    }
  }, [visible]);

  const handleSave = () => {
    if (inputText.trim().length < 5) {
      setInputErr("Please enter a valid address (at least 5 characters)");
      return;
    }
    onSaveNew(inputText.trim());
    setInputText("");
    setInputErr("");
    setShowForm(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={ap.backdrop} onPress={onClose}>
        <Pressable style={ap.sheet} onPress={() => { }}>
          <View style={ap.handle} />
          <View style={ap.titleRow}>
            <Text style={ap.title}>
              {showForm ? "Add new address" : "Select delivery address"}
            </Text>
            <TouchableOpacity
              onPress={() => (showForm ? setShowForm(false) : onClose())}
              style={ap.closeBtn}
            >
              <Feather
                name={showForm ? "arrow-left" : "x"}
                size={16}
                color={C.gray500}
              />
            </TouchableOpacity>
          </View>

          {showForm ? (
            <View style={ap.formWrap}>
              <Text style={ap.formLabel}>Full address</Text>
              <View style={[ap.inputBox, inputErr ? ap.inputBoxError : null]}>
                <Feather
                  name="map-pin"
                  size={15}
                  color={inputErr ? "#DC2626" : C.green}
                  style={{ marginLeft: 14 }}
                />
                <TextInput
                  style={ap.input}
                  placeholder="House no., street, area, city…"
                  placeholderTextColor={C.gray400}
                  value={inputText}
                  onChangeText={(t) => {
                    setInputText(t);
                    setInputErr("");
                  }}
                  multiline
                  numberOfLines={3}
                  autoFocus
                  underlineColorAndroid="transparent"
                />
              </View>
              {inputErr ? <Text style={ap.inputErr}>{inputErr}</Text> : null}
              <TouchableOpacity
                style={[
                  ap.saveBtn,
                  inputText.trim().length < 5 && ap.saveBtnDisabled,
                ]}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={inputText.trim().length < 5}
              >
                <Feather name="check" size={16} color={C.white} />
                <Text style={ap.saveBtnText}>Save address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={ap.locationRow}
                onPress={onUseLocation}
                activeOpacity={0.8}
              >
                <View style={ap.locationIconWrap}>
                  <Feather name="crosshair" size={18} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ap.locationRowTitle}>Use current location</Text>
                  <Text style={ap.locationRowSub}>
                    Detect my location automatically
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.gray400} />
              </TouchableOpacity>
              <View style={ap.divider} />
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 300 }}
              >
                {addresses.length === 0 ? (
                  <View style={ap.emptyWrap}>
                    <Feather name="map-pin" size={28} color={C.gray300} />
                    <Text style={ap.emptyText}>No saved addresses yet</Text>
                  </View>
                ) : (
                  addresses.map((addr) => {
                    const isActive = addr.id === selectedId;
                    const displayText = addr.address_line || addr.address || "";
                    return (
                      <View key={addr.id} style={ap.addrRowWrapper}>
                        <TouchableOpacity
                          style={[ap.addrRow, isActive && { borderColor: C.green, backgroundColor: C.greenLight }]}
                          onPress={() => onSelect(addr)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              ap.addrIconWrap,
                              isActive && { backgroundColor: C.green },
                            ]}
                          >
                            <Feather
                              name="map-pin"
                              size={15}
                              color={isActive ? C.white : C.gray500}
                            />
                          </View>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={[
                                ap.addrLabel,
                                isActive && { color: C.greenDark },
                              ]}
                            >
                              {addr.label || "Home"}
                            </Text>
                            <Text style={ap.addrText} numberOfLines={2}>
                              {displayText}
                            </Text>
                          </View>
                          {isActive && (
                            <View style={ap.activeTick}>
                              <Feather name="check" size={12} color={C.white} />
                            </View>
                          )}
                        </TouchableOpacity>

                        {!isActive && (
                          <TouchableOpacity
                            style={ap.deleteBtn}
                            onPress={() => onDelete && onDelete(addr.id)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Feather name="trash-2" size={16} color={C.red} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </ScrollView>
              <TouchableOpacity
                style={ap.addNewBtn}
                onPress={() => setShowForm(true)}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={16} color={C.green} />
                <Text style={ap.addNewText}>Add new address</Text>
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
    backgroundColor: "rgba(0,0,0,0.45)",
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
  addrRowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.redLight,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  locationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  locationRowTitle: { fontSize: 15, fontWeight: "700", color: C.gray900 },
  locationRowSub: { fontSize: 12, color: C.gray400, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.gray100, marginVertical: 12 },
  emptyWrap: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: C.gray400 },
  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  addrRowActive: { borderColor: C.green, backgroundColor: C.greenLight },
  addrIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addrIconActive: { backgroundColor: C.green },
  addrLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gray900,
    textTransform: "capitalize",
  },
  addrLabelActive: { color: C.greenDark },
  addrText: { fontSize: 12, color: C.gray500, lineHeight: 17 },
  activeTick: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addNewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.greenBorder,
    backgroundColor: C.greenLight,
  },
  addNewText: { fontSize: 15, fontWeight: "700", color: C.green },
  formWrap: { paddingTop: 4 },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.gray700,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.greenLight,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.greenBorder,
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
  },
  inputErr: { fontSize: 12, color: "#DC2626", marginTop: 6, fontWeight: "500" },
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
});

// ─── Store Picker Modal ────────────────────────────────────────────────────────
function StorePicker({ visible, item, vendors, onClose, onSelectStore }) {
  if (!item) return null;

  const vendorsWithItem = vendors.filter((v) =>
    v._inventory?.some(
      (inv) => inv.product?.id === item.id && inv.stock_qty > 0,
    ),
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
          <Text style={sp.sheetTitle}>Choose a store</Text>
          <Text style={sp.sheetSub}>
            Stores that have <Text style={sp.itemName}>{item.name}</Text> in
            stock
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 16 }}
          >
            {vendorsWithItem.length === 0 ? (
              <View style={sp.emptyWrap}>
                <Feather name="alert-circle" size={32} color={C.gray300} />
                <Text style={sp.emptyText}>
                  No stores nearby carry this item right now.
                </Text>
              </View>
            ) : (
              vendorsWithItem.map((v) => {
                const invItem = v._inventory?.find(
                  (inv) => inv.product?.id === item.id,
                );
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
                        <Feather name="map-pin" size={11} color={C.green} />
                        <Text style={sp.storeMetaText}>
                          {v.distance_km
                            ? `${parseFloat(v.distance_km).toFixed(1)} km`
                            : "Nearby"}
                        </Text>
                        <View style={sp.dot} />
                        <Feather name="clock" size={11} color={C.gray400} />
                        <Text style={sp.storeMetaText}>30 min</Text>
                      </View>
                      <Text style={sp.storePrice}>
                        ₹{price} <Text style={sp.storeUnit}>· {formatWeight(item.selectedWeight || item.unit)}</Text>
                      </Text>
                    </View>
                    <View style={sp.addStoreBtn}>
                      <Text style={sp.addStoreBtnText}>Add</Text>
                      <Feather name="arrow-right" size={13} color={C.white} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity style={sp.cancelBtn} onPress={onClose}>
            <Text style={sp.cancelText}>Cancel</Text>
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

// ─── Category fallback images ──────────────────────────────────────────────────
const CAT_FALLBACK_IMGS = {
  Groceries:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
  Dairy: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80",
  Snacks:
    "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
  Beverages:
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80",
  Bakery:
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
  Fruits:
    "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80",
  Medicines:
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
  "Personal Care":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80",
  _default:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
};

// ─── Category accent colours (top-level) ──────────────────────────────────────
const CAT_ACCENT = {
  "Dairy, Bread & Eggs":      { bg: "#EFF6FF", accent: "#2563EB", icon: "🥛" },
  "Fruits & Vegetables":     { bg: "#ECFDF5", accent: "#059669", icon: "🍎" },
  "Cold Drinks & Juices":    { bg: "#F0FDF4", accent: "#16A34A", icon: "🧃" },
  "Snacks & Munchies":       { bg: "#FFF7ED", accent: "#EA580C", icon: "🍿" },
  "Breakfast & Instant Food": { bg: "#FEF9C3", accent: "#CA8A04", icon: "🥣" },
  "Sweet Tooth":             { bg: "#FDF4FF", accent: "#9333EA", icon: "🍫" },
  "Bakery & Biscuits":       { bg: "#FFF1F2", accent: "#E11D48", icon: "🍪" },
  "Tea, Coffee & Milk Drinks": { bg: "#F5F5F4", accent: "#57534E", icon: "☕" },
  "Atta, Rice & Dal":        { bg: "#FEFCE8", accent: "#A16207", icon: "🌾" },
  "Masala, Oil & More":      { bg: "#FFF7ED", accent: "#C2410C", icon: "🌶️" },
  "Sauces & Spreads":        { bg: "#F0FDFA", accent: "#0D9488", icon: "🥫" },
  "Cleaning Essentials":     { bg: "#F0F9FF", accent: "#0284C7", icon: "🧼" },
  "Personal Care":           { bg: "#FAF5FF", accent: "#7C3AED", icon: "🧴" },
  "Home & Office":           { bg: "#F8FAFC", accent: "#475569", icon: "🖇️" },
  _default:                  { bg: "#F3F4F6", accent: "#6B7280", icon: "📦" },
};

// ─── Build 3-level hierarchy from flat inventory ───────────────────────────────
// Returns: { [topCatName]: { [subCatName]: inventoryItem[] } }
// We use the category NAME only (no parent_id from API categories since inventory
// only gives us product.category). The apiCategoryTree provides parent lookup.
function buildHierarchyFromInventory(allInventoryItems, getCategoryName, apiCategories) {
  // Build a parent lookup from API categories: catName → parentName
  const parentOf = {};  // catName → parentCatName | null
  const catById  = {};  // id → {name, parent_id}
  if (apiCategories && apiCategories.length > 0) {
    apiCategories.forEach(c => { catById[c.id] = c; });
    apiCategories.forEach(c => {
      if (c.parent_id && catById[c.parent_id]) {
        parentOf[c.name] = catById[c.parent_id].name;
      } else {
        parentOf[c.name] = null; // top-level
      }
    });
  }

  const hierarchy = {};  // { topCat: { subCat: [inv, ...] } }

  allInventoryItems.forEach(inv => {
    const catName = getCategoryName(inv);
    if (!catName) return;

    let topCat, subCat;
    if (parentOf.hasOwnProperty(catName)) {
      // We have API hierarchy data
      if (parentOf[catName] === null) {
        // This IS a top-level category — put product under "All" sub-cat
        topCat = catName;
        subCat = "All";
      } else {
        // It's a sub-category
        topCat = parentOf[catName];
        subCat = catName;
      }
    } else {
      // No API data — treat catName as top-level, sub-cat = product's unit as particulars group
      topCat = catName;
      const p = inv.product;
      // Group by unit as a proxy for sub-category (e.g. "500 ml", "1 kg")
      subCat = p?.unit || "General";
    }

    if (!hierarchy[topCat]) hierarchy[topCat] = {};
    if (!hierarchy[topCat][subCat]) hierarchy[topCat][subCat] = [];
    hierarchy[topCat][subCat].push(inv);
  });

  return hierarchy;
}

// ─── Category Browse Sheet ─────────────────────────────────────────────────────
function CategoryBrowseSheet({
  visible, category, hierarchy, onClose,
  onAdd, onRemove, getCartQty, onOpenWeightPicker, vendors,
  onStoreSelect, apiCategories,
}) {
  const [activeSubCat, setActiveSubCat] = React.useState(null);
  const subCats = category && hierarchy[category] ? Object.keys(hierarchy[category]) : [];

  React.useEffect(() => {
    if (visible && subCats.length > 0) {
      setActiveSubCat(subCats[0]);
    }
  }, [visible, category]);

  if (!visible || !category) return null;

  const subCatItems = (activeSubCat && hierarchy[category]?.[activeSubCat]) || [];
  const catAccent = CAT_ACCENT[category] || CAT_ACCENT._default;
  const apiCat = apiCategories?.find(c => c.name === category);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={cbs.backdrop} onPress={onClose}>
        <Pressable style={cbs.sheet} onPress={() => {}}>
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
              <Text style={cbs.headerCat}>Category</Text>
              <Text style={cbs.headerTitle}>{category}</Text>
            </View>
            <TouchableOpacity style={cbs.closeBtn} onPress={onClose}>
              <Feather name="x" size={16} color={C.gray500} />
            </TouchableOpacity>
          </View>

          {/* ── Sub-Category Pills ── */}
          {subCats.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={cbs.subCatRow}
            >
              {subCats.map(sc => {
                const isActive = sc === activeSubCat;
                const count = hierarchy[category]?.[sc]?.length || 0;
                return (
                  <TouchableOpacity
                    key={sc}
                    style={[
                      cbs.subCatChip,
                      isActive && { backgroundColor: catAccent.accent, borderColor: catAccent.accent },
                    ]}
                    onPress={() => setActiveSubCat(sc)}
                    activeOpacity={0.8}
                  >
                    <Text style={[cbs.subCatChipText, isActive && { color: C.white }]}>
                      {sc}
                    </Text>
                    <View style={[cbs.subCatCount, isActive && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                      <Text style={[cbs.subCatCountText, isActive && { color: C.white }]}>
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ── Column Headers ── */}
          <View style={cbs.tableHeader}>
            <Text style={[cbs.thCell, { flex: 2 }]}>PRODUCT</Text>
            <Text style={[cbs.thCell, { flex: 1, textAlign: "center" }]}>BRAND</Text>
            <Text style={[cbs.thCell, { flex: 1, textAlign: "center" }]}>QTY / UNIT</Text>
            <Text style={[cbs.thCell, { width: 80, textAlign: "right" }]}>PRICE</Text>
          </View>

          {/* ── Product Rows ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            {subCatItems.length === 0 ? (
              <View style={cbs.emptyWrap}>
                <Feather name="package" size={32} color={C.gray300} />
                <Text style={cbs.emptyText}>No items in this sub-category</Text>
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
                  id:  p.id, name: p.name, price: p.price,
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
                          source={{ uri: p.image_url || CAT_FALLBACK_IMGS[category] || CAT_FALLBACK_IMGS._default }}
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
                            <Text style={cbs.discPillText}>Loose</Text>
                          </View>
                        )}
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
                          <Text style={cbs.addBtnText}>{loose ? "SELECT" : "ADD"}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={cbs.qtyRow}>
                          <TouchableOpacity style={cbs.qtyBtn} onPress={() => onRemove(item)}>
                            <Feather name="minus" size={10} color={C.white} />
                          </TouchableOpacity>
                          <Text style={cbs.qtyNum}>{qty}</Text>
                          <TouchableOpacity style={cbs.qtyBtn} onPress={() => onAdd(item)}>
                            <Feather name="plus" size={10} color={C.white} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 24 }} />
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
});

// ─── Vendor type display config ──────────────────────────────────────────────
const VENDOR_TYPE_META = {
  ration: { label: "Ration Store", bg: "#FEF9C3", color: "#92400E" },
  vegetables: { label: "Vegetables", bg: "#DCFCE7", color: "#14532D" },
  fruits: { label: "Fruits", bg: "#ECFDF5", color: "#065F46" },
};

// ─── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({ item, onAdd, onRemove, qty, cardWidth, onOpenWeightPicker }) {
  const size = cardWidth || 130;
  const imgUri =
    item.img || item.image_url || CAT_FALLBACK_IMGS[item.category] || CAT_FALLBACK_IMGS._default;
  const hasMrp = item.orig && item.orig > item.price;
  const discPct = hasMrp ? Math.round((1 - item.price / item.orig) * 100) : 0;
  const loose = isLooseItem(item);

  return (
    <View style={[ic.card, { width: size }]}>
      {loose && (
        <View style={[ic.badge, { backgroundColor: C.cyan, right: 5, left: "auto" }]}>
          <Text style={ic.badgeText}>Loose</Text>
        </View>
      )}
      {hasMrp && (
        <View style={ic.badge}>
          <Text style={ic.badgeText}>{discPct}% off</Text>
        </View>
      )}
      <Image
        source={{ uri: imgUri }}
        style={[ic.img, { height: size }]}
        resizeMode="cover"
      />
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
              <Feather name="sliders" size={12} color={C.white} />
            ) : (
              <Feather name="plus" size={12} color={C.white} />
            )}
            <Text style={ic.addText}>{loose ? "SELECT" : "ADD"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={ic.qtyRow}>
            <TouchableOpacity style={ic.qtyBtn} onPress={() => onRemove(item)}>
              <Feather name="minus" size={10} color={C.white} />
            </TouchableOpacity>
            <Text style={ic.qtyNum}>{qty}</Text>
            <TouchableOpacity style={ic.qtyBtn} onPress={() => onAdd(item)}>
              <Feather name="plus" size={10} color={C.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const ic = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.gray200,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  badge: {
    position: "absolute",
    top: 5,
    left: 5,
    zIndex: 2,
    backgroundColor: C.orange,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 8, color: C.white, fontWeight: "800" },
  img: { width: "100%" },
  info: { padding: 8 },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray900,
    lineHeight: 17,
    marginBottom: 2,
  },
  unit: { fontSize: 11, color: C.gray400, marginBottom: 5 },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    marginBottom: 8,
  },
  price: { fontSize: 14, fontWeight: "900", color: C.gray900 },
  orig: { fontSize: 10, color: C.gray400, textDecorationLine: "line-through" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: C.green,
    borderRadius: 7,
    paddingVertical: 7,
  },
  addText: { fontSize: 12, fontWeight: "800", color: C.white },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.green,
    borderRadius: 7,
    overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 7 },
  qtyNum: { fontSize: 12, fontWeight: "800", color: C.white },
});

// ─── Weight Picker Modal ───────────────────────────────────────────────────
function WeightPickerModal({ item, onClose, onAdd }) {
  if (!item) return null;
  const weightOptions = parseWeightOptions(item) || [item.unit || "1 pc"];
  const [selected, setSelected] = useState(weightOptions[0]);

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
                <Feather name="droplet" size={10} color={C.cyan} />
                <Text style={wp.looseBadgeText}>Loose item</Text>
              </View>
              <Text style={wp.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={wp.basePriceText}>
                ₹{item.price}{" "}
                <Text style={wp.perUnit}>per {item.unit || "unit"}</Text>
              </Text>
            </View>
          </View>

          {/* Weight chips */}
          <Text style={wp.pickLabel}>Select quantity</Text>
          <View style={wp.optionsGrid}>
            {weightOptions.map(w => {
              const formatted = formatWeight(w);
              const isActive = selected === w;
              return (
                <TouchableOpacity
                  key={formatted}
                  style={[wp.chip, isActive && wp.chipActive]}
                  onPress={() => setSelected(w)}
                  activeOpacity={0.8}
                >
                  <Text style={[wp.chipText, isActive && wp.chipTextActive]}>{formatted}</Text>
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
              <Feather name="shopping-cart" size={16} color={C.white} />
              <Text style={wp.addBtnText}>Add {formatWeight(selected)} to Cart</Text>
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

// ═════════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { token, user } = useAuthStore();
  const navigation = useNavigation();
  const addressStore = useAddressStore();
  const cart = useCartStore();

  const { currentLocation, fetchLocation: triggerRefetch } = addressStore;

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
    return currentLocation.displayName || "Set location";
  }, [selectedAddrId, addressStore.addresses, currentLocation.displayName]);

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
  const [recentOrders, setRecentOrders] = useState([]);
  const [popularFromAPI, setPopularFromAPI] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Category hierarchy from API
  const [apiCategories, setApiCategories] = useState([]);

  // Category browse sheet
  const [catSheetVisible, setCatSheetVisible] = useState(false);
  const [catSheetCategory, setCatSheetCategory] = useState(null);

  // Store picker
  const [pickerItem, setPickerItem] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loosePickerItem, setLoosePickerItem] = useState(null);

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
    if (locationCoords) {
      fetchNearbyVendors(locationCoords.lat, locationCoords.lng);
      fetchPopularProducts(locationCoords.lat, locationCoords.lng);
    }
  }, [locationCoords?.lat, locationCoords?.lng]);

  useEffect(() => {
    if (token) fetchRecentOrders();
  }, [token]);

  // Fetch category hierarchy (public endpoint — no auth needed)
  useEffect(() => {
    categoriesAPI.getAll()
      .then(res => setApiCategories(res.categories || []))
      .catch(() => setApiCategories([]));
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
  const fetchNearbyVendors = async (lat, lng) => {
    setLoadingVendors(true);
    try {
      const res = await vendorsAPI.getNearby(lat, lng, 10);
      const list = res.data || [];
      // ── TEMP DEBUG — remove after checking terminal ──
      if (list.length > 0) {
        console.log("🔍 VENDOR:", JSON.stringify({
          shop_name: list[0].shop_name,
          vendor_type: list[0].vendor_type,
          delivery_type: list[0].delivery_type,
        }, null, 2));
      }
      setVendors(list);
      // Pass list directly — state update is async, list is synchronous
      await fetchInventoryForVendors(list);
    } catch {
      setVendors([]);
    } finally {
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
          fetch(`${BASE_URL}/inventory/vendor/${v.id}`, { headers })
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
        if (inv.stock_qty > 0 && inv.product) {
          items.push({ ...inv, _vendorId: v.id, _vendorName: v.shop_name });
        }
      });
    });
    return items;
  }, [vendors]);

  // ── Address Handlers ────────────────────────────────────────────────────────

  // In normalizeCatName — add Personal Care to the exclusion list
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
    
    // Create a lookup for top-level resolution
    const topLevelMap = {}; // catId -> topLevelCatName
    if (apiCategories.length > 0) {
      const catById = {};
      apiCategories.forEach(c => { catById[c.id] = c; });
      
      apiCategories.forEach(c => {
        let curr = c;
        let safety = 0;
        while (curr.parent_id && catById[curr.parent_id] && safety < 5) {
          curr = catById[curr.parent_id];
          safety++;
        }
        topLevelMap[c.id] = curr.name;
        topLevelMap[c.name] = curr.name; // Map names too for robustness
      });
    }

    allInventoryItems.forEach((inv) => {
      const p = inv.product;
      if (!p) return;
      const catId = p.category_id || p.category?.id;
      const rawName = getCategoryName(inv);
      const catName = topLevelMap[catId] || topLevelMap[rawName] || rawName;
      
      if (catName && !seen.has(catName)) {
        seen.add(catName);
        
        // Fetch image and accent from DB/Config
        const apiCat = apiCategories.find(c => c.id === catId || c.name === catName);
        const accent = CAT_ACCENT[catName] || CAT_ACCENT[apiCat?.name] || CAT_ACCENT._default;
        
        // Prioritize DB image -> Fallback Unsplash image based on name -> Global default
        const dbImg = apiCat?.image_url;
        const fallbackImg = CAT_FALLBACK_IMGS[catName] || CAT_FALLBACK_IMGS[apiCat?.name] || CAT_FALLBACK_IMGS._default;
        
        cats.push({ 
          label: catName, 
          tag: catName, 
          img: dbImg || fallbackImg, 
          bg: accent.bg, 
          accent: accent.accent, 
          icon: accent.icon 
        });
      }
    });
    return cats.sort((a, b) => a.label.localeCompare(b.label));
  }, [allInventoryItems, getCategoryName, apiCategories]);

  // ── 3-level hierarchy for CategoryBrowseSheet ─────────────────────────────
  const categoryHierarchy = useMemo(
    () => buildHierarchyFromInventory(allInventoryItems, getCategoryName, apiCategories),
    [allInventoryItems, getCategoryName, apiCategories],
  );

  // ── Popular items — API-based with inventory fallback ─────────────────────
  const popularItems = useMemo(() => {
    if (popularFromAPI.length > 0) return popularFromAPI;

    // Fallback: derive from inventory, deduplicate by product ID
    const seen = new Set();
    const vendorCount = {};
    const itemMap = {};

    allInventoryItems.forEach((inv) => {
      const p = inv.product;
      if (!p?.id) return;
      const catName = getCategoryName(inv) || "Other";
      vendorCount[p.id] = (vendorCount[p.id] || 0) + 1;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        itemMap[p.id] = {
          id: p.id,
          name: p.name,
          unit: p.unit || "1 pc",
          price: p.price,
          orig: p.mrp != null && p.mrp > p.price ? p.mrp : null,
          img: p.image_url || null,
          category: catName,
          item_type: p.item_type,
          weight_options: p.weight_options,
        };
      }
    });

    return Object.entries(vendorCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([id]) => itemMap[Number(id)])
      .filter(Boolean);
  }, [popularFromAPI, allInventoryItems, getCategoryName]);

  // ── Address Handlers ────────────────────────────────────────────────────────
  const openAddressPicker = () => {
    if (!selectedAddrId && addressStore?.addresses?.length > 0) {
      setSelectedAddrId(addressStore.addresses[0].id);
    }
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

  const handleUseCurrentLocation = async () => {
    setAddrPickerVisible(false);
    if (triggerRefetch) await triggerRefetch(true);
  };


  // ── Cart helpers — reads from cartStore, no local qty state ───────────────
  // In handleAdd — check if THIS item is in cart, not just whether vendorId exists
  const handleAdd = useCallback(
    (item, selectedWeight = null) => {
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
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    if (h < 21) return "Good Evening";
    return "Good Night";
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


  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <Animated.View style={[s.headerWrap, { opacity: headerOpacity }]}>
        {wide ? (
          <View style={[s.headerRow, { paddingHorizontal: hPad }]}>
            {winW >= 900 && (
              <>
                <View style={s.brandSection}>
                  <View style={s.miniLogoWrap}>
                    <LinearGradient
                      colors={[C.orange, C.orangeDark]}
                      style={s.miniLogo}
                    >
                      <Feather name="shopping-cart" size={15} color={C.white} />
                    </LinearGradient>
                  </View>
                  <GradientText text="DesiDukaan" style={s.brandName} />
                </View>
                <View style={s.headerDivider} />
              </>
            )}
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
                  <Text style={s.locLoadText}>Locating…</Text>
                </View>
              ) : (
                <>
                  <Text style={s.locationTop}>Delivering to</Text>
                  <View style={s.locationBottomRow}>
                    <Text style={s.locationBottom} numberOfLines={1}>
                      {locationShort || "Set location"}
                    </Text>
                    <Feather name="chevron-down" size={13} color={C.gray500} />
                  </View>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.webSearch}
              onPress={() => navigation.navigate("Search")}
              activeOpacity={0.8}
            >
              <Feather name="search" size={16} color={C.gray400} />
              <Text style={s.webSearchText} numberOfLines={1}>
                {winW < 850 ? "Search…" : 'Search "rice", "daal", "milk"…'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.accountBtn}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.8}
            >
              <Feather name="user" size={16} color={C.gray700} />
              {winW >= 900 && (
                <Text style={s.accountBtnText} numberOfLines={1}>
                  {firstName || "Account"}
                </Text>
              )}
              <Feather name="chevron-down" size={13} color={C.gray500} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.cartBtn, cartCount > 0 && s.cartBtnActive]}
              onPress={() => navigation.navigate("Cart")}
              activeOpacity={0.8}
            >
              <Feather
                name="shopping-cart"
                size={16}
                color={cartCount > 0 ? C.white : C.gray700}
              />
              {winW >= 850 && (
                <Text
                  style={[s.cartBtnText, cartCount > 0 && { color: C.white }]}
                >
                  {cartCount > 0
                    ? `${cartCount} item${cartCount > 1 ? "s" : ""}`
                    : "Cart"}
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
                    <Text style={s.locLoadText}>Locating…</Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.locationTop}>Delivering to</Text>
                    <View style={s.locationBottomRow}>
                      <Text style={s.mobileLocBottom} numberOfLines={1}>
                        {locationShort || "Set location"}
                      </Text>
                      <Feather
                        name="chevron-down"
                        size={13}
                        color={C.gray700}
                      />
                    </View>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.mobileProfileBtn}
                onPress={() => navigation.navigate("Profile")}
                activeOpacity={0.8}
              >
                <Feather name="user" size={19} color={C.gray700} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[s.mobileSearch, { marginHorizontal: hPad }]}
              onPress={() => navigation.navigate("Search")}
              activeOpacity={0.8}
            >
              <Feather name="search" size={15} color={C.gray400} />
              <Text style={s.mobileSearchText}>Search stores, items…</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      <LinearGradient
        colors={[C.orange, C.orangeDark, C.green, C.greenDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.accentLine}
      />

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
        <View style={[s.greetingRow, { paddingHorizontal: hPad }]}>
          <Text style={s.greetingLine}>
            {getGreeting()}
            {firstName ? ", " : "! "}
            {firstName ? (
              <Text style={s.greetingName}>{firstName} 👋</Text>
            ) : (
              "👋"
            )}
          </Text>
          <Text style={s.greetingSub}>
            Fresh groceries & daily essentials, delivered fast.
          </Text>
        </View>

        {/* 2. HERO BANNER */}
        <View style={[s.bannerWrap, { paddingHorizontal: hPad }]}>
          <View style={[s.heroBanner, { height: wide ? 200 : 160 }]}>
            <Image
              source={{
              uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=85&sig=banner",
              }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                "rgba(21,128,61,0.98)",
                "rgba(21,128,61,0.92)",
                "rgba(21,128,61,0.6)",
                "rgba(21,128,61,0.1)",
                "transparent",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[s.heroLeft, { width: wide ? "55%" : "70%" }]}>
              <Text style={s.heroTitle}>{"Stock up on\ndaily essentials"}</Text>
              <Text style={s.heroSub}>
                {"Farm-fresh fruits, vegetables,\ndairy, eggs & more"}
              </Text>
              <TouchableOpacity
                style={s.heroCTA}
                onPress={() => navigation.navigate("Search")}
                activeOpacity={0.85}
              >
                <Text style={s.heroCTAText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.infoPillRow}>
            <View style={s.infoPill}>
              <Feather name="truck" size={12} color={C.green} />
              <Text style={s.infoPillText}>Free delivery above ₹299</Text>
            </View>
            <View style={s.infoPillDot} />
            <View style={s.infoPill}>
              <Feather name="clock" size={12} color={C.orange} />
              <Text style={s.infoPillText}>30 min delivery</Text>
            </View>
            <View style={s.infoPillDot} />
            <View style={s.infoPill}>
              <Feather name="shield" size={12} color="#7C3AED" />
              <Text style={s.infoPillText}>100% fresh guarantee</Text>
            </View>
          </View>
        </View>

        {/* 3. NEARBY STORES */}
        <View style={[s.sectionHeader, { paddingHorizontal: hPad }]}>
          <View>
            <Text style={s.sectionTitle}>Nearby Stores</Text>
            <Text style={s.sectionSub}>Delivering to your location</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("AllStores")}>
            <Text style={s.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {loadingVendors ? (
          <View style={[s.loadingRow, { paddingHorizontal: hPad }]}>
            <ActivityIndicator size="small" color={C.green} />
            <Text style={s.loadingText}>Finding stores near you…</Text>
          </View>
        ) : vendors.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              <Feather name="map-pin" size={26} color={C.green} />
            </View>
            <Text style={s.emptyTitle}>No stores found nearby</Text>
            <Text style={s.emptySub}>Try updating your delivery location</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingLeft: hPad,
              paddingRight: 8,
              paddingBottom: 6,
            }}
          >
            {vendors.map((vendor) => (
              <TouchableOpacity
                key={vendor.id}
                style={[s.storeCard, wide && s.storeCardWide]}
                onPress={() =>
                  navigation.navigate("VendorStore", {
                    vendorId: vendor.id,
                    vendorName: vendor.shop_name,
                  })
                }
                activeOpacity={0.88}
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
                  <View style={s.statusBadge}>
                    <View
                      style={[
                        s.statusDot,
                        {
                          backgroundColor: vendor.is_open
                            ? "#4ADE80"
                            : "#F87171",
                        },
                      ]}
                    />
                    <Text style={s.statusText}>
                      {vendor.is_open ? "Open" : "Closed"}
                    </Text>
                  </View>
                  <View style={s.ratingBadge}>
                    <Feather name="star" size={10} color="#FBBF24" />
                    <Text style={s.ratingText}>
                      {vendor.avg_rating
                        ? parseFloat(vendor.avg_rating).toFixed(1)
                        : "New"}
                    </Text>
                  </View>
                </View>
                <View style={s.storeInfo}>
                  <Text style={s.storeName} numberOfLines={1}>
                    {vendor.shop_name}
                  </Text>
                  <View style={s.storeMetaRow}>
                    <Feather name="map-pin" size={10} color={C.green} />
                    <Text style={s.storeMeta}>
                      {vendor.distance_km
                        ? `${parseFloat(vendor.distance_km).toFixed(1)} km`
                        : "Nearby"}
                    </Text>
                    <View style={s.metaDot} />
                    <Feather name="clock" size={10} color={C.gray400} />
                    <Text style={s.storeMeta}>30 min</Text>
                  </View>
                  <View style={s.storeTagRow}>
                    <View style={s.storeTag}>
                      <Text style={s.storeTagText}>
                        Min ₹{vendor.min_order || 99}
                      </Text>
                    </View>
                    {vendor.is_open && (
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
                          Accepting orders
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
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 4. SHOP BY CATEGORY */}
        {showCategories && (
          <>
            <View
              style={[
                s.sectionHeader,
                { marginTop: 28, paddingHorizontal: hPad },
              ]}
            >
              <View>
                <Text style={s.sectionTitle}>Shop by Category</Text>
                <Text style={s.sectionSub}>Tap to browse items inside</Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                paddingHorizontal: hPad,
                paddingBottom: 8,
                rowGap: 16,
                columnGap: 8,
              }}
            >
              {dynamicCategories.map((cat) => {
                const subCats = categoryHierarchy[cat.label]
                  ? Object.keys(categoryHierarchy[cat.label])
                  : [];
                const itemCount = subCats.reduce(
                  (sum, sc) => sum + (categoryHierarchy[cat.label]?.[sc]?.length || 0), 0
                );
                
                // Responsive columns
                const catCols = winW >= 1024 ? 10 : winW >= 768 ? 6 : winW >= 480 ? 5 : 4;
                const catGap = 8;
                const catItemW = (winW - (hPad * 2) - (catGap * (catCols - 1))) / catCols;
                const bandSize = catItemW;

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
                    <View style={[s.catCardBand, { width: bandSize, height: bandSize, backgroundColor: cat.bg }]}>
                      <Image 
                        source={{ uri: cat.img }} 
                        style={s.catImg} 
                        resizeMode="cover" 
                      />
                      {cat.icon && (
                        <View style={[s.catCardEmojiWrap, { width: bandSize * 0.35, height: bandSize * 0.35 }]}>
                          <Text style={[s.catCardEmoji, { fontSize: bandSize * 0.22 }]}>{cat.icon}</Text>
                        </View>
                      )}
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
            <Text style={s.loadingText}>Loading products…</Text>
          </View>
        )}

        {/* 5. POPULAR ITEMS */}
        {showPopular && (
          <>
            <View
              style={[
                s.sectionHeader,
                { marginTop: 28, paddingHorizontal: hPad },
              ]}
            >
              <View>
                <Text style={s.sectionTitle}>Popular Items</Text>
                <Text style={s.sectionSub}>Available at nearby stores</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("Search")}>
                <Text style={s.viewAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.itemsGrid, { paddingHorizontal: hPad }]}>
              {popularItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  qty={getCartQty(item.id)} // ← single source of truth
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  cardWidth={cardW}
                  onOpenWeightPicker={setLoosePickerItem}
                />
              ))}
            </View>
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
              <Text style={s.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate("MyOrders")}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[s.orderCard, { marginHorizontal: hPad }]}
                onPress={() => navigation.navigate("MyOrders")}
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
                    {order.vendor?.shop_name || "Store"}
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
                <Feather
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
        onClose={() => setAddrPickerVisible(false)}
        onSelect={handleSelectAddress}
        onDelete={(id) => addressStore.removeAddress(id, token)}
        onSaveNew={async (text) => {
          let lat = null,
            lng = null;
          try {
            const encoded = encodeURIComponent(text);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
              { headers: { "User-Agent": "DesiDukaan/1.0" } },
            );
            const results = await res.json();
            if (results?.length > 0) {
              lat = parseFloat(results[0].lat);
              lng = parseFloat(results[0].lon);
            }
          } catch { }

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
        onUseLocation={handleUseCurrentLocation}
      />

      {/* ══ WEIGHPICKER MODAL ═════════════════════════════════════════════ */}
      <WeightPickerModal
        item={loosePickerItem}
        onClose={() => setLoosePickerItem(null)}
        onAdd={handleAdd}
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
        onClose={() => setCatSheetVisible(false)}
        onAdd={handleAdd}
        onRemove={handleRemove}
        getCartQty={getCartQty}
        onOpenWeightPicker={setLoosePickerItem}
        vendors={vendors}
        onStoreSelect={handleStoreSelect}
        apiCategories={apiCategories}
      />

      {/* ══ FLOATING CART — mobile ══════════════════════════════════════════ */}
      {!wide && cartCount > 0 && (
        <Animated.View
          style={[s.floatingCart, { transform: [{ translateY: floatingY }] }]}
        >
          <View style={s.floatingLeft}>
            <View style={s.floatingBadge}>
              <Text style={s.floatingBadgeText}>{cartCount}</Text>
            </View>
            <View>
              <Text style={s.floatingItems}>
                {cartCount} item{cartCount > 1 ? "s" : ""} added
              </Text>
              <Text style={s.floatingTotal}>₹{cartTotal} total</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.floatingCTA}
            onPress={() => navigation.navigate("Cart")}
            activeOpacity={0.85}
          >
            <Text style={s.floatingCTAText}>View Cart</Text>
            <Feather name="arrow-right" size={14} color={C.white} />
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
  },
  accentLine: { height: 2.5 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    gap: 0,
  },
  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  miniLogoWrap: { width: 34, height: 34, borderRadius: 10, overflow: "hidden" },
  miniLogo: { flex: 1, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  headerDivider: {
    width: 1,
    height: 38,
    backgroundColor: C.gray200,
    marginHorizontal: 16,
    flexShrink: 0,
  },
  locationBtn: {
    flexShrink: 0,
    minWidth: 100,
    maxWidth: 180,
    justifyContent: "center",
    marginRight: 12,
  },
  locLoadRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locLoadText: { fontSize: 12, color: C.gray500 },
  locationTop: {
    fontSize: 11,
    color: C.gray500,
    fontWeight: "500",
    lineHeight: 15,
  },
  locationBottomRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationBottom: {
    fontSize: 15,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.gray200,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    minWidth: 80,
  },
  webSearchText: { flex: 1, fontSize: 13, color: C.gray400 },
  accountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.gray200,
    marginRight: 8,
    flexShrink: 0,
  },
  accountBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.gray700,
    maxWidth: 80,
  },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.gray100,
    flexShrink: 0,
  },
  cartBtnActive: { backgroundColor: C.green, borderColor: C.green },
  cartBtnText: { fontSize: 13, fontWeight: "700", color: C.gray700 },
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
    paddingBottom: 10,
  },
  mobileLocBtn: { flex: 1, marginRight: 12 },
  mobileLocBottom: { fontSize: 16, fontWeight: "700", color: C.gray900 },
  mobileProfileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: C.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.gray100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.gray200,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  mobileSearchText: { flex: 1, fontSize: 14, color: C.gray400 },
  scroll: { paddingBottom: 40 },
  greetingRow: { paddingTop: 14, paddingBottom: 12 },
  greetingLine: {
    fontSize: 18,
    color: C.gray700,
    fontWeight: "500",
    lineHeight: 24,
  },
  greetingName: { color: C.gray900, fontWeight: "800" },
  greetingSub: { fontSize: 13, color: C.gray400, marginTop: 2 },
  bannerWrap: { marginBottom: 24 },
  heroBanner: {
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
  },
  heroLeft: { paddingHorizontal: 22, paddingVertical: 22, zIndex: 2 },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: C.white,
    lineHeight: 28,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
    marginBottom: 16,
  },
  heroCTA: {
    backgroundColor: C.white,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  heroCTAText: { fontSize: 13, fontWeight: "900", color: C.greenDark },
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
  sectionTitle: { fontSize: 20, fontWeight: "900", color: C.gray900 },
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
  storeImgOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
  },
  statusBadge: {
    position: "absolute",
    top: 9,
    left: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, color: C.white, fontWeight: "700" },
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
    fontWeight: "800",
    color: C.gray900,
    marginBottom: 5,
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
    alignItems: "center",
    marginBottom: 4,
  },
  catCardBand: {
    borderRadius: 14,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  catCardEmojiWrap: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 3,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  catCardEmoji: {
    textAlign: "center",
  },
  catCardImgWrap: {
    width: "100%",
    height: "100%",
  },
  catCardLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: C.gray800,
    textAlign: "center",
    paddingHorizontal: 1,
    lineHeight: 11,
  },
  // keep catImgWrap for compatibility
  catImgWrap: {
    width: 114, height: 114, borderRadius: 28, overflow: "hidden",
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
});