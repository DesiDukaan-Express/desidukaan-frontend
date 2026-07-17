import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { useTranslation } from "react-i18next";

import { Feather, MaterialIcons } from "@expo/vector-icons";

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

const getCategoryIcon = (catName) => {
  const name = String(catName || "").toLowerCase();
  if (name.includes("fruit") || name.includes("vegetable") || name.includes("organic")) return "eco";
  if (name.includes("milk") || name.includes("dairy") || name.includes("egg") || name.includes("cheese")) return "local-cafe";
  if (name.includes("bakery") || name.includes("bread") || name.includes("cake")) return "bakery-dining";
  if (name.includes("beverage") || name.includes("drink") || name.includes("juice") || name.includes("soda")) return "local-drink";
  if (name.includes("snack") || name.includes("munch") || name.includes("chip") || name.includes("biscuit")) return "fastfood";
  if (name.includes("meat") || name.includes("chicken") || name.includes("fish") || name.includes("mutton")) return "restaurant";
  if (name.includes("grocery") || name.includes("staple") || name.includes("rice") || name.includes("dal") || name.includes("flour") || name.includes("oil")) return "grain";
  if (name.includes("personal") || name.includes("beauty") || name.includes("soap") || name.includes("shampoo")) return "face";
  if (name.includes("household") || name.includes("clean") || name.includes("detergent")) return "cleaning-services";
  if (name.includes("baby")) return "child-care";
  return "folder";
};

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
  onEdit,
  onDelete,
  onToggleAvailability,
  onPressMenu,
}) {
  const { t } = useTranslation();
  const isAvailable = (product.inventory?.stock_qty ?? product.stock_qty ?? 0) > 0;

  return (
    <View style={[s.card, !isAvailable && s.cardUnavailable]}>
      {/* 3-dots Actions Button */}
      <TouchableOpacity
        onPress={() => onPressMenu(product)}
        style={s.cardMenuBtn}
        activeOpacity={0.7}
      >
        <Text style={s.cardMenuDots}>•••</Text>
      </TouchableOpacity>

      <View style={s.cardContent}>
        {/* Product Image */}
        <View style={[s.cardImageWrap, !isAvailable && s.productImageWrapDim]}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={[s.cardImage, !isAvailable && { opacity: 0.5 }]}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="shopping-cart" size={32} color="#9CA3AF" style={!isAvailable && { opacity: 0.4 }} />
          )}
        </View>

        {/* Product Name */}
        <Text style={[s.cardName, !isAvailable && s.productNameDim]} numberOfLines={2}>
          {product.name}
        </Text>
        {product.brand ? (
          <Text style={s.cardBrand} numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}

        {/* Price & Unit */}
        <Text style={[s.cardPrice, !isAvailable && { color: TEXT_XLIGHT }]}>
          ₹{product.price} / {product.unit}
        </Text>
        <Text style={[s.cardStock, !isAvailable && { color: TEXT_XLIGHT }]}>
          Stock: {stockQty(product)} {product.unit}
        </Text>

        {/* Toggle Availability Switch */}
        <View style={s.cardToggleRow}>
          <TouchableOpacity
            onPress={() => onToggleAvailability(product)}
            activeOpacity={0.8}
            style={[s.toggleBtn, isAvailable ? s.toggleBtnActive : s.toggleBtnInactive]}
          >
            <Text style={[s.toggleBtnText, isAvailable ? s.toggleBtnTextActive : s.toggleBtnTextInactive]}>
              {isAvailable ? t('vendor.available') : t('vendor.unavailable')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { t } = useTranslation();
  const inv = useInventory();
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null); // null | 'add' | product object
  const [toast, setToast] = useState({ msg: "", show: false, type: "success" });
  const [bulkDel, setBulkDel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
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
      t('vendor.deleteProduct'),
      t('vendor.deleteProductDesc'),
      [
        { text: t('vendor.cancel'), style: "cancel" },
        {
          text: t('vendor.delete'),
          style: "destructive",
          onPress: async () => {
            await inv.deleteProduct(id);
            showToast("Product deleted");
          },
        },
      ],
    );
  };

  const handleDeleteCategory = (catName) => {
    Alert.alert(
      t('vendor.deleteCategory'),
      t('vendor.deleteCategoryDesc', { category: catName }).replace('{{category}}', catName),
      [
        { text: t('vendor.cancel'), style: "cancel" },
        {
          text: t('vendor.deleteEntireCategory'),
          style: "destructive",
          onPress: async () => {
            const matchingProd = (inv.rawProducts || []).find((p) => {
              const pCat = typeof p.category === "object" ? p.category?.name : p.category;
              return String(pCat).toLowerCase() === String(catName).toLowerCase();
            });

            try {
              if (matchingProd && matchingProd.category_id) {
                await inv.deleteCategoryProducts(matchingProd.category_id);
              }
              showToast(`Category "${catName}" and its products deleted`);
            } catch (err) {
              showToast("Failed to delete category products", "error");
            }
          }
        }
      ]
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

  const parentCategoriesList = useMemo(() => {
    return (inv.globalCategories || []).map((cat) => {
      const count = (inv.rawProducts || []).filter((p) => {
        const pCat = typeof p.category === "object" ? p.category?.name : p.category;
        return String(pCat).toLowerCase() === String(cat.name).toLowerCase();
      }).length;
      return {
        name: cat.name,
        count,
      };
    });
  }, [inv.globalCategories, inv.rawProducts]);

  const searchedProducts = useMemo(() => {
    if (!inv.search || inv.search.trim() === "") return [];
    let data = inv.rawProducts || [];
    data = data.filter(p => String(p.name).toLowerCase().includes(inv.search.toLowerCase()));

    // Sort
    if (inv.sortKey) {
      data = [...data].sort((a, b) => {
        let av = a[inv.sortKey];
        let bv = b[inv.sortKey];
        if (inv.sortKey === "stock") {
          av = a.rawStock ?? 0;
          bv = b.rawStock ?? 0;
        }
        if (typeof av === "number" && typeof bv === "number") {
          return inv.sortDir === "asc" ? av - bv : bv - av;
        }
        return inv.sortDir === "asc"
          ? String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true })
          : String(bv ?? "").localeCompare(String(av ?? ""), undefined, { numeric: true });
      });
    }
    return data;
  }, [inv.rawProducts, inv.search, inv.sortKey, inv.sortDir]);

  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    let data = (inv.rawProducts || []).filter(p => {
      const pCat = typeof p.category === "object" ? p.category?.name : p.category;
      return String(pCat).toLowerCase() === selectedCategory.toLowerCase();
    });

    // Filter by search
    if (inv.search && inv.search.trim() !== "") {
      data = data.filter(p => String(p.name).toLowerCase().includes(inv.search.toLowerCase()));
    }

    // Sort
    if (inv.sortKey) {
      data = [...data].sort((a, b) => {
        let av = a[inv.sortKey];
        let bv = b[inv.sortKey];
        if (inv.sortKey === "stock") {
          av = a.rawStock ?? 0;
          bv = b.rawStock ?? 0;
        }
        if (typeof av === "number" && typeof bv === "number") {
          return inv.sortDir === "asc" ? av - bv : bv - av;
        }
        return inv.sortDir === "asc"
          ? String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true })
          : String(bv ?? "").localeCompare(String(av ?? ""), undefined, { numeric: true });
      });
    }
    return data;
  }, [inv.rawProducts, selectedCategory, inv.search, inv.sortKey, inv.sortDir]);

  const handleProductPress = (product) => {
    Alert.alert(
      product.name,
      t('vendor.chooseAction'),
      [
        { text: t('vendor.cancel'), style: "cancel" },
        { text: t('vendor.editProduct'), onPress: () => setModal(product) },
        { text: t('vendor.deleteProduct'), style: "destructive", onPress: () => handleDelete(product.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* ── Header ── */}
      <View style={s.header}>
        {selectedCategory !== null ? (
          <>
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory(null);
                inv.setSearch("");
              }}
              style={s.backBtn}
              activeOpacity={0.8}
            >
              <Text style={s.backBtnText}>← {t('vendor.back')}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.heading} numberOfLines={1}>{selectedCategory}</Text>
              <Text style={s.subheading}>{t('vendor.productsInCategory')}</Text>
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>{t('vendor.inventoryTitle')}</Text>
            <Text style={s.subheading}>{t('vendor.manageCategoriesProducts')}</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => setModal("add")}
          style={s.addBtn}
          activeOpacity={0.85}
        >
          <Text style={s.addBtnText}>+ {t('vendor.addProduct')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Search ── */}
        <View style={s.searchWrap}>
          <Feather name="search" size={16} color={TEXT_LIGHT} style={{ marginRight: 6 }} />
          <TextInput
            style={s.searchInput}
            value={inv.search}
            onChangeText={inv.setSearch}
            placeholder={
              selectedCategory !== null
                ? `${t('vendor.searchInCategoryPlaceholder')} ${selectedCategory}…`
                : t('vendor.searchPlaceholderInventory')
            }
            placeholderTextColor={TEXT_XLIGHT}
            returnKeyType="search"
          />
          {inv.search.length > 0 && (
            <TouchableOpacity
              onPress={() => inv.setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color={TEXT_LIGHT} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Products Search (If selectedCategory === null but search is NOT empty) ── */}
        {selectedCategory === null && inv.search.length > 0 && (
          <>
            {/* Sort Options Bar */}
            <Text style={s.filterSectionTitle}>⇅ {t('vendor.sortProducts')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterRow}
            >
              {[
                { label: t('vendor.priceLowHigh'), key: "price", dir: "asc" },
                { label: t('vendor.priceHighLow'), key: "price", dir: "desc" },
                { label: t('vendor.stockLowHigh'), key: "stock", dir: "asc" },
                { label: t('vendor.stockHighLow'), key: "stock", dir: "desc" },
              ].map((opt) => {
                const active = inv.sortKey === opt.key && inv.sortDir === opt.dir;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => {
                      inv.setSortKey(opt.key);
                      inv.setSortDir(opt.dir);
                    }}
                    style={[s.chip, active && s.chipActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={s.listHeader}>
              <Text style={s.listTitle}>{t('vendor.matchingProducts')}</Text>
              <Text style={s.listCount}>{t('vendor.showingItems')} {searchedProducts.length} {t('vendor.items')}</Text>
            </View>

            {inv.loading ? (
              <View style={s.centered}>
                <Spinner size={32} color={GREEN} />
                <Text style={s.loadingText}>{t('vendor.loadingProducts')}</Text>
              </View>
            ) : searchedProducts.length === 0 ? (
              <View style={s.centered}>
                <MaterialIcons name="search-off" size={48} color="#9CA3AF" style={{ marginBottom: 10 }} />
                <Text style={s.emptyText}>{t('vendor.noMatchingProducts')}</Text>
              </View>
            ) : (
              <View style={s.gridContainer}>
                {searchedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={(p) => setModal(p)}
                    onDelete={handleDelete}
                    onToggleAvailability={handleToggleAvailability}
                    onPressMenu={handleProductPress}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Category Folders Grid (If selectedCategory === null and search is empty) ── */}
        {selectedCategory === null && inv.search.length === 0 && (
          <>
            <View style={s.listHeader}>
              <Text style={s.listTitle}>{t('vendor.categories')}</Text>
              <Text style={s.listCount}>{parentCategoriesList.length} {t('vendor.foldersCount')}</Text>
            </View>

            {parentCategoriesList.length === 0 ? (
              <View style={s.centered}>
                <MaterialIcons name="folder-open" size={48} color="#9CA3AF" style={{ marginBottom: 10 }} />
                <Text style={s.emptyText}>{t('vendor.noCategoriesFound')}</Text>
              </View>
            ) : (
              <View style={s.gridContainer}>
                {parentCategoriesList.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    onPress={() => setSelectedCategory(cat.name)}
                    onLongPress={() => handleDeleteCategory(cat.name)}
                    style={s.folderCard}
                    activeOpacity={0.8}
                  >
                    <View style={s.folderIconWrap}>
                      <MaterialIcons name={getCategoryIcon(cat.name)} size={28} color={GREEN} />
                    </View>
                    <Text style={s.folderName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={s.folderCount}>
                      {cat.count} product{cat.count !== 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Products Inside Selected Category (selectedCategory !== null) ── */}
        {selectedCategory !== null && (
          <>
            {/* Sort Options Bar */}
            <Text style={s.filterSectionTitle}>⇅ {t('vendor.sortProducts')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filterRow}
            >
              {[
                { label: t('vendor.priceLowHigh'), key: "price", dir: "asc" },
                { label: t('vendor.priceHighLow'), key: "price", dir: "desc" },
                { label: t('vendor.stockLowHigh'), key: "stock", dir: "asc" },
                { label: t('vendor.stockHighLow'), key: "stock", dir: "desc" },
              ].map((opt) => {
                const active = inv.sortKey === opt.key && inv.sortDir === opt.dir;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => {
                      inv.setSortKey(opt.key);
                      inv.setSortDir(opt.dir);
                    }}
                    style={[s.chip, active && s.chipActive]}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={s.listHeader}>
              <Text style={s.listTitle}>{t('vendor.products')}</Text>
              <Text style={s.listCount}>{t('vendor.showingItems')} {categoryProducts.length} {t('vendor.items')}</Text>
            </View>

            {inv.loading ? (
              <View style={s.centered}>
                <Spinner size={32} color={GREEN} />
                <Text style={s.loadingText}>{t('vendor.loadingProducts')}</Text>
              </View>
            ) : categoryProducts.length === 0 ? (
              <View style={s.centered}>
                <Feather name="inbox" size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
                <Text style={s.emptyText}>{t('vendor.noProductsInCategory')}</Text>
                <Text style={s.emptySubText}>{t('vendor.tapToAddProduct')}</Text>
              </View>
            ) : (
              <View style={s.gridContainer}>
                {categoryProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={(p) => setModal(p)}
                    onDelete={handleDelete}
                    onToggleAvailability={handleToggleAvailability}
                    onPressMenu={handleProductPress}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Modals ── */}
      {modal !== null && (
        <ProductModal
          editing={modal !== "add" ? modal : (selectedCategory ? { category: selectedCategory } : null)}
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
              backgroundColor: confirmSheet.makingAvailable ? GREEN_LIGHT : RED_LIGHT,
              alignItems: "center",
              justifyContent: "center",
            }]}>
              <Feather
                name={confirmSheet.makingAvailable ? "check-circle" : "slash"}
                size={28}
                color={confirmSheet.makingAvailable ? GREEN : RED}
              />
            </View>

            {/* Text */}
            <Text style={s.sheetTitle}>
              {confirmSheet.makingAvailable ? t('vendor.markAsAvailable') : t('vendor.markAsUnavailable')}
            </Text>
            <Text style={s.sheetSub}>
              {confirmSheet.makingAvailable
                ? t('vendor.markAsAvailableDesc', { productName: confirmSheet.product.name }).replace('{{productName}}', confirmSheet.product.name)
                : t('vendor.markAsUnavailableDesc', { productName: confirmSheet.product.name }).replace('{{productName}}', confirmSheet.product.name)}
            </Text>

            {/* Buttons */}
            <View style={s.sheetBtnRow}>
              <TouchableOpacity
                onPress={() => setConfirmSheet(null)}
                style={s.sheetCancelBtn}
                activeOpacity={0.8}
              >
                <Text style={s.sheetCancelText}>{t('vendor.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmToggle}
                style={[s.sheetConfirmBtn, {
                  backgroundColor: confirmSheet.makingAvailable ? GREEN : RED
                }]}
                activeOpacity={0.85}
              >
                <Text style={s.sheetConfirmText}>
                  {confirmSheet.makingAvailable ? t('vendor.yesMakeAvailable') : t('vendor.yesMarkUnavailable')}
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
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 8,
  },

  folderCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  folderIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  folderEmoji: {
    fontSize: 28,
  },
  folderName: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: TEXT,
    textAlign: "center",
    marginBottom: 4,
    width: "100%",
  },
  folderCount: {
    fontSize: 11,
    color: TEXT_LIGHT,
    fontWeight: "600",
  },

  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardMenuBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
    zIndex: 10,
  },
  cardMenuDots: {
    fontSize: 12,
    color: TEXT_LIGHT,
    fontWeight: "bold",
  },
  cardContent: {
    alignItems: "center",
    width: "100%",
  },
  cardImageWrap: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: GRAY_BG,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  cardImage: {
    width: 74,
    height: 74,
  },
  cardImagePlaceholder: {
    fontSize: 30,
  },
  cardName: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: TEXT,
    textAlign: "center",
    height: 36,
    lineHeight: 18,
    marginBottom: 2,
    width: "100%",
  },
  cardBrand: {
    fontSize: 10,
    color: TEXT_XLIGHT,
    textAlign: "center",
    marginBottom: 4,
    width: "100%",
  },
  cardPrice: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
    color: TEXT,
    textAlign: "center",
    marginBottom: 2,
  },
  cardStock: {
    fontSize: 10,
    color: TEXT_LIGHT,
    textAlign: "center",
    marginBottom: 10,
  },
  cardToggleRow: {
    width: "100%",
    alignItems: "center",
  },
  toggleBtn: {
    width: "100%",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: GREEN_LIGHT,
    borderWidth: 1,
    borderColor: GREEN,
  },
  toggleBtnInactive: {
    backgroundColor: RED_LIGHT,
    borderWidth: 1,
    borderColor: RED,
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  toggleBtnTextActive: {
    color: GREEN,
  },
  toggleBtnTextInactive: {
    color: RED,
  },

  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: GRAY_BG,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT,
  },

  // Modal custom overlay
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 16,
  },
  modalInput: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_LIGHT,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: "850",
    color: "#fff",
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
  productPrice: { fontSize: 13, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold", color: TEXT },
  statusPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusPillText: { fontSize: 11, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },

  // Actions
  cardActions: { alignItems: "flex-end", gap: 6 },
  editBtn: {
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { color: "#fff", fontSize: 12, fontWeight: "700", fontFamily: "PlusJakartaSans_700Bold" },
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
  dropdownItemText: { fontSize: 14, fontWeight: "600", fontFamily: "PlusJakartaSans_600SemiBold", color: TEXT },
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

  // Added Custom Styles
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: GREEN,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  filterSectionSubTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_LIGHT,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  subChip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  subChipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  subChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_LIGHT,
  },
  subChipTextActive: {
    color: "#fff",
  },
});
