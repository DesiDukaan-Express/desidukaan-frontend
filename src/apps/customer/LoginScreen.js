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
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore from "../../store/authStore";
import useAddressStore from "../../store/addressStore";

const { width, height } = Dimensions.get("window");

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange: "#F97316",
  orangeDark: "#EA580C",
  orangeLight: "#FFF7ED",
  orangeMid: "#FFEDD5",
  orangeBorder: "#FED7AA",

  green: "#16A34A",
  greenDark: "#15803D",
  greenDeep: "#14532D",
  greenLight: "#F0FDF4",
  greenMid: "#DCFCE7",
  greenBorder: "#BBF7D0",

  navy: "#1E3A5F",

  white: "#FFFFFF",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray700: "#374151",
  gray900: "#111827",

  errorBg: "#FEF2F2",
  errorBorder: "#FCA5A5",
  errorText: "#DC2626",
};

const ROLES = [
  { key: "customer", label: "Customer", icon: "shopping-bag" },
  { key: "vendor", label: "Vendor", icon: "home" },
  { key: "delivery", label: "Delivery", icon: "truck" },
];

const ROLE_HOME = {
  customer: "CustomerApp",
  vendor: "VendorApp",
  delivery: "DeliveryApp",
};

const isValidIndianMobile = (num) => /^[6-9]\d{9}$/.test(num);

