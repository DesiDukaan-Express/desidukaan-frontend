﻿import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Platform,
  Animated,
} from "react-native";

// ── Hooks & Services ──────────────────────────────────────────────────────────
import useInventory from "../../hooks/useInventory";

// ── Common Components ─────────────────────────────────────────────────────────
import Spinner from "../../components/common/Spinner";
import ToastBanner from "../../components/common/ToastBanner";
import Pagination from "../../components/common/Pagination";
import { T } from "../../components/common/tokens";

// ── Inventory Components ──────────────────────────────────────────────────────
import BulkDeleteDialog from "../../components/inventory/BulkDeleteDialog";
import ProductModal from "../../components/inventory/ProductModal";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = "#1B6B35";
const GREEN_LIGHT = "#E8F5EC";
const ORANGE = "#F97316";
const ORANGE_LIGHT = "#FFF7ED";
const RED = "#EF4444";
const RED_LIGHT = "#FEF2F2";
const GRAY_BG = "#F4F4F5";
const BORDER = "#E4E4E7";
const TEXT = "#18181B";
const TEXT_LIGHT = "#71717A";
const TEXT_XLIGHT = "#A1A1AA";

function stockStatus(product) {
  const qty = product.inventory?.stock_qty ?? product.stock_qty ?? 0;
  const threshold =
    product.inventory?.low_stock_threshold ?? product.low_stock_threshold ?? 5;
  if (qty === 0) return "outofstock";
  if (qty <= threshold) return "lowstock";
  return "instock";
}

function stockColor(status) {
  if (status === "outofstock") return RED;
  if (status === "lowstock") return ORANGE;
  return GREEN;
}

function stockLabel(status) {
  if (status === "outofstock") return "Out of Stock";
  if (status === "lowstock") return "Low Stock";
  return "In Stock";
}

function stockQty(product) {
  return product.inventory?.stock_qty ?? product.stock_qty ?? 0;
}

function stockMax(product) {
  const threshold =
    product.inventory?.low_stock_threshold ?? product.low_stock_threshold ?? 5;
  // Use a generous max for progress bar — at least 20, or 4× threshold
  return Math.max(20, threshold * 4, stockQty(product) * 1.2);
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accentColor, badge }) {
  return (
    <View style={[s.statCard, { borderLeftColor: accentColor }]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <View style={s.statValueRow}>
        <Text style={s.statValue}>{value ?? 0}</Text>
        {!!badge && badge > 0 && (
          <View style={[s.statBadge, { backgroundColor: accentColor }]}>
            <Text style={s.statBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CARD  (replaces old ProductRow)
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({
  product,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onToggleAvailability,
}) {
  const isAvailable =
    (product.inventory?.stock_qty ?? product.stock_qty ?? 0) > 0;
  const toggleAnim = useRef(new Animated.Value(isAvailable ? 1 : 0)).current;

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isAvailable ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [isAvailable]);

  const thumbLeft = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 23],
  });
  const trackColor = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [BORDER, GREEN],
  });

  return (
    <View
      style={[
        s.card,
        selected && s.cardSelected,
        !isAvailable && s.cardUnavailable,
      ]}
    >
      <View style={s.cardRow}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={() => onSelect(product.id)}
          style={s.checkbox}
          activeOpacity={0.7}
        >
          <View style={[s.checkboxBox, selected && s.checkboxBoxChecked]}>
            {selected && <Text style={s.checkboxTick}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* Product Image */}
        <View
          style={[s.productImageWrap, !isAvailable && s.productImageWrapDim]}
        >
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={[s.productImage, !isAvailable && { opacity: 0.5 }]}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                s.productImagePlaceholder,
                !isAvailable && { opacity: 0.4 },
              ]}
            >
              🛒
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={s.productInfo}>
          <Text
            style={[s.productName, !isAvailable && s.productNameDim]}
            numberOfLines={1}
          >
            {product.name}
          </Text>
          {product.brand ? (
            <Text style={s.productBrand} numberOfLines={1}>
              {product.brand}
            </Text>
          ) : null}
          <Text
            style={[s.productPrice, !isAvailable && { color: TEXT_XLIGHT }]}
          >
            ₹{product.price} / {product.unit}
          </Text>
        </View>

        {/* Animated Toggle */}
        <View style={s.toggleSection}>
          <TouchableOpacity
            onPress={() => onToggleAvailability(product)}
            activeOpacity={0.9}
          >
            <Animated.View
              style={[s.toggleTrack, { backgroundColor: trackColor }]}
            >
              <Animated.View style={[s.toggleThumb, { left: thumbLeft }]} />
            </Animated.View>
          </TouchableOpacity>
          <Text
            style={[
              s.toggleLabel,
              { color: isAvailable ? GREEN : TEXT_XLIGHT },
            ]}
          >
            {isAvailable ? "Available" : "Unavailable"}
          </Text>
        </View>

        {/* Menu */}
