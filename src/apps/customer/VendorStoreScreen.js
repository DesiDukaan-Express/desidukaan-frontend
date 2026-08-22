import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, Modal,
  TouchableOpacity, ActivityIndicator, Animated,
  TextInput, Platform, StatusBar, Pressable, Dimensions,
  Share, Alert,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";
import { categoriesAPI } from "../../services/api";
import { calculateProportionalPrice } from "../../utils/weightUtils";
import { isStoreCurrentlyOpen } from "../../utils/storeStatus";
import { useTranslation } from "react-i18next";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  // Brand greens
  green: "#005e26", greenDark: "#007a33", greenDeep: "#002b12",
  greenLight: "#F0FDF4", greenMid: "#DCFCE7", greenBorder: "#BBF7D0",
  greenFixed: "#93f9a2", greenFixedDim: "#77dc88",
  // Brand oranges
  orange: "#FC8125", orangeDark: "#994700",
  orangeLight: "#FFDBC8", orangeMid: "#FFF7ED",
  // Neutrals
  white: "#FFFFFF", bg: "#F8F9FA",
  gray100: "#F3F4F5", gray200: "#E1E3E4",
  gray300: "#D1D5DB", gray400: "#9CA3AF",
  gray500: "#6F7A6D", gray600: "#3F4A3E",
  gray700: "#374151", gray900: "#191C1D",
  // Surfaces
  surface: "#F8F9FA", surfaceLow: "#F3F4F5",
  surfaceHigh: "#E7E8E9", surfaceLowest: "#FFFFFF",
  outlineVar: "#BECABB",
  // Other
  cyan: "#0891B2", cyanLight: "#ECFEFF",
};

// ─── Category visual config ────────────────────────────────────────────────────
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
  // Split fruit/veg + pantry chips (matches the reference category row: Fruits, Vegetables, Rice & Grains, Pulses, Spices, Oils, Dairy)
  "Fruits": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&q=80",
  "Vegetables": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80",
  "Rice, Atta & Grains": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
  "Pulses & Dals": "https://images.unsplash.com/photo-1596797882870-8c33deeaab99?w=400&q=80",
  "Spices & Masala": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80",
  "Oils & Ghee": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80",
  "Dairy": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80",
  _default: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
};

const CAT_ACCENT = {
  "Dairy, Bread & Eggs": { bg: "#EFF6FF", accent: "#2563EB", icon: "local-cafe" },
  "Fruits & Vegetables": { bg: "#ECFDF5", accent: "#059669", icon: "eco" },
  "Fruits": { bg: "#FEF2F2", accent: "#DC2626", icon: "eco" },
  "Vegetables": { bg: "#ECFDF5", accent: "#059669", icon: "eco" },
  "Dairy": { bg: "#EFF6FF", accent: "#2563EB", icon: "local-cafe" },
  "Cold Drinks & Juices": { bg: "#F0FDF4", accent: "#16A34A", icon: "local-drink" },
  "Snacks & Munchies": { bg: "#FFF7ED", accent: "#EA580C", icon: "fastfood" },
  "Breakfast & Instant Food": { bg: "#FEF9C3", accent: "#CA8A04", icon: "breakfast-dining" },
  "Sweet Tooth": { bg: "#FDF4FF", accent: "#9333EA", icon: "cake" },
  "Bakery & Biscuits": { bg: "#FFF1F2", accent: "#E11D48", icon: "cookie" },
  "Tea, Coffee & Milk Drinks": { bg: "#F5F5F4", accent: "#57534E", icon: "coffee" },
  "Atta, Rice & Dal": { bg: "#FEFCE8", accent: "#A16207", icon: "grain" },
  "Masala, Oil & More": { bg: "#FFF7ED", accent: "#C2410C", icon: "opacity" },
  "Sauces & Spreads": { bg: "#F0FDFA", accent: "#0D9488", icon: "bubble-chart" },
  "Cleaning Essentials": { bg: "#F0F9FF", accent: "#0284C7", icon: "cleaning-services" },
  "Personal Care": { bg: "#FAF5FF", accent: "#7C3AED", icon: "face" },
  "Home & Office": { bg: "#F8FAFC", accent: "#475569", icon: "business-center" },
  "Bread": { bg: "#FFFBEB", accent: "#D97706", icon: "bakery-dining" },
  "Chips": { bg: "#FEF2F2", accent: "#EF4444", icon: "fastfood" },
  "Milk": { bg: "#F0F9FF", accent: "#0EA5E9", icon: "local-cafe" },
  "Rice": { bg: "#FEFCE8", accent: "#EAB308", icon: "grain" },
  "Rice, Atta & Grains": { bg: "#FEFCE8", accent: "#A16207", icon: "grain" },
  "Pulses & Dals": { bg: "#FFF7ED", accent: "#B45309", icon: "grain" },
  "Spices & Masala": { bg: "#FFF7ED", accent: "#C2410C", icon: "local-fire-department" },
  "Oils & Ghee": { bg: "#FEFCE8", accent: "#CA8A04", icon: "opacity" },
  "Sugar & Salt": { bg: "#F8FAFC", accent: "#64748B", icon: "grain" },
  "Beverages": { bg: "#F0FDF4", accent: "#16A34A", icon: "local-drink" },
  _default: { bg: "#F3F4F6", accent: "#6B7280", icon: "inventory" },
};

const getCatMeta = (cat) => {
  if (cat === "All") {
    return {
      bg: "#F0FDF4",
      accent: "#16A34A",
      emoji: "shopping-basket",
      img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
    };
  }
  const accent = CAT_ACCENT[cat] || CAT_ACCENT._default;
  const img = CAT_FALLBACK_IMGS[cat] || CAT_FALLBACK_IMGS._default;
  return {
    bg: accent.bg,
    accent: accent.accent,
    emoji: accent.icon,
    img: img,
  };
};

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

const normalizeCat = (cat) => normalizeCatName(cat) || "Other";

// ─── Keyword-based category fallback ───────────────────────────────────────────
// Used when a product has no (or a generic/"Other") category from the backend,
// so the storefront can still show useful filter chips like Fruits & Vegetables,
// Rice & Grains, Dairy, Spices, Oils, Pulses, etc.
const KEYWORD_CATEGORIES = [
  { name: "Fruits", keywords: ["banana", "apple", "mango", "grape", "orange", "papaya", "guava", "pomegranate", "watermelon", "pineapple", "fruit"] },
  { name: "Vegetables", keywords: ["tomato", "onion", "potato", "carrot", "cabbage", "cauliflower", "capsicum", "brinjal", "spinach", "chilli", "chili", "ginger", "garlic", "lemon", "cucumber", "peas", "beans", "vegetable"] },
  { name: "Rice, Atta & Grains", keywords: ["rice", "basmati", "atta", "flour", "wheat", "maida", "rava", "sooji", "poha", "millet", "grain"] },
  { name: "Pulses & Dals", keywords: ["dal", "daal", "lentil", "moong", "chana", "toor", "urad", "rajma", "masoor", "pulse"] },
  { name: "Spices & Masala", keywords: ["masala", "spice", "turmeric", "haldi", "chilli powder", "coriander powder", "jeera", "cumin", "mustard seed", "garam masala", "pepper"] },
  { name: "Oils & Ghee", keywords: ["oil", "ghee", "sunflower oil", "mustard oil", "vanaspati"] },
  { name: "Dairy, Bread & Eggs", keywords: ["milk", "curd", "yogurt", "paneer", "butter", "cheese", "bread", "egg", "ghee"] },
  { name: "Snacks & Munchies", keywords: ["chips", "namkeen", "biscuit", "cookie", "snack", "chocolate", "candy", "wafer"] },
  { name: "Beverages", keywords: ["juice", "soda", "cold drink", "tea", "coffee", "water bottle", "drink"] },
  { name: "Sugar & Salt", keywords: ["sugar", "salt", "jaggery", "gud"] },
];
function classifyByName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  for (const cat of KEYWORD_CATEGORIES) {
    if (cat.keywords.some(k => n.includes(k))) return cat.name;
  }
  return null;
}

function buildHierarchyFromInventory(allInventoryItems, getCategoryName, parentOfMap) {
  const hierarchy = {};

  allInventoryItems.forEach(inv => {
    const catName = getCategoryName(inv);
    if (!catName) return;

    let topCat, subCat;
    if (parentOfMap && parentOfMap.hasOwnProperty(catName)) {
      if (parentOfMap[catName] === null) {
        topCat = catName;
        subCat = "All";
      } else {
        topCat = parentOfMap[catName];
        subCat = catName;
      }
    } else {
      topCat = catName;
      const p = inv.product;
      subCat = p?.unit || "General";
    }

    if (!hierarchy[topCat]) hierarchy[topCat] = {};
    if (!hierarchy[topCat][subCat]) hierarchy[topCat][subCat] = [];
    hierarchy[topCat][subCat].push(inv);
  });

  return hierarchy;
}

