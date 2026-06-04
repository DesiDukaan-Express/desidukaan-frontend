import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import DashboardScreen from "../apps/vendor/DashboardScreen";
import InventoryScreen from "../apps/vendor/InventoryScreen";
import VendorOrdersScreen from "../apps/vendor/VendorOrdersScreen";
import EarningsScreen from "../apps/vendor/EarningsScreen";
import VendorProfileScreen from "../apps/vendor/VendorProfileScreen";

const Tab = createBottomTabNavigator();

const TABS = [
  {
    name: "Dashboard",
    icon: "bar-chart",
    label: "Dashboard",
    component: DashboardScreen,
  },
  {
    name: "Inventory",
    icon: "inventory",
    label: "Inventory",
    component: InventoryScreen,
  },
  {
    name: "Orders",
    icon: "receipt-long",
    label: "Orders",
    component: VendorOrdersScreen,
  },
  {
    name: "Earnings",
    icon: "payments",
    label: "Earnings",
    component: EarningsScreen,
  },
  {
    name: "Profile",
    icon: "person",
    label: "Profile",
    component: VendorProfileScreen,
  },
];

export default function VendorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarIcon: ({ focused, color }) => {
          const tab = TABS.find((t) => t.name === route.name);
          const { width } = require("react-native").Dimensions.get("window");
          const isWide = width >= 768;
          return (
            <View
              style={[
                styles.iconWrap,
                focused && styles.iconWrapActive,
                isWide && { width: 64, height: 34, borderRadius: 17 },
              ]}
            >
              <MaterialIcons
                name={tab?.icon}
                size={isWide ? 24 : 22}
                color={color}
              />
            </View>
          );
        },
        tabBarLabel: ({ focused, color, children }) => (
          <Text style={[styles.label, { color }]}>{children}</Text>
        ),
      })}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#147538",
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
  iconWrap: {
    width: Platform.OS === "web" ? 56 : 40,
    height: Platform.OS === "web" ? 32 : 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  label: {
    fontSize: Platform.OS === "web" ? 12 : 11,
    fontWeight: "600",
    letterSpacing: 0.1,
    marginTop: -2,
  },
});
