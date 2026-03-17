import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { T } from "../common/tokens";

/**
 * StatCard - Displays a single KPI metric card on the Inventory screen.
 */
export default function StatCard({
  icon,
  label,
  value,
  sub,
  badge,
  badgeColor,
  accentColor,
  iconBg,
}) {
  return (
    <View style={[styles.card]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Text style={{ color: accentColor, fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {badge != null && badge > 0 && (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value ?? "—"}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: T.textLight,
    fontWeight: "500",
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: "900",
    color: T.text,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 12,
    color: T.textXLight,
    fontWeight: "500",
  },
});
