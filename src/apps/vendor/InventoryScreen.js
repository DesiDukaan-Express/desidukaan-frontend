import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Platform,
  Modal,
} from "react-native";
import { useTranslation } from "react-i18next";

import { Feather, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

// ── Hooks & Services ──────────────────────────────────────────────────────────
import useInventory from "../../hooks/useInventory";

// ── Common Components ─────────────────────────────────────────────────────────
import Spinner from "../../components/common/Spinner";
import ToastBanner from "../../components/common/ToastBanner";

// ── Inventory Components ──────────────────────────────────────────────────────
import BulkDeleteDialog from "../../components/inventory/BulkDeleteDialog";
import ProductModal from "../../components/inventory/ProductModal";
import CatalogueModal from "../../components/inventory/CatalogueModal";

// ─────────────────────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = "#15803D";
const GREEN_DARK = "#166534";
const GREEN_LIGHT = "#E8F5EC";
const ORANGE = "#F97316";
const ORANGE_LIGHT = "#FFF3E8";
const RED = "#EF4444";
const RED_LIGHT = "#FEE9E9";
const GRAY_BG = "#F4F5F7";
const BORDER = "#E4E4E7";
const TEXT = "#18181B";
const TEXT_LIGHT = "#71717A";
const TEXT_XLIGHT = "#A1A1AA";
const WHITE = "#FFFFFF";

// ─────────────────────────────────────────────────────────────────────────────
// FILTER CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STOCK_STATUS_OPTIONS = [
  { value: "All", label: "All", icon: null },
  { value: "In Stock", label: "In Stock", icon: "check-circle", color: GREEN },
  { value: "Low Stock", label: "Low Stock", icon: "alert-triangle", color: ORANGE },
  { value: "Out of Stock", label: "Out of Stock", icon: "x-square", color: RED },
];

const PRICE_PRESETS = [
  { id: "u50", label: "Under ₹50", min: null, max: 50 },
  { id: "50-100", label: "₹50 – ₹100", min: 50, max: 100 },
  { id: "100-250", label: "₹100 – ₹250", min: 100, max: 250 },
  { id: "250-500", label: "₹250 – ₹500", min: 250, max: 500 },
  { id: "500+", label: "₹500+", min: 500, max: null },
];

const SORT_OPTIONS = ["Newest First", "Price: Low to High", "Price: High to Low", "Name: A-Z"];

