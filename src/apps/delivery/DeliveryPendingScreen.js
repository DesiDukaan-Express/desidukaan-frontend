import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, StatusBar,
  TouchableOpacity, Modal, Pressable, Animated, Easing, RefreshControl, Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const C = {
  green:      '#1A9E3F',
  greenDark:  '#147832',
  greenDeep:  '#0a4d22',
  greenLight: '#E6F4EB',
  amber:      '#F59E0B',
  amberLight: '#FEF3C7',
  bg:         '#F7F9F7',
  white:      '#FFFFFF',
  border:     '#E2E8E2',
  text:       '#111827',
  textMed:    '#374151',
  textLight:  '#6B7280',
  textXLight: '#9CA3AF',
};

// state: 'done' | 'active' | 'todo'
const STEPS = [
  { icon: '📋', labelKey: 'dpStepSubmitted', state: 'done' },
  { icon: '🔍', labelKey: 'dpStepReview',    state: 'active' },
  { icon: '✅', labelKey: 'dpStepActive',    state: 'todo' },
];

const SUPPORT_EMAIL = 'support@kwikpik.in';

// Soft pulsing ring used on the step that is currently in progress
function PulseRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.7, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return <Animated.View pointerEvents="none" style={[s.pulse, { opacity, transform: [{ scale }] }]} />;
}

