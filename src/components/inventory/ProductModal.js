import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from "react-native";
import { T, CATEGORIES, STORES_OPTS, STATUS_OPTS, UNITS } from "../common/tokens";
import SelectChip from "../common/SelectChip";
import Spinner from "../common/Spinner";

const LBL_STYLE = {
  fontSize: 11,
  fontWeight: "700",
  color: T.textXLight,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const TYPE_OPTS = [
  { label: "Loose", value: "loose" },
  { label: "Packed", value: "packed" },
];

/**
 * ProductModal — Add or Edit product form, shown as a bottom-sheet style Modal.
 */
export default function ProductModal({ editing, onClose, onSave, saving }) {
    const init = editing
    ? {
        name: editing.name,
        description: editing.description || "",
        category: editing.category,
        barcode: editing.barcode || "",
        stock: String(editing.rawStock || 0),
        price: String(editing.price || 0),
        unit: editing.unit || "kg",
        type: editing.type || "packed",
        weight_options: editing.weight_options || [],
      }
    : {
        name: "",
        description: "",
        category: "Vegetables",
        barcode: "",
        unit: "kg",
        stock: "",
        price: "",
        type: "packed",
        weight_options: [],
      };

  const [form, setForm] = useState(init);
  const [err, setErr] = useState("");

  const set = (k, v) => {
    setErr("");
    setForm((f) => ({ ...f, [k]: v }));
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

    // Clean up weight options: ensure weights are numbers
    const cleanedOptions = form.weight_options
      .filter(opt => opt.weight && !isNaN(parseFloat(opt.weight)))
      .map(opt => ({ weight: parseFloat(opt.weight), unit: opt.unit }));

    if (form.type === "loose" && cleanedOptions.length === 0) {
      setErr("Please enter valid numeric weights.");
      return;
    }

    await onSave({ ...form, weight_options: cleanedOptions });
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
          {/* Name & Description */}
          <View>
            <Text style={LBL_STYLE}>Product Name *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => set("name", v)}
              placeholder="e.g. Tomatoes"
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

          {/* Category */}
          <View>
            <Text style={LBL_STYLE}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <SelectChip
                  key={c}
                  label={c}
                  active={form.category === c}
                  onClick={() => set("category", c)}
                />
              ))}
            </View>
          </View>


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
                {[{w: 50, u: 'g'}, {w: 100, u: 'g'}, {w: 250, u: 'g'}, {w: 500, u: 'g'}, {w: 1, u: 'kg'}].map((preset, i) => (
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
    maxHeight: "85%",
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
    paddingBottom: 32,
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
});
