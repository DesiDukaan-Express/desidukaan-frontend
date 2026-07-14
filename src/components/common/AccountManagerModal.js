import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../../store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

const C = {
  greenDeep: "#04160e",
  greenDark: "#093a24",
  greenMid: "#0b5133",
  greenBright: "#10B981",
  greenLight: "#E6FBF0",
  orange: "#F97316",
  white: "#FFFFFF",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray900: "#111827",
};

const ROLE_INFO = {
  customer: { label: "Customer Profile", icon: "shopping-bag", color: C.greenBright },
  vendor: { label: "Vendor Dashboard", icon: "home", color: C.orange },
  delivery: { label: "Delivery Console", icon: "truck", color: C.greenDark },
};

export default function AccountManagerModal({ visible, onClose }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { user, token, switchRole, addProfile } = useAuthStore();
  
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchProfiles();
    }
  }, [visible]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setProfiles(data.profiles || []);
      } else {
        Alert.alert("Error", data.msg || "Failed to load profiles");
      }
    } catch (e) {
      console.error("Fetch profiles error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (role) => {
    if (switching) return;
    setSwitching(role);
    try {
      await switchRole(role);
      onClose();
    } catch (e) {
      Alert.alert("Failed to switch", e.message || "Something went wrong");
    } finally {
      setSwitching(null);
    }
  };

  const handleAddProfile = async (role) => {
    if (switching) return;
    setSwitching(role);
    try {
      await addProfile(role);
      onClose();
    } catch (e) {
      Alert.alert("Failed to add profile", e.message || "Something went wrong");
    } finally {
      setSwitching(null);
    }
  };

  const availableRoles = ["customer", "vendor", "delivery"];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          {/* Handle bar */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={s.headerTitle}>Manage Accounts</Text>
              <Text style={s.headerSub}>Switch role profiles or add linked accounts</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color={C.gray500} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.loaderWrap}>
              <ActivityIndicator size="large" color={C.greenBright} />
              <Text style={s.loaderText}>Checking profiles…</Text>
            </View>
          ) : (
            <View style={s.list}>
              {availableRoles.map((role) => {
                const existing = profiles.find((p) => p.role === role);
                const isActive = user?.role === role;
                const info = ROLE_INFO[role];

                if (existing) {
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[
                        s.profileRow,
                        isActive && s.profileRowActive,
                        switching === role && s.profileRowSwitching,
                      ]}
                      onPress={() => !isActive && handleSwitch(role)}
                      disabled={isActive || switching !== null}
                      activeOpacity={0.8}
                    >
                      <View style={[s.iconBox, { backgroundColor: info.color + "15" }]}>
                        <Feather name={info.icon} size={20} color={info.color} />
                      </View>
                      <View style={s.profileInfo}>
                        <Text style={s.profileLabel}>{info.label}</Text>
                        <Text style={s.profileName}>{existing.name || user.name}</Text>
                      </View>
                      {isActive ? (
                        <View style={s.activeBadge}>
                          <Text style={s.activeBadgeText}>Active</Text>
                        </View>
                      ) : switching === role ? (
                        <ActivityIndicator size="small" color={C.greenBright} />
                      ) : (
                        <Feather name="chevron-right" size={16} color={C.gray400} />
                      )}
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[s.addAccountRow, switching === role && { opacity: 0.7 }]}
                      onPress={() => handleAddProfile(role)}
                      disabled={switching !== null}
                      activeOpacity={0.8}
                    >
                      <View style={s.dashedIconBox}>
                        <Feather name="plus" size={20} color={C.greenMid} />
                      </View>
                      <View style={s.profileInfo}>
                        <Text style={s.addAccountLabel}>Add {role.charAt(0).toUpperCase() + role.slice(1)} Profile</Text>
                        <Text style={s.addAccountSub}>Register to use this app as a {role}</Text>
                      </View>
                      {switching === role ? (
                        <ActivityIndicator size="small" color={C.greenMid} />
                      ) : (
                        <Feather name="plus" size={16} color={C.greenMid} />
                      )}
                    </TouchableOpacity>
                  );
                }
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 44 : 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.gray200,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.gray900,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: C.gray500,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: C.gray400,
    fontWeight: "500",
  },
  list: {
    gap: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    backgroundColor: C.gray100,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  profileRowActive: {
    backgroundColor: C.greenLight,
    borderColor: C.greenBright + "40",
  },
  profileRowSwitching: {
    opacity: 0.7,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.gray900,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: C.greenBright,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
    textTransform: "uppercase",
  },
  addAccountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.gray200,
    borderStyle: "dashed",
    backgroundColor: C.white,
  },
  dashedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.greenMid + "40",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    backgroundColor: C.greenLight + "40",
  },
  addAccountLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: C.greenMid,
  },
  addAccountSub: {
    fontSize: 11,
    color: C.gray400,
    marginTop: 2,
  },
});