<View style={{ position: "relative" }}>
  <TouchableOpacity
    onPress={() => setMenuOpen(v => !v)}
    style={s.menuBtn}
            activeOpacity={0.7}
          >
            <Text style={s.menuDots}>•••</Text>
          </TouchableOpacity>
          {menuOpen && (
            <View style={s.dropdownMenu}>
              <TouchableOpacity
                style={s.dropdownItem}
                onPress={() => {
                  setMenuOpen(false);
                  onEdit(product);
                }}
              >
                <Text style={s.dropdownItemText}>✎ Edit Product</Text>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: BORDER }} />
              <TouchableOpacity
                style={s.dropdownItem}
                onPress={() => {
                  setMenuOpen(false);
                  onDelete(product.id);
                }}
              >
                <Text style={[s.dropdownItemText, { color: RED }]}>
                  🗑 Delete
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const inv = useInventory();
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null); // null | 'add' | product object
  const [toast, setToast] = useState({ msg: "", show: false, type: "success" });
  const [bulkDel, setBulkDel] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
const [confirmSheet, setConfirmSheet] = useState(null); // { product, makingAvailable }

  // Clear selection on page change
  const productIdStr = inv.products.map((p) => p.id).join(",");
  useEffect(() => {
    setSelected(new Set());
  }, [productIdStr]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, show: true, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2500);
  };

  const toggleOne = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleSave = async (form) => {
    if (modal === "add") {
      await inv.createProduct(form);
      showToast("Product added successfully");
    } else {
      await inv.updateProduct(modal.id, form);
      showToast("Product updated");
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    Alert.alert(
      "Delete Product",
      "This will permanently remove the product. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await inv.deleteProduct(id);
            showToast("Product deleted");
          },
        },
      ],
    );
  };

  const handleToggleAvailability = (product) => {
  const currentQty = product.inventory?.stock_qty ?? product.stock_qty ?? 0;
  const isCurrentlyAvailable = currentQty > 0;
  setConfirmSheet({ product, makingAvailable: !isCurrentlyAvailable });
};

