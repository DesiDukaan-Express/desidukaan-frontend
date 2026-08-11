import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useAuthStore from "../store/authStore";
import useAddressStore from "../store/addressStore";

const { width: W, height: H } = Dimensions.get("window");

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    key: "customer",
    label: "Customer",
    sublabel: "Shop from nearby stores",
    icon: "shopping-bag",
    iconLib: "feather",
    gradientColors: ["#F97316", "#EA580C"],
    glowColor: "#F97316",
    bgGradient: ["#FFF7ED", "#FFEDD5"],
    lockGradient: ["#FED7AA", "#FDBA74"],
  },
  {
    key: "vendor",
    label: "Vendor",
    sublabel: "Manage your store",
    icon: "store",
    iconLib: "material",
    gradientColors: ["#10B981", "#059669"],
    glowColor: "#10B981",
    bgGradient: ["#ECFDF5", "#D1FAE5"],
    lockGradient: ["#A7F3D0", "#6EE7B7"],
  },
  {
    key: "delivery",
    label: "Delivery",
    sublabel: "Deliver & earn",
    icon: "bike",
    iconLib: "material",
    gradientColors: ["#6366F1", "#4F46E5"],
    glowColor: "#6366F1",
    bgGradient: ["#EEF2FF", "#E0E7FF"],
    lockGradient: ["#C7D2FE", "#A5B4FC"],
  },
];

