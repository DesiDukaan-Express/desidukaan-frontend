import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, Alert, Dimensions, RefreshControl,
  ScrollView, Modal, Pressable, Animated,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import useWishlistStore from "../../store/wishlistStore";
import useCartStore from "../../store/cartStore";
import useAddressStore from "../../store/addressStore";
import { productsAPI } from "../../services/api";
import WishlistHeart from "../../components/WishlistHeart";
import ProductStarRating from "../../components/ProductStarRating";

const C = {
  green: "#16A34A",
  greenDark: "#15803D",
  greenLight: "#F0FDF4",
  orange: "#F97316",
  orangeDark: "#EA580C",
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
  red: "#DC2626",
};

function useBreakpoint() {
  const [w, setW] = useState(Dimensions.get("window").width);
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setW(window.width));
    return () => sub?.remove?.();
  }, []);
  if (w >= 1024) return { isMobile: false, isTablet: false, isDesktop: true, cols: 4 };
  if (w >= 640)  return { isMobile: false, isTablet: true,  isDesktop: false, cols: 3 };
  return               { isMobile: true,  isTablet: false, isDesktop: false, cols: 2 };
}

export default function WishlistScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const token = useAuthStore((s) => s.token);
  const { items, loading, loadAll } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const cartVendorId = useCartStore((s) => s.vendorId);
  const currentLocation = useAddressStore((s) => s.currentLocation);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [popularProducts, setPopularProducts] = useState([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const { cols } = useBreakpoint();

  // Modal state
  const [modalItem, setModalItem] = useState(null);
  const [modalQty, setModalQty] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const SORT_OPTIONS = [
    { key: "recent", label: "Recent" },
    { key: "price_high", label: "Price High to Low" },
    { key: "price_low", label: "Price Low to High" },
    { key: "name", label: "A-Z" },
  ];

  const sortedItems = useMemo(() => {
    const list = [...items];
    switch (sortBy) {
      case "price_low":
        return list.sort((a, b) => (a.product?.price || 0) - (b.product?.price || 0));
      case "price_high":
        return list.sort((a, b) => (b.product?.price || 0) - (a.product?.price || 0));
      case "name":
        return list.sort((a, b) => (a.product?.name || "").localeCompare(b.product?.name || ""));
      case "recent":
      default:
        return list;
    }
  }, [items, sortBy]);

  const paddedItems = useMemo(() => {
    if (sortedItems.length === 0) return sortedItems;
    const remainder = sortedItems.length % cols;
    if (remainder === 0) return sortedItems;
    const padCount = cols - remainder;
    const placeholders = Array.from({ length: padCount }, (_, i) => ({
      id: `__ph_${i}`,
      product: null,
      isPlaceholder: true,
    }));
    return [...sortedItems, ...placeholders];
  }, [sortedItems, cols]);

  useEffect(() => {
    loadAll(token);
  }, []);

  // Fetch popular products for empty state
  useEffect(() => {
    if (items.length > 0 || loading) return;
    setPopularLoading(true);
    const lat = currentLocation?.lat || 28.5921;
    const lng = currentLocation?.lng || 77.3196;
    productsAPI.getPopular(lat, lng, 10, 8, token)
      .then((res) => {
        if (res.data) setPopularProducts(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {})
      .finally(() => setPopularLoading(false));
  }, [items.length, loading, token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll(token);
    setRefreshing(false);
  }, [token]);

  // Modal animations
  const openModal = (item) => {
    setModalItem(item);
    setModalQty(0);
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
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 25, duration: 220, useNativeDriver: true }),
    ]).start(() => setModalItem(null));
  };

  const getQtyInCart = (productId) => {
    const found = cartItems.find((i) => i.id === productId);
    return found ? found.qty || 0 : 0;
  };

  const handleAddToCart = (item) => {
    const product = item.product;
    if (!product) return;

    const vendorId = product.vendor?.id || item.vendor_id;
    const cartProduct = { ...product, image: product.image || product.image_url, vendorId };

    if (cartVendorId && vendorId && cartVendorId !== vendorId) {
      Alert.alert(
        "Different Store",
        "Your cart has items from another store. Add this item instead?",
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.ok"),
            onPress: () => {
              useCartStore.getState().clearCart();
              addItem(cartProduct, vendorId);
              setModalQty(1);
            },
          },
        ]
      );
      return;
    }

    addItem(cartProduct, vendorId);
    setModalQty((q) => q + 1);
  };

  const handleModalAdd = () => {
    if (!modalItem) return;
    const p = modalItem.product;
    if (!p) return;
    const vendorId = p.vendor?.id || modalItem.vendor_id;
    const cartProduct = { ...p, image: p.image || p.image_url, vendorId };

    if (cartVendorId && vendorId && cartVendorId !== vendorId) {
      Alert.alert(
        "Different Store",
        "Your cart has items from another store. Add this item instead?",
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.ok"),
            onPress: () => {
              useCartStore.getState().clearCart();
              addItem(cartProduct, vendorId);
              setModalQty(1);
            },
          },
        ]
      );
      return;
    }

    addItem(cartProduct, vendorId);
    setModalQty((q) => q + 1);
  };

  const renderCard = ({ item }) => {
    if (item.isPlaceholder) {
      return <View style={[s.card, { backgroundColor: "transparent", shadowOpacity: 0, elevation: 0 }]} />;
    }
    const p = item.product;
    if (!p) return null;
    const vendor = p.vendor;
    const discount = p.mrp && p.mrp > p.price
      ? Math.round((1 - p.price / p.mrp) * 100) : null;
    const qty = getQtyInCart(p.id);

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.88}
        onPress={() => openModal(item)}
      >
        <View style={s.imgWrap}>
          <Image
            source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300" }}
            style={s.img}
            resizeMode="cover"
          />
          {discount && (
            <View style={s.discBadge}>
              <Text style={s.discText}>{discount}% {t("vendorStore.off")}</Text>
            </View>
          )}
          <WishlistHeart productId={p.id} size={20} style={{ position: "absolute", top: 8, right: 8 }} />
        </View>
        <View style={s.info}>
          <Text style={s.name} numberOfLines={2}>{p.name}</Text>
          <Text style={s.unit} numberOfLines={1}>{p.unit || "1 pc"}</Text>
          {vendor && (
            <Text style={s.vendor} numberOfLines={1}>{vendor.shop_name}</Text>
          )}
          <View style={s.priceRow}>
            <Text style={s.price}>₹{p.price}</Text>
            {p.mrp && p.mrp > p.price && <Text style={s.mrp}>₹{p.mrp}</Text>}
          </View>
          {qty > 0 ? (
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={(e) => { e.stopPropagation?.(); useCartStore.getState().updateQty(p.id, qty - 1); setModalQty(Math.max(0, qty - 1)); }}>
                <Feather name="minus" size={14} color={C.white} />
              </TouchableOpacity>
              <Text style={s.qtyNum}>{qty}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={(e) => { e.stopPropagation?.(); handleAddToCart(item); }}>
                <Feather name="plus" size={14} color={C.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={s.addBtn}
              onPress={(e) => { e.stopPropagation?.(); handleAddToCart(item); }}
              activeOpacity={0.8}
            >
              <Feather name="shopping-cart" size={12} color={C.white} />
              <Text style={s.addBtnText}>{t("wishlist.addToCart")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={s.emptyWrap}>
      <MaterialIcons name="favorite-border" size={64} color={C.gray300} />
      <Text style={s.emptyTitle}>{t("wishlist.empty")}</Text>
      <Text style={s.emptySub}>{t("wishlist.emptySub")}</Text>
      <TouchableOpacity
        style={s.browseBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={s.browseBtnText}>{t("wishlist.browse")}</Text>
      </TouchableOpacity>
      {popularLoading ? (
        <ActivityIndicator size="small" color={C.green} style={{ marginTop: 20 }} />
      ) : popularProducts.length > 0 ? (
        <View style={s.popularSection}>
          <Text style={s.popularTitle}>{t("wishlist.popular") || "Popular near you"}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.popularScroll}>
            {popularProducts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={s.popularCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("VendorStore", { vendorId: p.vendor?.id || p.inventory?.[0]?.vendor_id })}
              >
                <Image
                  source={{ uri: p.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200" }}
                  style={s.popularImg}
                  resizeMode="cover"
                />
                <Text style={s.popularName} numberOfLines={2}>{p.name}</Text>
                <Text style={s.popularPrice}>₹{p.price}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  // Modal product data
  const mp = modalItem?.product;
  const mVendor = mp?.vendor;
  const mDiscount = mp?.mrp && mp?.mrp > mp?.price
    ? Math.round((1 - mp?.price / mp?.mrp) * 100) : null;
  const mInStock = mp?.stock !== 0 && mp?.stock !== false;
  const mLoose = mp?.item_type === "loose";
  const mQty = modalQty || getQtyInCart(mp?.id);

  return (
    <View style={s.root}>
      <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "default"} />
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={C.gray700} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>{t("wishlist.title")}</Text>
        </View>
        {items.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{t("wishlist.itemCount", { count: items.length })}</Text>
          </View>
        )}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator size="large" color={C.green} style={{ flex: 1 }} />
      ) : (
        <>
          {items.length > 1 && (
            <View style={s.sortBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortScroll}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setSortBy(opt.key)}
                    style={[s.sortChip, sortBy === opt.key && s.sortChipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.sortChipText, sortBy === opt.key && s.sortChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <FlatList
            data={paddedItems}
            key={cols}
            numColumns={cols}
            keyExtractor={(item) => String(item.id || item.product_id)}
            renderItem={renderCard}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={items.length === 0 ? s.emptyList : s.grid}
            columnWrapperStyle={cols > 1 ? s.row : undefined}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.green]} tintColor={C.green} />
            }
          />
        </>
      )}

      {/* ═══════ PRODUCT DETAIL MODAL ═══════ */}
      <Modal visible={!!modalItem} transparent onRequestClose={closeModal} statusBarTranslucent animationType="none">
        <Animated.View style={[mstyles.backdropLayer, { opacity: backdropOpacity }]} />
        <Animated.View style={[mstyles.backdropBlur, { opacity: backdropOpacity }]} />
        <Pressable style={mstyles.backdropPress} onPress={closeModal}>
          <Animated.View style={[mstyles.backdropOverlay, { opacity: fadeAnim }]} />
        </Pressable>
        <View style={mstyles.centerWrap} pointerEvents="box-none">
          <Animated.View style={[mstyles.card, {
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            opacity: fadeAnim,
          }]}>
            {mp && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ maxHeight: "100%" }}>
                <View style={mstyles.imgWrap}>
                  <Image
                    source={{ uri: mp.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400" }}
                    style={mstyles.img}
                    resizeMode="cover"
                  />
                  <TouchableOpacity style={mstyles.closeBtn} onPress={closeModal} activeOpacity={0.7}>
                    <MaterialIcons name="close" size={18} color={C.white} />
                  </TouchableOpacity>
                  {mLoose && (
                    <View style={mstyles.looseBadge}>
                      <Feather name="droplet" size={9} color="#0891B2" />
                      <Text style={mstyles.looseBadgeText}>{t("vendorStore.loose")}</Text>
                    </View>
                  )}
                  {mDiscount && <View style={mstyles.discBadge}><Text style={mstyles.discText}>{mDiscount}% {t("vendorStore.off")}</Text></View>}
                  {!mInStock && <View style={mstyles.oosLayer}><Text style={mstyles.oosLayerText}>{t("vendorStore.outOfStock")}</Text></View>}
                </View>
                <View style={mstyles.body}>
                  <Text style={mstyles.name}>{mp.name}</Text>
                  <Text style={mstyles.unit}>{mp.unit}</Text>
                  {mVendor && <Text style={mstyles.vendorName}>{mVendor.shop_name}</Text>}
                  <ProductStarRating
                    productId={mp.id}
                    avgRating={undefined}
                    totalReviews={undefined}
                    compact={false}
                  />
                  {mLoose && (
                    <View style={mstyles.looseNote}>
                      <Feather name="droplet" size={12} color="#0891B2" />
                      <Text style={mstyles.looseNoteText}>
                        Sold loose. Select your quantity (e.g. 100g, 500g, 1kg).
                      </Text>
                    </View>
                  )}
                  {mp.description ? (
                    <View style={mstyles.descBox}>
                      <Text style={mstyles.descLabel}>{t("vendorStore.description")}</Text>
                      <Text style={mstyles.descText}>{mp.description}</Text>
                    </View>
                  ) : null}
                  {mDiscount && (
                    <View style={mstyles.savingsPill}>
                      <MaterialIcons name="savings" size={14} color="#D97706" />
                      <Text style={mstyles.savingsText}>{t("vendorStore.youSave", { amount: mp.mrp - mp.price })}</Text>
                    </View>
                  )}
                  <View style={mstyles.actionRow}>
                    <View>
                      <Text style={mstyles.totalLabel}>{t("cart.total") || "TOTAL"}</Text>
                      <Text style={mstyles.totalPrice}>₹{mp.price * (mQty || 1)}</Text>
                    </View>
                    {mInStock ? (
                      mQty > 0 ? (
                        <View style={mstyles.qtyRow}>
                          <TouchableOpacity style={mstyles.qtyBtn} onPress={() => {
                            const newQ = mQty - 1;
                            if (newQ <= 0) {
                              useCartStore.getState().updateQty(mp.id, 0);
                              setModalQty(0);
                            } else {
                              useCartStore.getState().updateQty(mp.id, newQ);
                              setModalQty(newQ);
                            }
                          }}>
                            <Feather name="minus" size={16} color={C.white} />
                          </TouchableOpacity>
                          <Text style={mstyles.qtyNum}>{mQty}</Text>
                          <TouchableOpacity style={mstyles.qtyBtn} onPress={handleModalAdd}>
                            <Feather name="plus" size={16} color={C.white} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={mstyles.addBtn} onPress={handleModalAdd} activeOpacity={0.8}>
                          <Feather name="shopping-cart" size={16} color={C.white} />
                          <Text style={mstyles.addBtnText}>{t("wishlist.addToCart")}</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <View style={mstyles.oosBtn}>
                        <Text style={mstyles.oosBtnText}>{t("vendorStore.outOfStock")}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.white, paddingTop: Platform.OS === "android" ? 28 : 36,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: C.gray100,
    alignItems: "center", justifyContent: "center",
  },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: C.gray900, lineHeight: 24 },
  countBadge: {
    backgroundColor: C.greenLight, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  countText: { fontSize: 12, fontWeight: "700", color: C.green },
  grid: { padding: 12 },
  row: { gap: 12 },
  sortBar: { paddingBottom: 4 },
  sortScroll: { paddingHorizontal: 12, gap: 8 },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.gray200,
  },
  sortChipActive: { backgroundColor: C.greenLight, borderColor: C.green },
  sortChipText: { fontSize: 12, fontWeight: "600", color: C.gray500 },
  sortChipTextActive: { color: C.green },
  emptyList: { flex: 1 },
  card: {
    flex: 1, backgroundColor: C.white, borderRadius: 20, overflow: "hidden",
    marginHorizontal: 4, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  imgWrap: {
    position: "relative", width: "100%", height: 160,
    backgroundColor: C.gray100,
  },
  img: { width: "100%", height: "100%" },
  discBadge: {
    position: "absolute", top: 8, left: 8, backgroundColor: C.orange,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  discText: { fontSize: 9, color: C.white, fontWeight: "800" },
  info: { padding: 12 },
  name: { fontSize: 14, fontWeight: "800", color: C.gray900, lineHeight: 19, marginBottom: 2 },
  unit: { fontSize: 11, color: C.gray500, marginBottom: 4 },
  vendor: { fontSize: 11, color: C.green, fontWeight: "600", marginBottom: 6 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  price: { fontSize: 18, fontWeight: "900", color: C.green },
  mrp: { fontSize: 11, color: C.gray400, textDecorationLine: "line-through" },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: C.orange, borderRadius: 12, paddingVertical: 10,
  },
  addBtnText: { fontSize: 12, fontWeight: "800", color: C.white },
  qtyRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.green,
    borderRadius: 12, overflow: "hidden",
  },
  qtyBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  qtyNum: { fontSize: 14, fontWeight: "900", color: C.white, minWidth: 28, textAlign: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.gray700 },
  emptySub: { fontSize: 14, color: C.gray400, textAlign: "center", lineHeight: 20 },
  browseBtn: {
    marginTop: 8, backgroundColor: C.green, paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: 14,
  },
  browseBtnText: { fontSize: 14, fontWeight: "800", color: C.white },
  popularSection: { marginTop: 24, alignSelf: "stretch" },
  popularTitle: { fontSize: 14, fontWeight: "700", color: C.gray700, marginBottom: 10, marginLeft: 4 },
  popularScroll: { gap: 10, paddingHorizontal: 4 },
  popularCard: {
    width: 120, backgroundColor: C.white, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: C.gray100,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  popularImg: { width: "100%", height: 90, backgroundColor: C.gray100 },
  popularName: { fontSize: 11, fontWeight: "600", color: C.gray700, paddingHorizontal: 8, paddingTop: 6, lineHeight: 15 },
  popularPrice: { fontSize: 12, fontWeight: "800", color: C.green, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 2 },
});

// ── Modal styles (matching VendorStoreScreen ProductModal) ──────────────
const mstyles = StyleSheet.create({
  backdropLayer:    { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.75)" },
  backdropBlur:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,15,30,0.35)" },
  backdropPress:    { ...StyleSheet.absoluteFillObject },
  backdropOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.15)" },
  centerWrap:       { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 24 },
  card: {
    width: "100%", maxWidth: 380, maxHeight: "80%", backgroundColor: C.white,
    borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32, shadowRadius: 32, elevation: 20,
  },
  imgWrap:  { width: "100%", height: 200, backgroundColor: C.gray100, position: "relative" },
  img:      { width: "100%", height: "100%" },
  closeBtn: {
    position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  looseBadge:     { position: "absolute", top: 12, right: 52, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(236,254,255,0.92)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  looseBadgeText: { fontSize: 10, fontWeight: "800", color: "#0891B2" },
  discBadge: { position: "absolute", top: 12, left: 12, backgroundColor: C.orange, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  discText:  { fontSize: 11, color: C.white, fontWeight: "800" },
  oosLayer:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.52)", alignItems: "center", justifyContent: "center" },
  oosLayerText: { fontSize: 20, fontWeight: "900", color: C.white, letterSpacing: 1 },
  body:     { padding: 20 },
  name:     { fontSize: 20, fontWeight: "900", color: C.gray900, lineHeight: 26, marginBottom: 4 },
  unit:     { fontSize: 13, color: C.gray400, fontWeight: "500", marginBottom: 4 },
  vendorName: { fontSize: 13, color: C.green, fontWeight: "600", marginBottom: 10 },
  looseNote:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFEFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  looseNoteText: { fontSize: 12, color: "#0891B2", fontWeight: "600", flex: 1 },
  descBox:   { backgroundColor: C.greenLight, borderRadius: 14, padding: 14, marginBottom: 14, borderLeftWidth: 3.5, borderLeftColor: C.greenDark },
  descLabel: { fontSize: 10, fontWeight: "800", color: C.greenDark, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  descText:  { fontSize: 13.5, color: "#3F4A3E", lineHeight: 20 },
  savingsPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FEF3C7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  savingsText: { fontSize: 12.5, color: "#92400E", fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, borderTopWidth: 1, borderTopColor: C.gray100 },
  totalLabel: { fontSize: 10, color: C.gray400, fontWeight: "600", marginBottom: 2 },
  totalPrice: { fontSize: 26, fontWeight: "900", color: C.greenDark },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.orange, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  addBtnText: { fontSize: 15, fontWeight: "800", color: C.white },
  qtyRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.green, borderRadius: 14, overflow: "hidden" },
  qtyBtn: { paddingHorizontal: 18, paddingVertical: 13 },
  qtyNum: { fontSize: 16, fontWeight: "900", color: C.white, minWidth: 34, textAlign: "center" },
  oosBtn:     { backgroundColor: C.gray200, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  oosBtnText: { fontSize: 15, fontWeight: "700", color: C.gray500 },
});
