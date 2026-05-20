import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import useAuthStore from '../../store/authStore';
import AddressMapView from "../../components/AddressMapView";
import { uploadAPI } from '../../services/api';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const PRIMARY = '#1ca049';
const PRIMARY_LIGHT = '#e8f5e9';
const BG = '#f6f6f6';

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Shop Info', icon: '🏪', desc: 'Basic store details' },
  { id: 2, title: 'Compliance', icon: '📋', desc: 'FSSAI, GST & legal' },
  { id: 3, title: 'Bank', icon: '🏦', desc: 'Payment setup' },
  { id: 4, title: 'Catalog', icon: '📦', desc: 'Pick your products' },
  { id: 5, title: 'Review', icon: '📊', desc: 'Inventory & pricing' },
  { id: 6, title: 'Go Live', icon: '🚀', desc: 'Submit & launch' },
];


const UNITS = [
  'kg', 'g', 'litre', 'ml', 'pack', 'piece',
  'dozen', 'bunch', 'box', 'bag', 'bottle', 'can', 'sachet', 'strip',
];


const DELIVERY_TYPES = [
  { id: 'partner', label: 'Use Delivery Boy' },
  { id: 'self', label: 'Own Staff / Self' },
];

// ─── Full generic product catalog ────────────────────────────────────────────
// weight_options added for all loose items — these map directly to DB column
const GENERIC_PRODUCTS = [
  // ── Grocery (packed) ──────────────────────────────────────────────────────
  {
    name: 'Tata Salt 1kg', mrp: 24, sp: 22, unit: 'kg', cat: 'Grocery',
    type: 'packed', weight_options: [],
    image: 'https://m.media-amazon.com/images/I/614mm2hYHyL.jpg',
  },
  {
    name: 'Aashirvaad Atta 5kg', mrp: 280, sp: 265, unit: 'kg', cat: 'Grocery',
    type: 'packed', weight_options: [],
    image: 'https://www.quickpantry.in/cdn/shop/products/aashirvaad-whole-wheat-atta-5-kg-quick-pantry.jpg?v=1710537925',
  },
  {
    name: 'Fortune Sunflower Oil 1L', mrp: 135, sp: 129, unit: 'litre', cat: 'Grocery',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=80',
  },
  // ── Grocery (loose) ───────────────────────────────────────────────────────
  {
    name: 'Loose Sugar', mrp: 46, sp: 44, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=80',
  },
  {
    name: 'Loose Atta (Wheat Flour)', mrp: 36, sp: 34, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&q=80',
  },
  {
    name: 'Loose Jeera (Cumin)', mrp: 320, sp: 310, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['50g', '100g', '250g'],
    image: 'https://images.unsplash.com/photo-1599909533731-0de5a6e0ac61?w=300&q=80',
  },
  {
    name: 'Loose Haldi (Turmeric)', mrp: 160, sp: 150, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['50g', '100g', '250g'],
    image: 'https://images.unsplash.com/photo-1615485500704-8e3b5d56e9b2?w=300&q=80',
  },
  {
    name: 'Loose Chana Dal', mrp: 90, sp: 85, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['250g', '500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1612257416039-56a1d86a2e5d?w=300&q=80',
  },
  {
    name: 'Loose Moong Dal', mrp: 110, sp: 105, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['250g', '500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&q=80',
  },
  {
    name: 'Loose Chai Patti (Tea)', mrp: 400, sp: 380, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['100g', '200g', '500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=300&q=80',
  },
  {
    name: 'Loose Basmati Rice', mrp: 85, sp: 80, unit: 'kg', cat: 'Grocery',
    type: 'loose', weight_options: ['500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&q=80',
  },
  // ── Dairy ─────────────────────────────────────────────────────────────────
  {
    name: 'Amul Milk 500ml', mrp: 30, sp: 28, unit: 'litre', cat: 'Dairy',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&q=80',
  },
  {
    name: 'Amul Butter 100g', mrp: 58, sp: 55, unit: 'g', cat: 'Dairy',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&q=80',
  },
  {
    name: 'Amul Cheese Slices', mrp: 110, sp: 105, unit: 'pack', cat: 'Dairy',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a318?w=300&q=80',
  },
  // ── Snacks ────────────────────────────────────────────────────────────────
  {
    name: 'Parle-G Biscuits 100g', mrp: 15, sp: 13, unit: 'pack', cat: 'Snacks',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&q=80',
  },
  {
    name: 'Haldiram Namkeen 200g', mrp: 45, sp: 42, unit: 'pack', cat: 'Snacks',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80',
  },
  {
    name: 'Maggi Noodles 70g', mrp: 15, sp: 14, unit: 'pack', cat: 'Snacks',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&q=80',
  },
  // ── Fruits & Vegetables (all loose) ──────────────────────────────────────
  {
    name: 'Bananas', mrp: 60, sp: 50, unit: 'kg', cat: 'Fruits & Vegetables',
    type: 'loose', weight_options: ['500g', '1kg'],
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Banana-Single.jpg',
  },
  {
    name: 'Tomatoes', mrp: 40, sp: 35, unit: 'kg', cat: 'Fruits & Vegetables',
    type: 'loose', weight_options: ['250g', '500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&q=80',
  },
  {
    name: 'Onions', mrp: 30, sp: 28, unit: 'kg', cat: 'Fruits & Vegetables',
    type: 'loose', weight_options: ['500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&q=80',
  },
  {
    name: 'Potatoes', mrp: 25, sp: 22, unit: 'kg', cat: 'Fruits & Vegetables',
    type: 'loose', weight_options: ['500g', '1kg'],
    image: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=300&q=80',
  },
  // ── Beverages ─────────────────────────────────────────────────────────────
  {
    name: 'Tata Tea Premium 250g', mrp: 130, sp: 125, unit: 'pack', cat: 'Beverages',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=300&q=80',
  },
  {
    name: 'Coca-Cola 750ml', mrp: 45, sp: 40, unit: 'bottle', cat: 'Beverages',
    type: 'packed', weight_options: [],
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&q=80',
  },
];

const EMPTY_PRODUCT = {
  name: '', mrp: '', sp: '', unit: 'kg', cat: '',
  stock: '', type: 'loose', weight_options: [],
};

const SAMPLE_CSV = `name,mrp,sp,unit,category,stock_qty,type
Loose Basmati Rice,85,80,kg,Grocery,100,loose
Amul Milk 500ml,30,28,litre,Dairy,50,packed`;

// ─── Auto-geocode helper ──────────────────────────────────────────────────────
// Converts pincode + city → lat/lng using Nominatim (free, no API key needed)
async function geocodeAddress(city, pincode) {
  try {
    const q = encodeURIComponent(`${pincode}, ${city}, India`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'User-Agent': 'DesiDukaan/1.0' } }
    );
    const data = await res.json();
    if (data?.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
  } catch { }
  return { latitude: null, longitude: null };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VendorOnboardingScreen({ onComplete }) {
  const navigation = useNavigation();
  const { token, user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Step 1 — Shop Info
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [estYear, setEstYear] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [altName, setAltName] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [deliveryType, setDeliveryType] = useState('self');
  // Geocoded coords — auto-set on submit
  const [resolvedLat, setResolvedLat] = useState(null);
  const [resolvedLng, setResolvedLng] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (city.length >= 3 && pincode.length === 6) {
        setGeocoding(true);
        const coords = await geocodeAddress(city, pincode);
        if (coords.latitude && coords.longitude) {
          setResolvedLat(coords.latitude);
          setResolvedLng(coords.longitude);
          setMapRegion(prev => ({
            ...prev,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }));
        }
        setGeocoding(false);
      }
    }, 1000);
    return () => clearTimeout(delayDebounceFn);
  }, [city, pincode]);

  // Step 2 — Compliance
  const [fssai, setFssai] = useState('');
  const [gst, setGst] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  // Step 2 — Document uploads (stores Cloudinary URLs)
  const [docUrls, setDocUrls] = useState({ fssai: null, gst: null });
  const [docUploading, setDocUploading] = useState({ fssai: false, gst: false });
  // Step 4 — Product photo uploading per row index
  const [prodImgUploading, setProdImgUploading] = useState({});

  // Step 3 — Bank
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');

  // Step 4 — Catalog
  const [addMode, setAddMode] = useState('generic');
  const [selectedProds, setSelectedProds] = useState({});
  const [manualProds, setManualProds] = useState([{ ...EMPTY_PRODUCT }]);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [masterCategories, setMasterCategories] = useState([]);
  const [categoryStack, setCategoryStack] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (currentStep === 4 && masterCategories.length === 0) {
      fetchCategories();
    }
  }, [currentStep]);

  const fetchCategories = async (parentId = null) => {
    setLoadingCatalog(true);
    try {
      const url = `${API_BASE}/master/categories${parentId ? `?parentId=${parentId}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMasterCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleCategoryClick = async (cat) => {
    setLoadingCatalog(true);
    try {
      const res = await fetch(`${API_BASE}/master/categories/${cat.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const hasChildren = data.children && data.children.length > 0;
      const hasProducts = data.master_products && data.master_products.length > 0;

      if (hasProducts) {
        // ── Leaf node: show products ─────────────────────────────────────────
        setCategoryStack(prev => [...prev, cat]);
        setMasterCategories([]);
        setCurrentCategory({ ...cat, products: data.master_products });
      } else if (hasChildren) {
        // ── Mid node: drill into sub-categories ──────────────────────────────
        setCategoryStack(prev => [...prev, cat]);
        setMasterCategories(data.children);
        setCurrentCategory(cat);
      } else {
        // ── No children and no inline products — fetch via dedicated endpoint ─
        const prodRes = await fetch(`${API_BASE}/master/products/${cat.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const products = Array.isArray(prodData) ? prodData : prodData.products || prodData.data || [];
          setCategoryStack(prev => [...prev, cat]);
          setMasterCategories([]);
          setCurrentCategory({ ...cat, products });
        } else {
          // Nothing to show — just navigate in anyway so back works
          setCategoryStack(prev => [...prev, cat]);
          setMasterCategories([]);
          setCurrentCategory({ ...cat, products: [] });
        }
      }
    } catch (err) {
      console.error('Error fetching category details:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleBackCategory = () => {
    const newStack = [...categoryStack];
    newStack.pop();
    const parent = newStack[newStack.length - 1];
    setCategoryStack(newStack);
    setCurrentCategory(parent || null);
    fetchCategories(parent ? parent.id : null);
  };



  const toggleProduct = (product) => {
    setSelectedProds(prev => {
      const next = { ...prev };
      if (next[product.name]) delete next[product.name];
      else next[product.name] = { ...product, stock: 0 };
      return next;
    });
  };

  const selectAllProducts = () => {
    const filtered = getFilteredCatalog();
    const next = { ...selectedProds };
    filtered.forEach(p => { next[p.name] = { ...p, stock: 0 }; });
    setSelectedProds(next);
  };

  const getFilteredCatalog = () =>
    GENERIC_PRODUCTS.filter(p => {
      const searchMatch = prodSearch === '' || p.name.toLowerCase().includes(prodSearch.toLowerCase());
      return searchMatch;
    });

  const addManualRow = () => setManualProds(prev => [...prev, { ...EMPTY_PRODUCT }]);
  const removeManualRow = (i) => setManualProds(prev => prev.filter((_, idx) => idx !== i));
  const updateManualProd = (i, field, value) =>
    setManualProds(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  // ── Document upload (Step 2) ──────────────────────────────────────────────────
  const pickAndUploadDoc = async (docKey) => {
    try {
      setDocUploading(prev => ({ ...prev, [docKey]: true }));
      // Try document picker first (supports PDF + images)
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType || (asset.name?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const data = await uploadAPI.upload(asset.uri, mimeType, token);
      setDocUrls(prev => ({ ...prev, [docKey]: data.url }));
      Alert.alert('✅ Uploaded', 'Document uploaded successfully!');
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Could not upload document');
    } finally {
      setDocUploading(prev => ({ ...prev, [docKey]: false }));
    }
  };

  // ── Product photo upload (Step 4 manual) ─────────────────────────────────────
  const pickAndUploadProductPhoto = async (index) => {
    try {
      setProdImgUploading(prev => ({ ...prev, [index]: true }));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const data = await uploadAPI.upload(asset.uri, mimeType, token);
      updateManualProd(index, 'image_url', data.url);
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Could not upload image');
    } finally {
      setProdImgUploading(prev => ({ ...prev, [index]: false }));
    }
  };

  const parseCSV = () => {
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      }).filter(p => p.name);
      setCsvPreview(parsed);
      if (parsed.length > 0) Alert.alert('✅ Parsed', `${parsed.length} products ready to import`);
    } catch {
      Alert.alert('Error', 'Could not parse CSV. Check the format.');
    }
  };

  const getAllProducts = () => {
    const fromCatalog = Object.values(selectedProds);
    const fromManual = manualProds.filter(p => p.name && p.sp);
    const fromCSV = csvPreview.filter(p => p.name && p.sp);
    return [...fromCatalog, ...fromManual, ...fromCSV];
  };

  // ── Validation ────────────────────────────────────────────────────────────────

  const validateStep = () => {
    if (currentStep === 1) {
      if (!shopName.trim()) { Alert.alert('Required', 'Enter your shop name'); return false; }
      if (!ownerName.trim()) { Alert.alert('Required', 'Enter owner name'); return false; }
      if (!email.trim()) { Alert.alert('Required', 'Enter email address'); return false; }
      if (!address.trim()) { Alert.alert('Required', 'Enter shop address'); return false; }
      if (!city.trim()) { Alert.alert('Required', 'Enter your city'); return false; }
      if (pincode.length !== 6) { Alert.alert('Required', 'Enter a valid 6-digit pincode'); return false; }
    }
    if (currentStep === 2) {
      if (!fssai.trim()) { Alert.alert('Required', 'Enter your FSSAI license number'); return false; }
      if (!gst.trim()) { Alert.alert('Required', 'Enter your GST number'); return false; }
    }
    if (currentStep === 3) {
      if (!upiId.trim() && !accountNumber.trim()) {
        Alert.alert('Required', 'Enter UPI ID or bank account details'); return false;
      }
    }
    if (currentStep === 4) {
      if (getAllProducts().length === 0) {
        Alert.alert('Required', 'Add at least one product'); return false;
      }
    }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleNext = async () => {
    if (!validateStep()) return;

    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    // ── Final submit ──────────────────────────────────────────────────────────
    setLoading(true);
    try {
      // 1. Auto-geocode pincode + city → lat/lng
      //    This runs just before submit so we always have fresh coords
      setGeocoding(true);
      const { latitude, longitude } = await geocodeAddress(city, pincode);
      setGeocoding(false);

      if (!latitude || !longitude) {
        // Non-blocking warning — vendor still registers, just won't appear in nearby search
        Alert.alert(
          'Location not found',
          `We couldn't pinpoint "${pincode}, ${city}". Your shop will still be created but may not show in nearby results. You can update your location from the dashboard.`,
          [{ text: 'Continue anyway' }]
        );
      }

      // 2. Create vendor
      const body = {
        shop_name: shopName,
        owner_name: ownerName,
        establishment_year: estYear || null,
        email,
        phone,
        alt_contact_name: altName || null,
        alt_phone: altPhone || null,
        fssai_number: fssai || null,
        gst_number: gst || null,
        aadhar_number: aadhar || null,
        pan_number: pan || null,
        trade_license_number: tradeLicense || null,
        fssai_license_url: docUrls.fssai || null,
        gst_certificate_url: docUrls.gst || null,
        address_line: address,
        landmark: landmark || null,
        city,
        pincode,
        latitude: latitude || null,
        longitude: longitude || null,
        upi_id: upiId || null,
        bank_account_name: accountName || null,
        bank_account_number: accountNumber || null,
        bank_ifsc: ifsc || null,
        delivery_type: deliveryType,
      };

      // Clean body – replace empty strings with null for backend patterns
      Object.keys(body).forEach(key => {
        if (body[key] === '') body[key] = null;
      });

      const vendorRes = await fetch(`${API_BASE}/vendors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const vendorData = await vendorRes.json();
      if (!vendorRes.ok) throw new Error(vendorData.msg || 'Failed to create shop');

      // 3. Create products
      //    Note: we send item_type (DB column name) NOT type, to avoid backend mapping issues
      const allProds = getAllProducts();
      for (const product of allProds) {
        await fetch(`${API_BASE}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: product.name,
            mrp: parseFloat(product.mrp || 0),
            price: parseFloat(product.price || product.base_price || product.sp || 0),
            unit: product.unit || 'kg',
            category: product.category?.name || product.cat || currentCategory?.name || '',
            category_id: product.category_id || currentCategory?.id,
            stock_qty: parseInt(product.stock || product.stock_qty || 0),
            type: product.item_type || product.type || 'packed',
            image_url: product.image_url || product.image || null,
            weight_options: (() => {
              const opts = Array.isArray(product.weight_options) ? product.weight_options : [];
              return opts.map(opt => {
                if (typeof opt === 'string') {
                  const m = opt.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
                  if (m) return { weight: parseFloat(m[1]), unit: m[2] };
                  return { weight: parseFloat(opt) || 0, unit: 'g' };
                }
                return opt;
              });
            })(),
          }),
        });
      }

      if (onComplete) {
        onComplete();
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setGeocoding(false);
    }
  };

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🛕</Text>
          <View>
            <Text style={styles.brandName}>DesiDukaan</Text>
            <Text style={styles.brandSub}>Seller Registration</Text>
          </View>
        </View>
        <Text style={styles.stepCount}>{currentStep} of {STEPS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      {/* Step pills */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.stepsScroll} contentContainerStyle={styles.stepsRow}
      >
        {STEPS.map((step) => (
          <View key={step.id} style={styles.stepPillWrapper}>
            <View style={[
              styles.stepPill,
              currentStep === step.id && styles.stepPillActive,
              currentStep > step.id && styles.stepPillDone,
            ]}>
              <View style={[
                styles.stepNum,
                currentStep === step.id && styles.stepNumActive,
                currentStep > step.id && styles.stepNumDone,
              ]}>
                <Text style={[styles.stepNumText, currentStep >= step.id && styles.stepNumTextActive]}>
                  {currentStep > step.id ? '✓' : step.id}
                </Text>
              </View>
              <Text style={[
                styles.stepPillText,
                (currentStep === step.id || currentStep > step.id) && styles.stepPillTextActive,
              ]}>
                {step.title}
              </Text>
            </View>
            {step.id < STEPS.length && (
              <View style={[styles.connector, currentStep > step.id && styles.connectorDone]} />
            )}
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Step header */}
          <View style={styles.stepHeader}>
            <Text style={styles.stepIcon}>{STEPS[currentStep - 1].icon}</Text>
            <View>
              <Text style={styles.stepTitle}>{STEPS[currentStep - 1].title}</Text>
              <Text style={styles.stepDesc}>{STEPS[currentStep - 1].desc}</Text>
            </View>
          </View>

          {/* ── STEP 1: Shop Info ── */}
          {currentStep === 1 && (
            <View style={styles.form}>
              <Text style={styles.label}>Shop Name <Text style={styles.req}>*</Text></Text>
              <TextInput style={styles.input} placeholder="e.g. Sharma Kirana Store" value={shopName} onChangeText={setShopName} />

              <Text style={styles.label}>Shop Owner Name <Text style={styles.req}>*</Text></Text>
              <TextInput style={styles.input} placeholder="Full name as per ID" value={ownerName} onChangeText={setOwnerName} />

              <Text style={styles.label}>Establishment Year</Text>
              <TextInput style={styles.input} placeholder="e.g. 2015" keyboardType="numeric" maxLength={4} value={estYear} onChangeText={setEstYear} />

              <Text style={styles.label}>Shop Email <Text style={styles.req}>*</Text></Text>
              <TextInput style={styles.input} placeholder="For order notifications & updates" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

              {/* Contacts */}
              <Text style={styles.sectionSep}>📞 Contact Details</Text>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Primary Name <Text style={styles.req}>*</Text></Text>
                  <TextInput style={styles.input} placeholder="Name 1" value={ownerName} onChangeText={setOwnerName} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Primary Phone <Text style={styles.req}>*</Text></Text>
                  <TextInput style={styles.input} placeholder="10-digit" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />
                </View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Alternate Name</Text>
                  <TextInput style={styles.input} placeholder="Name 2" value={altName} onChangeText={setAltName} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Alternate Phone</Text>
                  <TextInput style={styles.input} placeholder="Backup number" keyboardType="phone-pad" maxLength={10} value={altPhone} onChangeText={setAltPhone} />
                </View>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>💡 Two contacts ensure customers can always reach someone if one person is unavailable.</Text>
              </View>

              {/* Address */}
              <Text style={styles.sectionSep}>📍 Shop Address</Text>
              <Text style={styles.label}>Street Address <Text style={styles.req}>*</Text></Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Shop no., Street, Area" value={address} onChangeText={setAddress} multiline numberOfLines={2} />

              <Text style={styles.label}>Landmark</Text>
              <TextInput style={styles.input} placeholder="e.g. Near Hanuman Temple" value={landmark} onChangeText={setLandmark} />
              <View style={styles.row}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>City <Text style={styles.req}>*</Text></Text>
                  <TextInput style={styles.input} placeholder="e.g. Noida" value={city} onChangeText={setCity} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Pincode <Text style={styles.req}>*</Text></Text>
                  <TextInput style={styles.input} placeholder="6-digit" keyboardType="numeric" maxLength={6} value={pincode} onChangeText={setPincode} />
                </View>
              </View>

              {/* Map Preview */}
              {(city.length > 0 || pincode.length > 0) && (
                <View style={styles.mapWrapper}>
                  <AddressMapView
                    region={mapRegion}
                    latitude={resolvedLat}
                    longitude={resolvedLng}
                    onRegionChangeComplete={setMapRegion}
                  />
                </View>
              )}

              {/* Geocoding note */}
              <View style={styles.geoNote}>
                <Text style={styles.geoNoteIcon}>📍</Text>
                <Text style={styles.geoNoteText}>
                  Your shop location will be auto-detected from pincode + city when you submit. This helps customers find you nearby.
                </Text>
              </View>


              <Text style={styles.label}>How will you deliver orders? <Text style={styles.req}>*</Text></Text>
              <View style={styles.segmentRow}>
                {DELIVERY_TYPES.map(dt => (
                  <TouchableOpacity
                    key={dt.id}
                    style={[styles.segBtn, deliveryType === dt.id && styles.segBtnActive]}
                    onPress={() => setDeliveryType(dt.id)}
                  >
                    <Text style={[styles.segBtnText, deliveryType === dt.id && styles.segBtnTextActive, { textAlign: 'center', fontSize: 11 }]}>
                      {dt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── STEP 2: Compliance ── */}
          {currentStep === 2 && (
            <View style={styles.form}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>📋 These details are required for shop verification. Your shop will be reviewed by our team before going live.</Text>
              </View>
              <Text style={styles.label}>FSSAI License Number <Text style={styles.req}>*</Text></Text>
              <TextInput style={styles.input} placeholder="14-digit FSSAI number" keyboardType="numeric" maxLength={14} value={fssai} onChangeText={setFssai} />
              <Text style={styles.hintText}>Required for food businesses.</Text>

              <Text style={styles.label}>GST Number <Text style={styles.req}>*</Text></Text>
              <TextInput style={styles.input} placeholder="15-character GST number" maxLength={15} autoCapitalize="characters" value={gst} onChangeText={v => setGst(v.toUpperCase())} />

              <Text style={styles.label}>Aadhaar Number (Optional)</Text>
              <TextInput style={styles.input} placeholder="12-digit Aadhaar number" keyboardType="numeric" maxLength={12} value={aadhar} onChangeText={setAadhar} />

              <Text style={styles.label}>PAN Number (Optional)</Text>
              <TextInput style={styles.input} placeholder="10-character PAN number" maxLength={10} autoCapitalize="characters" value={pan} onChangeText={v => setPan(v.toUpperCase())} />

              <Text style={styles.label}>Trade License Number (Optional)</Text>
              <TextInput style={styles.input} placeholder="Enter Trade License number" maxLength={50} value={tradeLicense} onChangeText={setTradeLicense} />

              <View style={[styles.infoBox, { marginTop: 16 }]}>
                <Text style={[styles.infoText, { fontWeight: '700', marginBottom: 4 }]}>⏳ Admin Approval Process</Text>
                <Text style={styles.infoText}>
                  Once you submit, our team will verify your FSSAI & GST details within <Text style={{ fontWeight: '700' }}>24–48 hours</Text>. You'll receive an email once approved. Your shop will not be visible to customers until then.
                </Text>
              </View>

              <Text style={styles.sectionSep}>📄 Document Upload (optional — speeds up approval)</Text>
              {[
                { label: 'FSSAI Certificate', key: 'fssai' },
                { label: 'GST Registration Certificate', key: 'gst' },
              ].map(doc => (
                <View key={doc.key}>
                  <Text style={styles.label}>{doc.label}</Text>
                  {docUrls[doc.key] ? (
                    <View style={styles.uploadedBox}>
                      <Text style={styles.uploadedIcon}>✅</Text>
                      <Text style={styles.uploadedText} numberOfLines={1}>Document uploaded successfully</Text>
                      <TouchableOpacity onPress={() => setDocUrls(prev => ({ ...prev, [doc.key]: null }))}>
                        <Text style={styles.uploadRemove}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadBox}
                      onPress={() => pickAndUploadDoc(doc.key)}
                      disabled={docUploading[doc.key]}
                    >
                      {docUploading[doc.key] ? (
                        <ActivityIndicator color={PRIMARY} size="small" />
                      ) : (
                        <Text style={styles.uploadIcon}>📁</Text>
                      )}
                      <Text style={styles.uploadText}>
                        {docUploading[doc.key] ? 'Uploading…' : 'Tap to upload PDF or photo'}
                      </Text>
                      <Text style={styles.uploadHint}>Max 10MB</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ── STEP 3: Bank Details ── */}
          {currentStep === 3 && (
            <View style={styles.form}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>💡 Payments settled within 2 business days after delivery confirmation.</Text>
              </View>
              <Text style={styles.sectionLabel}>UPI ID (Recommended)</Text>
              <TextInput style={styles.input} placeholder="yourname@upi or phone@paytm" value={upiId} onChangeText={setUpiId} autoCapitalize="none" />
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR Bank Account</Text>
                <View style={styles.dividerLine} />
              </View>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput style={styles.input} placeholder="As per bank records" value={accountName} onChangeText={setAccountName} />
              <Text style={styles.label}>Account Number</Text>
              <TextInput style={styles.input} placeholder="Enter account number" keyboardType="numeric" secureTextEntry value={accountNumber} onChangeText={setAccountNumber} />
              <Text style={styles.label}>IFSC Code</Text>
              <TextInput style={styles.input} placeholder="e.g. SBIN0001234" autoCapitalize="characters" value={ifsc} onChangeText={v => setIfsc(v.toUpperCase())} />
            </View>
          )}

          {/* ── STEP 4: Product Catalog ── */}
          {currentStep === 4 && (
            <View style={styles.form}>
              <View style={styles.modeToggle}>
                {[
                  { key: 'generic', label: '🛒 Catalog' },
                  { key: 'manual', label: '✏️ Manual' },
                  { key: 'csv', label: '📂 CSV' },
                ].map(m => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.modeBtn, addMode === m.key && styles.modeBtnActive]}
                    onPress={() => setAddMode(m.key)}
                  >
                    <Text style={[styles.modeBtnText, addMode === m.key && styles.modeBtnTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Generic catalog ── */}
              {addMode === 'generic' && (
                <View>
                  {/* Category Navigation / Breadcrumbs */}
                  {categoryStack.length > 0 && (
                    <TouchableOpacity onPress={handleBackCategory} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 16, color: PRIMARY, fontWeight: '700' }}>← {currentCategory?.name || 'Back'}</Text>
                    </TouchableOpacity>
                  )}

                  {loadingCatalog ? (
                    <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 30 }} />
                  ) : (
                    <View>
                      {/* Hierarchical Categories */}
                      {masterCategories.length > 0 && (
                        <View>
                          <Text style={styles.sectionLabel}>Select Category</Text>
                          <View style={styles.segmentGrid}>
                            {masterCategories.map(cat => (
                              <TouchableOpacity
                                key={cat.id}
                                style={styles.segGridBtn}
                                onPress={() => handleCategoryClick(cat)}
                              >
                                {cat.image_url ? (
                                  <Image source={{ uri: cat.image_url }} style={styles.segGridImage} />
                                ) : (
                                  <View style={[styles.segGridImage, { alignItems: 'center', justifyContent: 'center' }]}>
                                    <Text style={{ fontSize: 24 }}>📦</Text>
                                  </View>
                                )}
                                <Text style={styles.segGridText}>{cat.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Master Products */}
                      {currentCategory?.products && currentCategory.products.length > 0 && (
                        <View>
                          <TextInput
                            style={[styles.input, { marginBottom: 16 }]}
                            placeholder={`Search in ${currentCategory.name}...`}
                            value={prodSearch}
                            onChangeText={setProdSearch}
                          />
                          <View style={styles.selAllRow}>
                            <Text style={styles.catalogMeta}>{currentCategory.products.length} items available</Text>
                            <TouchableOpacity onPress={() => currentCategory.products.forEach(p => toggleProduct(p))}>
                              <Text style={styles.selAllBtn}>Select all</Text>
                            </TouchableOpacity>
                          </View>

                          {currentCategory.products
                            .filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()))
                            .map((p) => {
                              const isSel = !!selectedProds[p.name];
                              return (
                                <TouchableOpacity
                                  key={p.id}
                                  style={[styles.catalogCard, isSel && styles.catalogCardSelected]}
                                  onPress={() => toggleProduct(p)}
                                >
                                  {p.image_url ? (
                                    <Image source={{ uri: p.image_url }} style={styles.catalogImage} />
                                  ) : (
                                    <View style={[styles.catalogImage, { alignItems: 'center', justifyContent: 'center' }]}>
                                      <Text style={{ fontSize: 24 }}>📦</Text>
                                    </View>
                                  )}
                                  <View style={{ flex: 1 }}>
                                    <View style={styles.catalogTopRow}>
                                      <Text style={styles.catalogName} numberOfLines={1}>{p.name}</Text>
                                      <Text style={styles.inventoryPrice}>₹{p.mrp}</Text>
                                    </View>
                                    <Text style={styles.catalogMeta}>{p.unit} • {p.item_type}</Text>
                                  </View>
                                  <View style={[styles.checkbox, isSel && styles.checkboxSel]}>
                                    {isSel && <Text style={styles.checkmark}>✓</Text>}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                        </View>
                      )}

                      {masterCategories.length === 0 && (!currentCategory?.products || currentCategory.products.length === 0) && !loadingCatalog && (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyEmoji}>🔍</Text>
                          <Text style={styles.emptyTitle}>No items found</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <TouchableOpacity style={[styles.cantFindBtn, { marginTop: 20 }]} onPress={() => setAddMode('manual')}>
                    <Text style={styles.cantFindText}>+ Can't find your product? Add it manually</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Manual entry ── */}
              {addMode === 'manual' && (
                <View>
                  {manualProds.map((product, index) => (
                    <View key={index} style={styles.productCard}>
                      <View style={styles.productCardHeader}>
                        <Text style={styles.productCardNum}>Product {index + 1}</Text>
                        {manualProds.length > 1 && (
                          <TouchableOpacity onPress={() => removeManualRow(index)}>
                            <Text style={styles.removeBtn}>✕ Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.photoRow}>
                        {product.image_url ? (
                          <View style={styles.photoPreviewWrap}>
                            <Image source={{ uri: product.image_url }} style={styles.photoPreview} />
                            <TouchableOpacity
                              style={styles.photoRemoveBtn}
                              onPress={() => updateManualProd(index, 'image_url', null)}
                            >
                              <Text style={styles.photoRemoveText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.photoBox}
                            onPress={() => pickAndUploadProductPhoto(index)}
                            disabled={!!prodImgUploading[index]}
                          >
                            {prodImgUploading[index] ? (
                              <ActivityIndicator color={PRIMARY} size="small" />
                            ) : (
                              <Text style={styles.photoIcon}>📷</Text>
                            )}
                          </TouchableOpacity>
                        )}
                        <Text style={styles.photoHint}>
                          {product.image_url
                            ? 'Photo uploaded! Tap ✕ to remove.'
                            : `Add a photo for better visibility.\nCustomers trust shops with product photos.`}
                        </Text>
                      </View>

                      <Text style={styles.label}>Product Name <Text style={styles.req}>*</Text></Text>
                      <TextInput
                        style={styles.input} placeholder="e.g. Loose Basmati Rice"
                        value={product.name} onChangeText={v => updateManualProd(index, 'name', v)}
                      />

                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>Item Type</Text>
                          <View style={styles.segmentRow}>
                            {['loose', 'packed'].map(t => (
                              <TouchableOpacity
                                key={t}
                                style={[styles.segBtn, product.type === t && styles.segBtnActive]}
                                onPress={() => updateManualProd(index, 'type', t)}
                              >
                                <Text style={[styles.segBtnText, product.type === t && styles.segBtnTextActive]}>
                                  {t === 'loose' ? 'Loose' : 'Packed'}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        <View style={{ width: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>Unit <Text style={styles.req}>*</Text></Text>
                          <TextInput
                            style={styles.input} placeholder="kg / litre / piece..."
                            value={product.unit} onChangeText={v => updateManualProd(index, 'unit', v)}
                          />
                        </View>
                      </View>

                      {product.type === 'loose' && (
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.label}>Available Quantities <Text style={styles.req}>*</Text></Text>
                          <View style={styles.chipGrid}>
                            {['50g', '100g', '200g', '250g', '500g', '1kg'].map(w => {
                              const isSel = product.weight_options?.includes(w);
                              return (
                                <TouchableOpacity
                                  key={w}
                                  style={[styles.chip, isSel && styles.chipActive]}
                                  onPress={() => {
                                    const curr = product.weight_options || [];
                                    updateManualProd(index, 'weight_options',
                                      isSel ? curr.filter(x => x !== w) : [...curr, w]
                                    );
                                  }}
                                >
                                  <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{w}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>MRP (₹) <Text style={styles.req}>*</Text></Text>
                          <TextInput
                            style={styles.input} placeholder="Max retail price"
                            keyboardType="numeric" value={product.mrp}
                            onChangeText={v => updateManualProd(index, 'mrp', v)}
                          />
                        </View>
                        <View style={{ width: 12 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>Selling Price (₹) <Text style={styles.req}>*</Text></Text>
                          <TextInput
                            style={styles.input} placeholder="Your price"
                            keyboardType="numeric" value={product.sp}
                            onChangeText={v => updateManualProd(index, 'sp', v)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addRowBtn} onPress={addManualRow}>
                    <Text style={styles.addRowBtnText}>+ Add Another Product</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── CSV ── */}
              {addMode === 'csv' && (
                <View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>📋 Paste CSV with headers:</Text>
                    <Text style={[styles.infoText, styles.codeText]}>{SAMPLE_CSV}</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.csvInput]}
                    placeholder="Paste CSV data here..."
                    value={csvText} onChangeText={setCsvText}
                    multiline numberOfLines={8}
                  />
                  <TouchableOpacity style={styles.parseBtn} onPress={parseCSV}>
                    <Text style={styles.parseBtnText}>📥 Parse & Preview</Text>
                  </TouchableOpacity>
                  {csvPreview.length > 0 && (
                    <View style={styles.previewBox}>
                      <Text style={styles.previewTitle}>✅ {csvPreview.length} products ready</Text>
                      {csvPreview.slice(0, 3).map((p, i) => (
                        <Text key={i} style={styles.previewItem}>• {p.name} — MRP ₹{p.mrp} / SP ₹{p.sp} / {p.unit}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ── STEP 5: Inventory Review ── */}
          {currentStep === 5 && (
            <View style={styles.form}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>📊 Review pricing and stock. You can edit anytime from your dashboard.</Text>
              </View>
              {getAllProducts().length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📦</Text>
                  <Text style={styles.emptyTitle}>No products added</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(4)}>
                    <Text style={{ color: PRIMARY, fontWeight: '700', marginTop: 8 }}>← Go back and add products</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                getAllProducts().map((product, index) => (
                  <View key={index} style={styles.inventoryCard}>
                    <View style={styles.inventoryLeft}>
                      <Text style={styles.inventoryName}>{product.name}</Text>
                      <Text style={styles.inventoryMeta}>
                        {product.cat || product.category || '—'} · {product.unit}
                      </Text>
                      <View style={[styles.typeBadge, product.type === 'loose' ? styles.badgeLoose : styles.badgePacked, { marginTop: 4 }]}>
                        <Text style={[styles.typeBadgeText, product.type === 'loose' ? styles.badgeLooseText : styles.badgePackedText]}>
                          {product.type || 'packed'}
                        </Text>
                      </View>
                      {/* Show weight options in review */}
                      {product.type === 'loose' && product.weight_options?.length > 0 && (
                        <View style={styles.weightChipsRow}>
                          {product.weight_options.map(w => (
                            <View key={w} style={styles.weightChipSmall}>
                              <Text style={styles.weightChipSmallText}>{w}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View style={styles.inventoryRight}>
                      <Text style={styles.inventoryMrp}>MRP ₹{product.mrp}</Text>
                      <Text style={styles.inventoryPrice}>SP ₹{product.sp || product.price}</Text>
                      <Text style={styles.inventoryStock}>
                        {(product.stock || product.stock_qty) > 0
                          ? `${product.stock || product.stock_qty} in stock`
                          : 'Stock not set'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ── STEP 6: Go Live ── */}
          {currentStep === 6 && (
            <View>
              <View style={styles.goLiveContainer}>
                <Text style={styles.goLiveEmoji}>🎉</Text>
                <Text style={styles.goLiveTitle}>Almost live!</Text>
                <Text style={styles.goLiveSub}>Here's your shop summary before submission.</Text>
              </View>
              <View style={styles.summaryCard}>
                {[
                  { icon: '🏪', label: 'Shop Name', value: shopName || '—' },
                  { icon: '👤', label: 'Owner', value: ownerName || '—' },
                  { icon: '📍', label: 'Location', value: city && pincode ? `${city} – ${pincode}` : '—' },
                  { icon: '📋', label: 'FSSAI / GST', value: `${fssai || '—'} / ${gst || '—'}` },
                  ...(aadhar ? [{ icon: '🆔', label: 'Aadhaar', value: aadhar }] : []),
                  ...(pan ? [{ icon: '📑', label: 'PAN', value: pan }] : []),
                  ...(tradeLicense ? [{ icon: '📜', label: 'Trade License', value: tradeLicense }] : []),
                  { icon: '📦', label: 'Products', value: `${getAllProducts().length} products ready` },
                  { icon: '💰', label: 'Payment', value: upiId || (accountNumber ? 'Bank account' : 'Not set') },
                  { icon: '🚚', label: 'Delivery', value: deliveryType === 'partner' ? 'Via Delivery Boy' : 'Own Staff / Self' },
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryIcon}>{row.icon}</Text>
                      <View>
                        <Text style={styles.summaryLabel}>{row.label}</Text>
                        <Text style={styles.summaryValue}>{row.value}</Text>
                      </View>
                    </View>
                    {i < arr.length - 1 && <View style={styles.summaryDivider} />}
                  </View>
                ))}
              </View>
              <View style={[styles.infoBox, { marginTop: 16 }]}>
                <Text style={styles.infoText}>
                  ✅ Your shop will be reviewed within <Text style={{ fontWeight: '700' }}>24–48 hours</Text>. You'll be notified at <Text style={{ fontWeight: '700' }}>{email || 'your email'}</Text> once approved and live.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(prev => prev - 1)}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, (loading || geocoding) && { opacity: 0.7 }]}
          onPress={handleNext}
          disabled={loading || geocoding}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.nextText}>
                {geocoding ? 'Detecting location…' : 'Submitting…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.nextText}>
              {currentStep === STEPS.length ? '🚀 Submit & Go Live' : 'Save & Continue →'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  topBar: {
    backgroundColor: PRIMARY, paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandEmoji: { fontSize: 26 },
  brandName: { fontSize: 17, fontWeight: '800', color: '#fff' },
  brandSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  stepCount: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  progressFill: { height: 3, backgroundColor: '#fff' },

  stepsScroll: { backgroundColor: '#fff', maxHeight: 60, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  stepsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  stepPillWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5 },
  stepPillActive: {},
  stepPillDone: {},
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  stepNumActive: { backgroundColor: PRIMARY },
  stepNumDone: { backgroundColor: PRIMARY },
  stepNumText: { fontSize: 10, fontWeight: '700', color: '#aaa' },
  stepNumTextActive: { color: '#fff' },
  stepPillText: { fontSize: 11, fontWeight: '600', color: '#aaa' },
  stepPillTextActive: { color: PRIMARY },
  connector: { width: 14, height: 1.5, backgroundColor: '#e0e0e0', marginHorizontal: 2 },
  connectorDone: { backgroundColor: PRIMARY },

  content: { flex: 1, paddingHorizontal: 20 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 16 },
  stepIcon: { fontSize: 34 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#222' },
  stepDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  form: { gap: 2 },

  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 14 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#222', marginTop: 12, marginBottom: 4 },
  sectionSep: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 20, marginBottom: 6, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: '#eee' },
  req: { color: '#e53935' },
  hintText: { fontSize: 11, color: '#999', marginTop: -4, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 10, padding: 13, fontSize: 14, color: '#333', marginBottom: 6,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },

  // Geocoding note
  geoNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, marginTop: 6, marginBottom: 4 },
  geoNoteIcon: { fontSize: 14, marginTop: 1 },
  geoNoteText: { fontSize: 12, color: '#7B5800', flex: 1, lineHeight: 18 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  chipText: { fontSize: 12, color: '#555', fontWeight: '500' },
  chipTextActive: { color: PRIMARY, fontWeight: '700' },

  // Vendor type — 2x2 grid
  segmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  segGridBtn: { width: '48%', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#eee', backgroundColor: '#fff', alignItems: 'center' },
  segGridBtnActive: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  segGridImage: { width: 50, height: 50, borderRadius: 10, marginBottom: 8, backgroundColor: '#f9f9f9' },
  segGridText: { fontSize: 13, color: '#333', fontWeight: '700', textAlign: 'center' },
  segGridTextActive: { color: PRIMARY },

  infoBox: { backgroundColor: PRIMARY_LIGHT, borderRadius: 10, padding: 13, marginBottom: 8, marginTop: 4 },
  infoText: { fontSize: 13, color: '#2e7d32', lineHeight: 20 },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11, marginTop: 6, color: '#1b5e20' },

  uploadBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 6, backgroundColor: '#fafafa' },
  uploadIcon: { fontSize: 24, marginBottom: 6 },
  uploadText: { fontSize: 13, color: '#888' },
  uploadHint: { fontSize: 11, color: '#bbb', marginTop: 3 },
  uploadedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#c8e6c9', borderRadius: 10, padding: 12, marginBottom: 6, backgroundColor: '#f1fff5' },
  uploadedIcon: { fontSize: 18 },
  uploadedText: { fontSize: 13, color: '#2e7d32', flex: 1, fontWeight: '600' },
  uploadRemove: { fontSize: 12, color: '#e53935', fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { fontSize: 13, color: '#999', fontWeight: '600' },

  modeToggle: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 4, marginBottom: 14, marginTop: 4 },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#888' },
  modeBtnTextActive: { color: PRIMARY },

  selAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catalogMeta: { fontSize: 12, color: '#888' },
  selAllBtn: { fontSize: 13, color: PRIMARY, fontWeight: '700' },

  catalogCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 10, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#eee' },
  catalogCardSelected: { borderColor: PRIMARY, backgroundColor: '#f1fff5' },
  catalogImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#f0f0f0' },
  catalogTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  catalogName: { fontSize: 13, fontWeight: '600', color: '#222', flex: 1, marginRight: 6 },
  mrpStrike: { textDecorationLine: 'line-through', color: '#999', fontSize: 11 },

  // Weight chips shown inline in catalog + review
  weightChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  weightChipSmall: { backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  weightChipSmallText: { fontSize: 10, fontWeight: '700', color: '#E65100' },

  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxSel: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkmark: { fontSize: 11, color: '#fff', fontWeight: '700' },

  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeLoose: { backgroundColor: '#fff3e0' },
  badgeLooseText: { color: '#e65100', fontSize: 11, fontWeight: '600' },
  badgePacked: { backgroundColor: '#e3f2fd' },
  badgePackedText: { color: '#1565c0', fontSize: 11, fontWeight: '600' },
  typeBadgeText: { fontSize: 11, fontWeight: '600' },

  cantFindBtn: { borderWidth: 1, borderColor: PRIMARY, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  cantFindText: { color: PRIMARY, fontWeight: '600', fontSize: 13 },
  mapWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
  },
  map: {
    flex: 1,
  },

  productCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eaeaea' },
  productCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  productCardNum: { fontSize: 13, fontWeight: '700', color: '#333' },
  removeBtn: { fontSize: 12, color: '#e53935', fontWeight: '600' },

  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  photoBox: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  photoIcon: { fontSize: 24 },
  photoHint: { fontSize: 12, color: '#888', flex: 1, lineHeight: 18 },
  photoPreviewWrap: { position: 'relative', width: 56, height: 56 },
  photoPreview: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#eee' },
  photoRemoveBtn: { position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#e53935', alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  segmentRow: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 8, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#fff' },
  segBtnText: { fontSize: 12, color: '#888', fontWeight: '600' },
  segBtnTextActive: { color: PRIMARY },

  addRowBtn: { borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  addRowBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },

  csvInput: { height: 160, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 },
  parseBtn: { backgroundColor: PRIMARY, padding: 13, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  parseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  previewBox: { backgroundColor: PRIMARY_LIGHT, borderRadius: 10, padding: 13, marginTop: 12 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 8 },
  previewItem: { fontSize: 13, color: '#333', marginBottom: 4 },
  previewMore: { fontSize: 12, color: '#666', marginTop: 4 },

  inventoryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderWidth: 1, borderColor: '#eaeaea' },
  inventoryLeft: { flex: 1 },
  inventoryName: { fontSize: 15, fontWeight: '700', color: '#222' },
  inventoryMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  inventoryRight: { alignItems: 'flex-end' },
  inventoryMrp: { fontSize: 12, color: '#999', textDecorationLine: 'line-through' },
  inventoryPrice: { fontSize: 15, fontWeight: '800', color: PRIMARY },
  inventoryStock: { fontSize: 12, color: '#666', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, color: '#888', marginTop: 12 },

  goLiveContainer: { alignItems: 'center', paddingTop: 10, marginBottom: 20 },
  goLiveEmoji: { fontSize: 60, marginBottom: 14 },
  goLiveTitle: { fontSize: 24, fontWeight: '800', color: '#222', marginBottom: 6 },
  goLiveSub: { fontSize: 14, color: '#666' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eaeaea', overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  summaryIcon: { fontSize: 22 },
  summaryLabel: { fontSize: 11, color: '#888' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#222', marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 14 },

  bottomBar: { flexDirection: 'row', padding: 14, gap: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  backBtn: { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', justifyContent: 'center' },
  backText: { fontSize: 14, fontWeight: '600', color: '#555' },
  nextBtn: { flex: 1, backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});