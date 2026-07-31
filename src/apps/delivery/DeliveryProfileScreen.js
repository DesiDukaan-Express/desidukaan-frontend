import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Platform, Alert,
  Modal, Pressable,
} from 'react-native';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const C = {
  heroBg:     '#228948',
  heroSub:    'rgba(255,255,255,0.70)',
  heroStatBg: 'rgba(0,0,0,0.15)',
  white:      '#FFFFFF',
  bg:         '#F2F2F7',
  green:      '#50C878',
  greenDark:  '#228948',
  greenLight: '#E8F8EE',
  greenText:  '#1A6B38',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray300:    '#D1D5DB',
  gray400:    '#9CA3AF',
  gray500:    '#6B7280',
  gray700:    '#374151',
  gray800:    '#1F2937',
  gray900:    '#111827',
  red:        '#FF3B30',
  redLight:   '#FFEAEA',
  redText:    '#B91C1C',
  amber:      '#F59E0B',
  amberLight: '#FFFBEB',
  amberText:  '#92400E',
};

function getLevelInfo(total, t) {
  if (total >= 500) return { level: 5, label: t('delivery.levelLegend', 'Legend'),   next: null,  progress: 1 };
  if (total >= 200) return { level: 4, label: t('delivery.levelExpert', 'Expert'),   next: 500,   progress: (total - 200) / 300 };
  if (total >= 100) return { level: 3, label: t('delivery.levelPro', 'Pro'),      next: 200,   progress: (total - 100) / 100 };
  if (total >= 30)  return { level: 2, label: t('delivery.levelRising', 'Rising'),   next: 100,   progress: (total - 30)  / 70  };
  return              { level: 1, label: t('delivery.levelStarter', 'Starter'),  next: 30,    progress: total / 30 };
}

function InfoRow({ label, value, last }) {
  return (
    <View style={[ir.row, last && { borderBottomWidth: 0 }]}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
  label: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: '#6B7280' },
  value: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: '#111827', maxWidth: '55%', textAlign: 'right' },
});

