import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function FloatCart({ itemCount, totalPrice, onPress }) {

  if (itemCount === 0) return null;

  return (
    <View style={styles.container}>
      
      <Text style={styles.text}>
        {itemCount} items | ₹{totalPrice}
      </Text>

      <TouchableOpacity onPress={onPress}>
        <Text style={styles.button}>View Cart</Text>
      </TouchableOpacity>
     

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#0ff022",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 6,
  },

  text: {
    color: "#000",
    fontWeight: "700",
  },

  button: {
    color: "#000",
    fontWeight: "800",
  },
}); 
