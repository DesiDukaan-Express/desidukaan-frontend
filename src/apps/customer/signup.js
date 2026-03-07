import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';

const { width } = Dimensions.get('window');

const ROLES = [
  { key: 'customer', label: 'Customer', icon: 'shopping-bag' },
  { key: 'vendor', label: 'Vendor', icon: 'home' },
  { key: 'delivery', label: 'Delivery', icon: 'truck' },
];

const GENDERS = [
  { key: 'male', label: 'Male', icon: '👨' },
  { key: 'female', label: 'Female', icon: '👩' },
  { key: 'other', label: 'Other', icon: '🧑' },
];

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [selectedRole, setSelectedRole] = useState('customer');
  const [focusedField, setFocusedField] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const register = useAuthStore((state) => state.register);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(formAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const ageNum = parseInt(age, 10);
  const isAgeValid = age.length > 0 && !isNaN(ageNum) && ageNum >= 16 && ageNum <= 100;
  const isAgeError = age.length > 0 && !isAgeValid;

  const isValid =
    name.trim().length >= 2 &&
    mobile.length === 10 &&
    address.trim().length >= 5 &&
    isAgeValid &&
    gender !== '' &&
    agreed;

  const handleSignup = () => {
    if (isValid) {
      register(
        {
          id: Date.now().toString(),
          name: name.trim(),
          mobile,
          address: address.trim(),
          age: ageNum,
          gender,
          role: selectedRole,
        },
        'mock-jwt-token'
      );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={['#FFFFFF', '#F0FDF4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand */}
            <Animated.View
              style={[styles.topSection, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}
            >
              <View style={styles.logoMark}>
                <Feather name="shopping-cart" size={22} color="#16A34A" />
              </View>
              <Text style={styles.brandName}>desi dukaan</Text>
              <Text style={styles.brandTagline}>your neighbourhood, delivered</Text>
            </Animated.View>

            {/* Form card */}
            <Animated.View
              style={[styles.formCard, { opacity: formOpacity, transform: [{ translateY: formAnim }] }]}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardAccentStrip}
              />

              <Text style={styles.formHeading}>Create account</Text>
              <Text style={styles.formSubheading}>Tell us a little about yourself</Text>

              {/* Role selector */}
              <View style={styles.roleContainer}>
                {ROLES.map((role) => {
                  const active = selectedRole === role.key;
                  return (
                    <TouchableOpacity
                      key={role.key}
                      style={[styles.roleTab, active && styles.roleTabActive]}
                      onPress={() => setSelectedRole(role.key)}
                      activeOpacity={0.7}
                    >
                      <Feather name={role.icon} size={13} color={active ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={[styles.inputBox, focusedField === 'name' && styles.inputBoxFocused]}>
                  <View style={styles.inputIconWrap}>
                    <Feather name="user" size={15} color={focusedField === 'name' ? '#16A34A' : '#9CA3AF'} />
                  </View>
                  <TextInput
                    placeholder="Your full name"
                    placeholderTextColor="#A3C4A8"
                    autoCapitalize="words"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    style={styles.fieldInput}
                  />
                  {name.trim().length >= 2 && (
                    <Feather name="check-circle" size={15} color="#16A34A" style={{ marginRight: 14 }} />
                  )}
                </View>
              </View>

              {/* Mobile Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={[styles.inputBox, focusedField === 'mobile' && styles.inputBoxFocused]}>
                  <View style={styles.inputIconWrap}>
                    <Feather name="smartphone" size={15} color={focusedField === 'mobile' ? '#16A34A' : '#9CA3AF'} />
                  </View>
                  <View style={styles.prefixWrap}>
                    <Text style={styles.prefixText}>🇮🇳 +91</Text>
                    <View style={styles.prefixDivider} />
                  </View>
                  <TextInput
                    placeholder="10-digit number"
                    placeholderTextColor="#A3C4A8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={mobile}
                    onChangeText={setMobile}
                    onFocus={() => setFocusedField('mobile')}
                    onBlur={() => setFocusedField(null)}
                    style={styles.fieldInput}
                  />
                  {mobile.length === 10 && (
                    <Feather name="check-circle" size={15} color="#16A34A" style={{ marginRight: 14 }} />
                  )}
                </View>
              </View>

              {/* Delivery Address */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Delivery Address</Text>
                <View style={[
                  styles.inputBox,
                  styles.inputBoxMultiline,
                  focusedField === 'address' && styles.inputBoxFocused,
                ]}>
                  <View style={[styles.inputIconWrap, { alignSelf: 'flex-start', paddingTop: 16 }]}>
                    <Feather name="map-pin" size={15} color={focusedField === 'address' ? '#16A34A' : '#9CA3AF'} />
                  </View>
                  <TextInput
                    placeholder="House no., street, area, city"
                    placeholderTextColor="#A3C4A8"
                    autoCapitalize="sentences"
                    multiline
                    numberOfLines={3}
                    value={address}
                    onChangeText={setAddress}
                    onFocus={() => setFocusedField('address')}
                    onBlur={() => setFocusedField(null)}
                    style={[styles.fieldInput, styles.fieldInputMultiline]}
                  />
                </View>
              </View>

              {/* Age + Gender side by side */}
              <View style={styles.rowFields}>
                {/* Age */}
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <View style={[
                    styles.inputBox,
                    focusedField === 'age' && styles.inputBoxFocused,
                    isAgeError && styles.inputBoxError,
                  ]}>
                    <View style={styles.inputIconWrap}>
                      <Feather
                        name="calendar"
                        size={15}
                        color={isAgeError ? '#EF4444' : focusedField === 'age' ? '#16A34A' : '#9CA3AF'}
                      />
                    </View>
                    <TextInput
                      placeholder="e.g. 24"
                      placeholderTextColor="#A3C4A8"
                      keyboardType="number-pad"
                      maxLength={3}
                      value={age}
                      onChangeText={setAge}
                      onFocus={() => setFocusedField('age')}
                      onBlur={() => setFocusedField(null)}
                      style={styles.fieldInput}
                    />
                  </View>
                  {isAgeError && (
                    <Text style={styles.fieldError}>Must be 16–100</Text>
                  )}
                </View>

                {/* Gender label — sits above the chips */}
                <View style={[styles.fieldGroup, { flex: 1.6 }]}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.genderRow}>
                    {GENDERS.map((g) => {
                      const active = gender === g.key;
                      return (
                        <TouchableOpacity
                          key={g.key}
                          style={[styles.genderChip, active && styles.genderChipActive]}
                          onPress={() => setGender(g.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.genderEmoji}>{g.icon}</Text>
                          <Text style={[styles.genderText, active && styles.genderTextActive]}>
                            {g.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Terms checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
                  {agreed && <Feather name="check" size={11} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the{' '}
                  <Text style={styles.checkboxLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.checkboxLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* CTA */}
              <TouchableOpacity
                style={[styles.cta, !isValid && styles.ctaDisabled]}
                disabled={!isValid}
                onPress={handleSignup}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={isValid ? ['#22C55E', '#15803D'] : ['#D1FAE5', '#D1FAE5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaInner}
                >
                  <Text style={[styles.ctaText, !isValid && styles.ctaTextOff]}>
                    Create Account
                  </Text>
                  <View style={[styles.ctaArrow, !isValid && styles.ctaArrowOff]}>
                    <Feather name="arrow-right" size={15} color={isValid ? '#052E16' : '#6EE7B7'} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>

              {/* Login link */}
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => navigation?.navigate('Login')}
              >
                <Text style={styles.loginText}>
                  Already have an account?{' '}
                  <Text style={styles.loginLink}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.legal}>
              By creating an account you agree to our{' '}
              <Text style={styles.legalLink}>Terms</Text> &{' '}
              <Text style={styles.legalLink}>Privacy</Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 24,
    flexGrow: 1,
  },

  // Brand
  topSection: { alignItems: 'center', marginBottom: 28 },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#14532D',
    letterSpacing: -1.5,
  },
  brandTagline: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // Card
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardAccentStrip: { height: 4, marginBottom: 22 },
  formHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  formSubheading: { fontSize: 13, color: '#6B7280', marginBottom: 20 },

  // Role tabs
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  roleTabActive: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  roleTabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  roleTabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Fields
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  fieldError: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 5,
  },

  // Row layout for Age + Gender
  rowFields: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },

  // Green-tinted input boxes
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    minHeight: 56,
  },
  inputBoxMultiline: {
    alignItems: 'flex-start',
    minHeight: 90,
  },
  inputBoxFocused: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  inputBoxError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
  },
  inputIconWrap: { width: 48, alignItems: 'center', justifyContent: 'center' },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 16,
    paddingRight: 14,
    fontWeight: '500',
  },
  fieldInputMultiline: {
    paddingTop: 16,
    paddingBottom: 14,
    textAlignVertical: 'top',
  },

  // Mobile prefix
  prefixWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  prefixText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  prefixDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#BBF7D0',
    marginLeft: 10,
  },

  // Gender chips
  genderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  genderChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    gap: 3,
  },
  genderChipActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  genderEmoji: { fontSize: 16 },
  genderText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  genderTextActive: { color: '#FFFFFF', fontWeight: '700' },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    marginTop: 4,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  checkboxText: { fontSize: 13, color: '#6B7280', flex: 1, lineHeight: 20 },
  checkboxLink: { color: '#16A34A', fontWeight: '700' },

  // CTA
  cta: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  ctaDisabled: { opacity: 1 },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 17,
    paddingHorizontal: 24,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  ctaTextOff: { color: '#6EE7B7' },
  ctaArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowOff: { backgroundColor: 'rgba(22,163,74,0.15)' },

  // Or
  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  // Login link
  loginBtn: { alignItems: 'center' },
  loginText: { fontSize: 13, color: '#6B7280' },
  loginLink: { color: '#16A34A', fontWeight: '800' },

  // Legal
  legal: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 20, marginBottom: 10 },
  legalLink: { color: '#6B7280', fontWeight: '600' },
});
