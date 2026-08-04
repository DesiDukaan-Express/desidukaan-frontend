import React, { useState, useRef, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, Platform, Animated, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { io } from "socket.io-client";

import useAuthStore from "../store/authStore";
import DashboardScreen from "../apps/vendor/DashboardScreen";
import InventoryScreen from "../apps/vendor/InventoryScreen";
import VendorOrdersScreen from "../apps/vendor/VendorOrdersScreen";
import EarningsScreen from "../apps/vendor/EarningsScreen";
import VendorProfileScreen from "../apps/vendor/VendorProfileScreen";

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3007";
const Tab = createBottomTabNavigator();

export default function VendorTabs() {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [declineBanner, setDeclineBanner] = useState(null);
  const declineBannerAnim = useRef(new Animated.Value(-120)).current;
  const declineBannerTimer = useRef(null);
  const declineCountdownInterval = useRef(null);
  const navRef = useRef(null);

  // ─── Decline Flash Banner ───────────────────────────────
  const showDeclineBanner = (data, declinedAt) => {
    if (declineBannerTimer.current) clearTimeout(declineBannerTimer.current);
    setDeclineBanner({ ...data, declinedAt });
    Animated.spring(declineBannerAnim, {
      toValue: 0,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    declineBannerTimer.current = setTimeout(() => {
      Animated.timing(declineBannerAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDeclineBanner(null));
    }, 6000);
  };

  const dismissDeclineBanner = () => {
    if (declineBannerTimer.current) clearTimeout(declineBannerTimer.current);
    if (declineCountdownInterval.current) clearInterval(declineCountdownInterval.current);
    Animated.timing(declineBannerAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setDeclineBanner(null));
  };

  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("delivery:declined", (data) => {
      console.log("[VendorTabs] delivery:declined", data);
      const declinedAt = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      showDeclineBanner(data, declinedAt);
    });

    return () => {
      if (declineBannerTimer.current) clearTimeout(declineBannerTimer.current);
      if (declineCountdownInterval.current) clearInterval(declineCountdownInterval.current);
      socket.disconnect();
    };
  }, [token]);

  const handleBannerPress = () => {
    dismissDeclineBanner();
    navRef.current?.navigate("Orders");
  };

  const TABS = [
    { name: "Dashboard", icon: "bar-chart",    label: t('vendor.dashboard'), component: DashboardScreen },
    { name: "Inventory", icon: "inventory",    label: t('vendor.inventory'), component: InventoryScreen },
    { name: "Orders",    icon: "receipt-long", label: t('vendor.orders'),    component: VendorOrdersScreen },
    { name: "Earnings",  icon: "payments",     label: t('vendor.earnings'),  component: EarningsScreen },
    { name: "Profile",   icon: "person",       label: t('profile.title'),    component: VendorProfileScreen },
  ];

  return (
    <View style={styles.root}>
      {declineBanner && (
        <Animated.View
          style={[
            styles.flashBanner,
            { top: insets.top + 8, transform: [{ translateY: declineBannerAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.flashBody}
            activeOpacity={0.85}
            onPress={handleBannerPress}
          >
            <MaterialIcons name="replay" size={18} color="#FCA5A5" style={styles.flashIcon} />
            <View style={styles.flashTextWrap}>
              <Text style={styles.flashTitle} numberOfLines={1}>
                Order #{declineBanner.order_id} Declined
              </Text>
              <Text style={styles.flashText} numberOfLines={1}>
                {declineBanner.partner_name} declined the delivery request
              </Text>
              <Text style={styles.flashTime}>{declineBanner.declinedAt}</Text>
            </View>
            <Text style={styles.flashAction}>TAP TO ASSIGN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={dismissDeclineBanner}
          >
            <MaterialIcons name="close" size={18} color="#FCA5A5" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.tabContainer}>
        <Tab.Navigator
          ref={navRef}
          lazy={false}
          screenOptions={({ route }) => {
            const tab = TABS.find((t) => t.name === route.name);
            return {
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarShowLabel: true,
              tabBarActiveTintColor: "#147538",
              tabBarInactiveTintColor: "rgba(85, 80, 80, 0.65)",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name={tab?.icon} size={22} color={color} />
              ),
              tabBarLabel: ({ color, children }) => (
                <Text style={[styles.label, { color }]}>{children}</Text>
              ),
            };
          }}
        >
          {TABS.map((tab) => (
            <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
          ))}
        </Tab.Navigator>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flashBanner: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 50,
    elevation: 50,
    backgroundColor: "#7F1D1D",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  flashBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  flashIcon: {
    marginRight: 10,
  },
  flashTextWrap: {
    flex: 1,
  },
  flashTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  flashText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 1,
  },
  flashTime: {
    color: "rgba(252, 165, 165, 0.7)",
    fontSize: 10,
    marginTop: 1,
  },
  flashAction: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginRight: 12,
    textDecorationLine: "underline",
  },
  tabContainer: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 0,
    height: Platform.OS === "ios" ? 82 : Platform.OS === "web" ? 60 : 64,
    paddingBottom: Platform.OS === "ios" ? 22 : Platform.OS === "web" ? 6 : 8,
    paddingTop: 6,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  label: {
    fontSize: Platform.OS === "web" ? 12 : 11,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: 2,
  },
});