const DEFAULT_FILTERS = {
  stockStatus: "All",
  availability: null, // null | "Available" | "Unavailable"
  priceRange: null, // preset id | null
  minPrice: "",
  maxPrice: "",
  sortBy: "Newest First",
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC DROPDOWN (opens its option list on press)
// ─────────────────────────────────────────────────────────────────────────────

function Dropdown({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[s.dropdownWrap, open && { zIndex: 100 }]}>
      {!!label && <Text style={s.fieldLabel}>{label}</Text>}
      <TouchableOpacity style={s.dropdownField} onPress={() => setOpen((o) => !o)} activeOpacity={0.75}>
        <Text style={s.dropdownFieldText} numberOfLines={1}>
          {value}
        </Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={TEXT_LIGHT} />
      </TouchableOpacity>

      {open && (
        <>
          <TouchableOpacity style={s.dropdownBackdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={s.dropdownList}>
            <ScrollView style={{ maxHeight: 230 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const active = opt === value;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[s.dropdownListItem, active && s.dropdownListItemActive]}
                    onPress={() => {
                      onSelect(opt);
                      setOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.dropdownListItemText, active && s.dropdownListItemTextActive]}>{opt}</Text>
                    {active && <Feather name="check" size={14} color={GREEN} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ iconSet, iconName, iconColor, iconBg, label, value, sub, subColor }) {
  const IconComp = iconSet === "MI" ? MaterialIcons : Feather;
  return (
    <View style={s.statCard}>
      <View style={s.statTopRow}>
        <View style={[s.statIconWrap, { backgroundColor: iconBg }]}>
          <IconComp name={iconName} size={18} color={iconColor} />
        </View>
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={s.statValue}>{value ?? 0}</Text>
      {!!sub && <Text style={[s.statSub, subColor && { color: subColor }]}>{sub}</Text>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT ROW (list view — matches reference: thumbnail left, details right)
// ─────────────────────────────────────────────────────────────────────────────

function ProductRow({ product, onToggleAvailability, onPressMenu, onPress }) {
  const { t } = useTranslation();
  const isAvailable = product.is_active ?? true;
  const qty = product.stock_quantity ?? product.stock;

  return (
    <TouchableOpacity
      style={[s.row, !isAvailable && s.rowUnavailable]}
      activeOpacity={0.8}
      onPress={() => onPress(product)}
    >
      <View style={[s.rowImageWrap, !isAvailable && s.rowImageWrapDim]}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={[s.rowImage, !isAvailable && { opacity: 0.5 }]}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name="shopping-cart" size={26} color="#9CA3AF" style={!isAvailable && { opacity: 0.4 }} />
        )}
      </View>

      <View style={s.rowContent}>
        <View style={s.rowTopLine}>
          <Text style={[s.rowName, !isAvailable && s.rowNameDim]} numberOfLines={1}>
            {product.name}
          </Text>
          <TouchableOpacity
            onPress={() => onPressMenu(product)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.rowMenuBtn}
          >
            <Text style={s.rowMenuDots}>•••</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.rowPrice, !isAvailable && { color: TEXT_XLIGHT }]}>
          ₹{product.price} / {product.unit}
        </Text>
        <Text style={s.rowStock}>
          Stock: {qty ?? "—"} {product.unit}
        </Text>

        <TouchableOpacity
          onPress={() => onToggleAvailability(product)}
          activeOpacity={0.8}
          style={[s.rowBadge, isAvailable ? s.rowBadgeActive : s.rowBadgeInactive]}
        >
          <Text style={[s.rowBadgeText, isAvailable ? s.rowBadgeTextActive : s.rowBadgeTextInactive]}>
            {isAvailable ? t("vendor.available") : t("vendor.unavailable")}
          </Text>
        </TouchableOpacity>
      </View>

      <Feather name="chevron-right" size={18} color={TEXT_XLIGHT} style={s.rowChevron} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CARD (grid view)
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({ product, onToggleAvailability, onPressMenu, onPress }) {
  const { t } = useTranslation();
  const isAvailable = product.is_active ?? true;

  return (
    <TouchableOpacity
      style={[s.card, !isAvailable && s.cardUnavailable]}
      activeOpacity={0.85}
      onPress={() => onPress(product)}
    >
      <TouchableOpacity onPress={() => onPressMenu(product)} style={s.cardMenuBtn} activeOpacity={0.7}>
        <Text style={s.cardMenuDots}>•••</Text>
      </TouchableOpacity>

      <View style={s.cardContent}>
        <View style={[s.cardImageWrap, !isAvailable && s.rowImageWrapDim]}>
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

        <Text style={[s.cardName, !isAvailable && s.rowNameDim]} numberOfLines={2}>
          {product.name}
        </Text>

        <Text style={[s.cardPrice, !isAvailable && { color: TEXT_XLIGHT }]}>
          ₹{product.price} / {product.unit}
        </Text>

        <TouchableOpacity
          onPress={() => onToggleAvailability(product)}
          activeOpacity={0.8}
          style={[s.rowBadge, { width: "100%" }, isAvailable ? s.rowBadgeActive : s.rowBadgeInactive]}
        >
          <Text style={[s.rowBadgeText, isAvailable ? s.rowBadgeTextActive : s.rowBadgeTextInactive]}>
            {isAvailable ? t("vendor.available") : t("vendor.unavailable")}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER & SORT BOTTOM SHEET (matches reference screenshot)
// ─────────────────────────────────────────────────────────────────────────────

function FilterSortSheet({ visible, filters, setFilter, onReset, onApply, onClose, activeChips }) {
  const selectedPreset = PRICE_PRESETS.find((p) => p.id === filters.priceRange);

  const selectPreset = (preset) => {
    if (filters.priceRange === preset.id) {
      setFilter("priceRange", null);
    } else {
      setFilter("priceRange", preset.id);
      setFilter("minPrice", "");
      setFilter("maxPrice", "");
    }
  };

  const setCustom = (key, value) => {
    setFilter(key, value);
    if (filters.priceRange) setFilter("priceRange", null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.filterSheetCard}>
          <View style={s.sheetHandle} />

          <View style={s.filterSheetHeader}>
            <Text style={s.filterSheetTitle}>Filter & Sort</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={TEXT} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Stock Status */}
            <Text style={s.filterSectionTitle}>Stock Status</Text>
            <View style={{ gap: 2, marginBottom: 18 }}>
              {STOCK_STATUS_OPTIONS.map((opt) => {
                const active = filters.stockStatus === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={s.radioRow}
                    activeOpacity={0.7}
                    onPress={() => setFilter("stockStatus", opt.value)}
                  >
                    <View style={[s.radioCircle, active && s.radioCircleActive]}>
                      {active && <View style={s.radioDot} />}
                    </View>
                    <Text style={s.radioLabel}>{opt.label}</Text>
                    {opt.icon && (
                      <Feather name={opt.icon} size={18} color={opt.color} style={{ marginLeft: "auto" }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Availability */}
            <Text style={s.filterSectionTitle}>Availability</Text>
            <View style={s.availRow}>
              {["Available", "Unavailable"].map((val) => {
                const active = filters.availability === val;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[s.availBtn, active && s.availBtnActive]}
                    activeOpacity={0.8}
                    onPress={() => setFilter("availability", active ? null : val)}
                  >
                    <Text style={[s.availBtnText, active && s.availBtnTextActive]}>{val}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Price Range */}
            <Text style={[s.filterSectionTitle, { marginTop: 18 }]}>Price Range</Text>
            <View style={s.priceChipWrap}>
              {PRICE_PRESETS.map((preset) => {
                const active = filters.priceRange === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[s.priceChip, active && s.priceChipActive]}
                    activeOpacity={0.8}
                    onPress={() => selectPreset(preset)}
                  >
                    <Text style={[s.priceChipText, active && s.priceChipTextActive]}>{preset.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Range */}
            <Text style={[s.filterSectionTitle, { marginTop: 14 }]}>Custom Range</Text>
            <View style={s.customRangeRow}>
              <View style={s.customInputWrap}>
                <Text style={s.rupeeSign}>₹</Text>
                <TextInput
                  style={s.customInput}
                  placeholder="Min"
                  placeholderTextColor={TEXT_XLIGHT}
                  keyboardType="numeric"
                  value={filters.minPrice}
                  onChangeText={(v) => setCustom("minPrice", v)}
                />
              </View>
              <Text style={{ color: TEXT_LIGHT }}>–</Text>
              <View style={s.customInputWrap}>
                <Text style={s.rupeeSign}>₹</Text>
                <TextInput
                  style={s.customInput}
                  placeholder="Max"
                  placeholderTextColor={TEXT_XLIGHT}
                  keyboardType="numeric"
                  value={filters.maxPrice}
                  onChangeText={(v) => setCustom("maxPrice", v)}
                />
              </View>
            </View>

            {/* Sort By */}
            <View style={{ marginTop: 18 }}>
              <Dropdown
                label="Sort By"
                value={filters.sortBy}
                options={SORT_OPTIONS}
                onSelect={(v) => setFilter("sortBy", v)}
              />
            </View>

            {/* Footer buttons */}
            <View style={s.filterSheetFooter}>
              <TouchableOpacity style={s.resetBtn} onPress={onReset} activeOpacity={0.8}>
                <Text style={s.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.applyBtn} onPress={onApply} activeOpacity={0.85}>
                <Text style={s.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>

            {activeChips.length > 0 && (
              <View style={s.appliedSummaryBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="filter" size={13} color={GREEN_DARK} />
                  <Text style={s.appliedSummaryTitle}>{activeChips.length} filters applied</Text>
                </View>
                <Text style={s.appliedSummaryDesc}>{activeChips.map((c) => c.label).join("  •  ")}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const { t } = useTranslation();
  const inv = useInventory();

  const [modal, setModal] = useState(null); // null | 'add' | product object
  const [toast, setToast] = useState({ msg: "", show: false, type: "success" });
  const [confirmSheet, setConfirmSheet] = useState(null);
  const [actionSheetProduct, setActionSheetProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'grid'
  const [showAddOptions, setShowAddOptions] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, show: true, type });
    setTimeout(() => setToast((tt) => ({ ...tt, show: false })), 2500);
  };

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const clearAll = () => {
    setFilters(DEFAULT_FILTERS);
    inv.setSearch("");
  };

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

  const handleDelete = (id) => setProductToDelete(id);

  const handleToggleAvailability = (product) => {
    const isCurrentlyAvailable = product.is_active ?? true;
    setConfirmSheet({ product, makingAvailable: !isCurrentlyAvailable });
  };

  const confirmToggle = async () => {
    if (!confirmSheet) return;
    const { product, makingAvailable } = confirmSheet;
    setConfirmSheet(null);
    try {
      await inv.toggleAvailability(product.id, makingAvailable);
      showToast(
        makingAvailable ? `"${product.name}" is now available` : `"${product.name}" marked unavailable`,
        makingAvailable ? "success" : "error"
      );
    } catch (e) {
      showToast("Failed to update availability", "error");
    }
  };

  const handleProductPress = (product) => setActionSheetProduct(product);

  // ── Derived data ──────────────────────────────────────────────────────────

  const allProducts = inv.rawProducts || [];
  const allCategories = inv.globalCategories || [];

  const lowStockCount = useMemo(
    () =>
      allProducts.filter((p) => {
        const qty = p.stock_quantity ?? p.stock;
        const threshold = p.low_stock_threshold ?? 5;
        return (p.is_active ?? true) && qty != null && qty > 0 && qty <= threshold;
      }).length,
    [allProducts]
  );

  const outOfStockCount = useMemo(
    () =>
      allProducts.filter((p) => {
        const qty = p.stock_quantity ?? p.stock;
        return qty === 0 || (p.is_active ?? true) === false;
      }).length,
    [allProducts]
  );

  const effectivePriceRange = useMemo(() => {
    const preset = PRICE_PRESETS.find((p) => p.id === filters.priceRange);
    if (preset) return { min: preset.min, max: preset.max };
    const min = filters.minPrice !== "" ? parseFloat(filters.minPrice) : null;
    const max = filters.maxPrice !== "" ? parseFloat(filters.maxPrice) : null;
    return { min: isNaN(min) ? null : min, max: isNaN(max) ? null : max };
  }, [filters.priceRange, filters.minPrice, filters.maxPrice]);

  const filteredProducts = useMemo(() => {
    let data = allProducts;

    if (inv.search && inv.search.trim() !== "") {
      data = data.filter((p) => String(p.name).toLowerCase().includes(inv.search.toLowerCase()));
    }

    if (filters.stockStatus !== "All") {
      data = data.filter((p) => {
        const qty = p.stock_quantity ?? p.stock;
        const threshold = p.low_stock_threshold ?? 5;
        const isActive = p.is_active ?? true;
        if (filters.stockStatus === "In Stock") return isActive && (qty == null || qty > threshold);
        if (filters.stockStatus === "Low Stock") return qty != null && qty > 0 && qty <= threshold;
        if (filters.stockStatus === "Out of Stock") return qty === 0 || !isActive;
        return true;
      });
    }

    if (filters.availability) {
      data = data.filter((p) => {
        const isActive = p.is_active ?? true;
        return filters.availability === "Available" ? isActive : !isActive;
      });
    }

    const { min, max } = effectivePriceRange;
    if (min != null) data = data.filter((p) => Number(p.price) >= min);
    if (max != null) data = data.filter((p) => Number(p.price) <= max);

    const sortMap = {
      "Price: Low to High": { key: "price", dir: "asc" },
      "Price: High to Low": { key: "price", dir: "desc" },
      "Name: A-Z": { key: "name", dir: "asc" },
    };
    const cfg = sortMap[filters.sortBy];
    if (cfg) {
      data = [...data].sort((a, b) => {
        const av = a[cfg.key];
        const bv = b[cfg.key];
        if (typeof av === "number" && typeof bv === "number") {
          return cfg.dir === "asc" ? av - bv : bv - av;
        }
        return cfg.dir === "asc"
          ? String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true })
          : String(bv ?? "").localeCompare(String(av ?? ""), undefined, { numeric: true });
      });
    } else {
      data = [...data].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)); // Newest First
    }

    return data;
  }, [allProducts, inv.search, filters, effectivePriceRange]);

  // Chips describing which filters are active (used for the "Active Filters" row and the sheet footer)
  const activeChips = useMemo(() => {
    const chips = [];
    if (filters.stockStatus !== "All") {
      chips.push({ key: "stockStatus", label: filters.stockStatus, clear: () => setFilter("stockStatus", "All") });
    }
    if (filters.availability) {
      chips.push({ key: "availability", label: filters.availability, clear: () => setFilter("availability", null) });
    }
    const preset = PRICE_PRESETS.find((p) => p.id === filters.priceRange);
    if (preset) {
      chips.push({
        key: "price",
        label: preset.label,
        clear: () => setFilter("priceRange", null),
      });
    } else if (filters.minPrice || filters.maxPrice) {
      const label =
        filters.minPrice && filters.maxPrice
          ? `₹${filters.minPrice} – ₹${filters.maxPrice}`
          : filters.minPrice
          ? `Min ₹${filters.minPrice}`
          : `Max ₹${filters.maxPrice}`;
      chips.push({
        key: "price",
        label,
        clear: () => {
          setFilter("minPrice", "");
          setFilter("maxPrice", "");
        },
      });
    }
    return chips;
  }, [filters]);

  const notifCount = lowStockCount + outOfStockCount;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={s.headerTopRow}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="menu" size={22} color={TEXT} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={s.heading}>{t("vendor.inventoryTitle", "Inventory")}</Text>
            <Text style={s.subheading}>{t("vendor.manageCategoriesProducts", "Manage your products & categories")}</Text>
          </View>

          <TouchableOpacity style={s.bellBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="bell" size={20} color={TEXT} />
            {notifCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{notifCount > 9 ? "9+" : notifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Stat Cards ── */}
        <View style={s.statsGrid}>
          <StatCard
            iconSet="MI"
            iconName="inventory-2"
            iconColor={GREEN}
            iconBg={GREEN_LIGHT}
            label="Total Products"
            value={allProducts.length}
            sub="↑ 12 this week"
            subColor={GREEN}
          />
          <StatCard
            iconSet="F"
            iconName="folder"
            iconColor={GREEN}
            iconBg={GREEN_LIGHT}
            label="Categories"
            value={allCategories.length}
            sub="All categories"
          />
        </View>

        {/* ── Search ── */}
        <View style={s.searchWrap}>
          <Feather name="search" size={16} color={TEXT_LIGHT} style={{ marginRight: 6 }} />
          <TextInput
            style={s.searchInput}
            value={inv.search}
            onChangeText={inv.setSearch}
            placeholder="Search product or category…"
            placeholderTextColor={TEXT_XLIGHT}
            returnKeyType="search"
          />
          {inv.search.length > 0 && (
            <TouchableOpacity onPress={() => inv.setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={TEXT_LIGHT} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Filter & Sort trigger ── */}
        <TouchableOpacity
          style={[s.filterSortBtn, filterSheetOpen && s.filterSortBtnActive]}
          onPress={() => setFilterSheetOpen(true)}
          activeOpacity={0.8}
        >
          <Feather name="filter" size={15} color={TEXT} />
          <Text style={s.filterSortBtnText}>Filter & Sort</Text>
          {activeChips.length > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeChips.length}</Text>
            </View>
          )}
          <Feather name="chevron-down" size={16} color={TEXT_LIGHT} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        {/* ── Active Filters ── */}
        {activeChips.length > 0 && (
          <View>
            <View style={s.activeFiltersHeader}>
              <Text style={s.activeFiltersTitle}>Active Filters</Text>
              <TouchableOpacity onPress={clearAll} activeOpacity={0.7}>
                <Text style={s.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={s.activeChipsRow}>
              {activeChips.map((chip) => (
                <View key={chip.key} style={s.activeChip}>
                  <Text style={s.activeChipText}>{chip.label}</Text>
                  <TouchableOpacity onPress={chip.clear} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Feather name="x" size={13} color={GREEN_DARK} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Product List / Empty State ── */}
        {inv.loading ? (
          <View style={s.centered}>
            <Spinner size={32} color={GREEN} />
            <Text style={s.loadingText}>{t("vendor.loadingProducts", "Loading products…")}</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          allProducts.length === 0 ? (
            <View style={s.emptyStateBox}>
              <View style={s.emptyIllustration}>
                <MaterialCommunityIcons name="package-variant" size={64} color={GREEN} />
              </View>
              <Text style={s.emptyTitle}>Your inventory is empty</Text>
              <Text style={s.emptySub}>Add your first product or browse our catalogue to get started.</Text>
              <View style={s.emptyBtnRow}>
                <TouchableOpacity onPress={() => setModal("add")} style={s.primaryBtn} activeOpacity={0.85}>
                  <Feather name="plus" size={15} color={WHITE} />
                  <Text style={s.primaryBtnText}>Add Product</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCatalogueModal(true)} style={s.outlineBtn} activeOpacity={0.8}>
                  <MaterialIcons name="menu-book" size={15} color={TEXT} />
                  <Text style={s.outlineBtnText}>Add from Catalogue</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.centered}>
              <Feather name="search" size={40} color="#9CA3AF" style={{ marginBottom: 10 }} />
              <Text style={s.emptyText}>No products match your filters</Text>
              <Text style={s.emptySubText}>Try adjusting or clearing your filters.</Text>
            </View>
          )
        ) : (
          <>
            <View style={s.listHeader}>
              <Text style={s.listTitle}>Products ({filteredProducts.length})</Text>
              <View style={s.viewToggleRow}>
                <TouchableOpacity
                  style={[s.viewToggleBtn, viewMode === "grid" && s.viewToggleBtnActive]}
                  onPress={() => setViewMode("grid")}
                  activeOpacity={0.75}
                >
                  <Feather name="grid" size={14} color={viewMode === "grid" ? GREEN_DARK : TEXT_LIGHT} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.viewToggleBtn, viewMode === "list" && s.viewToggleBtnActive]}
                  onPress={() => setViewMode("list")}
                  activeOpacity={0.75}
                >
                  <Feather name="list" size={14} color={viewMode === "list" ? GREEN_DARK : TEXT_LIGHT} />
                </TouchableOpacity>
              </View>
            </View>

            {viewMode === "list" ? (
              <View style={{ gap: 12 }}>
                {filteredProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onToggleAvailability={handleToggleAvailability}
                    onPressMenu={handleProductPress}
                    onPress={() => {}}
                  />
                ))}
              </View>
            ) : (
              <View style={s.gridContainer}>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onToggleAvailability={handleToggleAvailability}
                    onPressMenu={handleProductPress}
                    onPress={() => {}}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Floating Add Button ── */}
      <TouchableOpacity style={s.fab} onPress={() => setShowAddOptions(true)} activeOpacity={0.85}>
        <Feather name="plus" size={26} color={WHITE} />
      </TouchableOpacity>

      {/* ── Add Options Sheet (Add Product vs Add from Catalogue) ── */}
      {showAddOptions && (
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowAddOptions(false)} />
          <View style={s.sheetCard}>
            <Text style={s.sheetTitle}>Add New</Text>
            <Text style={s.sheetSub}>Choose how you'd like to add a product</Text>

            <TouchableOpacity
              style={s.addOptionRow}
              activeOpacity={0.8}
              onPress={() => {
                setShowAddOptions(false);
                setModal("add");
              }}
            >
              <View style={[s.addOptionIcon, { backgroundColor: GREEN_LIGHT }]}>
                <Feather name="plus" size={20} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.addOptionTitle}>Add Product</Text>
                <Text style={s.addOptionSub}>Create a new product manually</Text>
              </View>
              <Feather name="chevron-right" size={18} color={TEXT_XLIGHT} />
            </TouchableOpacity>

            <TouchableOpacity
              style={s.addOptionRow}
              activeOpacity={0.8}
              onPress={() => {
                setShowAddOptions(false);
                setShowCatalogueModal(true);
              }}
            >
              <View style={[s.addOptionIcon, { backgroundColor: "#EAF1FE" }]}>
                <MaterialIcons name="menu-book" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.addOptionTitle}>Add from Catalogue</Text>
                <Text style={s.addOptionSub}>Pick ready-made products from our catalogue</Text>
              </View>
              <Feather name="chevron-right" size={18} color={TEXT_XLIGHT} />
            </TouchableOpacity>

            <TouchableOpacity style={s.sheetCancelBtn} onPress={() => setShowAddOptions(false)} activeOpacity={0.8}>
              <Text style={s.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Filter & Sort Sheet ── */}
      <FilterSortSheet
        visible={filterSheetOpen}
        filters={filters}
        setFilter={setFilter}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        onApply={() => setFilterSheetOpen(false)}
        onClose={() => setFilterSheetOpen(false)}
        activeChips={activeChips}
      />

      {/* ── Modals ── */}
      {modal !== null && (
        <ProductModal editing={modal !== "add" ? modal : null} onClose={() => setModal(null)} onSave={handleSave} saving={inv.saving} />
      )}

      {productToDelete && (
        <BulkDeleteDialog
          count={1}
          onConfirm={async () => {
            await inv.deleteProduct(productToDelete);
            showToast("Product deleted");
            setProductToDelete(null);
          }}
          onCancel={() => setProductToDelete(null)}
          saving={inv.saving}
        />
      )}

      <CatalogueModal
        visible={showCatalogueModal}
        onClose={() => setShowCatalogueModal(false)}
        onSuccess={() => {
          inv.loadVendor?.();
          inv.reload?.();
          showToast("Products imported from catalogue!");
        }}
      />

      {/* ── Action Sheet ── */}
      {actionSheetProduct && (
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setActionSheetProduct(null)} />
          <View style={s.sheetCard}>
            <View style={[s.sheetIconBox, { backgroundColor: GRAY_BG }]}>
              <Feather name="settings" size={28} color={TEXT} />
            </View>
            <Text style={s.sheetTitle}>{actionSheetProduct.name}</Text>
            <View style={s.sheetBtnRow}>
              <TouchableOpacity
                onPress={() => {
                  const productId = actionSheetProduct.id;
                  setActionSheetProduct(null);
                  handleDelete(productId);
                }}
                style={[s.sheetCancelBtn, { backgroundColor: RED }]}
                activeOpacity={0.8}
              >
                <Text style={[s.sheetCancelText, { color: "#fff" }]}>{t("vendor.delete")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const productToEdit = actionSheetProduct;
                  setActionSheetProduct(null);
                  setModal(productToEdit);
                }}
                style={[s.sheetConfirmBtn, { backgroundColor: GREEN }]}
                activeOpacity={0.85}
              >
                <Text style={s.sheetConfirmText}>{t("vendor.editProduct")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Confirm Sheet ── */}
      {confirmSheet && (
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setConfirmSheet(null)} />
          <View style={s.sheetCard}>
            <View
              style={[
                s.sheetIconBox,
                {
                  backgroundColor: confirmSheet.makingAvailable ? GREEN_LIGHT : RED_LIGHT,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Feather name={confirmSheet.makingAvailable ? "check-circle" : "slash"} size={28} color={confirmSheet.makingAvailable ? GREEN : RED} />
            </View>
            <Text style={s.sheetTitle}>
              {confirmSheet.makingAvailable ? t("vendor.markAsAvailable") : t("vendor.markAsUnavailable")}
            </Text>
            <Text style={s.sheetSub}>
              {confirmSheet.makingAvailable
                ? t("vendor.markAsAvailableDesc", { productName: confirmSheet.product.name }).replace(
                    "{{productName}}",
                    confirmSheet.product.name
                  )
                : t("vendor.markAsUnavailableDesc", { productName: confirmSheet.product.name }).replace(
                    "{{productName}}",
                    confirmSheet.product.name
                  )}
            </Text>
            <View style={s.sheetBtnRow}>
              <TouchableOpacity onPress={() => setConfirmSheet(null)} style={s.sheetCancelBtn} activeOpacity={0.8}>
                <Text style={s.sheetCancelText}>{t("vendor.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmToggle}
                style={[s.sheetConfirmBtn, { backgroundColor: confirmSheet.makingAvailable ? GREEN : RED }]}
                activeOpacity={0.85}
              >
                <Text style={s.sheetConfirmText}>
                  {confirmSheet.makingAvailable ? t("vendor.yesMakeAvailable") : t("vendor.yesMarkUnavailable")}
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
  safe: { flex: 1, backgroundColor: GRAY_BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12 },

  // ── Header ──
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: Platform.OS === "ios" ? 4 : 8,
  },
  iconBtn: { padding: 4, marginTop: 2 },
  bellBtn: { padding: 4, marginTop: 2, position: "relative" },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: RED,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: WHITE,
  },
  bellBadgeText: { color: WHITE, fontSize: 9, fontWeight: "800" },
  heading: { fontSize: 24, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: TEXT },
  subheading: { fontSize: 13, color: TEXT_LIGHT, marginTop: 2 },
  headerBtnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: WHITE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  outlineBtnText: { fontSize: 12, fontWeight: "700", color: TEXT },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: GREEN_DARK,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexGrow: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  primaryBtnText: { color: WHITE, fontSize: 13, fontWeight: "800" },

  // ── Stat cards (2x2 grid) ──
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: "47.5%",
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 6,
  },
  statTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statIconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 12, color: TEXT_LIGHT, fontWeight: "600", flexShrink: 1 },
  statValue: { fontSize: 26, fontWeight: "800", color: TEXT, letterSpacing: -0.5 },
  statSub: { fontSize: 11, color: TEXT_LIGHT, fontWeight: "600" },

  // ── Search ──
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT, paddingVertical: 0 },

  // ── Filter & Sort trigger ──
  filterSortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  filterSortBtnActive: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  filterSortBtnText: { fontSize: 14, fontWeight: "700", color: TEXT },
  filterBadge: {
    backgroundColor: GREEN,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: WHITE, fontSize: 10, fontWeight: "800" },

  // ── Active filters ──
  activeFiltersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  activeFiltersTitle: { fontSize: 13, fontWeight: "700", color: GREEN_DARK },
  clearAllText: { fontSize: 13, fontWeight: "700", color: GREEN },
  activeChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  activeChipText: { fontSize: 12, fontWeight: "700", color: GREEN_DARK },

  // ── Dropdown ──
  dropdownWrap: { position: "relative" },
  fieldLabel: { fontSize: 13, fontWeight: "800", color: TEXT, marginBottom: 8 },
  dropdownField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: WHITE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownFieldText: { fontSize: 13, color: TEXT, fontWeight: "600", flexShrink: 1 },
  dropdownBackdrop: { position: "absolute", top: -1000, left: -1000, right: -1000, bottom: -1000, zIndex: 90 },
  dropdownList: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 100,
  },
  dropdownListItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  dropdownListItemActive: { backgroundColor: GREEN_LIGHT },
  dropdownListItemText: { fontSize: 13, color: TEXT, fontWeight: "500" },
  dropdownListItemTextActive: { color: GREEN, fontWeight: "700" },

  // ── List header ──
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  listTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
  viewToggleRow: { flexDirection: "row", gap: 6 },
  viewToggleBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  viewToggleBtnActive: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },

  // ── Product row (list view) ──
  row: {
    flexDirection: "row",
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 12,
    gap: 12,
    alignItems: "center",
  },
  rowUnavailable: { opacity: 0.75, borderColor: "#F0F0F0" },
  rowImageWrap: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: GRAY_BG,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rowImageWrapDim: { backgroundColor: "#EFEFEF" },
  rowImage: { width: 68, height: 68 },
  rowContent: { flex: 1, gap: 3 },
  rowTopLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowName: { fontSize: 15, fontWeight: "800", color: TEXT, flexShrink: 1, marginRight: 6 },
  rowNameDim: { color: TEXT_LIGHT },
  rowMenuBtn: { padding: 4 },
  rowMenuDots: { fontSize: 13, color: TEXT_LIGHT, fontWeight: "bold" },
  rowPrice: { fontSize: 13, fontWeight: "700", color: TEXT },
  rowStock: { fontSize: 12, color: TEXT_LIGHT },
  rowBadge: { alignSelf: "flex-start", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  rowBadgeActive: { backgroundColor: GREEN_LIGHT, borderWidth: 1, borderColor: GREEN },
  rowBadgeInactive: { backgroundColor: RED_LIGHT, borderWidth: 1, borderColor: RED },
  rowBadgeText: { fontSize: 11, fontWeight: "700" },
  rowBadgeTextActive: { color: GREEN },
  rowBadgeTextInactive: { color: RED },
  rowChevron: { marginLeft: 2 },

  // ── Product card (grid view) ──
  gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 4 },
  card: {
    width: "48%",
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 12,
    position: "relative",
  },
  cardMenuBtn: { position: "absolute", top: 8, right: 8, padding: 6, zIndex: 10 },
  cardMenuDots: { fontSize: 12, color: TEXT_LIGHT, fontWeight: "bold" },
  cardContent: { alignItems: "center", width: "100%" },
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
  cardImage: { width: 74, height: 74 },
  cardName: { fontSize: 13, fontWeight: "700", color: TEXT, textAlign: "center", height: 36, lineHeight: 18, marginBottom: 2, width: "100%" },
  cardPrice: { fontSize: 12, fontWeight: "700", color: TEXT, textAlign: "center", marginBottom: 8 },
  cardUnavailable: { opacity: 0.75, borderColor: "#F0F0F0" },

  // ── Empty state ──
  emptyStateBox: {
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyIllustration: { width: 110, height: 110, borderRadius: 55, backgroundColor: GREEN_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: TEXT, marginTop: 4 },
  emptySub: { fontSize: 13, color: TEXT_LIGHT, textAlign: "center", marginBottom: 14, lineHeight: 19 },
  emptyBtnRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },

  // ── Loading / generic empty ──
  centered: { alignItems: "center", paddingVertical: 48, gap: 8, backgroundColor: WHITE, borderRadius: 14, borderWidth: 1, borderColor: BORDER },
  loadingText: { fontSize: 14, color: TEXT_LIGHT, marginTop: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: TEXT },
  emptySubText: { fontSize: 13, color: TEXT_LIGHT, textAlign: "center", paddingHorizontal: 32 },

  // ── Floating Add button ──
  fab: {
    position: "absolute",
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN_DARK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  // ── Bottom sheets (generic: action sheet / confirm sheet) ──
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end", zIndex: 1000 },
  sheetCard: {
    backgroundColor: WHITE,
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
  sheetIconBox: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: TEXT, textAlign: "center" },
  sheetSub: { fontSize: 13, color: TEXT_LIGHT, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  sheetBtnRow: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  sheetCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: BORDER, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: WHITE },
  sheetCancelText: { fontSize: 14, fontWeight: "700", color: TEXT_LIGHT },
  sheetConfirmBtn: { flex: 2, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  sheetConfirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // ── Add options sheet (Add Product vs Add from Catalogue) ──
  addOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
  },
  addOptionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addOptionTitle: { fontSize: 14, fontWeight: "800", color: TEXT },
  addOptionSub: { fontSize: 12, color: TEXT_LIGHT, marginTop: 1 },

  // ── Filter & Sort sheet ──
  filterSheetCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "88%",
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: "center", marginBottom: 14 },
  filterSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  filterSheetTitle: { fontSize: 19, fontWeight: "800", color: TEXT },
  filterSectionTitle: { fontSize: 14, fontWeight: "800", color: TEXT, marginBottom: 10 },

  radioRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: { borderColor: GREEN },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN },
  radioLabel: { fontSize: 14, color: TEXT, fontWeight: "600" },

  availRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  availBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: WHITE,
  },
  availBtnActive: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  availBtnText: { fontSize: 14, fontWeight: "700", color: TEXT },
  availBtnTextActive: { color: GREEN_DARK },

  priceChipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  priceChip: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: WHITE },
  priceChipActive: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  priceChipText: { fontSize: 13, fontWeight: "600", color: TEXT },
  priceChipTextActive: { color: GREEN_DARK, fontWeight: "800" },

  customRangeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  customInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
    backgroundColor: WHITE,
  },
  rupeeSign: { fontSize: 13, color: TEXT_LIGHT, fontWeight: "600" },
  customInput: { flex: 1, fontSize: 13, color: TEXT, padding: 0 },

  filterSheetFooter: { flexDirection: "row", gap: 10, marginTop: 22 },
  resetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: WHITE,
  },
  resetBtnText: { fontSize: 14, fontWeight: "700", color: TEXT },
  applyBtn: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN_DARK,
    borderRadius: 12,
    paddingVertical: 14,
  },
  applyBtnText: { fontSize: 14, fontWeight: "800", color: WHITE },

  appliedSummaryBox: { backgroundColor: GREEN_LIGHT, borderRadius: 12, padding: 12, marginTop: 14, gap: 4 },
  appliedSummaryTitle: { fontSize: 13, fontWeight: "800", color: GREEN_DARK },
  appliedSummaryDesc: { fontSize: 12, color: GREEN_DARK, opacity: 0.85 },
});