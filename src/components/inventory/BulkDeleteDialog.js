import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { T } from "../common/tokens";
import Spinner from "../common/Spinner";
import { Feather } from "@expo/vector-icons";

/**
 * BulkDeleteDialog - A confirmation modal shown before bulk-deleting selected products.
 */
export default function BulkDeleteDialog({ count, onConfirm, onCancel, saving }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Feather name="trash-2" size={24} color="#EF4444" />
        </View>

        <Text style={styles.title}>
          Delete {count} product{count !== 1 ? "s" : ""}?
        </Text>

        <Text style={styles.description}>
          This will permanently remove {count} selected product{count !== 1 ? "s" : ""}{" "}
          from your inventory. This action cannot be undone.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={saving}
            style={[styles.btn, styles.btnCancel]}
            activeOpacity={0.75}
          >
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onConfirm}
            disabled={saving}
            style={[styles.btn, styles.btnDelete, saving && styles.btnDisabled]}
            activeOpacity={0.75}
          >
            {saving && <Spinner size={15} color="#fff" />}
            <Text style={styles.btnDeleteText}>
              {saving ? "Deleting…" : "Delete"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    zIndex: 1100,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: T.redLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: T.textLight,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnCancel: {
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: "#fff",
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textMed,
  },
  btnDelete: {
    backgroundColor: T.red,
  },
  btnDeleteText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
