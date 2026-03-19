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

const TYPE_OPTS = ["Loose", "Packed", "Packed (Branded)"];

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
      stock: editing.stock,
      price: editing.price,
      status: editing.status,
      type : editing.type || "  "
    }
    : {
      name: "",
      description: "",
      category: "Vegetables",
      barcode: "",
      unit: "kg",
      stock: "",
      price: "",
      status: "In Stock",
      type : "Packed"
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
    await onSave(form);
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
              {
                TYPE_OPTS.map((elem , index) => {
                  return (
                  <SelectChip 
                    key={index}
                    label={elem}
                    active={form.type === elem}
                    onClick={() => set("type" , elem)}
                  />)
                })
              }
            </View>
          </View>

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
});
