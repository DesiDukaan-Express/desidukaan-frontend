import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { T } from "./tokens";

/**
 * Pagination - Page number navigation controls for paginated lists.
 */
function PgBtn({ label, active, disabled, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.btn,
        active && styles.btnActive,
        disabled && styles.btnDisabled,
      ]}
    >
      <Text
        style={[
          styles.btnLabel,
          active && styles.btnLabelActive,
          disabled && styles.btnLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const getVisible = () => {
    if (totalPages <= 7) return pages;
    if (page <= 4) return [...pages.slice(0, 5), "…", totalPages];
    if (page >= totalPages - 3)
      return [1, "…", ...pages.slice(totalPages - 5)];
    return [1, "…", page - 1, page, page + 1, "…", totalPages];
  };

  return (
    <View style={styles.row}>
      <PgBtn label="←" disabled={page === 1} onPress={() => onPage(page - 1)} />
      {getVisible().map((p, i) =>
        p === "…" ? (
          <Text key={`ellipsis-${i}`} style={styles.ellipsis}>
            …
          </Text>
        ) : (
          <PgBtn
            key={p}
            label={String(p)}
            active={p === page}
            onPress={() => onPage(p)}
          />
        )
      )}
      <PgBtn
        label="→"
        disabled={page === totalPages}
        onPress={() => onPage(page + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: T.green,
    borderColor: T.green,
  },
  btnDisabled: {
    backgroundColor: "#F9FAFB",
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: T.textMed,
  },
  btnLabelActive: {
    color: "#fff",
    fontWeight: "800",
  },
  btnLabelDisabled: {
    color: T.textXLight,
  },
  ellipsis: {
    width: 32,
    textAlign: "center",
    color: T.textXLight,
    fontSize: 13,
  },
});
