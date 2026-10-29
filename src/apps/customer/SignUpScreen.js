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
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import useAuthStore from "../../store/authStore";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";

const { width: SCREEN_W } = Dimensions.get("window");

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";
const IS_TESTING = process.env.EXPO_PUBLIC_ENV === "testing";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  // greens (background / brand)
  greenDeep:    "#04160e",
  greenDark:    "#093a24",
  greenMid:     "#0b5133",
  greenBright:  "#10B981", // Vibrant Emerald Green
  greenLight:   "#E6FBF0", // Soft Emerald Tint
  greenBorder:  "#BBF7D0",
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

const isValidIndianMobile = (num) => /^[6-9]\d{9}$/.test(num);

const GENDERS = [
  { key: "male",   label: "Male",   icon: "mars" },
  { key: "female", label: "Female", icon: "venus" },
  { key: "other",  label: "Other",  icon: "genderless" },
];

export default function SignupScreen({ navigation, route }) {
  const { t } = useTranslation();
  const prefillPhone = route?.params?.phone || "";

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState(prefillPhone);
  const [dob, setDob] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [winW, setWinW] = useState(SCREEN_W);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = () => setWinW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const tablet = winW > 600;
  const mobileSmall = winW < 385;
  const hPad = tablet ? 60 : mobileSmall ? 10 : 20;
  const cardHPad = tablet ? 32 : mobileSmall ? 12 : 18;
  const brandSize = tablet ? 32 : 24;
  const headingSize = tablet ? 22 : 18;

  const login = useAuthStore((state) => state.login);

  const logoAnim = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(logoAnim, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(formAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
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
    if (Platform.OS !== "web") return;
    window.history.pushState({ screen: "Signup", step }, "");
    const handlePop = () => {
      if (step === "otp") {
        setStep("form"); setOtp(""); setError("");
      } else {
        navigation.navigate("Login");
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [step]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const animateStep = (cb) => {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: -20, duration: 130, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => cb && cb());
  };

  const handleMobileChange = (text) => {
    setMobile(text.replace(/\D/g, "").slice(0, 10));
    setError("");
  };

  // DOB validation & age calculation helper
  const calcAgeFromDob = (dobStr) => {
    if (!dobStr) return null;
    const parts = dobStr.split("-");
    if (parts.length !== 3) return null;
    const birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculatedAge = calcAgeFromDob(dob);
  const isAgeTooYoung = !!dob && calculatedAge !== null && calculatedAge < 16;
  const isDobValid = !!dob && calculatedAge !== null && calculatedAge >= 16 && calculatedAge <= 120;
  const isDobError = !!dob && !isDobValid;
  const isMobileReady = isValidIndianMobile(mobile);
  const mobileStartError =
    mobile.length > 0 && !["6", "7", "8", "9"].includes(mobile[0])
      ? "Must start with 6, 7, 8, or 9" : "";

  const isFormValid =
    name.trim().length >= 2 &&
    isMobileReady &&
    isDobValid &&
    gender !== "" &&
    agreed;

  // Step 1: register → account saved to DB
  const handleSignup = async () => {
    if (!isFormValid) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), phone: mobile,
          age: calculatedAge,
          dob,
          gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Registration failed");

      // Testing mode: server returns tokens directly — role picker handles routing
      if (data.accessToken) {
        await login(data.user, data.accessToken, data.refreshToken);
        return; // Navigation auto-updates via auth store
      }

      // Production mode: OTP sent — show OTP step
      animateStep(() => {
        setStep("otp");
        setOtp("");
        setResendTimer(30);
      });
    } catch (e) { setError(e.message); shakeError(); }
    finally { setLoading(false); }
  };

  // Step 2: verify OTP → issue JWT → navigate to dashboard
  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, code: otp }),
      });
      const data = await res.json();
      if (data.error === "ACCOUNT_DEACTIVATED") {
        useAuthStore.getState().flagDeactivated();
        return;
      }
      if (!res.ok) throw new Error(data.msg || "Invalid OTP");
      await login(data.user, data.accessToken, data.refreshToken);
      // Navigation auto-updates — RolePickerScreen shows (activeRole is null)
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
        body: JSON.stringify({ phone: mobile }),
      });
    } catch (_) { }
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.scroll, { paddingHorizontal: hPad }]}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[s.inner, { opacity: formOpacity, transform: [{ translateX: shakeAnim }] }]}
            >

              {/* ── Brand ── */}
              <Animated.View
                style={[s.topSection, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}
              >
                {/* Language Switcher top-right */}
                <View style={s.langSwitcherWrap}>
                  <LanguageSwitcher />
                </View>

                <View style={s.logoOuter}>
                  <LinearGradient colors={[C.orange, C.orangeDark]} style={s.logoInner}>
                    <Feather name="shopping-cart" size={28} color={C.white} />
                  </LinearGradient>
                </View>
                <Text style={[s.brandName, { fontSize: brandSize }]}>{t("common.appName")}</Text>
                <Text style={s.brandTagline}>{t("common.tagline")}</Text>
              </Animated.View>

              {/* ── Card — no accent strip ── */}
              <View style={[s.formCard, { paddingHorizontal: cardHPad }]}>

                <Animated.View style={{ transform: [{ translateY: stepAnim }] }}>

                  {step === "form" ? (
                    <>
                      <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => navigation.navigate("Login")}
                      >
                        <Feather name="arrow-left" size={15} color={C.gray700} />
                        <Text style={s.backBtnText}>
  {t("common.back", { defaultValue: "Back" })} to Login
</Text>
                      </TouchableOpacity>

                      <Text style={[s.formHeading, { fontSize: headingSize }]}>
  {t("auth.createAccount", { defaultValue: "Create Account" })}
</Text>
<Text style={s.formSubheading}>
  {t("auth.signupSubtitle", {
    defaultValue: "Tell us a little about yourself",
  })}
</Text>


                      {/* Full Name */}
                    <Field label={t("auth.fullName", { defaultValue: "Full Name" })}>
                        <View style={[s.inputBox, focusedField === "name" && s.inputBoxFocused]}>
                          <IIcon name="user" focused={focusedField === "name"} />
                          <TextInput
placeholder={t("auth.fullNamePlaceholder", {
  defaultValue: "Your full name",
})}
                            placeholderTextColor={C.gray400}
                            autoCapitalize="words"
                            value={name}
                            onChangeText={(t) => { setName(t); setError(""); }}
                            onFocus={() => setFocusedField("name")}
                            onBlur={() => setFocusedField(null)}
                            style={s.fieldInput}
                            underlineColorAndroid="transparent"
                          />
                          {name.trim().length >= 2 && <Check />}
                        </View>
                      </Field>

                      {/* Mobile */}
                      <Field
                        label={t("auth.mobileNumber", { defaultValue: "Mobile Number" })}
                        error={mobileStartError}
                        hint={
                          !mobileStartError && mobile.length > 0 && !isMobileReady && !prefillPhone
                            ? `${10 - mobile.length} more digit${10 - mobile.length !== 1 ? "s" : ""} needed`
                            : prefillPhone ? "✓ Carried over from login" : ""
                        }
                      >
                        <View style={[
                          s.inputBox,
                          focusedField === "mobile" && s.inputBoxFocused,
                          mobileStartError && s.inputBoxError,
                          prefillPhone && s.inputBoxLocked,
                        ]}>
                          <IIcon name="smartphone" focused={focusedField === "mobile"} error={!!mobileStartError} />
                          <View style={s.prefixWrap}>
                            <Text style={s.prefixText}>🇮🇳 +91</Text>
                            <View style={s.prefixDivider} />
                          </View>
                          <TextInput
                            placeholder={t("auth.mobilePlaceholder", {
  defaultValue: "10-digit number",
})}
                            placeholderTextColor={C.gray400}
                            keyboardType="phone-pad"
                            maxLength={10}
                            value={mobile}
                            onChangeText={handleMobileChange}
                            onFocus={() => setFocusedField("mobile")}
                            onBlur={() => setFocusedField(null)}
                            style={s.fieldInput}
                            editable={!prefillPhone}
                            underlineColorAndroid="transparent"
                          />
                          {isMobileReady && <Check />}
                        </View>
                      </Field>



                      {/* DOB + Gender */}
                      <View style={tablet ? s.rowFields : s.colFields}>
                        <View style={[s.fieldGroup, tablet ? { flex: 1.2, marginRight: 10 } : { width: "100%" }]}>
                          <Text style={s.fieldLabel}>{t("auth.dateOfBirth", { defaultValue: "Date of Birth" })}</Text>
                          <View style={[
                            s.inputBox,
                            { paddingLeft: 14 },
                            focusedField === "dob" && s.inputBoxFocused,
                            isDobError && s.inputBoxError,
                          ]}>
                            {Platform.OS === "web" ? (
                              <input
                                type="date"
                                value={dob}
                                onChange={(e) => { setDob(e.target.value); setError(""); }}
                                onFocus={() => setFocusedField("dob")}
                                onClick={(e) => {
                                  try {
                                    if (e.target.showPicker) e.target.showPicker();
                                  } catch (err) {}
                                }}
                                onBlur={() => setFocusedField(null)}
                                style={{
                                  flex: 1,
                                  border: "none",
                                  outline: "none",
                                  background: "transparent",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  color: dob ? C.gray900 : C.gray400,
                                  fontFamily: "inherit",
                                  padding: "13px 12px 13px 0",
                                  cursor: "pointer",
                                }}
                              />
                            ) : (
                              <TextInput
                                placeholder={t("auth.dobPlaceholder", { defaultValue: "YYYY-MM-DD" })}
                                placeholderTextColor={C.gray400}
                                value={dob}
                                onChangeText={(t) => { setDob(t); setError(""); }}
                                onFocus={() => setFocusedField("dob")}
                                onBlur={() => setFocusedField(null)}
                                style={s.fieldInput}
                                underlineColorAndroid="transparent"
                              />
                            )}
                            {isDobValid && <Check />}
                          </View>
                          {isDobError && (
                            <Text style={s.fieldError}>
                              {isAgeTooYoung
                                ? t("auth.mustBeAtleast16", { defaultValue: "Must be at least 16 years old" })
                                : t("auth.invalidDob", { defaultValue: "Please enter a valid date of birth" })}
                            </Text>
                          )}
                        </View>

                        <View style={[s.fieldGroup, tablet ? { flex: 2 } : { width: "100%" }]}>
<Text style={s.fieldLabel}>
  {t("auth.gender", { defaultValue: "Gender" })}
</Text>
                          <View style={s.genderRow}>
                            {GENDERS.map((g) => {
                              const active = gender === g.key;
                              return (
                                <TouchableOpacity
                                  key={g.key}
                                  style={[s.genderChip, active && s.genderChipActive]}
                                  onPress={() => setGender(g.key)}
                                  activeOpacity={0.7}
                                >
                                  <FontAwesome name={g.icon} size={15} color={active ? C.white : C.greenBright} />
                                  <Text style={[s.genderText, active && s.genderTextActive]}>
                                    {t(`auth.genderOptions.${g.key}`, {
  defaultValue: g.label,
})}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {/* Terms */}
                      <View style={s.checkboxRow}>
                        <TouchableOpacity
                          onPress={() => setAgreed(!agreed)}
                          activeOpacity={0.7}
                          style={{ marginTop: 2 }}
                        >
                          <View style={[s.checkbox, agreed && s.checkboxActive]}>
                            {agreed && <Feather name="check" size={10} color={C.white} />}
                          </View>
                        </TouchableOpacity>
<Text style={s.checkboxText}>
  {t("auth.agreeTo", { defaultValue: "I agree to the" })}{" "}
  <Text
    style={s.checkboxLink}
    onPress={() => navigation.navigate("Terms")}
  >
    {t("auth.termsOfService", { defaultValue: "Terms of Service" })}
  </Text>
  {" "}{t("auth.and", { defaultValue: "and" })}{" "}
  <Text
    style={s.checkboxLink}
    onPress={() => navigation.navigate("Privacy")}
  >
    {t("auth.privacyPolicy", { defaultValue: "Privacy Policy" })}
  </Text>
</Text>
                      </View>

                      {error ? <ErrorBox msg={error} /> : null}

<GreenCta
  label={
    IS_TESTING
      ? t("auth.createAccount", { defaultValue: "Create Account" })
      : t("auth.createAccountSendOtp", {
          defaultValue: "Create Account & Send OTP",
        })
  }
  loading={loading}
  disabled={!isFormValid}
  onPress={handleSignup}
/>

                      <View style={s.orRow}>
                        <View style={s.orLine} />
                        <Text style={s.orText}>or</Text>
                        <View style={s.orLine} />
                      </View>

                      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                        <Text style={s.loginText}>
                          Already have an account?{" "}
                          <Text style={s.loginLink}>Sign in</Text>
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => { setStep("form"); setOtp(""); setError(""); }}
                      >
                        <Feather name="arrow-left" size={15} color={C.gray700} />
                        <Text style={s.backBtnText}>Edit details</Text>
                      </TouchableOpacity>

                      <View style={s.successBanner}>
                        <Feather name="check-circle" size={16} color={C.greenBright} />
                        <Text style={s.successText}>
                          Account created! Verify your number to continue.
                        </Text>
                      </View>

                      <Text style={[s.formHeading, { fontSize: headingSize }]}>Verify number</Text>
                      <Text style={s.formSubheading}>OTP sent to +91 {mobile}</Text>

                      <Field label="One-Time Password">
                        <View style={[
                          s.inputBox,
                          focusedField === "otp" && s.inputBoxFocused,
                          error && s.inputBoxError,
                        ]}>
                          <IIcon name="lock" focused={focusedField === "otp"} error={!!error} />
                          <TextInput
                            placeholder="6-digit code"
                            placeholderTextColor={C.gray400}
                            keyboardType="number-pad"
                            returnKeyType="done"
                            maxLength={6}
                            value={otp}
                            onChangeText={(t) => { setOtp(t.replace(/\D/g, "")); setError(""); }}
                            onFocus={() => setFocusedField("otp")}
                            onBlur={() => setFocusedField(null)}
                            style={[s.fieldInput, s.otpInput]}
                            underlineColorAndroid="transparent"
                          />
                          {otp.length === 6 && !error && <Check />}
                        </View>

                        <View style={s.otpDots}>
                          {[...Array(6)].map((_, i) => (
                            <View key={i} style={[
                              s.otpDot,
                              i < otp.length && s.otpDotFilled,
                              error && i < otp.length && s.otpDotError,
                            ]} />
                          ))}
                        </View>
                      </Field>

                      <View style={s.resendRow}>
                        <Text style={s.resendText}>Didn't receive it? </Text>
                        <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
                          <Text style={[s.resendLink, resendTimer > 0 && s.resendLinkDisabled]}>
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {error ? <ErrorBox msg={error} /> : null}

                      <GreenCta
                        label="Verify & Enter App"
                        loading={loading}
                        disabled={otp.length !== 6}
                        onPress={handleVerifyOtp}
                      />
                    </>
                  )}

                </Animated.View>
              </View>

              {/* Footer */}
              <View style={s.footer}>
                <Text style={s.legalText}>
                  By creating an account you agree to our{" "}
                  <Text style={s.legalLink} onPress={() => navigation.navigate("Terms")}>Terms</Text> &{" "}
                  <Text style={s.legalLink} onPress={() => navigation.navigate("Privacy")}>Privacy</Text>
                </Text>
              </View>

              {/* ── Powered by ── */}
              <View style={s.poweredWrap}>
                <Text style={s.poweredBy}>{t("common.poweredBy")}</Text>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────
function Field({ label, error, hint, children }) {
  return (
    <View style={s.fieldGroup}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text>
        : hint ? <Text style={s.fieldHint}>{hint}</Text>
          : null}
    </View>
  );
}

function IIcon({ name, focused, error }) {
  return (
    <View style={s.inputIconWrap}>
      <Feather name={name} size={14}
        color={error ? C.errorText : focused ? C.greenBright : C.gray400} />
    </View>
  );
}

function Check() {
  return <Feather name="check-circle" size={14} color={C.greenBright} style={{ marginRight: 12 }} />;
}

function GreenCta({ label, loading, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[s.cta, disabled && s.ctaDisabled]}
      disabled={disabled || loading}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <LinearGradient
        colors={!disabled ? ["#005e26", "#003d17"] : ["#DCFCE7", "#DCFCE7"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.ctaInner}
      >
        {loading ? (
          <ActivityIndicator color={C.white} size="small" style={{ flex: 1 }} />
        ) : (
          <>
            <Text style={[s.ctaText, disabled && s.ctaTextOff]}>{label}</Text>
            <View style={[s.ctaArrow, disabled && s.ctaArrowOff]}>
              <Feather name="arrow-right" size={14}
                color={!disabled ? C.white : "#86EFAC"} />
            </View>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

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
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingTop: 24, paddingBottom: 32 },

  inner: {
    flex: 1, alignSelf: "center",
    width: "100%", maxWidth: 500,
  },

  topSection: { alignItems: "center", marginBottom: 18, width: "100%" },
  langSwitcherWrap: { alignSelf: "flex-end", marginBottom: 12 },
  logoOuter: {
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
  logoInner: { flex: 1, alignItems: "center", justifyContent: "center" },
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

  formCard: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    paddingBottom: 22,
    paddingTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 12,
    width: "100%",
  },

  backBtn: {
    flexDirection: "row", alignItems: "center",
    alignSelf: "flex-start", gap: 6,
    paddingVertical: 6, paddingHorizontal: 10,
    borderRadius: 9, backgroundColor: C.gray100, marginBottom: 12,
  },
  backBtnText: { fontSize: 12, color: C.gray700, fontWeight: "600" },

  formHeading: { fontSize: 20, fontWeight: "800", color: C.gray900, letterSpacing: -0.4, marginBottom: 2 },
  formSubheading: { fontSize: 12, color: C.gray500, marginBottom: 14 },

  successBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.greenLight, borderRadius: 10,
    borderWidth: 1, borderColor: C.greenBorder,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 16,
  },
  successText: { fontSize: 13, color: C.greenBright, fontWeight: "600", flex: 1 },

  roleContainer: {
    flexDirection: "row", backgroundColor: C.gray100,
    borderRadius: 12, padding: 3, marginBottom: 14,
  },
  roleTab: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: 9,
    borderRadius: 9, gap: 5,
  },
  roleTabActive: {
    backgroundColor: C.greenBright,
    shadowColor: C.greenBright,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 3,
  },
  roleTabText: { fontSize: 12, color: C.gray500, fontWeight: "600" },
  roleTabTextActive: { color: C.white, fontWeight: "700" },

  fieldGroup: { marginBottom: 12 },
  fieldLabel: {
    fontSize: 12, fontWeight: "700", color: C.gray700,
    marginBottom: 6, letterSpacing: 0.2,
  },
  fieldError: { fontSize: 11, color: C.errorText, fontWeight: "600", marginTop: 4 },
  fieldHint: { fontSize: 11, color: C.gray400, marginTop: 4 },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(190,202,187,0.5)",
    minHeight: 54,
  },
  inputBoxMultiline: { alignItems: "flex-start", minHeight: 84 },
  inputBoxFocused: { borderColor: C.greenBright, backgroundColor: C.surface },
  inputBoxError: { borderColor: C.errorBorder, backgroundColor: C.errorBg },
  inputBoxLocked: { backgroundColor: C.gray100, borderColor: C.gray200 },
  inputIconWrap: { width: 42, alignItems: "center", justifyContent: "center" },
  mapWrapper: {
    height: 180,
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  map: {
    flex: 1,
  },
  fieldInput: {
    flex: 1, fontSize: 14, color: C.gray900,
    paddingVertical: 13, paddingRight: 12, fontWeight: "500",
    ...(Platform.OS === "web" ? { outlineWidth: 0, outlineStyle: "none" } : {}),
  },
  fieldInputMultiline: { paddingTop: 13, paddingBottom: 12, textAlignVertical: "top" },
  otpInput: { letterSpacing: 6, fontSize: 18, fontWeight: "700" },

  prefixWrap: { flexDirection: "row", alignItems: "center", paddingRight: 8 },
  prefixText: { fontSize: 12, fontWeight: "700", color: C.gray700 },
  prefixDivider: { width: 1, height: 18, backgroundColor: C.greenBorder, marginLeft: 8 },

  otpDots: { flexDirection: "row", marginTop: 8, justifyContent: "center" },
  otpDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.greenLight, marginHorizontal: 3 },
  otpDotFilled: { backgroundColor: C.greenBright },
  otpDotError: { backgroundColor: C.errorBorder },

  resendRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", marginBottom: 8,
  },
  resendText: { fontSize: 12, color: C.gray500 },
  resendLink: { fontSize: 12, color: C.greenBright, fontWeight: "700" },
  resendLinkDisabled: { color: C.gray400 },

  rowFields: { flexDirection: "row", alignItems: "flex-start" },
  colFields: { flexDirection: "column", width: "100%" },

  genderRow: { flexDirection: "row", gap: 5 },
  genderChip: {
    flex: 1, alignItems: "center", paddingVertical: 9,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: C.greenBorder, backgroundColor: C.greenLight, gap: 3,
  },
  genderChipActive: { backgroundColor: C.greenBright, borderColor: C.greenBright },
  genderEmoji: { fontSize: 15 },
  genderText: { fontSize: 11, color: C.gray500, fontWeight: "600" },
  genderTextActive: { color: C.white, fontWeight: "700" },

  checkboxRow: {
    flexDirection: "row", alignItems: "flex-start",
    marginBottom: 14, marginTop: 2, gap: 10,
  },
  checkbox: {
    width: 19, height: 19, borderRadius: 6,
    borderWidth: 2, borderColor: C.greenBorder,
    backgroundColor: C.greenLight,
    alignItems: "center", justifyContent: "center",
    marginTop: 1, flexShrink: 0,
  },
  checkboxActive: { backgroundColor: C.greenBright, borderColor: C.greenBright },
  checkboxText: { fontSize: 13, color: C.gray500, flex: 1, lineHeight: 20 },
  checkboxLink: { color: C.greenBright, fontWeight: "700" },

  errorBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.errorBg, borderRadius: 9,
    paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 10, gap: 7,
    borderWidth: 1, borderColor: C.errorBorder,
  },
  errorBoxText: { fontSize: 12, color: C.errorText, flex: 1, fontWeight: "500" },

  cta: { borderRadius: 14, overflow: "hidden", marginBottom: 16 },
  ctaDisabled: { opacity: 1 },
  ctaInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15, paddingHorizontal: 20, minHeight: 52,
  },
  ctaText: { fontSize: 15, fontWeight: "800", color: C.white, letterSpacing: 0.2 },
  ctaTextOff: { color: "#86EFAC" },
  ctaArrow: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  ctaArrowOff: { backgroundColor: "rgba(22,163,74,0.12)" },

  orRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: C.gray200 },
  orText: { fontSize: 11, color: C.gray400, fontWeight: "500", marginHorizontal: 10 },

  loginText: { fontSize: 13, color: C.gray500, textAlign: "center" },
  loginLink: { color: C.greenBright, fontWeight: "800" },

  footer: { alignItems: "center", marginTop: 20, marginBottom: 8, gap: 5 },
  legalText: { fontSize: 12, color: C.gray500, textAlign: "center", lineHeight: 18 },
  legalLink: { color: C.gray700, fontWeight: "600" },
  
  poweredWrap: { alignItems: "center", marginTop: 20 },
  poweredBy: {
    fontSize: 11,
    color: C.greenMid,
    opacity: 0.55,
    fontWeight: "500",
  },
});