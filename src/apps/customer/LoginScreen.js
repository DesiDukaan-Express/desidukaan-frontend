import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Animated, Dimensions, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import Signup from './signup'

const { width } = Dimensions.get('window');

const ROLES = [
  { key: 'customer', label: 'Customer', icon: 'shopping-bag' },
  { key: 'vendor', label: 'Vendor', icon: 'home' },
  { key: 'delivery', label: 'Delivery', icon: 'truck' },
];

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile');
  const [selectedRole, setSelectedRole] = useState('customer');
  const [focusedField, setFocusedField] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const login = useAuthStore((state) => state.login);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.spring(formAnim, {
            toValue: 0,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  const animateStep = (callback) => {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  const handleSendOtp = () => {
    if (mobile.length === 10) {
      animateStep(() => {
        setStep('otp');
        setOtp('');
        setResendTimer(30);
      });
    }
  };

  const handleVerifyOtp = () => {
    if (otp.length === 6) {
      login(
        { id: '1', name: 'Test User', mobile, role: selectedRole },
        'mock-jwt-token'
      );
    }
  };

  const handleResend = () => {
    if (resendTimer === 0) {
      setOtp('');
      setResendTimer(30);
    }
  };

  const handleBack = () => {
    animateStep(() => {
      setStep('mobile');
      setOtp('');
    });
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
          {/* Brand */}
          <Animated.View
            style={[
              styles.topSection,
              { opacity: logoAnim, transform: [{ scale: logoAnim }] },
            ]}
          >
            <View style={styles.logoMark}>
              <Feather name="shopping-cart" size={22} color="#16A34A" />
            </View>
            <Text style={styles.brandName}>desi dukaan</Text>
            <Text style={styles.brandTagline}>your neighbourhood, delivered</Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View
            style={[
              styles.formCard,
              { opacity: formOpacity, transform: [{ translateY: formAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#22C55E', '#16A34A', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardAccentStrip}
            />

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
                    <Feather
                      name={role.icon}
                      size={13}
                      color={active ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Animated.View style={{ transform: [{ translateY: stepAnim }] }}>

              {step === 'mobile' ? (
                <>
                  <Text style={styles.formHeading}>Sign in</Text>
                  <Text style={styles.formSubheading}>
                    Enter your mobile number to continue
                  </Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Mobile Number</Text>
                    <View style={[
                      styles.inputBox,
                      focusedField === 'mobile' && styles.inputBoxFocused,
                    ]}>
                      <View style={styles.inputIconWrap}>
                        <Feather
                          name="smartphone"
                          size={15}
                          color={focusedField === 'mobile' ? '#16A34A' : '#9CA3AF'}
                        />
                      </View>
                      <View style={styles.prefixWrap}>
                        <Text style={styles.prefixText}>+91</Text>
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
                        <Feather
                          name="check-circle"
                          size={15}
                          color="#16A34A"
                          style={{ marginRight: 14 }}
                        />
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.cta, mobile.length !== 10 && styles.ctaDisabled]}
                    disabled={mobile.length !== 10}
                    onPress={handleSendOtp}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={mobile.length === 10 ? ['#22C55E', '#15803D'] : ['#D1FAE5', '#D1FAE5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ctaInner}
                    >
                      <Text style={[styles.ctaText, mobile.length !== 10 && styles.ctaTextOff]}>
                        Send OTP
                      </Text>
                      <View style={[styles.ctaArrow, mobile.length !== 10 && styles.ctaArrowOff]}>
                        <Feather
                          name="arrow-right"
                          size={15}
                          color={mobile.length === 10 ? '#052E16' : '#6EE7B7'}
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.otpHeaderRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                      <Feather name="arrow-left" size={16} color="#374151" />
                    </TouchableOpacity>
                    <View>
                      <Text style={styles.formHeading}>Enter OTP</Text>
                      <Text style={styles.formSubheading}>Sent to +91 {mobile}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>One-Time Password</Text>
                    <View style={[
                      styles.inputBox,
                      focusedField === 'otp' && styles.inputBoxFocused,
                    ]}>
                      <View style={styles.inputIconWrap}>
                        <Feather
                          name="lock"
                          size={15}
                          color={focusedField === 'otp' ? '#16A34A' : '#9CA3AF'}
                        />
                      </View>
                      <TextInput
                        placeholder="6-digit code"
                        placeholderTextColor="#A3C4A8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={setOtp}
                        onFocus={() => setFocusedField('otp')}
                        onBlur={() => setFocusedField(null)}
                        style={[styles.fieldInput, otp.length > 0 && styles.otpInput]}
                      />
                      {otp.length === 6 && (
                        <Feather
                          name="check-circle"
                          size={15}
                          color="#16A34A"
                          style={{ marginRight: 14 }}
                        />
                      )}
                    </View>

                    <View style={styles.otpDots}>
                      {[...Array(6)].map((_, i) => (
                        <View
                          key={i}
                          style={[styles.otpDot, i < otp.length && styles.otpDotFilled]}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.resendRow}>
                    <Text style={styles.resendText}>Didn't receive it? </Text>
                    <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
                      <Text style={[
                        styles.resendLink,
                        resendTimer > 0 && styles.resendLinkDisabled,
                      ]}>
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.cta, otp.length !== 6 && styles.ctaDisabled]}
                    disabled={otp.length !== 6}
                    onPress={handleVerifyOtp}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={otp.length === 6 ? ['#22C55E', '#15803D'] : ['#D1FAE5', '#D1FAE5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.ctaInner}
                    >
                      <Text style={[styles.ctaText, otp.length !== 6 && styles.ctaTextOff]}>
                        Verify & Sign In
                      </Text>
                      <View style={[styles.ctaArrow, otp.length !== 6 && styles.ctaArrowOff]}>
                        <Feather
                          name="arrow-right"
                          size={15}
                          color={otp.length === 6 ? '#052E16' : '#6EE7B7'}
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

            </Animated.View>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={() => navigation && navigation.navigate('Signup')}
            >
              <Text style={styles.registerText}>
                New here?{' '}
                <Text style={styles.registerLink}>Create an account</Text>
                {/* <Link to="/signup">Create Account</Link> */}
              </Text>
            </TouchableOpacity>

          </Animated.View>

          <Text style={styles.legal}>
            By signing in you agree to our{' '}
            <Text style={styles.legalLink}>Terms</Text>
            {' '}&{' '}
            <Text style={styles.legalLink}>Privacy</Text>
          </Text>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  kav: { flex: 1, paddingHorizontal: 22, justifyContent: 'center' },

  topSection: { alignItems: 'center', marginBottom: 36 },
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
  brandName: { fontSize: 32, fontWeight: '900', color: '#14532D', letterSpacing: -1.5 },
  brandTagline: { fontSize: 13, color: '#6B7280', marginTop: 4, letterSpacing: 0.2 },

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
  cardAccentStrip: { height: 4, marginBottom: 20 },
  formHeading: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 4 },
  formSubheading: { fontSize: 13, color: '#6B7280', marginBottom: 20 },

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
  },
  roleTabActive: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  roleTabText: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 5 },
  roleTabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8, letterSpacing: 0.3 },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    minHeight: 56,
  },
  inputBoxFocused: { borderColor: '#16A34A', backgroundColor: '#DCFCE7' },
  inputIconWrap: { width: 48, alignItems: 'center', justifyContent: 'center' },
  fieldInput: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 16, paddingRight: 14, fontWeight: '500' },
  otpInput: { letterSpacing: 8, fontSize: 18, fontWeight: '700' },

  prefixWrap: { flexDirection: 'row', alignItems: 'center', paddingRight: 10 },
  prefixText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  prefixDivider: { width: 1, height: 20, backgroundColor: '#BBF7D0', marginLeft: 10 },

  otpDots: { flexDirection: 'row', marginTop: 10, justifyContent: 'center' },
  otpDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1FAE5', marginHorizontal: 4 },
  otpDotFilled: { backgroundColor: '#16A34A' },

  otpHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18, marginTop: -4 },
  resendText: { fontSize: 13, color: '#6B7280' },
  resendLink: { fontSize: 13, color: '#16A34A', fontWeight: '700' },
  resendLinkDisabled: { color: '#9CA3AF' },

  cta: { borderRadius: 16, overflow: 'hidden', marginTop: 4, marginBottom: 20 },
  ctaDisabled: { opacity: 1 },
  ctaInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 17, paddingHorizontal: 24 },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  ctaTextOff: { color: '#6EE7B7' },
  ctaArrow: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  ctaArrowOff: { backgroundColor: 'rgba(22,163,74,0.15)' },

  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  orLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginHorizontal: 12 },

  registerBtn: { alignItems: 'center' },
  registerText: { fontSize: 13, color: '#6B7280' },
  registerLink: { color: '#16A34A', fontWeight: '800' },

  legal: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 20 },
  legalLink: { color: '#6B7280', fontWeight: '600' },
});
