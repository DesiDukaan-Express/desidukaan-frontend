import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import useAuthStore from "../../store/authStore";

import { LineChart } from "react-native-chart-kit";
import { Dimensions, ActivityIndicator } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

export default function StoreDashboard() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [currIndex, setCurrIndex] = useState(0); // 0 = Today, 1 = Weekly, 2 = Monthly
  const [stats, setStats] = useState(null);

  const screenWidth = Dimensions.get("window").width;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/vendors/me/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
          const s = data.data.stats;
          
          // Build chart labels and values from real 7-day data
          const chartRaw = s.weekly_chart_data || [];
          const chartLabels = chartRaw.map((d) =>
            new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })
          );
          const chartValues = chartRaw.map((d) => d.revenue || 0);

          const safeChart = chartValues.length >= 2 ? chartValues : [0, 0, 0, 0, 0, 0, 0];
          const safeLabels = chartLabels.length >= 2 ? chartLabels : ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"];

          setStats({
            labels: safeLabels,
            today: {
              totalOrders: s.today_orders ?? 0,
              revenue: s.today_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
            },
            weekly: {
              totalOrders: s.weekly_orders ?? 0,
              revenue: s.weekly_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
            },
            monthly: {
              totalOrders: s.monthly_orders ?? 0,
              revenue: s.monthly_revenue ?? 0,
              avgPrepTime: s.delivery_efficiency?.avg_prep_time ?? 0,
              deliveryTime: s.delivery_efficiency?.avg_delivery_time ?? 0,
            },
            chartValues: safeChart,
            topProducts: s.top_products || []
          });
        }
      } catch (err) {
        console.error("Dashboard Stats Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading || !stats) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#0ff022" />
        <Text style={{ marginTop: 10 }}>Loading vendor stats...</Text>
      </View>
    );
  }

  const views = [stats.today, stats.weekly, stats.monthly];
  const curr = views[currIndex];

  return (
    <View style={styles.container}>

      <ScrollView>
        {/* FILTER TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setCurrIndex(0)}>
            <Text style={currIndex === 0 ? styles.tabActive : styles.tab}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCurrIndex(1)}>
            <Text style={currIndex === 1 ? styles.tabActive : styles.tab}>Weekly</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCurrIndex(2)}>
            <Text style={currIndex === 2 ? styles.tabActive : styles.tab}>Monthly</Text>
          </TouchableOpacity>
        </View>

        {/* METRICS */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL ORDERS</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricValue}>{curr.totalOrders}</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>REVENUE</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricValue}>₹{Number(curr.revenue).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* SALES TREND */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sales Trend</Text>
            <Text style={styles.sectionHint}>Last 7 Days</Text>
          </View>

          <LineChart
            data={{
              labels: stats.labels,
              datasets: [{ data: stats.chartValues }],
            }}
            width={screenWidth - 32}
            height={200}
            yAxisSuffix="₹"
            chartConfig={{
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(15, 240, 34, ${opacity})`,
              labelColor: () => "#888",
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#0ff022",
              },
              propsForBackgroundLines: {
                stroke: "#eee",
              },
            }}
            bezier
            style={{
              borderRadius: 16,
              marginTop: 10,
            }}
          />
        </View>

        {/* TOP PRODUCTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <Text style={styles.link}>View All</Text>
          </View>

          {stats.topProducts && stats.topProducts.length > 0 ? (
            stats.topProducts.map((p, i) => (
              <Product
                key={i}
                name={p.name}
                sold={`${p.sold} units sold`}
                price={`₹${Number(p.revenue).toLocaleString()}`}
                tag={i === 0 ? "Best Seller" : i < 3 ? "Trending" : ""}
                image={p.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&q=80"}
              />
            ))
          ) : (
            <Text style={{ color: "#888", textAlign: "center", marginVertical: 20 }}>No sales data yet</Text>
          )}
        </View>

        {/* DELIVERY EFFICIENCY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Efficiency</Text>

          <View style={styles.deliveryRow}>
            <View style={styles.deliveryCard}>
              <MaterialIcons name="schedule" size={20} color="#0ff022" />
              <Text style={styles.deliveryLabel}>Avg. Prep Time</Text>
              <Text style={styles.deliveryValue}>{curr.avgPrepTime} min</Text>
            </View>

            <View style={styles.deliveryCard}>
              <MaterialIcons name="moped" size={20} color="#0ff022" />
              <Text style={styles.deliveryLabel}>Delivery Time</Text>
              <Text style={styles.deliveryValue}>{curr.deliveryTime} min</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}


function Product({ name, sold, price, tag, image }) {
  return (
    <View style={styles.productCard}>
      <Image source={{ uri: image }} style={styles.productImage} />

      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>{name}</Text>
        <Text style={styles.productSold}>{sold}</Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.productPrice}>{price}</Text>
        <Text style={styles.productTag}>{tag}</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#f5f8f6",
    paddingTop: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  calendarBtn: {
    backgroundColor: "#eee",
    padding: 8,
    borderRadius: 8,
  },

  tabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  tab: {
    padding: 12,
    color: "#888",
    fontWeight: "600",
  },

  tabActive: {
    padding: 12,
    color: "#000",
    borderBottomWidth: 3,
    borderColor: "#0ff022",
    fontWeight: "700",
  },

  metricsRow: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
  },

  metricCard: {
    flex: 1,
    backgroundColor: "#0ff02210",
    borderRadius: 12,
    padding: 14,
  },

  metricLabel: {
    fontSize: 10,
    color: "#666",
  },

  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  metricValue: {
    fontSize: 22,
    fontWeight: "700",
  },

  metricUp: {
    fontSize: 12,
    color: "green",
    fontWeight: "700",
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  sectionHint: {
    fontSize: 12,
    color: "#777",
  },

  chart: {
    height: 160,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: 10,
  },

  bar: {
    width: 12,
    backgroundColor: "#0ff022",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    fontSize: 10,
  },

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },

  productName: {
    fontWeight: "700",
  },

  productSold: {
    fontSize: 12,
    color: "#777",
  },

  productPrice: {
    fontWeight: "700",
  },

  productTag: {
    fontSize: 10,
    color: "green",
  },

  deliveryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  deliveryCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
  },

  deliveryLabel: {
    fontSize: 12,
    color: "#777",
  },

  deliveryValue: {
    fontSize: 20,
    fontWeight: "700",
  },

  partnerBox: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },

  partnerTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 10,
  },

  partnerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  partnerName: {
    color: "#ccc",
  },

  partnerRating: {
    color: "#fff",
    fontWeight: "700",
  },

  progressBg: {
    height: 4,
    backgroundColor: "#444",
    borderRadius: 4,
    marginTop: 4,
  },

  progressFill: {
    height: 4,
    backgroundColor: "#0ff022",
    borderRadius: 4,
  },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },

  navItem: {
    alignItems: "center",
  },

  navText: {
    fontSize: 10,
    color: "#888",
  },

});