export default function DeliveryPendingScreen({ onRefresh, refreshing }) {
  const user = useAuthStore((st) => st.user);
  const logout = useAuthStore((st) => st.logout);
  const setActiveRole = useAuthStore((st) => st.setActiveRole);
  const { t } = useTranslation();
  const [showLanguage, setShowLanguage] = useState(false);
  const name = user?.name || t('delivery.partner');

  const openMail = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});

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
        <View style={s.blobA} />
        <View style={s.blobB} />

        <View style={s.heroInner}>
          <TouchableOpacity
            onPress={() => setActiveRole?.(null)}
            style={s.iconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('dobBackRoles')}
          >
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={[s.avatarWrap, { marginLeft: 10 }]}>
            <Text style={s.avatarTxt}>{name.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.heroEyebrow}>{t('dobEyebrow')}</Text>
            <Text style={s.heroTitle} numberOfLines={1}>{t('dpHi', { name: name.split(' ')[0] })}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowLanguage(true)}
            style={[s.iconBtn, { marginRight: 8 }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('dobLanguage')}
          >
            <Text style={s.langIcon}>🌐</Text>
          </TouchableOpacity>
          <View style={s.heroBadge}>
            <View style={s.badgeDot} />
            <Text style={s.heroBadgeTxt}>{t('dpPending')}</Text>
          </View>
        </View>
        <View style={s.heroWave} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.green} colors={[C.green]} /> : undefined
        }
      >
        {/* Main card */}
        <View style={s.mainCard}>
          <View style={s.thankIconWrap}>
            <Text style={s.thankIcon}>🎉</Text>
          </View>
          <Text style={s.thankTitle}>{t('dpReceived')}</Text>
          <Text style={s.thankBody}>
            {t('dpB1')}<Text style={s.bold}>{t('dpBrand')}</Text>{t('dpB2')}<Text style={s.bold}>{t('dpSmsEmail')}</Text>{t('dpB3')}<Text style={s.bold}>{t('dpHours')}</Text>{t('dpB4')}
          </Text>
        </View>

        {/* Progress tracker */}
        <View style={s.trackerCard}>
          <Text style={s.trackerTitle}>{t('dpTrackerTitle')}</Text>
          {STEPS.map((step, i) => {
            const done = step.state === 'done';
            const active = step.state === 'active';
            return (
              <View key={i} style={s.stepRow}>
                <View style={s.stepLeft}>
                  <View style={s.stepDotHolder}>
                    {active && <PulseRing />}
                    <View style={[s.stepDot, done && s.stepDotDone, active && s.stepDotActive]}>
                      <Text style={[s.stepDotTxt, !done && !active && { color: C.textXLight }]}>
                        {done ? '✓' : (i + 1)}
                      </Text>
                    </View>
                  </View>
                  {i < STEPS.length - 1 && (
                    <View style={[s.stepLine, done && s.stepLineDone]} />
                  )}
                </View>
                <View style={[s.stepContent, active && s.stepContentActive]}>
                  <Text style={s.stepIcon}>{step.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stepLabel, done && { color: C.green }, active && { color: C.text }]}>
                      {t(step.labelKey)}
                    </Text>
                    {i === 1 && <Text style={s.stepSub}>{t('dpStepSub')}</Text>}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Info pills */}
        <View style={s.pillRow}>
          <View style={s.pill}>
            <View style={s.pillIconWrap}><Text style={s.pillIcon}>📞</Text></View>
            <Text style={s.pillTxt}>{t('dpSupport')}</Text>
          </View>
          <TouchableOpacity style={s.pill} onPress={openMail} activeOpacity={0.8} accessibilityRole="link">
            <View style={s.pillIconWrap}><Text style={s.pillIcon}>📧</Text></View>
            <Text style={[s.pillTxt, { color: C.greenDark }]}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
        </View>

        {/* Refresh */}
        <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
          <Text style={s.refreshTxt}>
            {refreshing ? t('dpChecking') : t('dpCheckStatus')}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity onPress={logout} activeOpacity={0.7} style={s.logoutBtn}>
          <Text style={s.logoutTxt}>{t('dpSignOut')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Language picker */}
      <Modal visible={showLanguage} transparent animationType="slide" onRequestClose={() => setShowLanguage(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowLanguage(false)}
        >
          <Pressable
            style={{ backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '80%' }}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={{ width: 44, height: 5, backgroundColor: C.border, borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
            <LanguageSwitcher inline onClose={() => setShowLanguage(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 24) + 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  blobA: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40 },
  blobB: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, left: -30 },
  heroInner:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  backArrow:   { fontSize: 18, color: '#fff' },
  langIcon:    { fontSize: 17 },
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
    backgroundColor: C.white, borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: '#E8F0E8',
    shadowColor: '#147832', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
  },
  thankIconWrap: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  thankIcon:  { fontSize: 44 },
  thankTitle: { fontSize: 21, fontWeight: '900', color: C.text, marginBottom: 12, letterSpacing: -0.4, textAlign: 'center' },
  thankBody:  { fontSize: 14, color: C.textMed, lineHeight: 22, textAlign: 'center' },
  bold:       { fontWeight: '800', color: C.text },

  trackerCard: {
    backgroundColor: C.white, borderRadius: 24, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: '#E8F0E8',
    shadowColor: '#147832', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  trackerTitle: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 20, letterSpacing: -0.2 },

  stepRow:     { flexDirection: 'row', marginBottom: 4 },
  stepLeft:    { alignItems: 'center', width: 32, marginRight: 14 },
  stepDotHolder: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  pulse:       { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: C.amber },
  stepDot:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: C.green, borderColor: C.green },
  stepDotActive: { backgroundColor: C.amber, borderColor: C.amber },
  stepDotTxt:  { fontSize: 11, fontWeight: '900', color: C.white },
  stepLine:    { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 3, minHeight: 24 },
  stepLineDone:{ backgroundColor: C.green },
  stepContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1, paddingBottom: 20 },
  stepContentActive: {},
  stepIcon:    { fontSize: 20, marginTop: 2 },
  stepLabel:   { fontSize: 14, fontWeight: '700', color: C.textLight },
  stepSub:     { fontSize: 11, color: C.textXLight, marginTop: 3, lineHeight: 16 },

  pillRow: { gap: 10, marginBottom: 14 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border },
  pillIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center' },
  pillIcon:{ fontSize: 17 },
  pillTxt: { flex: 1, fontSize: 13, color: C.textMed, fontWeight: '700' },

  refreshBtn: {
    backgroundColor: C.greenLight, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#B8DFCA',
  },
  refreshTxt: { fontSize: 14, fontWeight: '800', color: C.greenDark },

  logoutBtn: { alignItems: 'center', paddingVertical: 12 },
  logoutTxt: { fontSize: 13, color: C.textXLight, fontWeight: '600' },
});