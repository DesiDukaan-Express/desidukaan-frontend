import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from "@expo/vector-icons";
import useOrderStore from '../../store/orderStore';
import { useState } from 'react';


const TrackOrder = ({ store, items, setCurrOrder }) => {

  const grandTotal = items.reduce((total, item) => total + item.price, 0);


  return (
    <View style={styles.container}>
      <ScrollView>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrOrder(null)}>
            <MaterialIcons name="arrow-back" size={22} />
          </TouchableOpacity>

          <View style={{ marginLeft: 8 }}>
            <Text style={styles.title}>Track Order</Text>
            <Text style={styles.orderId}>ID: #DD-98231</Text>
          </View>
        </View>

        {/* STORE HEADER */}
        <View style={styles.storeBox}>
          <Image
            source={{
              uri: store.image,
            }}
            style={styles.storeImage}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text style={styles.arrival}>Arriving in 12-15 mins</Text>
          </View>

          <TouchableOpacity style={styles.callBtn}>
            <MaterialIcons name="call" size={22} />
          </TouchableOpacity>
        </View>

        {/* ORDER JOURNEY */}
        <Text style={styles.journeyTitle}>ORDER JOURNEY</Text>

        <View style={styles.stepRow}>
          <View style={styles.stepIconActive}>
            <MaterialIcons name="check-circle" size={16} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Order Placed</Text>
            <Text style={styles.stepTime}>Today, 10:30 AM</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepIconActive}>
            <MaterialIcons name="store" size={16} />
          </View>
          <View>
            <Text style={styles.stepTitle}>Store Accepted</Text>
            <Text style={styles.stepTime}>Today, 10:35 AM</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepIconCurrent}>
            <MaterialIcons name="edit" size={16} />
          </View>
          <View>
            <Text style={styles.stepTitleActive}>Preparing Order</Text>
            <Text style={styles.stepTime}>Estimated 5 mins left</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepIconInactive}>
            <MaterialIcons name="delivery-dining" size={16} color="#aaa" />
          </View>
          <View>
            <Text style={styles.stepInactive}>Out for Delivery</Text>
            <Text style={styles.stepInactive}>Pending</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={styles.stepIconInactive}>
            <MaterialIcons name="home" size={16} color="#aaa" />
          </View>
          <View>
            <Text style={styles.stepInactive}>Delivered</Text>
            <Text style={styles.stepInactive}>Pending</Text>
          </View>
        </View>

        {/* ORDER SUMMARY */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <Text style={styles.summaryBadge}>{items.length} Items</Text>
          </View>

          {items.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <View style={styles.emojiBox}>
                  {
                    item.emoji ?
                      <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                      :
                      <Image
                      src={item.image}
                        />
                  }
                </View>

                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.qty}>Qty: {item.qty}</Text>
                </View>
              </View>

              <Text style={styles.price}>₹{item.price}</Text>
            </View>
          ))}

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.grayText}>Item Total</Text>
              <Text style={styles.grayText}>₹904</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.grayText}>Delivery Fee</Text>
              <Text style={styles.free}>FREE</Text>
            </View>

            <View style={styles.grandTotal}>
              <Text style={styles.grandText}>Grand Total</Text>
              <Text style={styles.grandText}>₹{grandTotal}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}


export default function OrderScreen() {

  const orders = useOrderStore((state) => state.orders);

  const [currOrder, setCurrOrder] = useState(null);


  const items = [
    { name: "Basmati Rice (5kg)", qty: 1, price: 549, emoji: "🍚" },
    { name: "Moong Dal (1kg)", qty: 2, price: 240, emoji: "🫘" },
    { name: "Sandalwood Soap", qty: 3, price: 115, emoji: "🧼" },
  ];

  return currOrder != null ? (
    <TrackOrder items={orders[currOrder].items ? orders[currOrder].items : items} store={orders[currOrder]} setCurrOrder={setCurrOrder} />
  ) : (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Recently Ordered From</Text>

      {orders.map((order, i) => (
        <TouchableOpacity key={i} style={styles.orderCard} onPress={() => setCurrOrder(i)}>
          <Image source={{ uri: order.image }} style={styles.orderImage} />

          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle}>{order.name}</Text>
            <Text style={styles.orderTime}>{order.time}</Text>
            <Text style={styles.reorder}>Reorder now</Text>
          </View>

          <MaterialIcons name="chevron-right" size={22} color="#ccc" />
        </TouchableOpacity>
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


  container: {
    flex: 1,
    backgroundColor: "#f5f8f6",
    paddingTop: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  backBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#eee",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  orderId: {
    fontSize: 11,
    color: "#777",
  },

  storeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0ff02210",
    padding: 16,
  },

  storeImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },

  storeName: {
    fontSize: 16,
    fontWeight: "700",
  },

  arrival: {
    fontSize: 13,
    color: "#666",
  },

  callBtn: {
    backgroundColor: "#0ff022",
    padding: 10,
    borderRadius: 20,
  },

  journeyTitle: {
    fontSize: 12,
    fontWeight: "700",
    margin: 16,
    color: "#888",
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },

  stepIconActive: {
    backgroundColor: "#0ff022",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  stepIconCurrent: {
    backgroundColor: "#0ff022",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 4,
    borderColor: "#0ff02230",
  },

  stepIconInactive: {
    backgroundColor: "#eee",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  stepTitle: {
    fontWeight: "700",
  },

  stepTitleActive: {
    fontWeight: "700",
    color: "#0ff022",
  },

  stepTime: {
    fontSize: 12,
    color: "#777",
  },

  stepInactive: {
    color: "#aaa",
  },

  summaryBox: {
    backgroundColor: "#f4f4f4",
    padding: 16,
    marginTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  summaryBadge: {
    backgroundColor: "#0ff02220",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 11,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  itemLeft: {
    flexDirection: "row",
  },

  emojiBox: {
    width: 40,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  itemName: {
    fontWeight: "500",
  },

  qty: {
    fontSize: 12,
    color: "#777",
  },

  price: {
    fontWeight: "700",
  },

  totalSection: {
    marginTop: 12,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },

  grayText: {
    color: "#777",
  },

  free: {
    color: "#0ff022",
    fontWeight: "600",
  },

  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#ccc",
    paddingTop: 8,
  },

  grandText: {
    fontWeight: "700",
    fontSize: 16,
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
    fontSize: 11,
    color: "#888",
  },

});