// ─── Unlock modal ─────────────────────────────────────────────────────────────
function UnlockModal({ role, visible, onConfirm, onCancel, loading }) {
  if (!role) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={um.backdrop} onPress={onCancel}>
        <Pressable style={um.card} onPress={() => {}}>
          <LinearGradient colors={role.gradientColors} style={um.iconCircle}>
            <RoleIcon role={role} size={32} color="#fff" />
          </LinearGradient>
          <Text style={um.title}>Unlock {role.label} Mode</Text>
          <Text style={um.sub}>
            Add <Text style={[um.bold, { color: role.gradientColors[0] }]}>{role.label}</Text> access to your account.
            You can switch between roles anytime.
          </Text>
          <View style={um.btns}>
            <TouchableOpacity style={um.cancel} onPress={onCancel} disabled={loading}>
              <Text style={um.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[um.confirm, { backgroundColor: role.gradientColors[0] }]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={um.confirmText}>Enable</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const um = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#fff", borderRadius: 28, padding: 28, width: W * 0.85, alignItems: "center", gap: 10, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 30, elevation: 20 },
  iconCircle: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "900", color: "#111827", textAlign: "center" },
  sub: { fontSize: 13.5, color: "#6B7280", textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  bold: { fontWeight: "800" },
  btns: { flexDirection: "row", gap: 12, marginTop: 12, width: "100%" },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  confirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

// ─── Icon helper ──────────────────────────────────────────────────────────────
function RoleIcon({ role, size = 28, color = "#fff" }) {
  if (role.iconLib === "material") {
    return <MaterialCommunityIcons name={role.icon} size={size} color={color} />;
  }
  return <Feather name={role.icon} size={size} color={color} />;
}

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({ role, enabled, onPress, index }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120 + index * 90),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    if (enabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [enabled]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim, borderRadius: 28, overflow: "hidden" }}>
      <TouchableOpacity
        style={rc.card}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {/* Background gradient */}
        <LinearGradient
          colors={role.bgGradient}
          style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: "hidden" }]}
        />

        {/* Glow ring for enabled roles */}
        {enabled && (
          <Animated.View
            style={[rc.glowRing, { borderColor: role.glowColor, opacity: glowOpacity }]}
          />
        )}

        {/* Icon circle */}
        <View style={rc.iconWrap}>
          <LinearGradient colors={role.gradientColors} style={rc.iconCircle}>
            <RoleIcon role={role} size={36} color="#fff" />
          </LinearGradient>
          {/* Glow behind icon */}
          {enabled && (
            <View style={[rc.iconGlow, { backgroundColor: role.glowColor }]} />
          )}
        </View>

        {/* Text */}
        <Text style={rc.label}>{role.label}</Text>
        <Text style={rc.sublabel}>{role.sublabel}</Text>

        {/* Active indicator */}
        {!enabled && (
          <View style={rc.lockBadge}>
            <Feather name="lock" size={10} color="#6B7280" />
            <Text style={rc.lockText}>Locked</Text>
          </View>
        )}
        <View style={[rc.activeDot, { backgroundColor: role.gradientColors[0] }]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const CARD_SIZE = Math.min((W - 60) / 3, 140);

const rc = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.25,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    overflow: "hidden",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    paddingHorizontal: 4,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 2.5,
  },
  iconWrap: { position: "relative", marginBottom: 2 },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconGlow: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 20,
    opacity: 0.25,
    top: 4,
    left: 2,
    zIndex: -1,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  sublabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 13,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 2,
  },
  lockText: { fontSize: 9, color: "#6B7280", fontWeight: "600" },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RolePickerScreen({ onRolePicked }) {
  const { user, enabledRoles, setActiveRole, enableRole, logout } = useAuthStore();

  const [unlockTarget, setUnlockTarget] = useState(null);
  const [unlocking, setUnlocking]       = useState(false);
  const [logoutModal, setLogoutModal]   = useState(false);

  // ── Entry animations
  const bgAnim     = useRef(new Animated.Value(0)).current;
  const titleAnim  = useRef(new Animated.Value(-30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(60),
        Animated.parallel([
          Animated.spring(titleAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(taglineAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Handle card tap
  const handleRoleTap = async (role) => {
    if (!enabledRoles.includes(role.key)) {
      setUnlockTarget(role);
      return;
    }
    await setActiveRole(role.key);
    onRolePicked(role.key);
  };

  // ── Handle unlock confirm
  const handleUnlockConfirm = async () => {
    if (!unlockTarget) return;
    setUnlocking(true);
    const result = await enableRole(unlockTarget.key);
    setUnlocking(false);
    if (result.success) {
      setUnlockTarget(null);
      await setActiveRole(unlockTarget.key);
      onRolePicked(unlockTarget.key);
    } else {
      Alert.alert("Couldn't unlock", result.msg || "Please try again.");
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Deep dark background */}
      <LinearGradient
        colors={["#050f07", "#0a1f10", "#071a0c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs */}
      <Animated.View style={[s.blob1, { opacity: bgAnim }]} />
      <Animated.View style={[s.blob2, { opacity: bgAnim }]} />

      <SafeAreaView style={s.safe}>
        {/* ── Top bar */}
        <View style={s.topBar}>
          <View style={s.topRight}>
            <Text style={s.topName}>{user?.name || "Welcome"}</Text>
            <Text style={s.topPhone}>{user?.phone ? `+91 ${user.phone}` : ""}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={() => setLogoutModal(true)}>
            <Feather name="log-out" size={18} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* ── Title section */}
        <Animated.View
          style={[s.titleWrap, { opacity: titleOpacity, transform: [{ translateY: titleAnim }] }]}
        >
          <Text style={s.whoIs}>Who's using DesiDukaan?</Text>
          <Animated.Text style={[s.sub, { opacity: taglineAnim }]}>
            Choose your role to continue
          </Animated.Text>
        </Animated.View>

        {/* ── Role Cards */}
        <View style={s.cardsRow}>
          {ROLES.map((role, idx) => (
            <RoleCard
              key={role.key}
              role={role}
              enabled={enabledRoles.includes(role.key)}
              onPress={() => handleRoleTap(role)}
              index={idx}
            />
          ))}
        </View>

        {/* ── Hint */}
        <Animated.View style={[s.hintWrap, { opacity: taglineAnim }]}>
          <Feather name="info" size={12} color="rgba(255,255,255,0.3)" />
          <Text style={s.hint}>Tap a locked role to enable it</Text>
        </Animated.View>
      </SafeAreaView>

      {/* ── Unlock modal */}
      <UnlockModal
        role={unlockTarget}
        visible={!!unlockTarget}
        onConfirm={handleUnlockConfirm}
        onCancel={() => setUnlockTarget(null)}
        loading={unlocking}
      />

      {/* ── Logout confirm modal */}
      <Modal visible={logoutModal} transparent animationType="fade" onRequestClose={() => setLogoutModal(false)}>
        <Pressable style={lm.backdrop} onPress={() => setLogoutModal(false)}>
          <Pressable style={lm.card} onPress={() => {}}>
            <View style={lm.iconWrap}>
              <Feather name="log-out" size={26} color="#EF4444" />
            </View>
            <Text style={lm.title}>Log out?</Text>
            <Text style={lm.sub}>You'll need to log in again to access DesiDukaan.</Text>
            <View style={lm.btns}>
              <TouchableOpacity style={lm.cancel} onPress={() => setLogoutModal(false)}>
                <Text style={lm.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={lm.confirm} onPress={() => { setLogoutModal(false); logout(); }}>
                <Text style={lm.confirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1 },
  safe:  { flex: 1, alignItems: "center" },

  // Decorative blobs
  blob1: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "#10B981", opacity: 0.06, top: -60, right: -80,
  },
  blob2: {
    position: "absolute", width: 250, height: 250, borderRadius: 125,
    backgroundColor: "#F97316", opacity: 0.05, bottom: 100, left: -70,
  },

  // Top bar
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 24, paddingTop: Platform.OS === "android" ? 48 : 16,
    paddingBottom: 8, width: "100%",
  },
  avatar: { width: 44, height: 44, borderRadius: 14, overflow: "hidden" },
  avatarGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontWeight: "900", color: "#fff" },
  topRight: { flex: 1 },
  topName:  { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  topPhone: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },
  logoutBtn: { padding: 8 },

  // Title
  titleWrap: { alignItems: "center", marginTop: H * 0.06, marginBottom: H * 0.06, paddingHorizontal: 20 },
  whoIs: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 34,
  },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 8, textAlign: "center" },

  // Cards row
  cardsRow: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  // Hint
  hintWrap: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 36,
  },
  hint: { fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: "500" },
});

// Logout modal styles
const lm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 28, width: W * 0.82, alignItems: "center", gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "900", color: "#111827" },
  sub:   { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  btns:  { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: "#F3F4F6", alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: "#EF4444", alignItems: "center" },
  confirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
