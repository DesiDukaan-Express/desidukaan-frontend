import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import useAuthStore from '../../store/authStore';

const PRIMARY = '#1ca049';
const BG = '#f6f6f6';

const STEPS = [
  { id: 1, title: 'Store Details',    icon: '🏪', desc: 'Tell us about your shop' },
  { id: 2, title: 'Bank Details',     icon: '🏦', desc: 'For receiving payments' },
  { id: 3, title: 'Product Catalog',  icon: '📦', desc: 'Add your products' },
  { id: 4, title: 'Inventory',        icon: '📊', desc: 'Set stock & pricing' },
  { id: 5, title: 'Go Live!',         icon: '🚀', desc: 'Start receiving orders' },
];

const CATEGORIES = [
  'Grocery', 'Fruits & Vegetables', 'Dairy', 'Bakery',
  'Meat & Fish', 'Snacks', 'Beverages', 'Household', 'Medicines', 'Other'
];

const SAMPLE_CSV = `name,price,unit,category,stock_qty
Tata Salt 1kg,22,kg,Grocery,100
Amul Milk 500ml,28,litre,Dairy,50
Parle-G Biscuits,10,pack,Snacks,200`;

export default function VendorOnboardingScreen({ onComplete }) {
  const { token, user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Store Details
  const [shopName, setShopName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [shopPhone, setShopPhone] = useState(user?.phone || '');

  // Step 2 - Bank Details
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // Step 3 - Product Catalog
  const [addMode, setAddMode] = useState('manual'); // 'manual' | 'csv'
  const [products, setProducts] = useState([
    { name: '', price: '', unit: 'kg', category: '', stock_qty: '' }
  ]);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);

  // Step 4 - Inventory review (uses products from step 3)

  const toggleCategory = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : prev.length < 10 ? [...prev, cat] : prev
    );
  };

  const addProductRow = () => {
    setProducts(prev => [...prev, { name: '', price: '', unit: 'kg', category: '', stock_qty: '' }]);
  };

  const removeProductRow = (index) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const updateProduct = (index, field, value) => {
    setProducts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const parseCSV = (text) => {
    try {
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');
        return obj;
      }).filter(p => p.name);
      setCsvPreview(parsed);
      if (parsed.length > 0) {
        setProducts(parsed);
        Alert.alert('✅ Parsed', `${parsed.length} products ready to import`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not parse CSV. Check the format.');
    }
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!shopName.trim()) { Alert.alert('Required', 'Enter your shop name'); return false; }
      if (selectedCategories.length === 0) { Alert.alert('Required', 'Select at least one category'); return false; }
      if (!address.trim()) { Alert.alert('Required', 'Enter your shop address'); return false; }
      if (!city.trim()) { Alert.alert('Required', 'Enter your city'); return false; }
      if (pincode.length !== 6) { Alert.alert('Required', 'Enter a valid 6-digit pincode'); return false; }
    }
    if (currentStep === 2) {
      if (!upiId.trim() && !accountNumber.trim()) {
        Alert.alert('Required', 'Enter UPI ID or bank account details'); return false;
      }
    }
    if (currentStep === 3) {
      const valid = products.filter(p => p.name && p.price);
      if (valid.length === 0) {
        Alert.alert('Required', 'Add at least one product'); return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      return;
    }
    return onComplete();
    // Final step — submit everything
    setLoading(true);
    try {
      // 1. Create vendor profile
      const vendorRes = await fetch('http://localhost:3000/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          shop_name: shopName,
          categories: selectedCategories,
          address_line: address,
          city, pincode,
          phone: shopPhone,
          bank_account_name: accountName,
          bank_account_number: accountNumber,
          bank_ifsc: ifsc,
          upi_id: upiId,
        }),
      });
      const vendorData = await vendorRes.json();
      if (!vendorRes.ok) throw new Error(vendorData.msg || 'Failed to create shop');

      // 2. Add products to inventory
      const validProducts = products.filter(p => p.name && p.price);
      for (const product of validProducts) {
        await fetch('http://localhost:3000/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: product.name,
            price: parseFloat(product.price),
            unit: product.unit || 'kg',
            category: product.category,
            stock_qty: parseInt(product.stock_qty) || 0,
          }),
        });
      }

      onComplete();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <View style={styles.container}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🛕</Text>
          <View>
            <Text style={styles.brandName}>DesiDukaan</Text>
            <Text style={styles.brandSub}>Seller Hub</Text>
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
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stepsScroll}
        contentContainerStyle={styles.stepsRow}
      >
        {STEPS.map((step) => (
          <View key={step.id} style={styles.stepPillWrapper}>
            <View style={[
              styles.stepPill,
              currentStep === step.id && styles.stepPillActive,
              currentStep > step.id && styles.stepPillDone,
            ]}>
              <Text style={styles.stepPillIcon}>
                {currentStep > step.id ? '✓' : step.icon}
              </Text>
              <Text style={[
                styles.stepPillText,
                (currentStep === step.id || currentStep > step.id) && styles.stepPillTextActive
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step header */}
          <View style={styles.stepHeader}>
            <Text style={styles.stepIcon}>{STEPS[currentStep - 1].icon}</Text>
            <View>
              <Text style={styles.stepTitle}>{STEPS[currentStep - 1].title}</Text>
              <Text style={styles.stepDesc}>{STEPS[currentStep - 1].desc}</Text>
            </View>
          </View>

          {/* ── STEP 1: Store Details ── */}
          {currentStep === 1 && (
            <View style={styles.form}>
              <Text style={styles.label}>Shop Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sharma Kirana Store"
                value={shopName}
                onChangeText={setShopName}
              />

              <Text style={styles.label}>Categories * (up to 10)</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, selectedCategories.includes(cat) && styles.chipActive]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text style={[styles.chipText, selectedCategories.includes(cat) && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Shop Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Street, Area, Landmark"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput style={styles.input} placeholder="e.g. Noida" value={city} onChangeText={setCity} />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Pincode *</Text>
                  <TextInput
                    style={styles.input} placeholder="6-digit"
                    keyboardType="numeric" maxLength={6}
                    value={pincode} onChangeText={setPincode}
                  />
                </View>
              </View>

              <Text style={styles.label}>Shop Contact Number</Text>
              <TextInput
                style={styles.input} placeholder="Customer-facing number"
                keyboardType="phone-pad" maxLength={10}
                value={shopPhone} onChangeText={setShopPhone}
              />
            </View>
          )}

          {/* ── STEP 2: Bank Details ── */}
          {currentStep === 2 && (
            <View style={styles.form}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 Payments settled within 2 business days after delivery confirmation.
                </Text>
              </View>

              <Text style={styles.sectionLabel}>UPI (Recommended)</Text>
              <TextInput
                style={styles.input} placeholder="yourname@upi"
                value={upiId} onChangeText={setUpiId} autoCapitalize="none"
              />

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR Bank Account</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput style={styles.input} placeholder="As per bank records" value={accountName} onChangeText={setAccountName} />

              <Text style={styles.label}>Account Number</Text>
              <TextInput
                style={styles.input} placeholder="Enter account number"
                keyboardType="numeric" value={accountNumber}
                onChangeText={setAccountNumber} secureTextEntry
              />

              <Text style={styles.label}>IFSC Code</Text>
              <TextInput
                style={styles.input} placeholder="e.g. SBIN0001234"
                autoCapitalize="characters" value={ifsc} onChangeText={setIfsc}
              />
            </View>
          )}

          {/* ── STEP 3: Product Catalog ── */}
          {currentStep === 3 && (
            <View style={styles.form}>

              {/* Mode toggle */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, addMode === 'manual' && styles.modeBtnActive]}
                  onPress={() => setAddMode('manual')}
                >
                  <Text style={[styles.modeBtnText, addMode === 'manual' && styles.modeBtnTextActive]}>
                    ✏️ Add Manually
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, addMode === 'csv' && styles.modeBtnActive]}
                  onPress={() => setAddMode('csv')}
                >
                  <Text style={[styles.modeBtnText, addMode === 'csv' && styles.modeBtnTextActive]}>
                    📂 Bulk CSV Upload
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Manual entry */}
              {addMode === 'manual' && (
                <View>
                  {products.map((product, index) => (
                    <View key={index} style={styles.productRow}>
                      <View style={styles.productRowHeader}>
                        <Text style={styles.productRowNum}>Product {index + 1}</Text>
                        {products.length > 1 && (
                          <TouchableOpacity onPress={() => removeProductRow(index)}>
                            <Text style={styles.removeBtn}>✕ Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <TextInput
                        style={styles.input} placeholder="Product name *"
                        value={product.name}
                        onChangeText={v => updateProduct(index, 'name', v)}
                      />
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={styles.input} placeholder="Price ₹ *"
                            keyboardType="numeric" value={product.price}
                            onChangeText={v => updateProduct(index, 'price', v)}
                          />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={styles.input} placeholder="Unit (kg/litre)"
                            value={product.unit}
                            onChangeText={v => updateProduct(index, 'unit', v)}
                          />
                        </View>
                      </View>
                      <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={styles.input} placeholder="Category"
                            value={product.category}
                            onChangeText={v => updateProduct(index, 'category', v)}
                          />
                        </View>
                        <View style={{ width: 10 }} />
                        <View style={{ flex: 1 }}>
                          <TextInput
                            style={styles.input} placeholder="Stock qty"
                            keyboardType="numeric" value={product.stock_qty}
                            onChangeText={v => updateProduct(index, 'stock_qty', v)}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addRowBtn} onPress={addProductRow}>
                    <Text style={styles.addRowBtnText}>+ Add Another Product</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* CSV upload */}
              {addMode === 'csv' && (
                <View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>📋 Paste your CSV below. Format:</Text>
                    <Text style={[styles.infoText, styles.codeText]}>{SAMPLE_CSV}</Text>
                  </View>

                  <TextInput
                    style={[styles.input, styles.csvInput]}
                    placeholder="Paste CSV data here..."
                    value={csvText}
                    onChangeText={setCsvText}
                    multiline
                    numberOfLines={8}
                  />

                  <TouchableOpacity
                    style={styles.parseBtn}
                    onPress={() => parseCSV(csvText)}
                  >
                    <Text style={styles.parseBtnText}>📥 Parse & Preview</Text>
                  </TouchableOpacity>

                  {csvPreview.length > 0 && (
                    <View style={styles.previewBox}>
                      <Text style={styles.previewTitle}>✅ {csvPreview.length} products ready</Text>
                      {csvPreview.slice(0, 3).map((p, i) => (
                        <Text key={i} style={styles.previewItem}>
                          • {p.name} — ₹{p.price} / {p.unit}
                        </Text>
                      ))}
                      {csvPreview.length > 3 && (
                        <Text style={styles.previewMore}>...and {csvPreview.length - 3} more</Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ── STEP 4: Inventory Review ── */}
          {currentStep === 4 && (
            <View style={styles.form}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  📊 Review your inventory below. You can update stock and pricing anytime from your dashboard.
                </Text>
              </View>

              {products.filter(p => p.name).map((product, index) => (
                <View key={index} style={styles.inventoryCard}>
                  <View style={styles.inventoryLeft}>
                    <Text style={styles.inventoryName}>{product.name}</Text>
                    <Text style={styles.inventoryMeta}>{product.category} · {product.unit}</Text>
                  </View>
                  <View style={styles.inventoryRight}>
                    <Text style={styles.inventoryPrice}>₹{product.price}</Text>
                    <Text style={styles.inventoryStock}>
                      {product.stock_qty > 0 ? `${product.stock_qty} in stock` : 'Out of stock'}
                    </Text>
                  </View>
                </View>
              ))}

              {products.filter(p => p.name).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📦</Text>
                  <Text style={styles.emptyTitle}>No products added</Text>
                  <TouchableOpacity onPress={() => setCurrentStep(3)}>
                    <Text style={{ color: PRIMARY, fontWeight: '700', marginTop: 8 }}>← Go back and add products</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ── STEP 5: Go Live ── */}
          {currentStep === 5 && (
            <View style={styles.goLiveContainer}>
              <Text style={styles.goLiveEmoji}>🎉</Text>
              <Text style={styles.goLiveTitle}>You're almost live!</Text>
              <Text style={styles.goLiveSub}>
                Here's a summary of your setup:
              </Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>🏪</Text>
                  <View>
                    <Text style={styles.summaryLabel}>Shop Name</Text>
                    <Text style={styles.summaryValue}>{shopName || '—'}</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>📍</Text>
                  <View>
                    <Text style={styles.summaryLabel}>Location</Text>
                    <Text style={styles.summaryValue}>{city}, {pincode}</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>🏷️</Text>
                  <View>
                    <Text style={styles.summaryLabel}>Categories</Text>
                    <Text style={styles.summaryValue}>{selectedCategories.join(', ') || '—'}</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>📦</Text>
                  <View>
                    <Text style={styles.summaryLabel}>Products</Text>
                    <Text style={styles.summaryValue}>{products.filter(p => p.name).length} products added</Text>
                  </View>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryIcon}>💰</Text>
                  <View>
                    <Text style={styles.summaryLabel}>Payment</Text>
                    <Text style={styles.summaryValue}>{upiId || (accountNumber ? 'Bank account' : 'Not set')}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.infoBox, { marginTop: 16 }]}>
                <Text style={styles.infoText}>
                  ✅ Your shop will go live immediately after submission. Customers nearby will be able to discover and order from you.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentStep(prev => prev - 1)}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextBtn, loading && { opacity: 0.7 }]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextText}>
                {currentStep === 5 ? '🚀 Submit & Go Live' : 'Save & Continue →'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topBar: {
    backgroundColor: PRIMARY, paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 20, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandEmoji: { fontSize: 28 },
  brandName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  brandSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  stepCount: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: '#c8e6c9' },
  progressFill: { height: 4, backgroundColor: PRIMARY },
  stepsScroll: { backgroundColor: '#fff', maxHeight: 70 },
  stepsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 0,
  },
  stepPillWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f0f0f0',
  },
  stepPillActive: { backgroundColor: '#e8f5e9' },
  stepPillDone: { backgroundColor: PRIMARY },
  stepPillIcon: { fontSize: 14 },
  stepPillText: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  stepPillTextActive: { color: PRIMARY },
  connector: { width: 16, height: 2, backgroundColor: '#e0e0e0', marginHorizontal: 4 },
  connectorDone: { backgroundColor: PRIMARY },
  content: { flex: 1, paddingHorizontal: 20 },
  stepHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 20, marginBottom: 16,
  },
  stepIcon: { fontSize: 36 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#222' },
  stepDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  form: { gap: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 12 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#222', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0',
    borderRadius: 10, padding: 14, fontSize: 15, color: '#333', marginBottom: 8,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#e8f5e9', borderColor: PRIMARY },
  chipText: { fontSize: 13, color: '#555', fontWeight: '500' },
  chipTextActive: { color: PRIMARY, fontWeight: '700' },
  infoBox: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 14, marginBottom: 8, marginTop: 4 },
  infoText: { fontSize: 13, color: '#2e7d32', lineHeight: 20 },
  codeText: { fontFamily: 'monospace', fontSize: 11, marginTop: 6, color: '#1b5e20' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { fontSize: 13, color: '#999', fontWeight: '600' },
  modeToggle: {
    flexDirection: 'row', backgroundColor: '#f0f0f0',
    borderRadius: 12, padding: 4, marginBottom: 16, marginTop: 8,
  },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  modeBtnTextActive: { color: PRIMARY },
  productRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#eaeaea',
  },
  productRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productRowNum: { fontSize: 13, fontWeight: '700', color: '#333' },
  removeBtn: { fontSize: 12, color: '#e53935', fontWeight: '600' },
  addRowBtn: {
    borderWidth: 1.5, borderColor: PRIMARY, borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4,
  },
  addRowBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  csvInput: { height: 160, textAlignVertical: 'top', fontFamily: 'monospace', fontSize: 12 },
  parseBtn: {
    backgroundColor: PRIMARY, padding: 14,
    borderRadius: 10, alignItems: 'center', marginTop: 4,
  },
  parseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  previewBox: {
    backgroundColor: '#e8f5e9', borderRadius: 10,
    padding: 14, marginTop: 12,
  },
  previewTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 8 },
  previewItem: { fontSize: 13, color: '#333', marginBottom: 4 },
  previewMore: { fontSize: 12, color: '#666', marginTop: 4 },
  inventoryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: '#eaeaea',
  },
  inventoryLeft: { flex: 1 },
  inventoryName: { fontSize: 15, fontWeight: '700', color: '#222' },
  inventoryMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  inventoryRight: { alignItems: 'flex-end' },
  inventoryPrice: { fontSize: 15, fontWeight: '800', color: PRIMARY },
  inventoryStock: { fontSize: 12, color: '#666', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, color: '#888', marginTop: 12 },
  goLiveContainer: { alignItems: 'center', paddingTop: 10 },
  goLiveEmoji: { fontSize: 64, marginBottom: 16 },
  goLiveTitle: { fontSize: 26, fontWeight: '800', color: '#222', marginBottom: 8 },
  goLiveSub: { fontSize: 15, color: '#666', marginBottom: 20 },
  summaryCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 4,
    width: '100%', borderWidth: 1, borderColor: '#eaeaea',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  summaryIcon: { fontSize: 24 },
  summaryLabel: { fontSize: 12, color: '#888' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#222', marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 14 },
  bottomBar: {
    flexDirection: 'row', padding: 16, gap: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  backBtn: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', justifyContent: 'center',
  },
  backText: { fontSize: 14, fontWeight: '600', color: '#555' },
  nextBtn: {
    flex: 1, backgroundColor: PRIMARY, paddingVertical: 14,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});