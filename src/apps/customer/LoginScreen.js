import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, Dimensions
} from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, radius } from '../../styles/spacing';
import { shadows } from '../../styles/shadows';
import useAuthStore from '../../store/authStore';

const { width } = Dimensions.get('window');

const ROLES = [
  { key: 'customer', label: 'Customer', emoji: '🛍️', desc: 'Shop from local stores' },
  { key: 'vendor', label: 'Vendor', emoji: '🏪', desc: 'Manage your shop' },
  { key: 'delivery', label: 'Delivery', emoji: '🛵', desc: 'Deliver orders' },
];

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [selectedRole, setSelectedRole] = useState('customer');
  const login = useAuthStore((state) => state.login);

  const handleSendOtp = () => { if (phone.length === 10) setStep('otp'); };
  const handleVerifyOtp = () => {
    if (otp.length === 6) {
      login({ id: '1', name: 'Test', phone, role: selectedRole }, 'mock-jwt-token');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>

        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <Text style={styles.logoEmoji}>🛕</Text>
          </View>
          <Text style={styles.logoText}>DesiDukaan</Text>
          <Text style={styles.tagline}>Your neighbourhood, delivered.</Text>
        </View>

        {/* Role Selector */}
        <View style={styles.rolesContainer}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.key}
              style={[styles.roleCard, selectedRole === role.key && styles.roleCardActive]}
              onPress={() => setSelectedRole(role.key)}
            >
              <Text style={styles.roleEmoji}>{role.emoji}</Text>
              <Text style={[styles.roleLabel, selectedRole === role.key && styles.roleLabelActive]}>
                {role.label}
              </Text>
              <Text style={[styles.roleDesc, selectedRole === role.key && styles.roleDescActive]}>
                {role.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.cardTitle}>Enter mobile number</Text>
              <Text style={styles.cardSubtitle}>We'll send you a verification code</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={styles.prefix}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
              <TouchableOpacity
                style={[styles.btn, phone.length !== 10 && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={phone.length !== 10}
              >
                <Text style={styles.btnText}>Send OTP →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>Verify your number</Text>
              <Text style={styles.cardSubtitle}>OTP sent to +91 {phone}</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
              <TouchableOpacity
                style={[styles.btn, otp.length !== 6 && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={otp.length !== 6}
              >
                <Text style={styles.btnText}>Verify & Continue →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backRow} onPress={() => setStep('phone')}>
                <Text style={styles.backText}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoEmoji: { fontSize: 36 },
  logoText: {
    fontSize: typography.xxl,
    fontWeight: typography.extrabold,
    color: colors.textInverse,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: spacing.xs,
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  roleCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleCardActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  roleEmoji: { fontSize: 22, marginBottom: 4 },
  roleLabel: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: 'rgba(255,255,255,0.8)',
  },
  roleLabelActive: { color: colors.primary },
  roleDesc: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 2,
  },
  roleDescActive: { color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    ...shadows.lg,
  },
  cardTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    color: colors.textLight,
    marginBottom: spacing.xl,
  },
  phoneRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
  },
  prefixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
    gap: 6,
  },
  flag: { fontSize: 18 },
  prefix: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    fontSize: typography.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    color: colors.text,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 28,
    fontWeight: typography.bold,
    padding: spacing.lg,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    color: colors.primary,
  },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnDisabled: {
    backgroundColor: colors.border,
  },
  btnText: {
    color: colors.textInverse,
    fontWeight: typography.bold,
    fontSize: typography.base,
  },
  backRow: { alignItems: 'center', marginTop: spacing.lg },
  backText: { color: colors.secondary, fontSize: typography.sm },
  termsText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: spacing.xl,
    lineHeight: 16,
  },
});