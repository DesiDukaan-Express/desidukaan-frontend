import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import useAuthStore from "../../store/authStore";
import useAddressStore from "../../store/addressStore";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";

const { width } = Dimensions.get("window");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  // greens (background / brand)
  greenDeep:    "#04160e",
  greenDark:    "#093a24",
  greenMid:     "#0b5133",
  greenBright:  "#10B981", // Vibrant Emerald Green
  greenLight:   "#E6FBF0", // Soft Emerald Tint
  greenFixed:   "#34D399",

  // oranges (accent / CTA)
  orange:       "#F97316", // Premium Vibrant Orange
  orangeDark:   "#C2410C",
  orangeLight:  "#FFEDD5",

  // neutrals
  white:        "#FFFFFF",
  gray100:      "#F9FAFB",
  gray200:      "#F3F4F6",
  gray300:      "#E5E7EB",
  gray400:      "#9CA3AF",
  gray500:      "#6B7280",
  gray700:      "#374151",
  gray900:      "#111827",

  // surface
  surface:      "#F9FAFB",
  outline:      "#9CA3AF",
  outlineVar:   "#D1D5DB",

  // error
  errorBg:      "#FEF2F2",
  errorBorder:  "#FCA5A5",
  errorText:    "#EF4444",
};

const ROLE_KEYS = [
  { key: "customer", icon: "shopping-bag" },
  { key: "vendor",   icon: "home" },
  { key: "delivery", icon: "truck" },
];

const ROLE_HOME = {
  customer: "CustomerApp",
  vendor:   "VendorApp",
  delivery: "DeliveryApp",
};

