import React from "react";
import { View, Text, FlatList, Alert } from "react-native";
import OrderCard from "../../components/OrderCard";

const orders = [
  {
    id: "12345",
    customerName: "Rahul Sharma",
    items: [
      { name: "Bread", quantity: 2 },
      { name: "Milk", quantity: 1 }
    ],
    total: 180,
    status: "pending"
  },
  {
    id: "12346",
    customerName: "Amit Verma",
    items: [
      { name: "Rice", quantity: 1 },
      { name: "Oil", quantity: 1 }
    ],
    total: 320,
    status: "accepted"
  }
];

export default function VendorOrdersScreen() {

  const handleAccept = (id) => {
    Alert.alert("Order Accepted", `Order #${id} accepted`);
  };

  const handleReject = (id) => {
    Alert.alert("Order Rejected", `Order #${id} rejected`);
  };

  const handleReady = (id) => {
    Alert.alert("Order Ready", `Order #${id} ready for pickup`);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 10 }}>
        Vendor Orders
      </Text>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onAccept={handleAccept}
            onReject={handleReject}
            onReady={handleReady}
          />
        )}
      />
    </View>
  );
}