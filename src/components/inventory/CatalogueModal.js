import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import useAuthStore from "../../store/authStore";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const GREEN = "#1B6B35";
const GREEN_LIGHT = "#E8F5EC";
const ORANGE = "#F97316";

export default function CatalogueModal({ visible, onClose, onSuccess }) {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [catalogueCategories, setCatalogueCategories] = useState([]);
  const [catPath, setCatPath] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    if (visible) {
      fetchCatalogueTree();
      setCatPath([]);
    } else {
      setSelectedItems({});
      setSearch("");
      setCatPath([]);
    }
  }, [visible]);

  const fetchCatalogueTree = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/master/catalogue-tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const cats = data.categories || [];
      setCatalogueCategories(cats);
    } catch (err) {
      console.error("Failed to load catalogue tree:", err);
      Alert.alert("Error", "Failed to fetch master catalogue from server.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to recursively collect products from a category node and all its descendants
  const getAllProductsFromNode = (catNode) => {
    let prods = [];
    if (!catNode) return prods;
    if (catNode.products) prods.push(...catNode.products);
    const subList = catNode.subcategories || catNode.children || [];
    subList.forEach((sub) => {
      prods.push(...getAllProductsFromNode(sub));
    });
    return prods;
  };

  // Active Category node at end of path
  const activeNode = catPath.length > 0 ? catPath[catPath.length - 1] : null;

  // Direct child subcategories under activeNode
  const currentChildSubCats = useMemo(() => {
    if (!activeNode) return catalogueCategories;
    return activeNode.subcategories || activeNode.children || [];
  }, [activeNode, catalogueCategories]);

  // Available Products based on selected Category Node & Search Query
  const displayedProducts = useMemo(() => {
    let prods = [];
    if (search.trim()) {
      catalogueCategories.forEach((cat) => {
        prods.push(...getAllProductsFromNode(cat));
      });
      const q = search.toLowerCase();
      prods = prods.filter((p) => p.name.toLowerCase().includes(q));
    } else if (activeNode) {
      prods = getAllProductsFromNode(activeNode);
    }

    // Deduplicate by ID
    const map = new Map();
    prods.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [catalogueCategories, activeNode, search]);

  const toggleItemSelect = (product) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[product.id]) {
        delete next[product.id];
      } else {
        next[product.id] = {
          master_product_id: product.id,
          name: product.name,
          category_id: product.category_id,
          mrp: product.mrp || product.base_price || 0,
          price: product.base_price || product.mrp || 0,
          unit: product.unit || "kg",
          item_type: product.item_type || "packed",
          weight_options: product.weight_options,
          image_url: product.image_url,
          description: product.description,
        };
      }
      return next;
    });
  };

  const updateItemField = (productId, field, value) => {
    setSelectedItems((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value,
        },
      };
    });
  };

  const handleImport = async () => {
    const itemsArray = Object.values(selectedItems);
    if (itemsArray.length === 0) {
      Alert.alert("Select Products", "Please select at least one catalogue product to import.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/add-from-catalogue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: itemsArray }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add products");

      onClose();
      onSuccess?.();
      Alert.alert(
        "Import Successful!",
        `${data.data?.total || itemsArray.length} items added/updated in your inventory.`
      );
    } catch (err) {
      Alert.alert("Import Failed", err.message || "Something went wrong.");
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = Object.keys(selectedItems).length;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={s.container}>
        {/* Modal Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Add from Catalogue</Text>
            <Text style={s.subtitle}>
              Browse master products arranged by category & subcategory
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Feather name="x" size={20} color="#18181B" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <Feather name="search" size={16} color="#71717A" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search master catalogue products..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#A1A1AA"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color="#71717A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Shop By Category Breadcrumbs & Subcategory Navigation (if search is empty) */}
        {!search && (
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#E4E4E7", backgroundColor: "#FAFAFA" }}>
            {/* Breadcrumb Bar */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <TouchableOpacity onPress={() => setCatPath([])}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: catPath.length === 0 ? GREEN : "#71717A" }}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                {catPath.map((step, idx) => (
                  <View key={step.id || idx} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 12, color: "#A1A1AA" }}>›</Text>
                    <TouchableOpacity onPress={() => setCatPath(catPath.slice(0, idx + 1))}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: idx === catPath.length - 1 ? GREEN : "#71717A" }}>
                        {step.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              {catPath.length > 0 && (
                <TouchableOpacity
                  onPress={() => setCatPath(catPath.slice(0, -1))}
                  style={{ backgroundColor: "#E8F5EC", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>← Back</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Subcategories Horizontal Scroll Row */}
            {currentChildSubCats.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, gap: 8 }}>
                {currentChildSubCats.map((sub) => {
                  const childCount = (sub.subcategories || sub.children || []).length;
                  const prodCount = getAllProductsFromNode(sub).length;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      onPress={() => setCatPath([...catPath, sub])}
                      style={{
                        backgroundColor: "#FFF",
                        borderWidth: 1.5,
                        borderColor: GREEN + "40",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>📁</Text>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: "#18181B" }}>{sub.name}</Text>
                        <Text style={{ fontSize: 10, color: "#71717A" }}>
                          {childCount > 0 ? `${childCount} subcats · ` : ""}{prodCount} items
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Product List */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={s.loadingText}>Fetching Master Catalogue…</Text>
          </View>
        ) : displayedProducts.length === 0 ? (
          <View style={s.centered}>
            <MaterialIcons name="inventory" size={48} color="#9CA3AF" style={{ marginBottom: 10 }} />
            <Text style={s.emptyText}>No catalogue products found</Text>
            <Text style={s.emptySubText}>
              {search
                ? "Try searching for a different item name."
                : catPath.length === 0
                ? "Select a category above to browse products."
                : `No products directly added to "${activeNode?.name}" yet.`}
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
            {displayedProducts.map((p) => {
              const selectedItem = selectedItems[p.id];
              const isSelected = !!selectedItem;

              return (
                <View
                  key={p.id}
                  style={[s.productCard, isSelected && s.productCardSelected]}
                >
                  <TouchableOpacity
                    onPress={() => toggleItemSelect(p)}
                    style={s.productMainRow}
                    activeOpacity={0.8}
                  >
                    <View style={s.productImageWrap}>
                      {p.image_url ? (
                        <Image source={{ uri: p.image_url }} style={s.productImage} />
                      ) : (
                        <MaterialIcons name="inventory" size={24} color={GREEN} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={s.productName}>{p.name}</Text>
                      <Text style={s.productMeta}>
                        MRP: ₹{p.mrp || p.base_price || 0} • {p.unit} ({p.item_type})
                      </Text>
                    </View>

                    <View style={[s.checkbox, isSelected && s.checkboxSelected]}>
                      {isSelected && <Feather name="check" size={14} color="#FFF" />}
                    </View>
                  </TouchableOpacity>

                  {/* Input fields when selected */}
                  {isSelected && (
                    <View style={s.editInputsRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.inputLabel}>Selling Price (₹)</Text>
                        <TextInput
                          style={s.input}
                          keyboardType="numeric"
                          value={String(selectedItem.price)}
                          onChangeText={(v) => updateItemField(p.id, "price", v)}
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Footer Actions */}
        <View style={s.footer}>
          <TouchableOpacity
            onPress={handleImport}
            disabled={selectedCount === 0 || importing}
            style={[
              s.importBtn,
              (selectedCount === 0 || importing) && s.importBtnDisabled,
            ]}
          >
            {importing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={s.importBtnText}>
                Import {selectedCount > 0 ? `${selectedCount} ` : ""}Items into Inventory
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F4F5" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E4E4E7",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#18181B" },
  subtitle: { fontSize: 12, color: "#71717A", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#18181B" },
  catTabRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 6 },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  catTabActive: { backgroundColor: GREEN, borderColor: GREEN },
  catTabText: { fontSize: 13, fontWeight: "600", color: "#3F3F46" },
  catTabTextActive: { color: "#FFF" },
  subTabRow: { paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  subTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#E4E4E7",
  },
  subTabActive: { backgroundColor: ORANGE },
  subTabText: { fontSize: 12, fontWeight: "600", color: "#52525B" },
  subTabTextActive: { color: "#FFF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { fontSize: 14, color: "#71717A", marginTop: 12 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#27272A" },
  emptySubText: { fontSize: 12, color: "#71717A", textAlign: "center", marginTop: 4 },
  productCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E4E4E7",
  },
  productCardSelected: { borderColor: GREEN, backgroundColor: GREEN_LIGHT },
  productMainRow: { flexDirection: "row", alignItems: "center" },
  productImageWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  productImage: { width: 44, height: 44, resizeMode: "cover" },
  productName: { fontSize: 14, fontWeight: "700", color: "#18181B" },
  productMeta: { fontSize: 12, color: "#71717A", marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#A1A1AA",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  checkboxSelected: { backgroundColor: GREEN, borderColor: GREEN },
  editInputsRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  inputLabel: { fontSize: 10, fontWeight: "700", color: "#52525B", marginBottom: 4 },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D4D4D8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: "#18181B",
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E4E4E7",
  },
  importBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  importBtnDisabled: { backgroundColor: "#A1A1AA" },
  importBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