const isValidIndianMobile = (num) => /^[6-9]\d{9}$/.test(num);

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const [mobile, setMobile]           = useState("");
  const [otp, setOtp]                 = useState("");
  const [step, setStep]               = useState("mobile");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [focusedField, setFocusedField] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const login    = useAuthStore((state) => state.login);
  const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
  const IS_TESTING = process.env.EXPO_PUBLIC_ENV === "testing";

  const logoAnim    = useRef(new Animated.Value(0)).current;
  const formAnim    = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const stepAnim    = useRef(new Animated.Value(0)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const timerRef    = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.spring(formAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
          Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  useEffect(() => {
    if (Platform.OS === "web") {
      window.history.pushState({ screen: "Login", step }, "");
      const handlePop = () => { if (step === "otp") handleBack(); };
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [step]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const animateStep = (cb) => {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: -18, duration: 130, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue:   0, duration: 220, useNativeDriver: true }),
    ]).start(() => cb());
  };

  const handleMobileChange = (text) => {
    setMobile(text.replace(/\D/g, "").slice(0, 10));
    setError("");
  };

  const getMobileError = () => {
    if (!mobile.length) return "";
    if (!["6", "7", "8", "9"].includes(mobile[0]))
      return t("auth.mobileStartError");
    return "";
  };

  const isMobileReady = isValidIndianMobile(mobile);
  const mobileError   = getMobileError();

  const handleSendOtp = async () => {
    if (!isMobileReady) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, role: selectedRole }),
      });
      const data = await res.json();
      if (res.status === 404 || data.userExists === false) {
        navigation.navigate("Signup", { phone: mobile, role: selectedRole });
        return;
      }
      if (!res.ok) throw new Error(data.msg || t("auth.failedToSendOtp"));

      // Testing mode: server returns tokens directly — skip OTP step
      if (data.accessToken) {
        login(data.user, data.accessToken, data.refreshToken);
        const addrStore = useAddressStore.getState();
        await addrStore.loadAddresses(data.accessToken);
        navigation.replace(ROLE_HOME[selectedRole] || "CustomerApp");
        return;
      }

      // Production mode: server returns { msg: 'OTP sent' } — show OTP step
      animateStep(() => { setStep("otp"); setOtp(""); setResendTimer(30); });
    } catch (e) { setError(e.message); shakeError(); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${BASE_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, code: otp, role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || t("auth.invalidOtp"));
      login(data.user, data.accessToken, data.refreshToken);
      const addrStore = useAddressStore.getState();
      await addrStore.loadAddresses(data.accessToken);
      navigation.replace(ROLE_HOME[selectedRole] || "CustomerApp");
    } catch (e) { setError(e.message); shakeError(); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp(""); setResendTimer(30); setError("");
    try {
      await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, role: selectedRole }),
      });
    } catch (_) {}
  };

  const handleBack = () => {
    animateStep(() => { setStep("mobile"); setOtp(""); setError(""); });
  };



  return (
    <LinearGradient
      colors={["#E6FBF0", "#F0FDF4", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.root}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.kav}
        >
          <View style={s.inner}>

            {/* ── Brand ── */}
            <Animated.View
              style={[s.topSection, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}
            >
              {/* Language Switcher top-right */}
              <View style={s.langSwitcherWrap}>
                <LanguageSwitcher />
              </View>

              {/* Cart icon badge */}
              <View style={s.logoBadge}>
                <LinearGradient
                  colors={[C.orange, C.orangeDark]}
                  style={s.logoGradient}
                >
                  <Feather name="shopping-cart" size={28} color={C.white} />
                </LinearGradient>
              </View>

              <Text style={s.brandName}>{t("common.appName")}</Text>
              <Text style={s.brandTagline}>{t("common.tagline")}</Text>
            </Animated.View>

            {/* ── Glass Form Card ── */}
            <Animated.View
              style={[s.formCard, { opacity: formOpacity, transform: [{ translateY: formAnim }] }]}
            >
              {/* Role Tabs */}
              <View style={s.tabBar}>
                {ROLE_KEYS.map((role) => {
                  const active = selectedRole === role.key;
                  return (
                    <TouchableOpacity
                      key={role.key}
                      style={[s.tab, active && s.tabActive]}
                      onPress={() => { setSelectedRole(role.key); setError(""); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.tabText, active && s.tabTextActive]}>
                        {t(`roles.${role.key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Form body */}
              <View style={s.formBody}>
                <Animated.View
                  style={{ transform: [{ translateY: stepAnim }, { translateX: shakeAnim }] }}
                >
                  {step === "mobile" ? (
                    <>
                      <Text style={s.formHeading}>{t("auth.welcomeBack")}</Text>
                      <Text style={s.formSubheading}>{t("auth.loginSubtitle")}</Text>

                      {/* Mobile field */}
                      <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>{t("auth.mobileNumber")}</Text>
                        <View style={[
                          s.inputRow,
                          focusedField === "mobile" && s.inputRowFocused,
                          mobileError && s.inputRowError,
                        ]}>
                          {/* +91 prefix */}
                          <View style={s.prefixArea}>
                            <Feather name="phone" size={16} color={C.outline} />
                            <Text style={s.prefixText}>+91</Text>
                          </View>
                          <View style={s.prefixDivider} />
                          <TextInput
                            style={s.fieldInput}
                            placeholder={t("auth.mobilePlaceholder")}
                            placeholderTextColor={C.outlineVar}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={mobile}
                            onChangeText={handleMobileChange}
                            onFocus={() => setFocusedField("mobile")}
                            onBlur={() => setFocusedField(null)}
                            underlineColorAndroid="transparent"
                          />
                          {isMobileReady && (
                            <Feather name="check-circle" size={16} color={C.greenBright} style={{ marginRight: 14 }} />
                          )}
                        </View>
                        {mobileError ? (
                          <Text style={s.fieldError}>{mobileError}</Text>
                        ) : mobile.length > 0 && !isMobileReady ? (
                          <Text style={s.fieldHint}>
                            {t("auth.moreDigits", { count: 10 - mobile.length })}
                          </Text>
                        ) : null}
                      </View>

                      {error ? <ErrorBox msg={error} /> : null}

                      <PrimaryCta
                        label={t("auth.sendOtp")}
                        loading={loading}
                        disabled={!isMobileReady}
                        onPress={handleSendOtp}
                      />


                    </>
                  ) : (
                    <>
                      {/* OTP header */}
                      <View style={s.otpHeaderRow}>
                        <TouchableOpacity style={s.backBtn} onPress={handleBack}>
                          <Feather name="arrow-left" size={16} color={C.gray700} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.formHeading, { textAlign: "left" }]}>{t("auth.enterOtp")}</Text>
                          <Text style={[s.formSubheading, { textAlign: "left", marginBottom: 0 }]}>
                            {t("auth.otpSentTo", { mobile })}
                          </Text>
                        </View>
                      </View>

                      {/* OTP field */}
                      <View style={[s.fieldGroup, { marginTop: 14 }]}>
                        <Text style={s.fieldLabel}>{t("auth.oneTimePassword")}</Text>
                        <View style={[
                          s.inputRow,
                          focusedField === "otp" && s.inputRowFocused,
                          error && s.inputRowError,
                        ]}>
                          <View style={s.prefixArea}>
                            <Feather name="lock" size={16} color={C.outline} />
                          </View>
                          <TextInput
                            style={[s.fieldInput, otp.length > 0 && s.otpInput]}
                            placeholder={t("auth.otpPlaceholder")}
                            placeholderTextColor={C.outlineVar}
                            keyboardType="number-pad"
                            maxLength={6}
                            value={otp}
                            onChangeText={(v) => { setOtp(v.replace(/\D/g, "")); setError(""); }}
                            onFocus={() => setFocusedField("otp")}
                            onBlur={() => setFocusedField(null)}
                            underlineColorAndroid="transparent"
                          />
                          {otp.length === 6 && !error && (
                            <Feather name="check-circle" size={16} color={C.greenBright} style={{ marginRight: 14 }} />
                          )}
                        </View>

                        {/* OTP progress dots */}
                        <View style={s.otpDots}>
                          {[...Array(6)].map((_, i) => (
                            <View
                              key={i}
                              style={[
                                s.otpDot,
                                i < otp.length && s.otpDotFilled,
                                error && i < otp.length && s.otpDotError,
                              ]}
                            />
                          ))}
                        </View>
                      </View>

                      {/* Resend row */}
                      <View style={s.resendRow}>
                        <Text style={s.resendText}>{t("auth.didntReceive")}</Text>
                        <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
                          <Text style={[s.resendLink, resendTimer > 0 && s.resendLinkDisabled]}>
                            {resendTimer > 0
                              ? t("auth.resendIn", { seconds: resendTimer })
                              : t("auth.resendOtp")}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {error ? <ErrorBox msg={error} /> : null}

                      <PrimaryCta
                        label={t("auth.verifySignIn")}
                        loading={loading}
                        disabled={otp.length !== 6}
                        onPress={handleVerifyOtp}
                      />
                    </>
                  )}
                </Animated.View>

                {/* Or divider */}
                <View style={s.orRow}>
                  <View style={s.orLine} />
                  <Text style={s.orText}>{t("common.or")}</Text>
                  <View style={s.orLine} />
                </View>

                {/* Create account */}
                <TouchableOpacity
                  onPress={() => navigation.navigate("Signup", { role: selectedRole })}
                >
                  <Text style={s.registerText}>
                    {t("auth.newHere")}
                    <Text style={s.registerLink}>{t("auth.createAccount")}</Text>
                  </Text>
                </TouchableOpacity>

                {/* Legal + footer */}
                <View style={s.footerLinks}>
                  <Text style={s.legalLink}>{t("auth.termsOfService")}</Text>
                  <Text style={s.legalDot}>·</Text>
                  <Text style={s.legalLink}>{t("auth.privacyPolicy")}</Text>
                </View>
              </View>
            </Animated.View>

            {/* ── Powered by ── */}
            <View style={s.poweredWrap}>
              <Text style={s.poweredBy}>{t("common.poweredBy")}</Text>
            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Primary CTA (green gradient) ────────────────────────────────────────────
function PrimaryCta({ label, loading, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[s.cta, disabled && s.ctaDisabled]}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={!disabled ? ["#005e26", "#003d17"] : ["#DCFCE7", "#DCFCE7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.ctaInner}
      >
        {loading ? (
          <ActivityIndicator color={C.white} size="small" style={{ flex: 1 }} />
        ) : (
          <>
            <Text style={[s.ctaText, disabled && s.ctaTextOff]}>{label}</Text>
            <View style={[s.ctaArrow, disabled && s.ctaArrowOff]}>
              <Feather name="arrow-right" size={14} color={!disabled ? C.white : "#86EFAC"} />
            </View>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Error box ────────────────────────────────────────────────────────────────
function ErrorBox({ msg }) {
  return (
    <View style={s.errorBox}>
      <Feather name="alert-circle" size={12} color={C.errorText} />
      <Text style={s.errorBoxText}>{msg}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav:  { flex: 1 },

  inner: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
    maxWidth: 480,
  },

  // ── Brand ──
  topSection: { alignItems: "center", marginBottom: 28 },
  langSwitcherWrap: { alignSelf: "flex-end", marginBottom: 12 },

  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: { flex: 1, alignItems: "center", justifyContent: "center" },

  brandName: {
    fontSize: 32,
    fontWeight: "900",
    color: C.greenDeep,
    letterSpacing: -1.2,
  },
  brandTagline: {
    fontSize: 13,
    color: C.greenMid,
    marginTop: 4,
    opacity: 0.85,
    letterSpacing: 0.2,
  },

  // ── Glass Card ──
  formCard: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 12,
  },

  // ── Role tab bar ──
  tabBar: {
    flexDirection: "row",
    padding: 6,
    backgroundColor: "#F3F4F5",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(190,202,187,0.15)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: C.greenBright,
    shadowColor: C.greenBright,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3F4A3E",
    letterSpacing: 0.1,
  },
  tabTextActive: { color: C.white, fontWeight: "700" },

  // ── Form body ──
  formBody: { paddingHorizontal: 22, paddingBottom: 22, paddingTop: 20 },

  formHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#191C1D",
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  formSubheading: {
    fontSize: 13,
    color: "#3F4A3E",
    marginBottom: 18,
  },

  // ── Input ──
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3F4A3E",
    marginBottom: 7,
    letterSpacing: 0.3,
    marginLeft: 2,
  },
  fieldError: { fontSize: 11, color: C.errorText, fontWeight: "600", marginTop: 5 },
  fieldHint:  { fontSize: 11, color: C.gray400, marginTop: 5 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(190,202,187,0.5)",
    minHeight: 54,
  },
  inputRowFocused: { borderColor: C.greenBright },
  inputRowError:   { borderColor: C.errorBorder, backgroundColor: C.errorBg },

  prefixArea: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 10,
    gap: 6,
  },
  prefixText: { fontSize: 14, fontWeight: "700", color: "#191C1D" },
  prefixDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(190,202,187,0.5)",
    marginRight: 4,
  },

  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: "#191C1D",
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontWeight: "500",
    ...(Platform.OS === "web" ? { outlineWidth: 0, outlineStyle: "none" } : {}),
  },
  otpInput: { letterSpacing: 7, fontSize: 18, fontWeight: "700" },

  // ── OTP dots ──
  otpDots: { flexDirection: "row", marginTop: 10, justifyContent: "center" },
  otpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DCFCE7",
    marginHorizontal: 4,
  },
  otpDotFilled: { backgroundColor: C.greenBright },
  otpDotError:  { backgroundColor: C.errorBorder },

  // ── OTP header ──
  otpHeaderRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  // ── Resend ──
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    marginTop: -2,
  },
  resendText:        { fontSize: 12, color: C.gray500 },
  resendLink:        { fontSize: 12, color: C.greenBright, fontWeight: "700" },
  resendLinkDisabled:{ color: C.gray400 },

  // ── Error box ──
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.errorBg,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 7,
    borderWidth: 1,
    borderColor: C.errorBorder,
  },
  errorBoxText: { fontSize: 12, color: C.errorText, flex: 1, fontWeight: "500" },

  // ── CTA Button ──
  cta:        { borderRadius: 16, overflow: "hidden", marginTop: 4, marginBottom: 18 },
  ctaDisabled:{ opacity: 1 },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 54,
  },
  ctaText:    { fontSize: 15, fontWeight: "800", color: C.white, letterSpacing: 0.2 },
  ctaTextOff: { color: "#86EFAC" },
  ctaArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaArrowOff: { backgroundColor: "rgba(22,163,74,0.12)" },

  // ── Or divider ──
  orRow:  { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: "rgba(190,202,187,0.4)" },
  orText: {
    fontSize: 11,
    color: C.outline,
    fontWeight: "500",
    marginHorizontal: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
  },

  // ── Register ──
  registerText: { fontSize: 13, color: C.gray500, textAlign: "center" },
  registerLink: { color: C.orange, fontWeight: "800" },

  // ── Footer links ──
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  legalLink: { fontSize: 11, color: C.outline },
  legalDot:  { fontSize: 11, color: C.outline },

  // ── Powered by ──
  poweredWrap: { alignItems: "center", marginTop: 20 },
  poweredBy: {
    fontSize: 11,
    color: C.greenMid,
    opacity: 0.55,
    fontWeight: "500",
  },

});
