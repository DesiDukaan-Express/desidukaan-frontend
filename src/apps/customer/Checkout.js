import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import useCartStore from "../../store/cartStore";
import useAddressStore from '../../store/addressStore';
import useOrderStore from "../../store/orderStore";

const paymentModes = [
  {
    name: "Cash on Delivery",
    icon: "payments"
  },
  {
    name: "UPI",
    icon: "account-balance-wallet"
  },
  {
    name: "Credit / Debit Card",
    icon: "credit-card"
  }
]

export default function CheckoutScreen() {

  const cart = useCartStore();

  const items = cart.items


  const navigation = useNavigation();

  const {addOrder} = useOrderStore();

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const delivery = 25;
  const tax = 18;
  const total = subtotal + delivery + tax;

  const increase = (item) => {
    cart.addItem(item, "VENDOR_EXAMPLE");
  };

  const decrease = (item) => {
    cart.removeItem(item.id)
  };

  const [dropDownMenu, setDropDownMenu] = useState(false);

  const [currPaymentMode, setCurrPaymentMode] = useState(0);

  const addresses = useAddressStore((state) => state.addresses);

  const handlePlaceOrder = () => {
    addOrder({
      id : Math.random().toString(),
      name : "dummyStore",
      time : "1 Min Ago",
      image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
      items
    });
    cart.clearCart();
    navigation.navigate('OrderPlaced');
  }
  

  return (
    <View style={styles.container}>
      <ScrollView>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.sectionTitle}>Delivery Address</Text>

        <View style={styles.addressRow}>
          <View style={styles.locationIcon}>
            <MaterialIcons name="location-on" size={22} color="#0ff022" />
          </View>

          <View style={{ flex: 1 }}>
            {addresses[0] &&
              (
                <>
                  <Text style={styles.addressTitle}>{addresses[0].address.split(',')[0]}</Text>
                  <Text style={styles.addressSubtitle}>
                    {
                      addresses[0].address.split(',').slice(1 , addresses[0].address.length).join(',')
                    }
                  </Text>
                </>
              )}

          </View>

          <TouchableOpacity style={styles.changeBtn}>
            <Text style={styles.changeText}>Change</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          Order Summary
        </Text>

        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Image source={{ uri: item.image }} style={styles.itemImage} />

              <View>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price}</Text>
              </View>
            </View>

            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => decrease(item)}
              >
                <MaterialIcons name="remove" size={18} />
              </TouchableOpacity>

              <Text style={styles.qtyText}>{item.qty}</Text>

              <TouchableOpacity
                style={styles.qtyBtnAdd}
                onPress={() => increase(item)}
              >
                <MaterialIcons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.billBox}>
          <Text style={styles.billTitle}>Bill Details</Text>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text>₹{subtotal}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text>₹{delivery}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Taxes & Charges</Text>
            <Text>₹{tax}</Text>
          </View>

          <View style={styles.billTotal}>
            <Text style={styles.totalText}>Total Amount</Text>
            <Text style={styles.totalPrice}>₹{total}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.paymentRow} onPress={() => setDropDownMenu(!dropDownMenu)}>
          <MaterialIcons name="payments" size={22} color="#888" />

          <View style={{ flex: 1 }}>
            <Text style={styles.paymentTitle}>Payment Method</Text>
            <Text style={styles.paymentSubtitle}>{paymentModes[currPaymentMode].name}</Text>
          </View>

          <MaterialIcons name="chevron-right" size={22} color="#aaa" />
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.toPay}>To Pay</Text>
          <Text style={styles.totalBottom}>₹{total}</Text>
        </View>

        <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder}>
          <Text style={styles.placeOrderText}>Place Order</Text>
          <MaterialIcons name="arrow-forward" size={20} />
        </TouchableOpacity>
      </View>

      {
        dropDownMenu && (
          <View style={styles.dropdownOverlay}>
            <View style={styles.dropdownContainer}>

              <Text style={styles.dropdownTitle}>Select Payment Method</Text>

              {
                paymentModes.map((elem, index) => {
                  return (
                    <TouchableOpacity key={index} style={styles.paymentOption} onPress={() => { setCurrPaymentMode(index); setDropDownMenu(false) }}>
                      <MaterialIcons name={elem.icon} size={22} />
                      <Text style={styles.paymentOptionText}>{elem.name}</Text>
                    </TouchableOpacity>
                  )
                })
              }

              <TouchableOpacity
                style={styles.closeDropdown}
                onPress={() => setDropDownMenu(false)}
              >
                <Text style={styles.closeDropdownText}>Cancel</Text>
              </TouchableOpacity>

            </View>
          </View>
        )
      }
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

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 20,
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  locationIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#0ff02220",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginRight: 12,
  },

  addressTitle: {
    fontWeight: "600",
  },

  addressSubtitle: {
    color: "#777",
    fontSize: 13,
  },

  changeBtn: {
    backgroundColor: "#0ff02220",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  changeText: {
    color: "#0ff022",
    fontWeight: "700",
    fontSize: 12,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 10,
  },

  itemName: {
    fontWeight: "500",
  },

  itemPrice: {
    color: "#0ff022",
    fontWeight: "700",
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  qtyBtn: {
    width: 32,
    height: 32,
    backgroundColor: "#eee",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyBtnAdd: {
    width: 32,
    height: 32,
    backgroundColor: "#0ff022",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyText: {
    marginHorizontal: 10,
    fontWeight: "700",
  },

  billBox: {
    margin: 16,
    backgroundColor: "#f3f3f3",
    padding: 16,
    borderRadius: 12,
  },

  billTitle: {
    fontWeight: "700",
    marginBottom: 10,
  },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },

  billLabel: {
    color: "#666",
  },

  billTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  totalText: {
    fontWeight: "700",
  },

  totalPrice: {
    color: "#0ff022",
    fontWeight: "700",
    fontSize: 16,
  },

  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
  },

  paymentTitle: {
    fontWeight: "600",
    marginLeft: 5
  },

  paymentSubtitle: {
    fontSize: 12,
    color: "#777",
    marginLeft: 5
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },

  toPay: {
    fontSize: 11,
    color: "#888",
  },

  totalBottom: {
    fontSize: 20,
    fontWeight: "700",
  },

  placeOrderBtn: {
    backgroundColor: "#0ff022",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  placeOrderText: {
    fontWeight: "700",
  },

  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },

  dropdownContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },

  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },

  paymentOptionText: {
    fontSize: 15,
    fontWeight: "500",
  },

  closeDropdown: {
    marginTop: 20,
    alignItems: "center",
  },

  closeDropdownText: {
    color: "red",
    fontWeight: "600",
  },
});