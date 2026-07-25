import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
<<<<<<< HEAD
  View, Text, StyleSheet, ScrollView, FlatList, Image,
  TouchableOpacity, TextInput, ActivityIndicator,
  Animated, Platform, StatusBar, Keyboard,
  KeyboardAvoidingView, Dimensions, Modal,
=======
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
  Dimensions,
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import { calculateProportionalPrice } from "../../utils/weightUtils";
<<<<<<< HEAD
import { categoriesAPI, searchAPI, vendorsAPI } from "../../services/api";
=======
import {
  categoriesAPI,
  searchAPI,
  vendorsAPI,
  productsAPI,
} from "../../services/api";
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const NEARBY_RADIUS = 10; // km — stores within this are shown normally
const FAR_RADIUS = 10; // km — backend validation max is 10
const MAX_HISTORY = 8;

<<<<<<< HEAD
const TRENDING_SEARCHES = [
  { label: "Amul Milk", icon: "🥛" },
  { label: "Fortune Oil", icon: "🌶️" },
  { label: "Aashirvaad Atta", icon: "🌾" },
  { label: "Maggi Noodles", icon: "🥣" },
  { label: "Fresh Eggs", icon: "🥚" },
  { label: "Cheetos", icon: "🍿" },
  { label: "Coca Cola", icon: "🥤" },
];

const VOICE_SUGGESTIONS = [
  "Amul Gold Milk",
  "Fortune Mustard Oil",
  "Aashirvaad Atta 5kg",
  "Maggi 2-Minute Noodles",
  "Coca Cola Can",
  "Fresh Brown Eggs",
  "Lays Potato Chips",
];

=======
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
// ─── Palette (matches app design system) ─────────────────────────────────────
const C = {
  orange: "#F97316",
  orangeDark: "#EA580C",
  green: "#16A34A",
  greenDark: "#15803D",
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
  gray900: "#111827",
  amber: "#D97706",
  amberLight: "#FEF3C7",
  red: "#DC2626",
  redLight: "#FEF2F2",
};

const CAT_FALLBACK_IMGS = {
  "Dairy, Bread & Eggs":
    "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80",
  "Fruits & Vegetables":
    "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80",
  "Cold Drinks & Juices":
    "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80",
  "Snacks & Munchies":
    "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
  "Breakfast & Instant Food":
    "https://images.unsplash.com/photo-1569058242252-62324e7d5567?w=400&q=80",
  "Sweet Tooth":
    "https://images.unsplash.com/photo-1582231229718-4c5931bc1184?w=400&q=80",
  "Bakery & Biscuits":
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
  "Tea, Coffee & Milk Drinks":
    "https://images.unsplash.com/photo-1544787210-2211d7c309c7?w=400&q=80",
  "Atta, Rice & Dal":
    "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
  "Masala, Oil & More":
    "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80",
  "Sauces & Spreads":
    "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&q=80",
  "Cleaning Essentials":
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80",
  "Personal Care":
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80",
  "Home & Office":
    "https://images.unsplash.com/photo-1586075010633-2445c9ff093b?w=400&q=80",
  _default:
    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
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
  Bread: { bg: "#FFFBEB", accent: "#D97706", icon: "🍞" },
  Chips: { bg: "#FEF2F2", accent: "#EF4444", icon: "🍟" },
  Milk: { bg: "#F0F9FF", accent: "#0EA5E9", icon: "🥛" },
  Rice: { bg: "#FEFCE8", accent: "#EAB308", icon: "🌾" },
  _default: { bg: "#F3F4F6", accent: "#6B7280", icon: "📦" },
};

// ─── Store category metadata ───────────────────────────────────────────────────
const STORE_CAT_META = {
  grocery: { icon: "🛒", label: "Grocery", color: "#16A34A", bg: "#F0FDF4" },
  medical: { icon: "💊", label: "Medical", color: "#2563EB", bg: "#EFF6FF" },
  restaurant: {
    icon: "🍽️",
    label: "Restaurant",
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  bakery: { icon: "🥖", label: "Bakery", color: "#D97706", bg: "#FFFBEB" },
  dairy: { icon: "🥛", label: "Dairy", color: "#0EA5E9", bg: "#F0F9FF" },
  electronics: {
    icon: "📱",
    label: "Electronics",
    color: "#7C3AED",
    bg: "#FAF5FF",
  },
  stationery: {
    icon: "✏️",
    label: "Stationery",
    color: "#475569",
    bg: "#F8FAFC",
  },
  general: { icon: "🏪", label: "General", color: "#6B7280", bg: "#F3F4F6" },
  _default: { icon: "🏪", label: "Store", color: "#6B7280", bg: "#F3F4F6" },
};

// ─── Haversine distance ───────────────────────────────────────────────────────
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── useBreakpoint ────────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = React.useState(Dimensions.get("window").width);
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) =>
      setW(window.width),
    );
    return () => sub?.remove?.();
  }, []);
  if (w >= 1024) return { isDesktop: true, isTablet: false, isMobile: false };
  if (w >= 640) return { isDesktop: false, isTablet: true, isMobile: false };
  return { isDesktop: false, isTablet: false, isMobile: true };
}

// ─── Add/Qty button (uses real cartStore) ─────────────────────────────────────
function AddBtn({ product, vendorId, vendorName, outOfStock }) {
  const cart = useCartStore();
  const items = cart?.items || [];
  const cartItem = items.find((i) => i.id === product.id);
  const qty = cartItem?.qty ?? cartItem?.quantity ?? 0;

  const sc = useRef(new Animated.Value(1)).current;
<<<<<<< HEAD
  const pop = () => Animated.sequence([
    Animated.spring(sc, { toValue: 0.85, useNativeDriver: true, tension: 400 }),
    Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 200 }),
  ]).start();
