import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { T } from "../common/tokens";

export default function LowStockBanner({ stats, onFilterLowStock }) {
  const [dismissed, setDismissed] = useState(false);
  const lowCount = stats?.lowStockItems ?? 0;
  const outCount = stats?.outOfStockItems ?? 0;

  if (dismissed || (lowCount === 0 && outCount === 0)) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.iconBox}>
        <Text style={{ fontSize: 18 }}>⚠️</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Inventory alert</Text>
        <Text style={styles.sub}>
          {lowCount > 0 && (
            <Text style={{ color: "#FDE68A", fontWeight: "700" }}>{lowCount} low</Text>
          )}
          {lowCount > 0 && outCount > 0 && <Text style={{ color: "rgba(255,255,255,0.5)" }}> · </Text>}
          {outCount > 0 && (
            <Text style={{ color: "#FCA5A5", fontWeight: "700" }}>{outCount} out of stock</Text>
          )}
        </Text>
      </View>
      <TouchableOpacity onPress={onFilterLowStock} style={styles.viewBtn}>
        <Text style={styles.viewBtnText}>View</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(249,115,22,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  title: { color: "#fff", fontSize: 13, fontWeight: "800" },
  sub: { fontSize: 12, marginTop: 2 },
  viewBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
});