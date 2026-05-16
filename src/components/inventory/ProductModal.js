import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from "../../store/authStore";
import { uploadAPI } from "../../services/api";
import { T, UNITS } from "../common/tokens";
import SelectChip from "../common/SelectChip";
import Spinner from "../common/Spinner";

// ─── Fallback hardcoded categories (used if API is unavailable) ───────────────
const FALLBACK_CATEGORIES = [
  "Dairy, Bread & Eggs",
  "Fruits & Vegetables",
  "Snacks & Munchies",
  "Beverages",
  "Bakery & Biscuits",
  "Atta, Rice & Dal",
  "Masala, Oil & More",
  "Cleaning Essentials",
  "Personal Care",
  "Other",
];

const LBL_STYLE = {
  fontSize: 11,
  fontWeight: "700",
  color: T.textXLight,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const TYPE_OPTS = [
  { label: "Packed", value: "packed" },
  { label: "Loose",  value: "loose"  },
];

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

/**
 * ProductModal — Add or Edit product form, shown as a bottom-sheet style Modal.
 * Features a dynamic 2-step category → subcategory picker loaded from the API.
 */
export default function ProductModal({ editing, onClose, onSave, saving }) {
  // ── Form initial state ─────────────────────────────────────────────────────
  const init = editing
    ? {
        name:          editing.name,
        description:   editing.description || "",
        categoryName:  editing.category    || "",
        subcategoryId: editing.category_id || null,
        subcategoryName: editing.subcategory || "",
        barcode:       editing.barcode    || "",
        stock:         String(editing.rawStock || 0),
        price:         String(editing.price    || 0),
        unit:          editing.unit  || "kg",
        type:          editing.type  || "packed",
        weight_options: editing.weight_options || [],
        image_url:     editing.image_url || "",
      }
    : {
        name:          "",
        description:   "",
        categoryName:  "",
        subcategoryId: null,
        subcategoryName: "",
        barcode:       "",
        unit:          "kg",
        stock:         "",
        price:         "",
        type:          "packed",
        weight_options: [],
        image_url:     "",
      };

  const { token } = useAuthStore();
  const [form, setForm]           = useState(init);
  const [err, setErr]             = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput]   = useState(false);

  // ── Category/subcategory state ─────────────────────────────────────────────
  const [topCategories, setTopCategories]     = useState([]);
  const [subcategories, setSubcategories]     = useState([]);
  const [selectedTopCat, setSelectedTopCat]   = useState(null); // { id, name }
  const [catLoading, setCatLoading]           = useState(false);
  const [subLoading, setSubLoading]           = useState(false);

  // ── Fetch top-level categories on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setCatLoading(true);
    fetch(`${BASE_URL}/products/categories`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const cats = (data.data?.categories || []).filter(c => c.parent_id === null);
        setTopCategories(cats.length > 0 ? cats : FALLBACK_CATEGORIES.map((n, i) => ({ id: -(i + 1), name: n, parent_id: null })));

        // If editing, pre-select the parent category
        if (editing?.category) {
          const match = cats.find(c => c.name === editing.category);
          if (match) setSelectedTopCat(match);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTopCategories(FALLBACK_CATEGORIES.map((n, i) => ({ id: -(i + 1), name: n, parent_id: null })));
        }
      })
      .finally(() => { if (!cancelled) setCatLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // ── Fetch subcategories when a top-level cat is selected ──────────────────
  useEffect(() => {
    if (!selectedTopCat || selectedTopCat.id < 0) {
      setSubcategories([]);
      return;
    }
    let cancelled = false;
    setSubLoading(true);
    fetch(`${BASE_URL}/products/subcategories/${selectedTopCat.id}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setSubcategories(data.data?.subcategories || []);
      })
      .catch(() => { if (!cancelled) setSubcategories([]); })
      .finally(() => { if (!cancelled) setSubLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTopCat]);

  const set = (k, v) => {
    setErr("");
    setForm(f => ({ ...f, [k]: v }));
  };

  const handleSelectTopCat = (cat) => {
    setSelectedTopCat(cat);
    set("categoryName",    cat.name);
    set("subcategoryId",   null);
    set("subcategoryName", "");
    setSubcategories([]);
  };

  const handleSelectSubCat = (sub) => {
    set("subcategoryId",   sub.id);
    set("subcategoryName", sub.name);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        const { url } = await uploadAPI.upload(
          result.assets[0].uri,
          result.assets[0].mimeType || 'image/jpeg',
          token
        );
        set("image_url", url);
        setUrlInput(false);
      }
    } catch (e) {
      setErr("Image upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !String(form.name).trim() ||
      !String(form.stock).trim() ||
      !String(form.price).trim()
    ) {
      setErr("Name, Stock and Price are required.");
      return;
    }

    if (form.type === "loose" && form.weight_options.length === 0) {
      setErr("Loose items must have at least one weight option.");
      return;
    }

    const cleanedOptions = form.weight_options
      .filter(opt => opt.weight && !isNaN(parseFloat(opt.weight)))
      .map(opt => ({ weight: parseFloat(opt.weight), unit: opt.unit }));

    if (form.type === "loose" && cleanedOptions.length === 0) {
      setErr("Please enter valid numeric weights.");
      return;
    }

    await onSave({
      ...form,
      weight_options: cleanedOptions,
      // Pass subcategory_id so backend uses it as category_id
      subcategory_id: form.subcategoryId || null,
      category_id:    form.subcategoryId || null,
      category:       form.categoryName  || "Other",
    });
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{editing ? "Edit Product" : "Add New Product"}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Product Image */}
          <View>
            <Text style={LBL_STYLE}>Product Image</Text>
            {form.image_url ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: form.image_url }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.changeImageBtn} 
                  onPress={() => { set("image_url", ""); setUrlInput(false); }}
                >
                  <Text style={styles.changeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholderWrap}>
                {uploading ? (
                  <ActivityIndicator color={T.primary} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                      <Text style={styles.imageBtnText}>📷 Upload</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.imageBtn} 
                      onPress={() => setUrlInput(!urlInput)}
                    >
                      <Text style={styles.imageBtnText}>🔗 Link</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
            {urlInput && !form.image_url && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={form.image_url}
                onChangeText={(v) => set("image_url", v)}
                placeholder="Paste image URL here..."
                placeholderTextColor={T.textXLight}
              />
            )}
          </View>

          {/* Name & Description */}
          <View>
            <Text style={LBL_STYLE}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => set("name", v)}
              placeholder="e.g. Amul Full Cream Milk"
              placeholderTextColor={T.textXLight}
            />
          </View>

          <View>
            <Text style={LBL_STYLE}>Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
              value={form.description}
              onChangeText={(v) => set("description", v)}
              placeholder="Enter product details..."
              placeholderTextColor={T.textXLight}
              multiline
            />
          </View>

          {/* ── Step 1: Top-level Category ── */}
          <View>
            <Text style={LBL_STYLE}>Category</Text>
            {catLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={T.primary} />
                <Text style={styles.loadingText}>Loading categories…</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {topCategories.map((cat) => (
                    <SelectChip
                      key={cat.id}
                      label={cat.name}
                      active={selectedTopCat?.id === cat.id}
                      onClick={() => handleSelectTopCat(cat)}
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* ── Step 2: Subcategory (shown once a top cat is selected) ── */}
          {selectedTopCat && (
            <View>
              <View style={styles.subCatHeader}>
                <Text style={LBL_STYLE}>Subcategory</Text>
                {form.subcategoryName ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓ {form.subcategoryName}</Text>
                  </View>
                ) : null}
              </View>

              {subLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={T.primary} />
                  <Text style={styles.loadingText}>Loading subcategories…</Text>
                </View>
              ) : subcategories.length === 0 ? (
                <View style={styles.noSubCatWrap}>
                  <Text style={styles.noSubCatText}>
                    No subcategories for "{selectedTopCat.name}".{"\n"}
                    Product will be filed directly under this category.
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {subcategories.map((sub) => (
                      <SelectChip
                        key={sub.id}
                        label={sub.name}
                        active={form.subcategoryId === sub.id}
                        onClick={() => handleSelectSubCat(sub)}
                      />
                    ))}
                  </View>
                </ScrollView>
              )}

              {/* Breadcrumb preview */}
              {(form.categoryName || form.subcategoryName) && (
                <View style={styles.breadcrumb}>
                  <Text style={styles.breadcrumbText}>
                    📁 {form.categoryName}
                    {form.subcategoryName ? ` → ${form.subcategoryName}` : ""}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Unit */}
          <View>
            <Text style={LBL_STYLE}>Unit</Text>
            <View style={styles.chipRow}>
              {UNITS.map((u) => (
                <SelectChip
                  key={u}
                  label={u}
                  active={form.unit === u}
                  onClick={() => set("unit", u)}
                />
              ))}
            </View>
          </View>

          {/* Type */}
          <View>
            <Text style={LBL_STYLE}>Type</Text>
            <View style={styles.chipRow}>
              {TYPE_OPTS.map((opt) => (
                <SelectChip
                  key={opt.value}
                  label={opt.label}
                  active={form.type === opt.value}
                  onClick={() => set("type", opt.value)}
                />
              ))}
            </View>
          </View>

          {/* Weight Options (Only for Loose) */}
          {form.type === "loose" && (
            <View style={styles.weightSection}>
              <View style={styles.weightHeader}>
                <Text style={LBL_STYLE}>Weight Options (Customer Picks)</Text>
                <TouchableOpacity
                  onPress={() => {
                    const next = [...form.weight_options, { weight: "", unit: "g" }];
                    set("weight_options", next);
                  }}
                  style={styles.addWeightBtn}
                >
                  <Text style={styles.addWeightBtnText}>+ Manual Entry</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.chipRow}>
                {[{w: 50, u: "g"}, {w: 100, u: "g"}, {w: 250, u: "g"}, {w: 500, u: "g"}, {w: 1, u: "kg"}].map((preset, i) => (
                  <TouchableOpacity
                    key={`preset-${i}`}
                    style={{
                      borderWidth: 1,
                      borderColor: T.primary,
                      backgroundColor: T.primaryLight,
                      borderRadius: 6,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                    }}
                    onPress={() => {
                      const exists = form.weight_options.some(
                        (o) => String(o.weight) === String(preset.w) && o.unit === preset.u
                      );
                      if (!exists) {
                        set("weight_options", [...form.weight_options, { weight: String(preset.w), unit: preset.u }]);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 11, color: T.primary, fontWeight: "700" }}>
                      + {preset.w}{preset.u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.weight_options.map((opt, idx) => (
                <View key={idx} style={styles.weightRow}>
                  <TextInput
                    style={[styles.input, { flex: 2, paddingVertical: 6 }]}
                    value={String(opt.weight)}
                    onChangeText={(v) => {
                      const next = [...form.weight_options];
                      next[idx].weight = v;
                      set("weight_options", next);
                    }}
                    placeholder="Value (e.g. 500)"
                    keyboardType="numeric"
                  />
                  <View style={[styles.chipRow, { flex: 3, marginTop: 0 }]}>
                    {["g", "kg"].map((u) => (
                      <SelectChip
                        key={u}
                        label={u}
                        active={opt.unit === u}
                        onClick={() => {
                          const next = [...form.weight_options];
                          next[idx].unit = u;
                          set("weight_options", next);
                        }}
                      />
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const next = form.weight_options.filter((_, i) => i !== idx);
                      set("weight_options", next);
                    }}
                    style={styles.removeWeightBtn}
                  >
                    <Text style={{ color: T.red, fontWeight: "800" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {form.weight_options.length === 0 && (
                <Text style={styles.hintText}>
                  Add fixed weights (e.g. 250g, 500g) for customers to choose from.
                </Text>
              )}
            </View>
          )}

          {/* Stock & Price */}
          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <Text style={LBL_STYLE}>Stock *</Text>
              <TextInput
                style={styles.input}
                value={form.stock}
                onChangeText={(v) => set("stock", v)}
                placeholder="e.g. 45"
                placeholderTextColor={T.textXLight}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowHalf}>
              <Text style={LBL_STYLE}>Price *</Text>
              <TextInput
                style={styles.input}
                value={form.price}
                onChangeText={(v) => set("price", v)}
                placeholder="e.g. 40"
                placeholderTextColor={T.textXLight}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Barcode */}
          <View>
            <Text style={LBL_STYLE}>Barcode (Optional)</Text>
            <TextInput
              style={styles.input}
              value={form.barcode}
              onChangeText={(v) => set("barcode", v)}
              placeholder="Scan or enter barcode"
              placeholderTextColor={T.textXLight}
            />
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            activeOpacity={0.8}
          >
            {saving && <Spinner size={16} color="#fff" />}
            <Text style={styles.submitBtnText}>
              {saving ? "Saving…" : editing ? "Save Changes" : "+ Add Product"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: T.textLight,
    fontWeight: "700",
    fontSize: 13,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 16,
    gap: 18,
  },
  input: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: T.text,
    backgroundColor: "#FAFAFA",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: T.textLight,
  },
  subCatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  selectedBadge: {
    backgroundColor: T.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.primaryDark,
  },
  noSubCatWrap: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "dashed",
  },
  noSubCatText: {
    fontSize: 12,
    color: T.textLight,
    lineHeight: 18,
  },
  breadcrumb: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  breadcrumbText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 14,
  },
  rowHalf: {
    flex: 1,
  },
  err: {
    fontSize: 12,
    color: T.red,
    fontWeight: "600",
  },
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: T.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  weightSection: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    gap: 10,
  },
  weightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addWeightBtn: {
    backgroundColor: T.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addWeightBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: T.primary,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  removeWeightBtn: {
    padding: 6,
  },
  hintText: {
    fontSize: 11,
    color: T.textLight,
    fontStyle: "italic",
  },
  imagePreviewWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  changeImageBtn: {
    backgroundColor: T.redLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeImageText: {
    fontSize: 12,
    color: T.red,
    fontWeight: "700",
  },
  imagePlaceholderWrap: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 60,
  },
  imageBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textMed,
  },
});
