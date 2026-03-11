import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
} from "react-native";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import useAddressStore from "../../store/addressStore";
import useOrderStore from "../../store/orderStore";

const stores = [
  {
    name: "Sharma Kirana",
    type: "Kirana",
    distance: "1.2 km",
    rating: "4.5",
    image: "https://lh3.googleusercontent.com/Y4HVaAmhszdCQFJs-THvcyZWGha5NLhjo790LmL0zCRMErR8ai58wOPzAKZ-tqsel7OjR6rMsPkq0Xrx_m9MWRdCzEfcJhVn7_EOQsI=w360-rw",
  },
  {
    name: "Fresh Mart",
    type: "Vegetables and Kirana",
    distance: "0.8 km",
    rating: "4.2",
    image: "https://lh3.googleusercontent.com/TW79DOPeTuw01SC4TNqtKXHNMjG1HGU7LT_-Ph2bY9COIgXwP0PBAQ_NxEyNu7cO4ofS5xu75SIF3t5WyXKjBF7Rng=w300-rw",
  },
  {
    name: "Suresh Store",
    type: "Daily Items",
    distance: "2.5 km",
    rating: "4.8",
    image: "https://content3.jdmagicbox.com/comp/jaipur/i1/0141px141.x141.090825212123.x8i1/catalogue/sharma-kirana-and-general-store-shyamnagar-jaipur-provision-stores-3ea9myb.jpg",
  },
];

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  const [address, setAddress] = useState(null);
  const [search, setSearch] = useState("");

  const logout = useAuthStore((state) => state.logout);
  const orders = useOrderStore((state) => state.orders);
  const navigation = useNavigation();
  const addressStore = useAddressStore();
  const cart = useCartStore();

  const itemCount = cart.items?.length || 0;
  const totalPrice = cart.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('GPS coords:', latitude, longitude);
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'MyReactNativeApp/1.0 (contact@example.com)' },
          });
          const data = await response.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
            addressStore.clearAddresses();
            addressStore.addAddress(data.display_name);
          }
        } catch (error) {
          console.error('Reverse geocode failed:', error.message);
        }
      },
      (error) => console.log('Geolocation error:', error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon ☀️";
    if (hour < 21) return "Good Evening 🌇";
    return "Good Night 🌙";
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={20} color="#0ff022" />
            <View>
              <Text style={styles.locationTitle}>
                Home - {address && address.split(",")[0]}
              </Text>
              <Text style={styles.locationSubtitle}>
                {address ? address : "Fetching Location..."}
              </Text>
            </View>
            <MaterialIcons name="expand-more" size={18} color="#888" />
          </View>

          <View style={styles.headerIcons}>
            <MaterialIcons name="notifications" size={22} color="#333" />
            <MaterialIcons name="account-circle" size={26} color="#0ff022" />
          </View>
        </View>

        {/* SEARCH */}
        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => navigation.navigate("Search")}
        >
          <MaterialIcons name="search" size={20} color="#888" />
          <TextInput
            placeholder="Search for stores or items"
            style={styles.searchInput}
          />
        </TouchableOpacity>

        {/* OFFER BANNER */}
        <View style={styles.banner}>
          <Text style={styles.bannerSmall}>Flash Sale</Text>
          <Text style={styles.bannerTitle}>50% OFF</Text>
          <Text style={styles.bannerSub}>On your first 3 orders</Text>
          <View style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>USE: FIRST50</Text>
          </View>
        </View>

        {/* NEARBY STORES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Stores</Text>
          <Text style={styles.viewAll}>View all</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {stores.map((store, i) => (
            <View key={i} style={styles.storeCard}>
              <Image source={{ uri: store.image }} style={styles.storeImage} />
              <View style={styles.ratingBox}>
                <MaterialIcons name="star" size={14} color="#0ff022" />
                <Text style={styles.ratingText}>{store.rating}</Text>
              </View>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeMeta}>
                {store.type} • {store.distance}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* RECENTLY ORDERED */}
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
    paddingHorizontal: 16,
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  locationSubtitle: {
    fontSize: 10,
    color: "#888",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  searchBox: {
    margin: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    padding: 10,
  },
  banner: {
    marginHorizontal: 16,
    backgroundColor: "#0ff022",
    padding: 20,
    borderRadius: 16,
  },
  bannerSmall: {
    fontSize: 12,
    fontWeight: "700",
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  bannerSub: {
    fontSize: 14,
  },
  bannerBtn: {
    marginTop: 10,
    backgroundColor: "#000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  bannerBtnText: {
    color: "#0ff022",
    fontWeight: "700",
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  viewAll: {
    color: "#0ff022",
    fontWeight: "700",
  },
  storeCard: {
    width: 220,
    marginLeft: 16,
  },
  storeImage: {
    width: "100%",
    height: 140,
    borderRadius: 14,
  },
  ratingBox: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 2,
  },
  storeName: {
    marginTop: 8,
    fontWeight: "700",
    fontSize: 15,
  },
  storeMeta: {
    color: "#666",
    fontSize: 13,
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
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  navItem: {
    alignItems: "center",
  },
  navTextActive: {
    fontSize: 11,
    color: "#0ff022",
    fontWeight: "700",
  },
  navText: {
    fontSize: 11,
    color: "#777",
  },
});