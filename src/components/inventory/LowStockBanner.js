import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { T } from "../common/tokens";

/**
 * LowStockBanner - Warning banner shown when the vendor has items with low or zero stock.
 * Dismissible by the user.
 */
export default function LowStockBanner({ stats, onFilterLowStock }) {
  const [dismissed, setDismissed] = useState(false);
  const lowCount = stats?.lowStockItems ?? 0;
  const outCount = stats?.outOfStockItems ?? 0;

  if (dismissed || (lowCount === 0 && outCount === 0)) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 20 }}>⚠️</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Inventory Alert — Immediate attention required</Text>
        <View style={styles.countsRow}>
          {lowCount > 0 && (
            <Text style={styles.countText}>
              <Text style={styles.countYellow}>
                {lowCount} item{lowCount !== 1 ? "s" : ""}
              </Text>{" "}
              running low on stock
            </Text>
          )}
          {outCount > 0 && (
            <Text style={styles.countText}>
              <Text style={styles.countRed}>
                {outCount} item{outCount !== 1 ? "s" : ""}
              </Text>{" "}
              completely out of stock
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onFilterLowStock} style={styles.actionBtn} activeOpacity={0.8}>
          <Text style={styles.actionBtnText}>View Low Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.dismissBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#9A3412",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#EA580C",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 3,
  },
  countsRow: {
    gap: 4,
  },
  countText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  countYellow: {
    color: "#FDE68A",
    fontWeight: "700",
  },
  countRed: {
    color: "#FCA5A5",
    fontWeight: "700",
  },
  actions: {
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
});
