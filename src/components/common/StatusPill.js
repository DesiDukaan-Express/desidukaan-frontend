import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { T, STATUS_CFG } from "./tokens";

/**
 * StatusPill - Displays a colored badge for product stock status.
 * Works with "In Stock", "Low Stock", "Out of Stock".
 */
export default function StatusPill({ status, storeCount }) {
  const c = STATUS_CFG[status] || {
    bg: "#f3f4f6",
    color: "#555",
    border: "#e5e7eb",
  };

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.pill,
          { backgroundColor: c.bg, borderColor: c.border },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: c.color }]} />
        <Text style={[styles.label, { color: c.color }]}>{status}</Text>
      </View>
      {status === "Low Stock" && storeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{storeCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    backgroundColor: T.orange,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
});
