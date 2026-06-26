import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Platform, StatusBar, TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';

const C = {
  green:      '#1A9E3F',
  greenDark:  '#147832',
  greenDeep:  '#0a4d22',
  greenLight: '#E6F4EB',
  bg:         '#F7F9F7',
  white:      '#FFFFFF',
  border:     '#E2E8E2',
  text:       '#111827',
  textMed:    '#374151',
  textLight:  '#6B7280',
  textXLight: '#9CA3AF',
};

const STEPS = [
  { icon: '📋', label: 'Application Submitted',  done: true  },
  { icon: '🔍', label: 'Documents Under Review',  done: false },
  { icon: '✅', label: 'Account Activated',        done: false },
];

export default function DeliveryPendingScreen({ onRefresh, refreshing }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const name = user?.name || 'Partner';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.greenDeep} />

      {/* Header — same compact style as onboarding */}
      <LinearGradient
        colors={['#0a4d22', '#147832', '#1A9E3F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroInner}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarTxt}>{name.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.heroEyebrow}>PARTNER</Text>
            <Text style={s.heroTitle}>Hi, {name.split(' ')[0]} 👋</Text>
          </View>
          <View style={s.heroBadge}>
            <View style={s.badgeDot} />
            <Text style={s.heroBadgeTxt}>PENDING</Text>
          </View>
        </View>
        <View style={s.heroWave} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Main card */}
        <View style={s.mainCard}>
          <Text style={s.thankIcon}>🎉</Text>
          <Text style={s.thankTitle}>Application Received!</Text>
          <Text style={s.thankBody}>
            Thank you for registering with <Text style={s.bold}>KwikPik</Text>. Your documents are being reviewed by our team.{'\n\n'}
            Once verified, you'll receive an <Text style={s.bold}>SMS and email</Text> confirming your account activation — usually within <Text style={s.bold}>24–48 hours</Text>.
          </Text>
        </View>

        {/* Progress tracker */}
        <View style={s.trackerCard}>
          <Text style={s.trackerTitle}>Application Status</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={s.stepRow}>
              {/* Connector line */}
              <View style={s.stepLeft}>
                <View style={[s.stepDot, step.done && s.stepDotDone]}>
                  <Text style={s.stepDotTxt}>{step.done ? '✓' : (i + 1)}</Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[s.stepLine, step.done && s.stepLineDone]} />
                )}
              </View>
              <View style={s.stepContent}>
                <Text style={s.stepIcon}>{step.icon}</Text>
                <View>
                  <Text style={[s.stepLabel, step.done && { color: C.green }]}>{step.label}</Text>
                  {i === 1 && (
                    <Text style={s.stepSub}>Avg. 24–48 hrs · Mon–Sat</Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Info pills */}
        <View style={s.pillRow}>
          {[
            { icon: '📞', text: 'Support: 1800-XXX-XXXX' },
            { icon: '📧', text: 'support@kwikpik.in' },
          ].map((p, i) => (
            <View key={i} style={s.pill}>
              <Text style={s.pillIcon}>{p.icon}</Text>
              <Text style={s.pillTxt}>{p.text}</Text>
            </View>
          ))}
        </View>

        {/* Refresh hint */}
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
          <Text style={s.refreshTxt}>
            {refreshing ? 'Checking…' : '🔄  Check approval status'}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity onPress={logout} activeOpacity={0.7} style={s.logoutBtn}>
          <Text style={s.logoutTxt}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  heroInner:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatarWrap:  { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  avatarTxt:   { fontSize: 15, fontWeight: '900', color: '#fff' },
  heroEyebrow: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 1.2 },
  heroTitle:   { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  heroBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,200,0,0.18)', borderWidth: 1, borderColor: 'rgba(255,200,0,0.35)' },
  badgeDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FCD34D' },
  heroBadgeTxt:{ fontSize: 10, color: '#FDE68A', fontWeight: '800', letterSpacing: 1.2 },
  heroWave:    { height: 22, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginHorizontal: -20, marginBottom: -1 },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  mainCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: '#E8F0E8',
    shadowColor: '#147832', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09, shadowRadius: 14, elevation: 5,
  },
  thankIcon:  { fontSize: 48, marginBottom: 12 },
  thankTitle: { fontSize: 20, fontWeight: '900', color: C.text, marginBottom: 12, letterSpacing: -0.4 },
  thankBody:  { fontSize: 14, color: C.textMed, lineHeight: 22, textAlign: 'center' },
  bold:       { fontWeight: '800', color: C.text },

  trackerCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: '#E8F0E8',
    shadowColor: '#147832', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  trackerTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 20, letterSpacing: -0.2 },

  stepRow:     { flexDirection: 'row', marginBottom: 4 },
  stepLeft:    { alignItems: 'center', width: 32, marginRight: 14 },
  stepDot:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: C.green, borderColor: C.green },
  stepDotTxt:  { fontSize: 11, fontWeight: '900', color: C.white },
  stepLine:    { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 3, minHeight: 24 },
  stepLineDone:{ backgroundColor: C.green },
  stepContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, paddingBottom: 20 },
  stepIcon:    { fontSize: 20, marginTop: 2 },
  stepLabel:   { fontSize: 14, fontWeight: '700', color: C.textMed },
  stepSub:     { fontSize: 11, color: C.textXLight, marginTop: 3 },

  pillRow: { gap: 10, marginBottom: 14 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.border },
  pillIcon:{ fontSize: 18 },
  pillTxt: { fontSize: 13, color: C.textMed, fontWeight: '600' },

  refreshBtn: {
    backgroundColor: C.greenLight, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#B8DFCA',
  },
  refreshTxt: { fontSize: 14, fontWeight: '700', color: C.greenDark },

  logoutBtn: { alignItems: 'center', paddingVertical: 12 },
  logoutTxt: { fontSize: 13, color: C.textXLight, fontWeight: '600' },
});