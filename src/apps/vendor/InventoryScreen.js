/**
 * InventoryScreen — Vendor inventory management screen.
 *
 * Architecture:
 *  - Data/logic: useInventory hook (src/hooks/useInventory.js)
 *  - API calls:  inventoryService (src/services/inventory.service.js)
 *  - UI atoms:   src/components/common/
 *  - UI blocks:  src/components/inventory/
 *
 * This file is now PURE React Native — no web DOM elements.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
} from "react-native";

// ── Hooks & Services ──────────────────────────────────────────────────────────
import useInventory from "../../hooks/useInventory";

// ── Common Components ─────────────────────────────────────────────────────────
import Spinner from "../../components/common/Spinner";
import SelectChip from "../../components/common/SelectChip";
import ToastBanner from "../../components/common/ToastBanner";
import Pagination from "../../components/common/Pagination";
import { T } from "../../components/common/tokens";

// ── Inventory Components ──────────────────────────────────────────────────────
import StatCard from "../../components/inventory/StatCard";
import LowStockBanner from "../../components/inventory/LowStockBanner";
import BulkDeleteDialog from "../../components/inventory/BulkDeleteDialog";
import ProductModal from "../../components/inventory/ProductModal";
import ProductRow from "../../components/inventory/ProductRow";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
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

  // ── Selection helpers ──
  const allSel =
    inv.products.length > 0 &&
    selected.size === inv.products.length &&
    inv.products.every((p) => selected.has(p.id));
  const someSel = selected.size > 0 && !allSel;

  const toggleAll = () => {
    const pageIds = inv.products.map((p) => p.id);
    if (allSel) {
      setSelected((prev) => {
        const n = new Set(prev);
        pageIds.forEach((id) => n.delete(id));
        return n;
      });
    } else {
      setSelected((prev) => {
        const n = new Set(prev);
        pageIds.forEach((id) => n.add(id));
        return n;
      });
    }
  };

  const toggleOne = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // ── CRUD handlers ──
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
      ]
    );
  };

  const handleBulkDelete = async () => {
    const ids = [...selected];
    await inv.deleteProducts(ids);
    setSelected(new Set());
    setBulkDel(false);
    showToast(`${ids.length} product${ids.length !== 1 ? "s" : ""} deleted`);
  };

  // ── Filter tabs ──
  const filterTabs = [
    { key: "all", label: "All", count: inv.stats?.totalProducts ?? 0 },
    {
      key: "instock",
      label: "In Stock",
      count: inv.stats
        ? inv.stats.totalProducts - inv.stats.lowStockItems - inv.stats.outOfStockItems
        : 0,
    },
    { key: "lowstock", label: "Low Stock", count: inv.stats?.lowStockItems ?? 0 },
    { key: "outofstock", label: "Out of Stock", count: inv.stats?.outOfStockItems ?? 0 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Inventory</Text>
            <Text style={styles.subheading}>Manage your products & stock</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModal("add")}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+ Add Product</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Stats Row ──────────────────────────────── */}
          {inv.stats && (
            <View style={styles.statsRow}>
              <StatCard
                icon="📦"
                label="Total Products"
                value={inv.stats.totalProducts}
                accentColor={T.primary}
                iconBg={T.primaryLight}
              />
              <StatCard
                icon="✅"
                label="In Stock"
                value={inv.stats.availableStock}
                accentColor="#16A34A"
                iconBg="#ECFDF5"
              />
              <StatCard
                icon="⚠️"
                label="Low Stock"
                value={inv.stats.lowStockItems}
                badge={inv.stats.lowStockItems}
                badgeColor={T.orange}
                accentColor={T.orange}
                iconBg={T.orangeLight}
              />
              <StatCard
                icon="❌"
                label="Out of Stock"
                value={inv.stats.outOfStockItems}
                badge={inv.stats.outOfStockItems}
                badgeColor={T.red}
                accentColor={T.red}
                iconBg={T.redLight}
              />
            </View>
          )}

          {/* ── Low-stock Alert Banner ────────────────── */}
          <LowStockBanner
            stats={inv.stats}
            onFilterLowStock={() => inv.setStatus("lowstock")}
          />

          {/* ── Search Bar ────────────────────────────── */}
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={inv.search}
              onChangeText={inv.setSearch}
              placeholder="Search by name, ID or category…"
              placeholderTextColor={T.textXLight}
            />
            {inv.search.length > 0 && (
              <TouchableOpacity onPress={() => inv.setSearch("")}>
                <Text style={{ color: T.textLight, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Filter Chips ──────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          >
            {filterTabs.map((tab) => (
              <SelectChip
                key={tab.key}
                label={`${tab.label} (${tab.count})`}
                active={inv.statusFilter === tab.key}
                onClick={() => inv.setStatus(tab.key)}
              />
            ))}
          </ScrollView>

          {/* ── Bulk Action Bar ───────────────────────── */}
          {selected.size > 0 && (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkCount}>{selected.size} selected</Text>
              <TouchableOpacity
                onPress={() => setBulkDel(true)}
                style={styles.bulkDeleteBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.bulkDeleteBtnText}>🗑 Delete Selected</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Product List ──────────────────────────── */}
          <View style={styles.listContainer}>
            {/* Column header */}
            <View style={styles.listHeader}>
              <TouchableOpacity onPress={toggleAll} style={styles.headerCheckCell}>
                <Text style={styles.headerCheckText}>
                  {allSel ? "☑" : someSel ? "⊟" : "☐"}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.colHeader, { flex: 3 }]}>PRODUCT</Text>
              <Text style={[styles.colHeader, { flex: 2 }]}>STOCK / PRICE</Text>
              <Text style={[styles.colHeader, { flex: 2 }]}>STATUS</Text>
              <Text style={[styles.colHeader, { flex: 2 }]}>ACTIONS</Text>
            </View>

            {inv.loading ? (
              <View style={styles.centered}>
                <Spinner size={32} color={T.primary} />
                <Text style={styles.loadingText}>Loading products…</Text>
              </View>
            ) : inv.products.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubText}>
                  {inv.search
                    ? "Try adjusting your search or filter."
                    : "Add your first product to get started."}
                </Text>
              </View>
            ) : (
              inv.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  selected={selected.has(product.id)}
                  onSelect={toggleOne}
                  onEdit={(p) => setModal(p)}
                  onDelete={handleDelete}
                />
              ))
            )}
          </View>

          {/* ── Pagination ────────────────────────────── */}
          <Pagination
            page={inv.page}
            totalPages={inv.totalPages}
            onPage={inv.setPage}
          />

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── Add/Edit Modal ────────────────────────── */}
        {modal !== null && (
          <ProductModal
            editing={modal !== "add" ? modal : null}
            onClose={() => setModal(null)}
            onSave={handleSave}
            saving={inv.saving}
          />
        )}

        {/* ── Bulk Delete Dialog ────────────────────── */}
        {bulkDel && (
          <BulkDeleteDialog
            count={selected.size}
            onConfirm={handleBulkDelete}
            onCancel={() => setBulkDel(false)}
            saving={inv.saving}
          />
        )}

        {/* ── Toast ─────────────────────────────────── */}
        <ToastBanner message={toast.msg} visible={toast.show} type={toast.type} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  heading: {
    fontSize: 22,
    fontWeight: "900",
    color: T.text,
  },
  subheading: {
    fontSize: 12,
    color: T.textLight,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: T.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  statsRow: {
    display : "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    flexWrap: "wrap",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: T.text,
    paddingVertical: 0,
  },
  filterRow: {
    marginHorizontal: -16,
  },
  bulkBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bulkCount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  bulkDeleteBtn: {
    backgroundColor: T.red,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bulkDeleteBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  listContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  headerCheckCell: {
    width: 24,
    alignItems: "center",
  },
  headerCheckText: {
    fontSize: 16,
    color: T.textXLight,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: T.textXLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  centered: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: T.textLight,
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
  },
  emptySubText: {
    fontSize: 13,
    color: T.textLight,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