// ─── Responsive helpers ────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(() =>
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.innerWidth : Dimensions.get("window").width
  );
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// Responsive card grid — 2 cols mobile, 3 tablet, 4-5 desktop
function useCardLayout(winW) {
  return useMemo(() => {
    const safeW = winW && winW > 0 ? winW : 360;
    const H_PAD = safeW >= 1024 ? 24 : safeW >= 640 ? 16 : 16;
    const GAP = safeW >= 640 ? 16 : 14;
    let cols;
    if (safeW >= 1200) cols = 5;
    else if (safeW >= 900) cols = 4;
    else if (safeW >= 600) cols = 3;
    else cols = 2;
    const cardW = Math.max(120, Math.floor((safeW - H_PAD * 2 - GAP * (cols - 1)) / cols));
    return { cols, cardW, gap: GAP, hPad: H_PAD };
  }, [winW]);
}

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
function formatRupee(v) {
  const n = Number(v) || 0;
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

// ═══════════════════════════════════════════════════════════════════════════ //
// ─── Weight Picker Modal ─────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════════════ //
function WeightPickerModal({ item, onClose, onAdd }) {
  const { t } = useTranslation();
  const p = item?.product || {};
  const weightOptions = parseWeightOptions(p) || [p.unit || "1 pc"];
  const [selected, setSelected] = useState(weightOptions[0]);

  useEffect(() => {
    if (weightOptions && weightOptions.length > 0) {
      setSelected(weightOptions[0]);
    }
  }, [item]);

  const selectedWeightStr = formatWeight(selected);
  const selectedPrice = calculateProportionalPrice(p.price, selectedWeightStr, p.unit || "1kg");

  if (!item) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={wp.backdrop} onPress={onClose}>
        <Pressable style={wp.sheet} onPress={() => { }}>
          <View style={wp.handle} />

          {/* Header — product thumb + name + price */}
          <View style={wp.header}>
            <Image
              source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300" }}
              style={wp.thumb} resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <View style={wp.looseBadge}>
                <Feather name="droplet" size={10} color={C.cyan} />
                <Text style={wp.looseBadgeText}>{t('vendorStore.looseItem')}</Text>
              </View>
              <Text style={wp.productName} numberOfLines={2}>{p.name}</Text>
              <Text style={wp.basePriceText}>
                ₹{p.price}{" "}
                <Text style={wp.perUnit}>{t('vendorStore.perUnit', { unit: p.unit || "unit" })}</Text>
              </Text>
            </View>
          </View>

          {/* Weight chips */}
          <Text style={wp.pickLabel}>{t('vendorStore.selectQuantity')}</Text>
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

          {/* Info note */}
          <View style={wp.noteRow}>
            <Feather name="info" size={12} color={C.gray400} />
            <Text style={wp.noteText}>
              Max 1 unit per selection. Tap ADD again to increase quantity.
            </Text>
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
              <Text style={wp.addBtnText}>
                {t('vendorStore.addWeightToCart', { weight: selectedWeightStr })}
                <Text style={wp.addBtnPrice}> · ₹{formatRupee(selectedPrice)}</Text>
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
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  header: { flexDirection: "row", gap: 14, marginBottom: 24, alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: C.gray100 },
  looseBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.cyanLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
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
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 20 },
  noteText: { fontSize: 12, color: C.gray400, flex: 1, lineHeight: 17 },
  addBtn: { borderRadius: 16, overflow: "hidden" },
  addBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  addBtnText: { fontSize: 16, fontWeight: "800", color: C.white },
  addBtnPrice: { fontSize: 14, fontWeight: "700", color: "#a1ffad" },
});

