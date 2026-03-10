import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { MaterialIcons } from "@expo/vector-icons";
import useOrderStore from '../../store/orderStore';


export default function OrderScreen() {

  const orders = useOrderStore((state) => state.orders);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Recently Ordered From</Text>

      {orders.map((order, i) => (
        <View key={i} style={styles.orderCard}>
          <Image source={{ uri: order.image }} style={styles.orderImage} />

          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle}>{order.name}</Text>
            <Text style={styles.orderTime}>{order.time}</Text>
            <Text style={styles.reorder}>Reorder now</Text>
          </View>

          <MaterialIcons name="chevron-right" size={22} color="#ccc" />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 20
  },

  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
  },

  orderImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },

  orderTitle: {
    fontWeight: "700",
  },

  orderTime: {
    fontSize: 12,
    color: "#777",
  },

  reorder: {
    color: "#0ff022",
    fontSize: 12,
    fontWeight: "700",
  },

});