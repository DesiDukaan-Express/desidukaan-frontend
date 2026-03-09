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
import { useNavigation } from "@react-navigation/native";

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

const recentOrders = [
  {
    id: "1",
    name: "Gupta General Store",
    time: "2 days ago",
    image:
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400",
  },
  {
    id: "2",
    name: "Bikaner Sweets & Snacks",
    time: "5 days ago",
    image:
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400",
  },
  {
    id: "3",
    name: "Fresh Veggie Mart",
    time: "1 week ago",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
  },
  {
    id: "4",
    name: "Sharma Dairy Store",
    time: "3 days ago",
    image:
      "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
  },
  {
    id: "5",
    name: "Daily Needs Kirana",
    time: "4 days ago",
    image:
      "https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400",
  },
];


const IMG = {
  promo: 'https://images.unsplash.com/photo-1543168256-418811576931?w=700&q=80'
};

const C = {
  bg: '#F4F8F4',
  white: '#FFFFFF',
  green: '#1A9E3F',
  greenDark: '#147832',
  greenLight: '#E8F5ED',
  greenMid: '#C8E6D0',
  greenCard: '#1DB954',
  accent: '#FF6B2C',
  accentLight: '#FFF0E9',
  yellow: '#FFB800',
  yellowLight: '#FFF8E7',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  text: '#0F1F0F',
  textMed: '#3D5A3E',
  textLight: '#7A9A7B',
  border: '#E0EDE1',
  shadow: '#0F1F0F',
  tag1: '#E8F5ED',
  tag1Text: '#1A9E3F',
  tag2: '#FFF0E9',
  tag2Text: '#FF6B2C',
  tag3: '#FFF8E7',
  tag3Text: '#B47D00',
};

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");

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

  const navigate = useNavigation();

  const filteredProducts = products[selectedCategory]?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.locationBox}>
            <Ionicons name="location" size={20} color="#1ca049" />

            <View>
              <Text style={styles.locationTitle}>Home</Text>

              <Text numberOfLines={1} style={styles.locationSub}>
                {address || "Fetching location..."}
              </Text>
            </View>

            <Ionicons name="chevron-down" size={16} color="#777" />
          </View>

          <View style={styles.headerIcons}>
            <Ionicons name="notifications-outline" size={22} color="#333" />
            <Ionicons name="person-circle-outline" size={28} color="#1ca049" />
          </View>
        </View>

        {/* SEARCH */}
        <TouchableOpacity
          style={{...styles.searchContainer , cursor : "auto  " }}
          onPress={() => navigate.navigate("Search")}
        >
          <Ionicons name="search" size={18} color="#888" />

          <TextInput
            placeholder="Search for stores or items"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </TouchableOpacity>

        {/* Banner */}
        {/* <View style={styles.offerBanner}>
          <View>
            <Text style={styles.offerSmall}>FLASH SALE</Text>
            <Text style={styles.offerTitle}>50% OFF</Text>
            <Text style={styles.offerDesc}>On your first 3 orders</Text>

            <TouchableOpacity style={styles.offerButton}>
              <Text style={styles.offerBtnText}>USE: FIRST50</Text>
            </TouchableOpacity>
          </View>
        </View> */}
        <View style={styles.bannerSection}>
          <TouchableOpacity style={styles.banner} activeOpacity={0.9}>
            <Image source={{ uri: IMG.promo }} style={styles.bannerImg} resizeMode="cover" />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerContent}>
              <View style={styles.bannerTag}>
                <Text style={styles.bannerTagTxt}>LIMITED OFFER</Text>
              </View>
              <Text style={styles.bannerTitle}>Fresh Veggies{'\n'}Up to 30% Off</Text>
              <View style={[styles.bannerBtn, { backgroundColor: C.white }]}>
                <Text style={[styles.bannerBtnTxt, { color: C.green }]}>Shop Now  →</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stores */}
        <Text style={styles.sectionTitle}>Nearby Stores</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingLeft: 20 }}
        >
          {nearbyStores.map((store, index) => (
            <View key={index} style={styles.storeCard}>

              <Image
                source={{ uri: store.image }}
                style={styles.storeImage}
              />

              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>

                <View style={styles.storeMeta}>
                  <Text style={styles.rating}>⭐ {store.rating}</Text>
                  <Text style={styles.distance}>{store.distance}</Text>
                </View>
              </View>

            </View>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Recently Ordered</Text>

        {recentOrders.map((item, index) => (
          <TouchableOpacity key={index} style={styles.recentCard}>
            <Image
              source={{ uri: item.image }}
              style={styles.recentImage}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.recentName}>{item.name}</Text>
              <Text style={styles.recentTime}>
                Ordered {item.time}
              </Text>

              <Text style={styles.reorderText}>
                Reorder now
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ================= STYLES =================

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },

  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },

  locationTitle: {
    fontWeight: "700",
    fontSize: 14
  },

  locationSub: {
    fontSize: 11,
    color: "#777"
  },

  headerIcons: {
    flexDirection: "row",
    gap: 14
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14
  },

  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    outlineWidth: 0,
    outlineColor: 'transparent'
  }
  ,
  offerBanner: {
    backgroundColor: "#1ca049",
    margin: 20,
    padding: 18,
    borderRadius: 18
  },

  offerSmall: {
    fontSize: 10,
    color: "#d7ffd9",
    fontWeight: "700"
  },

  offerTitle: {
    fontSize: 26,
    color: "white",
    fontWeight: "bold"
  },

  offerDesc: {
    color: "white",
    fontSize: 12
  },

  offerButton: {
    marginTop: 10,
    backgroundColor: "black",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10
  },

  offerBtnText: {
    color: "#1ca049",
    fontWeight: "700"
  },
  storeCard: {
    width: 220,
    marginRight: 16
  },

  storeImage: {
    width: "100%",
    height: 140,
    borderRadius: 16
  },

  bannerSection: {
    margin: 20,
  },

  banner: {
    height: 148, borderRadius: 22, overflow: 'hidden',
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 6,
  },

  bannerImg: { width: '100%', height: '100%' },

  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,40,14,0.55)' },

  bannerContent: { ...StyleSheet.absoluteFillObject, padding: 20, justifyContent: 'center' },

  bannerTag: {
    alignSelf: 'flex-start', backgroundColor: C.greenCard,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 9,
  },

  bannerTagTxt: { fontSize: 9, color: C.white, fontWeight: '900', letterSpacing: 1 },

  bannerTitle: { fontSize: 22, color: C.white, fontWeight: '900', lineHeight: 28, marginBottom: 14 },

  bannerBtn: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 7,
  },

  bannerBtnTxt: { fontSize: 13, fontWeight: '800' },

  storeInfo: {
    marginTop: 8
  },

  storeName: {
    fontWeight: "700",
    fontSize: 15
  },

  storeMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },

  rating: {
    fontSize: 12
  },

  distance: {
    fontSize: 12,
    color: "#666"
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "white",
    borderRadius: 14
  },

  recentImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12
  },

  recentName: {
    fontWeight: "700"
  },

  recentTime: {
    fontSize: 12,
    color: "#777"
  },

  reorderText: {
    fontSize: 11,
    color: "#1ca049",
    marginTop: 4
  },
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  locationTitle: {
    fontWeight: "700",
    fontSize: 16
  },

  locationSub: {
    fontSize: 12,
    color: "#777",
    maxWidth: 200
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,

    elevation: 3,

  },
  offerBanner: {
    backgroundColor: "#1ca049",
    marginHorizontal: 20,
    marginTop: 18,
    padding: 20,
    borderRadius: 18,

    shadowColor: "#1ca049",
    shadowOpacity: 0.3,
    shadowRadius: 10,

    elevation: 6
  },
  offerButton: {
    marginTop: 12,
    backgroundColor: "white",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: "flex-start"
  },

  offerBtnText: {
    color: "#1ca049",
    fontWeight: "700"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 10
  },
  storeCard: {
    width: 240,
    marginRight: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 10,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,

    elevation: 4
  },
  storeImage: {
    width: "100%",
    height: 140,
    borderRadius: 14
  },
  storeInfo: {
    marginTop: 10
  },

  storeName: {
    fontWeight: "700",
    fontSize: 16
  },

  storeMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4
  },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 16,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,

    elevation: 2
  },
  recentImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12
  },
  recentName: {
    fontWeight: "700",
    fontSize: 15
  },

  recentTime: {
    fontSize: 12,
    color: "#777",
    marginTop: 2
  },

  reorderText: {
    fontSize: 12,
    color: "#1ca049",
    marginTop: 6,
    fontWeight: "600"
  }
});