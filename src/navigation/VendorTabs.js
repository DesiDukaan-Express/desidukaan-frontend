import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import DashboardScreen from "../apps/vendor/DashboardScreen";
import InventoryScreen from "../apps/vendor/InventoryScreen";
import VendorOrdersScreen from "../apps/vendor/VendorOrdersScreen";
import EarningsScreen from "../apps/vendor/EarningsScreen";
import VendorProfileScreen from "../apps/vendor/VendorProfileScreen";

const Tab = createBottomTabNavigator();

export default function VendorTabs() {
  const { t } = useTranslation();

  const TABS = [
    { name: "Dashboard", icon: "bar-chart",    label: t('vendor.dashboard'), component: DashboardScreen },
    { name: "Inventory", icon: "inventory",    label: t('vendor.inventory'), component: InventoryScreen },
    { name: "Orders",    icon: "receipt-long", label: t('vendor.orders'),    component: VendorOrdersScreen },
    { name: "Earnings",  icon: "payments",     label: t('vendor.earnings'),  component: EarningsScreen },
    { name: "Profile",   icon: "person",       label: t('profile.title'),    component: VendorProfileScreen },
  ];

  return (
    <Tab.Navigator
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
          tabBarLabel: ({ color }) => (
            <Text style={[styles.label, { color }]}>{tab?.label}</Text>
          ),
        };
      }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
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