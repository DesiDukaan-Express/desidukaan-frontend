import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { colors } from '../../styles/colors';


export default function DeliveryHomeScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXvRJ5uAag29sOgtWo_pQPi99ZFNQ2YxnVbjW0d-MHyX_5l8iYftbw08TIu_C6onyCLnCZapEwM4HGFYiJRL-BlxAR7uC9yLkWBZd0JYc3lKdaVqPS0YEuQcKaWsgNYcfM9Dieoa_9PxXUlH2-IqZ-_fdAP1I6bFHPqk8NxaCqG7kSJG0DIflLxJJWBCfD4CCoMBYnGoGU8Kq0hk_RtyHqe4SVUoeq01ALlirshZU5HPbPqAc5btuUtyfqjBdybV9sqOCu9VGYdfk' }}
            style={styles.profilePic}
          />
          <Text style={styles.headerTitle}>DesiDukaan</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>ONLINE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationBtn}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Earnings Card - Clean White & Blue */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Text style={styles.earningsSubtitle}>TODAY'S EARNINGS</Text>
            <Text style={{ fontSize: 16 }}>📈</Text>
          </View>
          <View style={styles.earningsAmountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.earningsAmount}>1,240</Text>
          </View>
          <View style={styles.earningsFooterRow}>
            <View style={styles.liveUpdateBadge}>
              <Text style={styles.liveUpdateText}>LIVE UPDATE</Text>
            </View>
            <Text style={styles.earningsChange}>+₹120 since 1h ago</Text>
          </View>
        </View>

        {/* Bento Grid Mini Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ORDERS</Text>
            <Text style={styles.statValue}>12</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ONLINE</Text>
            <Text style={styles.statValue}>5.5h</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ACCEPT</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>92%</Text>
          </View>
        </View>

        {/* Earning Insights */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Earning Insights</Text>
              <Text style={styles.sectionSubtitle}>Vs Last Week</Text>
            </View>
            <View style={styles.toggleGroup}>
              <TouchableOpacity style={styles.toggleBtnActive}>
                <Text style={styles.toggleBtnTextActive}>TODAY</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toggleBtnInactive}>
                <Text style={styles.toggleBtnTextInactive}>WEEK</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Simple simulated CSS Graph with flex boxes */}
          <View style={styles.graphContainer}>
            {[25, 40, 60, 100, 50, 75, 66].map((height, index) => (
              <View key={index} style={styles.barWrapper}>
                {index === 3 && (
                  <View style={styles.barTooltip}>
                    <Text style={styles.barTooltipText}>₹320</Text>
                  </View>
                )}
                <View style={[
                  styles.bar,
                  { height: `${height}%`, backgroundColor: index === 3 ? colors.primary : colors.border }
                ]} />
              </View>
            ))}
          </View>
        </View>

        {/* Incentive Progress */}
        <View style={styles.incentiveCard}>
          <View style={styles.incentiveHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginRight: 4 }}>🏅</Text>
              <Text style={styles.incentiveTitle}>Daily Incentive</Text>
            </View>
            <Text style={styles.incentiveBonusText}>₹150 Bonus</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '75%' }]} />
          </View>
          <Text style={styles.incentiveDesc}>
            Complete <Text style={{ fontWeight: 'bold', color: colors.text }}>3 more orders</Text> to unlock your bonus.
          </Text>
        </View>

        {/* Active Order Card - Professional & Clean */}
        <View style={styles.activeOrderCard}>
          <View style={styles.newOrderBadge}>
            <Text style={styles.newOrderBadgeText}>NEW ORDER</Text>
          </View>

          <View style={styles.orderRow}>
            {/* Icons Stack */}
            <View style={styles.orderIconsCol}>
              <View style={styles.dotPrimary} />
              <View style={styles.dashedLine} />
              <View style={styles.dotError} />
            </View>

            {/* Address Stack */}
            <View style={styles.orderAddressCol}>
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>PICKUP</Text>
                <Text style={styles.addressText} numberOfLines={1}>The Burger House, Sector 45</Text>
              </View>
              <View style={{ height: 16 }} />
              <View style={styles.addressBlock}>
                <Text style={styles.addressLabel}>DROP</Text>
                <Text style={styles.addressText} numberOfLines={1}>H-402, Green Valley Apartments</Text>
              </View>
            </View>

            {/* Estimate Block */}
            <View style={styles.orderEstimateCol}>
              <Text style={styles.addressLabel}>ESTIMATE</Text>
              <Text style={styles.estimateAmount}>₹65.00</Text>
              <Text style={styles.estimateDist}>4.2 km</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.orderActionsRow}>
            <TouchableOpacity style={styles.rejectBtn}>
              <Text style={styles.rejectBtnText}>REJECT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn}>
              <Text style={styles.acceptBtnText}>ACCEPT</Text>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>12s</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Text style={{ fontSize: 24, color: '#fff' }}>🎧</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.border,
  },
  headerTitle: {
    fontFamily: 'sans-serif-medium',
    fontSize: 20,
    color: colors.text,
    marginLeft: 14,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 10,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  onlineText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  notificationBtn: {
    padding: 6,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    backgroundColor: colors.error,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  earningsCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  earningsSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  earningsAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '800',
    marginRight: 4,
  },
  earningsAmount: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1.5,
  },
  earningsFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  liveUpdateBadge: {
    backgroundColor: colors.infoLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  liveUpdateText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  earningsChange: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statBox: {
    backgroundColor: colors.surface,
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textLight,
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  insightsCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderColor: colors.border,
    borderWidth: 1,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    padding: 4,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnTextActive: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  toggleBtnInactive: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  toggleBtnTextInactive: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textLight,
  },
  graphContainer: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  barWrapper: {
    flex: 1,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barTooltip: {
    backgroundColor: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    position: 'absolute',
    top: -28,
    zIndex: 2,
  },
  barTooltipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  incentiveCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderColor: colors.border,
    borderWidth: 1,
  },
  incentiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  incentiveTitle: {
    fontWeight: '800',
    color: colors.text,
    fontSize: 16,
  },
  incentiveBonusText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.warning,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: colors.divider,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: 5,
  },
  incentiveDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeOrderCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 24,
    borderColor: colors.primary,
    borderWidth: 1.5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  newOrderBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomLeftRadius: 16,
  },
  newOrderBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  orderIconsCol: {
    alignItems: 'center',
    marginRight: 14,
    paddingTop: 4,
  },
  dotPrimary: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  dotError: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  dashedLine: {
    width: 1.5,
    height: 36,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginVertical: 4,
  },
  orderAddressCol: {
    flex: 1,
  },
  addressBlock: {
    justifyContent: 'center',
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  orderEstimateCol: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  estimateAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  estimateDist: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    marginTop: 2,
  },
  orderActionsRow: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    borderWidth: 1,
  },
  rejectBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginRight: 12,
  },
  countdownBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  }
});
