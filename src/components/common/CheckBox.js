import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { T } from "./tokens";

/**
 * CheckBox - A custom checkbox component using TouchableOpacity (React Native safe).
 */
export default function CheckBox({ checked, onChange, indeterminate }) {
  return (
    <TouchableOpacity
      onPress={onChange}
      style={[
        styles.box,
        checked || indeterminate
          ? styles.boxActive
          : styles.boxInactive,
        checked && styles.boxChecked,
      ]}
      activeOpacity={0.7}
    >
      {checked && (
        <Text style={styles.checkMark}>✓</Text>
      )}
      {indeterminate && !checked && (
        <Text style={[styles.checkMark, { color: T.green }]}>—</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  boxInactive: {
    borderColor: T.border,
    backgroundColor: "#fff",
  },
  boxActive: {
    borderColor: T.green,
  },
  boxChecked: {
    backgroundColor: T.green,
  },
  checkMark: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
});
