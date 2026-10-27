import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Platform, Alert,
  Modal, Pressable, Image, Dimensions, TextInput, KeyboardAvoidingView,
} from 'react-native';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line as SvgLine } from 'react-native-svg';
import useAuthStore from '../../store/authStore';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const SCREEN_W = Dimensions.get('window').width;

const C = {
  heroBg:     '#228948',
  heroBg2:    '#1A6B38',
  heroSub:    'rgba(255,255,255,0.72)',
  heroStatBg: 'rgba(255,255,255,0.10)',
  white:      '#FFFFFF',
  bg:         '#F2F2F7',
  green:      '#22C55E',
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
  red:        '#EF4444',
  redLight:   '#FFEAEA',
  redText:    '#B91C1C',
  redBorder:  '#FECACA',
  redBackground: '#FEF2F2',
  amber:      '#F59E0B',
  amberLight: '#FFFBEB',
  amberText:  '#92400E',
  purple:     '#7C3AED',
  purpleLight:'#F1EBFD',
  gold:       '#F5A524',
  goldLight:  '#FFF6E5',
};

function getLevelInfo(total, t) {
  if (total >= 500) return { level: 5, label: t('delivery.levelLegend', 'Legend'),  next: null, floor: 500 };
  if (total >= 200) return { level: 4, label: t('delivery.levelExpert', 'Expert'),  next: 500,  floor: 200 };
  if (total >= 100) return { level: 3, label: t('delivery.levelPro', 'Pro'),        next: 200,  floor: 100 };
  if (total >= 30)  return { level: 2, label: t('delivery.levelRising', 'Rising'),  next: 100,  floor: 30  };
  return              { level: 1, label: t('delivery.levelStarter', 'Starter'),     next: 30,   floor: 0   };
}

/* ─────────────────────────── small building blocks ─────────────────────────── */

