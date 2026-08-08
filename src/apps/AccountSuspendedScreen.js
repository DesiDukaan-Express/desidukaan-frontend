import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";

// ─── Account Suspended block screen (vendor) ────────────────────────────────
// Shown when the vendor's shop has been suspended by an admin. Mirrors the
// customer AccountDeactivatedScreen: it is a hard gate rendered in place of
// the vendor app, with "Reload" as the only action. The block is lifted live
// via the "vendor:reactivated" socket event (or on next login/reload).
export default function AccountSuspendedScreen() {
  const { t } = useTranslation();
  const hydrate = useAuthStore((s) => s.hydrate);

  const handleReload = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.reload();
      return;
    }
    // Native: re-check the session in place (no navigation back into the app).
    hydrate();
  };

  return (
    <LinearGradient
      colors={["#1a0f04", "#3a2410", "#4d2f15"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Feather name="alert-triangle" size={40} color="#FEF3C7" />
        </View>

        <Text style={styles.title}>{t("suspended.title")}</Text>
        <Text style={styles.message}>{t("suspended.message")}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleReload}
          activeOpacity={0.85}
        >
          <Feather name="refresh-cw" size={16} color="#1a0f04" />
          <Text style={styles.buttonText}>{t("suspended.reload")}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>{t("suspended.supportHint")}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    maxWidth: 380,
    width: "88%",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "PlusJakartaSans_800ExtraBold",
  },
  message: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 32,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
  },
  buttonText: {
    color: "#1a0f04",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans_700Bold",
  },
  hint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    fontFamily: "PlusJakartaSans_500Medium",
  },
});
