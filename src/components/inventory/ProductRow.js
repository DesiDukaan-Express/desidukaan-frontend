import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { T } from "../common/tokens";
import CheckBox from "../common/CheckBox";
import StatusPill from "../common/StatusPill";

/**
 * ProductRow — Renders a single product row in the inventory list.
 */
export default function ProductRow({ product, selected, onSelect, onEdit, onDelete }) {
  const [menuOpen, setMenu] = useState(false);

  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      {/* Checkbox */}
      <View style={styles.cell}>
        <CheckBox checked={selected} onChange={() => onSelect(product.id)} />
      </View>

      {/* Product Info */}
      <View style={styles.infoCell}>
        <Text style={styles.productId}>{product.id}</Text>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.productMeta}>{product.category}</Text>
      </View>

      {/* Stock & Price */}
      <View style={styles.detailCell}>
        <Text style={styles.stock}>{product.stock}</Text>
        <Text style={styles.price}>{product.price}</Text>
      </View>

      {/* Status */}
      <View style={styles.statusCell}>
        <StatusPill status={product.status} storeCount={product.storeCount || 0} />
      </View>

      {/* Actions */}
      <View style={styles.actionCell}>
        <TouchableOpacity
          onPress={() => onEdit(product)}
          style={styles.editBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>✎ Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMenu((v) => !v)}
          style={styles.dotsBtn}
          activeOpacity={0.75}
        >
          <Text style={styles.dotsBtnText}>⋯</Text>
        </TouchableOpacity>

        {menuOpen && (
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenu(false); onEdit(product); }}
            >
              <Text style={[styles.menuLabel, { color: T.textMed }]}>✏️  Edit product</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
    gap: 8,
  },
  rowSelected: {
    backgroundColor: "#F0FDF4",
  },
  cell: {
    // checkbox
  },
  infoCell: {
    flex: 3,
    minWidth: 0,
  },
  detailCell: {
    flex: 2,
    alignItems: "flex-start",
  },
  statusCell: {
    flex: 2,
  },
  actionCell: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  productId: {
    color: "#15803D",
    fontWeight: "700",
    fontSize: 11,
  },
  productName: {
    fontWeight: "700",
    color: T.text,
    fontSize: 13,
  },
  productMeta: {
    color: T.textLight,
    fontSize: 11,
    marginTop: 1,
  },
  stock: {
    color: T.textMed,
    fontSize: 13,
    fontWeight: "600",
  },
  price: {
    color: T.textLight,
    fontSize: 12,
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: T.green,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  dotsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsBtnText: {
    color: T.textXLight,
    fontSize: 16,
    letterSpacing: 2,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 36,
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
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F9FAFB",
  },
});
