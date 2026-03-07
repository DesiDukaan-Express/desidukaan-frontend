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
import useCartStore from "../../store/cartStore";

export default function CartScreen() {
  const cart = useCartStore();

  console.log(cart.items);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🛒</Text>
      <Text style={styles.title}>Cart</Text>
      <Text style={styles.sub}>Neev Testing Version</Text>

      {cart.items &&
        cart.items.map((item, index) => {
          return (
            <View key={index} style={{display : "flex" , flexDirection : "row"}}>
              <Text style={{marginLeft : 20}}>Name : {item.name} </Text>
              <Text style={{marginLeft : 20}}>Price : {item.price}</Text>
              <Text style={{marginLeft : 20}}>Quantity : {item.qty}</Text>
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.primary },
  sub: { fontSize: 14, color: colors.textLight, marginTop: 6 },
});
