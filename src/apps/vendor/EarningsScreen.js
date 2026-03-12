import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { colors } from "../../styles/colors";
import { spacing, radius } from "../../styles/spacing";
import { shadows } from "../../styles/shadows";

export default function VendorEarningsScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Earnings Card */}

      <View style={styles.earnCard}>
        <Text style={styles.cardTitle}>Total Earnings (Today)</Text>

        <Text style={styles.earnAmount}>₹1,250.00</Text>

        <Text style={styles.growth}>+12% vs yesterday</Text>
      </View>


      {/* Weekly Trend */}

      <Text style={styles.sectionTitle}>Weekly Trend</Text>

      <View style={styles.chartCard}>
        <View style={styles.chartLine} />
      </View>


      {/* Payout Info */}

      <Text style={styles.sectionTitle}>Payout Information</Text>

      <View style={styles.payoutCard}>

        <View>
          <Text style={styles.label}>CURRENT BALANCE</Text>
          <Text style={styles.balance}>₹4,820.50</Text>
        </View>

        <View>
          <Text style={styles.label}>NEXT PAYOUT</Text>
          <Text style={styles.balance}>24 Oct</Text>
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
          <Text>₹1,180.00</Text>
        </View>

        <View style={styles.row}>
          <Text>Tips</Text>
          <Text>₹120.00</Text>
        </View>

        <View style={styles.row}>
          <Text style={{ color: "red" }}>Platform Fees (4%)</Text>
          <Text style={{ color: "red" }}>-₹50.00</Text>
        </View>

      </View>


      {/* Revenue Sources */}

      <Text style={styles.sectionTitle}>Revenue Sources</Text>

      <View style={styles.revenueCard}>

        <View style={styles.donut} />

        <View>

          <View style={styles.legendRow}>
            <View style={styles.greenDot} />
            <Text>Orders (91%)</Text>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.grayDot} />
            <Text>Tips (9%)</Text>
          </View>

        </View>

      </View>


      {/* Recent Transactions */}

      <View style={styles.transHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Text style={styles.viewAll}>View All</Text>
      </View>

      <View style={styles.transCard}>

        <View style={styles.transRow}>
          <Text>Order #4821</Text>
          <Text style={styles.green}>₹450.00</Text>
        </View>

        <View style={styles.transRow}>
          <Text>Order #4819</Text>
          <Text style={styles.green}>₹800.00</Text>
        </View>

        <View style={styles.transRow}>
          <Text>Payout to Bank</Text>
          <Text style={styles.red}>-₹3,200.00</Text>
        </View>

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
    color: "#16a34a",
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
    backgroundColor: "#22c55e"
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
    backgroundColor: "#22c55e",
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
    borderColor: "#22c55e",
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
    backgroundColor: "#22c55e",
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
    color: "#16a34a"
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
    color: "#16a34a",
    fontWeight: "600"
  },

  red: {
    color: "red",
    fontWeight: "600"
  }

});