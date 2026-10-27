import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import useAuthStore from "../store/authStore";

const C = {
  white: "#FFFFFF",
  bg: "#F0F4F8",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray900: "#111827",
  red: "#EF4444",
  redDark: "#DC2626",
  redLight: "#FEF2F2",
  redBorder: "#FECACA",
};

export default function LogoutButton() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    setVisible(false);
    logout();
  };

  return (
    <>
      {/* Floating button */}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        style={styles.fab}
      >
        <MaterialIcons name="power-settings-new" size={20} color={C.white} />
      </TouchableOpacity>

      {/* Confirmation modal */}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.iconWrap}>
              <MaterialIcons name="power-settings-new" size={28} color={C.red} />
            </View>
            <Text style={styles.title}>{t("common.logout") || "Log Out"}</Text>
            <Text style={styles.desc}>
              {t("common.logoutConfirm") || "Are you sure you want to log out? You'll need to sign in again."}
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>{t("common.cancel") || "Cancel"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutText}>{t("common.logout") || "Log Out"}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = {
  fab: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 100 : 88,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.red,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
    borderWidth: 3,
    borderColor: C.white,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.redLight,
    borderWidth: 1.5,
    borderColor: C.redBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: C.gray900,
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    color: C.gray600,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.gray100,
    borderWidth: 1,
    borderColor: C.gray200,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.gray600,
  },
  logoutBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.red,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white,
  },
};