// ═══════════════════════════════════════════════════════════════════════════ //
// ─── Product Detail Modal ────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════════════ //
function ProductModal({ item, onClose, onAdd, onRemove, qty, onOpenWeightPicker }) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.88);
      slideAnim.setValue(40);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      ]).start();
    }
  }, [item]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 25, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!item) return null;
  const p = item.product || {};
  const catName = p.category?.name || p.category;
  const meta = getCatMeta(catName);
  const inStock = item.is_active ?? true;
  const loose = isLooseItem(p);
  const discount = p.mrp && p.mrp > p.price
    ? Math.round((1 - p.price / p.mrp) * 100) : null;

  return (
    <Modal visible transparent onRequestClose={handleClose} statusBarTranslucent animationType="none">
      <Animated.View style={[pm.backdropLayer, { opacity: backdropOpacity }]} />
      <Animated.View style={[pm.backdropBlur, { opacity: backdropOpacity }]} />
      <Pressable style={pm.backdropPress} onPress={handleClose}>
        <Animated.View style={[pm.backdropOverlay, { opacity: fadeAnim }]} />
      </Pressable>
      <View style={pm.centerWrap} pointerEvents="box-none">
        <Animated.View style={[pm.card, {
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          opacity: fadeAnim,
        }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ maxHeight: "100%" }}>
            <View style={pm.imgWrap}>
              <Image
                source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80" }}
                style={pm.img} resizeMode="cover"
              />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.5)"]} style={StyleSheet.absoluteFillObject} />
              <TouchableOpacity style={pm.closeBtn} onPress={handleClose} activeOpacity={0.7}>
                <Feather name="x" size={16} color={C.white} />
              </TouchableOpacity>
              {/* <View style={[pm.catBadge, { backgroundColor: meta.bg }]}>
                <Text>{meta.emoji}</Text>
                <Text style={[pm.catBadgeText, { color: meta.accent }]}>{catName}</Text>
              </View> */}
              {loose && (
                <View style={pm.looseBadge}>
                  <Feather name="droplet" size={9} color={C.cyan} />
                  <Text style={pm.looseBadgeText}>{t('vendorStore.loose')}</Text>
                </View>
              )}
              {discount && <View style={pm.discBadge}><Text style={pm.discText}>{discount}% {t('vendorStore.off')}</Text></View>}
              {!inStock && <View style={pm.oosLayer}><Text style={pm.oosLayerText}>{t('vendorStore.outOfStock')}</Text></View>}
              {/* <View style={pm.priceOnImg}>
                <Text style={pm.priceOnImgText}>₹{p.price}</Text>
                {p.mrp && p.mrp > p.price && <Text style={pm.mrpOnImgText}>₹{p.mrp}</Text>}
              </View> */}
            </View>
            <View style={pm.body}>

              <Text style={pm.name}>{p.name}</Text>
              <Text style={pm.unit}>{p.unit}</Text>
              {loose && (
                <View style={pm.looseNote}>
                  <Feather name="droplet" size={12} color={C.cyan} />
                  <Text style={pm.looseNoteText}>
                    Sold loose. Select your quantity (e.g. 100g, 500g, 1kg).
                  </Text>
                </View>
              )}
              {p.description ? (
                <View style={pm.descBox}>
                  <Text style={pm.descLabel}>{t('vendorStore.description')}</Text>
                  <Text style={pm.descText}>{p.description}</Text>
                </View>
              ) : null}
              {discount && (
                <View style={pm.savingsPill}>
                  <MaterialIcons name="savings" size={14} color="#D97706" />
                  <Text style={pm.savingsText}>{t('vendorStore.youSave', { amount: p.mrp - p.price })}</Text>
                </View>
              )}
              <View style={pm.actionRow}>
                <View>
                  <Text style={pm.totalLabel}>{t('cart.total') || 'TOTAL'}</Text>
                  <Text style={pm.totalPrice}>₹{p.price}</Text>
                </View>
                {inStock ? (
                  loose ? (
                    <TouchableOpacity
                      style={pm.addBtn}
                      onPress={() => { handleClose(); onOpenWeightPicker(item); }}
                      activeOpacity={0.85}
                    >
                      <Feather name="sliders" size={15} color={C.white} />
                      <Text style={pm.addBtnText}>{t('vendorStore.selectWeight')}</Text>
                    </TouchableOpacity>
                  ) : qty === 0 ? (
                    <TouchableOpacity style={pm.addBtn} onPress={() => { onAdd(item); handleClose(); }} activeOpacity={0.85}>
                      <MaterialIcons name="shopping-cart" size={16} color="#fff" />
                      <Text style={pm.addBtnText}>{t('vendorStore.add')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={pm.qtyRow}>
                      <TouchableOpacity style={pm.qtyBtn} onPress={() => onRemove(item)}>
                        <Feather name="minus" size={15} color="#fff" />
                      </TouchableOpacity>
                      <Text style={pm.qtyNum}>{qty}</Text>
                      <TouchableOpacity style={pm.qtyBtn} onPress={() => onAdd(item)}>
                        <Feather name="plus" size={15} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )
                ) : (
                  <View style={pm.oosBtn}><Text style={pm.oosBtnText}>{t('vendorStore.outOfStock')}</Text></View>
                )}
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
const pm = StyleSheet.create({
  backdropLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.75)" },
  backdropBlur: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,15,30,0.35)" },
  backdropPress: { ...StyleSheet.absoluteFillObject },
  backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  centerWrap: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 24 },
  card: {
    width: "100%", maxWidth: 380, maxHeight: "80%", backgroundColor: C.white,
    borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32, shadowRadius: 32, elevation: 20,
  },
  imgWrap: { width: "100%", height: 200, backgroundColor: "#F3F4F5", position: "relative" },
  img: { width: "100%", height: "100%" },
  closeBtn: {
    position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  catBadge: { position: "absolute", bottom: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  catBadgeText: { fontSize: 12, fontWeight: "700" },
  looseBadge: { position: "absolute", top: 12, right: 52, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(236,254,255,0.92)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  looseBadgeText: { fontSize: 10, fontWeight: "800", color: C.cyan },
  discBadge: { position: "absolute", top: 12, left: 12, backgroundColor: C.orange, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, shadowColor: C.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  discText: { fontSize: 11, color: C.white, fontWeight: "800" },
  oosLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.52)", alignItems: "center", justifyContent: "center" },
  oosLayerText: { fontSize: 20, fontWeight: "900", color: C.white, letterSpacing: 1 },
  priceOnImg: { position: "absolute", bottom: 12, left: 16, flexDirection: "row", alignItems: "baseline", gap: 6 },
  priceOnImgText: { fontSize: 30, fontWeight: "900", color: C.white, textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
  mrpOnImgText: { fontSize: 14, color: "rgba(255,255,255,0.55)", textDecorationLine: "line-through" },
  body: { padding: 20 },
  lowBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 10, padding: 10, marginBottom: 12 },
  lowBannerText: { fontSize: 13, color: "#92400E", fontWeight: "600", flex: 1 },
  name: { fontSize: 20, fontWeight: "900", color: C.gray900, lineHeight: 26, marginBottom: 4 },
  unit: { fontSize: 13, color: C.gray400, fontWeight: "500", marginBottom: 14 },
  looseNote: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.cyanLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  looseNoteText: { fontSize: 12, color: C.cyan, fontWeight: "600", flex: 1 },
  descBox: { backgroundColor: C.greenLight, borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 3.5, borderLeftColor: C.green },
  descLabel: { fontSize: 10, fontWeight: "800", color: C.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  descText: { fontSize: 13.5, color: C.gray600, lineHeight: 20 },
  savingsPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEF3C7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  savingsText: { fontSize: 12.5, color: "#92400E", fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTopWidth: 1, borderTopColor: C.gray100 },
  totalLabel: { fontSize: 10, color: C.gray400, fontWeight: "600", marginBottom: 2 },
  totalPrice: { fontSize: 26, fontWeight: "900", color: C.green },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, shadowColor: C.green, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  addBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  qtyRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.green, borderRadius: 14, overflow: "hidden", shadowColor: C.green, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  qtyBtn: { paddingHorizontal: 18, paddingVertical: 13 },
  qtyNum: { fontSize: 16, fontWeight: "900", color: "#fff", minWidth: 34, textAlign: "center" },
  oosBtn: { backgroundColor: C.gray200, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  oosBtnText: { fontSize: 15, fontWeight: "700", color: C.gray500 },
});

// ═══════════════════════════════════════════════════════════════════════════ //
// ─── Product Card — responsive 2-5 col grid ──────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════════════ //
function ProductCard({ item, onPress, onAdd, onRemove, qty, cardW }) {
  const { t } = useTranslation();
  const p = item.product || {};
  const inStock = item.product?.is_active;
  const loose = isLooseItem(p);
  const discount = p.mrp && p.mrp > p.price
    ? Math.round((1 - p.price / p.mrp) * 100) : null;
  const imgH = Math.max(120, Math.round(cardW));
  const [wishlisted, setWishlisted] = useState(false);

  return (
    <TouchableOpacity
      style={[pc.card, { width: cardW }, !inStock && { opacity: 0.5 }]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={!inStock}
    >
      {/* Image */}
      <View style={[pc.imgWrap, { height: imgH }]}>
        <Image
          source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300" }}
          style={pc.img} resizeMode={loose ? "cover" : "contain"}
        />
        <TouchableOpacity
          style={pc.eyeBtn}
          // onPress={(e) => { e.stopPropagation?.(); setWishlisted(w => !w); }}
          disabled={!inStock}
          onPress={(e) => { e.stopPropagation?.(); onPress?.(); }}
          activeOpacity={0.7}
        >
          <Feather name="heart" size={14} color={wishlisted ? "#EF4444" : C.white} fill={wishlisted ? "#EF4444" : "none"} />
        </TouchableOpacity>
        {/* Top-left status badge — matches reference chips: Loose / Fresh / X% OFF */}
        {inStock && (
          <View style={[pc.discBadge, loose ? pc.badgeLoose : discount ? pc.badgeOff : pc.badgeFresh]}>
            <Text style={pc.discText}>
              {loose ? t('vendorStore.loose') : discount ? `${discount}% ${t('vendorStore.off')}` : "Fresh"}
            </Text>
          </View>
        )}
        {!inStock && (
          <View style={pc.oosOverlay}><Text style={pc.oosText}>{t('vendorStore.outOfStock')}</Text></View>
        )}
      </View>

      {/* Info */}
      <View style={pc.info}>
        <Text style={pc.name} numberOfLines={2}>{p.name}</Text>
        <Text style={pc.unit} numberOfLines={1}>{p.unit || "1 pc"}</Text>
        <View style={pc.priceRow}>
          <Text style={pc.price}>₹{p.price}</Text>
          {p.mrp && p.mrp > p.price && <Text style={pc.mrp}>₹{p.mrp}</Text>}
        </View>

        {/* Cart controls */}
        {inStock ? (
          qty === 0 ? (
            <TouchableOpacity
              style={[pc.addBtn, loose && pc.addBtnLoose]}
              onPress={(e) => { e.stopPropagation?.(); onAdd(item); }}
              activeOpacity={0.8}
            >
              {loose
                ? <Feather name="sliders" size={12} color={C.white} />
                : <Feather name="plus" size={12} color={C.white} />}
              <Text style={pc.addText}>{loose ? t('vendorStore.select') : t('vendorStore.add')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={pc.qtyRow}>
              <TouchableOpacity
                style={pc.qtyBtn}
                onPress={(e) => { e.stopPropagation?.(); onRemove(item); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="minus" size={12} color={C.white} />
              </TouchableOpacity>
              <Text style={pc.qtyNum}>{qty}</Text>
              <TouchableOpacity
                style={pc.qtyBtn}
                onPress={(e) => { e.stopPropagation?.(); onAdd(item); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="plus" size={12} color={C.white} />
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={pc.oosBtn}><Text style={pc.oosBtnText}>{t('vendorStore.outOfStock')}</Text></View>
        )}
      </View>
    </TouchableOpacity>
  );
}
const pc = StyleSheet.create({
  card: {
    backgroundColor: C.surfaceLowest,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  imgWrap: {
    position: "relative",
    width: "100%",
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  img: { width: "100%", height: "100%" },
  discBadge: { position: "absolute", top: 8, left: 8, backgroundColor: C.orange, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  discText: { fontSize: 9, color: C.white, fontWeight: "800", letterSpacing: 0 },
  badgeOff: { backgroundColor: C.orange },
  badgeFresh: { backgroundColor: C.green },
  badgeLoose: { backgroundColor: C.green },
  looseBadge: { position: "absolute", top: 44, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.88)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, borderWidth: 1, borderColor: C.green },
  looseBadgeText: { fontSize: 9, fontWeight: "800", color: C.cyan },
  oosOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.48)", alignItems: "center", justifyContent: "center" },
  oosText: { fontSize: 11, fontWeight: "800", color: C.white, textAlign: "center" },
  eyeBtn: {
    position: "absolute", top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center", justifyContent: "center",
    zIndex: 2,
  },
  info: { padding: 12, flex: 1 },
  name: { fontSize: 16, fontWeight: "800", color: C.gray900, lineHeight: 21, marginBottom: 2 },
  unit: { fontSize: 11, color: C.gray500, marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  price: { fontSize: 20, fontWeight: "900", color: C.green },
  mrp: { fontSize: 11, color: C.gray400, textDecorationLine: "line-through" },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: C.greenDark, borderRadius: 12, paddingVertical: 10, minHeight: 40,
    shadowColor: "rgba(0,122,51,0.2)", shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
  },
  addBtnLoose: { backgroundColor: C.cyan },
  addText: { fontSize: 12, fontWeight: "800", color: "#a1ffad", letterSpacing: 0.5 },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.green, borderRadius: 12, overflow: "hidden" },
  qtyBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  qtyNum: { fontSize: 14, fontWeight: "900", color: C.white },
  oosBtn: { backgroundColor: C.gray100, borderRadius: 12, paddingVertical: 9, alignItems: "center" },
  oosBtnText: { fontSize: 11, fontWeight: "600", color: C.gray400 },
});

// ─── Category Section Header ───────────────────────────────────────────────────
function CatSectionHeader({ cat, count }) {
  const meta = getCatMeta(cat);
  return (
    <View style={csh.row}>
      <View style={[csh.iconWrap, { backgroundColor: meta.bg }]}>
        <MaterialIcons name={meta.emoji} size={20} color={meta.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={csh.title}>{cat}</Text>
        <Text style={csh.sub}>{count} item{count !== 1 ? "s" : ""}</Text>
      </View>
      <View style={[csh.badge, { backgroundColor: meta.bg }]}>
        <Text style={[csh.badgeText, { color: meta.accent }]}>{count}</Text>
      </View>
    </View>
  );
}
const csh = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingTop: 22, paddingBottom: 12,
    backgroundColor: C.bg,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.outlineVar,
  },
  emoji: { fontSize: 22 },
  title: { fontSize: 17, fontWeight: "900", color: C.gray900, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  badge: {
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: 999, backgroundColor: C.greenMid,
  },
  badgeText: { fontSize: 12, fontWeight: "800", color: C.green },
});

// ─── Category Tab Pill (legacy, kept for narrow layouts) ──────────────────────
function CatTabPill({ cat, count, isActive, onPress }) {
  const meta = getCatMeta(cat);
  return (
    <TouchableOpacity style={[ct.pill, isActive && ct.pillActive]} onPress={onPress} activeOpacity={0.8}>
      <MaterialIcons name={meta.emoji} size={14} color={isActive ? C.white : meta.accent} />
      <Text style={[ct.label, isActive && ct.labelActive]} numberOfLines={1}>{cat}</Text>
      <View style={[ct.bubble, { backgroundColor: isActive ? "rgba(255,255,255,0.22)" : C.surfaceHigh }]}>
        <Text style={[ct.bubbleText, { color: isActive ? C.white : C.gray600 }]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}
const ct = StyleSheet.create({
  pill: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: C.outlineVar,
    backgroundColor: C.surfaceLowest, marginRight: 8,
    maxWidth: 150, flexShrink: 1,
  },
  pillActive: {
    backgroundColor: C.greenDark, borderColor: C.greenDark,
    shadowColor: C.green, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 7, elevation: 4,
  },
  emoji: { fontSize: 14 },
  label: { fontSize: 12, fontWeight: "700", color: C.gray600, flexShrink: 1 },
  labelActive: { color: C.white },
  bubble: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    minWidth: 20, alignItems: "center",
    backgroundColor: C.surfaceHigh,
  },
  bubbleText: { fontSize: 10, fontWeight: "800" },
});

// ─── Category Icon Chip — rounded-square icon card with inset product photo, matches reference design ─────
function CatIconChip({ cat, isActive, onPress, isAll }) {
  const meta = getCatMeta(cat);
  const isAllItems = cat === "All";
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <TouchableOpacity style={cic.wrap} onPress={onPress} activeOpacity={0.8}>
      <View
        style={[
          cic.tile,
          isActive
            ? { backgroundColor: meta.bg, borderColor: meta.accent, borderWidth: 1.5 }
            : { backgroundColor: C.white, borderColor: C.gray200 },
        ]}
      >
        {(isAllItems || imgFailed)
          ? <MaterialIcons name={isAllItems ? "grid-view" : meta.emoji} size={20} color={meta.accent} />
          : (
            <Image
              source={{ uri: meta.img }}
              style={cic.photo}
              resizeMode="cover"
              onError={() => setImgFailed(true)}
            />
          )}
      </View>
      <Text style={[cic.label, isActive && { color: meta.accent, fontWeight: "800" }]} numberOfLines={1}>
        {isAllItems ? "All Items" : cat}
      </Text>
    </TouchableOpacity>
  );
}
const cic = StyleSheet.create({
  wrap: { alignItems: "center", width: 64, marginRight: 10 },
  tile: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    marginBottom: 6,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%", borderRadius: 10 },
  label: { fontSize: 11, fontWeight: "700", color: C.gray600, textAlign: "center" },
});

// ═══════════════════════════════════════════════════════════════════════════ //
// ─── Main Screen ─────────────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════════════ //
export default function VendorStoreScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { vendorId, vendorName } = route.params || {};
  const { token } = useAuthStore();
  const cart = useCartStore();

  const winW = useWindowWidth();
  const isWide = winW >= 768;
  const [gridAreaW, setGridAreaW] = useState(0);
  const effectiveW = gridAreaW > 0 ? gridAreaW : winW;
  const { cardW, gap, hPad } = useCardLayout(effectiveW);

  const [vendor, setVendor] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const searchInputRef = useRef(null);
  const [activeCat, setActiveCat] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortBtnRef = useRef(null);
  const [sortBtnLayout, setSortBtnLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [wishlistCount, setWishlistCount] = useState(0);
  const catScrollRef = useRef(null);
  const [catContentW, setCatContentW] = useState(0);
  const [catTrackW, setCatTrackW] = useState(0);
  const [catScrollX, setCatScrollX] = useState(0);
  useEffect(() => {
    console.log("Sort Changed:", sortBy);
  }, [sortBy]);
  const [detailItem, setDetailItem] = useState(null);
  const [loosePickerItem, setLoosePickerItem] = useState(null); // weight picker

  // Fetch category tree on mount
  useEffect(() => {
    categoriesAPI.getAll()
      .then(res => setApiCategories(res.data?.categories || []))
      .catch(() => setApiCategories([]));
  }, []);

  const floatingY = useRef(new Animated.Value(120)).current;
  const cartItems = cart?.items || [];
  const cartCount = cartItems.reduce((s, i) => s + (i.qty || 0), 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * (i.qty || 0), 0);

  useEffect(() => {
    Animated.spring(floatingY, {
      toValue: cartCount > 0 ? 0 : 120,
      tension: 70, friction: 12, useNativeDriver: true,
    }).start();
  }, [cartCount]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    window.history.pushState({ vendorStore: true }, "");
    const onPop = () => navigation.goBack();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [navigation]);

  // ── Fetch vendor + inventory ──────────────────────────────────────────────
  useEffect(() => {
    if (!vendorId) return;
    (async () => {
      setLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [vRes, iRes] = await Promise.all([
          fetch(`${BASE_URL}/vendors/${vendorId}`, { headers }),
          fetch(`${BASE_URL}/inventory/vendor/${vendorId}`, { headers }),
        ]);
        const vData = await vRes.json();
        const iData = await iRes.json();
        setVendor(vData.data?.vendor || vData.vendor || null);
        const inv = Array.isArray(iData) ? iData : iData.data || iData.inventory || [];
        setInventory(inv);
      } catch (e) { console.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [vendorId, token]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const getCatName = useCallback((item) => {
    const p = item.product;
    const cat = p?.category;
    let raw;
    if (cat && typeof cat === "object" && cat.name) raw = cat.name;
    else if (typeof cat === "string" && cat) raw = cat;

    const normalized = raw ? normalizeCatName(raw) : null;
    if (normalized && normalized.toLowerCase() !== "other" && normalized.toLowerCase() !== "others") {
      return normalized;
    }
    // No usable backend category — infer a sensible one from the product name
    // (Fruits & Vegetables, Rice & Grains, Dairy, Spices, Oils, etc.)
    return classifyByName(p?.name) || "Other";
  }, []);

  const parentOfMap = useMemo(() => {
    const map = {};
    const catById = {};
    if (apiCategories && apiCategories.length > 0) {
      apiCategories.forEach(c => { catById[c.id] = c; });
      apiCategories.forEach(c => {
        const normName = normalizeCatName(c.name);
        if (normName) {
          if (c.parent_id && catById[c.parent_id]) {
            const normParent = normalizeCatName(catById[c.parent_id].name);
            map[normName] = normParent;
          } else {
            map[normName] = null;
          }
        }
      });
    }
    return map;
  }, [apiCategories]);

  const categoryHierarchy = useMemo(
    () => buildHierarchyFromInventory(inventory, getCatName, parentOfMap),
    [inventory, getCatName, parentOfMap],
  );

  const categories = useMemo(() => {
    return ["All", ...Object.keys(categoryHierarchy).sort()];
  }, [categoryHierarchy]);

  // Chips shown to the user — hide the generic "All" and "Other" buckets,
  // but never leave the row empty if "Other" is all we have.
  const visibleCategories = useMemo(() => {
    const named = categories.filter(c => c !== "All" && c !== "Other" && c !== "Others");
    if (named.length > 0) return named;
    return categories.filter(c => c !== "All");
  }, [categories]);

  const inStockTotal = useMemo(() => inventory.filter(i => i.stock_qty > 0).length, [inventory]);

  const getTopCatCount = useCallback((catName) => {
    if (catName === "All") return inStockTotal;
    const subCats = categoryHierarchy[catName] || {};
    let total = 0;
    Object.values(subCats).forEach(items => {
      total += items.filter(i => i.is_active ?? true).length;
    });
    return total;
  }, [categoryHierarchy, inStockTotal]);

  // Active Category syncing
  useEffect(() => {
    if (categories.length > 0 && (!activeCat || !categories.includes(activeCat))) {
      setActiveCat("All");
    }
  }, [categories, activeCat]);

  // For global search and category filtering
  const filtered = useMemo(() => inventory.filter(item => {
    const name = (item.product?.name || "").toLowerCase();
    const cat = getCatName(item);
    const matchesSearch = !search || name.includes(search.toLowerCase());

    let matchesCat = activeCat === "All";
    if (!matchesCat) {
      if (cat === activeCat) {
        matchesCat = true;
      } else {
        const parentCatName = parentOfMap[cat];
        if (parentCatName === activeCat) {
          matchesCat = true;
        }
      }
    }
    return matchesSearch && matchesCat;
  }), [inventory, search, activeCat, getCatName, parentOfMap]);

  const inStock = useMemo(() => {
    let list = [...filtered.filter(i => i.is_active ?? true)];

    switch (sortBy) {
      case "price_asc":
        list.sort((a, b) => (a.product?.price || 0) - (b.product?.price || 0));
        break;

      case "price_desc":
        list.sort((a, b) => (b.product?.price || 0) - (a.product?.price || 0));
        break;

      case "discount":
        list.sort((a, b) => {
          const discountA =
            ((a.product?.mrp || a.product?.price || 0) -
              (a.product?.price || 0));

          const discountB =
            ((b.product?.mrp || b.product?.price || 0) -
              (b.product?.price || 0));

          return discountB - discountA;
        });
        break;

      case "name_asc":
        list.sort((a, b) =>
          (a.product?.name || "").localeCompare(b.product?.name || "")
        );
        break;

      case "name_desc":
        list.sort((a, b) =>
          (b.product?.name || "").localeCompare(a.product?.name || "")
        );
        break;

      default:
        break;
    }

    return list;
  }, [filtered, sortBy]);

  const outStock = useMemo(() => {
    let list = [...filtered.filter(i => !(i.is_active ?? true))];

    switch (sortBy) {
      case "price_asc":
        list.sort((a, b) => (a.product?.price || 0) - (b.product?.price || 0));
        break;

      case "price_desc":
        list.sort((a, b) => (b.product?.price || 0) - (a.product?.price || 0));
        break;

      case "discount":
        list.sort((a, b) => {
          const discountA =
            ((a.product?.mrp || a.product?.price || 0) -
              (a.product?.price || 0));

          const discountB =
            ((b.product?.mrp || b.product?.price || 0) -
              (b.product?.price || 0));

          return discountB - discountA;
        });
        break;

      case "name_asc":
        list.sort((a, b) =>
          (a.product?.name || "").localeCompare(b.product?.name || "")
        );
        break;

      case "name_desc":
        list.sort((a, b) =>
          (b.product?.name || "").localeCompare(a.product?.name || "")
        );
        break;

      default:
        break;
    }

    return list;
  }, [filtered, sortBy]);


  // ── Cart helpers ──────────────────────────────────────────────────────────
  const getQty = useCallback((pid) =>
    (cart?.items || []).find(i => i.id === pid)?.qty || 0,
    [cart?.items]);

  // handleAdd — opens weight picker for loose, direct add for packed
  const handleAdd = useCallback((item, selectedWeight = null) => {
    const p = item.product || {};
    const loose = isLooseItem(p);

    if (loose && !selectedWeight) {
      // Open weight picker — do NOT add yet
      setLoosePickerItem(item);
      return;
    }

    const unitStr = formatWeight(selectedWeight || p.unit);
    const finalPrice = loose
      ? calculateProportionalPrice(p.price, unitStr, p.unit || "1kg")
      : p.price;

    cart?.addItem?.({
      id: item.product_id,
      name: p.name,
      price: finalPrice,
      qty: 1,
      image: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
      unit: unitStr, // e.g. "500g" for loose
      vendorId,
      vendorName: vendor?.shop_name || vendorName,
    });
  }, [cart, vendorId, vendor, vendorName]);

  const handleRemove = useCallback((item) => {
    const cur = getQty(item.product_id);
    if (cur <= 1) cart?.removeItem?.(item.product_id);
    else cart?.updateQty?.(item.product_id, cur - 1);
  }, [cart, getQty]);

  const goBack = () => {
    if (Platform.OS === "web" && window.history.length > 1) window.history.back();
    else navigation.goBack();
  };

  // ── Desktop layout: sidebar + main ───────────────────────────────────────
  const renderProductGrid = (items) => (
    <View style={[s.grid, { gap }]}>
      {items.map(item => (
        <ProductCard
          key={item.product_id} item={item}
          qty={getQty(item.product_id)}
          onPress={() => setDetailItem(item)}
          onAdd={handleAdd} onRemove={handleRemove}
          cardW={cardW}
        />
      ))}
    </View>
  );



  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surfaceLowest} />
        <LinearGradient colors={[C.orange, C.orangeDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.loadingHeader}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Feather name="arrow-left" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={s.headerMid}>
            <Text style={s.appName}>KwikPik</Text>
            <Text style={s.shopName}>{vendorName || "Store"}</Text>
          </View>
        </LinearGradient>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={s.loadingText}>Loading store…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surfaceLowest} />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color={C.gray700} />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <View style={s.shopNameRow}>
            <Text style={s.shopName} numberOfLines={1}>{(vendor?.shop_name || vendorName || "Store").toUpperCase()}</Text>
            <View style={s.verifiedBadge}>
              <Feather name="check" size={10} color={C.white} />
            </View>
          </View>
          <View style={s.shopMetaRow}>
            <Text style={s.metaLink}>{vendor?.owner_name ? vendor.owner_name.split(" ")[0].toLowerCase() : "store"}</Text>
            <Text style={s.metaSep}>·</Text>
            <Text style={s.metaText}>{vendor?.shop_type || "Grocery Store"}</Text>
          </View>
          <View style={s.shopMetaRow}>
            <View style={s.ratingChip}>
              <Feather name="star" size={11} color={C.green} />
              <Text style={s.ratingText}>{vendor?.rating ? Number(vendor.rating).toFixed(1) : "4.8"}</Text>
            </View>
            <Text style={s.metaSep}>·</Text>
            <Text style={s.metaText}>{t('vendorStore.inStock', { count: inStockTotal })}</Text>
            <Text style={s.metaSep}>·</Text>
            <Feather name="clock" size={11} color={C.gray500} />
            <Text style={s.metaText} numberOfLines={1}>
              {isStoreCurrentlyOpen(vendor)
                ? (vendor?.closing_time ? `Open till ${vendor.closing_time}` : t('vendorStore.open'))
                : t('vendorStore.closed')}
            </Text>
          </View>
        </View>

        {isWide && (
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.headerActionBtn}
              activeOpacity={0.8}
              onPress={() => { setWishlistCount(c => c + (wishlistCount ? 0 : 1)); }}
            >
              <Feather name="heart" size={16} color={C.gray700} />
              <Text style={s.headerActionText}>Wishlist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerActionBtn}
              activeOpacity={0.8}
              onPress={() => {
                const shopName = vendor?.shop_name || vendorName || "this store";
                if (Platform.OS === "web") { Alert.alert?.("Share", `Check out ${shopName} on KwikPik!`); }
                else Share.share({ message: `Check out ${shopName} on KwikPik!` }).catch(() => { });
              }}
            >
              <Feather name="share-2" size={16} color={C.gray700} />
              <Text style={s.headerActionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerActionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("CustomerTabNavigator", { screen: "Cart" })}
            >
              <View>
                <Feather name="shopping-cart" size={16} color={C.gray700} />
                {cartCount > 0 && (
                  <View style={s.headerCartDot}><Text style={s.headerCartDotText}>{cartCount}</Text></View>
                )}
              </View>
              <Text style={s.headerActionText}>Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerActionBtn}
              activeOpacity={0.8}
              onPress={() => Alert.alert?.("Help", "Need help? Chat with the store or contact support.")}
            >
              <Feather name="help-circle" size={16} color={C.gray700} />
              <Text style={s.headerActionText}>Help</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[s.statusChip, !isStoreCurrentlyOpen(vendor) && s.statusChipClosed]}>
          <View style={[s.statusDot, { backgroundColor: isStoreCurrentlyOpen(vendor) ? C.greenFixed : "#EF4444" }]} />
          <Text style={[s.statusText, !isStoreCurrentlyOpen(vendor) && s.statusTextClosed]}>
            {isStoreCurrentlyOpen(vendor) ? t('vendorStore.open') : t('vendorStore.closed')}
          </Text>
        </View>

        {!isWide && (
          <TouchableOpacity
            style={s.headerSearchBtn}
            onPress={() => searchInputRef.current?.focus?.()}
            activeOpacity={0.8}
          >
            <Feather name="search" size={18} color={C.green} />
          </TouchableOpacity>
        )}
      </View>

      {/* SEARCH + SORT */}
      <View style={s.searchSortWrap}>
        <View style={[s.searchBox, searchFocus && s.searchBoxActive]}>
          <Feather name="search" size={15} color={searchFocus ? C.green : C.gray400} />
          <TextInput
            ref={searchInputRef}
            style={s.searchInput}
            placeholder={t('vendorStore.searchIn', { name: vendor?.shop_name || "store" })}
            placeholderTextColor={C.gray400}
            value={search}
            onChangeText={t => setSearch(t)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            underlineColorAndroid="transparent"
            selectionColor={C.green}
          />
          {search.length > 0 && (
            <TouchableOpacity style={s.searchClearBtn} onPress={() => setSearch("")}>
              <Feather name="x" size={12} color={C.gray600} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ position: "relative" }}>
          <TouchableOpacity
            ref={sortBtnRef}
            style={s.sortBtn}
            activeOpacity={0.85}
            onPress={() => {
              if (sortBtnRef.current?.measureInWindow) {
                sortBtnRef.current.measureInWindow((x, y, width, height) => {
                  setSortBtnLayout({ x, y, width, height });
                  setSortMenuOpen(true);
                });
              } else {
                setSortMenuOpen(true);
              }
            }}
          >
            <Feather name="bar-chart-2" size={14} color={C.gray700} style={{ transform: [{ rotate: "90deg" }] }} />
            <Text style={s.sortBtnText}>{t('vendorStore.sort')}</Text>
            <Feather name={sortMenuOpen ? "chevron-up" : "chevron-down"} size={14} color={C.gray700} />
          </TouchableOpacity>
        </View>
        {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortRow}>
          {[
            { key: "default", label: t('vendorStore.default') },
            { key: "price_asc", label: t('vendorStore.priceLowHigh'), icon: "arrow-up" },
            { key: "price_desc", label: t('vendorStore.priceHighLow'), icon: "arrow-down" },
            { key: "discount", label: t('vendorStore.bestDiscount'), icon: "percent" },
            { key: "name_asc", label: t('vendorStore.nameAZ') },
            { key: "name_desc", label: t('vendorStore.nameZA') },
          ]

            .map((opt) => {
              const active = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSortBy(opt.key)}
                  style={[s.sortPill, active && s.sortPillActive]}
                  activeOpacity={0.8}
                >
                  {opt.icon && <Feather name={opt.icon} size={10} color={active ? C.white : C.gray600} style={{ marginRight: 4 }} />}
                  <Text style={[s.sortPillText, active && s.sortPillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView> */}
      </View>

      {/* SORT DROPDOWN — small popover anchored right under the Sort button */}
      <Modal visible={sortMenuOpen} transparent animationType="fade" onRequestClose={() => setSortMenuOpen(false)}>
        <Pressable style={s.sortModalBackdrop} onPress={() => setSortMenuOpen(false)}>
          <View
            style={[
              s.sortPopover,
              {
                top: sortBtnLayout.y + sortBtnLayout.height + 8,
                left: Math.max(12, sortBtnLayout.x + sortBtnLayout.width - 220),
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {[
              { key: "default", label: t('vendorStore.default') },
              { key: "price_asc", label: t('vendorStore.priceLowHigh'), icon: "arrow-up" },
              { key: "price_desc", label: t('vendorStore.priceHighLow'), icon: "arrow-down" },
              { key: "discount", label: t('vendorStore.bestDiscount'), icon: "percent" },
              { key: "name_asc", label: t('vendorStore.nameAZ') },
              { key: "name_desc", label: t('vendorStore.nameZA') },
            ].map((opt) => {
              const active = sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => { setSortBy(opt.key); setSortMenuOpen(false); }}
                  style={[s.sortMenuItem, active && s.sortMenuItemActive]}
                  activeOpacity={0.8}
                >
                  {opt.icon
                    ? <Feather name={opt.icon} size={13} color={active ? C.green : C.gray500} style={{ width: 18 }} />
                    : <View style={{ width: 18 }} />}
                  <Text style={[s.sortMenuItemText, active && s.sortMenuItemTextActive]}>{opt.label}</Text>
                  {active && <Feather name="check" size={15} color={C.green} style={{ marginLeft: "auto" }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* CATEGORY ICON ROW — circular icon chips, sticky just under search/sort so it's always reachable while banners scroll away */}
      {!search && visibleCategories.length > 0 && (
        <View style={s.catTabsWrap}>
          <ScrollView
            ref={catScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={(w) => setCatContentW(w)}
            onLayout={(e) => setCatTrackW(e.nativeEvent.layout.width)}
            onScroll={(e) => setCatScrollX(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={32}
            contentContainerStyle={[s.catTabsRow, { paddingHorizontal: hPad }]}
          >
            <CatIconChip
              cat="All"
              isAll={true}
              isActive={activeCat === "All"}
              onPress={() => setActiveCat("All")}
            />
            {visibleCategories.map(cat => (
              <CatIconChip
                key={cat} cat={cat}
                isAll={false}
                isActive={activeCat === cat}
                onPress={() => setActiveCat(activeCat === cat ? "All" : cat)}
              />
            ))}
          </ScrollView>
          {catContentW > catTrackW + 4 && (
            <TouchableOpacity
              style={s.catScrollNextBtn}
              activeOpacity={0.8}
              onPress={() => {
                const nextX = Math.min(catContentW - catTrackW, catScrollX + catTrackW * 0.8);
                catScrollRef.current?.scrollTo({ x: nextX, animated: true });
                setCatScrollX(nextX);
              }}
            >
              <Feather name="chevron-right" size={16} color={C.gray700} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* PRODUCTS BODY */}
      <View style={s.bodyRow}>
        {/* Main product list */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          onLayout={(e) => setGridAreaW(e.nativeEvent.layout.width)}
          contentContainerStyle={[s.body, { paddingHorizontal: hPad }]}
        >
          {/* PROMO BANNERS — 3 equal cards, now inside the scroll so they move with the page */}
          {!search && (
            <View style={s.promoRow}>
              <View style={[s.promoCard, s.promoCardGreen]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.promoCardLabel}>Fresh Vegetables</Text>
                  <Text style={s.promoCardValue}>Upto 20% OFF</Text>
                  <Text style={s.promoCardSub}>Farm fresh & handpicked</Text>
                  <TouchableOpacity style={s.promoShopBtn} onPress={() => setActiveCat("Fruits & Vegetables")} activeOpacity={0.85}>
                    <Text style={s.promoShopBtnText}>Shop Now</Text>
                  </TouchableOpacity>
                </View>
                <MaterialIcons name="eco" size={40} color={C.green} style={{ opacity: 0.28 }} />
              </View>

              <View style={[s.promoCard, s.promoCardOrange]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.promoCardLabel}>Daily Essentials</Text>
                  <Text style={[s.promoCardValue, { color: C.orangeDark }]}>Upto 15% OFF</Text>
                  <Text style={s.promoCardSub}>On all essentials</Text>
                  <TouchableOpacity style={[s.promoShopBtn, s.promoShopBtnOrange]} onPress={() => setActiveCat("All")} activeOpacity={0.85}>
                    <Text style={s.promoShopBtnText}>Shop Now</Text>
                  </TouchableOpacity>
                </View>
                <MaterialIcons name="local-grocery-store" size={40} color={C.orangeDark} style={{ opacity: 0.28 }} />
              </View>

              <View style={[s.promoCard, s.promoCardGreen]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.promoCardLabel}>Weekend Special</Text>
                  <Text style={s.promoCardValue}>Extra 5% OFF</Text>
                  <Text style={s.promoCardSub}>On orders above ₹499</Text>
                  <View style={s.promoCodeBtn}>
                    <Text style={s.promoCodeText}>Use Code: WEEKEND5</Text>
                  </View>
                </View>
                <MaterialIcons name="card-giftcard" size={40} color={C.green} style={{ opacity: 0.28 }} />
              </View>
            </View>
          )}

          {inStock.length === 0 && outStock.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIconWrap}>
                {activeCat !== "All"
                  ? <Image source={{ uri: getCatMeta(activeCat).img }} style={{ width: 72, height: 72, borderRadius: 24, opacity: 0.35 }} resizeMode="cover" />
                  : <MaterialIcons name={search ? "search-off" : "inventory"} size={44} color={C.gray400} />}
              </View>
              <Text style={s.emptyTitle}>
                {search ? "No results found" : activeCat === "All" ? "No products available" : `No ${activeCat} in stock`}
              </Text>
              <Text style={s.emptySub}>
                {search ? "Try a different keyword" : activeCat === "All" ? "Check back later" : "Nothing in this category right now"}
              </Text>
            </View>
          ) : (
            <>
              {/* Product grid list */}
              {inStock.length > 0 && (
                <>
                  {activeCat !== "All" && !search && <CatSectionHeader cat={activeCat} count={inStock.length} />}
                  {search && (
                    <View style={s.searchResultHeader}>
                      <Text style={s.searchResultText}>
                        {inStock.length} result{inStock.length !== 1 ? "s" : ""} for "{search}"
                      </Text>
                    </View>
                  )}
                  {activeCat === "All" && !search && (
                    <View style={s.allProductsHeader}>
                      <Text style={s.allProductsTitle}>All Products</Text>
                      <Text style={s.allProductsCount}>{inStockTotal}+ items</Text>
                    </View>
                  )}
                  {renderProductGrid(inStock)}
                </>
              )}

              {/* Out of stock */}
              {outStock.length > 0 && (
                <View style={{ marginTop: 24 }}>
                  <View style={s.oosSectionHeader}>
                    <Feather name="alert-circle" size={14} color={C.gray400} />
                    <Text style={s.oosSectionTitle}>Out of Stock ({outStock.length})</Text>
                  </View>
                  {renderProductGrid(outStock)}
                </View>
              )}
            </>
          )}

          {/* STORE INFORMATION — shown at the bottom of the products, below everything */}
          {!search && (
            <View style={s.infoSection}>
              <View style={s.infoSectionRow}>
                {/* Store Information card */}
                <View style={s.infoCard}>
                  <View style={s.infoCardHeaderRow}>
                    <View style={s.infoCardIconWrap}>
                      <Feather name="home" size={16} color={C.green} />
                    </View>
                    <Text style={s.infoCardTitle}>Store Information</Text>
                  </View>

                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Store Name</Text>
                    <Text style={s.infoValue} numberOfLines={1}>{vendor?.shop_name || vendorName || "—"}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Store Type</Text>
                    <Text style={s.infoValue}>{vendor?.shop_type || "Grocery Store"}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Open Till</Text>
                    <Text style={s.infoValue}>{vendor?.closing_time || "10:00 PM"}</Text>
                  </View>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Address</Text>
                    <Text style={s.infoValue} numberOfLines={2}>{vendor?.address || "—"}</Text>
                  </View>

                  <TouchableOpacity
                    style={s.chatStoreBtn}
                    activeOpacity={0.85}
                    onPress={() => Alert.alert?.("Chat with Store", "Store chat is coming soon.")}
                  >
                    <Feather name="message-circle" size={15} color={C.green} />
                    <Text style={s.chatStoreBtnText}>Chat with Store</Text>
                  </TouchableOpacity>
                </View>

                {/* Delivery / payment trust card */}
                <View style={s.infoCard}>
                  <View style={s.trustRow}>
                    <View style={s.trustIconWrap}>
                      <Feather name="truck" size={16} color={C.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.trustTitle}>Fast Delivery</Text>
                      <Text style={s.trustSub}>Delivery in 30–45 mins</Text>
                    </View>
                    <View style={s.trustPill}><Text style={s.trustPillText}>On Time</Text></View>
                  </View>
                  <View style={s.trustDivider} />
                  <View style={s.trustRow}>
                    <View style={s.trustIconWrap}>
                      <Feather name="package" size={16} color={C.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.trustTitle}>Free Delivery</Text>
                      <Text style={s.trustSub}>On orders above ₹499</Text>
                    </View>
                    <View style={s.trustPill}><Text style={s.trustPillText}>₹49 saved</Text></View>
                  </View>
                  <View style={s.trustDivider} />
                  <View style={s.trustRow}>
                    <View style={s.trustIconWrap}>
                      <Feather name="shield" size={16} color={C.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.trustTitle}>Secure Payment</Text>
                      <Text style={s.trustSub}>100% secure checkout</Text>
                    </View>
                    <View style={s.trustPill}><Text style={s.trustPillText}>Safe</Text></View>
                  </View>
                </View>

                {/* Exclusive offers card */}
                <View style={[s.infoCard, s.offersCard]}>
                  <View style={{ flex: 1 }}>
                    <View style={s.infoCardHeaderRow}>
                      <View style={[s.infoCardIconWrap, { backgroundColor: C.orangeMid }]}>
                        <Feather name="gift" size={16} color={C.orangeDark} />
                      </View>
                      <Text style={s.infoCardTitle}>Exclusive Offers</Text>
                    </View>
                    <Text style={s.offersSub}>Grab best offers on your favourite products</Text>
                    <TouchableOpacity style={s.viewOffersBtn} activeOpacity={0.85} onPress={() => setActiveCat("All")}>
                      <Text style={s.viewOffersBtnText}>View All Offers</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 130 }} />
        </ScrollView>
      </View>

      {/* PRODUCT DETAIL MODAL */}
      <ProductModal
        item={detailItem}
        qty={detailItem ? getQty(detailItem.product_id) : 0}
        onClose={() => setDetailItem(null)}
        onAdd={handleAdd}
        onRemove={handleRemove}
        onOpenWeightPicker={(item) => { setDetailItem(null); setLoosePickerItem(item); }}
      />

      {/* WEIGHT PICKER MODAL */}
      <WeightPickerModal
        item={loosePickerItem}
        onClose={() => setLoosePickerItem(null)}
        onAdd={(item, weight) => { handleAdd(item, weight); setLoosePickerItem(null); }}
      />

      {/* FLOATING CART */}
      {cartCount > 0 && (
        <Animated.View style={[s.floatingCart, { transform: [{ translateY: floatingY }] }]}>
          <TouchableOpacity
            style={s.floatingInner}
            onPress={() => navigation.navigate("CustomerTabNavigator", { screen: "Cart" })}
            activeOpacity={0.88}
          >
            <View style={s.floatingLeft}>
              <View style={s.floatingBadge}>
                <Text style={s.floatingBadgeText}>{cartCount}</Text>
              </View>
              <View>
                <Text style={s.floatingItems}>{cartCount} item{cartCount > 1 ? "s" : ""} added</Text>
                <Text style={s.floatingTotal}>₹{cartTotal} total</Text>
              </View>
            </View>
            <View style={s.floatingCTA}>
              <Text style={s.floatingCTAText}>View Cart</Text>
              <Feather name="arrow-right" size={14} color={C.white} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15, color: C.gray400, fontWeight: "500" },

  // ── Header — white surface card style ──
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 14 : 52,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.surfaceLowest,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 999,
    backgroundColor: C.surfaceLow,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  headerMid: { flex: 1 },
  shopNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  appName: {
    fontSize: 10, fontWeight: "800", color: C.orangeDark,
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2,
  },
  shopName: { fontSize: 20, fontWeight: "900", color: C.gray900, letterSpacing: 0 },
  verifiedBadge: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.green, alignItems: "center", justifyContent: "center",
  },
  metaLink: { fontSize: 12, color: C.green, fontWeight: "700" },
  shopMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  statusDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  metaText: { fontSize: 12, color: C.gray600, fontWeight: "600" },
  metaSep: { color: C.outlineVar, fontSize: 12 },
  ratingChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.greenMid,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, flexShrink: 0,
  },
  ratingText: { fontSize: 11, fontWeight: "800", color: C.green },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.greenDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusChipClosed: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 12, fontWeight: "800", color: C.greenFixed },
  statusTextClosed: { color: "#DC2626" },
  headerSearchBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceLow,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 20, marginRight: 4 },
  headerActionBtn: { alignItems: "center", gap: 4 },
  headerActionText: { fontSize: 10, fontWeight: "700", color: C.gray600 },
  headerCartDot: {
    position: "absolute", top: -6, right: -8,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: C.green, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerCartDotText: { fontSize: 8, fontWeight: "900", color: C.white },

  // ── Search + Sort (single row) ──
  searchSortWrap: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 10,
    backgroundColor: C.bg,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.gray200,
    paddingHorizontal: 14, paddingVertical: 13, gap: 10,
  },
  searchBoxActive: { borderColor: C.green, backgroundColor: C.greenLight },
  searchInput: { flex: 1, fontSize: 14, color: C.gray900, ...Platform.select({ web: { outlineStyle: "none" } }) },
  searchClearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.gray300, alignItems: "center", justifyContent: "center" },

  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.green,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
  },
  sortBtnText: { fontSize: 13, fontWeight: "800", color: C.gray900 },

  // Transparent full-screen layer — only used to detect taps outside the popover
  sortModalBackdrop: { flex: 1 },
  // Small popover anchored just under the Sort button (position set inline via sortBtnLayout)
  sortPopover: {
    position: "absolute",
    width: 220,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.gray200,
    paddingVertical: 6, paddingHorizontal: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 14,
  },
  sortMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10 },
  sortMenuItemActive: { backgroundColor: C.greenLight },
  sortMenuItemText: { fontSize: 13, fontWeight: "600", color: C.gray700 },
  sortMenuItemTextActive: { color: C.green, fontWeight: "800" },

  // ── Promo banners (3-up) ──
  promoRow: { flexDirection: "row", gap: 14, paddingBottom: 6, paddingTop: 12 },
  promoCard: {
    flex: 1, borderRadius: 18, padding: 16,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    minHeight: 150,
  },
  promoCardGreen: { backgroundColor: C.greenLight, borderWidth: 1, borderColor: C.greenBorder },
  promoCardOrange: { backgroundColor: C.orangeMid, borderWidth: 1, borderColor: C.orangeLight },
  promoCardLabel: { fontSize: 13, fontWeight: "800", color: C.gray900, marginBottom: 4 },
  promoCardValue: { fontSize: 17, fontWeight: "900", color: C.green, marginBottom: 4 },
  promoCardSub: { fontSize: 11, color: C.gray500, fontWeight: "600", marginBottom: 12 },
  promoShopBtn: { backgroundColor: C.green, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" },
  promoShopBtnOrange: { backgroundColor: C.orange },
  promoShopBtnText: { fontSize: 12, fontWeight: "800", color: C.white },
  promoCodeBtn: { backgroundColor: C.greenDark, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, alignSelf: "flex-start" },
  promoCodeText: { fontSize: 11, fontWeight: "800", color: C.white },

  // ── Category tabs ──
  catTabsWrap: { backgroundColor: C.bg, position: "relative" },
  catTabsRow: { paddingTop: 4, paddingBottom: 12, paddingRight: 44, flexDirection: "row" },
  catScrollNextBtn: {
    position: "absolute", right: 6, top: 17,
    width: 30, height: 30, borderRadius: 999,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },

  loadingHeader: { paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 14 : 52, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 },

  // Desktop layout
  bodyRow: { flex: 1, flexDirection: "row" },

  body: { paddingTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  sectionDivider: { height: 1, backgroundColor: C.gray100, marginTop: 16, marginHorizontal: 4 },

  allProductsHeader: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingTop: 18, paddingBottom: 12 },
  allProductsTitle: { fontSize: 18, fontWeight: "900", color: C.gray900 },
  allProductsCount: { fontSize: 12, fontWeight: "700", color: C.gray500 },

  // ── Store info section — sits at the bottom of the products list ──
  infoSection: { marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: C.gray200 },
  infoSectionRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  infoCard: {
    flexGrow: 1, flexBasis: 260, minWidth: 240,
    backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.gray200,
    padding: 16,
  },
  infoCardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  infoCardIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: C.greenLight,
    alignItems: "center", justifyContent: "center",
  },
  infoCardTitle: { fontSize: 14, fontWeight: "800", color: C.gray900 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  infoLabel: { fontSize: 12, color: C.gray500, fontWeight: "600" },
  infoValue: { fontSize: 12, color: C.gray900, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  chatStoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: C.green, borderRadius: 999,
    paddingVertical: 11, marginTop: 6,
  },
  chatStoreBtnText: { fontSize: 13, fontWeight: "800", color: C.green },

  trustRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  trustIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: C.greenLight,
    alignItems: "center", justifyContent: "center",
  },
  trustTitle: { fontSize: 13, fontWeight: "800", color: C.gray900 },
  trustSub: { fontSize: 11, color: C.gray500, fontWeight: "600", marginTop: 1 },
  trustPill: { backgroundColor: C.greenMid, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  trustPillText: { fontSize: 10, fontWeight: "800", color: C.green },
  trustDivider: { height: 1, backgroundColor: C.gray100, marginVertical: 8 },

  offersCard: { backgroundColor: C.orangeMid, borderColor: C.orangeLight, flexDirection: "row" },
  offersSub: { fontSize: 12, color: C.gray600, fontWeight: "600", marginBottom: 12, lineHeight: 17 },
  viewOffersBtn: { backgroundColor: C.greenDark, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, alignSelf: "flex-start" },
  viewOffersBtnText: { fontSize: 12, fontWeight: "800", color: C.white },

  searchResultHeader: { paddingTop: 14, paddingBottom: 6 },
  searchResultText: { fontSize: 14, color: C.gray500, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },
  oosSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 12 },
  oosSectionTitle: { fontSize: 16, fontWeight: "800", color: C.gray400, fontFamily: "PlusJakartaSans_800ExtraBold" },

  emptyBox: { alignItems: "center", paddingTop: 70, paddingBottom: 40, gap: 8 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 999,
    backgroundColor: C.surfaceLow,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6, overflow: "hidden",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.gray700, textAlign: "center" },
  emptySub: { fontSize: 14, color: C.gray400, textAlign: "center", lineHeight: 20 },
  browseAllBtn: { marginTop: 10, backgroundColor: C.greenMid, borderWidth: 1, borderColor: C.greenBorder, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 },
  browseAllText: { fontSize: 14, fontWeight: "700", color: C.green },

  promoWrap: {
    flexDirection: "row",
    gap: 14,
    marginTop: 28,
    minHeight: 192,
  },
  promoLarge: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(252,129,37,0.16)",
    borderWidth: 1,
    borderColor: "rgba(252,129,37,0.28)",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  promoTitle: { fontSize: 14, fontWeight: "900", color: C.orangeDark, lineHeight: 19 },
  promoSub: { fontSize: 12, color: C.gray600, lineHeight: 17, marginTop: 8 },
  promoIcon: { alignSelf: "flex-end", opacity: 0.55 },
  promoStack: { flex: 1, gap: 14 },
  promoMini: {
    flex: 1,
    borderRadius: 24,
    padding: 14,
    backgroundColor: C.greenLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoMiniGreen: {
    backgroundColor: "rgba(0,94,38,0.1)",
    justifyContent: "flex-start",
    gap: 12,
  },
  promoOverline: { fontSize: 10, fontWeight: "900", color: C.green, letterSpacing: 1 },
  promoMiniValue: { fontSize: 15, fontWeight: "900", color: C.gray900, marginTop: 4 },
  couponIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: C.greenFixed,
    alignItems: "center",
    justifyContent: "center",
  },
  couponText: { flex: 1, fontSize: 11, fontWeight: "800", color: C.green, lineHeight: 15 },



  floatingCart: { position: "absolute", bottom: 20, left: 16, right: 16, backgroundColor: C.green, borderRadius: 20, shadowColor: C.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 14, zIndex: 100 },
  floatingInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, paddingHorizontal: 18, borderRadius: 20 },
  floatingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  floatingBadge: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  floatingBadgeText: { fontSize: 16, fontWeight: "900", color: C.white },
  floatingItems: { fontSize: 14, fontWeight: "700", color: C.white },
  floatingTotal: { fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 1 },
  floatingCTA: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  floatingCTAText: { fontSize: 14, fontWeight: "800", color: C.white },
});