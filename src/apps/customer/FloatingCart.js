import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
// import useCartStore from "../store/cartStore";

export default function FloatingCart() {

  const navigation = useNavigation();

  const cartItems = useCartStore((state) => state.items);

  const totalItems = cartItems.length;

  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  if (totalItems === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {totalItems} items | ₹{totalPrice}
      </Text>

      <TouchableOpacity
        onPress={() => navigation.navigate("Cart")}
      >
        <Text style={styles.button}>View Cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 5
  },

  text: {
    color: "white",
    fontWeight: "bold"
  },

  button: {
    color: "white",
    fontWeight: "bold"
  }
});