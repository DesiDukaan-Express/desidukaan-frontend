import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { colors } from "../../styles/colors";
import { spacing, radius } from "../../styles/spacing";
import { shadows } from "../../styles/shadows";
import useAuthStore from "../../store/authStore";
import { ActivityIndicator, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function VendorEarningsScreen() {
  const { token } = useAuthStore();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, transRes] = await Promise.all([
          fetch(`${API_BASE}/vendors/me/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/orders/vendor/history?limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const sData = await statsRes.json();
        const tData = await transRes.json();

        if (sData.success) setStats(sData.data.stats);
        if (tData.success) setTransactions(tData.data?.orders || []);
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Earnings Card */}
      <View style={styles.earnCard}>
        <Text style={styles.cardTitle}>Total Earnings (Today)</Text>
        <Text style={styles.earnAmount}>₹{stats?.today_revenue || "0.00"}</Text>
        <Text style={styles.growth}>Keep it up!</Text>
      </View>

      {/* Weekly Trend */}
      <Text style={styles.sectionTitle}>Weekly Trend</Text>
      <View style={styles.chartCard}>
        {stats?.weekly_chart_data && stats.weekly_chart_data.length > 0 ? (
          <LineChart
            data={{
              labels: stats.weekly_chart_data.map(d => d.date.split('-')[2]),
              datasets: [{
                data: stats.weekly_chart_data.map(d => Number(d.revenue) || 0)
              }]
            }}
            width={Dimensions.get('window').width - 70}
            height={160}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(15, 240, 34, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            bezier
            style={{ borderRadius: 12, paddingVertical: 10 }}
          />
        ) : (
          <Text style={{color: '#999'}}>No data available for this week</Text>
        )}
      </View>

      {/* Payout Info */}
      <Text style={styles.sectionTitle}>Payout Information</Text>
      <View style={styles.payoutCard}>
        <View>
          <Text style={styles.label}>CURRENT BALANCE</Text>
          <Text style={styles.balance}>₹{stats?.today_revenue || "0.00"}</Text>
        </View>
        <View>
          <Text style={styles.label}>NEXT PAYOUT</Text>
          <Text style={styles.balance}>Scheduled</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.withdrawBtn}>
        <Text style={styles.withdrawText}>Withdraw to Bank</Text>
      </TouchableOpacity>

      {/* Breakdown */}
      <Text style={styles.sectionTitle}>Breakdown</Text>
      <View style={styles.breakCard}>
        <View style={styles.row}>
          <Text>Order Revenue</Text>
          <Text>₹{stats?.today_revenue || "0.00"}</Text>
        </View>
        <View style={styles.row}>
          <Text>Other</Text>
          <Text>₹0.00</Text>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.transHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Text style={styles.viewAll}>View All</Text>
      </View>
      <View style={styles.transCard}>
        {transactions.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#888' }}>No recent transactions</Text>
        ) : (
          transactions.map((item) => (
            <View key={item.id} style={styles.transRow}>
              <Text>Order #{String(item.id)}</Text>
              <Text style={styles.green}>₹{item.total}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg
  },

  earnCard: {
    backgroundColor: "#dff5e1",
    padding: 20,
    borderRadius: radius.lg,
    marginBottom: 20
  },

  cardTitle: {
    fontSize: 14,
    color: "#555"
  },

  earnAmount: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 6
  },

  growth: {
    color: "#0ff022",
    marginTop: 6
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 12
  },

  chartCard: {
    height: 120,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm
  },

  chartLine: {
    width: "90%",
    height: 2,
    backgroundColor: "#0ff022"
  },

  payoutCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: radius.md,
    marginBottom: 12,
    ...shadows.sm
  },

  label: {
    fontSize: 12,
    color: "#777"
  },

  balance: {
    fontSize: 18,
    fontWeight: "700"
  },

  withdrawBtn: {
    backgroundColor: "#0ff022",
    padding: 14,
    borderRadius: radius.md,
    alignItems: "center",
    marginBottom: 20
  },

  withdrawText: {
    color: "#fff",
    fontWeight: "700"
  },

  breakCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: radius.md,
    marginBottom: 20
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },

  revenueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: radius.md,
    marginBottom: 20
  },

  donut: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: "#0ff022",
    marginRight: 20
  },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },

  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0ff022",
    marginRight: 6
  },

  grayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginRight: 6
  },

  transHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  viewAll: {
    color: "#0ff022"
  },

  transCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: radius.md,
    marginBottom: 30
  },

  transRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },

  green: {
    color: "#0ff022",
    fontWeight: "600"
  },

  red: {
    color: "red",
    fontWeight: "600"
  }

});