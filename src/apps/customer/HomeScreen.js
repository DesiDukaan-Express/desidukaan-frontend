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
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../store/authStore";
import useCartStore from "../../store/cartStore";

// ================= CATEGORIES =================
const categories = [
  {
    name: "Vegetables",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e",
  },
  {
    name: "Fruits",
    image:
      "https://images.unsplash.com/photo-1655483911598-41377da0019d?q=80&w=693&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    name: "Dairy",
    image:
      "https://images.unsplash.com/photo-1500595046743-cd271d694d30?q=80&w=1174&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    name: "Meat",
    image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f",
  },
  {
    name: "Snacks",
    image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087",
  },
  {
    name: "Beverages",
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e",
  },
];

// ================= PRODUCTS =================
const products = {
  Vegetables: [
    {
      id: 1,
      name: "Tomatoes",
      price: "70",
      image: "https://images.unsplash.com/photo-1561136594-7f68413baa99",
    },
    {
      id: 2,
      name: "Cucumber",
      price: "50",
      image:
        "https://images.unsplash.com/photo-1568584711271-6c929fb49b60?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 3,
      name: "Carrot",
      price: "40",
      image: "https://images.unsplash.com/photo-1447175008436-054170c2e979",
    },
    {
      id: 4,
      name: "Broccoli",
      price: "90",
      image: "https://images.unsplash.com/photo-1589927986089-35812388d1f4",
    },
    {
      id: 5,
      name: "Spinach",
      price: "30",
      image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb",
    },
    {
      id: 6,
      name: "Potatoes",
      price: "40",
      image:
        "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],

  Fruits: [
    {
      id: 7,
      name: "Apple",
      price: "2.20 ",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
    },
    {
      id: 8,
      name: "Banana",
      price: "1.10 ",
      image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e",
    },
    {
      id: 9,
      name: "Orange",
      price: "1.30 ",
      image: "https://images.unsplash.com/photo-1580052614034-c55d20bfee3b",
    },
    {
      id: 10,
      name: "Strawberry",
      price: "3.00 ",
      image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6",
    },
    {
      id: 11,
      name: "Grapes",
      price: "2.50 ",
      image:
        "https://images.unsplash.com/photo-1423483641154-5411ec9c0ddf?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 12,
      name: "Pineapple",
      price: "2.80 ",
      image:
        "https://images.unsplash.com/photo-1623689071937-c3eeaf91650c?q=80&w=1174&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],

  Dairy: [
    {
      id: 13,
      name: "Milk",
      price: "1.80 ",
      image:
        "https://images.unsplash.com/photo-1757802868665-60b771aa399b?q=80&w=1105&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 14,
      name: "Cheese",
      price: "3.50 ",
      image:
        "https://images.unsplash.com/photo-1654513547430-973fe7570159?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 15,
      name: "Butter",
      price: "2.40 ",
      image:
        "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 16,
      name: "Yogurt",
      price: "1.60 ",
      image:
        "https://images.unsplash.com/photo-1604095853918-1a1823a63dd5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],

  Meat: [
    {
      id: 17,
      name: "Chicken",
      price: "1.69 ",
      image:
        "https://images.unsplash.com/photo-1587593810167-a84920ea0781?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 18,
      name: "Fish",
      price: "1.69 ",
      image:
        "https://images.unsplash.com/photo-1635843125771-e8eaca55d7da?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 19,
      name: "Goat Meat",
      price: "2.34 ",
      image:
        "https://images.unsplash.com/photo-1606677661991-446cea8ee182?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 20,
      name: "frozen Meat",
      price: "3.4 ",
      image:
        "https://images.unsplash.com/photo-1547637205-fde0c9011f9d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],
  Beverages: [
    {
      id: 21,
      name: "Soft Drinks",
      price: "0.3 ",
      image:
        "https://images.unsplash.com/photo-1665359045452-bfa257a2a6bf?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 22,
      name: "Juices",
      price: "0.5 ",
      image:
        "https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?q=80&w=966&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 23,
      name: "Dairy Drinks",
      price: "0.6 ",
      image:
        "https://plus.unsplash.com/premium_photo-1695669385408-62d2b7d77861?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 24,
      name: "Tea & Coffee",
      price: "0.7 ",
      image:
        "https://images.unsplash.com/photo-1566897245752-b287a7c599a5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],
  Snacks: [
    {
      id: 25,
      name: "Chips & Crisps",
      price: "0.2 ",
      image:
        "https://images.unsplash.com/photo-1613462847848-f65a8b231bb5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 26,
      name: "Namkeens & Mixtures",
      price: "0.3 ",
      image:
        "https://media.istockphoto.com/id/1217942210/photo/namkeen-fried-food-gujarati-food-gujarat-india.jpg?s=1024x1024&w=is&k=20&c=rZJokW-fq4Uh_3cR9zI1PChifQzm5ybt9U0ZcCCxRPY=",
    },
    {
      id: 27,
      name: "Biscuits & Cookies",
      price: "0.2 ",
      image:
        "https://images.unsplash.com/photo-1598839950984-034f6dc7b495?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 28,
      name: "Chocolates",
      price: "0.3 ",
      image:
        "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ],
};

// ================= STORES =================
const nearbyStores = [
  {
    name: "Sharma Kirana",
    rating: 4.5,
    distance: "1.2 km",
    time: "12 min",
    image:
      "https://lh3.googleusercontent.com/Y4HVaAmhszdCQFJs-THvcyZWGha5NLhjo790LmL0zCRMErR8ai58wOPzAKZ-tqsel7OjR6rMsPkq0Xrx_m9MWRdCzEfcJhVn7_EOQsI=w360-rw",
  },
  {
    name: "Gupta Store",
    rating: 4.2,
    distance: "2 km",
    time: "15 min",
    image: "https://cdn.dotpe.in/longtail/store-logo/6795545/txgXslPp.webp",
  },
  {
    name: "Fresh Mart",
    rating: 4.7,
    distance: "900 m",
    time: "8 min",
    image:
      "https://lh3.googleusercontent.com/TW79DOPeTuw01SC4TNqtKXHNMjG1HGU7LT_-Ph2bY9COIgXwP0PBAQ_NxEyNu7cO4ofS5xu75SIF3t5WyXKjBF7Rng=w300-rw",
  },
  {
    name: "Daily Needs",
    rating: 4.3,
    distance: "1.5 km",
    time: "10 min",
    image:
      "https://content3.jdmagicbox.com/comp/jaipur/i1/0141px141.x141.090825212123.x8i1/catalogue/sharma-kirana-and-general-store-shyamnagar-jaipur-provision-stores-3ea9myb.jpg",
  },
];

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  // const [cartCount, setCartCount] = useState(0);

  const logout = useAuthStore((state) => state.logout);

  const [location, setLocation] = useState(null);

  const [address, setAddress] = useState(null);

  const [search, setSearch] = useState("");

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
        },
        (error) => console.log(error.message),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (!location) return;

    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`;

        const response = await fetch(url, {
          headers: {
            "User-Agent": "MyReactNativeApp/1.0 (contact@example.com)",
          },
        });

        const data = await response.json();

        if (data && data.address) {
          setAddress(data.display_name);
        }
      } catch (error) {
        console.error("Error fetching address:", error);
      }
    })();
  }, [location]);

  const cart = useCartStore();

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon ☀️";
    if (hour < 21) return "Good Evening 🌇";
    return "Good Night 🌙";
  };

  const filteredProducts = products[selectedCategory]?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={address ? styles.location : {}}>
              {address ? (
                <Text style={styles.address}>{address}</Text>
              ) : (
                <TouchableOpacity onPress={getLocation}>
                  <Text>Fetch My Location</Text>
                </TouchableOpacity>
              )}
            </Text>
          </View>

          <View style={styles.cartIcon}>

            <TouchableOpacity
              onPress={logout}
              style={{
                padding : 16,
                paddingVertical : 8,
                backgroundColor: "red",
                margin: 16,
                borderRadius: 8
              }}
            >
              <Text style={{ color: "white", textAlign: "center" }}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#777" />

          <TextInput
            placeholder="Search groceries..."
            placeholderTextColor="#999"
            style={styles.searchBar}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* CATEGORIES */}
        <Text style={styles.sectionTitle}>Shop by Categories</Text>

        <View style={styles.categoryGrid}>
          {categories.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryCard,
                selectedCategory === item.name && styles.activeCategory,
              ]}
              onPress={() => setSelectedCategory(item.name)}
            >
              <Image source={{ uri: item.image }} style={styles.categoryImg} />
              <Text style={styles.categoryText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* PRODUCTS */}
        <Text style={styles.sectionTitle}>{selectedCategory}</Text>

        <View style={styles.productGrid}>
          {filteredProducts?.map((item) => (
            <View key={item.id} style={styles.productCard}>
              <Image source={{ uri: item.image }} style={styles.productImg} />

              <Text style={styles.delivery}>⏱ 8 MINS</Text>

              <Text style={styles.productName}>{item.name}</Text>

              <Text style={styles.productQty}>1Kg</Text>

              <View style={styles.bottomRow}>
                <Text style={styles.price}>₹{item.price}</Text>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => cart.addItem(item , "MOCK_VENDOR_ID")}
                >
                  <Text style={styles.addText}>ADD</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* STORES */}
        <Text style={styles.sectionTitle}>Nearby Stores</Text>

        <View style={styles.storeGrid}>
          {nearbyStores.map((store, index) => (
            <View key={index} style={styles.storeCard}>
              <View style={styles.storeHeader}>
                <Image
                  source={{ uri: store.image }}
                  style={styles.storeImage}
                />

                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>

                  <View style={styles.storeMeta}>
                    <View style={styles.ratingBox}>
                      <Text style={styles.ratingText}>⭐ {store.rating}</Text>
                    </View>

                    <View style={styles.metaBox}>
                      <Text style={styles.metaText}>{store.distance}</Text>
                    </View>

                    <View style={styles.timeBox}>
                      <Text style={styles.timeText}>{store.time}</Text>
                    </View>
                  </View>

                  <Text style={styles.categoryText}>
                    🛒 Grocery • 🥬 Fruits • 🥛 Dairy
                  </Text>

                  <Text style={styles.offerText}>
                    10% OFF on orders above ₹299
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.viewBtn}>
                <Text style={styles.viewText}>View Store</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FLOATING CART */}
      <TouchableOpacity TouchableOpacity style={styles.floatingBtn}>
        <Ionicons name="cart" size={24} color="white" />
        {cart.getItemCount() > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cart.getItemCount() }</Text>
              </View>
            )}
      </TouchableOpacity>
    </View>
  );
}

// ================= STYLES =================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f6f6" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  greeting: { fontSize: 22, fontWeight: "bold" },

  location: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },

  address: {
    fontSize: 13,
    color: "#6b6b6b",
    marginTop: 2,
    maxWidth: 260,
  },

  cartIcon: {
    position: "relative",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    backgroundColor: "#1ca049",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  badgeText: { color: "white", fontSize: 12 },

  searchBox: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#dcdcdc",
  },

  searchBar: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: "none",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 20,
  },

  /* categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginTop: 10,
  },

  categoryCard: {
    width: "29%",
    backgroundColor: "white",
    marginVertical: 7,
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
  },

  activeCategory: {
    borderWidth: 2,
    borderColor: "#1ca049",
  },

  categoryImg: { width: 120, height: 110, borderRadius: 12 },
  categoryText: { marginTop: 6, fontWeight: "600" }, */
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "start",
    marginLeft: 20,
    marginTop: 10,
  },

  categoryCard: {
    width: 110,
    height: 130,
    padding: 8,
    borderRadius: 12,
    margin: 6,
    backgroundColor: "#fff",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,

    elevation: 2,

    alignItems: "center",
    justifyContent: "center",
  },

  categoryImg: {
    width: 75,
    height: 75,
    borderRadius: 10,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
    color: "#333",
  },

  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginLeft: 20,
    marginTop: 10,
  },

  productCard: {
    width: 200,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e6e6e6",
  },

  productImg: {
    width: "100%",
    height: 150,
    resizeMode: "contain",
    marginBottom: 8,
  },

  delivery: {
    alignSelf: "flex-start",
    fontSize: 11,
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    color: "#1ca049",
    fontWeight: "700",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },

  productName: {
    fontWeight: "600",
    fontSize: 15,
    marginBottom: 4,
  },

  productQty: {
    fontSize: 13,
    color: "#777",
    marginBottom: 8,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  price: {
    fontWeight: "bold",
    fontSize: 16,
  },

  addBtn: {
    borderWidth: 1,
    borderColor: "#1ca049",
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
  },

  addText: {
    color: "#1ca049",
    fontWeight: "700",
  },

  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  storeHeader: {
    flexDirection: "row",
    gap: 12,
  },

  storeImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },

  storeInfo: {
    flex: 1,
  },

  categoryText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },

  offerText: {
    fontSize: 12,
    color: "#1ca049",
    marginTop: 4,
    fontWeight: "600",
  },

  viewBtn: {
    marginTop: 12,
    backgroundColor: "#1ca049",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },

  viewText: {
    color: "white",
    fontWeight: "600",
  },

  storeCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    marginTop: 14,

    borderWidth: 1,
    borderColor: "#eaeaea",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  storeName: {
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 10,
  },

  storeMeta: {
    flexDirection: "row",
    gap: 10,
  },

  ratingBox: {
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  metaBox: {
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  timeBox: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  ratingText: {
    fontWeight: "600",
  },

  metaText: {
    color: "#555",
  },

  timeText: {
    color: "#1ca049",
    fontWeight: "700",
  },

  floatingBtn: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#1ca049",
    padding: 15,
    borderRadius: 30,
    elevation: 5,
  },
});
