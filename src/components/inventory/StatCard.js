import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { T } from "../common/tokens";

export default function StatCard({ icon, label, value, badge, badgeColor, accentColor, iconBg }) {
  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {badge != null && badge > 0 && (
            <View style={[styles.badge, { backgroundColor: badgeColor + "22" }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.value, { color: accentColor }]}>{value ?? "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flex: 1,
    borderLeftWidth: 4,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  info: { flex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  label: { fontSize: 11, color: T.textLight, fontWeight: "600" },
  badge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  value: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
});