export default function LoginScreen({ navigation }) {
  console.log("API URL:", process.env.EXPO_PUBLIC_API_URL);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("mobile");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [focusedField, setFocusedField] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");

  const login = useAuthStore((state) => state.login);
  const [loading, setLoading] = useState(false);

  // Set the base URL dynamically or statically. Here we will use the local network IP for Android/iOS emulator accessibility.
  const BASE_URL =
    process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.spring(formAnim, {
            toValue: 0,
            tension: 50,
            friction: 9,
            useNativeDriver: true,
          }),
          Animated.timing(formOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
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
      const handlePop = () => {
        if (step === "otp") handleBack();
      };
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [step]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 5,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -5,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateStep = (cb) => {
    Animated.sequence([
      Animated.timing(stepAnim, {
        toValue: -18,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(stepAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => cb());
  };

  const handleMobileChange = (text) => {
    setMobile(text.replace(/\D/g, "").slice(0, 10));
    setError("");
  };

  const getMobileError = () => {
    if (!mobile.length) return "";
    if (!["6", "7", "8", "9"].includes(mobile[0]))
      return "Indian numbers start with 6, 7, 8 or 9";
    return "";
  };

  const isMobileReady = isValidIndianMobile(mobile);
  const mobileError = getMobileError();

  const handleSendOtp = async () => {
    if (!isMobileReady) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, role: selectedRole }),
      });
      const data = await res.json();
      if (res.status === 404 || data.userExists === false) {
        navigation.navigate("Signup", { phone: mobile, role: selectedRole });
        return;
      }
      if (!res.ok) throw new Error(data.msg || "Failed to send OTP");
      animateStep(() => {
        setStep("otp");
        setOtp("");
        setResendTimer(30);
      });
    } catch (e) {
      setError(e.message);
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, code: otp, role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Invalid OTP");
      login(data.user, data.token);
      const addrStore = useAddressStore.getState();
      await addrStore.loadAddresses(data.token);
      navigation.replace(ROLE_HOME[selectedRole] || "CustomerApp");
    } catch (e) {
      setError(e.message);
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtp("");
    setResendTimer(30);
    setError("");
    try {
      await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, role: selectedRole }),
      });
    } catch (_) {}
  };

  const handleBack = () => {
    animateStep(() => {
      setStep("mobile");
      setOtp("");
      setError("");
    });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.kav}
        >
          <View style={s.inner}>
            {/* ── Brand ── */}
            <Animated.View
              style={[
                s.topSection,
                { opacity: logoAnim, transform: [{ scale: logoAnim }] },
              ]}
            >
              <View style={s.logoOuter}>
                <LinearGradient
                  colors={[C.orange, C.orangeDark]}
                  style={s.logoInner}
                >
                  <Feather name="shopping-cart" size={22} color={C.white} />
                </LinearGradient>
              </View>

              <Text style={s.brandName}>DesiDukaan</Text>

              <Text style={s.brandTagline}>Your Neighbourhood, Delivered</Text>
            </Animated.View>

            {/* ── Form Card ── */}
            <Animated.View
              style={[
                s.formCard,
                { opacity: formOpacity, transform: [{ translateY: formAnim }] },
              ]}
            >
              {/* ── accent strip REMOVED ── */}

              {/* Role tabs — ORANGE active */}
              <View style={s.roleContainer}>
                {ROLES.map((role) => {
                  const active = selectedRole === role.key;
                  return (
                    <TouchableOpacity
                      key={role.key}
                      style={[s.roleTab, active && s.roleTabActive]}
                      onPress={() => {
                        setSelectedRole(role.key);
                        setError("");
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={role.icon}
                        size={12}
                        color={active ? C.white : C.gray500}
                      />
                      <Text
                        style={[s.roleTabText, active && s.roleTabTextActive]}
                      >
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Animated.View
                style={{
                  transform: [
                    { translateY: stepAnim },
                    { translateX: shakeAnim },
                  ],
                }}
              >
                {step === "mobile" ? (
                  <>
                    <Text style={s.formHeading}>Login</Text>
                    <Text style={s.formSubheading}>
                      Enter your mobile number to continue
                    </Text>

                    <View style={s.fieldGroup}>
                      <Text style={s.fieldLabel}>Mobile Number</Text>
                      <View
                        style={[
                          s.inputBox,
                          focusedField === "mobile" && s.inputBoxFocused,
                          mobileError && s.inputBoxError,
                        ]}
                      >
                        <View style={s.inputIconWrap}>
                          <Feather
                            name="smartphone"
                            size={14}
                            color={
                              mobileError
                                ? C.errorText
                                : focusedField === "mobile"
                                  ? C.green
                                  : C.gray400
                            }
                          />
                        </View>
                        <View style={s.prefixWrap}>
                          <Text style={s.prefixText}>+91</Text>
                          <View style={s.prefixDivider} />
                        </View>
                        <TextInput
                          placeholder="10-digit number"
                          placeholderTextColor={C.gray400}
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={mobile}
                          onChangeText={handleMobileChange}
                          onFocus={() => setFocusedField("mobile")}
                          onBlur={() => setFocusedField(null)}
                          style={s.fieldInput}
                          underlineColorAndroid="transparent"
                        />
                        {isMobileReady && (
                          <Feather
                            name="check-circle"
                            size={14}
                            color={C.green}
                            style={{ marginRight: 12 }}
                          />
                        )}
                      </View>
                      {mobileError ? (
                        <Text style={s.fieldError}>{mobileError}</Text>
                      ) : mobile.length > 0 && !isMobileReady ? (
                        <Text style={s.fieldHint}>
                          {10 - mobile.length} more digit
                          {10 - mobile.length !== 1 ? "s" : ""} needed
                        </Text>
                      ) : null}
                    </View>

                    {error ? <ErrorBox msg={error} /> : null}

                    <GreenCta
                      label="Send OTP"
                      loading={loading}
                      disabled={!isMobileReady}
                      onPress={handleSendOtp}
                    />
                  </>
                ) : (
                  <>
                    <View style={s.otpHeaderRow}>
                      <TouchableOpacity style={s.backBtn} onPress={handleBack}>
                        <Feather
                          name="arrow-left"
                          size={15}
                          color={C.gray700}
                        />
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.formHeading, { textAlign: "left" }]}>
                          Enter OTP
                        </Text>
                        <Text
                          style={[
                            s.formSubheading,
                            { textAlign: "left", marginBottom: 0 },
                          ]}
                        >
                          Sent to +91 {mobile}
                        </Text>
                      </View>
                    </View>

                    <View style={[s.fieldGroup, { marginTop: 14 }]}>
                      <Text style={s.fieldLabel}>One-Time Password</Text>
                      <View
                        style={[
                          s.inputBox,
                          focusedField === "otp" && s.inputBoxFocused,
                          error && s.inputBoxError,
                        ]}
                      >
                        <View style={s.inputIconWrap}>
                          <Feather
                            name="lock"
                            size={14}
                            color={focusedField === "otp" ? C.green : C.gray400}
                          />
                        </View>
                        <TextInput
                          placeholder="6-digit code"
                          placeholderTextColor={C.gray400}
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otp}
                          onChangeText={(t) => {
                            setOtp(t.replace(/\D/g, ""));
                            setError("");
                          }}
                          onFocus={() => setFocusedField("otp")}
                          onBlur={() => setFocusedField(null)}
                          style={[s.fieldInput, otp.length > 0 && s.otpInput]}
                          underlineColorAndroid="transparent"
                        />
                        {otp.length === 6 && !error && (
                          <Feather
                            name="check-circle"
                            size={14}
                            color={C.green}
                            style={{ marginRight: 12 }}
                          />
                        )}
                      </View>

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

                    <View style={s.resendRow}>
                      <Text style={s.resendText}>Didn't receive it? </Text>
                      <TouchableOpacity
                        onPress={handleResend}
                        disabled={resendTimer > 0}
                      >
                        <Text
                          style={[
                            s.resendLink,
                            resendTimer > 0 && s.resendLinkDisabled,
                          ]}
                        >
                          {resendTimer > 0
                            ? `Resend in ${resendTimer}s`
                            : "Resend OTP"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {error ? <ErrorBox msg={error} /> : null}

                    <GreenCta
                      label="Verify & Sign In"
                      loading={loading}
                      disabled={otp.length !== 6}
                      onPress={handleVerifyOtp}
                    />
                  </>
                )}
              </Animated.View>

              <View style={s.orRow}>
                <View style={s.orLine} />
                <Text style={s.orText}>or</Text>
                <View style={s.orLine} />
              </View>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Signup", { role: selectedRole })
                }
              >
                <Text style={s.registerText}>
                  New here?{" "}
                  <Text style={s.registerLink}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Footer ── */}
            <View style={s.footer}>
              <Text style={s.legalText}>
                By signing in you agree to our{" "}
                <Text style={s.legalLink}>Terms</Text> &{" "}
                <Text style={s.legalLink}>Privacy</Text>
              </Text>
              <Text style={s.poweredBy}>
                Powered by{" "}
                <Text style={s.poweredByBrand}>Simtrak Solutions</Text>
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Green CTA ────────────────────────────────────────────────────────────────
function GreenCta({ label, loading, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[s.cta, disabled && s.ctaDisabled]}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={!disabled ? [C.green, C.greenDark] : [C.greenMid, C.greenMid]}
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
              <Feather
                name="arrow-right"
                size={14}
                color={!disabled ? C.white : C.greenBorder}
              />
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
  root: { flex: 1, backgroundColor: C.white },
  safe: { flex: 1 },
  kav: { flex: 1 },

  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
    maxWidth: 480,
  },

  // Brand
  topSection: { alignItems: "center", marginBottom: 24 },
  logoOuter: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoInner: { flex: 1, alignItems: "center", justifyContent: "center" },

  // "Desi" orange + "Dukaan" green — side by side
  brandName: {
    fontSize: 30,
    fontWeight: "900",
    color: C.greenDeep,
    letterSpacing: -1.2,
  },

  brandTagline: {
    fontSize: 12,
    color: C.gray500,
    marginTop: 3,
    letterSpacing: 0.2,
  },

  // Card — no accentStrip, so add top padding directly
  formCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.gray200,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 18, // was 0 when accentStrip provided spacing, now direct
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },

  // Role tabs
  roleContainer: {
    flexDirection: "row",
    backgroundColor: C.gray100,
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9,
    gap: 4,
  },
  roleTabActive: {
    backgroundColor: C.orange,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  roleTabText: {
    fontSize: 11,
    color: C.gray500,
    fontWeight: "600",
    marginLeft: 3,
  },
  roleTabTextActive: { color: C.white, fontWeight: "700" },

  formHeading: {
    fontSize: 22,
    fontWeight: "800",
    color: C.gray900,
    letterSpacing: -0.4,
    marginBottom: 3,
    textAlign: "center",
  },
  formSubheading: {
    fontSize: 12,
    color: C.gray500,
    marginBottom: 16,
    textAlign: "center",
  },

  fieldGroup: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.gray700,
    marginBottom: 7,
    letterSpacing: 0.3,
  },
  fieldError: {
    fontSize: 11,
    color: C.errorText,
    fontWeight: "600",
    marginTop: 5,
  },
  fieldHint: { fontSize: 11, color: C.gray400, marginTop: 5 },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.greenLight,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.greenBorder,
    minHeight: 50,
  },
  inputBoxFocused: { borderColor: C.green, backgroundColor: C.greenMid },
  inputBoxError: { borderColor: C.errorBorder, backgroundColor: C.errorBg },
  inputIconWrap: { width: 42, alignItems: "center", justifyContent: "center" },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: C.gray900,
    paddingVertical: 14,
    paddingRight: 12,
    fontWeight: "500",
    ...(Platform.OS === "web" ? { outlineWidth: 0, outlineStyle: "none" } : {}),
  },
  otpInput: { letterSpacing: 7, fontSize: 17, fontWeight: "700" },

  prefixWrap: { flexDirection: "row", alignItems: "center", paddingRight: 8 },
  prefixText: { fontSize: 12, fontWeight: "700", color: C.gray700 },
  prefixDivider: {
    width: 1,
    height: 18,
    backgroundColor: C.greenBorder,
    marginLeft: 8,
  },

  otpDots: { flexDirection: "row", marginTop: 8, justifyContent: "center" },
  otpDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.greenMid,
    marginHorizontal: 3,
  },
  otpDotFilled: { backgroundColor: C.green },
  otpDotError: { backgroundColor: C.errorBorder },

  otpHeaderRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    marginTop: -4,
  },
  resendText: { fontSize: 12, color: C.gray500 },
  resendLink: { fontSize: 12, color: C.green, fontWeight: "700" },
  resendLinkDisabled: { color: C.gray400 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.errorBg,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 7,
    borderWidth: 1,
    borderColor: C.errorBorder,
  },
  errorBoxText: {
    fontSize: 12,
    color: C.errorText,
    flex: 1,
    fontWeight: "500",
  },

  cta: { borderRadius: 14, overflow: "hidden", marginTop: 2, marginBottom: 16 },
  ctaDisabled: { opacity: 1 },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.2,
  },
  ctaTextOff: { color: "#86EFAC" },
  ctaArrow: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaArrowOff: { backgroundColor: "rgba(22,163,74,0.12)" },

  orRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: C.gray200 },
  orText: {
    fontSize: 11,
    color: C.gray400,
    fontWeight: "500",
    marginHorizontal: 10,
  },

  registerText: { fontSize: 13, color: C.gray500, textAlign: "center" },
  registerLink: { color: C.green, fontWeight: "800" },

  footer: { alignItems: "center", marginTop: 20, gap: 5 },
  legalText: {
    fontSize: 12,
    color: C.gray500,
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: { color: C.gray700, fontWeight: "600" },
  poweredBy: { fontSize: 12, color: C.gray500, textAlign: "center" },
  poweredByBrand: { fontWeight: "800", color: C.navy },
});
