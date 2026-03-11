import React, { useState } from "react";
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
import { Dimensions } from "react-native";


export default function StoreDashboard() {
  const { logout } = useAuthStore();

  const data = [
    {
      totalOrders: 42,
      revenue: "8,450",
      sales: [200, 450, 700, 600, 820],
      avgPrepTime: 8.5,
      deliveryTime: 18
    } ,
    {
      totalOrders: 305,
      revenue: "8,450",
      sales: [300, 200, 100, 900, 520],
      avgPrepTime: 6,
      deliveryTime: 22
    } ,
    {
      totalOrders: 1400,
      revenue: "8,450",
      sales: [900, 100, 400, 300, 820],
      avgPrepTime: 10,
      deliveryTime: 17
    }
  ];

  const [currIndex, setCurrIndex] = useState(0);



  const screenWidth = Dimensions.get("window").width;

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
              <Text style={styles.metricValue}>{data[currIndex].totalOrders}</Text>
              <Text style={styles.metricUp}>+{Math.floor(Math.random().toPrecision(2) * 100 / 2)}%</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>REVENUE</Text>
            <View style={styles.metricRow}>
              <Text style={styles.metricValue}>₹{data[currIndex].revenue}</Text>
              <Text style={styles.metricUp}>+{Math.floor(Math.random().toPrecision(2) * 100 / 2)}%</Text>
            </View>
          </View>
        </View>

        {/* SALES TREND */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sales Trend</Text>
            <Text style={styles.sectionHint}>Last 24 Hours</Text>
          </View>

          <LineChart
            data={{
              labels: ["06", "10", "14", "18", "22"],
              datasets: [
                {
                  data: data[currIndex].sales,
                },
              ],
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

          <Product
            name="Organic Tomatoes"
            sold="124 units sold"
            price="₹3,720"
            tag="Best Seller"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuArJb_YjUzyHc1EykEd8C-YI9CAx2GFurQX4vUzqad5rJrlxAEC9B1DBH0kXVpxybUryn3EWlZ5J49YdOv7oQPi3kQs-qODzKZLc9lcx3rX7_vrMWwIVDVacAWC5E0-c4f03sq8wn-JDaFjsktGx_ZyfK8aEw9siyxb4roc-XhIT2s57LgGZ0BgPA8pd7FalJD3FtFMvoyZ3tXymbleXKQDPl3ZHIU3jPxomkT0FmUSaKJLk7bHZe3lxwy1CJKZDg7pQcg3nszmOyY"
          />

          <Product
            name="Local Red Onions"
            sold="98 units sold"
            price="₹1,960"
            tag="Trending"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuBN8BS8RTeTByuvZrCfBBVUkYKpRvz9b6RZcQLf_6CoZoAGyp5vQZwAvwJNqQI9thzGWvt8GA44JAoDrTVe9JcKOGHg5bvckedi_pXt-5rw-yDECY_ASw7zRzRQf20I2dky9lBAyYX9kbrDJ3T6BeOLuuIBpvHPHJTZb1zRaVrFKEHlfTK6sTH4tYOx0hb8PZr7VDlNzaQwWh6fbFE5PYGRXNlf7mO36z_Pz0czYL0sYnTTyW8fFZQRZ4F1A51-uRCdwXrAEYdOSS8"
          />
        </View>

        {/* DELIVERY EFFICIENCY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Efficiency</Text>

          <View style={styles.deliveryRow}>
            <View style={styles.deliveryCard}>
              <MaterialIcons name="schedule" size={20} color="#0ff022" />
              <Text style={styles.deliveryLabel}>Avg. Prep Time</Text>
              <Text style={styles.deliveryValue}>{data[currIndex].avgPrepTime} min</Text>
            </View>

            <View style={styles.deliveryCard}>
              <MaterialIcons name="moped" size={20} color="#0ff022" />
              <Text style={styles.deliveryLabel}>Delivery Time</Text>
              <Text style={styles.deliveryValue}>{data[currIndex].deliveryTime} min</Text>
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