=======
  const pop = () =>
    Animated.sequence([
      Animated.spring(sc, {
        toValue: 0.85,
        useNativeDriver: true,
        tension: 400,
      }),
      Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  const doAdd = () => {
    pop();
    const isLoose = product.item_type === "loose";
    const finalPrice = isLoose
      ? calculateProportionalPrice(
          product.price,
          product.unit || "1kg",
          product.unit || "1kg",
        )
      : product.price;

    cart?.addItem?.({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: product.image_url,
      unit: product.unit,
      quantity: 1,
      vendorId,
      vendorName,
    });
  };
  const doRemove = () => {
    pop();
    cart?.removeItem?.(product.id);
  };

  if (outOfStock) {
    return (
      <View style={ab.oosBtn}>
        <Text style={ab.oosTxt}>Out of Stock</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      {qty === 0 ? (
        <TouchableOpacity style={ab.add} onPress={doAdd} activeOpacity={0.85}>
          <Text style={ab.addTxt}>+ ADD</Text>
        </TouchableOpacity>
      ) : (
        <View style={ab.qtyRow}>
          <TouchableOpacity style={ab.qtyBtn} onPress={doRemove}>
            <Feather name="minus" size={13} color={C.white} />
          </TouchableOpacity>
          <Text style={ab.qtyNum}>{qty}</Text>
          <TouchableOpacity style={ab.qtyBtn} onPress={doAdd}>
            <Feather name="plus" size={13} color={C.white} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}
const ab = StyleSheet.create({
  add: {
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.green,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addTxt: {
    fontSize: 13,
    fontWeight: "800",
    color: C.green,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.green,
    borderRadius: 9,
    overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 9, paddingVertical: 7 },
  qtyNum: {
    fontSize: 13,
    fontWeight: "800",
    color: C.white,
    paddingHorizontal: 8,
    minWidth: 24,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  oosBtn: {
    backgroundColor: C.gray100,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.gray200,
  },
  oosTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: C.gray400,
    fontFamily: "PlusJakartaSans_700Bold",
  },
});

// ─── Product card (items tab) ─────────────────────────────────────────────────
function ProductCard({ product, vendorId, vendorName, onSeeStores }) {
<<<<<<< HEAD
  const disc = product.mrp && product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100) : null;
  const outOfStock = (product.stock_qty != null && product.stock_qty <= 0);
=======
  const disc =
    product.mrp && product.mrp > product.price
      ? Math.round((1 - product.price / product.mrp) * 100)
      : null;
  const outOfStock = product.stock_qty != null && product.stock_qty <= 0;
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  return (
    <View style={[pc.card, outOfStock && pc.cardOos]}>
      <View style={pc.imgWrap}>
        <Image
          source={{
            uri:
              product.image_url ||
              "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300",
          }}
          style={pc.img}
          resizeMode="cover"
        />
        {disc && !outOfStock && (
          <View style={pc.discBadge}>
            <Text style={pc.discText}>{disc}% off</Text>
          </View>
        )}
        {outOfStock && (
          <View style={pc.oosOverlay}>
            <Text style={pc.oosOverlayText}>Out of{"\n"}Stock</Text>
          </View>
        )}
      </View>
      <View style={pc.info}>
        <Text style={pc.brand}>
          {product.vendor?.shop_name || vendorName || ""}
        </Text>
        <Text style={pc.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={pc.unit}>{product.unit || "1 pc"}</Text>
        <View style={pc.priceRow}>
          <Text style={[pc.price, outOfStock && { color: C.gray400 }]}>
            ₹{product.price}
          </Text>
          {product.mrp > product.price && (
            <Text style={pc.mrp}>₹{product.mrp}</Text>
          )}
        </View>
        {!outOfStock && onSeeStores && (
          <TouchableOpacity
            style={pc.storeBtn}
            onPress={onSeeStores}
            activeOpacity={0.7}
          >
            <Feather name="shopping-bag" size={10} color={C.green} />
            <Text style={pc.storeBtnText}>
              {product._storeCount > 1
                ? `Available at ${product._storeCount} stores`
                : "See store"}
            </Text>
            <Feather name="chevron-right" size={10} color={C.green} />
          </TouchableOpacity>
        )}
      </View>
      <View style={pc.ctaWrap}>
        <AddBtn
          product={product}
          vendorId={vendorId}
          vendorName={vendorName}
          outOfStock={outOfStock}
        />
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  cardOos: { opacity: 0.55 },
  imgWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: C.gray100,
    position: "relative",
  },
  img: { width: "100%", height: "100%" },
  discBadge: {
    position: "absolute",
    top: 5,
    left: 0,
    backgroundColor: C.orange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  discText: {
    fontSize: 9,
    color: C.white,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  oosOverlayText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
    textAlign: "center",
    lineHeight: 14,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  info: { flex: 1, gap: 2 },
  brand: {
    fontSize: 10,
    color: C.green,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gray900,
    lineHeight: 19,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  unit: {
    fontSize: 12,
    color: C.gray400,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: C.gray900,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  mrp: {
    fontSize: 12,
    color: C.gray400,
    textDecorationLine: "line-through",
    fontFamily: "PlusJakartaSans_500Medium",
  },
  storeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  storeBtnText: {
    fontSize: 11,
    color: C.green,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  ctaWrap: { paddingTop: 16 },
});

// ─── Vendor card (places tab) ─────────────────────────────────────────────────
function VendorCard({ vendor, distKm: dist, matchCount, onPress, tooFar }) {
  const isOpen = vendor.is_open;
  return (
    <TouchableOpacity
      style={[vc.card, tooFar && vc.cardFar]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={tooFar}
    >
      <View style={vc.imgWrap}>
        <Image
          source={{
            uri:
              vendor.shop_image_url ||
              "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
          }}
          style={vc.img}
          resizeMode="cover"
        />
<<<<<<< HEAD
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.4)"]} style={vc.imgGrad} />
=======
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.4)"]}
          style={vc.imgGrad}
        />
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

        {/* Open/Closed */}
        <View
          style={[vc.openBadge, { backgroundColor: isOpen ? C.green : C.red }]}
        >
          <Text style={vc.openText}>{isOpen ? "Open" : "Closed"}</Text>
        </View>

        {/* Distance */}
        {dist != null && (
          <View style={vc.distBadge}>
            <Feather
              name="map-pin"
              size={9}
              color={tooFar ? C.amber : C.green}
            />
            <Text style={[vc.distText, tooFar && { color: C.amber }]}>
              {dist.toFixed(1)} km
            </Text>
          </View>
        )}

        {/* Match count */}
        {matchCount > 0 && !tooFar && (
          <View style={vc.matchBadge}>
            <Text style={vc.matchText}>
              {matchCount} item{matchCount > 1 ? "s" : ""} found
            </Text>
          </View>
        )}

        {/* Too far overlay */}
        {tooFar && (
          <View style={vc.farOverlay}>
            <Feather name="alert-circle" size={16} color={C.white} />
            <Text style={vc.farText}>Can't deliver here</Text>
          </View>
        )}
      </View>

      <View style={vc.info}>
        <View style={vc.topRow}>
          <Text style={vc.name} numberOfLines={1}>
            {vendor.shop_name}
          </Text>
          {vendor.rating > 0 && (
            <View style={vc.rating}>
              <Feather name="star" size={11} color="#CA8A04" />
              <Text style={vc.ratingText}>{vendor.rating?.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={vc.address} numberOfLines={1}>
          {vendor.address_line}
        </Text>
        <View style={vc.meta}>
          <View style={vc.metaChip}>
            <Feather name="clock" size={11} color={C.gray500} />
            <Text style={vc.metaText}>~30 min</Text>
          </View>
          <View style={vc.metaChip}>
            <Feather name="shopping-bag" size={11} color={C.gray500} />
            <Text style={vc.metaText}>Min ₹{vendor.min_order || 99}</Text>
          </View>
          {tooFar && (
            <View style={[vc.metaChip, { backgroundColor: C.amberLight }]}>
              <Text
                style={[vc.metaText, { color: C.amber, fontWeight: "700" }]}
              >
                Outside delivery zone
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
const vc = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardFar: { opacity: 0.65 },
  imgWrap: { position: "relative", height: 160 },
  img: { width: "100%", height: "100%" },
  imgGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: 60 },
  openBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  openText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.white,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  distBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  distText: {
    fontSize: 10,
    color: C.green,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  matchBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: C.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  matchText: {
    fontSize: 11,
    color: C.white,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  farOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  farText: {
    fontSize: 12,
    color: C.white,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  info: { padding: 14 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "800",
    color: C.gray900,
    flex: 1,
    marginRight: 8,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CA8A04",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  address: {
    fontSize: 12,
    color: C.gray400,
    marginBottom: 8,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11,
    color: C.gray600,
    fontFamily: "PlusJakartaSans_500Medium",
  },
});

// ─── Stores for item modal ────────────────────────────────────────────────────
function ItemStoresSheet({
  product,
  stores,
  userCoords,
  onClose,
  onSelectStore,
}) {
  if (!product || !stores) return null;
  return (
    <View style={iss.backdrop}>
      <View style={iss.sheet}>
        <View style={iss.handle} />
        <View style={iss.header}>
          <View>
            <Text style={iss.title}>Stores selling</Text>
            <Text style={iss.productName} numberOfLines={1}>
              {product.name}
            </Text>
          </View>
          <TouchableOpacity style={iss.closeBtn} onPress={onClose}>
            <Feather name="x" size={16} color={C.gray600} />
          </TouchableOpacity>
        </View>

<<<<<<< HEAD
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {stores.map(store => {
            const dist = (userCoords && store.latitude && store.longitude)
              ? distKm(userCoords.lat, userCoords.lng, store.latitude, store.longitude)
              : null;
=======
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {stores.map((store) => {
            const dist =
              userCoords && store.latitude && store.longitude
                ? distKm(
                    userCoords.lat,
                    userCoords.lng,
                    store.latitude,
                    store.longitude,
                  )
                : null;
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
            const tooFar = dist != null && dist > NEARBY_RADIUS;
            return (
              <TouchableOpacity
                key={store.id}
                style={[iss.storeRow, tooFar && { opacity: 0.6 }]}
                onPress={() => !tooFar && onSelectStore(store)}
                activeOpacity={0.85}
                disabled={tooFar}
              >
                <Image
                  source={{
                    uri:
                      store.shop_image_url ||
                      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
                  }}
                  style={iss.storeImg}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={iss.storeName}>{store.shop_name}</Text>
                  <Text style={iss.storeAddr} numberOfLines={1}>
                    {store.address_line}
                  </Text>
                  {dist != null && (
                    <Text style={[iss.storeDist, tooFar && { color: C.amber }]}>
                      {dist.toFixed(1)} km{" "}
                      {tooFar ? "· Outside delivery zone" : "away"}
                    </Text>
                  )}
                </View>
                {!tooFar ? (
                  <Feather name="chevron-right" size={16} color={C.green} />
                ) : (
                  <Feather name="alert-circle" size={16} color={C.amber} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
const iss = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.gray200,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    color: C.gray400,
    fontWeight: "600",
    textTransform: "uppercase",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  productName: {
    fontSize: 17,
    fontWeight: "900",
    color: C.gray900,
    marginTop: 2,
    maxWidth: 260,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  storeImg: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: C.gray100,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.gray900,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  storeAddr: {
    fontSize: 12,
    color: C.gray400,
    marginTop: 2,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  storeDist: {
    fontSize: 11,
    color: C.green,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
});

// ─── Section heading (accent tick, matches ProfileScreen's SectionLabel) ──────
function SectionHeading({ title, action, onAction }) {
  return (
    <View style={s.sectionHeadWrap}>
      <View style={s.sectionHeadLeft}>
        <View style={s.sectionTick} />
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token } = useAuthStore();
  const addressStore = useAddressStore();
  const { isDesktop, isTablet } = useBreakpoint();

  // ── State ─────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [committed, setCommitted] = useState(false);
  const [activeTab, setActiveTab] = useState("places");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

<<<<<<< HEAD
  // Voice Search states
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Listening...");
  const [voiceText, setVoiceText] = useState("");
  const voicePulse = useRef(new Animated.Value(1)).current;
  const pulseTimer = useRef(null);
  const recognitionRef = useRef(null);

=======
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
  // Autocomplete & correction
  const [apiSuggestions, setApiSuggestions] = useState([]); // from server
  const [didYouMean, setDidYouMean] = useState(null); // typo correction
  const autocompleteTimer = useRef(null);

  // Search results
<<<<<<< HEAD
  const [vendors, setVendors] = useState([]);   // all nearby vendors
  const [products, setProducts] = useState([]);   // matched products (items tab)
  const [matchedVendors, setMatchedVendors] = useState([]); // vendors with matched items
=======
  const [vendors, setVendors] = useState([]); // all nearby vendors
  const [products, setProducts] = useState([]); // matched products (items tab)
  const [matchedVendors, setMatchedVendors] = useState([]); // vendors with matched items (by inventory)
  const [nameMatchedVendors, setNameMatchedVendors] = useState([]); // shops whose NAME matches query
  const [similarVendors, setSimilarVendors] = useState([]); // other shops in same store_category
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  // Item stores sheet
  const [sheetProduct, setSheetProduct] = useState(null);
  const [sheetStores, setSheetStores] = useState([]);

  // Database-fetched categories
  const [apiCategories, setApiCategories] = useState([]);

  useEffect(() => {
    categoriesAPI
      .getAll()
      .then((res) => setApiCategories(res.data?.categories || []))
      .catch(() => setApiCategories([]));
  }, []);

  // Store category filter
  const [storeCategories, setStoreCategories] = useState([]);
  const [selectedStoreCategory, setSelectedStoreCategory] = useState(null);
  const [storeCatVendors, setStoreCatVendors] = useState([]);
  const [loadingStoreCat, setLoadingStoreCat] = useState(false);

  useEffect(() => {
    vendorsAPI
      .getStoreCategories()
      .then((res) => setStoreCategories(res.data?.categories || []))
      .catch(() => setStoreCategories([]));
  }, []);

<<<<<<< HEAD
=======
  // Trending items
  const [trendingItems, setTrendingItems] = useState([]);

>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
  const handleStoreCatSelect = async (cat) => {
    const newCat = selectedStoreCategory === cat ? null : cat;
    setSelectedStoreCategory(newCat);
    if (!newCat || !userCoords) {
      setStoreCatVendors([]);
      return;
    }
    setLoadingStoreCat(true);
    try {
      const res = await vendorsAPI.getNearby(
        userCoords.lat,
        userCoords.lng,
        10,
        newCat,
      );
      setStoreCatVendors(res.data || []);
    } catch {
      setStoreCatVendors([]);
    } finally {
      setLoadingStoreCat(false);
    }
  };

<<<<<<< HEAD
  const startVoiceSearch = () => {
    setVoiceModalVisible(true);
    setVoiceStatus("Listening...");
    setVoiceText("");

    // Start pulsing animation loop
    voicePulse.setValue(1);
    const startPulse = () => {
      Animated.sequence([
        Animated.timing(voicePulse, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(voicePulse, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (pulseTimer.current) startPulse();
      });
    };
    pulseTimer.current = true;
    startPulse();

    // Check for web speech recognition support (Chrome, Safari, Edge)
    const SpeechRecognition = Platform.OS === "web"
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-IN'; // Indian English / general English
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          const resultText = event.results[0][0].transcript;
          console.log("Speech recognized successfully:", resultText);

          // Disable restart and stop pulsing animation
          pulseTimer.current = null;

          setVoiceText(resultText);
          setVoiceStatus("Searching...");

          setTimeout(() => {
            setVoiceModalVisible(false);
            setQuery(resultText);
            doSearch(resultText);
          }, 1000);
        };

        recognition.onerror = (event) => {
          console.log("Speech recognition error:", event.error);
          if (event.error === "no-speech") {
            setVoiceStatus("Listening... Speak now");
          } else if (event.error === "not-allowed") {
            // Permission denied -> Fall back to simulation
            pulseTimer.current = null;
            setVoiceStatus("Permission denied. Using simulation...");
            fallbackMockVoiceSearch();
          } else {
            // Other errors -> Fall back to simulation
            pulseTimer.current = null;
            setVoiceStatus("Voice error: " + event.error);
            fallbackMockVoiceSearch();
          }
        };

        recognition.onend = () => {
          // If modal is still active and no result was captured, keep listening
          if (pulseTimer.current) {
            try {
              recognition.start();
            } catch (err) {
              console.log("Error restarting speech recognition:", err);
            }
          } else {
            recognitionRef.current = null;
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.log("Failed to start SpeechRecognition instance:", err);
        fallbackMockVoiceSearch();
      }
    } else {
      // Fallback for native devices or unsupported browsers
      fallbackMockVoiceSearch();
    }
  };

  const fallbackMockVoiceSearch = () => {
    // Simulate voice detection steps
    setTimeout(() => {
      if (!pulseTimer.current) return;
      setVoiceStatus("Processing...");
      const randomWord = VOICE_SUGGESTIONS[Math.floor(Math.random() * VOICE_SUGGESTIONS.length)];
      setVoiceText(randomWord);

      setTimeout(() => {
        if (!pulseTimer.current) return;
        setVoiceStatus("Searching...");
        setTimeout(() => {
          if (!pulseTimer.current) return;
          setVoiceModalVisible(false);
          pulseTimer.current = null;
          setQuery(randomWord);
          doSearch(randomWord);
        }, 600);
      }, 900);
    }, 1800);
  };

  const cancelVoiceSearch = () => {
    pulseTimer.current = null;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setVoiceModalVisible(false);
  };

  const dbCategories = useMemo(() => {
    const seen = new Set();
    const cats = [];
    const topLevelCats = apiCategories.filter(c => !c.parent_id);

    topLevelCats.forEach(c => {
=======
  const dbCategories = useMemo(() => {
    const seen = new Set();
    const cats = [];
    const topLevelCats = apiCategories.filter((c) => !c.parent_id);

    topLevelCats.forEach((c) => {
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
      if (c.name && !seen.has(c.name)) {
        seen.add(c.name);
        const accent = CAT_ACCENT[c.name] || CAT_ACCENT._default;
        const fallbackImg =
          CAT_FALLBACK_IMGS[c.name] || CAT_FALLBACK_IMGS._default;
        cats.push({
          label: c.name,
          tag: c.name,
          img: c.image_url || fallbackImg,
          bg: accent.bg,
          accent: accent.accent,
          icon: accent.icon,
        });
      }
    });
    return cats.sort((a, b) => a.label.localeCompare(b.label));
  }, [apiCategories]);

  const inputRef = useRef(null);
  const px = isDesktop ? 40 : isTablet ? 24 : 16;

  // ── Debounced autocomplete from API ──────────────────────────────────────
  useEffect(() => {
    if (committed) return; // don't fire when results are shown
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setApiSuggestions([]);
      return;
    }
    // Clear previous timer
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    autocompleteTimer.current = setTimeout(async () => {
      try {
        const data = await searchAPI.autocomplete(trimmed);
        // Backend wraps response: { success, data: { suggestions } }
        setApiSuggestions(data?.data?.suggestions || data?.suggestions || []);
      } catch {
        setApiSuggestions([]);
      }
    }, 250);
    return () => {
      if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    };
  }, [query, committed]);

  // ── User location ─────────────────────────────────────────────────────────
  const selectedAddr =
    addressStore?.addresses?.find((a) => a.id === addressStore?.selectedId) ||
    addressStore?.addresses?.[0];
  const userCoords =
    selectedAddr?.lat && selectedAddr?.lng
      ? { lat: selectedAddr.lat, lng: selectedAddr.lng }
      : selectedAddr?.latitude && selectedAddr?.longitude
        ? { lat: selectedAddr.latitude, lng: selectedAddr.longitude }
        : null;

<<<<<<< HEAD
=======
  useEffect(() => {
    productsAPI
      .getTrending(userCoords?.lat, userCoords?.lng, 10)
      .then((res) => setTrendingItems(res.data || []))
      .catch(() => setTrendingItems([]));
  }, [userCoords?.lat, userCoords?.lng]);

>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
  // ── Handle category filter from HomeScreen ────────────────────────────────
  useEffect(() => {
    const cat = route.params?.category;
    if (cat) {
      setQuery(cat);
      doSearch(cat);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // ── Fetch all nearby vendors on mount ────────────────────────────────────
  useEffect(() => {
    if (!userCoords) return;
    fetch(
      `${BASE_URL}/vendors?latitude=${userCoords.lat}&longitude=${userCoords.lng}&radius_km=${FAR_RADIUS}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    )
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : d.data || d.vendors || [];
        setVendors(list);
      })
      .catch(() => {});
  }, [userCoords?.lat, userCoords?.lng]);

  // ── Search — uses inventory endpoint which already exists ───────────────────
<<<<<<< HEAD
  const doSearch = useCallback(async (q) => {
    const trimmed = (q ?? query).trim();
    if (!trimmed) return;
    setCommitted(true);
    setLoading(true);
    setQuery(trimmed);
    setDidYouMean(null);      // reset correction on new search
    setApiSuggestions([]);    // clear dropdown
    Keyboard.dismiss();

    // Save to history
    setHistory(prev => {
      const deduped = prev.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...deduped].slice(0, MAX_HISTORY);
    });

    // Track this search (fire-and-forget)
    searchAPI.track(trimmed);

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Always read coords fresh via getState() — never stale
      const addrState = useAddressStore.getState();
      const currentAddr =
        addrState.addresses?.find(a => a.id === addrState.selectedId)
        || addrState.addresses?.[0];
      let lat = currentAddr?.lat || currentAddr?.latitude || null;
      let lng = currentAddr?.lng || currentAddr?.longitude || null;

      // If address has no coords, try geocoding, then fall back to device GPS
      if (!lat || !lng) {
        const addrText = currentAddr?.address_line || currentAddr?.address;
        if (addrText) {
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addrText)}&format=json&limit=1`,
              { headers: { "User-Agent": "DesiDukaan/1.0" } }
            );
            const geoData = await geoRes.json();
            if (geoData?.[0]) {
              lat = parseFloat(geoData[0].lat);
              lng = parseFloat(geoData[0].lon);
            }
          } catch { }
        }
      }

      // Last resort — use device GPS
      if (!lat || !lng) {
        try {
          const L = require("expo-location");
          const { status } = await L.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const loc = await L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          }
        } catch { }
      }

      console.log("Search coords:", lat, lng, "addr:", currentAddr?.address_line);

      if (!lat || !lng) {
        setProducts([]);
        setMatchedVendors([]);
        setLoading(false);
        return;
      }

      // Step 1: Fetch vendors at current location and correction suggestion in parallel
      const [vRes, corrData] = await Promise.all([
        fetch(
          `${BASE_URL}/vendors?latitude=${lat}&longitude=${lng}&radius_km=${FAR_RADIUS}`,
          { headers }
        ),
        searchAPI.correct(trimmed).catch(() => null)
      ]);

      const vData = await vRes.json();
      let vendorList = Array.isArray(vData) ? vData : vData.data || vData.vendors || [];
      setVendors(vendorList);

      const suggestion = corrData?.data?.suggestion || corrData?.suggestion || null;
      const hasSuggestion = suggestion && suggestion.toLowerCase() !== trimmed.toLowerCase();
      setDidYouMean(hasSuggestion ? suggestion : null);

      // Step 2: Search across all vendor inventories in parallel
      // Each vendor's inventory endpoint already exists: GET /inventory/vendor/:id
      const q_lower = trimmed.toLowerCase();
      const sugg_lower = hasSuggestion ? suggestion.toLowerCase() : null;

      const inventoryResults = await Promise.all(
        vendorList.map(v =>
          fetch(`${BASE_URL}/inventory/vendor/${v.id}`, { headers })
            .then(r => r.json())
            .then(d => {
              const inv = Array.isArray(d) ? d : d.data || d.inventory || [];
              // Filter to items matching query by name, brand, category
              const matched = inv.filter((item) => {
                const p = item.product || {};
                const catName = typeof p.category === "object"
                  ? (p.category?.name || "")
                  : (p.category || "");

                const matchesOriginal = (
                  p.name?.toLowerCase().includes(q_lower) ||
                  p.description?.toLowerCase().includes(q_lower) ||
                  catName.toLowerCase().includes(q_lower) ||
                  p.unit?.toLowerCase().includes(q_lower)
                );

                const matchesSuggestion = sugg_lower ? (
                  p.name?.toLowerCase().includes(sugg_lower) ||
                  p.description?.toLowerCase().includes(sugg_lower) ||
                  catName.toLowerCase().includes(sugg_lower) ||
                  p.unit?.toLowerCase().includes(sugg_lower)
                ) : false;

                return matchesOriginal || matchesSuggestion;
              });
              return { vendor: v, matched };
            })
            .catch(() => ({ vendor: v, matched: [] }))
        )
      );

      // Step 3: Build products list (unique by product name, keeping cheapest in-stock first)
      const productMap = new Map(); // key = product name, value = best product
      const vendorMatchMap = new Map(); // vendorId -> matchCount

      for (const { vendor, matched } of inventoryResults) {
        if (matched.length > 0) {
          vendorMatchMap.set(vendor.id, matched.length);
=======
  const doSearch = useCallback(
    async (q, meta = {}) => {
      const trimmed = (q ?? query).trim();
      if (!trimmed) return;
      setCommitted(true);
      setLoading(true);
      setQuery(trimmed);
      setDidYouMean(null); // reset correction on new search
      setApiSuggestions([]); // clear dropdown
      Keyboard.dismiss();

      // Save to history — dedupe by text, keep newest first
      setHistory((prev) => {
        const deduped = prev.filter(
          (h) => h.text.toLowerCase() !== trimmed.toLowerCase(),
        );
        return [
          {
            text: trimmed,
            image_url: meta.image_url || null,
            category: meta.category || null,
          },
          ...deduped,
        ].slice(0, MAX_HISTORY);
      });

      // Track this search (fire-and-forget) — backend falls back to product image if none given
      searchAPI.track(trimmed, meta.image_url || null, meta.category || null);

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Always read coords fresh via getState() — never stale
        const addrState = useAddressStore.getState();
        const currentAddr =
          addrState.addresses?.find((a) => a.id === addrState.selectedId) ||
          addrState.addresses?.[0];
        let lat = currentAddr?.lat || currentAddr?.latitude || null;
        let lng = currentAddr?.lng || currentAddr?.longitude || null;

        // If address has no coords, try geocoding, then fall back to device GPS
        if (!lat || !lng) {
          const addrText = currentAddr?.address_line || currentAddr?.address;
          if (addrText) {
            try {
              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addrText)}&format=json&limit=1`,
                { headers: { "User-Agent": "DesiDukaan/1.0" } },
              );
              const geoData = await geoRes.json();
              if (geoData?.[0]) {
                lat = parseFloat(geoData[0].lat);
                lng = parseFloat(geoData[0].lon);
              }
            } catch {}
          }
        }

        // Last resort — use device GPS
        if (!lat || !lng) {
          try {
            const L = require("expo-location");
            const { status } = await L.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const loc = await L.getCurrentPositionAsync({
                accuracy: L.Accuracy.Balanced,
              });
              lat = loc.coords.latitude;
              lng = loc.coords.longitude;
            }
          } catch {}
        }

        console.log(
          "Search coords:",
          lat,
          lng,
          "addr:",
          currentAddr?.address_line,
        );

        if (!lat || !lng) {
          setProducts([]);
          setMatchedVendors([]);
          setLoading(false);
          return;
        }

        // Step 1: Fetch vendors at current location, typo correction, and
        // shop-name matches (matched + similar-category shops) all in parallel
        const [vRes, corrData, shopNameData] = await Promise.all([
          fetch(
            `${BASE_URL}/vendors?latitude=${lat}&longitude=${lng}&radius_km=${FAR_RADIUS}`,
            { headers },
          ),
          searchAPI.correct(trimmed).catch(() => null),
          vendorsAPI
            .searchByName(trimmed, lat, lng, FAR_RADIUS)
            .catch(() => null),
        ]);

        const vData = await vRes.json();
        let vendorList = Array.isArray(vData)
          ? vData
          : vData.data || vData.vendors || [];
        setVendors(vendorList);

        setNameMatchedVendors(shopNameData?.data?.matched || []);
        setSimilarVendors(shopNameData?.data?.similar || []);

        const suggestion =
          corrData?.data?.suggestion || corrData?.suggestion || null;
        const hasSuggestion =
          suggestion && suggestion.toLowerCase() !== trimmed.toLowerCase();
        setDidYouMean(hasSuggestion ? suggestion : null);

        // Step 2: Search across all vendor inventories in parallel
        // Each vendor's inventory endpoint already exists: GET /inventory/vendor/:id
        const q_lower = trimmed.toLowerCase();
        const sugg_lower = hasSuggestion ? suggestion.toLowerCase() : null;

        const inventoryResults = await Promise.all(
          vendorList.map((v) =>
            fetch(`${BASE_URL}/inventory/vendor/${v.id}`, { headers })
              .then((r) => r.json())
              .then((d) => {
                const inv = Array.isArray(d) ? d : d.data || d.inventory || [];
                // Filter to items matching query by name, brand, category
                const matched = inv.filter((item) => {
                  const p = item.product || {};
                  const catName =
                    typeof p.category === "object"
                      ? p.category?.name || ""
                      : p.category || "";

                  const matchesOriginal =
                    p.name?.toLowerCase().includes(q_lower) ||
                    p.description?.toLowerCase().includes(q_lower) ||
                    catName.toLowerCase().includes(q_lower) ||
                    p.unit?.toLowerCase().includes(q_lower);

                  const matchesSuggestion = sugg_lower
                    ? p.name?.toLowerCase().includes(sugg_lower) ||
                      p.description?.toLowerCase().includes(sugg_lower) ||
                      catName.toLowerCase().includes(sugg_lower) ||
                      p.unit?.toLowerCase().includes(sugg_lower)
                    : false;

                  return matchesOriginal || matchesSuggestion;
                });
                return { vendor: v, matched };
              })
              .catch(() => ({ vendor: v, matched: [] })),
          ),
        );

        // Step 3: Build products list (unique by product name, keeping cheapest in-stock first)
        const productMap = new Map(); // key = product name, value = best product
        const vendorMatchMap = new Map(); // vendorId -> matchCount

        for (const { vendor, matched } of inventoryResults) {
          if (matched.length > 0) {
            vendorMatchMap.set(vendor.id, matched.length);
            for (const inv of matched) {
              const p = inv.product;
              if (!p) continue;
              const key = p.name?.toLowerCase() || p.id;
              const inStock = inv.stock_qty > 0;
              const existing = productMap.get(key);
              // Prefer in-stock over OOS; among same stock status, prefer cheapest
              if (
                !existing ||
                (!existing._inStock && inStock) ||
                (existing._inStock === inStock && p.price < existing.price)
              ) {
                productMap.set(key, {
                  ...p,
                  vendor_id: vendor.id,
                  vendor: vendor,
                  stock_qty: inv.stock_qty,
                  _inStock: inStock,
                  _allVendorIds: existing?._allVendorIds || [],
                });
              }
              // Track all vendors that carry this product
              const cur = productMap.get(key);
              if (!cur._allVendorIds.includes(vendor.id)) {
                cur._allVendorIds.push(vendor.id);
              }
            }
          }
        }

        // Also collect OOS-only products (not already in map as in-stock)
        for (const { vendor, matched } of inventoryResults) {
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
          for (const inv of matched) {
            const p = inv.product;
            if (!p) continue;
            const key = p.name?.toLowerCase() || p.id;
            if (!productMap.has(key) && inv.stock_qty <= 0) {
              productMap.set(key, {
                ...p,
                vendor_id: vendor.id,
                vendor,
                stock_qty: inv.stock_qty,
                _inStock: false,
                _allVendorIds: [vendor.id],
              });
            }
          }
        }
<<<<<<< HEAD
      }

      // Also collect OOS-only products (not already in map as in-stock)
      for (const { vendor, matched } of inventoryResults) {
        for (const inv of matched) {
          const p = inv.product;
          if (!p) continue;
          const key = p.name?.toLowerCase() || p.id;
          if (!productMap.has(key) && inv.stock_qty <= 0) {
            productMap.set(key, {
              ...p,
              vendor_id: vendor.id,
              vendor,
              stock_qty: inv.stock_qty,
              _inStock: false,
              _allVendorIds: [vendor.id],
            });
=======

        const prodList = Array.from(productMap.values())
          .map((p) => ({ ...p, _storeCount: p._allVendorIds?.length || 1 }))
          // In-stock first, then OOS; within each group sort by name
          .sort((a, b) => {
            if (a._inStock !== b._inStock) return a._inStock ? -1 : 1;
            return a.name.localeCompare(b.name);
          });

        setProducts(prodList);

        // Step 4: Build matched vendors list for places tab
        const matched = vendorList
          .filter((v) => vendorMatchMap.has(v.id))
          .map((v) => ({ ...v, matchCount: vendorMatchMap.get(v.id) }))
          .sort((a, b) => b.matchCount - a.matchCount);

        setMatchedVendors(matched);

        // Backfill recent-search thumbnail if we didn't have one up front
        if (!meta.image_url) {
          const fallbackImg =
            prodList[0]?.image_url || matched[0]?.shop_image_url || null;
          const fallbackCat =
            prodList[0]?.category?.name || prodList[0]?.category || null;
          if (fallbackImg) {
            setHistory((prev) =>
              prev.map((h) =>
                h.text.toLowerCase() === trimmed.toLowerCase() && !h.image_url
                  ? { ...h, image_url: fallbackImg, category: fallbackCat }
                  : h,
              ),
            );
            searchAPI.track(trimmed, fallbackImg, fallbackCat);
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
          }
        }
      } catch (e) {
        console.error("Search error:", e.message);
      } finally {
        setLoading(false);
      }
<<<<<<< HEAD

      const prodList = Array.from(productMap.values())
        .map(p => ({ ...p, _storeCount: p._allVendorIds?.length || 1 }))
        // In-stock first, then OOS; within each group sort by name
        .sort((a, b) => {
          if (a._inStock !== b._inStock) return a._inStock ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      setProducts(prodList);

      // Step 4: Build matched vendors list for places tab
      const matched = vendorList
         .filter(v => vendorMatchMap.has(v.id))
         .map(v => ({ ...v, matchCount: vendorMatchMap.get(v.id) }))
         .sort((a, b) => b.matchCount - a.matchCount);

      setMatchedVendors(matched);

    } catch (e) {
      console.error("Search error:", e.message);
    } finally {
      setLoading(false);
    }
  }, [query, token]);

  // ── Navigate to vendor store ──────────────────────────────────────────────
  const goToStore = useCallback((vendor) => {
    navigation.navigate("VendorStore", {
      vendorId: vendor.id,
      vendorName: vendor.shop_name,
    });
  }, [navigation]);

  // ── Item "see stores" ─────────────────────────────────────────────────────
  const handleSeeStores = useCallback(async (product) => {
    setSheetProduct(product);
    // Find all vendors that carry this product
    const carrying = vendors.filter(v => v.id === product.vendor_id);
    // Also fetch from backend if needed
    try {
      const res = await fetch(`${BASE_URL}/products/${product.id}/vendors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || data.vendors || carrying;
      setSheetStores(list.length > 0 ? list : carrying);
    } catch {
      setSheetStores(carrying);
    }
  }, [vendors, token]);
=======
    },
    [query, token],
  );

  // ── Navigate to vendor store ──────────────────────────────────────────────
  const goToStore = useCallback(
    (vendor) => {
      navigation.navigate("VendorStore", {
        vendorId: vendor.id,
        vendorName: vendor.shop_name,
      });
    },
    [navigation],
  );

  // ── Item "see stores" ─────────────────────────────────────────────────────
  const handleSeeStores = useCallback(
    async (product) => {
      setSheetProduct(product);
      // Find all vendors that carry this product
      const carrying = vendors.filter((v) => v.id === product.vendor_id);
      // Also fetch from backend if needed
      try {
        const res = await fetch(`${BASE_URL}/products/${product.id}/vendors`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : data.data || data.vendors || carrying;
        setSheetStores(list.length > 0 ? list : carrying);
      } catch {
        setSheetStores(carrying);
      }
    },
    [vendors, token],
  );
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  // ── Back ──────────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (committed || query.length > 0) {
      setQuery("");
      setCommitted(false);
      setProducts([]);
      setMatchedVendors([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      navigation.goBack();
    }
  };

  // ── Compute distances ─────────────────────────────────────────────────────
<<<<<<< HEAD
  const vendorsWithDist = useMemo(() =>
    matchedVendors.map(v => ({
      ...v,
      _dist: (userCoords && v.latitude && v.longitude)
        ? distKm(userCoords.lat, userCoords.lng, v.latitude, v.longitude)
        : null,
      _tooFar: false,
    })).map(v => ({
      ...v,
      _tooFar: v._dist != null && v._dist > NEARBY_RADIUS,
    })),
    [matchedVendors, userCoords]);

  const nearbyVendors = vendorsWithDist.filter(v => !v._tooFar);
  const farVendors = vendorsWithDist.filter(v => v._tooFar);

  // Products with store count
  const productsWithCount = useMemo(() =>
    products.map(p => ({ ...p, _storeCount: products.filter(x => x.name === p.name).length })),
    [products]);
=======
  const withDist = (list) =>
    list.map((v) => {
      const dist =
        userCoords && v.latitude && v.longitude
          ? distKm(userCoords.lat, userCoords.lng, v.latitude, v.longitude)
          : v.distance_km != null
            ? parseFloat(v.distance_km)
            : null;
      return {
        ...v,
        _dist: dist,
        _tooFar: dist != null && dist > NEARBY_RADIUS,
      };
    });

  const vendorsWithDist = useMemo(
    () => withDist(matchedVendors),
    [matchedVendors, userCoords],
  );
  const nearbyVendors = vendorsWithDist.filter((v) => !v._tooFar);
  const farVendors = vendorsWithDist.filter((v) => v._tooFar);

  const nameMatchedWithDist = useMemo(
    () => withDist(nameMatchedVendors),
    [nameMatchedVendors, userCoords],
  );
  const similarWithDist = useMemo(
    () => withDist(similarVendors),
    [similarVendors, userCoords],
  );

  // Products with store count
  const productsWithCount = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        _storeCount: products.filter((x) => x.name === p.name).length,
      })),
    [products],
  );
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  // ── Suggestions: API-first, fall back to local history ──────────────────
  const trimmed = query.trim();
  const isIdle = !committed && trimmed.length === 0;
  const isTyping = !committed && trimmed.length > 0;

  // Merge API suggestions with local history (API takes priority)
  const suggestions = isTyping
    ? (() => {
<<<<<<< HEAD
      // API suggestions come with { text, type } shape
      const apiTexts = apiSuggestions.map(s => ({ text: s.text, type: s.type }));
      const apiTextSet = new Set(apiTexts.map(s => s.text.toLowerCase()));

      // Local history fallback — only items not already in API results
      const localFallback = history
        .filter(h => h.toLowerCase().includes(trimmed.toLowerCase()) && !apiTextSet.has(h.toLowerCase()))
        .map(h => ({ text: h, type: 'local' }));

      return [...apiTexts, ...localFallback].slice(0, 7);
    })()
=======
        // API suggestions come with { text, type } shape
        const apiTexts = apiSuggestions.map((s) => ({
          text: s.text,
          type: s.type,
          image_url: s.image_url,
        }));
        const apiTextSet = new Set(apiTexts.map((s) => s.text.toLowerCase()));

        // Local history fallback — history items are now { text, image_url, category } objects
        const localFallback = history
          .filter(
            (h) =>
              h.text.toLowerCase().includes(trimmed.toLowerCase()) &&
              !apiTextSet.has(h.text.toLowerCase()),
          )
          .map((h) => ({
            text: h.text,
            type: "local",
            image_url: h.image_url,
          }));

        return [...apiTexts, ...localFallback].slice(0, 7);
      })()
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
    : [];

  // ── Floating cart ─────────────────────────────────────────────────────────
  const cart = useCartStore();
  const cartItems = cart?.items || [];
  const cartCount = cartItems.reduce(
    (s, i) => s + (i.qty || i.quantity || 0),
    0,
  );
  const cartTotal = cartItems.reduce(
    (s, i) => s + i.price * (i.qty || i.quantity || 0),
    0,
  );
  const floatingY = useRef(new Animated.Value(120)).current;
  useEffect(() => {
    Animated.spring(floatingY, {
      toValue: cartCount > 0 ? 0 : 120,
      tension: 70,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [cartCount]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.root, { backgroundColor: isDesktop ? C.bg : C.white }]}>
        <StatusBar barStyle="dark-content" />

        {/* ── SEARCH BAR ─────────────────────────────────────────────── */}
        <View style={[s.topBar, { paddingHorizontal: px }]}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={20} color={C.gray900} />
          </TouchableOpacity>
          <View style={[s.inputWrap, committed && s.inputWrapActive]}>
            <Feather
              name="search"
              size={16}
              color={committed || trimmed ? C.green : C.gray400}
            />
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder="Search items, stores, brands…"
              placeholderTextColor={C.gray400}
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                setCommitted(false);
              }}
              onSubmitEditing={() => doSearch()}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              selectionColor={C.green}
              underlineColorAndroid="transparent"
            />
<<<<<<< HEAD
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => { setQuery(""); setCommitted(false); inputRef.current?.focus(); }} style={{ padding: 4 }}>
=======
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setCommitted(false);
                  inputRef.current?.focus();
                }}
              >
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
                <Feather name="x" size={15} color={C.gray400} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={startVoiceSearch} style={{ padding: 4 }}>
                <Feather name="mic" size={16} color={C.green} />
              </TouchableOpacity>
            )}
          </View>
          {trimmed.length > 0 && (
            <TouchableOpacity
              style={s.searchBtn}
              onPress={() => doSearch()}
              activeOpacity={0.85}
            >
              <Text style={s.searchBtnText}>Search</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── TABS (shown after search) ─────────────────────────────── */}
        {committed && (
          <View style={s.tabs}>
            {[
              { key: "places", label: "Stores", count: nearbyVendors.length },
              { key: "items", label: "Items", count: products.length },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, activeTab === tab.key && s.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.tabLabel,
                    activeTab === tab.key && s.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    style={[
                      s.tabBubble,
                      activeTab === tab.key && s.tabBubbleActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.tabBubbleText,
                        activeTab === tab.key && s.tabBubbleTextActive,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

<<<<<<< HEAD
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
=======
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 80 }}
          >
<<<<<<< HEAD

=======
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
            {/* ── SUGGESTIONS while typing ─────────────────────────── */}
            {isTyping && (
              <View style={s.suggBox}>
                {suggestions.map((sugg, i) => (
                  <TouchableOpacity
                    key={i}
                    style={sg.row}
                    onPress={() => {
                      setQuery(sugg.text);
                      doSearch(sugg.text, {
                        image_url: sugg.image_url,
                        category: sugg.category,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    {sugg.image_url ? (
                      <Image
                        source={{ uri: sugg.image_url }}
                        style={sg.thumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={sg.iconWrap}>
                        <Feather
                          name={
                            sugg.type === "history"
                              ? "trending-up"
                              : sugg.type === "category"
                                ? "grid"
                                : sugg.type === "local"
                                  ? "clock"
                                  : "search"
                          }
                          size={14}
                          color={
                            sugg.type === "history"
                              ? C.orange
                              : sugg.type === "category"
                                ? C.green
                                : C.gray400
                          }
                        />
                      </View>
                    )}
                    <Text
                      style={[
                        sg.text,
                        sugg.type === "history" && {
                          color: C.gray700,
                          fontWeight: "600",
                        },
                      ]}
                    >
                      {sugg.text}
                    </Text>
                    <Feather name="arrow-up-left" size={13} color={C.gray300} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[sg.row, { borderBottomWidth: 0 }]}
                  onPress={() => doSearch()}
                  activeOpacity={0.7}
                >
                  <View
                    style={[sg.iconWrap, { backgroundColor: C.greenLight }]}
                  >
                    <Feather name="search" size={14} color={C.green} />
                  </View>
                  <Text
                    style={[sg.text, { color: C.green, fontWeight: "700" }]}
                  >
                    Search for "{trimmed}"
                  </Text>
                </TouchableOpacity>
              </View>
            )}

<<<<<<< HEAD
            {isIdle && (
              <View style={{ paddingHorizontal: px, paddingTop: 16 }}>
=======
            {/* ── IDLE: categories + history ────────────────────────── */}
            {isIdle && (
              <View style={{ paddingHorizontal: px, paddingTop: 16 }}>
                {/* Trending */}
                {trendingItems.length > 0 && (
                  <>
                    <SectionHeading title="Trending Now" />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingRight: 8,
                        paddingBottom: 8,
                        gap: 12,
                      }}
                      style={{ marginBottom: 8 }}
                    >
                      {trendingItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={s.trendCard}
                          onPress={() => {
                            setQuery(item.name);
                            doSearch(item.name);
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={s.trendImgWrap}>
                            <Image
                              source={{
                                uri:
                                  item.image_url || CAT_FALLBACK_IMGS._default,
                              }}
                              style={s.trendImg}
                              resizeMode="cover"
                            />
                            <View style={s.trendBadge}>
                              <Feather
                                name="trending-up"
                                size={9}
                                color={C.white}
                              />
                            </View>
                          </View>
                          <Text style={s.trendName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={s.trendPrice}>₹{item.price}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

                {/* Categories */}
                {dbCategories.length > 0 && (
                  <>
                    <SectionHeading title="Popular Category" />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        paddingRight: 8,
                        paddingBottom: 8,
                        gap: 20,
                      }}
                    >
                      {dbCategories.map((cat) => (
                        <TouchableOpacity
                          key={cat.label}
                          style={s.catChip}
                          onPress={() => {
                            setQuery(cat.label);
                            doSearch(cat.label);
                          }}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[s.catImgWrap, { backgroundColor: cat.bg }]}
                          >
                            <Image
                              source={{ uri: cat.img }}
                              style={s.catImg}
                              resizeMode="cover"
                            />
                          </View>
                          <Text style={s.catChipLabel}>{cat.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

<<<<<<< HEAD
                {/* Trending Searches */}
                <Text style={[s.sectionTitle, { marginTop: 24 }]}>Trending Searches 🔥</Text>
                <View style={s.trendingContainer}>
                  {TRENDING_SEARCHES.map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.trendChip}
                      onPress={() => { setQuery(item.label); doSearch(item.label); }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.trendIcon}>{item.icon}</Text>
                      <Text style={s.trendText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* History */}
                {history.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <SectionHeading title="Recent Searches" action="Clear all" onAction={() => setHistory([])} />
=======
                {/* History */}
                {history.length > 0 && (
                  <>
                    <SectionHeading
                      title="Recent Searches"
                      action="Clear all"
                      onAction={() => setHistory([])}
                    />
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
                    {history.map((h, i) => (
                      <TouchableOpacity
                        key={i}
                        style={s.histRow}
                        onPress={() => {
                          setQuery(h.text);
                          doSearch(h.text, {
                            image_url: h.image_url,
                            category: h.category,
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        {h.image_url ? (
                          <Image
                            source={{ uri: h.image_url }}
                            style={s.histImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={s.histIconWrap}>
                            <Feather name="clock" size={14} color={C.gray400} />
                          </View>
                        )}
                        <Text style={s.histText}>{h.text}</Text>
                        <TouchableOpacity
                          onPress={() =>
                            setHistory((prev) => prev.filter((_, j) => j !== i))
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="x" size={13} color={C.gray400} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Browse Stores by Type ─────────────────────────────── */}
            {isIdle && storeCategories.length > 0 && (
              <View style={{ paddingHorizontal: px, paddingTop: 20 }}>
                <SectionHeading title="Browse Stores by Type" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingRight: 8,
                    paddingBottom: 12,
                    gap: 12,
                  }}
                >
                  {storeCategories.map((cat) => {
                    const meta = STORE_CAT_META[cat] || STORE_CAT_META._default;
                    const isActive = selectedStoreCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          s.storeCatBrowseChip,
                          isActive
<<<<<<< HEAD
                            ? [s.storeCatBrowseChipActive, { backgroundColor: meta.color, borderColor: "transparent", shadowColor: meta.color }]
                            : { backgroundColor: C.white, borderColor: C.gray200 }
=======
                            ? [
                                s.storeCatBrowseChipActive,
                                {
                                  backgroundColor: meta.color,
                                  borderColor: "transparent",
                                  shadowColor: meta.color,
                                },
                              ]
                            : {
                                backgroundColor: C.white,
                                borderColor: C.gray200,
                              },
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
                        ]}
                        onPress={() => handleStoreCatSelect(cat)}
                        activeOpacity={0.85}
                      >
                        <View
                          style={[
                            s.storeCatIconWrap,
                            {
                              backgroundColor: isActive
                                ? "rgba(255, 255, 255, 0.25)"
                                : meta.bg,
                            },
                          ]}
                        >
                          <Text style={s.storeCatBrowseIcon}>{meta.icon}</Text>
                        </View>
                        <Text
                          style={[
                            s.storeCatBrowseLabel,
                            isActive
                              ? {
                                  color: C.white,
                                  fontFamily: "PlusJakartaSans_800ExtraBold",
                                }
                              : { color: C.gray700 },
                          ]}
                        >
                          {meta.label ||
                            cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Category vendor results */}
                {loadingStoreCat && (
                  <View style={s.loadingWrap}>
                    <ActivityIndicator size="small" color={C.green} />
                    <Text style={s.loadingText}>Finding stores…</Text>
                  </View>
                )}
                {!loadingStoreCat &&
                  selectedStoreCategory &&
                  storeCatVendors.length === 0 && (
                    <View style={s.emptyWrap}>
                      <Feather
                        name="shopping-bag"
                        size={28}
                        color={C.gray300}
                      />
                      <Text style={s.emptyTitle}>No stores found</Text>
                      <Text style={s.emptySub}>
                        No {selectedStoreCategory} stores found near you.
                      </Text>
                    </View>
                  )}
                {!loadingStoreCat && storeCatVendors.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    {storeCatVendors.map((v) => (
                      <VendorCard
                        key={v.id}
                        vendor={v}
                        distKm={
                          userCoords && v.latitude && v.longitude
                            ? distKm(
                                userCoords.lat,
                                userCoords.lng,
                                v.latitude,
                                v.longitude,
                              )
                            : null
                        }
                        matchCount={0}
                        onPress={() => goToStore(v)}
                        tooFar={false}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {loading && (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color={C.green} />
                <Text style={s.loadingText}>Searching…</Text>
              </View>
            )}

            {/* ── RESULTS ──────────────────────────────────────────── */}
            {committed && !loading && (
              <View style={{ paddingHorizontal: px, paddingTop: 12 }}>
<<<<<<< HEAD

=======
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
                {/* ── PLACES TAB ── */}
                {activeTab === "places" && (
                  <>
                    {/* Shops whose NAME matches the query */}
                    {nameMatchedWithDist.length > 0 && (
                      <>
                        <Text style={s.resultNote}>
                          {nameMatchedWithDist.length} store
                          {nameMatchedWithDist.length > 1 ? "s" : ""} named "
                          {trimmed}"
                        </Text>
                        {nameMatchedWithDist.map((v) => (
                          <VendorCard
                            key={`name_${v.id}`}
                            vendor={v}
                            distKm={v._dist}
                            matchCount={0}
                            onPress={() => goToStore(v)}
                            tooFar={v._tooFar}
                          />
                        ))}
                      </>
                    )}

                    {/* Other shops in the same store_category — "More results like this" */}
                    {similarWithDist.length > 0 && (
                      <>
                        <SectionHeading title="More results like this" />
                        {similarWithDist.map((v) => (
                          <VendorCard
                            key={`similar_${v.id}`}
                            vendor={v}
                            distKm={v._dist}
                            matchCount={0}
                            onPress={() => goToStore(v)}
                            tooFar={v._tooFar}
                          />
                        ))}
                      </>
                    )}

                    {/* Shops that carry a matching ITEM (existing inventory-based match) */}
                    {(nameMatchedWithDist.length > 0 ||
                      similarWithDist.length > 0) &&
                      nearbyVendors.length > 0 && (
                        <SectionHeading title="Stores with this item" />
                      )}

                    {nearbyVendors.length === 0 &&
                    farVendors.length === 0 &&
                    nameMatchedWithDist.length === 0 &&
                    similarWithDist.length === 0 ? (
                      <View style={s.emptyWrap}>
                        <Feather name="map-pin" size={32} color={C.gray300} />
                        <Text style={s.emptyTitle}>No stores found</Text>
                        <Text style={s.emptySub}>
                          No nearby stores carry "{trimmed}"
                          {didYouMean ? ` or "${didYouMean}"` : ""}. Try the
                          Items tab.
                        </Text>
                      </View>
                    ) : (
                      <>
                        {nearbyVendors.length > 0 && (
                          <>
                            <Text style={s.resultNote}>
                              {nearbyVendors.length} store
                              {nearbyVendors.length > 1 ? "s" : ""} near you
                              carry "{trimmed}"
                              {didYouMean ? ` or "${didYouMean}"` : ""}
                            </Text>
                            {nearbyVendors.map((v) => (
                              <VendorCard
                                key={v.id}
                                vendor={v}
                                distKm={v._dist}
                                matchCount={v.matchCount}
                                onPress={() => goToStore(v)}
                                tooFar={false}
                              />
                            ))}
                          </>
                        )}

                        {/* Far stores section */}
                        {farVendors.length > 0 && (
                          <>
                            <View style={s.farHeader}>
                              <Feather
                                name="alert-circle"
                                size={14}
                                color={C.amber}
                              />
                              <Text style={s.farHeaderText}>
                                {farVendors.length} store
                                {farVendors.length > 1 ? "s" : ""} found but
                                outside delivery range
                              </Text>
                            </View>
                            {farVendors.map((v) => (
                              <VendorCard
                                key={v.id}
                                vendor={v}
                                distKm={v._dist}
                                matchCount={v.matchCount}
                                onPress={() => {}}
                                tooFar
                              />
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* ── ITEMS TAB ── */}
                {activeTab === "items" && (
                  <>
                    {products.length === 0 ? (
                      <View style={s.emptyWrap}>
                        <Feather name="package" size={32} color={C.gray300} />
                        <Text style={s.emptyTitle}>No items found</Text>
                        <Text style={s.emptySub}>
                          Try a different keyword or check the Stores tab
                          {didYouMean
                            ? ` (searched for "${trimmed}" and "${didYouMean}")`
                            : ""}
                          .
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={s.resultNote}>
                          {products.length} item{products.length > 1 ? "s" : ""}{" "}
                          found for "{trimmed}"
                          {didYouMean ? ` or "${didYouMean}"` : ""}
                        </Text>
                        <View style={s.itemsCard}>
                          {productsWithCount.map((product, i) => (
                            <ProductCard
                              key={`${product.id}_${i}`}
                              product={product}
                              vendorId={product.vendor_id}
                              vendorName={product.vendor?.shop_name}
                              onSeeStores={() => handleSeeStores(product)}
                            />
                          ))}
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            )}
<<<<<<< HEAD

=======
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* ── Item stores bottom sheet ──────────────────────────────────── */}
      {sheetProduct && (
        <ItemStoresSheet
          product={sheetProduct}
          stores={sheetStores}
          userCoords={userCoords}
          onClose={() => {
            setSheetProduct(null);
            setSheetStores([]);
          }}
          onSelectStore={(store) => {
            setSheetProduct(null);
            setSheetStores([]);
            goToStore(store);
          }}
        />
      )}

      {/* ── FLOATING CART (mirrors VendorStoreScreen) ─────────────────── */}
      {cartCount > 0 && (
        <Animated.View
          style={[s.floatingCart, { transform: [{ translateY: floatingY }] }]}
        >
          <TouchableOpacity
            style={s.floatingInner}
            onPress={() =>
              navigation.navigate("CustomerTabNavigator", { screen: "Cart" })
            }
            activeOpacity={0.88}
          >
            <View style={s.floatingLeft}>
              <View style={s.floatingBadge}>
                <Text style={s.floatingBadgeText}>{cartCount}</Text>
              </View>
              <View>
                <Text style={s.floatingItems}>
                  {cartCount} item{cartCount > 1 ? "s" : ""} added
                </Text>
                <Text style={s.floatingTotal}>
                  ₹{cartTotal.toFixed(0)} total
                </Text>
              </View>
            </View>
            <View style={s.floatingCTA}>
              <Text style={s.floatingCTAText}>View Cart</Text>
              <Feather name="arrow-right" size={14} color={C.white} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── VOICE SEARCH MODAL ────────────────────────────────────────── */}
      <Modal
        visible={voiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelVoiceSearch}
      >
        <View style={s.voiceModalContainer}>
          <TouchableOpacity style={s.voiceCloseBtn} onPress={cancelVoiceSearch}>
            <Feather name="x" size={24} color={C.white} />
          </TouchableOpacity>

          <View style={s.voiceContent}>
            <Text style={s.voiceHintText}>
              {voiceStatus === "Listening..." ? "Listening for products/stores..." : "Processing audio..."}
            </Text>

            <Animated.View
              style={[
                s.voiceMicOuter,
                {
                  transform: [{ scale: voicePulse }],
                },
              ]}
            >
              <LinearGradient
                colors={["#10B981", "#059669"]}
                style={s.voiceMicGradient}
              >
                <Feather name="mic" size={40} color={C.white} />
              </LinearGradient>
            </Animated.View>

            {voiceText ? (
              <View style={s.voiceTranscriptCard}>
                <Text style={s.voiceTranscriptLabel}>Recognized Speech</Text>
                <Text style={s.voiceTranscriptText}>"{voiceText}"</Text>
              </View>
            ) : (
              <Text style={s.voiceSubText}>Go ahead, say something like:</Text>
            )}

            <View style={s.voiceSuggestionsRail}>
              {VOICE_SUGGESTIONS.slice(0, 3).map((sugg, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.voiceSuggChip}
                  onPress={() => {
                    cancelVoiceSearch();
                    setQuery(sugg);
                    doSearch(sugg);
                  }}
                >
                  <Feather name="search" size={11} color="rgba(255,255,255,0.6)" />
                  <Text style={s.voiceSuggText}>{sugg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === "ios" ? 52 : 32 },

  // Floating cart
  floatingCart: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: C.green,
    borderRadius: 18,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 14,
    zIndex: 100,
  },
  floatingInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  floatingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
<<<<<<< HEAD
  floatingBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  floatingBadgeText: { fontSize: 15, fontWeight: "900", color: C.white, fontFamily: "PlusJakartaSans_800ExtraBold" },
  floatingItems: { fontSize: 14, fontWeight: "700", color: C.white, fontFamily: "PlusJakartaSans_700Bold" },
  floatingTotal: { fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 1, fontFamily: "PlusJakartaSans_500Medium" },
  floatingCTA: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  floatingCTAText: { fontSize: 14, fontWeight: "800", color: C.white, fontFamily: "PlusJakartaSans_800ExtraBold" },

  // Header
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
  inputWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.gray100, borderRadius: 14, borderWidth: 1.5, borderColor: "transparent", paddingHorizontal: 14, paddingVertical: 11 },
  inputWrapActive: { borderColor: C.greenBorder, backgroundColor: C.greenLight },
  input: { flex: 1, fontSize: 15, color: C.gray900, fontFamily: "PlusJakartaSans_500Medium", outlineStyle: "none" },
  searchBtn: { backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
  searchBtnText: { fontSize: 14, fontWeight: "800", color: C.white, fontFamily: "PlusJakartaSans_800ExtraBold" },
=======
  floatingBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingBadgeText: {
    fontSize: 15,
    fontWeight: "900",
    color: C.white,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  floatingItems: {
    fontSize: 14,
    fontWeight: "700",
    color: C.white,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  floatingTotal: {
    fontSize: 12,
    color: "rgba(255,255,255,0.82)",
    marginTop: 1,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  floatingCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  floatingCTAText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.white,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },

  // Header
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 18,
    paddingTop: 6,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.gray100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  inputWrapActive: {
    borderColor: C.green,
    backgroundColor: C.white,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: C.gray900,
    fontFamily: "PlusJakartaSans_500Medium",
    outlineStyle: "none",
  },
  searchBtn: {
    backgroundColor: C.green,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 15,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: C.white,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  // Tabs
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    backgroundColor: C.white,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: C.orange },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.gray500,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  tabLabelActive: {
    color: C.orange,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  tabBubble: {
    backgroundColor: C.gray100,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBubbleActive: { backgroundColor: C.greenMid },
<<<<<<< HEAD
  tabBubbleText: { fontSize: 11, fontWeight: "700", color: C.gray500, fontFamily: "PlusJakartaSans_700Bold" },
  tabBubbleTextActive: { color: C.green, fontFamily: "PlusJakartaSans_700Bold" },

  // Suggestions
  suggBox: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray100 },
=======
  tabBubbleText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.gray500,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  tabBubbleTextActive: {
    color: C.green,
    fontFamily: "PlusJakartaSans_700Bold",
  },

  // Suggestions
  suggBox: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  // Section heading — small accent tick, mirrors ProfileScreen's SectionLabel
  sectionHeadWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 14,
  },
  sectionHeadLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
<<<<<<< HEAD
  sectionTick: { width: 3, height: 14, borderRadius: 2, backgroundColor: C.green },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: C.gray900, fontFamily: "PlusJakartaSans_800ExtraBold" },
  sectionAction: { fontSize: 13, color: C.green, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
=======
  sectionTick: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: C.green,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.gray900,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  sectionAction: {
    fontSize: 13,
    color: C.green,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f

  // Category chips — matches HomeScreen style exactly
  catChip: { alignItems: "center", width: 100 },
  catImgWrap: {
    width: 86,
    height: 86,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  catImg: { width: "100%", height: "100%" },
<<<<<<< HEAD
  catChipLabel: { fontSize: 13, color: C.gray900, fontWeight: "700", textAlign: "center", fontFamily: "PlusJakartaSans_700Bold" },
  histRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  histText: { flex: 1, fontSize: 14, color: C.gray700, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" },

  // Loading
  loadingWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 15, color: C.gray400, fontWeight: "500", fontFamily: "PlusJakartaSans_500Medium" },

  // Results
  resultNote: { fontSize: 12, color: C.gray400, fontWeight: "500", marginBottom: 14, fontFamily: "PlusJakartaSans_500Medium" },
  itemsCard: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.gray200, overflow: "hidden", marginBottom: 16 },
  farHeader: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.amberLight, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FDE68A" },
  farHeaderText: { fontSize: 13, color: C.amber, fontWeight: "600", flex: 1, fontFamily: "PlusJakartaSans_600SemiBold" },

  // Empty
  emptyWrap: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.gray700, fontFamily: "PlusJakartaSans_700Bold" },
  emptySub: { fontSize: 14, color: C.gray400, textAlign: "center", lineHeight: 20, fontFamily: "PlusJakartaSans_500Medium" },

  // Trending & Voice search styles
  trendingContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8, marginBottom: 4 },
  trendChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  trendIcon: { fontSize: 14 },
  trendText: { fontSize: 13, color: C.gray700, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },

  voiceModalContainer: { flex: 1, backgroundColor: "rgba(9, 30, 18, 0.95)", justifyContent: "center", alignItems: "center" },
  voiceCloseBtn: { position: "absolute", top: Platform.OS === "ios" ? 60 : 30, right: 24, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  voiceContent: { width: "90%", maxWidth: 400, alignItems: "center", justifyContent: "center", gap: 32 },
  voiceHintText: { fontSize: 20, fontWeight: "800", color: C.white, textAlign: "center", fontFamily: "PlusJakartaSans_800ExtraBold", letterSpacing: -0.5 },
  voiceMicOuter: { width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(16, 185, 129, 0.15)", justifyContent: "center", alignItems: "center" },
  voiceMicGradient: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", shadowColor: "#10B981", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  voiceSubText: { fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "PlusJakartaSans_500Medium" },
  voiceTranscriptCard: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 18, paddingVertical: 18, paddingHorizontal: 22, width: "100%", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  voiceTranscriptLabel: { fontSize: 10, fontWeight: "700", color: "#10B981", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, fontFamily: "PlusJakartaSans_700Bold" },
  voiceTranscriptText: { fontSize: 22, fontWeight: "800", color: C.white, textAlign: "center", fontFamily: "PlusJakartaSans_800ExtraBold" },
  voiceSuggestionsRail: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 10 },
  voiceSuggChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  voiceSuggText: { fontSize: 12, color: C.white, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold" },

  // Store category browse chips
=======
  catChipLabel: {
    fontSize: 13,
    color: C.gray900,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  trendCard: { width: 108 },
  trendImgWrap: {
    width: 108,
    height: 88,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.gray100,
    position: "relative",
    marginBottom: 6,
  },
  trendImg: { width: "100%", height: "100%" },
  trendBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: C.orange,
    borderRadius: 8,
    padding: 4,
  },
  trendName: {
    fontSize: 12,
    fontWeight: "700",
    color: C.gray900,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  trendPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: C.green,
    marginTop: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  histIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  histImg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.gray100,
  },
  histText: {
    flex: 1,
    fontSize: 14,
    color: C.gray700,
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
  },

  // Store category browse chips (moved here from the unrelated `dym` stylesheet,
  // where they were defined but never applied — that was the "tiny Grocery chip" bug)
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
  storeCatBrowseChip: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 92,
    height: 108,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 4,
  },
  storeCatBrowseChipActive: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  storeCatIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  storeCatBrowseIcon: {
    fontSize: 22,
    lineHeight: 28,
  },
  storeCatBrowseLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: "PlusJakartaSans_700Bold",
  },
});

const sg = StyleSheet.create({
<<<<<<< HEAD
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  text: { flex: 1, fontSize: 14, color: C.gray700 },
});

// ─── Did You Mean styles (currently unused by JSX below, kept for a future banner) ──
const dym = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 12, marginTop: 4,
    backgroundColor: C.amberLight,
    borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 16, padding: 14,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#FEF3C7",
    alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: 11, color: C.amber, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  suggestion: { fontSize: 17, fontWeight: "800", color: C.gray900, fontFamily: "PlusJakartaSans_800ExtraBold", marginTop: 1 },
  ctaChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.orange, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  ctaText: { fontSize: 13, fontWeight: "700", color: C.white, fontFamily: "PlusJakartaSans_700Bold" },
});

=======
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: { width: 32, height: 32, borderRadius: 16 },
  text: {
    flex: 1,
    fontSize: 14,
    color: C.gray700,
    fontFamily: "PlusJakartaSans_500Medium",
  },
});
>>>>>>> 3671524a374fccb6be54fc574a65ba1acbda356f
