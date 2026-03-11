import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";

import useCartStore from "../../store/cartStore";
import FloatCart from "./FloatCart";
import { useNavigation } from "@react-navigation/native";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  green: "#1A9E3F",
  greenDark: "#147832",
  greenLight: "#E6F4EB",
  greenMid: "#B8DFCA",
  text: "#111827",
  textMed: "#4B5563",
  textLight: "#9CA3AF",
  border: "#E5E7EB",
  divider: "#F3F4F6",
  white: "#FFFFFF",
  shadow: "#000000",
  yellow: "#F59E0B",
  red: "#DC2626",
};

// ─── Search icon ──────────────────────────────────────────────────────────────
function SearchIcon({ size = 18, color = C.textLight }) {
  const r = size * 0.38;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          left: size * 0.04,
          top: size * 0.04,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: size * 0.09,
          borderColor: color,
          backgroundColor: "transparent",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: size * 0.62,
          top: size * 0.62,
          width: size * 0.1,
          height: size * 0.32,
          backgroundColor: color,
          borderRadius: 3,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

// ─── ALL PRODUCTS (80 items, rich keywords) ───────────────────────────────────
const ALL_PRODUCTS = [
  // DAIRY
  {
    id: "p1",
    name: "Amul Gold Full Cream Milk",
    brand: "Amul",
    weight: "1 L",
    price: 68,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=85",
    keywords: [
      "milk",
      "dairy",
      "amul",
      "full cream",
      "drink",
      "beverage",
      "fresh",
      "white",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p2",
    name: "Amul Taza Toned Milk",
    brand: "Amul",
    weight: "500 ml",
    price: 28,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=85",
    keywords: [
      "milk",
      "dairy",
      "amul",
      "toned",
      "drink",
      "low fat",
      "beverage",
      "fresh",
    ],
    storeIds: ["s1", "s4", "s6", "s9"],
  },
  {
    id: "p3",
    name: "Amul Butter Unsalted",
    brand: "Amul",
    weight: "500 g",
    price: 275,
    mrp: 300,
    inStock: true,
    img: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=85",
    keywords: [
      "butter",
      "dairy",
      "amul",
      "spread",
      "fat",
      "cooking",
      "baking",
      "bread",
    ],
    storeIds: ["s1", "s2", "s3", "s6", "s8", "s10"],
  },
  {
    id: "p4",
    name: "Amul Processed Cheese Slices",
    brand: "Amul",
    weight: "200 g",
    price: 120,
    mrp: 135,
    inStock: true,
    img: "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400&q=85",
    keywords: [
      "cheese",
      "dairy",
      "amul",
      "slices",
      "sandwich",
      "bread",
      "snack",
    ],
    storeIds: ["s1", "s2", "s6", "s7", "s9"],
  },
  {
    id: "p5",
    name: "Epigamia Greek Yogurt Plain",
    brand: "Epigamia",
    weight: "400 g",
    price: 110,
    mrp: 130,
    inStock: false,
    img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=85",
    keywords: [
      "yogurt",
      "curd",
      "dairy",
      "greek",
      "organic",
      "protein",
      "breakfast",
      "healthy",
      "probiotic",
    ],
    storeIds: ["s3", "s6", "s8"],
  },
  {
    id: "p6",
    name: "Mother Dairy Fresh Paneer",
    brand: "Mother Dairy",
    weight: "200 g",
    price: 89,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=85",
    keywords: [
      "paneer",
      "dairy",
      "cottage cheese",
      "protein",
      "mother dairy",
      "fresh",
      "cooking",
    ],
    storeIds: ["s1", "s3", "s4", "s5", "s6", "s9", "s10"],
  },
  {
    id: "p7",
    name: "Nestle Milkmaid Condensed Milk",
    brand: "Nestle",
    weight: "400 g",
    price: 149,
    mrp: 165,
    inStock: true,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=85",
    keywords: [
      "milk",
      "condensed",
      "nestle",
      "dairy",
      "sweet",
      "baking",
      "dessert",
    ],
    storeIds: ["s2", "s5", "s7", "s8", "s9"],
  },
  {
    id: "p8",
    name: "Verka Full Cream Milk Pouch",
    brand: "Verka",
    weight: "500 ml",
    price: 30,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=85",
    keywords: [
      "milk",
      "dairy",
      "verka",
      "full cream",
      "drink",
      "beverage",
      "fresh",
      "white",
    ],
    storeIds: ["s2", "s5", "s7", "s8", "s10"],
  },
  {
    id: "p9",
    name: "Amul Mozzarella Cheese Block",
    brand: "Amul",
    weight: "200 g",
    price: 175,
    mrp: 195,
    inStock: true,
    img: "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400&q=85",
    keywords: [
      "cheese",
      "dairy",
      "amul",
      "mozzarella",
      "pizza",
      "cooking",
      "baking",
    ],
    storeIds: ["s1", "s3", "s6", "s8", "s10"],
  },
  {
    id: "p10",
    name: "Amul Dahi (Curd)",
    brand: "Amul",
    weight: "400 g",
    price: 45,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=85",
    keywords: [
      "curd",
      "yogurt",
      "dahi",
      "dairy",
      "amul",
      "probiotic",
      "fresh",
      "breakfast",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s9"],
  },
  {
    id: "p61",
    name: "Mother Dairy Full Cream Milk",
    brand: "Mother Dairy",
    weight: "1 L",
    price: 66,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=85",
    keywords: [
      "milk",
      "dairy",
      "mother dairy",
      "full cream",
      "drink",
      "white",
      "fresh",
      "beverage",
    ],
    storeIds: ["s2", "s3", "s6", "s8", "s10"],
  },
  {
    id: "p62",
    name: "Nestle Slim Skimmed Milk",
    brand: "Nestle",
    weight: "1 L",
    price: 72,
    mrp: 80,
    inStock: true,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=85",
    keywords: [
      "milk",
      "dairy",
      "nestle",
      "skimmed",
      "low fat",
      "slim",
      "drink",
      "white",
      "beverage",
      "healthy",
    ],
    storeIds: ["s3", "s5", "s6", "s8", "s10"],
  },
  {
    id: "p63",
    name: "Britannia Cheese Spread",
    brand: "Britannia",
    weight: "180 g",
    price: 95,
    mrp: 105,
    inStock: true,
    img: "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400&q=85",
    keywords: [
      "cheese",
      "dairy",
      "britannia",
      "spread",
      "bread",
      "sandwich",
      "milk",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s9"],
  },
  {
    id: "p64",
    name: "Amul Kool Chocolate Milk",
    brand: "Amul",
    weight: "200 ml",
    price: 25,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=85",
    keywords: [
      "milk",
      "chocolate milk",
      "amul",
      "dairy",
      "drink",
      "flavoured",
      "cold",
      "kool",
      "beverage",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s9", "s10"],
  },
  // EGGS
  {
    id: "p11",
    name: "Farm Fresh Brown Eggs",
    brand: "Country Egg",
    weight: "12 pcs",
    price: 89,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=85",
    keywords: [
      "eggs",
      "egg",
      "farm",
      "protein",
      "brown eggs",
      "breakfast",
      "fresh",
      "boiled",
    ],
    storeIds: ["s1", "s3", "s4", "s5", "s6", "s9", "s10"],
  },
  {
    id: "p12",
    name: "Keggland White Eggs",
    brand: "Keggland",
    weight: "6 pcs",
    price: 45,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=85",
    keywords: [
      "eggs",
      "egg",
      "white eggs",
      "protein",
      "breakfast",
      "fresh",
      "boiled",
    ],
    storeIds: ["s2", "s4", "s7", "s8", "s10"],
  },
  {
    id: "p13",
    name: "Organic Free-Range Eggs",
    brand: "Go Organic",
    weight: "6 pcs",
    price: 79,
    mrp: 90,
    inStock: true,
    img: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&q=85",
    keywords: [
      "eggs",
      "egg",
      "organic",
      "free range",
      "protein",
      "breakfast",
      "healthy",
    ],
    storeIds: ["s3", "s6", "s8", "s10"],
  },
  {
    id: "p14",
    name: "Suguna Cage-Free Eggs",
    brand: "Suguna",
    weight: "6 pcs",
    price: 55,
    mrp: 60,
    inStock: true,
    img: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=85",
    keywords: [
      "eggs",
      "egg",
      "cage free",
      "protein",
      "breakfast",
      "fresh",
      "suguna",
    ],
    storeIds: ["s2", "s5", "s7", "s9", "s10"],
  },
  // BREAD & BAKERY
  {
    id: "p15",
    name: "Britannia Whole Wheat Bread",
    brand: "Britannia",
    weight: "400 g",
    price: 45,
    mrp: 50,
    inStock: true,
    img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=85",
    keywords: [
      "bread",
      "wheat",
      "bakery",
      "britannia",
      "whole wheat",
      "sandwich",
      "breakfast",
      "toast",
      "loaf",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s8", "s9"],
  },
  {
    id: "p16",
    name: "Harvest Gold White Bread",
    brand: "Harvest Gold",
    weight: "400 g",
    price: 40,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=85",
    keywords: [
      "bread",
      "white bread",
      "bakery",
      "harvest gold",
      "sandwich",
      "toast",
      "loaf",
      "breakfast",
    ],
    storeIds: ["s2", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p17",
    name: "English Oven Multigrain Bread",
    brand: "English Oven",
    weight: "400 g",
    price: 55,
    mrp: 60,
    inStock: true,
    img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=85",
    keywords: [
      "bread",
      "multigrain",
      "bakery",
      "english oven",
      "sandwich",
      "healthy",
      "toast",
      "loaf",
      "breakfast",
    ],
    storeIds: ["s3", "s6", "s8", "s9", "s10"],
  },
  {
    id: "p18",
    name: "Britannia NutriChoice Digestive",
    brand: "Britannia",
    weight: "250 g",
    price: 65,
    mrp: 72,
    inStock: true,
    img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=85",
    keywords: [
      "biscuit",
      "cookies",
      "bakery",
      "britannia",
      "digestive",
      "snacks",
      "healthy",
      "oats",
    ],
    storeIds: ["s1", "s2", "s4", "s7", "s9"],
  },
  {
    id: "p19",
    name: "Parle-G Original Biscuits",
    brand: "Parle",
    weight: "800 g",
    price: 50,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=85",
    keywords: [
      "biscuit",
      "parle",
      "cookies",
      "snacks",
      "bakery",
      "tea time",
      "sweet",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s9", "s10"],
  },
  // SNACKS
  {
    id: "p20",
    name: "Lay's Classic Salted Chips",
    brand: "Lay's",
    weight: "104 g",
    price: 30,
    mrp: 33,
    inStock: true,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=85",
    keywords: [
      "chips",
      "lays",
      "snacks",
      "crisps",
      "potato chips",
      "fried",
      "salty",
      "party",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p21",
    name: "Lay's Magic Masala",
    brand: "Lay's",
    weight: "104 g",
    price: 30,
    mrp: 33,
    inStock: true,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=85",
    keywords: [
      "chips",
      "lays",
      "snacks",
      "masala",
      "potato chips",
      "spicy",
      "fried",
      "salty",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s9", "s10"],
  },
  {
    id: "p22",
    name: "Haldiram Aloo Bhujia",
    brand: "Haldiram",
    weight: "200 g",
    price: 79,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=85",
    keywords: [
      "bhujia",
      "snacks",
      "haldiram",
      "namkeen",
      "aloo",
      "salty",
      "party",
    ],
    storeIds: ["s1", "s2", "s4", "s7", "s9"],
  },
  {
    id: "p23",
    name: "Kurkure Masala Munch",
    brand: "Kurkure",
    weight: "90 g",
    price: 20,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=85",
    keywords: [
      "kurkure",
      "snacks",
      "chips",
      "masala",
      "namkeen",
      "spicy",
      "fried",
      "salty",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s9", "s10"],
  },
  {
    id: "p24",
    name: "Maggi 2-Minute Noodles",
    brand: "Nestle",
    weight: "420 g",
    price: 55,
    mrp: 60,
    inStock: true,
    img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=85",
    keywords: [
      "maggi",
      "noodles",
      "instant",
      "snacks",
      "nestle",
      "quick meal",
      "pasta",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p25",
    name: "Sunfeast Dark Fantasy Choco Fills",
    brand: "ITC",
    weight: "150 g",
    price: 55,
    mrp: 60,
    inStock: true,
    img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=85",
    keywords: [
      "biscuit",
      "cookies",
      "snacks",
      "itc",
      "chocolate",
      "choco",
      "sweet",
      "dessert",
    ],
    storeIds: ["s2", "s5", "s7", "s8", "s10"],
  },
  {
    id: "p26",
    name: "Pringles Original",
    brand: "Pringles",
    weight: "107 g",
    price: 149,
    mrp: 160,
    inStock: true,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=85",
    keywords: [
      "chips",
      "pringles",
      "snacks",
      "crisps",
      "imported",
      "salty",
      "party",
    ],
    storeIds: ["s2", "s3", "s9", "s10"],
  },
  {
    id: "p27",
    name: "Too Yumm Multigrain Chips",
    brand: "Too Yumm",
    weight: "80 g",
    price: 25,
    mrp: 28,
    inStock: true,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=85",
    keywords: ["chips", "snacks", "multigrain", "healthy", "baked", "salty"],
    storeIds: ["s1", "s5", "s6", "s9", "s10"],
  },
  {
    id: "p67",
    name: "Bingo Mad Angles",
    brand: "ITC",
    weight: "130 g",
    price: 20,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=85",
    keywords: [
      "chips",
      "bingo",
      "snacks",
      "itc",
      "fried",
      "salty",
      "masala",
      "party",
    ],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p68",
    name: "Doritos Nacho Cheese",
    brand: "Doritos",
    weight: "114 g",
    price: 130,
    mrp: 140,
    inStock: true,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=85",
    keywords: [
      "chips",
      "doritos",
      "snacks",
      "imported",
      "cheese",
      "nacho",
      "crisps",
      "party",
    ],
    storeIds: ["s3", "s6", "s9", "s10"],
  },
  // BEVERAGES — JUICE
  {
    id: "p28",
    name: "Tropicana Orange Juice",
    brand: "Tropicana",
    weight: "1 L",
    price: 99,
    mrp: 115,
    inStock: true,
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=85",
    keywords: [
      "juice",
      "orange",
      "tropicana",
      "drinks",
      "beverage",
      "fruit juice",
      "cold",
    ],
    storeIds: ["s2", "s4", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p29",
    name: "Real Mixed Fruit Juice",
    brand: "Dabur",
    weight: "1 L",
    price: 85,
    mrp: 95,
    inStock: true,
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=85",
    keywords: [
      "juice",
      "mixed fruit",
      "dabur",
      "drinks",
      "beverage",
      "fruit juice",
      "real",
    ],
    storeIds: ["s2", "s5", "s6", "s8", "s9", "s10"],
  },
  {
    id: "p30",
    name: "Paper Boat Aamras",
    brand: "Paper Boat",
    weight: "200 ml",
    price: 30,
    mrp: 35,
    inStock: true,
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=85",
    keywords: [
      "juice",
      "mango",
      "drinks",
      "beverage",
      "aam",
      "paper boat",
      "fruit juice",
      "cold",
    ],
    storeIds: ["s2", "s5", "s6", "s9", "s10"],
  },
  {
    id: "p69",
    name: "Tropicana Apple Juice",
    brand: "Tropicana",
    weight: "1 L",
    price: 99,
    mrp: 115,
    inStock: true,
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=85",
    keywords: [
      "juice",
      "apple",
      "tropicana",
      "drinks",
      "beverage",
      "fruit juice",
      "cold",
    ],
    storeIds: ["s2", "s4", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p70",
    name: "B Natural Guava Juice",
    brand: "ITC",
    weight: "1 L",
    price: 80,
    mrp: 90,
    inStock: true,
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=85",
    keywords: [
      "juice",
      "guava",
      "itc",
      "drinks",
      "beverage",
      "fruit juice",
      "b natural",
    ],
    storeIds: ["s1", "s5", "s6", "s9", "s10"],
  },
  {
    id: "p71",
    name: "Minute Maid Pulpy Orange",
    brand: "Coca Cola",
    weight: "1 L",
    price: 89,
    mrp: 99,
    inStock: true,
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=85",
    keywords: [
      "juice",
      "orange",
      "minute maid",
      "drinks",
      "beverage",
      "fruit juice",
      "cold",
      "pulpy",
    ],
    storeIds: ["s1", "s2", "s4", "s7", "s9", "s10"],
  },
  {
    id: "p72",
    name: "Raw Pressery Watermelon Juice",
    brand: "Raw Pressery",
    weight: "250 ml",
    price: 75,
    mrp: 85,
    inStock: true,
    img: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=85",
    keywords: [
      "juice",
      "watermelon",
      "raw pressery",
      "drinks",
      "beverage",
      "cold pressed",
      "fruit juice",
      "healthy",
    ],
    storeIds: ["s3", "s6", "s8", "s10"],
  },
  // BEVERAGES — TEA & COFFEE
  {
    id: "p31",
    name: "Tata Tea Premium Leaf",
    brand: "Tata",
    weight: "500 g",
    price: 220,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=85",
    keywords: [
      "tea",
      "tata",
      "beverages",
      "chai",
      "leaf tea",
      "drink",
      "hot",
      "morning",
    ],
    storeIds: ["s1", "s2", "s3", "s7", "s8"],
  },
  {
    id: "p32",
    name: "Brooke Bond Red Label Tea",
    brand: "HUL",
    weight: "500 g",
    price: 199,
    mrp: 215,
    inStock: true,
    img: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=85",
    keywords: [
      "tea",
      "red label",
      "hul",
      "beverages",
      "chai",
      "drink",
      "hot",
      "morning",
      "leaf tea",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p33",
    name: "Wagh Bakri Premium Tea",
    brand: "Wagh Bakri",
    weight: "250 g",
    price: 115,
    mrp: 125,
    inStock: true,
    img: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&q=85",
    keywords: [
      "tea",
      "wagh bakri",
      "beverages",
      "chai",
      "drink",
      "hot",
      "morning",
      "leaf tea",
    ],
    storeIds: ["s1", "s2", "s5", "s8", "s10"],
  },
  {
    id: "p34",
    name: "Nescafé Classic Coffee",
    brand: "Nescafé",
    weight: "100 g",
    price: 95,
    mrp: 109,
    inStock: true,
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=85",
    keywords: [
      "coffee",
      "nescafe",
      "beverages",
      "instant coffee",
      "drink",
      "hot",
      "morning",
      "cafe",
    ],
    storeIds: ["s1", "s2", "s4", "s7", "s8", "s9"],
  },
  {
    id: "p35",
    name: "Bru Instant Coffee",
    brand: "HUL",
    weight: "50 g",
    price: 65,
    mrp: 72,
    inStock: true,
    img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=85",
    keywords: [
      "coffee",
      "bru",
      "hul",
      "beverages",
      "instant coffee",
      "drink",
      "hot",
      "morning",
    ],
    storeIds: ["s2", "s5", "s7", "s8", "s10"],
  },
  {
    id: "p36",
    name: "Nescafé Gold Blend Coffee",
    brand: "Nescafé",
    weight: "50 g",
    price: 175,
    mrp: 199,
    inStock: true,
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=85",
    keywords: [
      "coffee",
      "nescafe",
      "gold",
      "premium",
      "beverages",
      "instant coffee",
      "drink",
      "cafe",
    ],
    storeIds: ["s3", "s6", "s8", "s9", "s10"],
  },
  {
    id: "p73",
    name: "Blue Tokai Vienna Roast Coffee",
    brand: "Blue Tokai",
    weight: "250 g",
    price: 450,
    mrp: 499,
    inStock: true,
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=85",
    keywords: [
      "coffee",
      "blue tokai",
      "filter coffee",
      "premium",
      "gourmet",
      "beverage",
      "roasted",
      "cafe",
    ],
    storeIds: ["s3", "s6", "s8", "s10"],
  },
  {
    id: "p74",
    name: "Continental Malabar Blend Coffee",
    brand: "Continental",
    weight: "200 g",
    price: 210,
    mrp: 240,
    inStock: true,
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=85",
    keywords: [
      "coffee",
      "continental",
      "filter coffee",
      "south indian",
      "beverage",
      "decoction",
      "cafe",
      "drink",
    ],
    storeIds: ["s2", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p57",
    name: "Organic India Tulsi Green Tea",
    brand: "Organic India",
    weight: "25 bags",
    price: 165,
    mrp: 190,
    inStock: true,
    img: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&q=85",
    keywords: [
      "tea",
      "green tea",
      "organic",
      "tulsi",
      "herbal",
      "beverages",
      "healthy",
      "drink",
    ],
    storeIds: ["s3", "s6", "s8", "s10"],
  },
  // VEGETABLES & FRUITS
  {
    id: "p37",
    name: "Organic Baby Spinach",
    brand: "Go Organic",
    weight: "250 g",
    price: 65,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=85",
    keywords: [
      "spinach",
      "greens",
      "organic",
      "veggies",
      "leaves",
      "vegetables",
      "fresh",
      "salad",
      "healthy",
    ],
    storeIds: ["s3", "s5", "s6", "s8", "s10"],
  },
  {
    id: "p38",
    name: "Country Fresh Tomatoes",
    brand: "Farm Direct",
    weight: "500 g",
    price: 35,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=85",
    keywords: [
      "tomato",
      "veggies",
      "fresh",
      "vegetables",
      "cooking",
      "salad",
      "red",
    ],
    storeIds: ["s3", "s5", "s6", "s8", "s10"],
  },
  {
    id: "p39",
    name: "Fresh Cavendish Bananas",
    brand: "Farm Direct",
    weight: "6 pcs",
    price: 49,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=85",
    keywords: ["banana", "fruit", "fresh", "yellow", "healthy", "breakfast"],
    storeIds: ["s3", "s5", "s6", "s8", "s10"],
  },
  {
    id: "p40",
    name: "Red Delicious Apples",
    brand: "Farm Direct",
    weight: "4 pcs",
    price: 79,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&q=85",
    keywords: ["apple", "fruit", "fresh", "red", "healthy", "snack", "sweet"],
    storeIds: ["s3", "s5", "s6", "s8", "s10"],
  },
  {
    id: "p41",
    name: "Fresh Strawberries",
    brand: "Farm Direct",
    weight: "250 g",
    price: 89,
    mrp: 110,
    inStock: false,
    img: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&q=85",
    keywords: [
      "strawberry",
      "fruit",
      "fresh",
      "berries",
      "red",
      "sweet",
      "dessert",
    ],
    storeIds: ["s3", "s6", "s8"],
  },
  {
    id: "p42",
    name: "Seedless Green Grapes",
    brand: "Farm Direct",
    weight: "500 g",
    price: 89,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&q=85",
    keywords: ["grapes", "fruit", "fresh", "green grapes", "sweet", "healthy"],
    storeIds: ["s3", "s5", "s6", "s8", "s10"],
  },
  {
    id: "p43",
    name: "Fresh Broccoli",
    brand: "Farm Direct",
    weight: "300 g",
    price: 55,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=400&q=85",
    keywords: [
      "broccoli",
      "veggies",
      "vegetables",
      "fresh",
      "greens",
      "healthy",
      "salad",
      "cooking",
    ],
    storeIds: ["s3", "s6", "s8", "s10"],
  },
  {
    id: "p44",
    name: "Nendran Bananas",
    brand: "Farm Direct",
    weight: "500 g",
    price: 65,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=85",
    keywords: [
      "banana",
      "nendran",
      "fruit",
      "fresh",
      "yellow",
      "healthy",
      "kerala",
    ],
    storeIds: ["s5", "s6", "s8", "s10"],
  },
  // STAPLES
  {
    id: "p45",
    name: "Aashirvaad Whole Wheat Atta",
    brand: "Aashirvaad",
    weight: "5 kg",
    price: 249,
    mrp: 280,
    inStock: true,
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=85",
    keywords: [
      "atta",
      "wheat",
      "flour",
      "aashirvaad",
      "whole wheat",
      "roti",
      "chapati",
      "cooking",
      "staples",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s9"],
  },
  {
    id: "p46",
    name: "Pillsbury Maida All Purpose Flour",
    brand: "Pillsbury",
    weight: "1 kg",
    price: 55,
    mrp: 60,
    inStock: true,
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=85",
    keywords: [
      "atta",
      "flour",
      "maida",
      "pillsbury",
      "baking",
      "cooking",
      "bread",
      "staples",
      "wheat",
    ],
    storeIds: ["s2", "s5", "s7", "s8", "s9"],
  },
  {
    id: "p47",
    name: "India Gate Basmati Rice Classic",
    brand: "India Gate",
    weight: "5 kg",
    price: 450,
    mrp: 499,
    inStock: true,
    img: "https://images.unsplash.com/photo-1536304993881-ff86e0c9ee89?w=400&q=85",
    keywords: [
      "rice",
      "basmati",
      "india gate",
      "staples",
      "grain",
      "cooking",
      "biryani",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s8", "s9", "s10"],
  },
  {
    id: "p48",
    name: "Dawat Rozana Super Basmati",
    brand: "Dawat",
    weight: "5 kg",
    price: 399,
    mrp: 430,
    inStock: true,
    img: "https://images.unsplash.com/photo-1536304993881-ff86e0c9ee89?w=400&q=85",
    keywords: [
      "rice",
      "basmati",
      "dawat",
      "staples",
      "grain",
      "cooking",
      "biryani",
    ],
    storeIds: ["s2", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p49",
    name: "Fortune Sunflower Oil",
    brand: "Fortune",
    weight: "1 L",
    price: 148,
    mrp: null,
    inStock: true,
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=85",
    keywords: [
      "oil",
      "sunflower",
      "fortune",
      "cooking",
      "edible oil",
      "frying",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s8", "s9"],
  },
  {
    id: "p50",
    name: "Saffola Gold Cooking Oil",
    brand: "Saffola",
    weight: "1 L",
    price: 169,
    mrp: 185,
    inStock: true,
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=85",
    keywords: [
      "oil",
      "saffola",
      "cooking",
      "edible oil",
      "heart",
      "healthy",
      "frying",
    ],
    storeIds: ["s2", "s3", "s6", "s8", "s10"],
  },
  {
    id: "p51",
    name: "Figaro Olive Oil Extra Virgin",
    brand: "Figaro",
    weight: "500 ml",
    price: 349,
    mrp: 399,
    inStock: true,
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=85",
    keywords: [
      "oil",
      "olive oil",
      "figaro",
      "cooking",
      "healthy",
      "extra virgin",
      "salad",
    ],
    storeIds: ["s3", "s6", "s8", "s9", "s10"],
  },
  {
    id: "p52",
    name: "Tata Salt Lite",
    brand: "Tata",
    weight: "1 kg",
    price: 28,
    mrp: 30,
    inStock: true,
    img: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&q=85",
    keywords: ["salt", "tata", "staples", "iodised", "cooking", "seasoning"],
    storeIds: ["s1", "s2", "s4", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p76",
    name: "Kohinoor Super Value Basmati",
    brand: "Kohinoor",
    weight: "5 kg",
    price: 360,
    mrp: 399,
    inStock: true,
    img: "https://images.unsplash.com/photo-1536304993881-ff86e0c9ee89?w=400&q=85",
    keywords: [
      "rice",
      "basmati",
      "kohinoor",
      "staples",
      "grain",
      "cooking",
      "biryani",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p77",
    name: "Fortune Sona Masoori Rice",
    brand: "Fortune",
    weight: "5 kg",
    price: 320,
    mrp: 350,
    inStock: true,
    img: "https://images.unsplash.com/photo-1536304993881-ff86e0c9ee89?w=400&q=85",
    keywords: [
      "rice",
      "sona masoori",
      "fortune",
      "staples",
      "grain",
      "cooking",
      "daily use",
    ],
    storeIds: ["s2", "s5", "s6", "s7", "s8", "s9", "s10"],
  },
  {
    id: "p79",
    name: "Patanjali Atta Whole Wheat",
    brand: "Patanjali",
    weight: "5 kg",
    price: 215,
    mrp: 240,
    inStock: true,
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=85",
    keywords: [
      "atta",
      "wheat",
      "flour",
      "patanjali",
      "whole wheat",
      "roti",
      "chapati",
      "cooking",
      "staples",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s9", "s10"],
  },
  // ORGANIC & HEALTH
  {
    id: "p53",
    name: "Quaker Organic Rolled Oats",
    brand: "Quaker",
    weight: "500 g",
    price: 159,
    mrp: 189,
    inStock: true,
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=85",
    keywords: [
      "oats",
      "quaker",
      "breakfast",
      "organic",
      "rolled oats",
      "healthy",
      "porridge",
    ],
    storeIds: ["s2", "s3", "s6", "s8"],
  },
  {
    id: "p54",
    name: "Saffola Masala Oats",
    brand: "Saffola",
    weight: "400 g",
    price: 129,
    mrp: 149,
    inStock: true,
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=85",
    keywords: [
      "oats",
      "saffola",
      "breakfast",
      "masala",
      "savory",
      "healthy",
      "instant",
      "quick",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s9"],
  },
  {
    id: "p55",
    name: "Dabur Organic Raw Honey",
    brand: "Dabur",
    weight: "250 g",
    price: 199,
    mrp: 249,
    inStock: true,
    img: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=85",
    keywords: [
      "honey",
      "organic",
      "dabur",
      "natural",
      "raw honey",
      "sweet",
      "healthy",
    ],
    storeIds: ["s2", "s3", "s6", "s8", "s10"],
  },
  {
    id: "p56",
    name: "Patanjali Pure Honey",
    brand: "Patanjali",
    weight: "500 g",
    price: 145,
    mrp: 169,
    inStock: true,
    img: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=85",
    keywords: [
      "honey",
      "patanjali",
      "natural",
      "raw honey",
      "sweet",
      "healthy",
      "organic",
    ],
    storeIds: ["s1", "s2", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p58",
    name: "True Elements Raw Almonds",
    brand: "True Elements",
    weight: "250 g",
    price: 199,
    mrp: 229,
    inStock: true,
    img: "https://images.unsplash.com/photo-1574226516831-e1dff420e562?w=400&q=85",
    keywords: [
      "almonds",
      "nuts",
      "organic",
      "dry fruits",
      "healthy",
      "protein",
      "snack",
    ],
    storeIds: ["s3", "s6", "s8", "s9", "s10"],
  },
  {
    id: "p59",
    name: "Yoga Bar Oats & Berries Bar",
    brand: "Yoga Bar",
    weight: "38 g",
    price: 35,
    mrp: 40,
    inStock: true,
    img: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=85",
    keywords: [
      "protein bar",
      "snacks",
      "healthy",
      "oats",
      "yoga bar",
      "berries",
      "energy",
      "bar",
    ],
    storeIds: ["s3", "s6", "s8", "s9", "s10"],
  },
  {
    id: "p60",
    name: "Munchios Mixed Nuts",
    brand: "Munchios",
    weight: "200 g",
    price: 249,
    mrp: 279,
    inStock: true,
    img: "https://images.unsplash.com/photo-1574226516831-e1dff420e562?w=400&q=85",
    keywords: [
      "nuts",
      "dry fruits",
      "mixed nuts",
      "healthy",
      "snack",
      "protein",
      "almonds",
      "cashew",
    ],
    storeIds: ["s3", "s6", "s8", "s9", "s10"],
  },
  {
    id: "p80",
    name: "24 Mantra Organic Atta",
    brand: "24 Mantra",
    weight: "5 kg",
    price: 349,
    mrp: 389,
    inStock: true,
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=85",
    keywords: [
      "atta",
      "wheat",
      "flour",
      "organic",
      "24 mantra",
      "whole wheat",
      "roti",
      "chapati",
      "healthy",
    ],
    storeIds: ["s3", "s6", "s8", "s10"],
  },
  {
    id: "p81",
    name: "Apis Himalaya Raw Honey",
    brand: "Apis",
    weight: "500 g",
    price: 299,
    mrp: 349,
    inStock: true,
    img: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=85",
    keywords: [
      "honey",
      "apis",
      "himalaya",
      "natural",
      "raw honey",
      "sweet",
      "healthy",
      "organic",
    ],
    storeIds: ["s2", "s5", "s7", "s9", "s10"],
  },
  {
    id: "p82",
    name: "Organic Tattva Forest Honey",
    brand: "Organic Tattva",
    weight: "350 g",
    price: 275,
    mrp: 315,
    inStock: true,
    img: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400&q=85",
    keywords: [
      "honey",
      "organic",
      "organic tattva",
      "forest honey",
      "raw",
      "natural",
      "sweet",
      "healthy",
    ],
    storeIds: ["s3", "s6", "s8", "s10"],
  },
];

// ─── ALL STORES ───────────────────────────────────────────────────────────────
const ALL_STORES = [
  {
    id: "s1",
    name: "Blinkit – Sector 18",
    type: "Instant Delivery",
    open: true,
    promoted: true,
    distance: "0.4 km",
    eta: "8 min",
    rating: 4.6,
    reviews: "2.1k",
    address: "Shop 12, Sector 18 Market, Noida",
    features: ["Free delivery ₹199+", "24×7", "No-contact"],
    img: "https://images.unsplash.com/photo-1601598851547-4302969d0614?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s2",
    name: "DMart – Sector 2",
    type: "Supermarket",
    open: true,
    promoted: false,
    distance: "1.2 km",
    eta: "15 min",
    rating: 4.4,
    reviews: "5.3k",
    address: "D-Block, Sector 2, Noida",
    features: ["Bulk discounts", "Low prices", "Parking"],
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s3",
    name: "Nature's Basket",
    type: "Organic & Gourmet",
    open: true,
    promoted: false,
    distance: "1.8 km",
    eta: "18 min",
    rating: 4.7,
    reviews: "1.4k",
    address: "GF-4, GIP Mall, Noida",
    features: ["100% organic", "Imported goods", "Premium"],
    img: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s4",
    name: "Zepto – Sector 15",
    type: "10-min Delivery",
    open: false,
    promoted: false,
    distance: "0.7 km",
    eta: "10 min",
    rating: 4.3,
    reviews: "980",
    address: "Sector 15 Hub, Noida",
    features: ["10-min express", "App-only", "Limited stock"],
    img: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s5",
    name: "Big Basket Hub",
    type: "Grocery",
    open: true,
    promoted: false,
    distance: "2.1 km",
    eta: "22 min",
    rating: 4.5,
    reviews: "3.2k",
    address: "Sector 63, Noida",
    features: ["Scheduled delivery", "Large catalogue", "Sub discounts"],
    img: "https://images.unsplash.com/photo-1579113800032-c38bd7635818?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s6",
    name: "Swiggy Instamart – Sector 62",
    type: "Instant Delivery",
    open: true,
    promoted: true,
    distance: "1.0 km",
    eta: "12 min",
    rating: 4.5,
    reviews: "1.8k",
    address: "Sector 62 Dark Store, Noida",
    features: ["Free delivery ₹149+", "Live tracking", "Fresh daily"],
    img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s7",
    name: "Spencer's Retail – Sector 44",
    type: "Supermarket",
    open: true,
    promoted: false,
    distance: "2.4 km",
    eta: "20 min",
    rating: 4.2,
    reviews: "870",
    address: "Sector 44 Commercial Belt, Noida",
    features: ["Weekly offers", "Loyalty points", "Click & collect"],
    img: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s8",
    name: "More Supermarket – Sector 27",
    type: "Supermarket",
    open: true,
    promoted: false,
    distance: "3.0 km",
    eta: "28 min",
    rating: 4.1,
    reviews: "640",
    address: "Sector 27 Shopping Centre, Noida",
    features: ["Self-checkout", "Weekend deals", "Home delivery"],
    img: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s9",
    name: "Reliance Smart – Sector 51",
    type: "Supermarket",
    open: true,
    promoted: false,
    distance: "1.6 km",
    eta: "17 min",
    rating: 4.3,
    reviews: "1.1k",
    address: "Sector 51 Commercial Hub, Noida",
    features: ["JioMart integration", "Price match", "Large stock"],
    img: "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "s10",
    name: "Lulu Hypermarket – Sector 18",
    type: "Hypermarket",
    open: true,
    promoted: false,
    distance: "0.6 km",
    eta: "11 min",
    rating: 4.8,
    reviews: "4.2k",
    address: "Lulu Mall, Sector 18, Noida",
    features: ["Widest selection", "International brands", "Food court"],
    img: "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=800&q=80",
  },
];

// ─── Search helpers ───────────────────────────────────────────────────────────
function strictMatch(p, q) {
  return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
}
function broadMatch(p, q) {
  return strictMatch(p, q) || p.keywords.some((k) => k.includes(q));
}
function searchProducts(query) {
  const q = query.toLowerCase().trim();
  return ALL_PRODUCTS.filter((p) => strictMatch(p, q));
}
function searchStores(query) {
  const q = query.toLowerCase().trim();
  const strictMatched = ALL_PRODUCTS.filter((p) => strictMatch(p, q));
  const broadMatched = ALL_PRODUCTS.filter((p) => broadMatch(p, q));
  const storeMatchMap = new Map();
  for (const p of broadMatched) {
    for (const sid of p.storeIds) {
      if (!storeMatchMap.has(sid)) storeMatchMap.set(sid, []);
    }
  }
  return ALL_STORES.filter((st) => storeMatchMap.has(st.id))
    .map((st) => ({
      ...st,
      matchedItems: strictMatched.filter((p) => p.storeIds.includes(st.id)),
    }))
    .filter((st) => st.matchedItems.length > 0)
    .sort((a, b) => b.matchedItems.length - a.matchedItems.length);
}
function getStoreProducts(storeId) {
  return ALL_PRODUCTS.filter((p) => p.storeIds.includes(storeId));
}

// ─── Idle screen data ─────────────────────────────────────────────────────────
const INITIAL_HISTORY = [
  {
    id: "h1",
    text: "Milk",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&q=80",
  },
  {
    id: "h2",
    text: "Eggs",
    img: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=120&q=80",
  },
  {
    id: "h3",
    text: "Bread",
    img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=120&q=80",
  },
  {
    id: "h4",
    text: "Rice",
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "h5",
    text: "Coffee",
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&q=80",
  },
];
const TRENDING = [
  {
    id: "t1",
    text: "Paneer",
    img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&q=80",
  },
  {
    id: "t2",
    text: "Basmati Rice",
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "t3",
    text: "Atta",
    img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&q=80",
  },
  {
    id: "t4",
    text: "Coffee",
    img: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&q=80",
  },
  {
    id: "t5",
    text: "Noodles",
    img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&q=80",
  },
  {
    id: "t6",
    text: "Banana",
    img: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&q=80",
  },
  {
    id: "t7",
    text: "Chips",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80",
  },
  {
    id: "t8",
    text: "Honey",
    img: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=300&q=80",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FadeSlide({ delay = 0, children, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 320,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: a,
          transform: [
            {
              translateY: a.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function AddButton({ inStock, item }) {
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);

  const cartItem = cartItems.find((i) => i.id === item.id);
  const qty = cartItem ? cartItem.qty : 0;

  const sc = useRef(new Animated.Value(1)).current;
  const pop = () =>
    Animated.sequence([
      Animated.spring(sc, { toValue: 0.85, useNativeDriver: true, tension: 400 }),
      Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();

  if (!inStock)
    return (
      <TouchableOpacity style={s.notifyBtn}>
        <Text style={s.notifyTxt}>Notify</Text>
      </TouchableOpacity>
    );
  return (
    <Animated.View style={{ transform: [{ scale: sc }] }}>
      {qty === 0 ? (
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            pop();
            addItem({ ...item, image: item.img }, "SEARCH");
          }}
          activeOpacity={0.85}
        >
          <Text style={s.addTxt}>+ ADD</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.qtyBox}>
          <TouchableOpacity
            style={s.qtyBtnW}
            onPress={() => {
              pop();
              removeItem(item.id);
            }}
          >
            <Text style={s.qtyTxt}>−</Text>
          </TouchableOpacity>
          <Text style={s.qtyNum}>{qty}</Text>
          <TouchableOpacity
            style={s.qtyBtnW}
            onPress={() => {
              pop();
              addItem({ ...item, image: item.img }, "SEARCH");
            }}
          >
            <Text style={s.qtyTxt}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

function ProductRow({ item, index, onSeeStores }) {
  const discPct = item.mrp
    ? Math.round((1 - item.price / item.mrp) * 100)
    : null;
  const storeCount = item.storeIds?.length ?? 0;
  return (
    <FadeSlide delay={index * 35}>
      <View style={s.itemCard}>
        <View style={s.itemImgBox}>
          <Image
            source={{ uri: item.img }}
            style={s.itemImg}
            resizeMode="cover"
          />
          {discPct > 0 && (
            <View style={s.discPill}>
              <Text style={s.discTxt}>{discPct}% OFF</Text>
            </View>
          )}
          {!item.inStock && (
            <View style={s.oosOverlay}>
              <Text style={s.oosTxt}>Out of{"\n"}Stock</Text>
            </View>
          )}
        </View>
        <View style={s.itemInfo}>
          <View style={s.brandRow}>
            <View style={s.brandDot} />
            <Text style={s.itemBrand}>{item.brand}</Text>
          </View>
          <Text style={s.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={s.itemWt}>{item.weight}</Text>
          <View style={s.priceRow}>
            <Text style={s.itemPrice}>₹{item.price}</Text>
            {item.mrp && <Text style={s.itemMrp}>₹{item.mrp}</Text>}
          </View>
          {onSeeStores && storeCount > 0 && (
            <TouchableOpacity
              style={s.soldAtRow}
              onPress={onSeeStores}
              activeOpacity={0.7}
            >
              <Text style={s.soldAtTxt}>
                🏪 Available at {storeCount} store{storeCount > 1 ? "s" : ""}
              </Text>
              <Text style={s.soldAtArrow}> ›</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.itemCta}>
          <AddButton inStock={item.inStock} item={item} />
        </View>
      </View>
      <View style={s.itemDivider} />
    </FadeSlide>
  );
}

function SuggRow({ item, query, onPress }) {
  const lower = item.name.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  return (
    <TouchableOpacity
      style={s.suggRow}
      onPress={() => onPress(item.name)}
      activeOpacity={0.6}
    >
      <Image
        source={{ uri: item.img }}
        style={s.suggThumb}
        resizeMode="cover"
      />
      <Text style={s.suggText} numberOfLines={1}>
        {idx >= 0 ? (
          <>
            {item.name.slice(0, idx)}
            <Text style={s.suggBold}>
              {item.name.slice(idx, idx + q.length)}
            </Text>
            {item.name.slice(idx + q.length)}
          </>
        ) : (
          item.name
        )}
      </Text>
      <Text style={s.suggBrand}>{item.brand}</Text>
      <Text style={s.suggArrow}>↗</Text>
    </TouchableOpacity>
  );
}

function PlaceCard({ item, index, onTap }) {
  const count = item.matchedItems?.length ?? 0;
  return (
    <FadeSlide delay={index * 50}>
      <TouchableOpacity
        style={s.placeCard}
        onPress={() => onTap(item)}
        activeOpacity={0.92}
      >
        <View style={s.placeImgWrap}>
          <Image
            source={{ uri: item.img }}
            style={s.placeImg}
            resizeMode="cover"
          />
          {item.promoted && (
            <View style={s.adBadge}>
              <Text style={s.adTxt}>PROMOTED</Text>
            </View>
          )}
          {!item.open && (
            <View style={s.closedOverlay}>
              <Text style={s.closedTxt}>Currently Closed</Text>
            </View>
          )}
          <View style={s.etaChip}>
            <View style={s.etaDot} />
            <Text style={s.etaTxt}>{item.eta}</Text>
          </View>
          <View style={s.distChip}>
            <Text style={s.distTxt}>📍 {item.distance}</Text>
          </View>
          {count > 0 && (
            <View style={s.itemCountBadge}>
              <Text style={s.itemCountTxt}>
                {count} item{count > 1 ? "s" : ""} available
              </Text>
            </View>
          )}
        </View>
        <View style={s.placeBody}>
          <View style={s.placeTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.placeName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={s.placeType}>
                {item.type} · {item.reviews} ratings
              </Text>
            </View>
            <View style={s.ratingBox}>
              <Text style={s.ratingStar}>★</Text>
              <Text style={s.ratingNum}>{item.rating}</Text>
            </View>
          </View>
          <Text style={s.placeAddress} numberOfLines={1}>
            📍 {item.address}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {item.features.map((f) => (
              <View key={f} style={s.featurePill}>
                <Text style={s.featureTxt}>{f}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </FadeSlide>
  );
}

function TabBar({ active, onSelect, itemCount, placeCount }) {
  const lineX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(lineX, {
      toValue: active === "places" ? 0 : 1,
      useNativeDriver: false,
      tension: 160,
      friction: 14,
    }).start();
  }, [active]);
  return (
    <View style={s.tabBar}>
      {[
        ["places", placeCount],
        ["items", itemCount],
      ].map(([tab, cnt]) => (
        <TouchableOpacity
          key={tab}
          style={s.tabBtn}
          onPress={() => onSelect(tab)}
          activeOpacity={0.75}
        >
          <View style={s.tabInner}>
            <Text style={[s.tabTxt, active === tab && s.tabTxtOn]}>
              {tab === "places" ? "Places" : "Items"}
            </Text>
            {cnt > 0 && (
              <View style={[s.tabBadge, active === tab && s.tabBadgeOn]}>
                <Text
                  style={[s.tabBadgeTxt, active === tab && s.tabBadgeTxtOn]}
                >
                  {cnt}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
      <Animated.View
        style={[
          s.tabUnderline,
          {
            left: lineX.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "50%"],
            }),
          },
        ]}
      />
    </View>
  );
}

// ─── Store Detail  ────────────────────────────────────────────────────────────
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  FIX: StoreDetail now accepts an `onBack` that it calls AFTER animating ║
// ║  out, so the search results are always alive underneath — no blank.     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function StoreDetail({ store, searchQuery, onBack }) {
  const translateX = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Animate IN on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        tension: 180,
        friction: 18,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate OUT, then call onBack so search results are already visible
  const handleDetailBack = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 40,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => onBack());
  }, [onBack]);

  const storeProducts = getStoreProducts(store.id);
  const q = searchQuery.toLowerCase().trim();
  const matchedItems = storeProducts.filter((p) => strictMatch(p, q));
  const otherItems = storeProducts.filter((p) => !strictMatch(p, q));

  return (
    <Animated.View
      style={[s.detailRoot, { opacity, transform: [{ translateX }] }]}
    >
      <View style={s.detailHeader}>
        <TouchableOpacity
          onPress={handleDetailBack}
          style={s.detailBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={s.detailBackArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.detailTitle} numberOfLines={1}>
            {store.name}
          </Text>
          <Text style={s.detailSub}>
            {store.type} · {store.distance} · {store.eta}
          </Text>
        </View>
        <View style={s.ratingBox}>
          <Text style={s.ratingStar}>★</Text>
          <Text style={s.ratingNum}>{store.rating}</Text>
        </View>
      </View>
      <View style={s.sep} />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={{ uri: store.img }}
            style={s.detailBanner}
            resizeMode="cover"
          />
          <View style={[s.etaChip, { bottom: 12, left: 14 }]}>
            <View style={s.etaDot} />
            <Text style={s.etaTxt}>{store.eta} away</Text>
          </View>
          {!store.open && (
            <View style={s.closedOverlay}>
              <Text style={s.closedTxt}>Currently Closed</Text>
            </View>
          )}
        </View>
        <View
          style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}
        >
          <Text style={s.placeAddress}>📍 {store.address}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            contentContainerStyle={{ gap: 6 }}
          >
            {store.features.map((f) => (
              <View key={f} style={s.featurePill}>
                <Text style={s.featureTxt}>{f}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
        {matchedItems.length > 0 && (
          <View style={s.detailSection}>
            <View style={s.detailSectionHead}>
              <Text style={s.detailSectionTitle}>
                🎯 "{searchQuery}" — {matchedItems.length} result
                {matchedItems.length > 1 ? "s" : ""}
              </Text>
            </View>
            {matchedItems.map((item, i) => (
              <ProductRow
                key={item.id}
                item={item}
                index={i}
                onSeeStores={null}
              />
            ))}
          </View>
        )}
        {otherItems.length > 0 && (
          <View style={s.detailSection}>
            <View style={s.detailSectionHead}>
              <Text style={s.detailSectionTitle}>
                Also available at this store
              </Text>
              <Text style={s.detailSectionCount}>
                {otherItems.length} items
              </Text>
            </View>
            {otherItems.map((item, i) => (
              <ProductRow
                key={item.id}
                item={item}
                index={i}
                onSeeStores={null}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SearchScreen({ onClose }) {
  const items = useCartStore((state) => state.items) ?? [];
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );

  const [query, setQuery] = useState("");
  const [committed, setCommit] = useState(false);
  const [activeTab, setTab] = useState("places");
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [selectedStore, setStore] = useState(null);

  const navigation = useNavigation();
  const inputRef = useRef(null);
  const mountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Back button behaviour:
  //   • If search results are showing → clear back to idle screen
  //   • If already idle              → close the SearchScreen entirely
  const handleBack = () => {
    Keyboard.dismiss();
    if (committed || query.length > 0) {
      setQuery("");
      setCommit(false);
      setStore(null);
      setTab("places");
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      navigation.navigate("Home");
    }
  };

  const commitSearch = useCallback(
    (text) => {
      const t = (text ?? query).trim();
      if (!t) return;
      setQuery(t);
      setCommit(true);
      setTab("places");
      setStore(null);
      Keyboard.dismiss();
      setHistory((prev) => {
        const deduped = prev.filter(
          (h) => h.text.toLowerCase() !== t.toLowerCase(),
        );
        const found = ALL_PRODUCTS.find((p) =>
          p.name.toLowerCase().includes(t.toLowerCase()),
        );
        const img =
          found?.img ??
          "https://images.unsplash.com/photo-1543168256-418811576931?w=120&q=80";
        return [{ id: `h${Date.now()}`, text: t, img }, ...deduped].slice(0, 6);
      });
    },
    [query],
  );

  const onQChange = (t) => {
    setQuery(t);
    setCommit(false);
    setStore(null);
  };
  const trimmed = query.trim();
  const isIdle = !committed && trimmed.length === 0;
  const isTyping = !committed && trimmed.length > 0;

  const suggestions = isTyping
    ? ALL_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          p.brand.toLowerCase().includes(trimmed.toLowerCase()),
      ).slice(0, 6)
    : [];
  const itemResults = committed ? searchProducts(trimmed) : [];
  const placeResults = committed ? searchStores(trimmed) : [];

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  THE FIX — three changes vs the original:                              ║
  // ║                                                                        ║
  // ║  1. REMOVED the early-return `if (selectedStore) return <StoreDetail>` ║
  // ║     — that was what caused SearchScreen to unmount and go blank.       ║
  // ║                                                                        ║
  // ║  2. SearchScreen is now ALWAYS mounted inside a plain <View>.          ║
  // ║                                                                        ║
  // ║  3. StoreDetail renders as an absoluteFillObject overlay ON TOP.       ║
  // ║     When back is pressed, StoreDetail animates out (160 ms) and THEN   ║
  // ║     calls setStore(null), so results are already visible beneath.      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  return (
    <View style={{ flex: 1 }}>
      {/* ── Search results screen — always mounted ─────────────────────── */}
      <Animated.View style={[s.root, { opacity: mountAnim }]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        {/* Search bar */}
        <View style={s.topBar}>
          <TouchableOpacity
            onPress={handleBack}
            style={s.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={s.inputWrap}>
            <View style={s.inputIconBox}>
              <SearchIcon
                size={18}
                color={committed || trimmed.length > 0 ? C.green : C.textLight}
              />
            </View>
            <TextInput
              ref={inputRef}
              style={s.inputField}
              placeholder="Search items or stores…"
              placeholderTextColor={C.textLight}
              value={query}
              onChangeText={onQChange}
              onSubmitEditing={() => commitSearch()}
              returnKeyType="search"
              selectionColor={C.green}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setCommit(false);
                  inputRef.current?.focus();
                }}
                style={s.clearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.clearTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {query.length > 0 && (
            <TouchableOpacity
              style={s.searchBtn}
              onPress={() => commitSearch()}
              activeOpacity={0.85}
            >
              <Text style={s.searchBtnTxt}>Search</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.sep} />

        {isTyping && (
          <View style={s.suggList}>
            {suggestions.map((item) => (
              <SuggRow
                key={item.id}
                item={item}
                query={trimmed}
                onPress={commitSearch}
              />
            ))}
            <TouchableOpacity
              style={[s.suggRow, { borderBottomWidth: 0 }]}
              onPress={() => commitSearch()}
              activeOpacity={0.65}
            >
              <View style={s.suggSearchAll}>
                <SearchIcon size={16} color={C.green} />
              </View>
              <Text style={s.suggFreeText}>
                Search for{" "}
                <Text style={{ color: C.green, fontWeight: "700" }}>
                  "{trimmed}"
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {committed && (
          <TabBar
            active={activeTab}
            onSelect={setTab}
            itemCount={itemResults.length}
            placeCount={placeResults.length}
          />
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isIdle && (
              <>
                {history.length > 0 && (
                  <FadeSlide style={s.block}>
                    <View style={s.blockHead}>
                      <Text style={s.blockTitle}>Recent Searches</Text>
                      <TouchableOpacity onPress={() => setHistory([])}>
                        <Text style={s.blockAction}>Clear all</Text>
                      </TouchableOpacity>
                    </View>
                    {history.map((h, i) => (
                      <TouchableOpacity
                        key={h.id}
                        style={[
                          s.histRow,
                          i === history.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => commitSearch(h.text)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{ uri: h.img }}
                          style={s.histThumb}
                          resizeMode="cover"
                        />
                        <Text style={s.histTxt} numberOfLines={1}>
                          {h.text}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setHistory((hh) => hh.filter((x) => x.id !== h.id))
                          }
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={s.histX}>✕</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </FadeSlide>
                )}
                <FadeSlide delay={60} style={s.block}>
                  <Text style={s.blockTitle}>Trending Searches</Text>
                  <View style={s.trendGrid}>
                    {TRENDING.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={s.trendCard}
                        onPress={() => commitSearch(t.text)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: t.img }}
                          style={s.trendImg}
                          resizeMode="cover"
                        />
                        <View style={s.trendOverlay} />
                        <Text style={s.trendLabel}>{t.text}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </FadeSlide>
              </>
            )}

            {committed && activeTab === "places" && (
              <View style={s.block}>
                {placeResults.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Text style={s.emptyTitle}>No stores found</Text>
                    <Text style={s.emptySub}>
                      Try the Items tab or a different keyword
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.resultNote}>
                      {placeResults.length} store
                      {placeResults.length > 1 ? "s" : ""} carry "{trimmed}"
                    </Text>
                    {placeResults.map((item, i) => (
                      <PlaceCard
                        key={item.id}
                        item={item}
                        index={i}
                        onTap={setStore}
                      />
                    ))}
                  </>
                )}
              </View>
            )}

            {committed && activeTab === "items" && (
              <View style={s.block}>
                {itemResults.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Text style={s.emptyTitle}>No items found</Text>
                    <Text style={s.emptySub}>
                      Try the Places tab or a different keyword
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.resultNote}>
                      {itemResults.length} result
                      {itemResults.length > 1 ? "s" : ""} for "{trimmed}"
                    </Text>
                    {itemResults.map((item, i) => (
                      <ProductRow
                        key={item.id}
                        item={item}
                        index={i}
                        onSeeStores={() => setTab("places")}
                      />
                    ))}
                  </>
                )}
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* ── Store detail overlay — slides in on top, search stays alive ── */}
      {selectedStore && (
        <View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: C.bg }]}
        >
          <StoreDetail
            store={selectedStore}
            searchQuery={trimmed}
            onBack={() => setStore(null)}
          />
        </View>
      )}

      {/* ── Anirudh's FloatCart ── */}
      <FloatCart
        itemCount={itemCount}
        totalPrice={totalPrice}
        onPress={() => navigation.navigate("Cart")}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "ios" ? 52 : 32,
  },
  detailRoot: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "ios" ? 52 : 32,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: C.bg,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 22, color: C.text, fontWeight: "300" },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: C.bg,
    gap: 10,
  },
  detailBackBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBackArrow: { fontSize: 22, color: C.text, fontWeight: "300" },
  detailTitle: { fontSize: 15, color: C.text, fontWeight: "800" },
  detailSub: { fontSize: 11, color: C.textLight, marginTop: 1 },
  detailBanner: { width: "100%", height: 160 },

  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 7,
    backgroundColor: C.bg,
    gap: 9,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIconBox: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: "500",
    padding: 0,
    borderWidth: 0,
    outlineStyle: "none",
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  clearTxt: { fontSize: 10, color: C.textMed, fontWeight: "800" },
  searchBtn: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBtnTxt: { fontSize: 14, color: C.white, fontWeight: "800" },
  sep: { height: 1, backgroundColor: C.border },

  suggList: {
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  suggRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    gap: 12,
  },
  suggThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.greenLight,
  },
  suggSearchAll: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  suggText: { flex: 1, fontSize: 14, color: C.textMed },
  suggBold: { color: C.text, fontWeight: "700" },
  suggBrand: { fontSize: 12, color: C.textLight },
  suggArrow: { fontSize: 14, color: C.textLight },
  suggFreeText: { flex: 1, fontSize: 14, color: C.textMed },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderBottomWidth: 1.5,
    borderBottomColor: C.border,
    position: "relative",
  },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: "center" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 7 },
  tabTxt: { fontSize: 14, color: C.textMed, fontWeight: "600" },
  tabTxtOn: { color: C.green, fontWeight: "800" },
  tabBadge: {
    backgroundColor: C.divider,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tabBadgeOn: { backgroundColor: C.greenLight },
  tabBadgeTxt: { fontSize: 11, color: C.textMed, fontWeight: "700" },
  tabBadgeTxtOn: { color: C.green },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    width: "50%",
    height: 2.5,
    backgroundColor: C.green,
    borderRadius: 2,
  },

  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingTop: 4 },
  block: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  blockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  blockAction: { fontSize: 13, color: C.green, fontWeight: "700" },
  resultNote: {
    fontSize: 12,
    color: C.textLight,
    marginBottom: 14,
    fontWeight: "500",
  },

  histRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  histThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.greenLight,
  },
  histTxt: { flex: 1, fontSize: 14, color: C.text, fontWeight: "600" },
  histX: { fontSize: 13, color: C.textLight, paddingHorizontal: 2 },

  trendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    paddingBottom: 6,
  },
  trendCard: {
    width: "47%",
    height: 90,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  trendImg: { width: "100%", height: "100%" },
  trendOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,40,16,0.45)",
  },
  trendLabel: {
    position: "absolute",
    bottom: 9,
    left: 11,
    fontSize: 13,
    color: C.white,
    fontWeight: "800",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  itemCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    gap: 12,
  },
  itemImgBox: {
    width: 92,
    height: 92,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.greenLight,
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  itemImg: { width: "100%", height: "100%" },
  discPill: {
    position: "absolute",
    top: 6,
    left: 0,
    backgroundColor: C.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  discTxt: { fontSize: 9, color: C.white, fontWeight: "900" },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  oosTxt: {
    fontSize: 10,
    color: C.textMed,
    fontWeight: "700",
    textAlign: "center",
  },
  itemInfo: { flex: 1, gap: 3 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  itemBrand: {
    fontSize: 11,
    color: C.green,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemName: { fontSize: 14, color: C.text, fontWeight: "700", lineHeight: 19 },
  itemWt: { fontSize: 12, color: C.textMed },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 2,
  },
  itemPrice: { fontSize: 16, color: C.text, fontWeight: "800" },
  itemMrp: {
    fontSize: 12,
    color: C.textLight,
    textDecorationLine: "line-through",
  },
  soldAtRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 2,
  },
  soldAtTxt: { fontSize: 11, color: C.green, fontWeight: "700" },
  soldAtArrow: { fontSize: 13, color: C.green, fontWeight: "700" },
  itemCta: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 16,
  },
  addBtn: {
    backgroundColor: C.green,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addTxt: {
    fontSize: 13,
    color: C.white,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  notifyBtn: {
    borderWidth: 1.5,
    borderColor: C.greenMid,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: C.greenLight,
  },
  notifyTxt: { fontSize: 12, color: C.green, fontWeight: "700" },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.green,
    borderRadius: 10,
    overflow: "hidden",
  },
  qtyBtnW: { paddingHorizontal: 10, paddingVertical: 9 },
  qtyTxt: { fontSize: 17, color: C.white, fontWeight: "700" },
  qtyNum: {
    fontSize: 14,
    color: C.white,
    fontWeight: "800",
    paddingHorizontal: 7,
  },
  itemDivider: { height: 1, backgroundColor: C.divider, marginLeft: 104 },

  placeCard: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    marginBottom: 16,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  placeImgWrap: { position: "relative" },
  placeImg: { width: "100%", height: 150 },
  adBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  adTxt: { fontSize: 9, color: C.white, fontWeight: "800", letterSpacing: 1 },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  closedTxt: {
    color: C.white,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1.5,
  },
  etaChip: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: C.white,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  etaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  etaTxt: { fontSize: 12, color: C.green, fontWeight: "800" },
  distChip: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: C.white,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  distTxt: { fontSize: 12, color: C.textMed, fontWeight: "600" },
  itemCountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: C.green,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  itemCountTxt: { fontSize: 11, color: C.white, fontWeight: "800" },
  placeBody: { padding: 14 },
  placeTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 3,
  },
  placeName: {
    fontSize: 16,
    color: C.text,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  placeType: { fontSize: 12, color: C.textMed, marginTop: 3 },
  placeAddress: { fontSize: 12, color: C.textLight, marginBottom: 4 },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.green,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingStar: { fontSize: 12, color: C.white },
  ratingNum: { fontSize: 13, color: C.white, fontWeight: "800" },
  featurePill: {
    backgroundColor: C.greenLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  featureTxt: { fontSize: 11, color: C.green, fontWeight: "700" },

  detailSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  detailSectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  detailSectionTitle: {
    fontSize: 14,
    color: C.text,
    fontWeight: "800",
    flex: 1,
  },
  detailSectionCount: { fontSize: 12, color: C.textLight, fontWeight: "600" },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    color: C.text,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: C.textLight,
    textAlign: "center",
    lineHeight: 21,
  },

  // unused strips kept so any external references don't crash
  previewStrip: {},
  previewStripDivider: {},
  previewStripHead: {},
  previewStripLabel: {},
  previewStripArrow: {},
  previewThumbWrap: {},
  previewThumb: {},
  previewOos: {},
  previewMore: {},
  previewMoreTxt: {},
});