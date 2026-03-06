import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { colors } from "../../styles/colors";
import { typography } from "../../styles/typography";
import { spacing, radius } from "../../styles/spacing";
import { shadows } from "../../styles/shadows";
import useAuthStore from "../../store/authStore";

const CATEGORIES = [
  "🥦 Vegetables",
  "🥛 Dairy",
  "🍚 Grains",
  "🧴 Personal Care",
  "🥤 Beverages",
  "🍿 Snacks",
];

const MOCK_VENDORS = [
  {
    id: "1",
    name: "Sharma Kirana",
    distance: "0.3 km",
    rating: 4.5,
    tag: "Certified Partner ⭐",
  },
  {
    id: "2",
    name: "Raju General Store",
    distance: "0.6 km",
    rating: 4.2,
    tag: null,
  },
  {
    id: "3",
    name: "Devi Provisions",
    distance: "0.8 km",
    rating: 4.7,
    tag: "Certified Partner ⭐",
  },
];

export default function HomeScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Namaste, {user?.name?.split(" ")[0]} 👋
            </Text>
            <Text style={styles.location}>📍 Sector 12, Noida</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={styles.searchBar}>
          <Text style={styles.searchText}>🔍 Search for items...</Text>
        </TouchableOpacity>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat} style={styles.categoryChip}>
              <Text style={styles.categoryText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Nearby Vendors */}
        <Text style={styles.sectionTitle}>Nearby Stores</Text>
        {MOCK_VENDORS.map((vendor) => (
          <TouchableOpacity key={vendor.id} style={styles.vendorCard}>
            <View style={styles.vendorIcon}>
              <Text style={{ fontSize: 28 }}>🏪</Text>
            </View>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>{vendor.name}</Text>
              {vendor.tag && <Text style={styles.vendorTag}>{vendor.tag}</Text>}
              <Text style={styles.vendorMeta}>
                ⭐ {vendor.rating} · 📍 {vendor.distance} · ⏱ ~20 min
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  location: { fontSize: typography.sm, color: colors.textLight, marginTop: 2 },
  notifBtn: { padding: spacing.sm },
  searchBar: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  searchText: { color: colors.textLight, fontSize: typography.base },
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  categoryScroll: { paddingLeft: spacing.xl, marginBottom: spacing.xxl },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    ...shadows.sm,
  },
  categoryText: { fontSize: typography.sm, color: colors.text },
  vendorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
  vendorIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  vendorInfo: { flex: 1 },
  vendorName: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  vendorTag: { fontSize: typography.xs, color: colors.secondary, marginTop: 2 },
  vendorMeta: {
    fontSize: typography.xs,
    color: colors.textLight,
    marginTop: 4,
  },
  arrow: { fontSize: 22, color: colors.textLight },
});
