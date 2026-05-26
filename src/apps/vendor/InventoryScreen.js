import React, { useState, useEffect } from "react";
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

function ProductCard({ product, selected, onSelect, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = stockStatus(product);
  const qty = stockQty(product);
  const max = stockMax(product);
  const color = stockColor(status);
  const progress = Math.min(1, qty / max);

  return (
    <View style={[s.card, selected && s.cardSelected]}>
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
        <View style={s.productImageWrap}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={s.productImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={s.productImagePlaceholder}>🛒</Text>
          )}
        </View>

        {/* Info */}
        <View style={s.productInfo}>
          <Text style={s.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={s.productCategory} numberOfLines={1}>
            {product.category?.name ?? "Uncategorized"}
          </Text>
          <View style={s.productMeta}>
            <Text style={s.productPrice}>
              ₹{product.price} / {product.unit}
            </Text>
            <View style={[s.statusPill, { backgroundColor: color + "18" }]}>
              <Text style={[s.statusPillText, { color }]}>
                {stockLabel(status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit + Menu */}
        <View style={s.cardActions}>
          <TouchableOpacity
            onPress={() => onEdit(product)}
            style={s.editBtn}
            activeOpacity={0.8}
          >
            <Text style={s.editBtnText}>✎ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenuOpen((v) => !v)}
            style={s.menuBtn}
            activeOpacity={0.7}
          >
            <Text style={s.menuDots}>•••</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar + Stock Label */}
      <View style={s.progressSection}>
        <View style={s.progressBar}>
          <View
            style={[
              s.progressFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={[s.stockQtyText, { color: TEXT_LIGHT }]}>
          {qty} units remaining
        </Text>
      </View>

      {/* Dropdown menu */}
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
          <View style={s.dropdownDivider} />
          <TouchableOpacity
            style={s.dropdownItem}
            onPress={() => {
              setMenuOpen(false);
              onDelete(product.id);
            }}
          >
            <Text style={[s.dropdownItemText, { color: RED }]}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      )}
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

  const handleBulkDelete = async () => {
    const ids = [...selected];
    await inv.deleteProducts(ids);
    setSelected(new Set());
    setBulkDel(false);
    showToast(`${ids.length} product${ids.length !== 1 ? "s" : ""} deleted`);
  };

  const filterTabs = [
    { key: "all", label: "All", count: inv.stats?.totalProducts ?? 0 },
    {
      key: "instock",
      label: "In Stock",
      count: inv.stats
        ? inv.stats.totalProducts -
          inv.stats.lowStockItems -
          inv.stats.outOfStockItems
        : 0,
    },
    {
      key: "lowstock",
      label: "Low Stock",
      count: inv.stats?.lowStockItems ?? 0,
    },
    {
      key: "outofstock",
      label: "Out of Stock",
      count: inv.stats?.outOfStockItems ?? 0,
    },
  ];

  const totalItems = inv.stats?.totalProducts ?? inv.products.length;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.heading}>Inventory</Text>
          <Text style={s.subheading}>Manage your products & stock</Text>
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
              label="In Stock"
              value={
                inv.stats.totalProducts -
                inv.stats.lowStockItems -
                inv.stats.outOfStockItems
              }
              accentColor={GREEN}
            />
            <StatCard
              icon="⚠️"
              label="Low Stock"
              value={inv.stats.lowStockItems}
              badge={inv.stats.lowStockItems}
              accentColor={ORANGE}
            />
            <StatCard
              icon="❌"
              label="Out of Stock"
              value={inv.stats.outOfStockItems}
              badge={inv.stats.outOfStockItems}
              accentColor={RED}
            />
          </View>
        )}

        {/* ── Alert Banner ── */}
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
          )}

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
          {filterTabs.map((tab) => {
            const active = inv.statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => inv.setStatus(tab.key)}
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
          </View>
        ) : (
          inv.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selected.has(product.id)}
              onSelect={toggleOne}
              onEdit={(p) => setModal(p)}
              onDelete={handleDelete}
            />
          ))
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

  // ── Header ──
  header: {
    paddingTop: Platform.OS === "ios" ? 52 : 40,
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
  statBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

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
  alertTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  alertSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  alertViewBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  alertViewBtnText: { fontSize: 13, fontWeight: "700", color: "#1C2331" },

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
  bulkCount: { fontSize: 14, fontWeight: "700", color: "#1D4ED8" },
  bulkDeleteBtn: {
    backgroundColor: RED,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bulkDeleteBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // ── List Header ──
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  listTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
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
  productPrice: { fontSize: 13, fontWeight: "700", color: TEXT },
  statusPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  // Actions
  cardActions: { alignItems: "flex-end", gap: 6 },
  editBtn: {
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
  progressSection: { gap: 4 },
  progressBar: {
    height: 5,
    backgroundColor: GRAY_BG,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  stockQtyText: { fontSize: 11, color: TEXT_LIGHT },

  // Dropdown
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownItemText: { fontSize: 14, fontWeight: "600", color: TEXT },
  dropdownDivider: { height: 1, backgroundColor: BORDER },

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
  emptyText: { fontSize: 16, fontWeight: "700", color: TEXT },
  emptySubText: {
    fontSize: 13,
    color: TEXT_LIGHT,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
