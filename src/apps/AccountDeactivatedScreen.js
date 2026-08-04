import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";

// ─── Account Deactivated block screen ───────────────────────────────────────
// Shown when the logged-in account has been deactivated by an admin.
// It is a hard gate: renders in place of the entire app and offers no way to
// dismiss it. The only action is "Reload" (re-runs hydrate on native, full
// page reload on web). The session stays locked until the admin reactivates.
export default function AccountDeactivatedScreen() {
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
      colors={["#04160e", "#093a24", "#0b5133"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Feather name="alert-octagon" size={40} color="#FEF2F2" />
        </View>

        <Text style={styles.title}>{t("deactivated.title")}</Text>
        <Text style={styles.message}>{t("deactivated.message")}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleReload}
          activeOpacity={0.85}
        >
          <Feather name="refresh-cw" size={16} color="#04160e" />
          <Text style={styles.buttonText}>{t("deactivated.reload")}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>{t("deactivated.supportHint")}</Text>
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
    color: "#04160e",
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
