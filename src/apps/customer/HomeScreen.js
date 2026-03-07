import React, { useState } from "react";
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
import useCartStore from "../../store/cartStore";



export default function HomeScreen() {
 const addItem = useCartStore((state) => state.addItem);
  const [selectedCategory, setSelectedCategory] = useState("Vegetables");
  const [cartCount, setCartCount] = useState(0);

  // ================= CATEGORIES =================
  const categories = [
    {
      name: "Vegetables",
      image:
        "https://images.unsplash.com/photo-1542838132-92c53300491e",
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
      image:
        "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f",
    },
    {
      name: "Snacks",
      image:
        "https://images.unsplash.com/photo-1599490659213-e2b9527bd087",
    },
    {
      name: "Beverages",
      image:
        "https://images.unsplash.com/photo-1544145945-f90425340c7e",
    },
  ];

  // ================= PRODUCTS =================
  const products = {
    Vegetables: [
      {
        id: 1,
        name: "Tomatoes",
        price: "50",
        image:
          "https://images.unsplash.com/photo-1561136594-7f68413baa99",
      },
      {
        id: 2,
        name: "Cucumber",
        price: "30",
        image:
          "https://images.unsplash.com/photo-1568584711271-6c929fb49b60?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        id: 3,
        name: "Carrot",
        price: "40",
        image:
          "https://images.unsplash.com/photo-1447175008436-054170c2e979",
      },
      {
        id: 4,
        name: "Broccoli",
        price: "80",
        image:
          "https://images.unsplash.com/photo-1589927986089-35812388d1f4",
      },
      {
        id: 5,
        name: "Spinach",
        price: "30",
        image:
          "https://images.unsplash.com/photo-1576045057995-568f588f82fb",
      },
      {
        id: 6,
        name: "Potatoes",
        price: "20",
        image:
          "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
    ],

    Fruits: [
      {
        id: 7,
        name: "Apple",
        price: "180",
        image:
          "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
      },
      {
        id: 8,
        name: "Banana",
        price: "60",
        image:
          "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e",
      },
      {
        id: 9,
        name: "Orange",
        price: "40",
        image:
          "https://images.unsplash.com/photo-1580052614034-c55d20bfee3b",
      },
      {
        id: 10,
        name: "Strawberry",
        price: "100",
        image:
          "https://images.unsplash.com/photo-1464965911861-746a04b4bca6",
      },
      {
        id: 11,
        name: "Grapes",
        price: "60",
        image:
          "https://images.unsplash.com/photo-1423483641154-5411ec9c0ddf?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        id: 12,
        name: "Pineapple",
        price: "150",
        image:
          "https://images.unsplash.com/photo-1623689071937-c3eeaf91650c?q=80&w=1174&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      }
    ],

    Dairy: [
      {
        id: 13,
        name: "Milk",
        price: "80",
        image:
          "https://images.unsplash.com/photo-1757802868665-60b771aa399b?q=80&w=1105&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        id: 14,
        name: "Cheese",
        price: "85",
        image:
          "https://images.unsplash.com/photo-1654513547430-973fe7570159?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        id: 15,
        name: "Butter",
        price: "45",
        image:
          "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        id: 16,
        name: "Yogurt",
        price: "69",
        image:
          "https://images.unsplash.com/photo-1604095853918-1a1823a63dd5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
    ],

    Meat: [
      {
      id: 17,
      name: "Chicken",
      price: "322",
      image: 
      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
       {
      id: 18,
      name: "Fish",
      price: "229",
      image: 
      "https://images.unsplash.com/photo-1635843125771-e8eaca55d7da?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
       },
       {
        id:19,
        name: "Goat Meat",
        price: "659",
        image:
        "https://images.unsplash.com/photo-1606677661991-446cea8ee182?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"


       },
       {
        id:20,
        name: "frozen Meat",
        price: "889",
        image:
        "https://images.unsplash.com/photo-1547637205-fde0c9011f9d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

       },

    ],
    Beverages: [
      {
        id:21,
        name: "Soft Drinks",
        price: "45",
        image:
        "https://images.unsplash.com/photo-1665359045452-bfa257a2a6bf?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      {
        id:22,
        name: "Juices",
        price: "65",
        image:
        "https://images.unsplash.com/photo-1583577612013-4fecf7bf8f13?q=80&w=966&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      {
        id:23,
        name: "Dairy Drinks",
        price: "74",
        image:
        "https://plus.unsplash.com/premium_photo-1695669385408-62d2b7d77861?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
      {
        id:24,
        name: "Tea & Coffee",
        price: "25",
        image:
        "https://images.unsplash.com/photo-1566897245752-b287a7c599a5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
    ],
    Snacks: [
      {
        id:25,
        name:"Chips & Crisps",
        price:"20",
        image:
        "https://images.unsplash.com/photo-1613462847848-f65a8b231bb5?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
      },
            {
        id:26,
        name:"Namkeens & Mixtures",
        price:"20",
        image:
        "https://media.istockphoto.com/id/1217942210/photo/namkeen-fried-food-gujarati-food-gujarat-india.jpg?s=1024x1024&w=is&k=20&c=rZJokW-fq4Uh_3cR9zI1PChifQzm5ybt9U0ZcCCxRPY="
            },
            {
              id:27,
              name:"Biscuits & Cookies",
              price: "30",
              image:
              "https://images.unsplash.com/photo-1598839950984-034f6dc7b495?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

            },
            {
              id:28,
              name:"Chocolates",
              price:"40",
              image:
              "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            },


    ],
  };

  // ================= STORES =================
  const nearbyStores = [
    { name: "Sharma Kirana", rating: 4.5, distance: "1.2 km", time: "12 min" },
    { name: "Gupta Store", rating: 4.2, distance: "2 km", time: "15 min" },
    { name: "Fresh Mart", rating: 4.7, distance: "900 m", time: "8 min" },
    { name: "Daily Needs", rating: 4.3, distance: "1.5 km", time: "10 min" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning 👋</Text>
            <Text style={styles.location}>
              Oderstrasse 12a, Berlin • 12 min
            </Text>
          </View>

          <View style={styles.cartIcon}>
            <Ionicons name="cart-outline" size={26} color="black" />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="gray" />
          <TextInput placeholder="Search something" />
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
          {products[selectedCategory]?.map((item) => (
            <View key={item.id} style={styles.productCard}>
              <Image source={{ uri: item.image }} style={styles.productImg} />
              <Text style={styles.price}>₹{item.price}</Text>
              <Text style={styles.productName}>{item.name}</Text>
               
            <TouchableOpacity
  style={styles.addBtn}
  onPress={() => {
    addItem(item, item.vendorId);
    setCartCount(cartCount + 1);
  }}
>
  <Text style={styles.addText}>Add to Cart</Text>
</TouchableOpacity>
           
            </View>
          ))}
        </View>

        {/* STORES */}
        <Text style={styles.sectionTitle}>Nearby Stores</Text>
        {nearbyStores.map((store, index) => (
          <View key={index} style={styles.storeCard}>
            <Text style={styles.storeName}>{store.name}</Text>
            <Text>
              ⭐ {store.rating} • {store.distance} • {store.time}
            </Text>
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FLOATING CART */}
     
      <TouchableOpacity style={styles.floatingBtn}>
        <Ionicons name="cart" size={24} color="white" />
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
    padding: 20,
  },

  greeting: { fontSize: 22, fontWeight: "bold" },
  location: { color: "gray" },

  cartIcon: { position: "relative" },

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
    backgroundColor: "#eaeaea",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 10,
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
  justifyContent: "center",
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
    justifyContent: "space-around",
  },

  productCard: {
    width: "45%",
    backgroundColor: "white",
    marginVertical: 10,
    borderRadius: 16,
    padding: 10,
    elevation: 3,
  },

  productImg: {
    width: "60%",
    height: 130,
    borderRadius: 12,
  },

  productName: {
    fontWeight: "600",
    marginTop: 6,
  },

  price: {
    color: "#1ca049",
    fontWeight: "bold",
    marginTop: 6,
  },

  addBtn: {
    marginTop: 8,
    width:120,
    backgroundColor: "#1ca049",
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },

  addText: {
    color: "white",
    fontWeight: "600",
  },

  storeCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },

  storeName: { fontWeight: "bold", fontSize: 16 },

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