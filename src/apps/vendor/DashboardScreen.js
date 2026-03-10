import React from "react";
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

export default function StoreDashboard() {
  const { logout } = useAuthStore();
  const orders = [
    {
      id: "#ORD-5542",
      name: "Rajesh Kumar",
      status: "New",
      image: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      id: "#ORD-5541",
      name: "Priya Sharma",
      status: "Preparing",
      image: "https://randomuser.me/api/portraits/women/44.jpg",
    },
    {
      id: "#ORD-5539",
      name: "Amit Singh",
      status: "On Way",
      image: "https://randomuser.me/api/portraits/men/41.jpg",
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.storeIcon}>
              <MaterialIcons name="storefront" size={22} color="#0ff022" />
            </View>

            <Text style={styles.headerTitle}>Desi Store Dashboard</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn}>
              <MaterialIcons name="notifications" size={22} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn}>
              <MaterialIcons name="account-circle" size={24} />
            </TouchableOpacity>

            {/* Temporary logout button */}
            <TouchableOpacity style={styles.iconBtn} onPress={logout}>
              <MaterialIcons name="logout" size={24} color="red" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ORDER SUMMARY */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <Text style={styles.badge}>Today</Text>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.summaryCard}>
            <View style={styles.cardIconGreen}>
              <MaterialIcons name="shopping-cart" size={22} color="#0ff022" />
            </View>

            <View>
              <Text style={styles.summaryNumber}>3</Text>
              <Text style={styles.summaryLabel}>New Orders</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.cardIconOrange}>
              <MaterialIcons name="schedule" size={22} color="orange" />
            </View>

            <View>
              <Text style={styles.summaryNumber}>5</Text>
              <Text style={styles.summaryLabel}>Preparing</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.cardIconBlue}>
              <MaterialIcons name="local-shipping" size={22} color="#3b82f6" />
            </View>

            <View>
              <Text style={styles.summaryNumber}>2</Text>
              <Text style={styles.summaryLabel}>Out for Delivery</Text>
            </View>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryBtn}>
            <MaterialIcons name="add-box" size={20} />
            <Text style={styles.primaryBtnText}>Add Product</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn}>
            <MaterialIcons name="group" size={20} />
            <Text style={styles.secondaryBtnText}>Manage Delivery Staff</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT ORDERS */}
        <Text style={styles.sectionTitle}>Recent Orders</Text>

        <View style={styles.ordersBox}>
          {orders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <Text style={styles.orderId}>{order.id}</Text>

              <View style={styles.customer}>
                <Image source={{ uri: order.image }} style={styles.avatar} />
                <Text style={styles.customerName}>{order.name}</Text>
              </View>

              <Text style={styles.status}>{order.status}</Text>

              <TouchableOpacity>
                <Text style={styles.viewBtn}>View</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  storeIcon: {
    backgroundColor: "#0ff02220",
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  headerRight: {
    flexDirection: "row",
  },

  iconBtn: {
    marginLeft: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 20,
  },

  badge: {
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
  },

  cardRow: {
    paddingHorizontal: 16,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },

  cardIconGreen: {
    backgroundColor: "#0ff02220",
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },

  cardIconOrange: {
    backgroundColor: "#ffe7cc",
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },

  cardIconBlue: {
    backgroundColor: "#e0ecff",
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: "700",
  },

  summaryLabel: {
    color: "#777",
    fontSize: 13,
  },

  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 10,
  },

  primaryBtn: {
    backgroundColor: "#0ff022",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  primaryBtnText: {
    fontWeight: "700",
    marginLeft: 6,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  secondaryBtnText: {
    marginLeft: 6,
  },

  ordersBox: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
  },

  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  orderId: {
    fontWeight: "700",
  },

  customer: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 6,
  },

  customerName: {
    fontSize: 13,
  },

  status: {
    fontSize: 12,
    color: "#0ff022",
    fontWeight: "700",
  },

  viewBtn: {
    color: "#0ff022",
    fontWeight: "700",
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

  navActive: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ff022",
  },

  navText: {
    fontSize: 12,
    color: "#888",
  },
});
