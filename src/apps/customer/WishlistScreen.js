import React, { useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar, FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import useWishlistStore from "../../store/wishlistStore";
import useCartStore from "../../store/cartStore";
import { useTheme } from "../../theme/ThemeContext";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300";

const LIGHT_COLORS = {
  green: "#16A34A",
  greenDark: "#15803D",
  orange: "#F97316",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray900: "#111827",
  red: "#EF4444",
  redLight: "#FEF2F2",
};
const DARK_COLORS = {
  green: "#22C55E",
  greenDark: "#16A34A",
  orange: "#FB923C",
  white: "#FFFFFF",
  bg: "#0B0F0D",
  surface: "#151B18",
  gray100: "#1E2622",
  gray200: "#26302B",
  gray400: "#8B978F",
  gray500: "#A9B5AD",
  gray900: "#F2F5F3",
  red: "#F87171",
  redLight: "#3A1B1B",
};

export default function WishlistScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const C = isDark ? DARK_COLORS : LIGHT_COLORS;

  const token = useAuthStore((st) => st.token);
  const { items, loading, loadWishlist, remove } = useWishlistStore();
  const cart = useCartStore();

  useEffect(() => {
    loadWishlist(token);
  }, [token]);

  const s = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: C.surface, paddingHorizontal: 16,
      paddingTop: Platform.OS === "android" ? 28 : 36, paddingBottom: 14,
      borderBottomWidth: 1, borderBottomColor: C.gray100,
    },
    backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.gray100, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 20, fontWeight: "900", color: C.gray900 },
    headerSub: { fontSize: 12, color: C.gray400, marginTop: 1 },

    listContent: { padding: 16, gap: 12 },
    card: {
      flexDirection: "row", backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.gray200, overflow: "hidden",
    },
    img: { width: 96, height: 96, backgroundColor: C.gray100 },
    body: { flex: 1, padding: 12, justifyContent: "space-between" },
    name: { fontSize: 14, fontWeight: "800", color: C.gray900 },
    vendor: { fontSize: 12, color: C.gray400, marginTop: 2 },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 },
    price: { fontSize: 16, fontWeight: "900", color: C.green },
    mrp: { fontSize: 11, color: C.gray400, textDecorationLine: "line-through" },
    unavailable: { fontSize: 11, fontWeight: "700", color: C.red, marginTop: 6 },

    actionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
    addBtn: {
      flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.greenDark,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    addBtnText: { fontSize: 12, fontWeight: "800", color: C.white },
    removeBtn: {
      width: 34, height: 34, borderRadius: 10, backgroundColor: C.redLight,
      alignItems: "center", justifyContent: "center",
    },

    emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 30 },
    emptyEmoji: { fontSize: 54, marginBottom: 4 },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: C.gray900, textAlign: "center" },
    emptySub: { fontSize: 14, color: C.gray400, textAlign: "center" },
    shopBtn: { marginTop: 14, borderRadius: 14, overflow: "hidden" },
    shopBtnGrad: { paddingHorizontal: 28, paddingVertical: 14 },
    shopBtnText: { fontSize: 15, fontWeight: "800", color: C.white },

    loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  }), [C]);

  const handleAddToCart = (row) => {
    const p = row.product || {};
    cart?.addItem?.(
      { id: p.id, name: p.name, price: p.price, image: p.image_url, unit: p.unit, vendorId: p.vendor?.id, vendorName: p.vendor?.shop_name },
      p.vendor?.id
    );
  };

  const handleOpenVendor = (row) => {
    const v = row.product?.vendor;
    if (!v) return;
    navigation.navigate("VendorStore", { vendorId: v.id, vendorName: v.shop_name });
  };

  const renderItem = ({ item: row }) => {
    const p = row.product || {};
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.9} onPress={() => handleOpenVendor(row)}>
        <Image source={{ uri: p.image_url || FALLBACK_IMG }} style={s.img} resizeMode="cover" />
        <View style={s.body}>
          <View>
            <Text style={s.name} numberOfLines={2}>{p.name}</Text>
            {!!p.vendor?.shop_name && <Text style={s.vendor} numberOfLines={1}>{p.vendor.shop_name}</Text>}
            {p.is_active === false ? (
              <Text style={s.unavailable}>{t("wishlist.unavailable", "Currently unavailable")}</Text>
            ) : (
              <View style={s.priceRow}>
                <Text style={s.price}>₹{p.price}</Text>
                {!!(p.mrp && p.mrp > p.price) && <Text style={s.mrp}>₹{p.mrp}</Text>}
                {!!p.unit && <Text style={s.vendor}>/ {p.unit}</Text>}
              </View>
            )}
          </View>
          <View style={s.actionsRow}>
            {p.is_active !== false && (
              <TouchableOpacity style={s.addBtn} activeOpacity={0.85} onPress={(e) => { e.stopPropagation?.(); handleAddToCart(row); }}>
                <Feather name="shopping-cart" size={13} color={C.white} />
                <Text style={s.addBtnText}>{t("wishlist.addToCart", "Add to cart")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.removeBtn} activeOpacity={0.85} onPress={(e) => { e.stopPropagation?.(); remove(row.product_id, token); }}>
              <Feather name="trash-2" size={15} color={C.red} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.surface} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={C.gray900} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>{t("wishlist.title", "Wishlist")}</Text>
          {items.length > 0 && (
            <Text style={s.headerSub}>{t("wishlist.itemCount", "{{count}} items", { count: items.length })}</Text>
          )}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.green} />
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>💚</Text>
          <Text style={s.emptyTitle}>{t("wishlist.empty", "Your wishlist is empty")}</Text>
          <Text style={s.emptySub}>{t("wishlist.emptySubtitle", "Tap the heart on any product to save it here for later.")}</Text>
          <TouchableOpacity style={s.shopBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <LinearGradient colors={[C.orange, C.green]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.shopBtnGrad}>
              <Text style={s.shopBtnText}>{t("wishlist.browseStores", "Browse Stores")}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(row) => String(row.id ?? row.product_id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}