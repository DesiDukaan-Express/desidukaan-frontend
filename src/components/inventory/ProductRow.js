import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { T } from "../common/tokens";
import CheckBox from "../common/CheckBox";

export default function ProductRow({ product, selected, onSelect, onEdit, onDelete }) {
  const [menuOpen, setMenu] = useState(false);

  const stockQty   = product.rawStock ?? 0;
  const threshold  = product.lowStockThreshold ?? 5;
  const maxDisplay = Math.max(stockQty, threshold * 4, 20);
  const barPct     = stockQty <= 0 ? 0 : Math.min((stockQty / maxDisplay) * 100, 100);

  const statusStyle =
    product.status === "Out of Stock" ? styles.pillOut
    : product.status === "Low Stock"  ? styles.pillLow
    : styles.pillIn;

  const statusTextStyle =
    product.status === "Out of Stock" ? styles.pillTextOut
    : product.status === "Low Stock"  ? styles.pillTextLow
    : styles.pillTextIn;

  const barColor =
    product.status === "Out of Stock" ? "#EF4444"
    : product.status === "Low Stock"  ? "#F97316"
    : "#15803D";

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <CheckBox checked={selected} onChange={() => onSelect(product.id)} />

        {/* Product identity */}
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.category} numberOfLines={1}>{product.category}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onEdit(product)} style={styles.editBtn} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>✎ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMenu((v) => !v)}
            style={styles.dotsBtn}
            activeOpacity={0.75}
          >
            <Text style={styles.dotsTxt}>···</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Price + status */}
      <View style={styles.metaRow}>
        <Text style={styles.price}>{product.price}</Text>
        <View style={[styles.pill, statusStyle]}>
          <Text style={[styles.pillText, statusTextStyle]}>{product.status}</Text>
        </View>
      </View>

      {/* Stock bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${barPct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.unitsLabel}>{stockQty} units remaining</Text>

      {/* Context menu */}
      {menuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { setMenu(false); onEdit(product); }}
          >
            <Text style={styles.menuLabel}>✏️  Edit product</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { setMenu(false); onDelete(product.id); }}
          >
            <Text style={[styles.menuLabel, { color: T.red }]}>🗑  Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardSelected: {
    backgroundColor: "#F0FDF4",
    shadowColor: T.primary,
    shadowOpacity: 0.12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  nameBlock: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "700", color: T.text },
  category: { fontSize: 11, color: T.textLight, marginTop: 2 },
  actions: { flexDirection: "row", gap: 6, alignItems: "center" },
  editBtn: {
    backgroundColor: T.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  dotsBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsTxt: { color: T.textXLight, fontSize: 16, letterSpacing: 1, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  price: { fontSize: 13, fontWeight: "800", color: T.text },
  pill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  pillIn:  { backgroundColor: "#ECFDF5" },
  pillLow: { backgroundColor: "#FFF7ED" },
  pillOut: { backgroundColor: "#FEF2F2" },
  pillText: { fontSize: 10, fontWeight: "800" },
  pillTextIn:  { color: "#15803D" },
  pillTextLow: { color: "#C2410C" },
  pillTextOut: { color: "#B91C1C" },
  barTrack: {
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 4,
  },
  barFill: { height: 4, borderRadius: 999 },
  unitsLabel: { fontSize: 10, color: T.textXLight },
  menu: {
    position: "absolute",
    right: 14,
    top: 52,
    zIndex: 50,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    minWidth: 155,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 11 },
  menuLabel: { fontSize: 13, fontWeight: "600", color: T.textMed },
  menuDivider: { height: 1, backgroundColor: "#F9FAFB" },
});