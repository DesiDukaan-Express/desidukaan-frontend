
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function OrderCard({ order, onAccept, onReject, onReady }) {
  return (
    <View style={styles.card}>

      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{order.id}</Text>
        <Text style={styles.status}>{order.status.toUpperCase()}</Text>
      </View>

      <Text style={styles.customer}>Customer: {order.customerName}</Text>

      <Text style={styles.sectionTitle}>Items</Text>
      {order.items?.map((item, index) => (
        <Text key={index} style={styles.item}>
          • {item.quantity} × {item.name}
        </Text>
      ))}

      <Text style={styles.total}>Total: ₹{order.total}</Text>

      <View style={styles.buttonRow}>

        {order.status === "pending" && (
          <>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => onAccept(order.id)}
            >
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => onReject(order.id)}
            >
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {order.status === "accepted" && (
          <TouchableOpacity
            style={styles.readyBtn}
            onPress={() => onReady(order.id)}
          >
            <Text style={styles.btnText}>Mark Ready</Text>
          </TouchableOpacity>
        )}

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  orderId: {
    fontSize: 16,
    fontWeight: "bold",
  },

  status: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FF9800",
  },

  customer: {
    fontSize: 14,
    marginBottom: 8,
    color: "#444",
  },

  sectionTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },

  item: {
    fontSize: 14,
    color: "#555",
    marginLeft: 6,
  },

  total: {
    marginTop: 10,
    fontWeight: "bold",
    fontSize: 15,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  acceptBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  rejectBtn: {
    backgroundColor: "#F44336",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  readyBtn: {
    backgroundColor: "#2196F3",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },

});