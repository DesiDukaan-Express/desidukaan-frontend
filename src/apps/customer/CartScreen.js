import React from "react";
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from "react-native";
import useCartStore from "../../store/cartStore";
import { useNavigation } from "@react-navigation/native";

export default function CartScreen() {

  const items = useCartStore((state) => state.items);

  const navigation = useNavigation();

  const itemTotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  const deliveryCharge = 30;
  const handlingCharge = 5;
  const smallCartFee = itemTotal < 200 ? 20 : 0;

  const grandTotal = itemTotal + deliveryCharge + handlingCharge + smallCartFee;

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text>Your cart is empty</Text>
      </View>
    );
  }


  return (

    <View style={{ flex: 1 }}>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>

            <Image source={{ uri: item.image }} style={styles.image} />

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>₹{item.price}</Text>
              <Text style={styles.qty}>Qty: {item.qty}</Text>
            </View>

          </View>
        )}
      />

      {/* BILL DETAILS */}

      <View style={styles.billBox}>

        <Text style={styles.billTitle}>Bill Details</Text>

        <View style={styles.row}>
          <Text>Items Total</Text>
          <Text>₹{itemTotal}</Text>
        </View>

        <View style={styles.row}>
          <Text>Delivery Charge</Text>
          <Text>₹{deliveryCharge}</Text>
        </View>

        <View style={styles.row}>
          <Text>Handling Charge</Text>
          <Text>₹{handlingCharge}</Text>
        </View>

        <View style={styles.row}>
          <Text>Small Cart Fee</Text>
          <Text>₹{smallCartFee}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalText}>Grand Total</Text>
          <Text style={styles.totalText}>₹{grandTotal}</Text>
        </View>

        
        <TouchableOpacity onPress={() => navigation.navigate('Checkout')} style={styles.checkOutButton}>
          <Text style={styles.checkOutButtonText}>
            Checkout
          </Text>
        </TouchableOpacity>
      </View>


    </View>
  );
}



const styles = StyleSheet.create({

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  card: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },

  image: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 15
  },

  name: {
    fontSize: 16,
    fontWeight: "600"
  },

  price: {
    color: "green",
    marginTop: 5
  },

  qty: {
    marginTop: 5,
    color: "#555"
  },

  billBox: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa"
  },

  billTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4
  },

  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 10
  },

  totalText: {
    fontSize: 16,
    fontWeight: "bold"
  }
  ,

  checkOutButton: {
    flex: 1,
    backgroundColor: "#0ff022",
    paddingVertical: 16,
    maxHeight : 30,
    marginTop : 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    shadowColor: "#0ff022",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  checkOutButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  }

});