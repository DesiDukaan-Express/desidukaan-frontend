import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Image, Animated, StatusBar, Platform,
} from 'react-native';

// ─── Design Tokens ────────────────────────────────────────────────────────────
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

// ─── Images ───────────────────────────────────────────────────────────────────
const IMG = {
  milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&q=80',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80',
  eggs: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&q=80',
  chips: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80',
  oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=80',
  juice: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&q=80',
  snacks: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=300&q=80',
  tea: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=300&q=80',
  yogurt: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&q=80',
  spinach: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300&q=80',
  banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&q=80',
  tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&q=80',
  apple: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=300&q=80',
  honey: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=300&q=80',
  oats: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=80',
  almonds: 'https://images.unsplash.com/photo-1574226516831-e1dff420e562?w=300&q=80',
  cucumber: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=300&q=80',
  strawberry: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&q=80',
  coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80',
  catDairy: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&q=80',
  catVeg: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&q=80',
  catFruit: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80',
  catSnacks: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&q=80',
  catDrinks: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=200&q=80',
  catMeat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&q=80',
  catBakery: 'https://images.unsplash.com/photo-1486887396153-fa416526c108?w=200&q=80',
  catCare: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80',
  promo: 'https://images.unsplash.com/photo-1543168256-418811576931?w=700&q=80',
  promoOffer: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=700&q=80',
  promoOrganic: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=700&q=80',
  promoFresh: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=700&q=80',
  promoBudget: 'https://images.unsplash.com/photo-1604719312566-8912e9667d9f?w=700&q=80',
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const RECENTS = [
  { id: 'r1', label: 'Amul Butter 500g', img: IMG.milk },
  { id: 'r2', label: 'Organic Spinach', img: IMG.catVeg },
  { id: 'r3', label: 'Tata Tea Gold', img: IMG.tea },
  { id: 'r4', label: 'Brown Eggs Dozen', img: IMG.eggs },
  { id: 'r5', label: 'Whole Wheat Bread', img: IMG.bread },
];

const CATEGORIES = [
  { id: 'c1', name: 'Dairy & Eggs', count: '80+', img: IMG.catDairy },
  { id: 'c2', name: 'Vegetables', count: '120+', img: IMG.catVeg },
  { id: 'c3', name: 'Fresh Fruits', count: '90+', img: IMG.catFruit },
  { id: 'c4', name: 'Snacks', count: '200+', img: IMG.catSnacks },
  { id: 'c5', name: 'Cold Drinks', count: '75+', img: IMG.catDrinks },
  { id: 'c6', name: 'Meat & Fish', count: '60+', img: IMG.catMeat },
  { id: 'c7', name: 'Bakery', count: '45+', img: IMG.catBakery },
  { id: 'c8', name: 'Personal Care', count: '150+', img: IMG.catCare },
];

// flags: offer, organic, fresh, budget (≤100)
const PRODUCTS = [
  { id: 'p1', name: 'Amul Gold Milk', weight: '1 L', price: 68, mrp: null, tag: 'BESTSELLER', tagStyle: 'green', img: IMG.milk, fresh: true, budget: true },
  { id: 'p2', name: "Lay's Classic Salted", weight: '104 g', price: 30, mrp: 33, tag: '10% OFF', tagStyle: 'orange', img: IMG.chips, offer: true, budget: true },
  { id: 'p3', name: 'Fortune Sunflower Oil', weight: '1 L', price: 148, mrp: null, tag: 'POPULAR', tagStyle: 'yellow', img: IMG.oil },
  { id: 'p4', name: 'Britannia Brown Bread', weight: '400 g', price: 45, mrp: 47, tag: '5% OFF', tagStyle: 'orange', img: IMG.bread, offer: true, budget: true },
  { id: 'p5', name: 'Farm Fresh Eggs', weight: '12 pcs', price: 89, mrp: null, tag: 'FRESH', tagStyle: 'green', img: IMG.eggs, fresh: true, budget: true },
  { id: 'p6', name: 'Tropicana Orange Juice', weight: '1 L', price: 99, mrp: 115, tag: '14% OFF', tagStyle: 'orange', img: IMG.juice, offer: true, budget: true },
  { id: 'p7', name: 'Tata Tea Premium', weight: '500 g', price: 220, mrp: null, tag: 'TOP RATED', tagStyle: 'yellow', img: IMG.tea },
  { id: 'p8', name: 'Haldiram Mixture', weight: '200 g', price: 79, mrp: null, tag: 'NEW', tagStyle: 'orange', img: IMG.snacks, budget: true },
  { id: 'p9', name: 'Organic Greek Yogurt', weight: '400 g', price: 110, mrp: 130, tag: 'ORGANIC', tagStyle: 'green', img: IMG.yogurt, organic: true, offer: true },
  { id: 'p10', name: 'Organic Baby Spinach', weight: '250 g', price: 65, mrp: null, tag: 'ORGANIC', tagStyle: 'green', img: IMG.spinach, organic: true, fresh: true, budget: true },
  { id: 'p11', name: 'Fresh Bananas', weight: '6 pcs', price: 49, mrp: null, tag: 'FRESH', tagStyle: 'green', img: IMG.banana, fresh: true, budget: true },
  { id: 'p12', name: 'Country Tomatoes', weight: '500 g', price: 35, mrp: null, tag: 'FRESH', tagStyle: 'green', img: IMG.tomato, fresh: true, budget: true },
  { id: 'p13', name: 'Organic Honey', weight: '250 g', price: 199, mrp: 249, tag: '20% OFF', tagStyle: 'orange', img: IMG.honey, organic: true, offer: true },
  { id: 'p14', name: 'Organic Rolled Oats', weight: '500 g', price: 159, mrp: 189, tag: 'ORGANIC', tagStyle: 'green', img: IMG.oats, organic: true, offer: true },
  { id: 'p15', name: 'Premium Almonds', weight: '200 g', price: 249, mrp: 299, tag: '17% OFF', tagStyle: 'orange', img: IMG.almonds, offer: true },
  { id: 'p16', name: 'Crisp Cucumber', weight: '4 pcs', price: 30, mrp: null, tag: 'FRESH', tagStyle: 'green', img: IMG.cucumber, fresh: true, budget: true },
  { id: 'p17', name: 'Fresh Strawberries', weight: '250 g', price: 89, mrp: 110, tag: 'FRESH', tagStyle: 'green', img: IMG.strawberry, fresh: true, offer: true, budget: true },
  { id: 'p18', name: 'Nescafé Instant Coffee', weight: '100 g', price: 95, mrp: 109, tag: '13% OFF', tagStyle: 'orange', img: IMG.coffee, offer: true, budget: true },
  { id: 'p19', name: 'Red Delicious Apple', weight: '4 pcs', price: 79, mrp: null, tag: 'FRESH', tagStyle: 'green', img: IMG.apple, fresh: true, budget: true },
  { id: 'p20', name: 'Organic Almonds Raw', weight: '150 g', price: 99, mrp: 129, tag: 'ORGANIC', tagStyle: 'green', img: IMG.almonds, organic: true, budget: true, offer: true },
];

const FILTERS = ['All', 'Offers', 'Organic', 'Fresh', 'Under ₹100'];

const TAG_STYLES = {
  green: { bg: C.tag1, text: C.tag1Text },
  orange: { bg: C.tag2, text: C.tag2Text },
  yellow: { bg: C.tag3, text: C.tag3Text },
};

// ─── Filter section configs ───────────────────────────────────────────────────
const FILTER_META = {
  Offers: {
    emoji: '🏷️',
    title: "Today's Best Offers",
    subtitle: 'Save big on your daily essentials',
    bannerImg: IMG.promoOffer,
    bannerColor: 'rgba(180,50,0,0.58)',
    bannerTag: 'HOT DEALS',
    bannerTagBg: C.accent,
    bannerTitle: 'Up to 20% Off\nOn Groceries',
    accentColor: C.accent,
    accentLight: C.accentLight,
    pills: [
      { label: 'Under 10%', icon: '🔖' },
      { label: '10–20% Off', icon: '💥' },
      { label: 'Buy 2 Get 1', icon: '🎁' },
      { label: 'Flash Sale', icon: '⚡' },
    ],
    filterFn: p => !!p.offer,
  },
  Organic: {
    emoji: '🌿',
    title: 'Certified Organic',
    subtitle: '100% natural, no pesticides',
    bannerImg: IMG.promoOrganic,
    bannerColor: 'rgba(10,60,20,0.56)',
    bannerTag: 'CERTIFIED',
    bannerTagBg: C.green,
    bannerTitle: 'Go Organic\nLive Healthy',
    accentColor: C.green,
    accentLight: C.greenLight,
    pills: [
      { label: 'Vegetables', icon: '🥦' },
      { label: 'Fruits', icon: '🍎' },
      { label: 'Dairy', icon: '🥛' },
      { label: 'Dry Fruits', icon: '🌰' },
    ],
    filterFn: p => !!p.organic,
  },
  Fresh: {
    emoji: '🌱',
    title: 'Farm Fresh Today',
    subtitle: 'Harvested & delivered same day',
    bannerImg: IMG.promoFresh,
    bannerColor: 'rgba(5,80,30,0.54)',
    bannerTag: 'JUST ARRIVED',
    bannerTagBg: '#059669',
    bannerTitle: 'Farm to\nYour Door',
    accentColor: '#059669',
    accentLight: '#ECFDF5',
    pills: [
      { label: 'Vegetables', icon: '🥬' },
      { label: 'Fruits', icon: '🍓' },
      { label: 'Dairy', icon: '🧈' },
      { label: 'Herbs', icon: '🌿' },
    ],
    filterFn: p => !!p.fresh,
  },
  'Under ₹100': {
    emoji: '💰',
    title: 'Budget Picks',
    subtitle: 'Quality groceries under ₹100',
    bannerImg: IMG.promoBudget,
    bannerColor: 'rgba(20,40,100,0.58)',
    bannerTag: 'BEST VALUE',
    bannerTagBg: C.blue,
    bannerTitle: 'Smart Savings\nUnder ₹100',
    accentColor: C.blue,
    accentLight: C.blueLight,
    pills: [
      { label: 'Under ₹30', icon: '🪙' },
      { label: 'Under ₹50', icon: '💵' },
      { label: 'Under ₹75', icon: '💸' },
      { label: 'Under ₹100', icon: '🛒' },
    ],
    filterFn: p => !!p.budget,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FadeIn({ delay = 0, children, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, onClear, recents, onRecentPress, onRemoveRecent, onClearAll , searchRef }) {
  const [focused, setFocused] = useState(false);
  const bdr = useRef(new Animated.Value(0)).current;
  const dropAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.spring(bdr, { toValue: 1, useNativeDriver: false, tension: 180 }).start();
    Animated.timing(dropAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  };
  const handleBlur = () => {
    // small delay so taps on dropdown register first
    setTimeout(() => {
      setFocused(false);
      if (!value) Animated.spring(bdr, { toValue: 0, useNativeDriver: false }).start();
      Animated.timing(dropAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start();
    }, 150);
  };

  const borderColor = bdr.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.green] });
  const shadowOpacity = bdr.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.18] });

  const showDropdown = focused && !value && recents.length > 0;

  return (
    <View style={styles.searchWrapper}>
      {/* ── Flat search bar ── */}
      <Animated.View style={[styles.searchBox, { borderColor, shadowOpacity }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search groceries, snacks, brands…"
          placeholderTextColor={C.textLight}
          value={value}
          onChangeText={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          selectionColor={C.green}
          ref={searchRef}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Recent history dropdown ── */}
      {showDropdown && (
        <Animated.View style={[styles.dropdown, {
          opacity: dropAnim,
          transform: [{ translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
        }]}>
          <View style={styles.dropHeader}>
            <Text style={styles.dropTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={onClearAll}>
              <Text style={styles.dropClear}>Clear all</Text>
            </TouchableOpacity>
          </View>
          {recents.map((r, i) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.dropRow, i === recents.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => onRecentPress(r)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: r.img }} style={styles.dropThumb} />
              <View style={styles.dropRowMid}>
                <Text style={styles.dropLabel} numberOfLines={1}>{r.label}</Text>
                <Text style={styles.dropSub}>Recent search</Text>
              </View>
              <TouchableOpacity onPress={() => onRemoveRecent(r.id)} style={styles.dropRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.dropRemoveTxt}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ item, index }) {
  const [qty, setQty] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;

  const pop = () => Animated.sequence([
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, tension: 300 }),
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200 }),
  ]).start();

  const ts = TAG_STYLES[item.tagStyle] || TAG_STYLES.green;
  const discPct = item.mrp ? Math.round((1 - item.price / item.mrp) * 100) : null;

  return (
    <FadeIn delay={index * 55} style={styles.productCard}>
      <View style={styles.productImgWrap}>
        <Image source={{ uri: item.img }} style={styles.productImg} resizeMode="cover" />
        <View style={[styles.productTag, { backgroundColor: ts.bg }]}>
          <Text style={[styles.productTagTxt, { color: ts.text }]}>{item.tag}</Text>
        </View>
        {discPct && (
          <View style={styles.discBadge}>
            <Text style={styles.discTxt}>{discPct}%{'\n'}OFF</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productWt}>{item.weight}</Text>
        <View style={styles.productRow}>
          <View>
            <Text style={styles.productPrice}>₹{item.price}</Text>
            {item.mrp && <Text style={styles.productMrp}>₹{item.mrp}</Text>}
          </View>
          <Animated.View style={{ transform: [{ scale }] }}>
            {qty === 0 ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => { pop(); setQty(1); }} activeOpacity={0.85}>
                <Text style={styles.addTxt}>+ ADD</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => { pop(); setQty(q => Math.max(0, q - 1)); }}>
                  <Text style={styles.qtyTxt}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => { pop(); setQty(q => q + 1); }}>
                  <Text style={styles.qtyTxt}>+</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </FadeIn>
  );
}

// ─── Category Tile ────────────────────────────────────────────────────────────
function CatTile({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.catTile} onPress={onPress} activeOpacity={0.82}>
      <Image source={{ uri: item.img }} style={styles.catImg} resizeMode="cover" />
      <View style={styles.catOverlay} />
      <View style={styles.catLabel}>
        <Text style={styles.catName}>{item.name}</Text>
        <Text style={styles.catCount}>{item.count} items</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Recent Row ───────────────────────────────────────────────────────────────
function RecentRow({ item, onPress, onRemove }) {
  return (
    <TouchableOpacity style={styles.recentRow} onPress={onPress} activeOpacity={0.72}>
      <Image source={{ uri: item.img }} style={styles.recentImg} />
      <Text style={styles.recentLabel} numberOfLines={1}>{item.label}</Text>
      <TouchableOpacity onPress={onRemove} style={styles.recentX} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.recentXTxt}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Filter Section (Offers / Organic / Fresh / Under ₹100) ──────────────────
function FilterSection({ filterId }) {
  const meta = FILTER_META[filterId];
  const products = PRODUCTS.filter(meta.filterFn);

  return (
    <FadeIn delay={0}>
      {/* Hero banner */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.banner} activeOpacity={0.9}>
          <Image source={{ uri: meta.bannerImg }} style={styles.bannerImg} resizeMode="cover" />
          <View style={[styles.bannerOverlay, { backgroundColor: meta.bannerColor }]} />
          <View style={styles.bannerContent}>
            <View style={[styles.bannerTag, { backgroundColor: meta.bannerTagBg }]}>
              <Text style={styles.bannerTagTxt}>{meta.bannerTag}</Text>
            </View>
            <Text style={styles.bannerTitle}>{meta.bannerTitle}</Text>
            <View style={[styles.bannerBtn, { backgroundColor: meta.accentColor }]}>
              <Text style={[styles.bannerBtnTxt, { color: C.white }]}>Explore All  →</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={styles.section}>
        <View style={[styles.statsStrip, { backgroundColor: meta.accentLight, borderColor: meta.accentColor + '33' }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: meta.accentColor }]}>{products.length}</Text>
            <Text style={styles.statLbl}>Products</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: meta.accentColor + '30' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: meta.accentColor }]}>10 min</Text>
            <Text style={styles.statLbl}>Delivery</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: meta.accentColor + '30' }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: meta.accentColor }]}>Free</Text>
            <Text style={styles.statLbl}>Over ₹199</Text>
          </View>
        </View>
      </View>

      {/* Sub-category pills */}
      <View style={styles.section}>
        <Text style={styles.secTitle}>{meta.emoji}  {meta.title}</Text>
        <Text style={styles.secSubtitle}>{meta.subtitle}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
          {meta.pills.map((p, i) => (
            <TouchableOpacity key={i} style={[styles.subPill, { borderColor: meta.accentColor + '55', backgroundColor: meta.accentLight }]} activeOpacity={0.75}>
              <Text style={styles.subPillIcon}>{p.icon}</Text>
              <Text style={[styles.subPillTxt, { color: meta.accentColor }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products */}
      <View style={styles.section}>
        <View style={styles.secHead}>
          <Text style={styles.secTitle}>All {filterId} Items</Text>
          <View style={[styles.countBadge, { backgroundColor: meta.accentLight }]}>
            <Text style={[styles.countTxt, { color: meta.accentColor }]}>{products.length} items</Text>
          </View>
        </View>
        {products.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Check back soon!</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {products.map((item, i) => <ProductCard key={item.id} item={item} index={i} />)}
          </View>
        )}
      </View>
    </FadeIn>
  );
}

// ─── All Tab (default) ────────────────────────────────────────────────────────
function AllSection({ query, recents, setRecents }) {
  const removeRecent = id => setRecents(r => r.filter(x => x.id !== id));

  const results = query.length > 0
    ? PRODUCTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : PRODUCTS;

  return (
    <>
      {/* Empty search state */}
      {query.length > 0 && results.length === 0 && (
        <View style={styles.emptyWrap}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=300&q=80' }}
            style={styles.emptyImg} resizeMode="contain" />
          <Text style={styles.emptyTitle}>No results for "{query}"</Text>
          <Text style={styles.emptySub}>Try "milk", "bread" or "eggs"</Text>
        </View>
      )}

      {/* Recents */}
      {/* {!query && recents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={() => setRecents([])}><Text style={styles.secLink}>Clear all</Text></TouchableOpacity>
          </View>
          <View style={styles.recentList}>
            {recents.map(r => (
              <RecentRow key={r.id} item={r}
                onPress={() => {}}
                onRemove={() => removeRecent(r.id)} />
            ))}
          </View>
        </View>
      )} */}

      {/* Categories */}
      {!query && (
        <View style={styles.section}>
          <View style={styles.secHead}>
            <Text style={styles.secTitle}>Shop by Category</Text>
            <TouchableOpacity><Text style={styles.secLink}>See all</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {CATEGORIES.map(c => <CatTile key={c.id} item={c} onPress={() => { }} />)}
          </ScrollView>
        </View>
      )}

      {/* Promo banner */}
      {!query && (
        <View style={styles.section}>
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
      )}

      {/* Products */}
      <View style={styles.section}>
        <View style={styles.secHead}>
          <Text style={styles.secTitle}>
            {query ? `Results for "${query}"` : 'Recommended for You ✨'}
          </Text>
          {!query && <TouchableOpacity><Text style={styles.secLink}>See all</Text></TouchableOpacity>}
        </View>
        <View style={styles.productGrid}>
          {results.map((item, i) => <ProductCard key={item.id} item={item} index={i} />)}
        </View>
      </View>
    </>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [recents, setRecents] = useState(RECENTS);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }).start();
  }, []);

  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();

  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ── Header ── */}
      <Animated.View style={[styles.header, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }]}>
        <View style={styles.topRow}>
          <View style={styles.deliveryPill}>
            <View style={styles.deliveryPulse} />
            <Text style={styles.deliveryLbl}>Delivery in </Text>
            <Text style={styles.deliveryTime}>10 min</Text>
          </View>
          <TouchableOpacity style={styles.locationRow}>
            <Text style={{ fontSize: 14 }}>📍</Text>
            <Text style={styles.locationTxt}>Sector 18, Noida</Text>
            <Text style={styles.locationChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          recents={recents}
          onRecentPress={r => setQuery(r.label)}
          onRemoveRecent={id => setRecents(prev => prev.filter(x => x.id !== id))}
          onClearAll={() => setRecents([])}
          searchRef={searchRef}
        />

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filter === f && styles.chipOn]}
              onPress={() => { setFilter(f); setQuery(''); }}
              activeOpacity={0.75}
            >
              {filter === f && f !== 'All' && (
                <Text style={styles.chipDot}>●  </Text>
              )}
              <Text style={[styles.chipTxt, filter === f && styles.chipTxtOn]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filter === 'All'
          ? <AllSection query={query} recents={recents} setRecents={setRecents} />
          : <FilterSection filterId={filter} />
        }
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    backgroundColor: C.white,
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 16,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  deliveryPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.greenLight, borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6, gap: 5,
  },
  deliveryPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  deliveryLbl: { fontSize: 12, color: C.textMed, fontWeight: '500' },
  deliveryTime: { fontSize: 13, color: C.green, fontWeight: '900' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationTxt: { fontSize: 13, color: C.text, fontWeight: '700' },
  locationChevron: { fontSize: 18, color: C.green, fontWeight: '700', marginTop: -2 },

  // Search
  searchWrapper: {
    marginBottom: 12,
    zIndex: 100,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: { fontSize: 17, marginRight: 10, color: C.textLight },
  searchInput: { flex: 1, fontSize: 15, color: C.text, fontWeight: '500', padding: 0, borderWidth: 0, outlineStyle: 'none' },
  clearBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  clearTxt: { fontSize: 11, color: C.textMed, fontWeight: '700' },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 54,
    left: 0, right: 0,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    zIndex: 200,
  },
  dropHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropTitle: { fontSize: 12, color: C.textLight, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  dropClear: { fontSize: 12, color: C.green, fontWeight: '700' },
  dropRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  dropThumb: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.greenLight },
  dropRowMid: { flex: 1 },
  dropLabel: { fontSize: 14, color: C.text, fontWeight: '600' },
  dropSub: { fontSize: 11, color: C.textLight, marginTop: 2 },
  dropRemove: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  dropRemoveTxt: { fontSize: 10, color: C.textLight, fontWeight: '700' },

  // Filters
  filterScroll: { marginBottom: 0 },
  filterContent: { paddingBottom: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.white, alignItems: 'center',
  },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  chipTxt: { fontSize: 13, color: C.textMed, fontWeight: '600' },
  chipTxtOn: { color: C.white },
  chipDot: { fontSize: 8, color: 'rgba(255,255,255,0.7)' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 6 },
  section: { paddingHorizontal: 16, marginTop: 22 },
  secHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  secTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  secSubtitle: { fontSize: 13, color: C.textLight, marginTop: 2, marginBottom: 12 },
  secLink: { fontSize: 13, color: C.green, fontWeight: '700' },
  countBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countTxt: { fontSize: 12, fontWeight: '700' },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', borderRadius: 16,
    paddingVertical: 14, borderWidth: 1,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '900' },
  statLbl: { fontSize: 11, color: C.textLight, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 30 },

  // Sub pills
  pillScroll: { gap: 8, paddingBottom: 4, paddingRight: 4 },
  subPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  subPillIcon: { fontSize: 14 },
  subPillTxt: { fontSize: 13, fontWeight: '700' },

  // Recent
  recentList: { gap: 7 },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white, borderRadius: 14,
    padding: 10, gap: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  recentImg: { width: 42, height: 42, borderRadius: 11, backgroundColor: C.greenLight },
  recentLabel: { flex: 1, fontSize: 14, color: C.text, fontWeight: '600' },
  recentX: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  recentXTxt: { fontSize: 11, color: C.textLight, fontWeight: '700' },

  // Categories
  catScroll: { gap: 10, paddingRight: 4 },
  catTile: {
    width: 112, height: 84, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13, shadowRadius: 6, elevation: 4,
  },
  catImg: { width: '100%', height: '100%' },
  catOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,35,12,0.42)' },
  catLabel: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 10 },
  catName: { fontSize: 12, color: C.white, fontWeight: '800', lineHeight: 15 },
  catCount: { fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 2 },

  // Banner
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

  // Product grid
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: {
    width: '47.5%', backgroundColor: C.white,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  productImgWrap: { height: 130, backgroundColor: C.greenLight },
  productImg: { width: '100%', height: '100%' },
  productTag: {
    position: 'absolute', top: 8, left: 8,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  productTagTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  discBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: C.accent, borderRadius: 22,
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 3,
  },
  discTxt: { fontSize: 8, color: C.white, fontWeight: '900', textAlign: 'center', lineHeight: 11 },
  productInfo: { padding: 11 },
  productName: { fontSize: 13, color: C.text, fontWeight: '700', lineHeight: 18, marginBottom: 3 },
  productWt: { fontSize: 11, color: C.textLight, marginBottom: 10, fontWeight: '500' },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  productPrice: { fontSize: 16, color: C.text, fontWeight: '800' },
  productMrp: { fontSize: 11, color: C.textLight, textDecorationLine: 'line-through', marginTop: 2 },

  // Add / qty
  addBtn: {
    backgroundColor: C.green, borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 8,
    shadowColor: C.green, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35, shadowRadius: 4, elevation: 3,
  },
  addTxt: { fontSize: 12, color: C.white, fontWeight: '900', letterSpacing: 0.4 },
  qtyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.green, borderRadius: 10, overflow: 'hidden',
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  qtyTxt: { fontSize: 16, color: C.white, fontWeight: '700', lineHeight: 18 },
  qtyNum: { fontSize: 14, color: C.white, fontWeight: '800', paddingHorizontal: 4 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyImg: { width: 160, height: 130, marginBottom: 20, opacity: 0.65 },
  emptyTitle: { fontSize: 18, color: C.text, fontWeight: '800', marginBottom: 6 },
  emptySub: { fontSize: 14, color: C.textLight, textAlign: 'center' },
});