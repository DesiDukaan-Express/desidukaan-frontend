import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, Modal,
  TouchableOpacity, ActivityIndicator, Animated,
  TextInput, Platform, StatusBar, Pressable, Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import useCartStore from "../../store/cartStore";
import useAuthStore from "../../store/authStore";

const BASE_URL = "http://localhost:3000/api";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange:      "#F97316", orangeDark:  "#EA580C",
  green:       "#16A34A", greenDark:   "#15803D",
  greenDeep:   "#14532D", greenLight:  "#F0FDF4",
  greenMid:    "#DCFCE7", greenBorder: "#BBF7D0",
  white:       "#FFFFFF", bg:          "#F8FAFC",
  gray100:     "#F3F4F6", gray200:     "#E5E7EB",
  gray300:     "#D1D5DB", gray400:     "#9CA3AF",
  gray500:     "#6B7280", gray600:     "#4B5563",
  gray700:     "#374151", gray900:     "#111827",
};

// ─── Category visual config ────────────────────────────────────────────────────
// Covers both schema category names and display names
const CAT_META = {
  // Schema names (from backend)
  Groceries:       { bg: "#FEF9C3", accent: "#CA8A04", emoji: "🥦", img: "https://images.unsplash.com/photo-1543168256-418811576931?w=300&q=80" },
  Dairy:           { bg: "#EFF6FF", accent: "#2563EB", emoji: "🥛", img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80" },
  Snacks:          { bg: "#FFF7ED", accent: "#EA580C", emoji: "🍿", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80" },
  Beverages:       { bg: "#F0FDF4", accent: "#16A34A", emoji: "🧃", img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&q=80" },
  Bakery:          { bg: "#FDF4FF", accent: "#9333EA", emoji: "🍞", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80" },
  Fruits:          { bg: "#ECFDF5", accent: "#059669", emoji: "🍎", img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=300&q=80" },
  Medicines:       { bg: "#F0F9FF", accent: "#0284C7", emoji: "💊", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80" },
  "Personal Care": { bg: "#FFF1F2", accent: "#E11D48", emoji: "🧴", img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&q=80" },
  // Fallback
  Other:           { bg: "#F3F4F6", accent: "#6B7280", emoji: "📦", img: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300&q=80" },
};

const getCatMeta  = (cat) => CAT_META[cat] || CAT_META["Other"];
const normalizeCat = (cat) => CAT_META[cat] ? cat : "Other";

// ─── Responsive helpers ────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(() =>
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.innerWidth
      : Dimensions.get("window").width
  );
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// Card columns + size based on screen width
function useCardLayout(winW) {
  return useMemo(() => {
    const H_PAD = 12; // padding each side of grid
    const GAP   = 10;
    let cols;
    if      (winW >= 1200) cols = 5;
    else if (winW >= 900)  cols = 4;
    else if (winW >= 600)  cols = 3;
    else                   cols = 2; // mobile: 2 columns
    const totalGap = GAP * (cols - 1);
    const cardW    = Math.floor((winW - H_PAD * 2 - totalGap) / cols);
    return { cols, cardW, gap: GAP, hPad: H_PAD };
  }, [winW]);
}

// ═══════════════════════════════════════════════════════════════════════════ //
// ─── Product Detail Modal ────────────────────────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════════════ //
function ProductModal({ item, onClose, onAdd, onRemove, qty }) {
  if (!item) return null;
  const p        = item.product || {};
  const catName  = p.category?.name || p.category || "Other";
  const meta     = getCatMeta(catName);
  const inStock  = item.stock_qty > 0;
  const discount = p.mrp && p.mrp > p.price
    ? Math.round((1 - p.price / p.mrp) * 100) : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm.backdrop} onPress={onClose}>
        <Pressable style={pm.sheet} onPress={() => {}}>
          <View style={pm.handleWrap}><View style={pm.handle} /></View>
          <View style={pm.imgWrap}>
            <Image
              source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80" }}
              style={pm.img} resizeMode="cover"
            />
            <LinearGradient colors={["transparent","rgba(0,0,0,0.3)"]} style={StyleSheet.absoluteFillObject} />
            <TouchableOpacity style={pm.closeBtn} onPress={onClose}>
              <Feather name="x" size={16} color={C.white} />
            </TouchableOpacity>
            <View style={[pm.catBadge, { backgroundColor: meta.bg }]}>
              <Text>{meta.emoji}</Text>
              <Text style={[pm.catBadgeText, { color: meta.accent }]}>{catName}</Text>
            </View>
            {discount && <View style={pm.discBadge}><Text style={pm.discText}>{discount}% off</Text></View>}
            {!inStock && <View style={pm.oosLayer}><Text style={pm.oosLayerText}>Out of Stock</Text></View>}
          </View>
          <View style={pm.body}>
            {item.stock_qty > 0 && item.stock_qty <= 10 && (
              <View style={pm.lowBanner}>
                <Feather name="alert-circle" size={13} color="#D97706" />
                <Text style={pm.lowBannerText}>Only {item.stock_qty} left — order soon!</Text>
              </View>
            )}
            <Text style={pm.name}>{p.name}</Text>
            <Text style={pm.unit}>{p.unit || "1 pc"}</Text>
            {p.description ? <Text style={pm.desc}>{p.description}</Text> : null}
            <View style={pm.footer}>
              <View>
                <Text style={pm.price}>₹{p.price}</Text>
                {p.mrp && p.mrp > p.price && (
                  <>
                    <Text style={pm.mrp}>MRP ₹{p.mrp}</Text>
                    <View style={pm.savePill}><Text style={pm.savePillText}>Save ₹{p.mrp - p.price}</Text></View>
                  </>
                )}
              </View>
              {inStock ? (
                qty === 0 ? (
                  <TouchableOpacity style={pm.addBtn} onPress={() => { onAdd(item); onClose(); }} activeOpacity={0.85}>
                    <Text style={pm.addBtnText}>Add to Cart</Text>
                    <Feather name="shopping-cart" size={15} color={C.white} />
                  </TouchableOpacity>
                ) : (
                  <View style={pm.qtyRow}>
                    <TouchableOpacity style={pm.qtyBtn} onPress={() => onRemove(item)}>
                      <Feather name="minus" size={15} color={C.white} />
                    </TouchableOpacity>
                    <Text style={pm.qtyNum}>{qty}</Text>
                    <TouchableOpacity style={pm.qtyBtn} onPress={() => onAdd(item)}>
                      <Feather name="plus" size={15} color={C.white} />
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                <View style={pm.oosBtn}><Text style={pm.oosBtnText}>Out of Stock</Text></View>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pm = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:        { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", maxHeight: "88%" },
  handleWrap:   { alignItems: "center", paddingTop: 10, paddingBottom: 4, backgroundColor: C.white },
  handle:       { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2 },
  imgWrap:      { width: "100%", height: 230 },
  img:          { width: "100%", height: "100%" },
  closeBtn:     { position: "absolute", top: 14, right: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.42)", alignItems: "center", justifyContent: "center" },
  catBadge:     { position: "absolute", bottom: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  catBadgeText: { fontSize: 12, fontWeight: "700" },
  discBadge:    { position: "absolute", top: 14, left: 14, backgroundColor: C.orange, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  discText:     { fontSize: 11, color: C.white, fontWeight: "800" },
  oosLayer:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.52)", alignItems: "center", justifyContent: "center" },
  oosLayerText: { fontSize: 20, fontWeight: "900", color: C.white, letterSpacing: 1 },
  body:         { padding: 20 },
  lowBanner:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", borderRadius: 10, padding: 10, marginBottom: 12 },
  lowBannerText:{ fontSize: 13, color: "#92400E", fontWeight: "600", flex: 1 },
  name:         { fontSize: 22, fontWeight: "900", color: C.gray900, marginBottom: 3 },
  unit:         { fontSize: 14, color: C.gray400, marginBottom: 10 },
  desc:         { fontSize: 14, color: C.gray500, lineHeight: 21, marginBottom: 12 },
  footer:       { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 16, borderTopWidth: 1, borderTopColor: C.gray100 },
  price:        { fontSize: 27, fontWeight: "900", color: C.gray900 },
  mrp:          { fontSize: 13, color: C.gray400, textDecorationLine: "line-through", marginTop: 2 },
  savePill:     { backgroundColor: C.greenMid, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 4 },
  savePillText: { fontSize: 11, color: C.green, fontWeight: "700" },
  addBtn:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.green, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 15 },
  addBtnText:   { fontSize: 16, fontWeight: "800", color: C.white },
  qtyRow:       { flexDirection: "row", alignItems: "center", backgroundColor: C.green, borderRadius: 15, overflow: "hidden" },
  qtyBtn:       { paddingHorizontal: 16, paddingVertical: 13 },
  qtyNum:       { fontSize: 18, fontWeight: "900", color: C.white, minWidth: 32, textAlign: "center" },
  oosBtn:       { backgroundColor: C.gray200, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 15 },
  oosBtnText:   { fontSize: 15, fontWeight: "700", color: C.gray500 },
});

// ═══════════════════════════════════════════════════════════════════════════ //
// ─── Product Card — responsive, balanced size ────────────────────────────── //
// ═══════════════════════════════════════════════════════════════════════════ //
function ProductCard({ item, onPress, onAdd, onRemove, qty, cardW }) {
  const p        = item.product || {};
  const inStock  = item.stock_qty > 0;
  const discount = p.mrp && p.mrp > p.price
    ? Math.round((1 - p.price / p.mrp) * 100) : null;
  const imgH     = cardW * 0.85;

  return (
    // Outer Pressable only for detail modal — does NOT wrap the cart controls
    <TouchableOpacity
      style={[pc.card, { width: cardW }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* ── Image ── */}
      <View style={[pc.imgWrap, { height: imgH }]}>
        <Image
          source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300" }}
          style={pc.img} resizeMode="cover"
        />
        {discount && inStock && (
          <View style={pc.discBadge}><Text style={pc.discText}>{discount}%</Text></View>
        )}
        {!inStock && (
          <View style={pc.oosOverlay}><Text style={pc.oosText}>Out of Stock</Text></View>
        )}
      </View>

      {/* ── Info ── */}
      <View style={pc.info}>
        <Text style={pc.name} numberOfLines={2}>{p.name}</Text>
        <Text style={pc.unit} numberOfLines={1}>{p.unit || "1 pc"}</Text>

        {/* Price row */}
        <View style={pc.priceRow}>
          <Text style={pc.price}>₹{p.price}</Text>
          {p.mrp && p.mrp > p.price && (
            <Text style={pc.mrp}>₹{p.mrp}</Text>
          )}
        </View>

        {/* ── Cart controls — isolated from card press ── */}
        {inStock ? (
          qty === 0 ? (
            // ADD button — large, full width, green filled
            <TouchableOpacity
              style={pc.addBtn}
              onPress={(e) => { e.stopPropagation?.(); onAdd(item); }}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color={C.white} />
              <Text style={pc.addText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            // Qty stepper — full width
            <View style={pc.qtyRow}>
              <TouchableOpacity
                style={pc.qtyBtn}
                onPress={(e) => { e.stopPropagation?.(); onRemove(item); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="minus" size={13} color={C.white} />
              </TouchableOpacity>
              <Text style={pc.qtyNum}>{qty}</Text>
              <TouchableOpacity
                style={pc.qtyBtn}
                onPress={(e) => { e.stopPropagation?.(); onAdd(item); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="plus" size={13} color={C.white} />
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View style={pc.oosBtn}>
            <Text style={pc.oosBtnText}>Out of stock</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card:       { backgroundColor: C.white, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.gray200, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  imgWrap:    { position: "relative", width: "100%" },
  img:        { width: "100%", height: "100%" },
  discBadge:  { position: "absolute", top: 6, left: 6, backgroundColor: C.orange, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  discText:   { fontSize: 9, color: C.white, fontWeight: "800" },
  oosOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.48)", alignItems: "center", justifyContent: "center" },
  oosText:    { fontSize: 11, fontWeight: "800", color: C.white, textAlign: "center" },
  info:       { padding: 9 },
  name:       { fontSize: 13, fontWeight: "700", color: C.gray900, lineHeight: 17, marginBottom: 2 },
  unit:       { fontSize: 11, color: C.gray400, marginBottom: 6 },
  priceRow:   { flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: 8 },
  price:      { fontSize: 14, fontWeight: "900", color: C.gray900 },
  mrp:        { fontSize: 10, color: C.gray400, textDecorationLine: "line-through" },
  // ADD button — full width, green filled, easy to tap
  addBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.green, borderRadius: 9, paddingVertical: 9 },
  addText:    { fontSize: 13, fontWeight: "800", color: C.white },
  // Qty stepper — full width
  qtyRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.green, borderRadius: 9, overflow: "hidden" },
  qtyBtn:     { paddingHorizontal: 14, paddingVertical: 9 },
  qtyNum:     { fontSize: 14, fontWeight: "900", color: C.white },
  // OOS state
  oosBtn:     { backgroundColor: C.gray100, borderRadius: 9, paddingVertical: 8, alignItems: "center" },
  oosBtnText: { fontSize: 11, fontWeight: "600", color: C.gray400 },
});

// ─── Category Section Header ───────────────────────────────────────────────────
function CatSectionHeader({ cat, count }) {
  const meta = getCatMeta(cat);
  return (
    <View style={csh.row}>
      <View style={[csh.iconWrap, { backgroundColor: meta.bg }]}>
        <Text style={csh.emoji}>{meta.emoji}</Text>
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
  row:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: C.bg },
  iconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  emoji:    { fontSize: 22 },
  title:    { fontSize: 17, fontWeight: "900", color: C.gray900 },
  sub:      { fontSize: 12, color: C.gray400, marginTop: 1 },
  badge:    { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20 },
  badgeText:{ fontSize: 12, fontWeight: "800" },
});

// ─── Category Tab Pill ─────────────────────────────────────────────────────────
function CatTabPill({ cat, count, isActive, onPress }) {
  const meta = getCatMeta(cat);
  return (
    <TouchableOpacity
      style={[ct.pill, isActive && ct.pillActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={ct.emoji}>{meta.emoji}</Text>
      <Text style={[ct.label, isActive && ct.labelActive]} numberOfLines={1}>{cat}</Text>
      <View style={[ct.bubble, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : meta.bg }]}>
        <Text style={[ct.bubbleText, { color: isActive ? C.white : meta.accent }]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}
const ct = StyleSheet.create({
  pill:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 22, borderWidth: 1.5, borderColor: C.gray200, backgroundColor: C.white, marginRight: 8 },
  pillActive: { backgroundColor: C.green, borderColor: C.green },
  emoji:      { fontSize: 14 },
  label:      { fontSize: 12, fontWeight: "700", color: C.gray600 },
  labelActive:{ color: C.white },
  bubble:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: "center" },
  bubbleText: { fontSize: 10, fontWeight: "800" },
});

// ═══════════════════════════════════════════════════════════════════════════ //
export default function VendorStoreScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { vendorId, vendorName } = route.params || {};
  const { token }  = useAuthStore();
  const cart       = useCartStore();

  const winW = useWindowWidth();
  const { cardW, gap, hPad } = useCardLayout(winW);

  const [vendor,      setVendor]      = useState(null);
  const [inventory,   setInventory]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [activeCat,   setActiveCat]   = useState("All");
  const [detailItem,  setDetailItem]  = useState(null);

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

  // Extract category name from inventory item — handles both shapes:
  // { product: { category: { name } } } and { product: { category: "string" } }
  const getCatName = useCallback((item) => {
    const cat = item.product?.category;
    if (!cat) return "Other";
    if (typeof cat === "string") return normalizeCat(cat);
    if (typeof cat === "object" && cat.name) return normalizeCat(cat.name);
    return "Other";
  }, []);

  // All unique categories that exist in this vendor's in-stock inventory
  const categories = useMemo(() => {
    const seen = new Set();
    inventory.forEach(i => {
      if (i.stock_qty > 0) seen.add(getCatName(i));
    });
    return ["All", ...[...seen].sort()];
  }, [inventory, getCatName]);

  // Count of in-stock items per category
  const catCounts = useMemo(() => {
    const counts = {};
    inventory.forEach(i => {
      if (i.stock_qty > 0) {
        const key = getCatName(i);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [inventory, getCatName]);

  const inStockTotal = inventory.filter(i => i.stock_qty > 0).length;

  // Filtered by search + active category
  const filtered = useMemo(() => inventory.filter(item => {
    const name = (item.product?.name || "").toLowerCase();
    const cat  = getCatName(item);
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchCat    = activeCat === "All" || cat === activeCat;
    return matchSearch && matchCat;
  }), [inventory, search, activeCat, getCatName]);

  const inStock  = filtered.filter(i => i.stock_qty > 0);
  const outStock = filtered.filter(i => i.stock_qty <= 0);

  // When "All" with no search, group by category for sectioned display
  const catSections = useMemo(() => {
    if (activeCat !== "All" || search) return null;
    const groups = {};
    inStock.forEach(item => {
      const key = getCatName(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [inStock, activeCat, search, getCatName]);

  // Cart helpers — cartStore uses qty (not quantity), addItem(product, vendorId)
  const getQty = useCallback((pid) =>
    (cart?.items || []).find(i => i.id === pid)?.qty || 0,
    [cart?.items]);

  const handleAdd = useCallback((item) => {
    const p = item.product || {};
    const product = {
      id:    item.product_id,
      name:  p.name,
      price: p.price,
      img:   p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
      unit:  p.unit,
    };
    // cartStore.addItem(product, vendorId) — two separate arguments
    cart?.addItem?.(product, vendorId);
  }, [cart, vendorId]);

  const handleRemove = useCallback((item) => {
    // cartStore.removeItem handles qty decrement and removal internally
    cart?.removeItem?.(item.product_id);
  }, [cart]);

  const goBack = () => {
    if (Platform.OS === "web" && window.history.length > 1) window.history.back();
    else navigation.goBack();
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[C.orange, C.orangeDark, C.greenDark, C.green]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Feather name="arrow-left" size={18} color={C.white} />
          </TouchableOpacity>
          <View style={s.headerMid}>
            <Text style={s.appName}>DesiDukaan</Text>
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

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <LinearGradient
        colors={[C.orange, C.orangeDark, C.greenDark, C.green]}
        start={{ x:0,y:0 }} end={{ x:1,y:0 }}
        style={s.header}
      >
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.8}>
          <Feather name="arrow-left" size={18} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.appName}>DesiDukaan</Text>
          <Text style={s.shopName} numberOfLines={1}>{vendor?.shop_name || vendorName}</Text>
          <View style={s.shopMetaRow}>
            <View style={[s.statusDot, { backgroundColor: vendor?.is_open ? "#4ADE80" : "#F87171" }]} />
            <Text style={s.metaText}>{vendor?.is_open ? "Open" : "Closed"}</Text>
            <Text style={s.metaSep}>·</Text>
            <Text style={s.metaText}>{inStockTotal} in stock</Text>
          </View>
        </View>
        <View style={s.ratingChip}>
          <Feather name="star" size={11} color="#FCD34D" />
          <Text style={s.ratingText}>
            {vendor?.avg_rating ? parseFloat(vendor.avg_rating).toFixed(1) : "New"}
          </Text>
        </View>
      </LinearGradient>

      {/* ══ SEARCH ══════════════════════════════════════════════════════════ */}
      <View style={s.searchWrap}>
        <View style={[s.searchBox, searchFocus && s.searchBoxActive]}>
          <Feather name="search" size={15} color={searchFocus ? C.green : C.gray400} />
          <TextInput
            style={s.searchInput}
            placeholder={`Search in ${vendor?.shop_name || "store"}…`}
            placeholderTextColor={C.gray400}
            value={search}
            onChangeText={t => { setSearch(t); if (t) setActiveCat("All"); }}
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
      </View>

      {/* ══ CATEGORY TABS (hidden during search) ════════════════════════════ */}
      {!search && categories.length > 1 && (
        <View style={s.catTabsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catTabsRow}>
            {/* All tab */}
            <TouchableOpacity
              style={[ct.pill, activeCat === "All" && ct.pillActive]}
              onPress={() => setActiveCat("All")}
              activeOpacity={0.8}
            >
              <Text style={ct.emoji}>🛒</Text>
              <Text style={[ct.label, activeCat === "All" && ct.labelActive]}>All</Text>
              <View style={[ct.bubble, { backgroundColor: activeCat === "All" ? "rgba(255,255,255,0.25)" : C.gray100 }]}>
                <Text style={[ct.bubbleText, { color: activeCat === "All" ? C.white : C.gray500 }]}>{inStockTotal}</Text>
              </View>
            </TouchableOpacity>

            {/* Category tabs — only from actual inventory */}
            {categories.filter(c => c !== "All").map(cat => (
              <CatTabPill
                key={cat}
                cat={cat}
                count={catCounts[cat] || 0}
                isActive={activeCat === cat}
                onPress={() => setActiveCat(cat)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ══ PRODUCTS BODY ═══════════════════════════════════════════════════ */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.body, { paddingHorizontal: hPad }]}>

        {/* Empty state */}
        {inStock.length === 0 && outStock.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}>
              {activeCat !== "All" ? (
                <Image source={{ uri: getCatMeta(activeCat).img }} style={{ width: 72, height: 72, borderRadius: 24, opacity: 0.35 }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 34 }}>{search ? "🔍" : "📦"}</Text>
              )}
            </View>
            <Text style={s.emptyTitle}>
              {search ? "No results found" : activeCat === "All" ? "No products available" : `No ${activeCat} in stock`}
            </Text>
            <Text style={s.emptySub}>
              {search ? "Try a different keyword" : activeCat === "All" ? "Check back later" : "This vendor has no items in this category"}
            </Text>
            {activeCat !== "All" && !search && (
              <TouchableOpacity style={s.browseAllBtn} onPress={() => setActiveCat("All")}>
                <Text style={s.browseAllText}>Browse all items</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* ── "All" tab + no search → sectioned by category ── */}
            {catSections && catSections.map(([cat, items]) => (
              <View key={cat}>
                <CatSectionHeader cat={cat} count={items.length} />
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
                <View style={s.sectionDivider} />
              </View>
            ))}

            {/* ── Specific category OR search results → flat grid ── */}
            {(activeCat !== "All" || search) && inStock.length > 0 && (
              <>
                {activeCat !== "All" && !search && (
                  <CatSectionHeader cat={activeCat} count={inStock.length} />
                )}
                {search && (
                  <View style={s.searchResultHeader}>
                    <Text style={s.searchResultText}>
                      {inStock.length} result{inStock.length !== 1 ? "s" : ""} for "{search}"
                    </Text>
                  </View>
                )}
                <View style={[s.grid, { gap }]}>
                  {inStock.map(item => (
                    <ProductCard
                      key={item.product_id} item={item}
                      qty={getQty(item.product_id)}
                      onPress={() => setDetailItem(item)}
                      onAdd={handleAdd} onRemove={handleRemove}
                      cardW={cardW}
                    />
                  ))}
                </View>
              </>
            )}

            {/* Out of stock */}
            {outStock.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <View style={s.oosSectionHeader}>
                  <Feather name="alert-circle" size={14} color={C.gray400} />
                  <Text style={s.oosSectionTitle}>Out of Stock ({outStock.length})</Text>
                </View>
                <View style={[s.grid, { gap }]}>
                  {outStock.map(item => (
                    <ProductCard
                      key={item.product_id} item={item} qty={0}
                      onPress={() => setDetailItem(item)}
                      onAdd={() => {}} onRemove={() => {}}
                      cardW={cardW}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ══ PRODUCT DETAIL MODAL ════════════════════════════════════════════ */}
      <ProductModal
        item={detailItem}
        qty={detailItem ? getQty(detailItem.product_id) : 0}
        onClose={() => setDetailItem(null)}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />

      {/* ══ FLOATING CART ═══════════════════════════════════════════════════ */}
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
  root:        { flex: 1, backgroundColor: C.bg },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 15, color: C.gray400, fontWeight: "500" },

  header: {
    padding: 14,
    paddingTop: Platform.OS === "android" ? 14 : 52,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  backBtn:     { width: 34, height: 34, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.18)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerMid:   { flex: 1 },
  appName:     { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  shopName:    { fontSize: 17, fontWeight: "900", color: C.white, letterSpacing: -0.2 },
  shopMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  statusDot:   { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  metaText:    { fontSize: 11, color: "rgba(255,255,255,0.82)", fontWeight: "500" },
  metaSep:     { color: "rgba(255,255,255,0.45)", fontSize: 11 },
  ratingChip:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.18)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, flexShrink: 0 },
  ratingText:  { fontSize: 12, fontWeight: "700", color: C.white },

  searchWrap:      { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  searchBox:       { flexDirection: "row", alignItems: "center", backgroundColor: C.gray100, borderRadius: 12, borderWidth: 1.5, borderColor: "transparent", paddingHorizontal: 12, paddingVertical: 9, gap: 9 },
  searchBoxActive: { borderColor: C.greenBorder, backgroundColor: C.greenLight },
  searchInput:     { flex: 1, fontSize: 14, color: C.gray900, outlineStyle: "none" },
  searchClearBtn:  { width: 20, height: 20, borderRadius: 10, backgroundColor: C.gray300, alignItems: "center", justifyContent: "center" },

  // Category tabs
  catTabsWrap: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  catTabsRow:  { paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row" },

  // Products body — hPad applied inline
  body:          { paddingTop: 4 },
  grid:          { flexDirection: "row", flexWrap: "wrap" },
  sectionDivider:{ height: 1, backgroundColor: C.gray100, marginTop: 16, marginHorizontal: 4 },

  searchResultHeader: { paddingTop: 14, paddingBottom: 6 },
  searchResultText:   { fontSize: 14, color: C.gray500, fontWeight: "600" },

  oosSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 12 },
  oosSectionTitle:  { fontSize: 16, fontWeight: "800", color: C.gray400 },

  emptyBox:      { alignItems: "center", paddingTop: 70, paddingBottom: 40 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center", marginBottom: 14, overflow: "hidden" },
  emptyTitle:    { fontSize: 18, fontWeight: "700", color: C.gray700, textAlign: "center" },
  emptySub:      { fontSize: 14, color: C.gray400, marginTop: 4, textAlign: "center", lineHeight: 20 },
  browseAllBtn:  { marginTop: 16, backgroundColor: C.greenLight, borderWidth: 1.5, borderColor: C.greenBorder, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  browseAllText: { fontSize: 14, fontWeight: "700", color: C.green },

  floatingCart:      { position: "absolute", bottom: 20, left: 16, right: 16, backgroundColor: C.green, borderRadius: 18, shadowColor: C.green, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 14, zIndex: 100 },
  floatingInner:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18 },
  floatingLeft:      { flexDirection: "row", alignItems: "center", gap: 12 },
  floatingBadge:     { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  floatingBadgeText: { fontSize: 15, fontWeight: "900", color: C.white },
  floatingItems:     { fontSize: 14, fontWeight: "700", color: C.white },
  floatingTotal:     { fontSize: 12, color: "rgba(255,255,255,0.82)", marginTop: 1 },
  floatingCTA:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12 },
  floatingCTAText:   { fontSize: 14, fontWeight: "800", color: C.white },
});