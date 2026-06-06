import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import useAuthStore from "../../store/authStore";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

// ── Color tokens (matches Dashboard) ────────────────────────────
const C = {
  bg: "#F0F4F8",
  surface: "#FFFFFF",
  primary: "#147538",
  primaryDim: "#14753818",
  primaryDark: "#147540",
  accent: "#0F172A",
  text: "#0F172A",
  textSub: "#64748B",
  textLight: "#94A3B8",
  border: "#E2E8F0",
  blue: "#3B82F6",
  blueDim: "#3B82F615",
  orange: "#F97316",
  orangeDim: "#F9731615",
  purple: "#7C3AED",
  purpleDim: "#7C3AED15",
  green: "#147538",
  heroGrad1: "#1A2E1A",
heroGrad2: "#0F2318",
bg: "#F4F7F5",
};

const PERIOD_TABS = ["Today", "Week", "Month"];

export default function VendorEarningsScreen() {
  const { token } = useAuthStore();
  const { width: SCREEN_W } = useWindowDimensions();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState(null);
  const [periodIndex, setPeriodIndex] = React.useState(1); // default: Week

  // Responsive helpers
  const isSmall = SCREEN_W < 360;
  const isMedium = SCREEN_W >= 360 && SCREEN_W < 420;
  const rs = (sm, md, lg) => (isSmall ? sm : isMedium ? md : lg);
  const chartW = SCREEN_W - 48;

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/vendors/me/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data?.stats) {
          setStats(data.data.stats);
        }
      } catch (err) {
        console.error("Earnings Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading earnings…</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centered}>
        <MaterialIcons name="error-outline" size={40} color={C.textLight} />
        <Text style={styles.loadingText}>Could not load earnings data.</Text>
      </View>
    );
  }

  // ── Derived values ────────────────────────────────────────────
  const periods = [
    {
      label: "Today",
      revenue: Number(stats.today_revenue ?? 0),
      orders: Number(stats.today_orders ?? 0),
      avgOrder:
        stats.today_orders > 0
          ? (stats.today_revenue / stats.today_orders).toFixed(0)
          : 0,
    },
    {
      label: "This Week",
      revenue: Number(stats.weekly_revenue ?? 0),
      orders: Number(stats.weekly_orders ?? 0),
      avgOrder:
        stats.weekly_orders > 0
          ? (stats.weekly_revenue / stats.weekly_orders).toFixed(0)
          : 0,
    },
    {
      label: "This Month",
      revenue: Number(stats.monthly_revenue ?? 0),
      orders: Number(stats.monthly_orders ?? 0),
      avgOrder:
        stats.monthly_orders > 0
          ? (stats.monthly_revenue / stats.monthly_orders).toFixed(0)
          : 0,
    },
  ];

  const curr = periods[periodIndex];

  const chartLabels = stats.weekly_chart_data?.length
    ? stats.weekly_chart_data.map((d) =>
        new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })
      )
    : ["D-6", "D-5", "D-4", "D-3", "D-2", "D-1", "Today"];

  const chartValues = stats.weekly_chart_data?.length
    ? stats.weekly_chart_data.map((d) => Number(d.revenue) || 0)
    : [0, 0, 0, 0, 0, 0, 0];

  const maxChart = Math.max(...chartValues, 1);

  // Top products for breakdown
  const topProducts = stats.top_products || [];

  // Pending payout = today's revenue (placeholder until real payout API)
  const pendingPayout = Number(stats.today_revenue ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      {/* ── HEADER ─────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "ios" ? 52 : 40 },
        ]}
      >
        <View>
          <Text style={[styles.headerOverline, { fontSize: rs(10, 11, 11) }]}>
            VENDOR EARNINGS
          </Text>
          <Text style={[styles.headerTitle, { fontSize: rs(20, 22, 24) }]}>
            Earnings
          </Text>
        </View>
        <View
          style={[
            styles.headerBadge,
            { backgroundColor: C.primaryDim, paddingHorizontal: rs(10, 12, 14) },
          ]}
        >
          <View style={styles.liveDot} />
          <Text style={[styles.headerBadgeText, { fontSize: rs(11, 12, 12) }]}>
            Live
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
      >
        {/* ── PERIOD SELECTOR ──────────────────────────────── */}
        <View style={[styles.periodRow, { marginHorizontal: rs(14, 16, 18) }]}>
          {PERIOD_TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              onPress={() => setPeriodIndex(i)}
              style={[
                styles.periodPill,
                periodIndex === i && styles.periodPillActive,
                { paddingVertical: rs(8, 9, 10), flex: 1 },
              ]}
            >
              <Text
                style={[
                  styles.periodPillText,
                  { fontSize: rs(12, 13, 14) },
                  periodIndex === i && styles.periodPillTextActive,
                ]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── HERO EARNINGS CARD ───────────────────────────── */}
        <View
          style={[
            styles.heroCard,
            {
              marginHorizontal: rs(14, 16, 18),
              marginTop: rs(12, 14, 16),
              padding: rs(18, 20, 22),
              borderRadius: rs(18, 20, 22),
            },
          ]}
        >
          <View style={styles.heroGlow} />
          <Text style={[styles.heroLabel, { fontSize: rs(11, 12, 12) }]}>
            {curr.label.toUpperCase()} REVENUE
          </Text>
          <Text style={[styles.heroAmount, { fontSize: rs(34, 40, 46) }]}>
            ₹{curr.revenue.toLocaleString("en-IN")}
          </Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroChangeBadge}>
              <MaterialIcons name="trending-up" size={12} color={C.primary} />
              <Text style={[styles.heroChangeText, { fontSize: rs(10, 11, 11) }]}>
                +24% vs last period
              </Text>
            </View>
          </View>

          {/* 3 stat pills */}
          <View
            style={[
              styles.heroStrip,
              { marginTop: rs(16, 18, 20), gap: rs(8, 10, 12) },
            ]}
          >
            <HeroStatPill
              icon="receipt-long"
              label="Orders"
              value={curr.orders}
              color={C.blue}
              bg={C.blueDim}
              rs={rs}
            />
            <HeroStatPill
              icon="shopping-bag"
              label="Avg Order"
              value={`₹${curr.avgOrder}`}
              color={C.orange}
              bg={C.orangeDim}
              rs={rs}
            />
            <HeroStatPill
              icon="schedule"
              label="Prep Avg"
              value={`${stats.delivery_efficiency?.avg_prep_time ?? 0}m`}
              color={C.purple}
              bg={C.purpleDim}
              rs={rs}
            />
          </View>
        </View>

        {/* ── WEEKLY TREND CHART ───────────────────────────── */}
        <View
          style={[
            styles.card,
            {
              marginHorizontal: rs(14, 16, 18),
              marginTop: rs(12, 14, 16),
              padding: rs(14, 16, 18),
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}>
                TREND
              </Text>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                Weekly Revenue
              </Text>
            </View>
            <View
              style={[
                styles.miniStatBadge,
                { backgroundColor: C.primaryDim },
              ]}
            >
              <Text
                style={[
                  styles.miniStatBadgeText,
                  { color: C.primaryDark, fontSize: rs(11, 12, 12) },
                ]}
              >
                ₹{chartValues.reduce((a, b) => a + b, 0).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {chartValues.some((v) => v > 0) ? (
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [{ data: chartValues }],
              }}
              width={chartW}
              height={rs(150, 165, 180)}
              yAxisSuffix="₹"
              chartConfig={{
                backgroundGradientFrom: C.surface,
                backgroundGradientTo: C.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(14, 230, 39, ${opacity})`,
                labelColor: () => C.textLight,
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: C.primary,
                  fill: C.surface,
                },
                propsForBackgroundLines: {
                  stroke: C.border,
                  strokeDasharray: "4",
                },
              }}
              bezier
              style={{ borderRadius: 12, marginTop: 12, marginLeft: -8 }}
            />
          ) : (
            <View style={styles.emptyChart}>
              <MaterialIcons name="show-chart" size={32} color={C.border} />
              <Text style={styles.emptyText}>No data this week</Text>
            </View>
          )}

          {/* Day bars mini-legend */}
          <View style={[styles.barRow, { marginTop: rs(10, 12, 14) }]}>
            {chartValues.map((v, i) => {
              const pct = maxChart > 0 ? v / maxChart : 0;
              return (
                <View key={i} style={styles.barItem}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(pct * 100, 4)}%`,
                          backgroundColor:
                            i === chartValues.length - 1
                              ? C.primary
                              : C.primaryDim,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barLabel, { fontSize: rs(8, 9, 9) }]}>
                    {chartLabels[i]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── SUMMARY CARDS ROW ────────────────────────────── */}
        <View
          style={[
            styles.twoCol,
            {
              marginHorizontal: rs(14, 16, 18),
              marginTop: rs(12, 14, 16),
              gap: rs(10, 12, 14),
            },
          ]}
        >
          <SummaryCard
            icon="payments"
            label="Monthly Revenue"
            value={`₹${Number(stats.monthly_revenue ?? 0).toLocaleString("en-IN")}`}
            sub={`${stats.monthly_orders ?? 0} orders`}
            iconColor={C.primaryDark}
            iconBg={C.primaryDim}
            rs={rs}
          />
          <SummaryCard
            icon="account-balance-wallet"
            label="Pending Payout"
            value={`₹${pendingPayout.toLocaleString("en-IN")}`}
            sub="Next: Scheduled"
            iconColor={C.blue}
            iconBg={C.blueDim}
            rs={rs}
          />
        </View>

        <View
          style={[
            styles.twoCol,
            {
              marginHorizontal: rs(14, 16, 18),
              marginTop: rs(10, 12, 14),
              gap: rs(10, 12, 14),
            },
          ]}
        >
          <SummaryCard
            icon="trending-up"
            label="Avg Order Value"
            value={`₹${curr.avgOrder}`}
            sub={curr.label}
            iconColor={C.orange}
            iconBg={C.orangeDim}
            rs={rs}
          />
          <SummaryCard
            icon="moped"
            label="Delivery Avg"
            value={`${stats.delivery_efficiency?.avg_delivery_time ?? 0}m`}
            sub="Monthly avg"
            iconColor={C.purple}
            iconBg={C.purpleDim}
            rs={rs}
          />
        </View>

        {/* ── REVENUE BREAKDOWN ────────────────────────────── */}
        <View
          style={[
            styles.card,
            {
              marginHorizontal: rs(14, 16, 18),
              marginTop: rs(12, 14, 16),
              padding: rs(14, 16, 18),
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}>
                BREAKDOWN
              </Text>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                Revenue Split
              </Text>
            </View>
          </View>

          <BreakdownRow
            label="Order Revenue"
            value={`₹${curr.revenue.toLocaleString("en-IN")}`}
            pct={100}
            color={C.primary}
            rs={rs}
          />
          <BreakdownRow
            label="Platform Fee (est.)"
            value={`-₹${(curr.revenue * 0.02).toFixed(0)}`}
            pct={2}
            color={C.orange}
            rs={rs}
          />
          <BreakdownRow
            label="Net Earnings"
            value={`₹${(curr.revenue * 0.98).toFixed(0)}`}
            pct={98}
            color={C.blue}
            rs={rs}
            bold
          />
        </View>

        {/* ── TOP EARNING PRODUCTS ─────────────────────────── */}
        {topProducts.length > 0 && (
          <View
            style={[
              styles.card,
              {
                marginHorizontal: rs(14, 16, 18),
                marginTop: rs(12, 14, 16),
                padding: rs(14, 16, 18),
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text
                  style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}
                >
                  PERFORMANCE
                </Text>
                <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                  Top Earning Products
                </Text>
              </View>
              <View
                style={[
                  styles.miniStatBadge,
                  { backgroundColor: C.orangeDim },
                ]}
              >
                <MaterialIcons
                  name="emoji-events"
                  size={12}
                  color={C.orange}
                />
                <Text
                  style={[
                    styles.miniStatBadgeText,
                    { color: C.orange, fontSize: rs(10, 11, 11) },
                  ]}
                >
                  {topProducts.length} products
                </Text>
              </View>
            </View>

            {topProducts.slice(0, 5).map((p, i) => (
              <TopProductRow key={i} rank={i + 1} product={p} rs={rs} />
            ))}
          </View>
        )}

        {/* ── PAYOUT CARD ──────────────────────────────────── */}
        <View
          style={[
            styles.payoutCard,
            {
              marginHorizontal: rs(14, 16, 18),
              marginTop: rs(12, 14, 16),
              padding: rs(16, 18, 20),
              borderRadius: rs(18, 20, 22),
            },
          ]}
        >
          <View style={styles.payoutGlow} />
          <View style={styles.payoutRow}>
            <View>
              <Text
                style={[styles.payoutLabel, { fontSize: rs(11, 12, 12) }]}
              >
                CURRENT BALANCE
              </Text>
              <Text
                style={[styles.payoutAmount, { fontSize: rs(24, 28, 32) }]}
              >
                ₹{pendingPayout.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.payoutRight}>
              <Text
                style={[styles.payoutLabel, { fontSize: rs(11, 12, 12) }]}
              >
                NEXT PAYOUT
              </Text>
              <View style={styles.payoutScheduledRow}>
                <MaterialIcons
                  name="event"
                  size={rs(14, 15, 16)}
                  color={C.primary}
                />
                <Text
                  style={[
                    styles.payoutScheduled,
                    { fontSize: rs(13, 14, 15) },
                  ]}
                >
                  Scheduled
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              { marginTop: rs(14, 16, 18), paddingVertical: rs(12, 13, 14) },
            ]}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="account-balance"
              size={rs(16, 17, 18)}
              color="#000"
            />
            <Text style={[styles.withdrawText, { fontSize: rs(13, 14, 15) }]}>
              Withdraw to Bank
            </Text>
          </TouchableOpacity>

          <Text
            style={[
              styles.payoutNote,
              { fontSize: rs(10, 11, 11), marginTop: rs(8, 10, 10) },
            ]}
          >
            Payouts are processed every Monday. UPI / Bank transfer supported.
          </Text>
        </View>

        {/* ── RECENT TRANSACTIONS ──────────────────────────── */}
        <View
          style={[
            styles.card,
            {
              marginHorizontal: rs(14, 16, 18),
              marginTop: rs(12, 14, 16),
              padding: rs(14, 16, 18),
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardOverline, { fontSize: rs(9, 10, 10) }]}>
                HISTORY
              </Text>
              <Text style={[styles.cardTitle, { fontSize: rs(14, 15, 16) }]}>
                Recent Transactions
              </Text>
            </View>
          </View>
          <RecentTransactions token={token} rs={rs} />
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function HeroStatPill({ icon, label, value, color, bg, rs }) {
  return (
    <View
      style={[
        styles.heroStatPill,
        { backgroundColor: bg, flex: 1, paddingVertical: rs(8, 9, 10) },
      ]}
    >
      <MaterialIcons name={icon} size={rs(14, 15, 16)} color={color} />
      <Text style={[styles.heroStatVal, { color, fontSize: rs(12, 13, 14) }]}>
        {value}
      </Text>
      <Text style={[styles.heroStatLabel, { fontSize: rs(9, 10, 10) }]}>
        {label}
      </Text>
    </View>
  );
}

function SummaryCard({ icon, label, value, sub, iconColor, iconBg, rs }) {
  return (
    <View
      style={[
        styles.summaryCard,
        { flex: 1, padding: rs(12, 14, 16), borderRadius: rs(14, 16, 18) },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: iconBg,
            width: rs(36, 40, 44),
            height: rs(36, 40, 44),
            borderRadius: rs(10, 11, 12),
          },
        ]}
      >
        <MaterialIcons name={icon} size={rs(16, 18, 20)} color={iconColor} />
      </View>
      <Text style={[styles.summaryLabel, { fontSize: rs(9, 10, 10), marginTop: rs(8, 9, 10) }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { fontSize: rs(14, 16, 18), color: iconColor }]}>
        {value}
      </Text>
      <Text style={[styles.summarySub, { fontSize: rs(9, 10, 10) }]}>{sub}</Text>
    </View>
  );
}

function BreakdownRow({ label, value, pct, color, rs, bold }) {
  return (
    <View style={[styles.breakRow, { marginTop: rs(12, 13, 14) }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text
            style={[
              styles.breakLabel,
              { fontSize: rs(12, 13, 13) },
              bold && { fontWeight: "800", color: C.text },
            ]}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.breakValue,
              { fontSize: rs(12, 13, 13), color },
              bold && { fontWeight: "800" },
            ]}
          >
            {value}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function TopProductRow({ rank, product, rs }) {
  const name = product.name || "Product";
  const sold = product.sold ?? 0;
  const revenue = Number(product.revenue ?? 0);
  const pct = revenue > 0 ? Math.min(Math.round((sold / 50) * 100), 100) : 0;

  return (
    <View style={[styles.topRow, { paddingVertical: rs(10, 11, 12) }]}>
      <Text style={[styles.topRank, { fontSize: rs(11, 12, 12) }]}>
        #{rank}
      </Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
          <Text
            style={[styles.topName, { fontSize: rs(12, 13, 14) }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.topRevenue, { fontSize: rs(12, 13, 14) }]}>
            ₹{revenue.toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pct}%`,
                  backgroundColor:
                    rank === 1 ? C.primary : rank <= 3 ? C.blue : C.orange,
                },
              ]}
            />
          </View>
          <Text style={[styles.topSold, { fontSize: rs(10, 10, 11) }]}>
            {sold} sold
          </Text>
        </View>
      </View>
    </View>
  );
}

function RecentTransactions({ token, rs }) {
  const [txns, setTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/orders/vendor/history?limit=8`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) setTxns(data.data?.orders || []);
      } catch (e) {
        console.error("Txn fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading)
    return (
      <ActivityIndicator
        color={C.primary}
        style={{ marginVertical: 20 }}
      />
    );

  if (txns.length === 0)
    return (
      <View style={styles.emptyChart}>
        <MaterialIcons name="receipt-long" size={32} color={C.border} />
        <Text style={styles.emptyText}>No recent transactions</Text>
      </View>
    );

  return (
    <>
      {txns.map((item, i) => (
        <View
          key={item.id}
          style={[
            styles.txnRow,
            i < txns.length - 1 && styles.txnBorder,
            { paddingVertical: rs(10, 11, 12) },
          ]}
        >
          <View
            style={[
              styles.txnIcon,
              {
                backgroundColor: C.primaryDim,
                width: rs(36, 38, 42),
                height: rs(36, 38, 42),
                borderRadius: rs(10, 11, 12),
              },
            ]}
          >
            <MaterialIcons
              name="shopping-bag"
              size={rs(16, 17, 18)}
              color={C.primaryDark}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.txnOrder, { fontSize: rs(12, 13, 14) }]}>
              Order #{String(item.order_number || item.id)}
            </Text>
            <Text style={[styles.txnDate, { fontSize: rs(10, 11, 11) }]}>
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text style={[styles.txnAmount, { fontSize: rs(13, 14, 15) }]}>
              +₹{Number(item.total ?? 0).toLocaleString("en-IN")}
            </Text>
            <View
              style={[
                styles.txnStatusPill,
                {
                  backgroundColor:
                    item.status === "delivered" ? C.primaryDim : C.blueDim,
                },
              ]}
            >
              <Text
                style={[
                  styles.txnStatusText,
                  {
                    color:
                      item.status === "delivered" ? C.primaryDark : C.blue,
                    fontSize: rs(9, 10, 10),
                  },
                ]}
              >
                {item.status ?? "completed"}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: C.textSub, fontSize: 14, fontWeight: "500" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerOverline: {
    color: C.textLight,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTitle: {
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.5,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.primary,
  },
  headerBadgeText: { color: C.primaryDark, fontWeight: "700" },

  // Period tabs
  periodRow: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  periodPill: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  periodPillActive: { backgroundColor: C.accent },
  periodPillText: { fontWeight: "600", color: C.textSub },
  periodPillTextActive: { color: "#fff" },

  // Hero card
  heroCard: {
backgroundColor: "#E8F5EE",        // light mint instead of dark green
shadowColor: "#147538",
shadowOpacity: 0.15,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  heroGlow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(20, 117, 56, 0.08)",
  },
  heroLabel: {
    color: C.textLight,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroAmount: {
    fontWeight: "900",
    color: C.text,
    letterSpacing: -1,
  },
  heroMeta: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  heroChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(20, 117, 56, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroChangeText: { color: C.primaryDark, fontWeight: "700" },
  heroStrip: { flexDirection: "row" },
  heroStatPill: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 3,
    borderWidth: 1,
borderColor: "rgba(0,0,0,0.06)",
  },
  heroStatVal: { fontWeight: "800" },
  heroStatLabel: { color: C.textSub, fontWeight: "500" },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardOverline: {
    color: C.textLight,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardTitle: { fontWeight: "800", color: C.text, letterSpacing: -0.3 },
  miniStatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  miniStatBadgeText: { fontWeight: "700" },

  // Chart empty
  emptyChart: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: { color: C.textLight, fontSize: 13, fontWeight: "500" },

  // Bar mini chart
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 48,
    gap: 4,
  },
  barItem: { flex: 1, alignItems: "center", height: "100%" },
  barTrack: {
    flex: 1,
    width: "70%",
    backgroundColor: C.border,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { color: C.textLight, fontWeight: "500", marginTop: 3 },

  // Two col
  twoCol: { flexDirection: "row" },
  summaryCard: {
    backgroundColor: C.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryIcon: { alignItems: "center", justifyContent: "center" },
  summaryLabel: {
    color: C.textSub,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  summaryValue: { fontWeight: "800", letterSpacing: -0.3 },
  summarySub: { color: C.textLight, fontWeight: "500", marginTop: 2 },

  // Breakdown
  breakRow: {},
  breakLabel: { color: C.textSub, fontWeight: "600" },
  breakValue: { fontWeight: "700" },
  progressTrack: {
    height: 6,
    backgroundColor: C.border,
    borderRadius: 999,
    overflow: "hidden",
    flex: 1,
  },
  progressFill: { height: "100%", borderRadius: 999 },

  // Top products
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  topRank: { fontWeight: "700", color: C.textLight, width: 22 },
  topName: { fontWeight: "700", color: C.text, flex: 1 },
  topRevenue: { fontWeight: "800", color: C.text },
  topSold: { color: C.textSub, fontWeight: "500", flexShrink: 0 },

  // Payout card
  payoutCard: {
    backgroundColor: "#E8F5EE",
shadowColor: "#147538",
shadowOpacity: 0.15,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  payoutGlow: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(20, 117, 56, 0.06)",
  },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  payoutLabel: {
    color: C.textLight,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  payoutAmount: { fontWeight: "900", color: C.text, letterSpacing: -0.5 },
  payoutRight: { alignItems: "flex-end" },
  payoutScheduledRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  payoutScheduled: { color: C.primaryDark, fontWeight: "700" },
  withdrawBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  withdrawText: { color: "#000", fontWeight: "800" },
  payoutNote: {
    color: C.textSub,
    fontWeight: "500",
    textAlign: "center",
  },

  // Transactions
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txnBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  txnIcon: { alignItems: "center", justifyContent: "center" },
  txnOrder: { fontWeight: "700", color: C.text },
  txnDate: { color: C.textSub, marginTop: 2 },
  txnAmount: { fontWeight: "800", color: C.primaryDark },
  txnStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  txnStatusText: { fontWeight: "700" },
});