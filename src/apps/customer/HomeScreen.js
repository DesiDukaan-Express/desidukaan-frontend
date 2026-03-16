import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image, Modal,
  TouchableOpacity, ActivityIndicator, Animated, TextInput,
  Platform, Dimensions, StatusBar, Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore    from "../../store/authStore";
import useCartStore    from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import { useNavigation } from "@react-navigation/native";
import { vendorsAPI, ordersAPI } from "../../services/api";

const BASE_URL = "http://localhost:3000/api";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  orange:      "#F97316", orangeDark:  "#EA580C",
  green:       "#16A34A", greenDark:   "#15803D",
  greenDeep:   "#14532D", greenLight:  "#F0FDF4",
  greenMid:    "#DCFCE7", greenBorder: "#BBF7D0",
  white:       "#FFFFFF", bg:          "#F8FAFC",
  gray100:     "#F3F4F6", gray200:     "#E5E7EB",
  gray300:     "#D1D5DB", gray400:     "#9CA3AF",
  gray500:     "#6B7280", gray600:     "#4B5563",
  gray700:     "#374151", gray800:     "#1F2937",
  gray900:     "#111827",
};

// ─── Gradient Text ────────────────────────────────────────────────────────────
function GradientText({ text, style }) {
  if (Platform.OS === "web") {
    return (
      <Text style={[style, {
        background: `linear-gradient(90deg, ${C.orange}, ${C.green})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
      }]}>{text}</Text>
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

// ─── Address Picker Modal ─────────────────────────────────────────────────────
function AddressPicker({ visible, addresses, selectedId, onClose, onSelect, onSaveNew, onUseLocation }) {
  const [showForm,  setShowForm]  = React.useState(false);
  const [inputText, setInputText] = React.useState("");
  const [inputErr,  setInputErr]  = React.useState("");

  React.useEffect(() => {
    if (!visible) { setShowForm(false); setInputText(""); setInputErr(""); }
  }, [visible]);

  const handleSave = () => {
    if (inputText.trim().length < 5) { setInputErr("Please enter a valid address (at least 5 characters)"); return; }
    onSaveNew(inputText.trim());
    setInputText(""); setInputErr(""); setShowForm(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ap.backdrop} onPress={onClose}>
        <Pressable style={ap.sheet} onPress={() => {}}>
          <View style={ap.handle} />
          <View style={ap.titleRow}>
            <Text style={ap.title}>{showForm ? "Add new address" : "Select delivery address"}</Text>
            <TouchableOpacity onPress={() => showForm ? setShowForm(false) : onClose()} style={ap.closeBtn}>
              <Feather name={showForm ? "arrow-left" : "x"} size={16} color={C.gray500} />
            </TouchableOpacity>
          </View>

          {showForm ? (
            <View style={ap.formWrap}>
              <Text style={ap.formLabel}>Full address</Text>
              <View style={[ap.inputBox, inputErr ? ap.inputBoxError : null]}>
                <Feather name="map-pin" size={15} color={inputErr ? "#DC2626" : C.green} style={{ marginLeft: 14 }} />
                <TextInput
                  style={ap.input}
                  placeholder="House no., street, area, city…"
                  placeholderTextColor={C.gray400}
                  value={inputText}
                  onChangeText={(t) => { setInputText(t); setInputErr(""); }}
                  multiline numberOfLines={3} autoFocus
                  underlineColorAndroid="transparent"
                />
              </View>
              {inputErr ? <Text style={ap.inputErr}>{inputErr}</Text> : null}
              <TouchableOpacity
                style={[ap.saveBtn, inputText.trim().length < 5 && ap.saveBtnDisabled]}
                onPress={handleSave} activeOpacity={0.85}
                disabled={inputText.trim().length < 5}
              >
                <Feather name="check" size={16} color={C.white} />
                <Text style={ap.saveBtnText}>Save address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={ap.locationRow} onPress={onUseLocation} activeOpacity={0.8}>
                <View style={ap.locationIconWrap}><Feather name="crosshair" size={18} color={C.green} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={ap.locationRowTitle}>Use current location</Text>
                  <Text style={ap.locationRowSub}>Detect my location automatically</Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.gray400} />
              </TouchableOpacity>
              <View style={ap.divider} />
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                {addresses.length === 0 ? (
                  <View style={ap.emptyWrap}>
                    <Feather name="map-pin" size={28} color={C.gray300} />
                    <Text style={ap.emptyText}>No saved addresses yet</Text>
                  </View>
                ) : addresses.map((addr) => {
                  const isActive   = addr.id === selectedId;
                  const displayText = typeof addr.address === "string" ? addr.address : addr.address_line || "";
                  return (
                    <TouchableOpacity key={addr.id} style={[ap.addrRow, isActive && ap.addrRowActive]} onPress={() => onSelect(addr)} activeOpacity={0.8}>
                      <View style={[ap.addrIconWrap, isActive && ap.addrIconActive]}>
                        <Feather name="map-pin" size={15} color={isActive ? C.white : C.gray500} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[ap.addrLabel, isActive && ap.addrLabelActive]}>{addr.label || `Address ${addr.id}`}</Text>
                        <Text style={ap.addrText} numberOfLines={2}>{displayText}</Text>
                      </View>
                      {isActive && <View style={ap.activeTick}><Feather name="check" size={12} color={C.white} /></View>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={ap.addNewBtn} onPress={() => setShowForm(true)} activeOpacity={0.85}>
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
  backdrop:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:           { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  handle:          { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  titleRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  title:           { fontSize: 18, fontWeight: "900", color: C.gray900 },
  closeBtn:        { width: 32, height: 32, borderRadius: 10, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
  locationRow:     { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  locationIconWrap:{ width: 42, height: 42, borderRadius: 14, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center" },
  locationRowTitle:{ fontSize: 15, fontWeight: "700", color: C.gray900 },
  locationRowSub:  { fontSize: 12, color: C.gray400, marginTop: 2 },
  divider:         { height: 1, backgroundColor: C.gray100, marginVertical: 12 },
  emptyWrap:       { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText:       { fontSize: 14, color: C.gray400 },
  addrRow:         { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 14, marginBottom: 6, borderWidth: 1.5, borderColor: C.gray200, backgroundColor: C.white },
  addrRowActive:   { borderColor: C.green, backgroundColor: C.greenLight },
  addrIconWrap:    { width: 38, height: 38, borderRadius: 12, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addrIconActive:  { backgroundColor: C.green },
  addrLabel:       { fontSize: 14, fontWeight: "700", color: C.gray900, textTransform: "capitalize" },
  addrLabelActive: { color: C.greenDark },
  addrText:        { fontSize: 12, color: C.gray500, lineHeight: 17 },
  activeTick:      { width: 26, height: 26, borderRadius: 8, backgroundColor: C.green, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  addNewBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.greenBorder, backgroundColor: C.greenLight },
  addNewText:      { fontSize: 15, fontWeight: "700", color: C.green },
  formWrap:        { paddingTop: 4 },
  formLabel:       { fontSize: 12, fontWeight: "700", color: C.gray700, marginBottom: 8, letterSpacing: 0.2 },
  inputBox:        { flexDirection: "row", alignItems: "flex-start", backgroundColor: C.greenLight, borderRadius: 14, borderWidth: 1.5, borderColor: C.greenBorder, minHeight: 90, paddingVertical: 12, paddingRight: 14 },
  inputBoxError:   { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  input:           { flex: 1, fontSize: 14, color: C.gray900, paddingLeft: 10, paddingTop: 0, fontWeight: "500", textAlignVertical: "top", lineHeight: 22 },
  inputErr:        { fontSize: 12, color: "#DC2626", marginTop: 6, fontWeight: "500" },
  saveBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingVertical: 15, borderRadius: 14, backgroundColor: C.green },
  saveBtnDisabled: { backgroundColor: C.greenMid },
  saveBtnText:     { fontSize: 15, fontWeight: "800", color: C.white },
});

// ─── Store Picker Modal ───────────────────────────────────────────────────────
// Shows vendors that carry the tapped item
function StorePicker({ visible, item, vendors, onClose, onSelectStore }) {
  if (!item) return null;
  // Filter to vendors that have this item in stock
  const vendorsWithItem = vendors.filter(v =>
    v._inventory?.some(inv => inv.product?.name === item.name && inv.stock_qty > 0)
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sp.backdrop} onPress={onClose}>
        <Pressable style={sp.sheet} onPress={() => {}}>
          <View style={sp.handle} />
          <Text style={sp.sheetTitle}>Choose a store</Text>
          <Text style={sp.sheetSub}>
            Stores that have <Text style={sp.itemName}>{item.name}</Text> in stock
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 16 }}>
            {vendorsWithItem.length === 0 ? (
              <View style={sp.emptyWrap}>
                <Feather name="alert-circle" size={32} color={C.gray300} />
                <Text style={sp.emptyText}>No stores nearby carry this item right now.</Text>
              </View>
            ) : vendorsWithItem.map((v) => {
              // Find the actual price from this vendor's inventory
              const invItem = v._inventory?.find(inv => inv.product?.name === item.name);
              const price   = invItem?.product?.price ?? item.price;
              return (
                <TouchableOpacity key={v.id} style={sp.storeRow} onPress={() => onSelectStore(v, item)} activeOpacity={0.8}>
                  <Image source={{ uri: v.shop_image_url || v.image_url || "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400" }} style={sp.storeImg} />
                  <View style={sp.storeInfo}>
                    <Text style={sp.storeName}>{v.shop_name}</Text>
                    <View style={sp.storeMeta}>
                      <Feather name="map-pin" size={11} color={C.green} />
                      <Text style={sp.storeMetaText}>{v.distance_km ? `${parseFloat(v.distance_km).toFixed(1)} km` : "Nearby"}</Text>
                      <View style={sp.dot} />
                      <Feather name="clock" size={11} color={C.gray400} />
                      <Text style={sp.storeMetaText}>30 min</Text>
                    </View>
                    <Text style={sp.storePrice}>₹{price} <Text style={sp.storeUnit}>· {item.unit}</Text></Text>
                  </View>
                  <View style={sp.addStoreBtn}>
                    <Text style={sp.addStoreBtnText}>Add</Text>
                    <Feather name="arrow-right" size={13} color={C.white} />
                  </View>
                </TouchableOpacity>
              );
            })}
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
  backdrop:        { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:           { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36, maxHeight: "80%" },
  handle:          { width: 40, height: 4, backgroundColor: C.gray200, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle:      { fontSize: 20, fontWeight: "900", color: C.gray900 },
  sheetSub:        { fontSize: 14, color: C.gray500, marginTop: 4 },
  itemName:        { fontWeight: "700", color: C.gray800 },
  emptyWrap:       { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText:       { fontSize: 14, color: C.gray400, textAlign: "center" },
  storeRow:        { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.gray100, gap: 14 },
  storeImg:        { width: 54, height: 54, borderRadius: 14, backgroundColor: C.gray100 },
  storeInfo:       { flex: 1 },
  storeName:       { fontSize: 15, fontWeight: "800", color: C.gray900, marginBottom: 4 },
  storeMeta:       { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  storeMetaText:   { fontSize: 12, color: C.gray500 },
  dot:             { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.gray300 },
  storePrice:      { fontSize: 14, fontWeight: "700", color: C.gray900 },
  storeUnit:       { color: C.gray400, fontWeight: "400" },
  addStoreBtn:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addStoreBtnText: { fontSize: 14, fontWeight: "800", color: C.white },
  cancelBtn:       { marginTop: 16, paddingVertical: 14, alignItems: "center", borderRadius: 14, backgroundColor: C.gray100 },
  cancelText:      { fontSize: 15, fontWeight: "700", color: C.gray600 },
});

// ─── Item Card ────────────────────────────────────────────────────────────────
// Default fallback images per category
const CAT_FALLBACK_IMGS = {
  Groceries:       "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
  Dairy:           "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80",
  Snacks:          "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80",
  Beverages:       "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80",
  Bakery:          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80",
  Fruits:          "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80",
  Medicines:       "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
  "Personal Care": "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80",
  _default:        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80",
};

function ItemCard({ item, onAdd, onRemove, qty, cardWidth }) {
  const size = cardWidth || 130;
  // Use vendor-uploaded image; fall back to category-specific image
  const imgUri = item.img || CAT_FALLBACK_IMGS[item.category] || CAT_FALLBACK_IMGS._default;
  // MRP/SP logic: show strikethrough MRP only when mrp > sp
  const hasMrp = item.orig && item.orig > item.price;
  const discPct = hasMrp ? Math.round((1 - item.price / item.orig) * 100) : 0;

  return (
    <View style={[ic.card, { width: size }]}>
      {hasMrp && (
        <View style={ic.badge}>
          <Text style={ic.badgeText}>{discPct}% off</Text>
        </View>
      )}
      <Image source={{ uri: imgUri }} style={[ic.img, { height: size }]} resizeMode="cover" />
      <View style={ic.info}>
        <Text style={ic.name} numberOfLines={2}>{item.name}</Text>
        {/* Unit — shows loose/packet spec set by vendor */}
        <Text style={ic.unit}>{item.unit}</Text>
        {/* Price row: SP always shown; MRP shown struck only if mrp > sp */}
        <View style={ic.priceRow}>
          <Text style={ic.price}>₹{item.price}</Text>
          {hasMrp && <Text style={ic.orig}>₹{item.orig}</Text>}
        </View>
        {qty === 0 ? (
          <TouchableOpacity style={ic.addBtn} onPress={() => onAdd(item)} activeOpacity={0.8}>
            <Feather name="plus" size={12} color={C.white} />
            <Text style={ic.addText}>ADD</Text>
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
  card:     { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.gray200, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  badge:    { position: "absolute", top: 5, left: 5, zIndex: 2, backgroundColor: C.orange, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  badgeText:{ fontSize: 8, color: C.white, fontWeight: "800" },
  img:      { width: "100%" },
  info:     { padding: 8 },
  name:     { fontSize: 13, fontWeight: "700", color: C.gray900, lineHeight: 17, marginBottom: 2 },
  unit:     { fontSize: 11, color: C.gray400, marginBottom: 5 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 5, marginBottom: 8 },
  price:    { fontSize: 14, fontWeight: "900", color: C.gray900 },
  orig:     { fontSize: 10, color: C.gray400, textDecorationLine: "line-through" },
  addBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.green, borderRadius: 7, paddingVertical: 7 },
  addText:  { fontSize: 12, fontWeight: "800", color: C.white },
  qtyRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.green, borderRadius: 7, overflow: "hidden" },
  qtyBtn:   { paddingHorizontal: 10, paddingVertical: 7 },
  qtyNum:   { fontSize: 12, fontWeight: "800", color: C.white },
});

// ═════════════════════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const [locationShort,     setLocationShort]     = useState(null);
  const [locationCoords,    setLocationCoords]    = useState(null); // { lat, lng }
  const [vendors,           setVendors]           = useState([]);
  const [recentOrders,      setRecentOrders]      = useState([]);
  const [popularFromOrders, setPopularFromOrders] = useState([]); // from /api/products/popular
  const [loadingVendors,    setLoadingVendors]    = useState(false);
  const [loadingInventory,  setLoadingInventory]  = useState(false);
  const [locationLoading,   setLocationLoading]   = useState(true);

  // itemQtys tracks qty for popular-items section (keyed by item.id)
  const [itemQtys, setItemQtys] = useState({});

  // Store picker
  const [pickerItem,    setPickerItem]    = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Address picker
  const [addrPickerVisible, setAddrPickerVisible] = useState(false);
  const [selectedAddrId,    setSelectedAddrId]    = useState(null);

  // Responsive
  const [winW, setWinW] = useState(() =>
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.innerWidth : Dimensions.get("window").width
  );
  useEffect(() => {
    if (Platform.OS !== "web") return;
    setWinW(window.innerWidth);
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const wide = winW > 700;

  const { token, user } = useAuthStore();
  const navigation      = useNavigation();
  const addressStore    = useAddressStore();
  const cart            = useCartStore();

  // cartStore uses qty (not quantity)
  const cartItems = cart?.items || [];
  const cartCount = cartItems.reduce((s, i) => s + (i.qty || 0), 0);
  const cartTotal = cartItems.reduce((s, i) => s + i.price * (i.qty || 0), 0);

  // ── Animations ──────────────────────────────────────────────────────────────
  const headerOpacity  = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY       = useRef(new Animated.Value(16)).current;
  const floatingY      = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerOpacity,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(contentY,       { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (wide) return;
    Animated.spring(floatingY, {
      toValue: cartCount > 0 ? 0 : 120,
      tension: 70, friction: 12, useNativeDriver: true,
    }).start();
  }, [cartCount, wide]);

  useEffect(() => { fetchLocation(); }, []);
  useEffect(() => { if (token) fetchRecentOrders(); }, [token]);

  // ── Location ──────────────────────────────────────────────────────────────
  const fetchLocation = () => {
    setLocationLoading(true);
    if (Platform.OS === "web") {
      if (!navigator?.geolocation) { fallback("unsupported"); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => onCoords(p.coords.latitude, p.coords.longitude),
        (e) => fallback(e.message),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } else {
      (async () => {
        try {
          const L = require("expo-location");
          const { status } = await L.requestForegroundPermissionsAsync();
          if (status !== "granted") { fallback("denied"); return; }
          const loc = await L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced });
          onCoords(loc.coords.latitude, loc.coords.longitude);
        } catch (e) { fallback(e.message); }
      })();
    }
  };

  const onCoords = async (lat, lng) => {
    setLocationCoords({ lat, lng });
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "DesiDukaan/1.0" } }
      );
      const d = await res.json();
      if (d?.display_name) {
        const p = d.display_name.split(",");
        setLocationShort([p[0]?.trim(), p[1]?.trim()].filter(Boolean).join(", "));
      } else setLocationShort("Set location");
    } catch { setLocationShort("Set location"); }
    finally { setLocationLoading(false); }
    fetchNearbyVendors(lat, lng);
    fetchPopularProducts(lat, lng);
  };

  const fallback = () => {
    setLocationShort("Set location");
    setLocationLoading(false);
    fetchNearbyVendors(28.5921, 77.3196);
    fetchPopularProducts(28.5921, 77.3196);
  };

  // Fetch products sorted by actual order count near this location
  const fetchPopularProducts = async (lat, lng) => {
    try {
      const res  = await fetch(`${BASE_URL}/products/popular?lat=${lat}&lng=${lng}&radius_km=10&limit=12`);
      const data = await res.json();
      const list = data.data || [];
      if (list.length > 0) {
        setPopularFromOrders(list.map(p => ({
          id:       p.id,   // raw product ID — matches VendorStore cart entries
          name:     p.name,
          unit:     p.unit || "1 pc",
          price:    p.price,
          orig:     (p.mrp != null && p.mrp > p.price) ? p.mrp : null,
          img:      p.image_url || null,
          category: p.category?.name || "Other",
        })));
      }
    } catch {
      // Silently fail — inventory-based fallback is used instead
    }
  };

  // ── Fetch vendors → then fetch each vendor's inventory ──────────────────
  const fetchNearbyVendors = async (lat, lng) => {
    setLoadingVendors(true);
    try {
      const res  = await vendorsAPI.getNearby(lat, lng, 10);
      const list = res.data || [];
      setVendors(list);
      // Immediately kick off inventory fetch for all vendors
      fetchInventoryForVendors(list);
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
        vendorList.map(v =>
          fetch(`${BASE_URL}/inventory/vendor/${v.id}`, { headers })
            .then(r => r.json())
            .then(d => {
              const inv = Array.isArray(d) ? d : d.data || d.inventory || [];
              return { vendorId: v.id, inventory: inv };
            })
            .catch(() => ({ vendorId: v.id, inventory: [] }))
        )
      );
      // Attach _inventory to each vendor
      setVendors(prev => prev.map(v => {
        const found = results.find(r => r.vendorId === v.id);
        return { ...v, _inventory: found?.inventory || [] };
      }));
    } catch {}
    finally { setLoadingInventory(false); }
  };

  const fetchRecentOrders = async () => {
    try {
      const res = await ordersAPI.getMyOrders(token, 1);
      setRecentOrders(res.data?.orders?.slice(0, 3) || []);
    } catch {}
  };

  // ── Derive categories + popular items from vendor inventories ─────────────

  // All in-stock inventory items across all nearby vendors
  const allInventoryItems = useMemo(() => {
    const items = [];
    vendors.forEach(v => {
      (v._inventory || []).forEach(inv => {
        if (inv.stock_qty > 0 && inv.product) {
          items.push({ ...inv, _vendorId: v.id, _vendorName: v.shop_name });
        }
      });
    });
    return items;
  }, [vendors]);

  const CAT_META = {
    Groceries:   { img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80",  bg: "#FEF9C3" },
    Dairy:       { img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80",  bg: "#EFF6FF" },
    Snacks:      { img: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&q=80", bg: "#FFF7ED" },
    Beverages:   { img: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&q=80", bg: "#F0FDF4" },
    Bakery:      { img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80", bg: "#FDF4FF" },
    Fruits:      { img: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=300&q=80", bg: "#ECFDF5" },
    Medicines:   { img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80", bg: "#F0F9FF" },
  };

  // Normalise any singular/variant names to their canonical plural form
  const normalizeCatName = (name) => {
    if (!name) return null;
    const MAP = {
      Grocery: "Groceries", Snack: "Snacks", Beverage: "Beverages",
      Fruit: "Fruits", Medicine: "Medicines", "Personal Care": null, // excluded
    };
    return MAP.hasOwnProperty(name) ? MAP[name] : name;
  };

  // Fallback: category_id → name (matches your seed data)
  // Once backend includes category object in inventory response this is ignored
  const CAT_ID_MAP = useMemo(() => {
    const map = {};
    allInventoryItems.forEach(inv => {
      const cat = inv.product?.category;
      if (cat && typeof cat === "object" && cat.id && cat.name) {
        map[cat.id] = cat.name;
      }
    });
    return map;
  }, [allInventoryItems]);

  // Extract category name — normalises singular/variants, returns null for excluded cats
  const getCategoryName = useCallback((inv) => {
    const p   = inv.product;
    const cat = p?.category;
    let raw;
    if (cat && typeof cat === "object" && cat.name) raw = cat.name;
    else if (typeof cat === "string" && cat)         raw = cat;
    else if (p?.category_id && CAT_ID_MAP[p.category_id]) raw = CAT_ID_MAP[p.category_id];
    else return null;
    return normalizeCatName(raw); // may return null for excluded categories
  }, [CAT_ID_MAP]);

  const dynamicCategories = useMemo(() => {
    const seen = new Set();
    const cats = [];
    allInventoryItems.forEach(inv => {
      const catName = getCategoryName(inv);
      if (catName && !seen.has(catName)) {
        seen.add(catName);
        const meta = CAT_META[catName] || { img: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=300&q=80", bg: "#F3F4F6" };
        cats.push({ label: catName, tag: catName, img: meta.img, bg: meta.bg });
      }
    });
    return cats.sort((a, b) => a.label.localeCompare(b.label));
  }, [allInventoryItems, getCategoryName]);

  // Popular items — order-based when available, inventory-based as fallback
  // order-based = sorted by actual units sold (most ordered first)
  // inventory-based = sorted by how many nearby vendors stock the item
  const popularItems = useMemo(() => {
    // If the /products/popular endpoint returned data, use it directly
    if (popularFromOrders.length > 0) return popularFromOrders;

    // Fallback: derive from inventory, sort by vendor count
    const vendorCountMap = {};
    const itemMap        = {};
    allInventoryItems.forEach(inv => {
      const p    = inv.product;
      const name = p?.name;
      if (!name) return;
      const catName = getCategoryName(inv) || "Other";
      vendorCountMap[name] = (vendorCountMap[name] || 0) + 1;
      if (!itemMap[name]) {
        itemMap[name] = {
          id:       p.id,   // use raw product ID — matches what VendorStore adds to cart
          name,
          unit:     p.unit || "1 pc",
          price:    p.price,
          orig:     (p.mrp != null && p.mrp > p.price) ? p.mrp : null,
          img:      p.image_url || null,
          category: catName,
        };
      }
    });
    return Object.entries(vendorCountMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 12)
      .map(([name]) => itemMap[name])
      .filter(Boolean);
  }, [popularFromOrders, allInventoryItems, getCategoryName]);

  // ── Address picker logic ──────────────────────────────────────────────────
  const openAddressPicker = () => {
    if (!selectedAddrId && addressStore?.addresses?.length > 0) {
      setSelectedAddrId(addressStore.addresses[0].id);
    }
    setAddrPickerVisible(true);
  };

  const handleSelectAddress = (addr) => {
    setSelectedAddrId(addr.id);
    addressStore?.setSelectedId?.(addr.id);
    const display = addr.address || "";
    const parts   = display.split(",");
    setLocationShort([parts[0]?.trim(), parts[1]?.trim()].filter(Boolean).join(", ") || display);
    setAddrPickerVisible(false);
    if (addr.lat && addr.lng) {
      fetchNearbyVendors(addr.lat, addr.lng);
      fetchPopularProducts(addr.lat, addr.lng);
    }
  };

  const handleUseCurrentLocation = () => {
    setAddrPickerVisible(false);
    fetchLocation();
  };

  // ── Cart helpers ──────────────────────────────────────────────────────────
  // Opening store picker when ADD tapped on popular item
  const handleAdd = useCallback((item) => {
    const currentQty = (cart?.items || []).find(i => i.id === item.id)?.qty || itemQtys[item.id] || 0;
    if (currentQty === 0) {
      // First add — show store picker so user picks a vendor
      setPickerItem(item);
      setPickerVisible(true);
    } else {
      // Already in cart — increment using existing vendorId
      setItemQtys(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
      cart?.addItem?.({ id: item.id, name: item.name, price: item.price, img: item.img, unit: item.unit }, cart?.vendorId);
    }
  }, [itemQtys, cart]);

  const handleRemove = useCallback((item) => {
    cart?.removeItem?.(item.id);
    setItemQtys(prev => {
      const next = { ...prev };
      if ((next[item.id] || 0) > 0) next[item.id] = next[item.id] - 1;
      if (next[item.id] <= 0) delete next[item.id];
      return next;
    });
  }, [cart]);

  // When user picks a store from the store picker:
  // 1. add item to cart under that vendor
  // 2. navigate to that vendor's store screen
  const handleStoreSelect = useCallback((vendor, item) => {
    setPickerVisible(false);
    setItemQtys(prev => ({ ...prev, [item.id]: 1 }));
    cart?.addItem?.(
      { id: item.id, name: item.name, price: item.price, img: item.img, unit: item.unit },
      vendor.id
    );
    navigation.navigate("VendorStore", { vendorId: vendor.id, vendorName: vendor.shop_name });
  }, [cart, navigation]);

  // ── Utilities ─────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    if (h < 21) return "Good Evening";
    return "Good Night";
  };
  const getStatusColor = (s) => ({
    pending: "#D97706", accepted: "#2563EB", preparing: "#7C3AED",
    ready: C.green, delivered: C.greenDark, cancelled: "#DC2626",
  }[s] || C.gray400);

  const firstName = user?.name?.trim().split(" ")[0] || null;

  // ── Responsive body padding — big on desktop, small on mobile ─────────────
  const hPad = winW >= 1024 ? 48 : winW >= 700 ? 28 : 16;

  // Card width for popular items grid — accounts for responsive hPad and gap
  const cols  = wide ? (winW > 1200 ? 6 : winW > 900 ? 5 : 4) : 3;
  const cardW = Math.floor((winW - hPad * 2 - 12 * (cols - 1)) / cols);

  // Categories show as soon as inventory finishes, independent of vendor loading
  const showCategories = !loadingInventory && dynamicCategories.length > 0;
  const showPopular    = !loadingInventory && popularItems.length > 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <Animated.View style={[s.headerWrap, { opacity: headerOpacity }]}>
        {wide ? (
          // ── Desktop / Tablet header ──────────────────────────────────────
          <View style={[s.headerRow, { paddingHorizontal: hPad }]}>
            {/* Brand — hide on small tablets to save space */}
            {winW >= 900 && (
              <>
                <View style={s.brandSection}>
                  <View style={s.miniLogoWrap}>
                    <LinearGradient colors={[C.orange, C.orangeDark]} style={s.miniLogo}>
                      <Feather name="shopping-cart" size={15} color={C.white} />
                    </LinearGradient>
                  </View>
                  <GradientText text="DesiDukaan" style={s.brandName} />
                </View>
                <View style={s.headerDivider} />
              </>
            )}

            {/* Location */}
            <TouchableOpacity style={s.locationBtn} onPress={openAddressPicker} activeOpacity={0.75}>
              {locationLoading ? (
                <View style={s.locLoadRow}>
                  <ActivityIndicator size="small" color={C.green} style={{ transform: [{ scale: 0.7 }] }} />
                  <Text style={s.locLoadText}>Locating…</Text>
                </View>
              ) : (
                <>
                  <Text style={s.locationTop}>Delivering to</Text>
                  <View style={s.locationBottomRow}>
                    <Text style={s.locationBottom} numberOfLines={1}>{locationShort || "Set location"}</Text>
                    <Feather name="chevron-down" size={13} color={C.gray500} />
                  </View>
                </>
              )}
            </TouchableOpacity>

            {/* Search — takes all available flex space */}
            <TouchableOpacity style={s.webSearch} onPress={() => navigation.navigate("Search")} activeOpacity={0.8}>
              <Feather name="search" size={16} color={C.gray400} />
              <Text style={s.webSearchText} numberOfLines={1}>
                {winW < 850 ? "Search…" : `Search "rice", "daal", "milk"…`}
              </Text>
            </TouchableOpacity>

            {/* Account — hide label on small tablets */}
            <TouchableOpacity style={s.accountBtn} onPress={() => navigation.navigate("Profile")} activeOpacity={0.8}>
              <Feather name="user" size={16} color={C.gray700} />
              {winW >= 900 && <Text style={s.accountBtnText} numberOfLines={1}>{firstName || "Account"}</Text>}
              <Feather name="chevron-down" size={13} color={C.gray500} />
            </TouchableOpacity>

            {/* Cart */}
            <TouchableOpacity
              style={[s.cartBtn, cartCount > 0 && s.cartBtnActive]}
              onPress={() => navigation.navigate("Cart")}
              activeOpacity={0.8}
            >
              <Feather name="shopping-cart" size={16} color={cartCount > 0 ? C.white : C.gray700} />
              {winW >= 850 && (
                <Text style={[s.cartBtnText, cartCount > 0 && { color: C.white }]}>
                  {cartCount > 0 ? `${cartCount} item${cartCount > 1 ? "s" : ""}` : "Cart"}
                </Text>
              )}
              {cartCount > 0 && (
                <View style={s.cartBtnBadge}><Text style={s.cartBtnBadgeText}>₹{cartTotal}</Text></View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // ── Mobile header ────────────────────────────────────────────────
          <>
            <View style={[s.mobileRow1, { paddingHorizontal: hPad }]}>
              <TouchableOpacity style={s.mobileLocBtn} onPress={openAddressPicker} activeOpacity={0.75}>
                {locationLoading ? (
                  <View style={s.locLoadRow}>
                    <ActivityIndicator size="small" color={C.green} style={{ transform: [{ scale: 0.7 }] }} />
                    <Text style={s.locLoadText}>Locating…</Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.locationTop}>Delivering to</Text>
                    <View style={s.locationBottomRow}>
                      <Text style={s.mobileLocBottom} numberOfLines={1}>{locationShort || "Set location"}</Text>
                      <Feather name="chevron-down" size={13} color={C.gray700} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={s.mobileProfileBtn} onPress={() => navigation.navigate("Profile")} activeOpacity={0.8}>
                <Feather name="user" size={19} color={C.gray700} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.mobileSearch, { marginHorizontal: hPad }]} onPress={() => navigation.navigate("Search")} activeOpacity={0.8}>
              <Feather name="search" size={15} color={C.gray400} />
              <Text style={s.mobileSearchText}>Search stores, items…</Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      <LinearGradient colors={[C.orange, C.orangeDark, C.green, C.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accentLine} />

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: contentOpacity, transform: [{ translateY: contentY }] }}
        contentContainerStyle={s.scroll}
      >
        {/* 1. GREETING */}
        <View style={[s.greetingRow, { paddingHorizontal: hPad }]}>
          <Text style={s.greetingLine}>
            {getGreeting()}{firstName ? ", " : "! "}
            {firstName ? <Text style={s.greetingName}>{firstName} 👋</Text> : "👋"}
          </Text>
          <Text style={s.greetingSub}>Fresh groceries & daily essentials, delivered fast.</Text>
        </View>

        {/* 2. HERO BANNER */}
        <View style={[s.bannerWrap, { paddingHorizontal: hPad }]}>
          <View style={[s.heroBanner, { height: wide ? 200 : 160 }]}>
            <Image source={{ uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=85" }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <LinearGradient colors={["rgba(21,128,61,0.98)","rgba(21,128,61,0.92)","rgba(21,128,61,0.6)","rgba(21,128,61,0.1)","transparent"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={StyleSheet.absoluteFillObject} />
            <View style={[s.heroLeft, { width: wide ? "55%" : "70%" }]}>
              <Text style={s.heroTitle}>{"Stock up on\ndaily essentials"}</Text>
              <Text style={s.heroSub}>{"Farm-fresh fruits, vegetables,\ndairy, eggs & more"}</Text>
              <TouchableOpacity style={s.heroCTA} onPress={() => navigation.navigate("Search")} activeOpacity={0.85}>
                <Text style={s.heroCTAText}>Shop Now</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.infoPillRow}>
            <View style={s.infoPill}><Feather name="truck" size={12} color={C.green} /><Text style={s.infoPillText}>Free delivery above ₹299</Text></View>
            <View style={s.infoPillDot} />
            <View style={s.infoPill}><Feather name="clock" size={12} color={C.orange} /><Text style={s.infoPillText}>30 min delivery</Text></View>
            <View style={s.infoPillDot} />
            <View style={s.infoPill}><Feather name="shield" size={12} color="#7C3AED" /><Text style={s.infoPillText}>100% fresh guarantee</Text></View>
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
          <View style={[s.loadingRow, { paddingHorizontal: hPad }]}><ActivityIndicator size="small" color={C.green} /><Text style={s.loadingText}>Finding stores near you…</Text></View>
        ) : vendors.length === 0 ? (
          <View style={s.emptyBox}>
            <View style={s.emptyIconWrap}><Feather name="map-pin" size={26} color={C.green} /></View>
            <Text style={s.emptyTitle}>No stores found nearby</Text>
            <Text style={s.emptySub}>Try updating your delivery location</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: hPad, paddingRight: 8, paddingBottom: 6 }}>
            {vendors.map((vendor) => (
              <TouchableOpacity
                key={vendor.id}
                style={[s.storeCard, wide && s.storeCardWide]}
                onPress={() => navigation.navigate("VendorStore", { vendorId: vendor.id, vendorName: vendor.shop_name })}
                activeOpacity={0.88}
              >
                <View style={s.storeImgWrap}>
                  <Image source={{ uri: vendor.shop_image_url || vendor.image_url || "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400" }} style={s.storeImg} />
                  <LinearGradient colors={["transparent","rgba(0,0,0,0.5)"]} style={s.storeImgOverlay} />
                  <View style={s.statusBadge}>
                    <View style={[s.statusDot, { backgroundColor: vendor.is_open ? "#4ADE80" : "#F87171" }]} />
                    <Text style={s.statusText}>{vendor.is_open ? "Open" : "Closed"}</Text>
                  </View>
                  <View style={s.ratingBadge}>
                    <Feather name="star" size={10} color="#FBBF24" />
                    <Text style={s.ratingText}>{vendor.avg_rating ? parseFloat(vendor.avg_rating).toFixed(1) : "New"}</Text>
                  </View>
                </View>
                <View style={s.storeInfo}>
                  <Text style={s.storeName} numberOfLines={1}>{vendor.shop_name}</Text>
                  <View style={s.storeMetaRow}>
                    <Feather name="map-pin" size={10} color={C.green} />
                    <Text style={s.storeMeta}>{vendor.distance_km ? `${parseFloat(vendor.distance_km).toFixed(1)} km` : "Nearby"}</Text>
                    <View style={s.metaDot} />
                    <Feather name="clock" size={10} color={C.gray400} />
                    <Text style={s.storeMeta}>30 min</Text>
                  </View>
                  <View style={s.storeTagRow}>
                    <View style={s.storeTag}><Text style={s.storeTagText}>Min ₹{vendor.min_order || 99}</Text></View>
                    {vendor.is_open && (
                      <View style={[s.storeTag, { backgroundColor: C.greenLight, borderColor: C.greenBorder }]}>
                        <Text style={[s.storeTagText, { color: C.green }]}>Accepting orders</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 4. SHOP BY CATEGORY — dynamic from vendor inventories */}
        {showCategories && (
          <>
            <View style={[s.sectionHeader, { marginTop: 28, paddingHorizontal: hPad }]}>
              <View>
                <Text style={s.sectionTitle}>Shop by Category</Text>
                <Text style={s.sectionSub}>Available near you</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: hPad, paddingRight: 8, paddingBottom: 8 }}>
              {dynamicCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.label}
                  style={[s.catChip, wide && s.catChipWide]}
                  onPress={() => navigation.navigate("Search", { category: cat.label, filterByCategory: true })}
                  activeOpacity={0.8}
                >
                  <View style={[s.catImgWrap, { backgroundColor: cat.bg }]}>
                    <Image source={{ uri: cat.img }} style={s.catImg} resizeMode="cover" />
                  </View>
                  <Text style={s.catLabel}>{cat.label}</Text>
                  <Text style={s.catTagText}>{cat.tag}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Loading indicator for categories */}
        {loadingInventory && vendors.length > 0 && (
          <View style={[s.sectionHeader, { marginTop: 28, paddingHorizontal: hPad }]}>
            <ActivityIndicator size="small" color={C.green} />
            <Text style={[s.sectionSub, { marginLeft: 8 }]}>Loading categories…</Text>
          </View>
        )}

        {/* 5. POPULAR ITEMS — dynamic from vendor inventories */}
        {showPopular && (
          <>
            <View style={[s.sectionHeader, { marginTop: 28, paddingHorizontal: hPad }]}>
              <View>
                <Text style={s.sectionTitle}>Popular Items</Text>
                <Text style={s.sectionSub}>Available at nearby stores</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate("Search")}>
                <Text style={s.viewAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.itemsGrid, { paddingHorizontal: hPad }]}>
              {popularItems.map((item) => {
                // Read qty directly from cartStore so additions from VendorStore show here too
                const qtyFromCart = (cart?.items || []).find(i => i.id === item.id)?.qty || 0;
                const qty = Math.max(itemQtys[item.id] || 0, qtyFromCart);
                return (
                  <ItemCard
                    key={item.id} item={item}
                    qty={qty}
                    onAdd={handleAdd} onRemove={handleRemove}
                    cardWidth={cardW}
                  />
                );
              })}
            </View>
          </>
        )}

        {/* 6. RECENT ORDERS */}
        {recentOrders.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: 28, paddingHorizontal: hPad }]}>
              <Text style={s.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate("MyOrders")}>
                <Text style={s.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order) => (
              <TouchableOpacity key={order.id} style={[s.orderCard, { marginHorizontal: hPad }]} onPress={() => navigation.navigate("MyOrders")} activeOpacity={0.85}>
                <Image source={{ uri: order.vendor?.shop_image_url || order.vendor?.image_url || "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200" }} style={s.orderImg} />
                <View style={s.orderInfo}>
                  <Text style={s.orderStore} numberOfLines={1}>{order.vendor?.shop_name || "Store"}</Text>
                  <Text style={s.orderMeta}>{order.order_number} · ₹{order.total}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: getStatusColor(order.status) + "18" }]}>
                  <Text style={[s.statusPillText, { color: getStatusColor(order.status) }]}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={15} color={C.gray300} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: wide ? 60 : 130 }} />
      </Animated.ScrollView>

      {/* ══ ADDRESS PICKER MODAL ════════════════════════════════════════════ */}
      <AddressPicker
        visible={addrPickerVisible}
        addresses={addressStore?.addresses || []}
        selectedId={selectedAddrId}
        onClose={() => setAddrPickerVisible(false)}
        onSelect={handleSelectAddress}
        onSaveNew={async (text) => {
          let lat = null, lng = null;
          try {
            const encoded = encodeURIComponent(text);
            const res     = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`, { headers: { "User-Agent": "DesiDukaan/1.0" } });
            const results = await res.json();
            if (results?.length > 0) { lat = parseFloat(results[0].lat); lng = parseFloat(results[0].lon); }
          } catch {}
          addressStore?.addAddress?.({ address: text, lat, lng });
          const newId = (addressStore?.addresses?.length || 0) + 1;
          setSelectedAddrId(newId);
          addressStore?.setSelectedId?.(newId);
          const parts = text.split(",");
          setLocationShort([parts[0]?.trim(), parts[1]?.trim()].filter(Boolean).join(", ") || text);
          if (lat && lng) fetchNearbyVendors(lat, lng);
        }}
        onUseLocation={handleUseCurrentLocation}
      />

      {/* ══ STORE PICKER MODAL ══════════════════════════════════════════════ */}
      <StorePicker
        visible={pickerVisible}
        item={pickerItem}
        vendors={vendors}
        onClose={() => setPickerVisible(false)}
        onSelectStore={handleStoreSelect}
      />

      {/* ══ FLOATING CART — mobile ═══════════════════════════════════════════ */}
      {!wide && cartCount > 0 && (
        <Animated.View style={[s.floatingCart, { transform: [{ translateY: floatingY }] }]}>
          <View style={s.floatingLeft}>
            <View style={s.floatingBadge}><Text style={s.floatingBadgeText}>{cartCount}</Text></View>
            <View>
              <Text style={s.floatingItems}>{cartCount} item{cartCount > 1 ? "s" : ""} added</Text>
              <Text style={s.floatingTotal}>₹{cartTotal} total</Text>
            </View>
          </View>
          <TouchableOpacity style={s.floatingCTA} onPress={() => navigation.navigate("Cart")} activeOpacity={0.85}>
            <Text style={s.floatingCTAText}>View Cart</Text>
            <Feather name="arrow-right" size={14} color={C.white} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  headerWrap:    { backgroundColor: C.white, paddingTop: Platform.OS === "android" ? 18 : 22, borderBottomWidth: 1, borderBottomColor: C.gray200 },
  accentLine:    { height: 2.5 },
  // paddingHorizontal applied inline via hPad
  headerRow:     { flexDirection: "row", alignItems: "center", paddingBottom: 14, gap: 0 },
  brandSection:  { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  miniLogoWrap:  { width: 34, height: 34, borderRadius: 10, overflow: "hidden" },
  miniLogo:      { flex: 1, alignItems: "center", justifyContent: "center" },
  brandName:     { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  headerDivider: { width: 1, height: 38, backgroundColor: C.gray200, marginHorizontal: 16, flexShrink: 0 },

  locationBtn:       { flexShrink: 0, minWidth: 100, maxWidth: 180, justifyContent: "center", marginRight: 12 },
  locLoadRow:        { flexDirection: "row", alignItems: "center", gap: 4 },
  locLoadText:       { fontSize: 12, color: C.gray500 },
  locationTop:       { fontSize: 11, color: C.gray500, fontWeight: "500", lineHeight: 15 },
  locationBottomRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locationBottom:    { fontSize: 15, fontWeight: "800", color: C.gray900, flexShrink: 1 },
  // Search bar — flex: 1 makes it fill all available space
  webSearch:         { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.gray100, borderRadius: 10, borderWidth: 1, borderColor: C.gray200, paddingVertical: 10, paddingHorizontal: 12, marginRight: 10, minWidth: 80 },
  webSearchText:     { flex: 1, fontSize: 13, color: C.gray400 },
  accountBtn:        { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200, marginRight: 8, flexShrink: 0 },
  accountBtnText:    { fontSize: 13, fontWeight: "700", color: C.gray700, maxWidth: 80 },
  cartBtn:           { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: C.gray200, backgroundColor: C.gray100, flexShrink: 0 },
  cartBtnActive:     { backgroundColor: C.green, borderColor: C.green },
  cartBtnText:       { fontSize: 13, fontWeight: "700", color: C.gray700 },
  cartBtnBadge:      { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cartBtnBadgeText:  { fontSize: 11, fontWeight: "800", color: C.white },

  // paddingHorizontal applied inline via hPad
  mobileRow1:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 10 },
  mobileLocBtn:     { flex: 1, marginRight: 12 },
  mobileLocBottom:  { fontSize: 16, fontWeight: "700", color: C.gray900 },
  mobileProfileBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: C.gray200, alignItems: "center", justifyContent: "center" },
  // marginHorizontal applied inline via hPad
  mobileSearch:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.gray100, borderRadius: 10, borderWidth: 1, borderColor: C.gray200, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  mobileSearchText: { flex: 1, fontSize: 14, color: C.gray400 },

  scroll:        { paddingBottom: 40 },
  greetingRow:   { paddingTop: 14, paddingBottom: 12 },
  greetingLine:  { fontSize: 18, color: C.gray700, fontWeight: "500", lineHeight: 24 },
  greetingName:  { color: C.gray900, fontWeight: "800" },
  greetingSub:   { fontSize: 13, color: C.gray400, marginTop: 2 },

  bannerWrap:  { marginBottom: 24 },
  heroBanner:  { borderRadius: 20, overflow: "hidden", justifyContent: "center" },
  heroLeft:    { paddingHorizontal: 22, paddingVertical: 22, zIndex: 2 },
  heroTitle:   { fontSize: 20, fontWeight: "900", color: C.white, lineHeight: 28, marginBottom: 6 },
  heroSub:     { fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 18, marginBottom: 16 },
  heroCTA:     { backgroundColor: C.white, alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  heroCTAText: { fontSize: 13, fontWeight: "900", color: C.greenDark },

  infoPillRow: { flexDirection: "row", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 8 },
  infoPill:    { flexDirection: "row", alignItems: "center", gap: 4 },
  infoPillText:{ fontSize: 12, color: C.gray500, fontWeight: "500" },
  infoPillDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.gray300 },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, marginTop: 4 },
  sectionTitle:  { fontSize: 20, fontWeight: "900", color: C.gray900 },
  sectionSub:    { fontSize: 12, color: C.gray400, marginTop: 2 },
  viewAll:       { fontSize: 13, color: C.green, fontWeight: "700", marginTop: 2 },

  loadingRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 24 },
  loadingText:   { fontSize: 14, color: C.gray400 },
  emptyBox:      { alignItems: "center", paddingVertical: 36 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.greenLight, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: C.gray700 },
  emptySub:      { fontSize: 13, color: C.gray400, marginTop: 3 },

  storeImgWrap:    { position: "relative" },
  storeImg:        { width: "100%", height: 180 },
  storeImgOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 75 },
  statusBadge:     { position: "absolute", top: 9, left: 9, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.55)" },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusText:      { fontSize: 11, color: C.white, fontWeight: "700" },
  ratingBadge:     { position: "absolute", bottom: 9, right: 9, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.96)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  ratingText:      { fontSize: 11, fontWeight: "800", color: C.gray900 },
  storeInfo:       { padding: 14 },
  storeName:       { fontSize: 16, fontWeight: "800", color: C.gray900, marginBottom: 5 },
  storeMetaRow:    { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 9 },
  storeMeta:       { fontSize: 11, color: C.gray500 },
  metaDot:         { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.gray300 },
  storeTagRow:     { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  storeTag:        { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 },
  storeTagText:    { fontSize: 10, color: C.gray600, fontWeight: "600" },
  storeCard:       { width: 280, marginRight: 18, marginBottom: 4, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.gray200, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  storeCardWide:   { width: 320 },

  catChip:     { alignItems: "center", marginRight: 22, width: 124 },
  catChipWide: { width: 144 },
  catImgWrap:  { width: 114, height: 114, borderRadius: 28, overflow: "hidden", marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  catImg:      { width: "100%", height: "100%" },
  catLabel:    { fontSize: 15, color: C.gray900, fontWeight: "800", textAlign: "center" },
  catTagText:  { fontSize: 12, color: C.gray400, fontWeight: "500", textAlign: "center", marginTop: 3 },

  itemsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 },

  orderImg:       { width: 54, height: 54, borderRadius: 12, marginRight: 12 },
  orderInfo:      { flex: 1 },
  orderStore:     { fontSize: 14, fontWeight: "700", color: C.gray900 },
  orderMeta:      { fontSize: 12, color: C.gray500, marginTop: 2 },
  statusPill:     { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  orderCard:      { flexDirection: "row", alignItems: "center", marginBottom: 10, padding: 13, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.gray200, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 2 },

  floatingCart:      { position: "absolute", bottom: 90, left: 16, right: 16, backgroundColor: C.green, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 18, shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.38, shadowRadius: 14, elevation: 12, zIndex: 99 },
  floatingLeft:      { flexDirection: "row", alignItems: "center", gap: 12 },
  floatingBadge:     { width: 32, height: 32, borderRadius: 9, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  floatingBadgeText: { fontSize: 14, fontWeight: "900", color: C.white },
  floatingItems:     { fontSize: 14, fontWeight: "700", color: C.white },
  floatingTotal:     { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  floatingCTA:       { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 11 },
  floatingCTAText:   { fontSize: 14, fontWeight: "800", color: C.white },
});