function SectionCard({ title, children }) {
  return (
    <View style={p.sectionCard}>
      <Text style={p.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function DeliveryProfileScreen({ navigation }) {
  const { token, user, logout, setActiveRole } = useAuthStore();
  const { t } = useTranslation();
  const [showLanguage, setShowLanguage] = useState(false);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [profile, setProfile] = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/delivery/me/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery/stats`,       { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const profileData = await profileRes.json();
      const statsData   = await statsRes.json();
      if (profileData.success) setProfile(profileData.data?.profile || profileData.data);
      if (statsData.success)   setStats(statsData.data);
    } catch (e) {
      console.log('Profile fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleLogout = () => {
    Alert.alert(
      t('profile.logoutConfirmTitle', 'Log out'),
      t('profile.logoutConfirmMsg', 'Are you sure you want to log out?'),
      [
        { text: t('delivery.cancel', 'Cancel'), style: 'cancel' },
        { text: t('profile.logout', 'Log out'), style: 'destructive', onPress: () => logout?.() },
      ]
    );
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.heroBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  const totalDeliveries = stats?.totalDeliveries || profile?.total_deliveries || 0;
  const levelInfo = getLevelInfo(totalDeliveries, t);
  const displayName = user?.name || profile?.user?.name || 'Partner';
  const initials  = displayName.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const phone  = user?.phone  || profile?.user?.phone  || '—';
  const rating = stats?.rating ?? profile?.rating ?? null;
  const displayRating = rating && rating > 0 ? Number(rating).toFixed(1) : '—';

  const onboardingDone = profile?.onboarding_submitted;
  const isVerified = profile?.is_certified;

  return (
    <View style={p.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.heroBg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        {/* ── Hero ── */}
        <View style={p.hero}>
          <View style={p.heroTop}>
            <View style={p.avatarWrap}>
              <Text style={p.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={p.heroName}>{displayName}</Text>
                {isVerified && (
                  <View style={p.verifiedBadge}>
                    <Text style={p.verifiedText}>{t('delivery.verified', '✓ Verified')}</Text>
                  </View>
                )}
              </View>
              <Text style={p.heroPhone}>{phone}</Text>
              <Text style={p.heroCluster}>{profile?.cluster?.name || t('delivery.unassignedCluster', 'Unassigned cluster')}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={p.heroStats}>
            <View style={p.heroStat}>
              <Text style={p.heroStatValue}>{totalDeliveries}</Text>
              <Text style={p.heroStatLabel}>{t('delivery.deliveriesStat', 'Deliveries')}</Text>
            </View>
            <View style={p.heroStatDivider} />
            <View style={p.heroStat}>
              <Text style={p.heroStatValue}>{stats?.acceptanceRate ?? 100}%</Text>
              <Text style={p.heroStatLabel}>{t('delivery.acceptRate', 'Accept rate')}</Text>
            </View>
            <View style={p.heroStatDivider} />
            <View style={p.heroStat}>
              <Text style={p.heroStatValue}>{displayRating} ★</Text>
              <Text style={p.heroStatLabel}>{t('delivery.rating', 'Rating')}</Text>
            </View>
            <View style={p.heroStatDivider} />
            <View style={p.heroStat}>
              <Text style={p.heroStatValue}>Lvl {levelInfo.level}</Text>
              <Text style={p.heroStatLabel}>{levelInfo.label}</Text>
            </View>
          </View>
        </View>

        <View style={p.body}>

          {/* ── Level progress ── */}
          <View style={p.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View>
                <Text style={p.sectionTitle}>Level {levelInfo.level} · {levelInfo.label}</Text>
                {levelInfo.next && (
                  <Text style={p.levelSub}>{totalDeliveries} / {levelInfo.next} {t('delivery.deliveriesStat', 'deliveries').toLowerCase()}</Text>
                )}
              </View>
              <View style={p.levelBadge}>
                <Text style={p.levelBadgeText}>{levelInfo.level}</Text>
              </View>
            </View>
            <View style={p.progressTrack}>
              <View style={[p.progressFill, { width: `${Math.round(levelInfo.progress * 100)}%` }]} />
            </View>
            {levelInfo.next ? (
              <Text style={p.levelHint}>{levelInfo.next - totalDeliveries} {t('delivery.moreToReach', { count: levelInfo.next - totalDeliveries, nextLevel: levelInfo.level + 1, defaultValue: `more to reach Level ${levelInfo.level + 1}` })}</Text>
            ) : (
              <Text style={[p.levelHint, { color: C.greenDark }]}>{t('delivery.maxLevelReached', 'Maximum level reached 🎉')}</Text>
            )}
          </View>

          {/* ── Vehicle info ── */}
          <SectionCard title={t('delivery.vehicle', 'Vehicle')}>
            <InfoRow label={t('delivery.vehicleType', 'Type')}           value={profile?.vehicle_type ? profile.vehicle_type.charAt(0).toUpperCase() + profile.vehicle_type.slice(1) : null} />
            <InfoRow label={t('delivery.vehicleNumber', 'Vehicle number')} value={profile?.vehicle_number} />
            <InfoRow label={t('delivery.vehicleYear', 'Year')}           value={profile?.vehicle_year} last />
          </SectionCard>

          {/* ── Documents ── */}
          <SectionCard title={t('delivery.documents', 'Documents')}>
            <InfoRow label={t('delivery.drivingLicence', 'Driving licence')} value={profile?.license_number ? `${profile.license_number} · Exp ${profile.license_expiry || '—'}` : null} />
            <InfoRow label={t('delivery.aadhaar', 'Aadhaar')}          value={profile?.aadhar_number ? `****${profile.aadhar_number.slice(-4)}` : null} />
            <InfoRow label={t('delivery.pan', 'PAN')}              value={profile?.pan_number} last />
          </SectionCard>

          {/* ── Bank details ── */}
          <SectionCard title={t('delivery.bankAccount', 'Bank account')}>
            <InfoRow label={t('delivery.accountName', 'Account name')}   value={profile?.bank_account_name} />
            <InfoRow label={t('delivery.bank', 'Bank')}           value={profile?.bank_name} />
            <InfoRow label={t('delivery.accountNumber', 'Account number')} value={profile?.bank_account_number ? `****${profile.bank_account_number.slice(-4)}` : null} />
            <InfoRow label={t('delivery.ifsc', 'IFSC')}           value={profile?.bank_ifsc} last />
          </SectionCard>

          {/* ── Onboarding status ── */}
          {!onboardingDone && (
            <TouchableOpacity
              style={p.onboardingBanner}
              onPress={() => navigation?.navigate('Onboarding')}
              activeOpacity={0.85}
            >
              <View>
                <Text style={p.onboardingTitle}>{t('delivery.completeYourProfile', 'Complete your profile')}</Text>
                <Text style={p.onboardingSub}>{t('delivery.addDocumentsSub', 'Add documents and bank details to start earning')}</Text>
              </View>
              <Text style={p.onboardingArrow}>→</Text>
            </TouchableOpacity>
          )}

          {/* ── Language setting ── */}
          <TouchableOpacity
            style={p.langBtn}
            onPress={() => setShowLanguage(true)}
            activeOpacity={0.8}
          >
            <View style={p.langBtnLeft}>
              <Text style={p.langBtnIcon}>🌐</Text>
              <View>
                <Text style={p.langBtnLabel}>{t('profile.language', 'Language')}</Text>
                <Text style={p.langBtnSub}>{t('profile.languageSub', 'Change app language')}</Text>
              </View>
            </View>
            <Text style={p.langBtnArrow}>›</Text>
          </TouchableOpacity>

          {/* ── Switch Profile ── */}
          <TouchableOpacity
            style={[p.logoutBtn, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', marginBottom: 8 }]}
            onPress={async () => { await setActiveRole(null); }}
            activeOpacity={0.8}
          >
            <Text style={[p.logoutText, { color: '#3B82F6' }]}>Switch Profile</Text>
          </TouchableOpacity>

          {/* ── Log out ── */}
          <TouchableOpacity style={p.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={p.logoutText}>{t('profile.logout', 'Log out')}</Text>
          </TouchableOpacity>

        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguage}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguage(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowLanguage(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={{ width: 44, height: 5, backgroundColor: C.gray200, borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
            <LanguageSwitcher inline onClose={() => setShowLanguage(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const p = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  hero: {
    backgroundColor: C.heroBg,
    paddingTop: Platform.OS === 'android' ? 36 : 58,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.40)',
  },
  avatarText:   { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white },
  heroName:     { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white, letterSpacing: -0.3 },
  heroPhone:    { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: C.heroSub, marginTop: 4 },
  heroCluster:  { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: 'rgba(255,255,255,0.50)', marginTop: 2 },
  verifiedBadge:{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: C.white },

  heroStats:       { flexDirection: 'row', backgroundColor: C.heroStatBg, borderRadius: 16, paddingVertical: 14 },
  heroStat:        { flex: 1, alignItems: 'center' },
  heroStatValue:   { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white, marginBottom: 2 },
  heroStatLabel:   { fontSize: 9, fontFamily: 'PlusJakartaSans_500Medium', color: 'rgba(255,255,255,0.60)' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  sectionCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, letterSpacing: 0.2, marginBottom: 12 },

  levelSub:      { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400, marginTop: 2 },
  levelBadge:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.heroBg, alignItems: 'center', justifyContent: 'center' },
  levelBadgeText:{ fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white },
  progressTrack: { height: 6, backgroundColor: C.gray200, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: 6, backgroundColor: C.green, borderRadius: 3 },
  levelHint:     { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },

  onboardingBanner: {
    backgroundColor: C.amberLight, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: C.amber,
  },
  onboardingTitle:  { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: C.amberText, marginBottom: 3 },
  onboardingSub:    { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.amberText, opacity: 0.8 },
  onboardingArrow:  { fontSize: 20, color: C.amber },

  logoutBtn: {
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.gray200, backgroundColor: C.white,
    marginTop: 4,
  },
  logoutText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: C.red },

  langBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.white, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: C.gray200, marginTop: 4,
  },
  langBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  langBtnIcon: { fontSize: 20 },
  langBtnLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900 },
  langBtnSub:   { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400, marginTop: 2 },
  langBtnArrow: { fontSize: 22, color: C.gray300, fontFamily: 'PlusJakartaSans_500Medium' },
});