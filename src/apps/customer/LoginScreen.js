import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator
} from 'react-native';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, radius } from '../../styles/spacing';
import { shadows } from '../../styles/shadows';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../services/api';

const ROLES = [
  { key: 'customer', label: 'Customer', emoji: '🛍️', desc: 'Shop from local stores' },
  { key: 'vendor', label: 'Vendor', emoji: '🏪', desc: 'Manage your shop' },
  { key: 'delivery', label: 'Delivery', emoji: '🛵', desc: 'Deliver orders' },
];

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('customer');
  const [needsName, setNeedsName] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    if (phone.length !== 10 || password.length < 6) return;
    setLoading(true);
    try {
      const res = await authAPI.passwordLogin(
        phone,
        password,
        needsName ? name : null,
        selectedRole
      );
      await login(res.user, res.token);
    } catch (err) {
      if (err.needsRegistration) {
        // First time user — ask for name
        setNeedsName(true);
      } else {
        Alert.alert('Error', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = () => {
    if (phone.length !== 10 || password.length < 6 || loading) return true;
    if (needsName && name.trim().length < 2) return true;
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Hero */}
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

          <Text style={styles.cardTitle}>
            {needsName ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {needsName
              ? 'Enter your name to complete registration'
              : 'Enter your phone and password to continue'
            }
          </Text>

          {/* Name input — only shown for new users */}
          {needsName && (
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          )}

          {/* Phone input */}
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.prefix}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                if (needsName) setNeedsName(false); // reset if they change number
              }}
            />
          </View>

          {/* Password input */}
          <TextInput
            style={styles.input}
            placeholder={needsName ? 'Create a password (min 6 chars)' : 'Enter your password'}
            placeholderTextColor={colors.textLight}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.btn, isButtonDisabled() && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isButtonDisabled()}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.btnText}>
                  {needsName ? 'Create Account & Continue →' : 'Login →'}
                </Text>
            }
          </TouchableOpacity>

          {/* Helper text */}
          {!needsName && (
            <Text style={styles.helperText}>
              New here? Just login — we'll create your account automatically.
            </Text>
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
  container: { flex: 1, backgroundColor: colors.primary },
  inner: { flex: 1, justifyContent: 'center', padding: spacing.xl },
  heroSection: { alignItems: 'center', marginBottom: spacing.xxl },
  logoWrapper: {
    width: 72, height: 72, borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  logoEmoji: { fontSize: 36 },
  logoText: {
    fontSize: typography.xxl, fontWeight: typography.extrabold,
    color: colors.textInverse, letterSpacing: -0.5,
  },
  tagline: { fontSize: typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
  rolesContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  roleCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg, padding: spacing.md,
    alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent',
  },
  roleCardActive: { backgroundColor: colors.surface, borderColor: colors.accent },
  roleEmoji: { fontSize: 22, marginBottom: 4 },
  roleLabel: {
    fontSize: typography.sm, fontWeight: typography.bold,
    color: 'rgba(255,255,255,0.8)',
  },
  roleLabelActive: { color: colors.primary },
  roleDesc: { fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 2 },
  roleDescActive: { color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xxl, ...shadows.lg,
  },
  cardTitle: {
    fontSize: typography.lg, fontWeight: typography.bold,
    color: colors.text, marginBottom: spacing.xs,
  },
  cardSubtitle: { fontSize: typography.sm, color: colors.textLight, marginBottom: spacing.xl },
  phoneRow: {
    flexDirection: 'row', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  prefixBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, borderRightWidth: 1.5,
    borderRightColor: colors.border, gap: 6,
  },
  flag: { fontSize: 18 },
  prefix: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  phoneInput: {
    flex: 1, fontSize: typography.base,
    paddingHorizontal: spacing.md, paddingVertical: spacing.lg, color: colors.text,
  },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
    fontSize: typography.base, padding: spacing.lg,
    marginBottom: spacing.lg, backgroundColor: colors.background, color: colors.text,
  },
  btn: {
    backgroundColor: colors.primary, padding: spacing.lg,
    borderRadius: radius.md, alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.border },
  btnText: { color: colors.textInverse, fontWeight: typography.bold, fontSize: typography.base },
  helperText: {
    fontSize: typography.xs, color: colors.textLight,
    textAlign: 'center', marginTop: spacing.md,
  },
  termsText: {
    textAlign: 'center', color: 'rgba(255,255,255,0.45)',
    fontSize: 11, marginTop: spacing.xl, lineHeight: 16,
  },
});