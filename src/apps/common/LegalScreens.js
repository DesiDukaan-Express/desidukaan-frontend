import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

const { width: SCREEN_W } = Dimensions.get("window");

const C = {
  green: "#16A34A",
  greenLight: "#F0FDF4",
  orange: "#F97316",
  orangeLight: "#FFF7ED",
  white: "#FFFFFF",
  bg: "#F8FAFC",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray900: "#111827",
};

export function TermsScreen({ navigation }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={C.gray900} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("auth.termsOfService", { defaultValue: "Terms of Service" })}</Text>
      </View>
      <View style={s.content}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Feather name="file-text" size={32} color={C.green} />
          </View>
          <Text style={s.title}>{t("auth.termsOfService", { defaultValue: "Terms of Service" })}</Text>
          <View style={s.badge}>
            <Text style={s.badgeText}>{t("common.comingSoon", { defaultValue: "Coming Soon" })}</Text>
          </View>
          <Text style={s.sub}>
            {t("common.legalComingSoonSub", {
              defaultValue: "We are currently updating our Terms of Service. Please check back shortly!"
            })}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function PrivacyScreen({ navigation }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={C.gray900} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("auth.privacyPolicy", { defaultValue: "Privacy Policy" })}</Text>
      </View>
      <View style={s.content}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Feather name="shield" size={32} color={C.orange} />
          </View>
          <Text style={s.title}>{t("auth.privacyPolicy", { defaultValue: "Privacy Policy" })}</Text>
          <View style={[s.badge, { backgroundColor: C.orangeLight }]}>
            <Text style={[s.badgeText, { color: C.orange }]}>{t("common.comingSoon", { defaultValue: "Coming Soon" })}</Text>
          </View>
          <Text style={s.sub}>
            {t("common.legalComingSoonSub", {
              defaultValue: "We are currently updating our Privacy Policy. Please check back shortly!"
            })}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray200,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.gray900,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: C.gray900,
    marginBottom: 12,
    textAlign: "center",
  },
  badge: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: C.green,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 14,
    color: C.gray600,
    textAlign: "center",
    lineHeight: 20,
  },
});
