import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { T } from "./tokens";

export default function ToastBanner({ message, visible, type = "success" }) {
  const bg        = type === "danger" ? "#7F1D1D" : "#111827";
  const icon      = type === "danger" ? "⚠" : "✓";
  const iconColor = type === "danger" ? "#FCA5A5" : "#4ADE80";

  if (!visible) return null;

  return (
    <View style={[styles.toast, { backgroundColor: bg }]}>
      <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 11,
    zIndex: 9999,
    pointerEvents: "none",       // ← moved here from JSX prop
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  icon:    { fontSize: 15, fontWeight: "700" },
  message: { color: "#fff", fontSize: 13, fontWeight: "600" },
});