function StatTile({ icon, iconBg, iconColor, value, label, sub }) {
  return (
    <View style={s.statTile}>
      <View style={[s.statIconWrap, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      {!!sub && <Text style={s.statSub} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={s.quickAction} onPress={onPress} activeOpacity={0.75}>
      {icon}
      <Text style={s.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function CardHeader({ icon, iconBg, title, right, onPress }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={s.cardHeader} onPress={onPress} activeOpacity={0.7}>
      <View style={s.cardHeaderLeft}>
        <View style={[s.cardHeaderIcon, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {right}
    </Wrap>
  );
}

function InfoColumn({ icon, label, value }) {
  return (
    <View style={s.infoCol}>
      <View style={s.infoColTop}>
        {icon}
        <Text style={s.infoColLabel}>{label}</Text>
      </View>
      <Text style={s.infoColValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

function DocRow({ icon, label, value, status, verified, last, onEdit }) {
  return (
    <View style={[s.docRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.docRowLeft}>
        <View style={s.docIconWrap}>{icon}</View>
        <View>
          <Text style={s.docLabel}>{label}</Text>
          <Text style={s.docValue} numberOfLines={1}>{value || '—'}</Text>
        </View>
      </View>
      <View style={s.docRowRight}>
        <Text style={[s.docStatus, verified ? { color: C.gray700 } : { color: C.amberText }]}>
          {status}
        </Text>
        <View style={[s.docCheck, { backgroundColor: verified ? C.green : C.gray300 }]}>
          <Feather name={verified ? 'check' : 'clock'} size={12} color={C.white} />
        </View>
        {!!onEdit && (
          <TouchableOpacity style={s.docEditBtn} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="edit-2" size={13} color={C.gray400} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* Simple SVG line chart for the weekly earnings trend */
function EarningsChart({ data, labels, highlightIndex }) {
  const width = SCREEN_W - 32 - 36 - 90; // card padding + left total-earnings column
  const chartWidth = Math.max(width, 160);
  const height = 70;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const stepX = chartWidth / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 10) - 5;
    return { x, y };
  });
  const polylineStr = points.map(pt => `${pt.x},${pt.y}`).join(' ');

  return (
    <View>
      <Svg width={chartWidth} height={height}>
        <Polyline
          points={polylineStr}
          fill="none"
          stroke={C.green}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((pt, i) => (
          i === highlightIndex ? (
            <React.Fragment key={i}>
              <SvgLine x1={pt.x} y1={0} x2={pt.x} y2={height} stroke={C.gray300} strokeWidth={1} />
              <Circle cx={pt.x} cy={pt.y} r={5} fill={C.green} stroke={C.white} strokeWidth={2} />
            </React.Fragment>
          ) : (
            <Circle key={i} cx={pt.x} cy={pt.y} r={2.5} fill={C.green} />
          )
        ))}
      </Svg>
      <View style={[s.chartLabels, { width: chartWidth }]}>
        {labels.map((lbl, i) => (
          <Text key={lbl + i} style={[s.chartLabel, i === highlightIndex && { color: C.greenDark, fontFamily: 'PlusJakartaSans_700Bold' }]}>
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
}

function DeliveryRow({ item, last }) {
  const isCompleted = (item.status || '').toLowerCase() === 'completed';
  return (
    <View style={[s.deliveryRow, last && { borderBottomWidth: 0 }]}>
      <View style={s.deliveryIconWrap}>
        <Feather name="package" size={16} color={C.greenDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.deliveryOrderId}>{item.orderId}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Feather name="map-pin" size={10} color={C.gray400} />
            <Text style={s.deliveryMeta}>{item.distance}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Feather name="clock" size={10} color={C.gray400} />
            <Text style={s.deliveryMeta}>{item.duration}</Text>
          </View>
        </View>
      </View>
      <View style={[s.deliveryStatusPill, isCompleted ? { backgroundColor: C.greenLight } : { backgroundColor: C.amberLight }]}>
        <Text style={[s.deliveryStatusText, isCompleted ? { color: C.greenText } : { color: C.amberText }]}>{item.status}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: 10, minWidth: 56 }}>
        <Text style={s.deliveryAmount}>₹{item.amount}</Text>
        <Text style={s.deliveryTime}>{item.time}</Text>
      </View>
    </View>
  );
}

/* ─────────────────────────── main screen ─────────────────────────── */

export default function DeliveryProfileScreen({ navigation }) {
  const { token, user, logout, setActiveRole } = useAuthStore();
  const { t } = useTranslation();
  const [showLanguage, setShowLanguage] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null); // 'licence' | 'aadhaar' | 'pan' | null
  const [savingDoc, setSavingDoc] = useState(false);
  const [earningsPeriod, setEarningsPeriod] = useState('This Week');
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [onlineOverride, setOnlineOverride] = useState(null);

  // Navigates safely: if the target route isn't registered in the navigator yet,
  // this shows a friendly notice instead of crashing / doing nothing.
  const safeNavigate = useCallback((routeName, params) => {
    if (!navigation?.navigate) {
      Alert.alert(t('common.comingSoon', 'Coming soon'), t('common.featureNotReady', 'This screen isn\u2019t available yet.'));
      return;
    }
    try {
      navigation.navigate(routeName, params);
    } catch (e) {
      console.warn(`[DeliveryProfileScreen] Could not navigate to "${routeName}":`, e?.message);
      Alert.alert(t('common.comingSoon', 'Coming soon'), t('common.featureNotReady', 'This screen isn\u2019t available yet.'));
    }
  }, [navigation, t]);

  const safeGoBack = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.goBack) {
      try { navigation.goBack(); } catch (e) { /* nothing to go back to */ }
    }
  }, [navigation]);

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

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleSaveDocument = async ({ value, expiry }) => {
    if (!editingDoc) return;
    const body = editingDoc === 'licence'
      ? { license_number: value, license_expiry: expiry }
      : editingDoc === 'aadhaar'
      ? { aadhar_number: value }
      : { pan_number: value };

    setSavingDoc(true);
    try {
      const res = await fetch(`${API_BASE}/delivery/me/documents`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || `Status ${res.status}`);
      }
      setEditingDoc(null);
      await fetchData();
    } catch (e) {
      Alert.alert(
        t('common.somethingWentWrong', 'Something went wrong'),
        e?.message || t('common.tryAgain', 'Please try again.')
      );
    } finally {
      setSavingDoc(false);
    }
  };

  const handleToggleOnline = async () => {
    if (togglingOnline) return;
    const currentlyOnline = onlineOverride !== null ? onlineOverride : !!stats?.isAvailable;
    const nextOnline = !currentlyOnline;

    // Optimistic update so the button responds immediately, regardless of the backend.
    setOnlineOverride(nextOnline);
    setTogglingOnline(true);
    try {
      const res = await fetch(`${API_BASE}/delivery/toggle-availability`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: nextOnline }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      await fetchData();
      setOnlineOverride(null); // trust the freshly-fetched stats from here on
    } catch (e) {
      console.warn('[DeliveryProfileScreen] toggle-online failed, keeping optimistic state:', e?.message);
      // Keep the optimistic UI state even if the network call failed, so the
      // button still visibly works; only warn quietly instead of blocking the user.
    } finally {
      setTogglingOnline(false);
    }
  };

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.heroBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  const totalDeliveries = stats?.totalDeliveries ?? profile?.total_deliveries ?? 0;
  const levelInfo = getLevelInfo(totalDeliveries, t);
  const displayName = user?.name || profile?.user?.name || 'Partner';
  const initials  = displayName.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const phone  = user?.phone || profile?.user?.phone || '—';
  const email  = user?.email || profile?.user?.email || '—';
  const avatarUrl = profile?.avatar_url || profile?.photo_url || user?.avatar_url || null;

  const rating = stats?.rating ?? profile?.rating ?? 0;
  const totalRatings = stats?.totalRatings ?? profile?.total_ratings ?? 0;
  const displayRating = totalRatings > 0 ? Number(rating || 0).toFixed(1) : '—';

  const acceptanceRate = stats?.acceptanceRate ?? 0;
  const acceptanceLabel = acceptanceRate >= 90 ? t('delivery.excellent', 'Excellent')
    : acceptanceRate >= 70 ? t('delivery.good', 'Good')
    : acceptanceRate > 0 ? t('delivery.needsWork', 'Needs work')
    : t('delivery.noData', 'No data yet');

  const todaysEarnings = stats?.todayEarnings ?? 0;
  const todaysDeliveries = stats?.todayDeliveries ?? 0;

  const isOnline = onlineOverride !== null ? onlineOverride : !!stats?.isAvailable;
  const isVerified = !!profile?.is_certified;

  const nextTarget = levelInfo.next;
  const progressPct = nextTarget
    ? Math.min(100, Math.round(((totalDeliveries - levelInfo.floor) / (nextTarget - levelInfo.floor)) * 100))
    : 100;

  // Vehicle
  const vehicleType = profile?.vehicle_type
    ? profile.vehicle_type.charAt(0).toUpperCase() + profile.vehicle_type.slice(1)
    : null;
  const vehicleNumber = profile?.vehicle_number || null;
  const vehicleYear = profile?.vehicle_year || null;

  // Documents
  const licenceNumber = profile?.license_number || null;
  const licenceExpiry = profile?.license_expiry || null;
  const licenceVerified = profile?.license_verified === true;
  const aadhaarNumber = profile?.aadhar_number || null;
  const aadhaarVerified = profile?.aadhar_verified === true;
  const panNumber = profile?.pan_number || null;
  const panVerified = profile?.pan_verified === true;

  // Earnings summary
  const totalEarnings = stats?.earnings?.total ?? 0;
  const earningsDelta = stats?.earnings?.deltaPct ?? 0;
  const earningsBreakdown = {
    delivery:   stats?.earnings?.delivery   ?? 0,
    tips:       stats?.earnings?.tips       ?? 0,
    incentives: stats?.earnings?.incentives ?? 0,
  };
  const weekData = stats?.earnings?.weekly ?? [0, 0, 0, 0, 0, 0, 0];
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekMax = Math.max(...weekData);
  const highlightIndex = weekMax > 0 ? weekData.indexOf(weekMax) : -1;

  // Recent deliveries
  const recentDeliveries = stats?.recentDeliveries ?? [];

  const notificationCount = stats?.notificationCount ?? 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.heroBg} />

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.topBarBtn} onPress={() => safeGoBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={C.white} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>{t('delivery.myProfile', 'My Profile')}</Text>
        <TouchableOpacity
          style={s.topBarBtn}
          onPress={() => safeNavigate('Notifications')}
          activeOpacity={0.7}
        >
          <Feather name="bell" size={20} color={C.white} />
          {notificationCount > 0 && (
            <View style={s.notifBadge}>
              <Text style={s.notifBadgeText}>{notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.white} />}
      >
        {/* ── Hero card ── */}
        <View style={s.heroWrap}>
          <LinearGradient colors={[C.heroBg, C.heroBg2]} style={s.hero}>
            <View style={s.heroTop}>
              <View style={s.avatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
                ) : (
                  <Text style={s.avatarText}>{initials}</Text>
                )}
                <View style={[s.onlineDot, { backgroundColor: isOnline ? C.green : C.gray400 }]} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text style={s.heroName}>{displayName}</Text>
                  {isVerified && (
                    <View style={s.verifiedIcon}>
                      <Feather name="check" size={11} color={C.white} />
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={s.heroRole}>{t('delivery.role', 'Delivery Partner')}</Text>
                  <View style={s.verifiedPill}>
                    <Text style={s.verifiedPillText}>{t('delivery.verifiedPartner', 'Verified Partner')}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
                  <Feather name="star" size={13} color="#FFC64B" />
                  <Text style={s.heroRating}>{displayRating}</Text>
                  <Text style={s.heroReviews}>({totalRatings} {t('delivery.reviews', 'reviews')})</Text>
                </View>
              </View>

              <View style={s.levelHex}>
                <Text style={s.levelHexNum}>{levelInfo.level}</Text>
                <Text style={s.levelHexLabel}>{t('delivery.level', 'Level')} {levelInfo.level}</Text>
                <Text style={s.levelHexSub}>{levelInfo.label}</Text>
              </View>
            </View>

            <View style={s.heroContactRow}>
              <View style={s.heroContactItem}>
                <Feather name="phone" size={13} color={C.heroSub} />
                <Text style={s.heroContactText}>{phone}</Text>
              </View>
              <View style={s.heroContactItem}>
                <Feather name="mail" size={13} color={C.heroSub} />
                <Text style={s.heroContactText} numberOfLines={1}>{email}</Text>
              </View>
            </View>

            {/* Level progress panel */}
            <View style={s.levelPanel}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={s.levelPanelTitle}>{t('delivery.level', 'Level')} {levelInfo.level} - {levelInfo.label}</Text>
                <Text style={s.levelPanelCount}>
                  {totalDeliveries} / {nextTarget ?? totalDeliveries} {t('delivery.deliveriesCompleted', 'deliveries completed')}
                </Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${progressPct}%` }]} />
              </View>
              {nextTarget ? (
                <Text style={s.levelPanelHint}>
                  {nextTarget - totalDeliveries} {t('delivery.moreToReach', { count: nextTarget - totalDeliveries, nextLevel: levelInfo.level + 1, defaultValue: `more deliveries to reach Level ${levelInfo.level + 1}` })}
                </Text>
              ) : (
                <Text style={s.levelPanelHint}>{t('delivery.maxLevelReached', 'Maximum level reached 🎉')}</Text>
              )}
            </View>
          </LinearGradient>
        </View>

        <View style={s.body}>

          {/* ── Stats grid ── */}
          <View style={s.statsGrid}>
            <StatTile
              icon={<Feather name="shopping-bag" size={16} color={C.greenDark} />}
              iconBg={C.greenLight}
              value={totalDeliveries}
              label={t('delivery.totalDeliveries', 'Total Deliveries')}
              sub={t('delivery.thisMonth', 'This Month')}
            />
            <StatTile
              icon={<Feather name="check-circle" size={16} color={C.greenDark} />}
              iconBg={C.greenLight}
              value={`${acceptanceRate}%`}
              label={t('delivery.acceptanceRate', 'Acceptance Rate')}
              sub={acceptanceLabel}
            />
            <StatTile
              icon={<Feather name="star" size={16} color={C.gold} />}
              iconBg={C.goldLight}
              value={displayRating}
              label={t('delivery.customerRating', 'Customer Rating')}
              sub={`${totalRatings} ${t('delivery.reviews', 'Reviews')}`}
            />
            <StatTile
              icon={<Feather name="credit-card" size={16} color={C.greenDark} />}
              iconBg={C.greenLight}
              value={`₹${todaysEarnings.toLocaleString('en-IN')}`}
              label={t('delivery.todaysEarnings', "Today's Earnings")}
              sub={`${todaysDeliveries} ${t('delivery.deliveriesStat', 'Deliveries')}`}
            />
          </View>

          {/* ── Quick actions ── */}
          <LinearGradient colors={[C.heroBg, C.heroBg2]} style={s.quickActionsBar}>
            <QuickAction
              icon={<Feather name="power" size={20} color={C.white} />}
              label={togglingOnline ? '…' : (isOnline ? t('delivery.goOffline', 'Go Offline') : t('delivery.goOnline', 'Go Online'))}
              onPress={handleToggleOnline}
            />
            <QuickAction
              icon={<MaterialCommunityIcons name="moped" size={20} color={C.white} />}
              label={t('delivery.myDeliveries', 'My Deliveries')}
              onPress={() => safeNavigate('History')}
            />
            <QuickAction
              icon={<Feather name="briefcase" size={20} color={C.white} />}
              label={t('delivery.earnings', 'Earnings')}
              onPress={() => safeNavigate('Earnings')}
            />
            <QuickAction
              icon={<Feather name="headphones" size={20} color={C.white} />}
              label={t('delivery.support', 'Support')}
              onPress={() => safeNavigate('Support')}
            />
          </LinearGradient>

          {/* ── Personal & Vehicle info ── */}
          <View style={s.sectionCard}>
            <CardHeader
              icon={<Feather name="user" size={16} color={C.greenDark} />}
              iconBg={C.greenLight}
              title={t('delivery.personalVehicleInfo', 'Personal & Vehicle Info')}
              right={<Feather name="chevron-right" size={18} color={C.gray400} />}
              onPress={() => safeNavigate('VehicleInfo')}
            />
            <View style={s.infoColsRow}>
              <InfoColumn
                icon={<MaterialCommunityIcons name="bike" size={14} color={C.gray400} />}
                label={t('delivery.vehicleType', 'Vehicle Type')}
                value={vehicleType}
              />
              <InfoColumn
                icon={<Feather name="hash" size={14} color={C.gray400} />}
                label={t('delivery.vehicleNumber', 'Vehicle Number')}
                value={vehicleNumber}
              />
              <InfoColumn
                icon={<Feather name="calendar" size={14} color={C.gray400} />}
                label={t('delivery.vehicleYear', 'Vehicle Year')}
                value={vehicleYear}
              />
            </View>
          </View>

          {/* ── Documents ── */}
          <View style={s.sectionCard}>
            <CardHeader
              icon={<Feather name="file-text" size={16} color={C.purple} />}
              iconBg={C.purpleLight}
              title={t('delivery.documents', 'Documents')}
              right={(
                <TouchableOpacity onPress={() => safeNavigate('Documents')}>
                  <View style={s.viewAllPill}>
                    <Text style={s.viewAllPillText}>{t('common.viewAll', 'View All')}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <DocRow
              icon={<Feather name="credit-card" size={14} color={C.gray500} />}
              label={t('delivery.drivingLicence', 'Driving Licence')}
              value={licenceNumber}
              verified={licenceVerified}
              status={licenceVerified ? (licenceExpiry ? `Exp: ${licenceExpiry}` : 'Verified') : 'Pending'}
              onEdit={() => setEditingDoc('licence')}
            />
            <DocRow
              icon={<Feather name="user" size={14} color={C.gray500} />}
              label={t('delivery.aadhaar', 'Aadhaar Card')}
              value={aadhaarNumber ? `**** **** ${aadhaarNumber.slice(-4)}` : null}
              verified={aadhaarVerified}
              status={aadhaarVerified ? 'Verified' : 'Pending'}
              onEdit={() => setEditingDoc('aadhaar')}
            />
            <DocRow
              icon={<Feather name="file" size={14} color={C.gray500} />}
              label={t('delivery.pan', 'PAN Card')}
              value={panNumber}
              verified={panVerified}
              status={panVerified ? 'Verified' : 'Pending'}
              last
              onEdit={() => setEditingDoc('pan')}
            />
          </View>

          {/* ── Earnings summary ── */}
          <View style={s.sectionCard}>
            <CardHeader
              icon={<Feather name="briefcase" size={16} color={C.greenDark} />}
              iconBg={C.greenLight}
              title={t('delivery.earningsSummary', 'Earnings Summary')}
              right={(
                <TouchableOpacity
                  style={s.periodPill}
                  onPress={() => setEarningsPeriod(p => p === 'This Week' ? 'This Month' : 'This Week')}
                >
                  <Text style={s.periodPillText}>{earningsPeriod}</Text>
                  <Feather name="chevron-down" size={14} color={C.greenText} />
                </TouchableOpacity>
              )}
            />

            <View style={s.earningsRow}>
              <View style={s.earningsTotalCol}>
                <Text style={s.earningsTotalLabel}>{t('delivery.totalEarnings', 'Total Earnings')}</Text>
                <Text style={s.earningsTotalValue}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Text style={s.earningsVsLast}>{t('delivery.vsLastWeek', 'vs last week')}</Text>
                  <View style={[s.earningsDeltaPill, earningsDelta < 0 && { backgroundColor: C.redLight }]}>
                    <Feather name={earningsDelta < 0 ? 'arrow-down' : 'arrow-up'} size={10} color={earningsDelta < 0 ? C.redText : C.greenText} />
                    <Text style={[s.earningsDeltaText, earningsDelta < 0 && { color: C.redText }]}>{Math.abs(earningsDelta)}%</Text>
                  </View>
                </View>
              </View>
              <View style={s.earningsChartCol}>
                <EarningsChart data={weekData} labels={weekLabels} highlightIndex={highlightIndex} />
              </View>
            </View>

            <View style={s.earningsBreakdownRow}>
              <View style={s.earningsBreakdownItem}>
                <Feather name="tag" size={13} color={C.gray400} />
                <Text style={s.breakdownLabel}>{t('delivery.delivery', 'Delivery')}</Text>
                <Text style={s.breakdownValue}>₹{earningsBreakdown.delivery.toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.earningsBreakdownDivider} />
              <View style={s.earningsBreakdownItem}>
                <Feather name="tag" size={13} color={C.gray400} />
                <Text style={s.breakdownLabel}>{t('delivery.tips', 'Tips')}</Text>
                <Text style={s.breakdownValue}>₹{earningsBreakdown.tips.toLocaleString('en-IN')}</Text>
              </View>
              <View style={s.earningsBreakdownDivider} />
              <View style={s.earningsBreakdownItem}>
                <Feather name="star" size={13} color={C.gray400} />
                <Text style={s.breakdownLabel}>{t('delivery.incentives', 'Incentives')}</Text>
                <Text style={s.breakdownValue}>₹{earningsBreakdown.incentives.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.viewAllEarningsBtn} onPress={() => safeNavigate('Earnings')} activeOpacity={0.8}>
              <Text style={s.viewAllEarningsText}>{t('delivery.viewAllEarnings', 'View All Earnings')}</Text>
              <Feather name="chevron-right" size={16} color={C.greenText} />
            </TouchableOpacity>
          </View>

          {/* ── Recent deliveries ── */}
          <View style={s.sectionCard}>
            <View style={s.recentHeader}>
              <Text style={s.cardTitle}>{t('delivery.recentDeliveries', 'Recent Deliveries')}</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                onPress={() => safeNavigate('History')}
              >
                <Text style={s.viewAllLink}>{t('common.viewAll', 'View All')}</Text>
                <Feather name="chevron-right" size={14} color={C.greenText} />
              </TouchableOpacity>
            </View>
            {recentDeliveries.length === 0 ? (
              <View style={s.emptyState}>
                <Feather name="package" size={22} color={C.gray300} />
                <Text style={s.emptyStateText}>{t('delivery.noRecentDeliveries', 'No deliveries yet')}</Text>
              </View>
            ) : (
              recentDeliveries.map((item, idx) => (
                <DeliveryRow key={item.orderId + idx} item={item} last={idx === recentDeliveries.length - 1} />
              ))
            )}
          </View>

          {/* ── Language setting ── */}
          <TouchableOpacity
            style={s.langBtn}
            onPress={() => setShowLanguage(true)}
            activeOpacity={0.8}
          >
            <View style={s.langBtnLeft}>
              <Text style={s.langBtnIcon}>🌐</Text>
              <View>
                <Text style={s.langBtnLabel}>{t('profile.language', 'Language')}</Text>
                <Text style={s.langBtnSub}>{t('profile.languageSub', 'Change app language')}</Text>
              </View>
            </View>
            <Text style={s.langBtnArrow}>›</Text>
          </TouchableOpacity>

          {/* ── Switch Profile ── */}
          <TouchableOpacity
            style={[s.logoutBtn, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', marginBottom: 8 }]}
            onPress={async () => { await setActiveRole(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.logoutText, { color: '#3B82F6' }]}>Switch Profile</Text>
          </TouchableOpacity>

          {/* ── Log out ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={() => setShowLogout(true)} activeOpacity={0.8}>
            <Text style={s.logoutText}>{t('profile.logout', 'Log out')}</Text>
          </TouchableOpacity>

        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <LogoutModal
        visible={showLogout}
        onConfirm={handleLogout}
        onCancel={() => setShowLogout(false)}
      />

      <EditDocumentModal
        visible={!!editingDoc}
        docType={editingDoc}
        initialValue={
          editingDoc === 'licence' ? licenceNumber :
          editingDoc === 'aadhaar' ? aadhaarNumber :
          editingDoc === 'pan' ? panNumber : ''
        }
        initialExpiry={editingDoc === 'licence' ? licenceExpiry : ''}
        saving={savingDoc}
        onSave={handleSaveDocument}
        onCancel={() => !savingDoc && setEditingDoc(null)}
      />

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

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowLogoutModal(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderRadius: 20,
              padding: 24,
              width: '80%',
              alignItems: 'center',
            }}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, marginBottom: 8 }}>
              {t('profile.logoutConfirmTitle', 'Log out')}
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray500, marginBottom: 24, textAlign: 'center' }}>
              {t('profile.logoutConfirmMsg', 'Are you sure you want to log out?')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.gray200, alignItems: 'center' }}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray700 }}>
                  {t('delivery.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.red, alignItems: 'center' }}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: C.white }}>
                  {t('profile.logout', 'Log out')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ─────────────────────────── edit document modal ─────────────────────────── */
// docType: 'licence' | 'aadhaar' | 'pan'
function EditDocumentModal({ visible, docType, initialValue, initialExpiry, saving, onSave, onCancel }) {
  const [value, setValue] = useState('');
  const [expiry, setExpiry] = useState('');

  useEffect(() => {
    if (visible) {
      setValue(initialValue || '');
      setExpiry(initialExpiry || '');
    }
  }, [visible, initialValue, initialExpiry]);

  const config = {
    licence: { title: 'Edit Driving Licence', label: 'Licence number', placeholder: 'e.g. DL0420110149646', icon: 'credit-card', maxLength: 20, showExpiry: true },
    aadhaar: { title: 'Edit Aadhaar Card', label: 'Aadhaar number', placeholder: '12-digit Aadhaar number', icon: 'user', maxLength: 12, keyboardType: 'number-pad', showExpiry: false },
    pan:     { title: 'Edit PAN Card', label: 'PAN number', placeholder: 'e.g. ABCDE1234F', icon: 'file', maxLength: 10, autoCapitalize: 'characters', showExpiry: false },
  }[docType] || {};

  const canSave = value.trim().length > 0 && !saving;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={lm.backdrop} onPress={onCancel}>
          <Pressable style={dm.card} onPress={() => { }}>
            <View style={dm.iconWrap}>
              <Feather name={config.icon} size={22} color={C.greenDark} />
            </View>
            <Text style={dm.title}>{config.title}</Text>

            <Text style={dm.fieldLabel}>{config.label}</Text>
            <TextInput
              style={dm.input}
              value={value}
              onChangeText={setValue}
              placeholder={config.placeholder}
              placeholderTextColor={C.gray400}
              maxLength={config.maxLength}
              keyboardType={config.keyboardType}
              autoCapitalize={config.autoCapitalize || 'none'}
              editable={!saving}
            />

            {config.showExpiry && (
              <>
                <Text style={[dm.fieldLabel, { marginTop: 12 }]}>Expiry (YYYY-MM)</Text>
                <TextInput
                  style={dm.input}
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="e.g. 2028-04"
                  placeholderTextColor={C.gray400}
                  maxLength={7}
                  editable={!saving}
                />
              </>
            )}

            <View style={lm.btns}>
              <TouchableOpacity style={lm.cancel} onPress={onCancel} disabled={saving}>
                <Text style={lm.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dm.confirm, !canSave && { opacity: 0.5 }]}
                onPress={() => canSave && onSave({ value: value.trim(), expiry: expiry.trim() })}
                disabled={!canSave}
              >
                {saving
                  ? <ActivityIndicator size="small" color={C.white} />
                  : <Text style={lm.confirmText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const dm = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 24, padding: 24, width: '86%', gap: 4 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: C.gray500, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: C.gray900,
  },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.greenDark, alignItems: 'center', justifyContent: 'center' },
});

/* ─────────────────────────── logout modal ─────────────────────────── */
function LogoutModal({ visible, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={lm.backdrop} onPress={onCancel}>
        <Pressable style={lm.card} onPress={() => { }}>
          <LinearGradient colors={["#FEF2F2", "#FFF"]} style={lm.iconWrap}>
            <Feather name="log-out" size={26} color={C.red} />
          </LinearGradient>
          <Text style={lm.title}>Log out?</Text>
          <View style={lm.btns}>
            <TouchableOpacity style={lm.cancel} onPress={onCancel}>
              <Text style={lm.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={lm.confirm} onPress={onConfirm}>
              <Text style={lm.confirmText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const lm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.white, borderRadius: 24, padding: 28, width: "82%", alignItems: "center", gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "900", color: C.gray900 },
  btns: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  cancel: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.gray100, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: C.gray700 },
  confirm: { flex: 1, paddingVertical: 14, borderRadius: 13, backgroundColor: C.red, alignItems: "center" },
  confirmText: { fontSize: 15, fontWeight: "700", color: C.white },
});

/* ─────────────────────────── styles ─────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  topBar: {
    backgroundColor: C.heroBg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 34 : 56,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  topBarBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: C.white },
  notifBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.red,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: C.heroBg,
  },
  notifBadgeText: { fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold', color: C.white },

  heroWrap: { paddingHorizontal: 16, paddingTop: 4, backgroundColor: C.heroBg, paddingBottom: 20 },
  hero: {
    borderRadius: 24,
    padding: 18,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 30 },
  avatarText:   { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white },
  onlineDot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.heroBg,
  },
  heroName:     { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white, letterSpacing: -0.2 },
  verifiedIcon: {
    width: 17, height: 17, borderRadius: 9, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  heroRole: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.heroSub },
  verifiedPill: { backgroundColor: 'rgba(34,197,94,0.20)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedPillText: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: '#6EE7A0' },
  heroRating: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.white },
  heroReviews: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.heroSub },

  levelHex: {
    width: 60, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 14,
  },
  levelHexNum: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white },
  levelHexLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold', color: C.white, marginTop: 2 },
  levelHexSub: { fontSize: 9, fontFamily: 'PlusJakartaSans_500Medium', color: C.heroSub },

  heroContactRow: { flexDirection: 'row', gap: 18, marginTop: 14, flexWrap: 'wrap' },
  heroContactItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroContactText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.heroSub, maxWidth: 170 },

  levelPanel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 14, marginTop: 16,
  },
  levelPanelTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.white },
  levelPanelCount: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: C.heroSub },
  progressTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: 7, backgroundColor: C.green, borderRadius: 4 },
  levelPanelHint: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.heroSub },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  /* stats grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statTile: {
    width: (SCREEN_W - 32 - 10) / 2,
    backgroundColor: C.white, borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  statIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900 },
  statLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: C.gray700, marginTop: 2 },
  statSub:   { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400, marginTop: 1 },

  /* quick actions */
  quickActionsBar: {
    flexDirection: 'row', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 6,
  },
  quickAction: { flex: 1, alignItems: 'center', gap: 8 },
  quickActionLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: C.white, textAlign: 'center' },

  /* generic card */
  sectionCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900 },

  /* vehicle info columns */
  infoColsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoCol: { flex: 1 },
  infoColTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  infoColLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
  infoColValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900 },

  /* documents */
  viewAllPill: { backgroundColor: C.greenLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  viewAllPillText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: C.greenText },
  docRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  docRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  docIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.gray100, alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: C.gray900 },
  docValue: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400, marginTop: 2, maxWidth: 180 },
  docRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docStatus: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  docCheck: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  docEditBtn: { paddingLeft: 4, paddingVertical: 2 },

  /* earnings */
  periodPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.greenLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  periodPillText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: C.greenText },
  earningsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  earningsTotalCol: { width: 90 },
  earningsTotalLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
  earningsTotalValue: { fontSize: 21, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, marginTop: 4 },
  earningsVsLast: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
  earningsDeltaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: C.greenLight, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2,
  },
  earningsDeltaText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: C.greenText },
  earningsChartCol: { flex: 1, alignItems: 'flex-end' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },

  earningsBreakdownRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.gray100, borderRadius: 14, padding: 12, marginTop: 16,
  },
  earningsBreakdownItem: { flex: 1, alignItems: 'center', gap: 3 },
  earningsBreakdownDivider: { width: 1, height: 28, backgroundColor: C.gray200 },
  breakdownLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray500 },
  breakdownValue: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900 },

  viewAllEarningsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: C.greenLight, borderRadius: 14, paddingVertical: 12, marginTop: 12,
  },
  viewAllEarningsText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.greenText },

  /* recent deliveries */
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  viewAllLink: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: C.greenText },
  deliveryRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  deliveryIconWrap: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: C.greenLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  deliveryOrderId: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900 },
  deliveryMeta: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
  deliveryStatusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  deliveryStatusText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold' },
  deliveryAmount: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900 },
  deliveryTime: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400, marginTop: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  emptyStateText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },

  /* footer buttons */
  logoutBtn: {
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: C.redBorder, backgroundColor: C.redBackground,
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