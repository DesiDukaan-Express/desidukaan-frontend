import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Platform,
  Modal, Pressable, TextInput, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';

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
  starColor:  '#F59E0B',
  blue:       '#3B82F6',
};

const TABS = ['Today', 'This Week', 'This Month'];

function HistoryCard({ delivery, onRate, onViewRating }) {
  const { t } = useTranslation();
  const isDelivered = delivery.status === 'delivered';
  const isFailed = delivery.status === 'failed';
  const isDeclined = delivery.status === 'declined' || delivery.action_type === 'declined';
  const earnings = delivery.partner_earnings || 0;
  const pickupName = delivery.order?.vendor?.shop_name || 'Unknown Store';
  const dropCity = delivery.order?.delivery_address?.city
    || delivery.order?.delivery_address?.address_line
    || 'Local';
  const orderTime = delivery.delivered_at || delivery.created_at;
  const timeStr = orderTime
    ? new Date(orderTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';
  const dateStr = orderTime
    ? new Date(orderTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  const cardColor = isDelivered ? C.greenLight : isDeclined ? '#FFF7ED' : C.redLight;
  const iconColor = isDelivered ? C.greenText : isDeclined ? '#C2410C' : C.redText;
  const iconChar = isDelivered ? '↓' : isDeclined ? '—' : '✕';
  const statusLabel = isDelivered
    ? t('delivery.delivered', 'Delivered')
    : isDeclined
      ? t('delivery.declined', 'Declined')
      : t('delivery.failed', 'Failed');

  return (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <View style={[s.cardIcon, { backgroundColor: cardColor }]}>
          <Text style={[s.cardIconText, { color: iconColor }]}>
            {iconChar}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.cardRow}>
          <Text style={s.cardOrderId} numberOfLines={1}>
            {delivery.order?.order_number || `#${delivery.order_id || delivery.id}`}
          </Text>
          <Text style={[s.cardEarnings, { color: isDelivered ? C.greenDark : C.gray400 }]}>
            {isDelivered ? `+₹${Math.round(earnings)}` : '—'}
          </Text>
        </View>
        <View style={s.cardRouteRow}>
          <View style={[s.dot, { backgroundColor: C.blue }]} />
          <Text style={s.routeText} numberOfLines={1}>{pickupName}</Text>
          <View style={s.routeLine} />
          <View style={[s.dot, { backgroundColor: C.red }]} />
          <Text style={s.routeText} numberOfLines={1}>{dropCity}</Text>
        </View>
        <View style={s.cardMeta}>
          <Text style={s.metaTime}>{dateStr}  {timeStr}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={[s.statusPill, { backgroundColor: isDelivered ? C.greenLight : C.redLight }]}>
              <Text style={[s.statusPillText, { color: isDelivered ? C.greenText : C.redText }]}>
                {isDelivered ? t('delivery.delivered', 'Delivered') : t('delivery.failed', 'Failed')}
              </Text>
            </View>

            {isDelivered && (
              <TouchableOpacity
                style={[
                  s.rateBtn,
                  delivery.has_rated_customer && { backgroundColor: C.gray100, borderWidth: 1, borderColor: C.gray200 }
                ]}
                onPress={() => delivery.has_rated_customer ? onViewRating(delivery) : onRate(delivery)}
                activeOpacity={0.7}
              >
                {delivery.has_rated_customer ? (() => {
                  const custRating = delivery.partner_rating || (delivery.order?.reviews?.[0]?.partner_review_rating);
                  const storeRating = delivery.partner_store_rating || (delivery.order?.reviews?.[0]?.partner_to_vendor_rating);
                  const ratingVal = custRating || storeRating;
                  const num = ratingVal ? parseInt(ratingVal, 10) || 5 : 5;
                  const starsText = "★".repeat(Math.max(1, Math.min(5, num)));
                  return (
                    <Text style={[s.rateBtnText, { color: C.gray600 }]}>
                      You rated <Text style={{ color: C.starColor, fontWeight: "900" }}>{starsText}</Text>
                    </Text>
                  );
                })() : (
                  <Text style={s.rateBtnText}>{t('delivery.rateCustomer', 'Rate')}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { token } = useAuthStore();
  const { t } = useTranslation();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [activeTabKey, setActiveTabKey] = useState('today');
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Partner review state
  const [partnerReviewOrder, setPartnerReviewOrder] = useState(null);
  const [partnerReviewRating, setPartnerReviewRating] = useState(0);
  const [partnerReviewComment, setPartnerReviewComment] = useState("");
  const [partnerStoreRating, setPartnerStoreRating] = useState(0);
  const [partnerStoreComment, setPartnerStoreComment] = useState("");
  const [partnerReviewLoading, setPartnerReviewLoading] = useState(false);

  // Partner view rating state & handler
  const [viewPartnerRatingOrder, setViewPartnerRatingOrder] = useState(null);
  const [viewPartnerRatingLoading, setViewPartnerRatingLoading] = useState(false);
  const [fetchedPartnerRating, setFetchedPartnerRating] = useState(null);

  const handleOpenViewPartnerRating = async (delivery) => {
    setViewPartnerRatingOrder(delivery);
    setViewPartnerRatingLoading(true);
    const initialRating = delivery.partner_rating || delivery.order?.reviews?.[0]?.partner_review_rating || null;
    const initialComment = delivery.partner_review_comment || delivery.order?.reviews?.[0]?.partner_review_comment || delivery.order?.reviews?.[0]?.comment || "";
    
    const initialStoreRating = delivery.partner_store_rating || delivery.order?.reviews?.[0]?.partner_to_vendor_rating || null;
    const initialStoreComment = delivery.order?.reviews?.[0]?.partner_to_vendor_comment || "";
    
    setFetchedPartnerRating({ rating: initialRating, comment: initialComment, storeRating: initialStoreRating, storeComment: initialStoreComment });

    const orderId = delivery.order?.id || delivery.order_id || delivery.id;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const o = data.data?.order || data.order;
      if (o) {
        setFetchedPartnerRating({
          rating: o.partner_rating ?? o.reviews?.[0]?.partner_review_rating ?? initialRating,
          comment: o.partner_review_comment ?? o.reviews?.[0]?.partner_review_comment ?? initialComment,
          storeRating: o.reviews?.[0]?.partner_to_vendor_rating ?? initialStoreRating,
          storeComment: o.reviews?.[0]?.partner_to_vendor_comment ?? initialStoreComment,
        });
      }
    } catch (e) {
      console.error("Fetch partner rating error:", e);
    } finally {
      setViewPartnerRatingLoading(false);
    }
  };

  const submitPartnerReview = async () => {
    if (partnerReviewRating === 0 && partnerStoreRating === 0) {
      Alert.alert("Please provide at least one rating");
      return;
    }
    setPartnerReviewLoading(true);
    const orderId = partnerReviewOrder.order?.id || partnerReviewOrder.order_id || partnerReviewOrder.id;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/partner-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partner_review_rating: partnerReviewRating,
          partner_review_comment: partnerReviewComment,
          partner_to_vendor_rating: partnerStoreRating,
          partner_to_vendor_comment: partnerStoreComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAllDeliveries((prev) =>
          prev.map((d) =>
            (d.id === partnerReviewOrder.id || d.order?.id === orderId)
              ? {
                  ...d,
                  has_rated_customer: true,
                  partner_rating: partnerReviewRating > 0 ? partnerReviewRating : d.partner_rating,
                  partner_store_rating: partnerStoreRating > 0 ? partnerStoreRating : d.partner_store_rating,
                  partner_review_comment: partnerReviewComment || d.partner_review_comment,
                }
              : d
          )
        );
        setPartnerReviewOrder(null);
        setPartnerReviewRating(0);
        setPartnerReviewComment("");
        setPartnerStoreRating(0);
        setPartnerStoreComment("");
        fetchData();
        Alert.alert("Thank you!", "Your rating has been submitted.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to submit review.");
    } finally {
      setPartnerReviewLoading(false);
    }
  };

  const TABS = [
    { key: 'today', label: t('delivery.today', 'Today') },
    { key: 'week', label: t('delivery.thisWeek', 'This Week') },
    { key: 'month', label: t('delivery.thisMonth', 'This Month') },
  ];

  const fetchData = useCallback(async () => {
    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/delivery/history?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/delivery/stats`,             { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const historyData = await historyRes.json();
      const statsData   = await statsRes.json();
      if (historyData.success) setAllDeliveries(historyData.data?.deliveries || historyData.data || []);
      if (statsData.success)   setStats(statsData.data);
    } catch (e) {
      console.log('History fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filterDeliveries = () => {
    const now = new Date();
    return allDeliveries.filter(d => {
      const date = new Date(d.delivered_at || d.created_at);
      if (activeTabKey === 'today') return date.toDateString() === now.toDateString();
      if (activeTabKey === 'week')  { const wa = new Date(now); wa.setDate(now.getDate() - 7); return date >= wa; }
      if (activeTabKey === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filtered      = filterDeliveries();
  const deliveredCount = filtered.filter(d => d.status === 'delivered').length;
  const failedCount    = filtered.filter(d => d.status === 'failed').length;
  const declinedCount  = filtered.filter(d => d.status === 'declined' || d.action_type === 'declined').length;
  const totalEarnings  = filtered.reduce((sum, d) =>
    sum + (d.status === 'delivered' ? (d.partner_earnings || 0) : 0), 0);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: C.heroBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.green} />
      </View>
    );
  }

  const currentTabLabel = TABS.find(t => t.key === activeTabKey)?.label || '';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.heroBg} />

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroTitle}>{t('delivery.history', 'History')}</Text>
            <Text style={s.heroSub}>{t('delivery.yourDeliveryRecord', 'Your delivery record')}</Text>
          </View>
          <View style={s.heroEarningBox}>
            <Text style={s.heroEarningLabel}>{t('delivery.periodEarnings', 'PERIOD EARNINGS')}</Text>
            <Text style={s.heroEarningValue}>₹{Math.round(totalEarnings).toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.heroStats}>
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{deliveredCount}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.delivered', 'Delivered')}</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatValue, { color: '#FCA5A5' }]}>{failedCount}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.failed', 'Failed')}</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={[s.heroStatValue, { color: '#FDBA74' }]}>{declinedCount}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.declined', 'Declined')}</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{stats?.totalDeliveries || 0}</Text>
            <Text style={s.heroStatLabel}>{t('delivery.allTime', 'All-time')}</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}>
            <Text style={s.heroStatValue}>{stats?.acceptanceRate ?? 100}%</Text>
            <Text style={s.heroStatLabel}>{t('delivery.acceptRate', 'Accept rate')}</Text>
          </View>
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={s.tabsWrap}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTabKey === tab.key && s.tabActive]}
            onPress={() => setActiveTabKey(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, activeTabKey === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        {/* ── Earnings breakdown card ── */}
        <View style={s.earningsCard}>
          <View style={s.earningsCardHeader}>
            <Text style={s.earningsCardTitle}>{t('delivery.earningsBreakdown', 'Earnings breakdown')}</Text>
            <Text style={s.earningsCardTotal}>₹{Math.round(totalEarnings).toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.earningsRow}>
            <Text style={s.earningsLabel}>{t('delivery.basePay', 'Base pay (80% of fee)')}</Text>
            <Text style={s.earningsValue}>₹{Math.round(totalEarnings * 0.8).toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.earningsRow}>
            <Text style={s.earningsLabel}>{t('delivery.acceptanceBonus', 'Acceptance rate bonus')}</Text>
            <Text style={[s.earningsValue, { color: C.greenDark }]}>{stats?.acceptanceRate ?? 100}%</Text>
          </View>
          <View style={[s.earningsRow, { borderBottomWidth: 0 }]}>
            <Text style={s.earningsLabel}>{t('delivery.totalDeliveriesAllTime', 'Total deliveries (all-time)')}</Text>
            <Text style={s.earningsValue}>{stats?.totalDeliveries || 0}</Text>
          </View>
        </View>

        {/* ── List header ── */}
        <Text style={s.listHeader}>
          {filtered.length} {currentTabLabel.toLowerCase()}
        </Text>

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyTitle}>{t('delivery.noDeliveries', { period: currentTabLabel.toLowerCase(), defaultValue: `No deliveries ${currentTabLabel.toLowerCase()}` })}</Text>
            <Text style={s.emptySub}>{t('delivery.pullToRefresh', 'Pull down to refresh')}</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {filtered.map((delivery, idx) => (
              <React.Fragment key={delivery.id}>
                <HistoryCard
                  delivery={delivery}
                  onRate={(d) => {
                    setPartnerReviewOrder(d);
                    setPartnerReviewRating(0);
                    setPartnerReviewComment("");
                  }}
                  onViewRating={(d) => handleOpenViewPartnerRating(d)}
                />
                {idx < filtered.length - 1 && <View style={s.divider} />}
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── PARTNER REVIEW CUSTOMER MODAL ── */}
      <Modal
        visible={!!partnerReviewOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setPartnerReviewOrder(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setPartnerReviewOrder(null)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '90%',
            }}
            onPress={() => {}}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: C.gray200,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
              {/* ── Rate Customer ── */}
              <View style={{ marginBottom: 24, backgroundColor: C.gray100, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.gray200 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: C.gray900,
                    marginBottom: 4,
                  }}
                >
                  Rate Customer
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, marginBottom: 16 }}>
                  {partnerReviewOrder?.order?.customer?.name || partnerReviewOrder?.order?.order_number || "Customer"}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 16,
                    justifyContent: "center",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setPartnerReviewRating(star)}
                    >
                      <Text
                        style={{
                          fontSize: 36,
                          opacity: star <= partnerReviewRating ? 1 : 0.25,
                        }}
                      >
                        ⭐
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={{
                    backgroundColor: C.white,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: C.gray900,
                    minHeight: 80,
                    textAlignVertical: "top",
                    borderWidth: 1,
                    borderColor: C.gray200,
                  }}
                  placeholder="Tell us about the customer (optional)"
                  placeholderTextColor={C.gray400}
                  multiline
                  value={partnerReviewComment}
                  onChangeText={setPartnerReviewComment}
                />
              </View>

              {/* ── Rate Store ── */}
              <View style={{ marginBottom: 24, backgroundColor: C.gray100, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.gray200 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "900",
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: C.gray900,
                    marginBottom: 4,
                  }}
                >
                  Rate Store
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, marginBottom: 16 }}>
                  {partnerReviewOrder?.order?.vendor?.shop_name || "Store"}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginBottom: 16,
                    justifyContent: "center",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setPartnerStoreRating(star)}
                    >
                      <Text
                        style={{
                          fontSize: 36,
                          opacity: star <= partnerStoreRating ? 1 : 0.25,
                        }}
                      >
                        ⭐
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={{
                    backgroundColor: C.white,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: C.gray900,
                    minHeight: 80,
                    textAlignVertical: "top",
                    borderWidth: 1,
                    borderColor: C.gray200,
                  }}
                  placeholder="Tell us about the pickup experience (optional)"
                  placeholderTextColor={C.gray400}
                  multiline
                  value={partnerStoreComment}
                  onChangeText={setPartnerStoreComment}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={submitPartnerReview}
              disabled={partnerReviewLoading}
              style={{
                backgroundColor: partnerReviewLoading ? C.gray200 : C.greenDark,
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {partnerReviewLoading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text
                  style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.white }}
                >
                  Submit Review
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── VIEW SUBMITTED PARTNER RATING SLIDE-UP MODAL ── */}
      <Modal
        visible={!!viewPartnerRatingOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setViewPartnerRatingOrder(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setViewPartnerRatingOrder(null)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              maxHeight: '90%',
            }}
            onPress={() => {}}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: C.gray200,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray900 }}>
                Your Submitted Ratings
              </Text>
              <TouchableOpacity onPress={() => setViewPartnerRatingOrder(null)} style={{ padding: 4 }}>
                <Feather name="x" size={20} color={C.gray500} />
              </TouchableOpacity>
            </View>

            {viewPartnerRatingLoading ? (
              <View style={{ padding: 30, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={C.greenDark} size="small" />
                <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, marginTop: 10 }}>Fetching your reviews…</Text>
              </View>
            ) : (
              <>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
                  {(() => {
                    const custRating = fetchedPartnerRating?.rating;
                    const custNum = custRating != null ? (typeof custRating === "number" ? custRating : parseInt(custRating, 10)) : null;
                    const custComment = fetchedPartnerRating?.comment || "";

                    const storeRating = fetchedPartnerRating?.storeRating;
                    const storeNum = storeRating != null ? (typeof storeRating === "number" ? storeRating : parseInt(storeRating, 10)) : null;
                    const storeComment = fetchedPartnerRating?.storeComment || "";

                    return (
                      <>
                        {/* Customer Rating Section */}
                        <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: C.gray900, marginBottom: 8, marginLeft: 4 }}>
                          Customer: {viewPartnerRatingOrder?.order?.customer?.name || viewPartnerRatingOrder?.order?.order_number || "Customer"}
                        </Text>
                        <View
                          style={{
                            backgroundColor: C.gray100,
                            borderWidth: 1,
                            borderColor: C.gray200,
                            borderRadius: 16,
                            padding: 20,
                            alignItems: "center",
                            marginBottom: 24,
                          }}
                        >
                          {custNum !== null ? (
                            <>
                              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Text
                                    key={`c-${star}`}
                                    style={{
                                      fontSize: 36,
                                      opacity: star <= custNum ? 1 : 0.25,
                                    }}
                                  >
                                    ⭐
                                  </Text>
                                ))}
                              </View>

                              <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray900, marginBottom: custComment ? 12 : 0 }}>
                                {custNum} out of 5 stars
                              </Text>

                              {custComment ? (
                                <View
                                  style={{
                                    backgroundColor: C.white,
                                    borderRadius: 12,
                                    padding: 14,
                                    borderWidth: 1,
                                    borderColor: C.gray200,
                                    width: "100%",
                                  }}
                                >
                                  <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: C.gray800, lineHeight: 20 }}>
                                    {custComment}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, fontStyle: "italic", marginTop: 4 }}>
                                  No written comment provided
                                </Text>
                              )}
                            </>
                          ) : (
                            <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray400 }}>
                              Not Rated
                            </Text>
                          )}
                        </View>

                        {/* Store Rating Section */}
                        <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_700Bold", color: C.gray900, marginBottom: 8, marginLeft: 4 }}>
                          Store: {viewPartnerRatingOrder?.order?.vendor?.shop_name || "Store"}
                        </Text>
                        <View
                          style={{
                            backgroundColor: C.gray100,
                            borderWidth: 1,
                            borderColor: C.gray200,
                            borderRadius: 16,
                            padding: 20,
                            alignItems: "center",
                            marginBottom: 20,
                          }}
                        >
                          {storeNum !== null ? (
                            <>
                              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Text
                                    key={`s-${star}`}
                                    style={{
                                      fontSize: 36,
                                      opacity: star <= storeNum ? 1 : 0.25,
                                    }}
                                  >
                                    ⭐
                                  </Text>
                                ))}
                              </View>

                              <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray900, marginBottom: storeComment ? 12 : 0 }}>
                                {storeNum} out of 5 stars
                              </Text>

                              {storeComment ? (
                                <View
                                  style={{
                                    backgroundColor: C.white,
                                    borderRadius: 12,
                                    padding: 14,
                                    borderWidth: 1,
                                    borderColor: C.gray200,
                                    width: "100%",
                                  }}
                                >
                                  <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_500Medium", color: C.gray800, lineHeight: 20 }}>
                                    {storeComment}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: C.gray400, fontStyle: "italic", marginTop: 4 }}>
                                  No written comment provided
                                </Text>
                              )}
                            </>
                          ) : (
                            <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.gray400 }}>
                              Not Rated
                            </Text>
                          )}
                        </View>
                      </>
                    );
                  })()}
                </ScrollView>

                <TouchableOpacity
                  onPress={() => setViewPartnerRatingOrder(null)}
                  style={{
                    backgroundColor: C.greenDark,
                    borderRadius: 14,
                    padding: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "800", fontFamily: "PlusJakartaSans_800ExtraBold", color: C.white }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  hero: {
    backgroundColor: C.heroBg,
    paddingTop: Platform.OS === 'android' ? 36 : 58,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: C.white, letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium',
    color: C.heroSub, marginTop: 4,
  },
  heroEarningBox: { alignItems: 'flex-end' },
  heroEarningLabel: {
    fontSize: 9, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: 'rgba(255,255,255,0.60)', letterSpacing: 1.1, marginBottom: 4,
  },
  heroEarningValue: {
    fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: C.white,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: C.heroStatBg,
    borderRadius: 16, paddingVertical: 14,
  },
  heroStat:        { flex: 1, alignItems: 'center' },
  heroStatValue:   { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.white, marginBottom: 2 },
  heroStatLabel:   { fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium', color: 'rgba(255,255,255,0.60)' },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
  },
  tab:          { flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: 'center', backgroundColor: C.gray100 },
  tabActive:    { backgroundColor: C.heroBg },
  tabText:      { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray500 },
  tabTextActive:{ color: C.white },

  earningsCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  earningsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  earningsCardTitle:  { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, letterSpacing: 0.2 },
  earningsCardTotal:  { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.greenDark },
  earningsRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: C.gray200 },
  earningsLabel:  { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray500 },
  earningsValue:  { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray900 },

  listHeader: {
    fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: C.gray400, letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: C.white, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  divider: { height: 1, backgroundColor: C.gray100 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  cardLeft: {},
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cardIconText: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardOrderId: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: C.gray900, flex: 1 },
  cardEarnings: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cardRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  dot:  { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  routeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray700, flexShrink: 1, maxWidth: '38%' },
  routeLine: { flex: 1, height: 1, backgroundColor: C.gray200 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTime: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  rateBtn: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  rateBtnText: {
    fontSize: 11,
    fontFamily: "PlusJakartaSans_700Bold",
    color: C.greenText,
  },

  emptyWrap:  { alignItems: 'center', paddingVertical: 56 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: C.gray700, marginBottom: 6 },
  emptySub:   { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: C.gray400 },
});