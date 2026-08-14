import React from "react";
import { TouchableOpacity, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Shared "Use current location" row used in both the customer app's address
// picker and the vendor onboarding Shop Address form.
//
// Matches the original design: location pin in a green circle, bold
// "Use current location" title, "Detect my location" subtitle, right chevron.
const C = {
  green: "#16A34A",
  greenLight: "#F0FDF4",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray900: "#111827",
  white: "#FFFFFF",
};

export default function UseCurrentLocationButton({
  onPress,
  loading = false,
  disabled = false,
  title,
  subtitle,
  style,
}) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={[styles.row, style]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator size="small" color={C.green} />
        ) : (
          <MaterialIcons name="my-location" size={20} color={C.green} />
        )}
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title || t("home.useLocation")}</Text>
        <Text style={styles.sub}>{subtitle || t("home.detectLocation")}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={C.gray400} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.gray200,
    backgroundColor: C.white,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: C.gray900 },
  sub: { fontSize: 12, color: C.gray500, marginTop: 2 },
});