const confirmToggle = async () => {
  if (!confirmSheet) return;
  const { product, makingAvailable } = confirmSheet;
  setConfirmSheet(null);
  try {
    await inv.toggleAvailability(product.id, makingAvailable);
    showToast(
      makingAvailable
        ? `"${product.name}" is now available`
        : `"${product.name}" marked unavailable`,
      makingAvailable ? "success" : "error"
    );
  } catch (e) {
    showToast("Failed to update availability", "error");
  }
};

  const handleBulkDelete = async () => {
    const ids = [...selected];
    await inv.deleteProducts(ids);
    setSelected(new Set());
    setBulkDel(false);
    showToast(`${ids.length} product${ids.length !== 1 ? "s" : ""} deleted`);
  };

  // Build category tabs from loaded products
  const allProducts = inv.allProducts ?? inv.products;
  const categoryTabs = useMemo(() => {
    const cats = {};
    allProducts.forEach((p) => {
      const cat = p.category?.name ?? "Uncategorized";
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return [
      { key: "all", label: "All", count: allProducts.length },
      ...Object.entries(cats).map(([name, count]) => ({
        key: name,
        label: name,
        count,
      })),
    ];
  }, [allProducts]);

  const totalItems = inv.stats?.totalProducts ?? inv.products.length;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.heading}>Inventory</Text>
          <Text style={s.subheading}>
            Toggle availability · manage products
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModal("add")}
          style={s.addBtn}
          activeOpacity={0.85}
        >
          <Text style={s.addBtnText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats ── */}
        {inv.stats && (
          <View style={s.statsGrid}>
            <StatCard
              icon="📦"
              label="Total Products"
              value={inv.stats.totalProducts}
              accentColor={GREEN}
            />
            <StatCard
              icon="✅"
              label="Available"
              value={
                (inv.allProducts ?? []).filter(
                  (p) => (p.inventory?.stock_qty ?? p.stock_qty ?? 0) > 0,
                ).length
              }
              accentColor={GREEN}
            />
            <StatCard
              icon="🚫"
              label="Unavailable"
              value={
                (inv.allProducts ?? []).filter(
                  (p) => (p.inventory?.stock_qty ?? p.stock_qty ?? 0) === 0,
                ).length
              }
              accentColor={RED}
            />
          </View>
        )}

        {/* ── Alert Banner ──
        {inv.stats &&
          (inv.stats.lowStockItems > 0 || inv.stats.outOfStockItems > 0) && (
            <TouchableOpacity
              style={s.alertBanner}
              activeOpacity={0.85}
              onPress={() => inv.setStatus("lowstock")}
            >
              <View style={s.alertIcon}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
              </View>
              <View style={s.alertText}>
                <Text style={s.alertTitle}>Inventory alert</Text>
                <Text style={s.alertSub}>
                  {inv.stats.lowStockItems} items low ·{" "}
                  {inv.stats.outOfStockItems} out of stock
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => inv.setStatus("lowstock")}
                style={s.alertViewBtn}
                activeOpacity={0.8}
              >
                <Text style={s.alertViewBtnText}>View</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )} */}

        {/* ── Search ── */}
        <View style={s.searchWrap}>
          <Text style={s.searchIconText}>🔍</Text>
          <TextInput
            style={s.searchInput}
            value={inv.search}
            onChangeText={inv.setSearch}
            placeholder="Search products…"
            placeholderTextColor={TEXT_XLIGHT}
            returnKeyType="search"
          />
          {inv.search.length > 0 && (
            <TouchableOpacity
              onPress={() => inv.setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ color: TEXT_LIGHT, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {categoryTabs.map((tab) => {
            const active = categoryFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setCategoryFilter(tab.key)}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.75}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Bulk Action Bar ── */}
        {selected.size > 0 && (
          <View style={s.bulkBar}>
            <Text style={s.bulkCount}>{selected.size} selected</Text>
            <TouchableOpacity
              onPress={() => setBulkDel(true)}
              style={s.bulkDeleteBtn}
              activeOpacity={0.8}
            >
              <Text style={s.bulkDeleteBtnText}>🗑 Delete Selected</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Products List ── */}
        <View style={s.listHeader}>
          <Text style={s.listTitle}>Products</Text>
          <Text style={s.listCount}>Showing {totalItems} items</Text>
        </View>

        {inv.loading ? (
          <View style={s.centered}>
            <Spinner size={32} color={GREEN} />
            <Text style={s.loadingText}>Loading products…</Text>
          </View>
        ) : inv.products.length === 0 ? (
          <View style={s.centered}>
            <Text style={{ fontSize: 44 }}>📭</Text>
            <Text style={s.emptyText}>No products found</Text>
            <Text style={s.emptySubText}>
              {inv.search
                ? "Try adjusting your search or filter."
                : "Add your first product to get started."}
            </Text>
            {inv.search.length > 0 && (
              <TouchableOpacity
                onPress={() => setModal("add")}
                style={s.addFromSearchBtn}
                activeOpacity={0.85}
              >
                <Text style={s.addFromSearchBtnText}>
                  + Add "{inv.search}" as new product
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          (() => {
            // Group products by category
            const grouped = {};
            inv.products.forEach((p) => {
              const cat = p.category?.name ?? "Uncategorized";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(p);
            });
            return Object.entries(grouped).map(([catName, catProducts]) => (
              <View key={catName}>
                <View style={s.categoryHeader}>
                  <Text style={s.categoryHeaderText}>📂 {catName}</Text>
                  <Text style={s.categoryHeaderCount}>
                    {catProducts.length}
                  </Text>
                </View>
                <View style={s.categoryDivider} />
                {catProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selected.has(product.id)}
                    onSelect={toggleOne}
                    onEdit={(p) => setModal(p)}
                    onDelete={handleDelete}
                    onToggleAvailability={handleToggleAvailability}
                  />
                ))}
              </View>
            ));
          })()
        )}

        {/* ── Pagination ── */}
        <Pagination
          page={inv.page}
          totalPages={inv.totalPages}
          onPage={inv.setPage}
        />

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Modals ── */}
      {modal !== null && (
        <ProductModal
          editing={modal !== "add" ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={inv.saving}
        />
      )}

      {bulkDel && (
        <BulkDeleteDialog
          count={selected.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDel(false)}
          saving={inv.saving}
        />
      )}

      {/* ── Confirm Sheet ── */}
{confirmSheet && (
  <View style={s.sheetOverlay}>
    <TouchableOpacity
      style={{ flex: 1 }}
      activeOpacity={1}
      onPress={() => setConfirmSheet(null)}
    />
    <View style={s.sheetCard}>
      {/* Icon */}
      <View style={[s.sheetIconBox, {
        backgroundColor: confirmSheet.makingAvailable ? GREEN_LIGHT : RED_LIGHT
      }]}>
        <Text style={{ fontSize: 28 }}>
          {confirmSheet.makingAvailable ? "✅" : "🚫"}
        </Text>
      </View>

      {/* Text */}
      <Text style={s.sheetTitle}>
        {confirmSheet.makingAvailable ? "Mark as Available?" : "Mark as Unavailable?"}
      </Text>
      <Text style={s.sheetSub}>
        {confirmSheet.makingAvailable
          ? `"${confirmSheet.product.name}" will be visible to customers and available for ordering.`
          : `"${confirmSheet.product.name}" will be hidden from customers until you mark it available again.`}
      </Text>

      {/* Buttons */}
      <View style={s.sheetBtnRow}>
        <TouchableOpacity
          onPress={() => setConfirmSheet(null)}
          style={s.sheetCancelBtn}
          activeOpacity={0.8}
        >
          <Text style={s.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={confirmToggle}
          style={[s.sheetConfirmBtn, {
            backgroundColor: confirmSheet.makingAvailable ? GREEN : RED
          }]}
          activeOpacity={0.85}
        >
          <Text style={s.sheetConfirmText}>
            {confirmSheet.makingAvailable ? "Yes, Make Available" : "Yes, Mark Unavailable"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}

<ToastBanner message={toast.msg} visible={toast.show} type={toast.type} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: GRAY_BG,
  },

  addFromSearchBtn: {
    marginTop: 12,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  addFromSearchBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingHorizontal: 16,
    paddingBottom: 12,

    backgroundColor: "#147538",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  heading: {
    fontSize: 24,
    fontWeight: "900",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#FFFFFF",
  },
  subheading: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,

    paddingHorizontal: 16,
    paddingVertical: 10,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addBtnText: {
    color: "#147538",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: {
    padding: 14,
    gap: 12,
  },

  // ── Stats ──
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  statIcon: { fontSize: 20 },
  statLabel: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
    marginTop: 2,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: TEXT,
    letterSpacing: -0.5,
  },
  statBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  statBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },

  // ── Alert Banner ──
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C2331",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(249,115,22,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  alertText: { flex: 1 },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#fff",
  },
  alertSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  alertViewBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  alertViewBtnText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1C2331",
  },

  // ── Search ──
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIconText: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    paddingVertical: 0,
  },

  // ── Filter Chips ──
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: TEXT_LIGHT,
  },
  chipTextActive: {
    color: "#fff",
  },

  // ── Bulk Bar ──
  bulkBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bulkCount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#1D4ED8",
  },
  bulkDeleteBtn: {
    backgroundColor: RED,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bulkDeleteBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },

  // ── List Header ──
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: TEXT,
  },
  listCount: { fontSize: 12, color: TEXT_LIGHT },

  // ── Product Card ──
  card: {
  backgroundColor: "#fff",
  borderRadius: 14,
  borderWidth: 1.5,
  borderColor: BORDER,
  paddingHorizontal: 14,
  paddingTop: 14,
  paddingBottom: 12,
  gap: 10,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
  overflow: "visible",
  zIndex: 1,
},
  cardSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN_LIGHT,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  // Checkbox
  checkbox: { padding: 2 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxBoxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    lineHeight: 15,
  },

  // Image
  productImageWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: GRAY_BG,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: { width: 52, height: 52 },
  productImagePlaceholder: { fontSize: 24 },

  // Info
  productInfo: { flex: 1, gap: 2 },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: TEXT,
    letterSpacing: -0.2,
  },
  productCategory: { fontSize: 12, color: TEXT_LIGHT },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: TEXT,
  },
  // statusPill: {
  //   borderRadius: 6,
  //   paddingHorizontal: 7,
  //   paddingVertical: 2,
  // },
  // statusPillText: { fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},

  // Actions
  // cardActions: { alignItems: "flex-end", gap: 6 },
  // editBtn: {
  //   backgroundColor: GREEN,
  //   borderRadius: 8,
  //   paddingHorizontal: 12,
  //   paddingVertical: 6,
  // },
  // editBtnText: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold"},
  menuBtn: {
    width: 30,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  menuDots: { fontSize: 11, color: TEXT_LIGHT, letterSpacing: 1 },

  // Progress
  // progressSection: { gap: 4 },
  // progressBar: {
  //   height: 5,
  //   backgroundColor: GRAY_BG,
  //   borderRadius: 3,
  //   overflow: "hidden",
  // },
  // progressFill: {
  //   height: 5,
  //   borderRadius: 3,
  // },
  // stockQtyText: { fontSize: 11, color: TEXT_LIGHT },

  // Dropdown
  dropdownMenu: {
  position: "absolute",
  right: 0,
  top: 30,
  backgroundColor: "#fff",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: BORDER,
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 8,
  zIndex: 999,
  minWidth: 140,
},
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: TEXT },
  // dropdownDivider: { height: 1, backgroundColor: BORDER },

  // ── Availability Toggle ──
  toggleSection: {
    alignItems: "center",
    gap: 4,
    marginRight: 4,
  },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    position: "relative",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    position: "absolute",
    top: 3,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  productBrand: {
    fontSize: 11,
    color: TEXT_XLIGHT,
    marginBottom: 1,
  },
  // ── Category Group Header ──
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  categoryHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: GREEN,
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  categoryHeaderCount: {
    fontSize: 11,
    color: GREEN,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontWeight: "700",
    overflow: "hidden",
  },
  categoryDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 8,
  },

  cardUnavailable: {
    opacity: 0.75,
    borderColor: "#F0F0F0",
  },
  productImageWrapDim: {
    backgroundColor: "#EFEFEF",
  },
  productNameDim: {
    color: TEXT_LIGHT,
  },

  // Loading / Empty
  centered: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  loadingText: { fontSize: 14, color: TEXT_LIGHT, marginTop: 8 },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: TEXT,
  },
  emptySubText: {
    fontSize: 13,
    color: TEXT_LIGHT,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  // ── Confirm Sheet ──
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  sheetCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  sheetIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    textAlign: "center",
  },
  sheetSub: {
    fontSize: 13,
    color: TEXT_LIGHT,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  sheetBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  sheetCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_LIGHT,
  },
  sheetConfirmBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetConfirmText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
});
