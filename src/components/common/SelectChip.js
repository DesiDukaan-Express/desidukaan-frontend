import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { T } from "./tokens";

/**
 * SelectChip - A toggle-able chip button for filter selections.
 */
export default function SelectChip({ label, active, onClick }) {
  return (
    <TouchableOpacity
      onPress={onClick}
      activeOpacity={0.75}
      style={[
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
      ]}
    >
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: T.green,
    borderColor: T.green,
  },
  chipInactive: {
    backgroundColor: "#fff",
    borderColor: T.border,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  labelActive: {
    color: "#fff",
  },
  labelInactive: {
    color: T.textLight,
  },
});
