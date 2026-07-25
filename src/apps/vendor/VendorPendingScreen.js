import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Platform, StatusBar, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import AccountManagerModal from '../../components/common/AccountManagerModal';

const C = {
  green:      '#1A9E3F',
  greenDark:  '#147832',
  greenDeep:  '#0a4d22',
  greenLight: '#E6F4EB',
  amber:      '#F59E0B',
  amberLight: '#FFFBEB',
  amberBorder:'#FCD34D',
  bg:         '#F7F9F7',
  white:      '#FFFFFF',
  border:     '#E2E8E2',
  text:       '#111827',
  textMed:    '#374151',
  textLight:  '#6B7280',
  textXLight: '#9CA3AF',
};

const STATUS_STEPS = [
  { icon: '📋', label: 'Application Submitted',  sub: 'Your vendor profile has been received.',       done: true  },
  { icon: '🔍', label: 'Documents Under Review',  sub: 'Our team reviews within 24–48 hrs (Mon–Sat).', done: false },
  { icon: '✅', label: 'Account Approved',         sub: "You'll get an SMS when you're approved.",       done: false },
];

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function VendorPendingScreen({ onRefresh, refreshing }) {
  const user   = useAuthStore((s) => s.user);
  const token  = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const name   = user?.name || 'Vendor';

  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [hasOtherProfiles, setHasOtherProfiles] = useState(false);

  // Check if user has other profiles to switch to (customer / delivery)
  useEffect(() => {
    const checkProfiles = async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/profiles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          const others = (data.profiles || []).filter(
            (p) => p.role !== (user?.role || 'vendor')
          );
          setHasOtherProfiles(others.length > 0);
        }
      } catch (_) {
        // silently fail — don't show switcher if we can't check
      }
    };
    checkProfiles();
  }, [token]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.greenDeep} />

      {/* Account Switcher Modal — only renders if has other profiles */}
      {hasOtherProfiles && (
        <AccountManagerModal
          visible={accountModalVisible}
          onClose={() => setAccountModalVisible(false)}
        />
      )}

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#0a4d22', '#147832', '#1A9E3F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        {/* Top nav row: Account switcher button (only if other profiles exist) + pending badge */}
        <View style={s.heroNav}>
          {/* Account switcher — only visible when user has other profiles to switch to */}
          {hasOtherProfiles ? (
            <TouchableOpacity
              style={s.switcherBtn}
              onPress={() => setAccountModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="account-circle" size={28} color="#fff" />
              <View style={s.switcherBadge}>
                <Text style={s.switcherBadgeTxt}>Switch</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 70 }} />
          )}

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.heroEyebrow}>VENDOR ACCOUNT</Text>
            <Text style={s.heroNavTitle}>Verification Status</Text>
          </View>

          {/* Pending badge */}
          <View style={s.heroBadge}>
            <View style={s.badgeDot} />
            <Text style={s.heroBadgeTxt}>PENDING</Text>
          </View>
        </View>

        {/* User info row */}
        <View style={s.heroUser}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarTxt}>{name.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.heroTitle}>Hi, {name.split(' ')[0]} 👋</Text>
            <Text style={s.heroSub}>Your vendor application is under review</Text>
          </View>
        </View>

        {/* Wave bottom */}
        <View style={s.heroWave} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── MAIN CARD ────────────────────────────────────────── */}
        <View style={s.mainCard}>
          <Text style={s.mainIcon}>🎉</Text>
          <Text style={s.mainTitle}>Application Received!</Text>
          <Text style={s.mainBody}>
            Thank you for registering with <Text style={s.bold}>KwikPik</Text>.
            {'\n\n'}Your documents are being reviewed by our team.
            Once verified, you'll receive an <Text style={s.bold}>SMS & email</Text> confirming
            your account activation — usually within <Text style={s.bold}>24–48 hours</Text>.
          </Text>

          {/* Estimated time chip */}
          <View style={s.timeChip}>
            <MaterialIcons name="schedule" size={14} color={C.amber} />
            <Text style={s.timeChipTxt}>Est. approval: 24–48 hours</Text>
          </View>
        </View>

        {/* ── STATUS TRACKER ───────────────────────────────────── */}
        <View style={s.trackerCard}>
          <Text style={s.trackerTitle}>Application Progress</Text>
          {STATUS_STEPS.map((step, i) => (
            <View key={i} style={s.stepRow}>
              {/* Left: dot + line */}
              <View style={s.stepLeft}>
                <View style={[s.stepDot, step.done && s.stepDotDone]}>
                  {step.done ? (
                    <MaterialIcons name="check" size={14} color="#fff" />
                  ) : (
                    <Text style={s.stepNum}>{i + 1}</Text>
                  )}
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[s.stepLine, step.done && s.stepLineDone]} />
                )}
              </View>

              {/* Right: content */}
              <View style={s.stepContent}>
                <Text style={s.stepIcon}>{step.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.stepLabel, step.done && { color: C.green }]}>
                    {step.label}
                  </Text>
                  <Text style={s.stepSub}>{step.sub}</Text>
                </View>
                {step.done && (
                  <View style={s.stepDoneBadge}>
                    <Text style={s.stepDoneTxt}>Done</Text>
                  </View>
                )}
                {i === 1 && !step.done && (
                  <View style={s.stepPendingBadge}>
                    <Text style={s.stepPendingTxt}>In Progress</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── WHILE YOU WAIT — browse as customer only if profile exists ─ */}
        <View style={s.whileCard}>
          <Text style={s.whileTitle}>While you wait…</Text>
          {[
            hasOtherProfiles
              ? { icon: 'shopping-bag', text: 'Browse the app as a Customer', action: () => setAccountModalVisible(true) }
              : null,
            { icon: 'notifications-none', text: 'Check for approval SMS / email', action: null },
            { icon: 'support-agent', text: 'Contact support if needed', action: null },
          ].filter(Boolean).map((item, i) => (
            <TouchableOpacity
              key={i}
              style={s.whileRow}
              onPress={item.action || undefined}
              activeOpacity={item.action ? 0.7 : 1}
            >
              <View style={s.whileIconWrap}>
                <MaterialIcons name={item.icon} size={20} color={C.green} />
              </View>
              <Text style={[s.whileTxt, item.action && { color: C.green, fontWeight: '700' }]}>
                {item.text}
              </Text>
              {item.action && (
                <MaterialIcons name="chevron-right" size={18} color={C.green} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── CONTACT PILLS ────────────────────────────────────── */}
        <View style={s.pillRow}>
          {[
            { icon: 'call', text: '1800-XXX-XXXX' },
            { icon: 'email', text: 'support@kwikpik.in' },
          ].map((p, i) => (
            <View key={i} style={s.pill}>
              <MaterialIcons name={p.icon} size={18} color={C.green} />
              <Text style={s.pillTxt}>{p.text}</Text>
            </View>
          ))}
        </View>

        {/* ── CHECK STATUS BUTTON ─────────────────────────────── */}
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
          {refreshing ? (
            <ActivityIndicator color={C.greenDark} size="small" />
          ) : (
            <>
              <MaterialIcons name="refresh" size={18} color={C.greenDark} />
              <Text style={s.refreshTxt}>Check Approval Status</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── SWITCH ACCOUNT BUTTON — only if other profiles exist ────── */}
        {hasOtherProfiles && (
          <TouchableOpacity
            style={s.switchBtn}
            onPress={() => setAccountModalVisible(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="swap-horiz" size={18} color={C.greenDark} />
            <Text style={s.switchBtnTxt}>Switch to Another Account</Text>
          </TouchableOpacity>
        )}

        {/* ── LOGOUT ───────────────────────────────────────────── */}
        <TouchableOpacity onPress={logout} activeOpacity={0.7} style={s.logoutBtn}>
          <Text style={s.logoutTxt}>Sign out of all accounts</Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  heroNav: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  switcherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 8,
  },
  switcherBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  switcherBadgeTxt: { fontSize: 9, color: '#fff', fontWeight: '700' },
  heroEyebrow: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 1.5 },
  heroNavTitle: { fontSize: 13, color: '#fff', fontWeight: '700' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(255,200,0,0.18)', borderWidth: 1, borderColor: 'rgba(255,200,0,0.35)',
  },
  badgeDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FCD34D' },
  heroBadgeTxt:{ fontSize: 10, color: '#FDE68A', fontWeight: '800', letterSpacing: 1.2 },

  heroUser: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarTxt:   { fontSize: 15, fontWeight: '900', color: '#fff' },
  heroTitle:   { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroSub:     { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  heroWave:    { height: 22, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginHorizontal: -20, marginBottom: -1 },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  mainCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: '#E8F0E8',
    shadowColor: '#147832', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09, shadowRadius: 14, elevation: 5,
  },
  mainIcon:  { fontSize: 48, marginBottom: 12 },
  mainTitle: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 10, letterSpacing: -0.4 },
  mainBody:  { fontSize: 14, color: C.textMed, lineHeight: 22, textAlign: 'center', marginBottom: 14 },
  bold:      { fontWeight: '800', color: C.text },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.amberLight, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: C.amberBorder,
  },
  timeChipTxt: { fontSize: 13, fontWeight: '700', color: '#92400E' },

  trackerCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: '#E8F0E8',
    shadowColor: '#147832', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  trackerTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 20, letterSpacing: -0.2 },
  stepRow:      { flexDirection: 'row', marginBottom: 4 },
  stepLeft:     { alignItems: 'center', width: 34, marginRight: 12 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone:  { backgroundColor: C.green, borderColor: C.green },
  stepNum:      { fontSize: 12, fontWeight: '900', color: C.textLight },
  stepLine:     { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 3, minHeight: 24 },
  stepLineDone: { backgroundColor: C.green },
  stepContent:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, paddingBottom: 20 },
  stepIcon:     { fontSize: 20, marginTop: 4 },
  stepLabel:    { fontSize: 14, fontWeight: '700', color: C.textMed },
  stepSub:      { fontSize: 11, color: C.textXLight, marginTop: 3, lineHeight: 16 },
  stepDoneBadge:{ backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' },
  stepDoneTxt:  { fontSize: 10, fontWeight: '700', color: C.green },
  stepPendingBadge: { backgroundColor: C.amberLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 'auto' },
  stepPendingTxt: { fontSize: 10, fontWeight: '700', color: '#92400E' },

  whileCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: '#E8F0E8',
    shadowColor: '#147832', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  whileTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 14 },
  whileRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  whileIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center' },
  whileTxt:   { flex: 1, fontSize: 14, color: C.textMed, fontWeight: '600' },

  pillRow: { gap: 10, marginBottom: 14 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  pillTxt: { fontSize: 13, color: C.textMed, fontWeight: '600', flex: 1 },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.greenLight, borderRadius: 14, paddingVertical: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#B8DFCA',
  },
  refreshTxt: { fontSize: 14, fontWeight: '700', color: C.greenDark },

  switchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.white, borderRadius: 14, paddingVertical: 14,
    marginBottom: 10, borderWidth: 1.5, borderColor: C.green,
  },
  switchBtnTxt: { fontSize: 14, fontWeight: '700', color: C.greenDark },

  logoutBtn: { alignItems: 'center', paddingVertical: 12 },
  logoutTxt: { fontSize: 13, color: C.textXLight, fontWeight: '600' },
});
