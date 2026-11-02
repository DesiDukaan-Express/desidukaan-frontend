
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useAuthStore from "../store/authStore";

// ─── Role definitions ────────────────────────────────────────────────────────
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
  },
];

// ─── Icon helper ─────────────────────────────────────────────────────────────
function RoleIcon({ role, size = 28, color = "#fff" }) {
  if (role.iconLib === "material") {
    return (
      <MaterialCommunityIcons
        name={role.icon}
        size={size}
        color={color}
      />
    );
  }

  return <Feather name={role.icon} size={size} color={color} />;
}

// ─── Role Card ──────────────────────────────────────────────────────────────
function RoleCard({
  role,
  enabled,
  onPress,
  index,
  cardWidth,
  cardHeight,
  isCompact,
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120 + index * 90),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    if (enabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [enabled]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });

  const iconCircleSize = isCompact
    ? Math.min(52, cardWidth * 0.45)
    : Math.min(68, cardWidth * 0.45);

  const iconSize = isCompact ? 24 : 32;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: scaleAnim,
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        style={[
          rc.card,
          {
            width: cardWidth,
            height: cardHeight,
            paddingVertical: 8,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={role.bgGradient}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 24, overflow: "hidden" },
          ]}
        />

        {enabled && (
          <Animated.View
            style={[
              rc.glowRing,
              {
                borderColor: role.glowColor,
                opacity: glowOpacity,
              },
            ]}
          />
        )}

        <View style={rc.iconWrap}>
          <LinearGradient
            colors={role.gradientColors}
            style={[
              rc.iconCircle,
              {
                width: iconCircleSize,
                height: iconCircleSize,
                borderRadius: iconCircleSize / 3,
              },
            ]}
          >
            <RoleIcon
              role={role}
              size={iconSize}
              color="#fff"
            />
          </LinearGradient>

          {enabled && (
            <View
              style={[
                rc.iconGlow,
                {
                  backgroundColor: role.glowColor,
                  width: iconCircleSize,
                  height: iconCircleSize,
                  borderRadius: iconCircleSize / 3,
                },
              ]}
            />
          )}
        </View>

        <Text
          style={rc.label}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {role.label}
        </Text>

        <Text
          style={rc.sublabel}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {role.sublabel}
        </Text>

        <View
          style={[
            rc.activeDot,
            { backgroundColor: role.gradientColors[0] },
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Role card styles ────────────────────────────────────────────────────────
const rc = StyleSheet.create({
  card: {
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
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
    paddingVertical: 10,
  },

  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 2.5,
  },

  iconWrap: {
    position: "relative",
    marginBottom: 4,
  },

  iconCircle: {
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
    opacity: 0.25,
    top: 4,
    left: 2,
    zIndex: -1,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0,
    textAlign: "center",
    width: "100%",
    lineHeight: 17,
    marginTop: 2,
  },

  sublabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 14,
    width: "100%",
    paddingHorizontal: 2,
    marginTop: 2,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 2,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RolePickerScreen({ onRolePicked }) {
  const { user, enabledRoles, setActiveRole, logout } = useAuthStore();

  const { width: winWidth, height: winHeight } =
    useWindowDimensions();

  const [logoutModal, setLogoutModal] = useState(false);

  // Responsive calculations
  const isSmallMobile = winWidth < 380;
  const isMobile = winWidth < 640;

  const cardGap = isSmallMobile ? 8 : 12;
  const horizontalPadding = isMobile ? 24 : 40;

  const availableWidth =
    winWidth - horizontalPadding - cardGap * 2;

  const cardWidth = Math.min(
    isMobile ? 150 : 160,
    Math.floor(availableWidth / 3)
  );

  const cardHeight = Math.max(
    150,
    Math.round(cardWidth * 1.3)
  );

  // Entry animations
  const bgAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(-30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),

      Animated.sequence([
        Animated.delay(60),
        Animated.parallel([
          Animated.spring(titleAnim, {
            toValue: 0,
            tension: 55,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]),

      Animated.sequence([
        Animated.delay(200),
        Animated.timing(taglineAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Handle role selection
  const handleRoleTap = async (role) => {
    await setActiveRole(role.key);
    onRolePicked(role.key);
  };

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Background */}
      <LinearGradient
        colors={["#050f07", "#0a1f10", "#071a0c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs */}
      <Animated.View
        style={[
          s.blob1,
          { opacity: bgAnim },
        ]}
      />

      <Animated.View
        style={[
          s.blob2,
          { opacity: bgAnim },
        ]}
      />

      {/* Main content */}
      <View style={s.scrollContent}>
        {/* Header */}
        <View style={s.topBar}>
          <View style={s.topRight}>
            <Text style={s.topName}>
              {user?.name || "Welcome"}
            </Text>

            <Text style={s.topPhone}>
              {user?.phone ? `+91 ${user.phone}` : ""}
            </Text>
          </View>

          <TouchableOpacity
            style={s.logoutBtn}
            onPress={() => setLogoutModal(true)}
          >
            <Feather
              name="log-out"
              size={18}
              color="rgba(255,255,255,0.7)"
            />
          </TouchableOpacity>
        </View>

        {/* Center content */}
        <View style={s.centerContent}>
          {/* Title */}
          <Animated.View
            style={[
              s.titleWrap,
              {
                opacity: titleOpacity,
                transform: [{ translateY: titleAnim }],
              },
            ]}
          >
            <Text
              style={[
                s.whoIs,
                isSmallMobile && { fontSize: 22 },
              ]}
            >
              Who's using KwikPik?
            </Text>

            <Animated.Text
              style={[
                s.sub,
                { opacity: taglineAnim },
              ]}
            >
              Choose your role to continue
            </Animated.Text>
          </Animated.View>

          {/* Role cards */}
          <View
            style={[
              s.cardsRow,
              { gap: cardGap },
            ]}
          >
            {ROLES.map((role, idx) => (
              <RoleCard
                key={role.key}
                role={role}
                enabled={enabledRoles.includes(role.key)}
                onPress={() => handleRoleTap(role)}
                index={idx}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                isCompact={isSmallMobile}
              />
            ))}
          </View>

          {/* Hint */}
          <Animated.View
            style={[
              s.hintWrap,
              { opacity: taglineAnim },
            ]}
          />
        </View>
      </View>
      {/* IMPORTANT: scrollContent is now closed here */}

      {/* Logout confirmation modal */}
      <Modal
        visible={logoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModal(false)}
      >
        <Pressable
          style={lm.backdrop}
          onPress={() => setLogoutModal(false)}
        >
          <Pressable
            style={[
              lm.card,
              { width: Math.min(winWidth * 0.85, 340) },
            ]}
            onPress={() => {}}
          >
            <View style={lm.iconWrap}>
              <Feather
                name="log-out"
                size={26}
                color="#EF4444"
              />
            </View>

            <Text style={lm.title}>
              Log out?
            </Text>

            <Text style={lm.sub}>
              You'll need to log in again to access DesiDukaan.
            </Text>

            <View style={lm.btns}>
              <TouchableOpacity
                style={lm.cancel}
                onPress={() => setLogoutModal(false)}
              >
                <Text style={lm.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={lm.confirm}
                onPress={() => {
                  setLogoutModal(false);
                  logout();
                }}
              >
                <Text style={lm.confirmText}>
                  Log out
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Main styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },

  scrollContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingBottom: 10,
    overflow: "hidden",
  },

  centerContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  blob1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#10B981",
    opacity: 0.06,
    top: -60,
    right: -80,
  },

  blob2: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#F97316",
    opacity: 0.05,
    bottom: 100,
    left: -70,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    flexShrink: 0,
  },

  topRight: {
    flex: 1,
  },

  topName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  topPhone: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },

  logoutBtn: {
    padding: 8,
  },

  titleWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 28,
  },

  whoIs: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 32,
  },

  sub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 6,
    textAlign: "center",
  },

  cardsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 600,
    paddingHorizontal: 0,
    marginVertical: 0,
  },

  hintWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    marginBottom: 12,
  },
});

// ─── Logout modal styles ─────────────────────────────────────────────────────
const lm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  sub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },

  btns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },

  cancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },

  confirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },

  confirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
