import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, Platform, StatusBar,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// 1. SERVICE LAYER  ←  only section to change when backend is ready
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://your-api.example.com'; // ← swap this

const onboardingService = {
  /**
   * Upload a photo → returns CDN url.
   * fieldName: 'profile_photo' | 'license_photo'
   */
  async uploadPhoto(localUri, fieldName) {
    // ── MOCK — delete below 3 lines when backend ready ───────────────────
    await _sleep(900);
    return { url: localUri };
    // ── REAL — uncomment when backend ready ──────────────────────────────
    // const body = new FormData();
    // body.append(fieldName, { uri: localUri, name: `${fieldName}.jpg`, type: 'image/jpeg' });
    // const res  = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body });
    // const json = await res.json();
    // if (!res.ok) throw new Error(json.message || 'Upload failed');
    // return { url: json.url };
  },

  /**
   * Submit full onboarding payload.
   * See PAYLOAD SCHEMA in header above.
   */
  async submit(payload) {
    // ── MOCK — delete below 3 lines when backend ready ───────────────────
    await _sleep(1500);
    console.log('[Onboarding] payload →', JSON.stringify(payload, null, 2));
    return { success: true, partnerId: 'DRV-' + Date.now() };
    // ── REAL — uncomment when backend ready ──────────────────────────────
    // const res  = await fetch(`${API_BASE}/api/delivery/onboarding`, {
    //   method:  'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body:    JSON.stringify(payload),
    // });
    // const json = await res.json();
    // if (!res.ok) throw new Error(json.message || 'Submission failed');
    // return json;
  },
};

const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// 2. FORM STATE  ←  mirrors the payload schema 1:1
//    *LocalUri fields are UI-only previews — never sent to backend
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  profile: {
    photoUrl:      '',   // ← sent to backend (CDN url)
    photoLocalUri: '',   // ← UI preview only
  },
  license: {
    number:        '',   // ← sent
    expiry:        '',   // ← sent
    photoUrl:      '',   // ← sent (CDN url)
    photoLocalUri: '',   // ← UI preview only
  },
  vehicle: {
    type:          '',   // ← sent
    registration:  '',   // ← sent
    year:          '',   // ← sent
  },
  bank: {
    accountHolderName: '', // ← sent
    bankName:          '', // ← sent
    accountNumber:     '', // ← sent
    confirmAccount:    '', // ← UI only, NOT sent
    ifsc:              '', // ← sent
  },
  education: {
    level:       '',     // ← sent
    institution: '',     // ← sent
    passingYear: '',     // ← sent
    trainings:   [],     // ← sent  string[]
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. VALIDATION  ←  returns { 'section.field': 'error message' }
// ─────────────────────────────────────────────────────────────────────────────

function validate(form) {
  const e = {};

  if (!form.profile.photoUrl)
    e['profile.photoUrl'] = 'Please upload your photo';

  if (!form.license.number.trim())
    e['license.number'] = 'License number is required';
  if (!form.license.photoUrl)
    e['license.photoUrl'] = 'Please upload license photo';

  if (!form.vehicle.type)
    e['vehicle.type'] = 'Select your vehicle type';
  if (!form.vehicle.registration.trim())
    e['vehicle.registration'] = 'Registration number is required';

  if (!form.bank.accountHolderName.trim())
    e['bank.accountHolderName'] = 'Account holder name is required';
  if (!form.bank.accountNumber.trim())
    e['bank.accountNumber'] = 'Account number is required';
  if (form.bank.accountNumber !== form.bank.confirmAccount)
    e['bank.confirmAccount'] = 'Account numbers do not match';
  if (!form.bank.ifsc.trim())
    e['bank.ifsc'] = 'IFSC code is required';
  if (form.bank.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bank.ifsc))
    e['bank.ifsc'] = 'Invalid IFSC (e.g. SBIN0001234)';

  if (!form.education.level)
    e['education.level'] = 'Select your education level';

  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYLOAD BUILDER  ←  strips UI-only fields before sending
// ─────────────────────────────────────────────────────────────────────────────

function buildPayload(form) {
  return {
    profile: {
      photoUrl: form.profile.photoUrl,
    },
    license: {
      number:   form.license.number.trim().toUpperCase(),
      expiry:   form.license.expiry.trim(),
      photoUrl: form.license.photoUrl,
    },
    vehicle: {
      type:         form.vehicle.type,
      registration: form.vehicle.registration.trim().toUpperCase(),
      year:         form.vehicle.year.trim(),
    },
    bank: {
      accountHolderName: form.bank.accountHolderName.trim(),
      bankName:          form.bank.bankName.trim(),
      accountNumber:     form.bank.accountNumber.trim(),
      ifsc:              form.bank.ifsc.trim().toUpperCase(),
      // confirmAccount intentionally excluded
    },
    education: {
      level:       form.education.level,
      institution: form.education.institution.trim(),
      passingYear: form.education.passingYear.trim(),
      trainings:   form.education.trainings,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [ 'Motorcycle', 'Scooter', 'Car', 'Auto'];
const EDU_LEVELS    = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post Graduate'];
const TRAINING_OPTS = [
  'Food Delivery Training', 'Road Safety Course',
  'Customer Service', 'First Aid', 'Navigation & Maps',
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. COLORS
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  green:       '#1A9E3F',
  greenDark:   '#147832',
  greenLight:  '#E6F4EB',
  greenMid:    '#B8DFCA',
  bg:          '#F7F9F7',
  white:       '#FFFFFF',
  border:      '#E2E8E2',
  text:        '#111827',
  textMed:     '#374151',
  textLight:   '#6B7280',
  textXLight:  '#9CA3AF',
  red:         '#DC2626',
  yellowLight: '#FFFBEB',
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. ATOMS
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, stepIndex, children }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.stepNumWrap}>
          <Text style={s.stepNum}>{stepIndex}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{title}</Text>
          {subtitle ? <Text style={s.cardSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={s.cardDivider} />
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

// Field wraps a label + children + error message
// errorKey matches the dot-notation key in the errors object e.g. 'bank.ifsc'
function Field({ label, required, errorKey, errors, children }) {
  const err = errors[errorKey];
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>
        {label}{required && <Text style={{ color: C.red }}> *</Text>}
      </Text>
      {children}
      {err ? <Text style={s.fieldError}>{err}</Text> : null}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, keyboardType, maxLength, secureTextEntry }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textXLight}
      keyboardType={keyboardType || 'default'}
      maxLength={maxLength}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[s.input, focused && s.inputFocused]}
    />
  );
}

function ChipSelect({ options, selected, onSelect, multi = false }) {
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const active = multi ? selected.includes(opt) : selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() =>
              multi
                ? onSelect(active ? selected.filter((x) => x !== opt) : [...selected, opt])
                : onSelect(opt)
            }
            style={[s.chip, active && s.chipActive]}
            activeOpacity={0.75}
          >
            <Text style={[s.chipTxt, active && s.chipTxtActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PhotoUpload({ localUri, label, icon, onPick, uploading, errorKey, errors }) {
  const err = errors?.[errorKey];
  return (
    <View style={{ gap: 6 }}>
      <TouchableOpacity
        onPress={onPick}
        activeOpacity={0.8}
        disabled={uploading}
        style={[s.photoBox, localUri && s.photoBoxFilled, err && s.photoBoxError]}
      >
        {uploading ? (
          <View style={s.photoEmpty}>
            <ActivityIndicator color={C.green} size="large" />
            <Text style={s.photoEmptyHint}>Uploading…</Text>
          </View>
        ) : localUri ? (
          <>
            <Image source={{ uri: localUri }} style={s.photoThumb} />
            <View style={s.photoOverlay}>
              <Text style={s.photoOverlayTxt}>✎ Change photo</Text>
            </View>
          </>
        ) : (
          <View style={s.photoEmpty}>
            <Text style={s.photoEmptyIcon}>{icon || '📷'}</Text>
            <Text style={s.photoEmptyLabel}>{label}</Text>
            <Text style={s.photoEmptyHint}>Tap to upload</Text>
          </View>
        )}
      </TouchableOpacity>
      {err ? <Text style={s.fieldError}>{err}</Text> : null}
    </View>
  );
}

function TipBox({ icon, text }) {
  return (
    <View style={s.tipBox}>
      <Text style={s.tipIcon}>{icon}</Text>
      <Text style={s.tipText}>{text}</Text>
    </View>
  );
}

function ProgressBar({ form }) {
  const sections = [
    !!form.profile.photoUrl,
    !!(form.license.number && form.license.photoUrl),
    !!(form.vehicle.type && form.vehicle.registration),
    !!(form.bank.accountNumber && form.bank.ifsc),
    !!form.education.level,
  ];
  const filled = sections.filter(Boolean).length;
  return (
    <View style={s.progressWrap}>
      <View style={s.progressTrack}>
        {sections.map((done, i) => (
          <View key={i} style={[s.progressSeg, done && s.progressSegFilled, i > 0 && { marginLeft: 4 }]} />
        ))}
      </View>
      <Text style={s.progressTxt}>{filled} of {sections.length} sections completed</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveryOnboarding({ navigation, route }) {
  // userDetails passed from SignupScreen
  const userDetails = route?.params?.userDetails ?? {};
  const register    = useAuthStore((state) => state.register);

  const [form,       setForm]       = useState(INITIAL_FORM);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploading,  setUploading]  = useState(null); // null | 'profile' | 'license'

  // Generic nested field setter — clears that field's error on change
  const setField = (section, key, value) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    setErrors((prev) => ({ ...prev, [`${section}.${key}`]: null }));
  };

  // Pick photo → upload → store CDN url + local preview uri
  const pickAndUpload = async (fieldName) => {
    // ── Replace this with real image picker ───────────────────────────────
    // import { launchImageLibrary } from 'react-native-image-picker';
    // const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.85 });
    // if (result.didCancel || !result.assets?.[0]) return;
    // const localUri = result.assets[0].uri;
    // ─────────────────────────────────────────────────────────────────────
    // Mock URIs — profile gets a silhouette, license gets a card placeholder
    const localUri = fieldName === 'profile'
      ? 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&q=80'
      : 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&q=80'; // ID card

    try {
      setUploading(fieldName);
      const { url } = await onboardingService.uploadPhoto(localUri, `${fieldName}_photo`);
      setField(fieldName, 'photoLocalUri', localUri); // preview
      setField(fieldName, 'photoUrl', url);           // what gets sent to backend
    } catch (err) {
      Alert.alert('Upload failed', err.message || 'Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Missing details', 'Please fill all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      // Merge userDetails into payload so backend gets everything in one call
      const payload = { ...buildPayload(form), user: userDetails };
      const result  = await onboardingService.submit(payload);

      // Register the user in the app — lets them straight in after onboarding
      register({ ...userDetails, partnerId: result.partnerId }, 'mock-jwt-token');

      Alert.alert(
        '🎉 Application Submitted!',
        `Your partner ID is ${result.partnerId}.\nWe'll verify your documents within 24 hours.`,
        [{ text: 'OK', onPress: () => navigation?.navigate('Home') }]
      );
    } catch (err) {
      Alert.alert('Submission failed', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.greenDark} />

      <ScrollView
        style={{ flex: 1, backgroundColor: C.bg }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero Header — scrolls with content ── */}
        <LinearGradient
          colors={['#0f5c2e', '#1A9E3F', '#22c55e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
        {/* Nav row */}
        <View style={s.heroNav}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeTxt}>DELIVERY PARTNER</Text>
          </View>
        </View>

        {/* Main title block */}
        <View style={s.heroMain}>
          <Text style={s.heroEyebrow}>Get started in 5 minutes</Text>
          <Text style={s.heroTitle}>Partner{"\n"}Onboarding</Text>
          <Text style={s.heroSub}>
            Fill in your details once and start{"\n"}earning on your own schedule.
          </Text>
        </View>

        {/* Stats pills */}
        <View style={s.heroStats}>
          {[
            { value: '5 min', label: 'Setup time' },
            { value: '24 hrs', label: 'Verification' },
            { value: '100%', label: 'Secure' },
          ].map((stat, i) => (
            <View key={i} style={s.heroStatPill}>
              <Text style={s.heroStatValue}>{stat.value}</Text>
              <Text style={s.heroStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Wave bottom */}
        <View style={s.heroWave} />
      </LinearGradient>

        <ProgressBar form={form} />



        {/* ── SECTION 1 — Profile Photo ── */}
        <SectionCard title="Your Photo" subtitle="A clear face photo helps customers identify you" stepIndex="1">
          <View style={{ alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => pickAndUpload('profile')}
              activeOpacity={0.85}
              style={s.profilePhotoWrap}
              disabled={uploading === 'profile'}
            >
              {uploading === 'profile' ? (
                <ActivityIndicator color={C.green} size="large" />
              ) : form.profile.photoLocalUri ? (
                <Image source={{ uri: form.profile.photoLocalUri }} style={s.profilePhoto} />
              ) : (
                <View style={s.profilePhotoPlaceholder}>
                  <View style={s.profilePhotoSilhouette} />
                  <View style={s.profilePhotoHead} />
                </View>
              )}
              <View style={s.profilePhotoCam}>
                <Text style={{ fontSize: 12, color: '#fff', fontWeight: '900' }}>+</Text>
              </View>
            </TouchableOpacity>
            <Text style={s.profilePhotoHint}>
              {form.profile.photoLocalUri ? 'Tap to change photo' : 'Tap to upload your photo'}
            </Text>
            {errors['profile.photoUrl'] && (
              <Text style={s.fieldError}>{errors['profile.photoUrl']}</Text>
            )}
          </View>
          <TipBox  text="Use a clear, well-lit photo. Face must be fully visible — no sunglasses or filters." />
        </SectionCard>

        {/* ── SECTION 2 — Driving License ── */}
        <SectionCard title="Driving License" subtitle="Must be valid and not expired" stepIndex="2">
          <Field label="License Number" required errorKey="license.number" errors={errors}>
            <Input
              value={form.license.number}
              onChangeText={(v) => setField('license', 'number', v.toUpperCase())}
              placeholder="e.g. TS0720190012345"
              maxLength={20}
            />
          </Field>

          <Field label="Expiry Date" errorKey="license.expiry" errors={errors}>
            <Input
              value={form.license.expiry}
              onChangeText={(v) => setField('license', 'expiry', v)}
              placeholder="MM/YYYY"
              keyboardType="numeric"
              maxLength={7}
            />
          </Field>

          <Field label="License Photo" required errorKey="license.photoUrl" errors={errors}>
            <PhotoUpload
              localUri={form.license.photoLocalUri}
              label="Upload front of license"
              icon="🪪"
              onPick={() => pickAndUpload('license')}
              uploading={uploading === 'license'}
              errorKey="license.photoUrl"
              errors={errors}
            />
          </Field>

          <TipBox  text="All 4 corners must be visible. File size under 5MB. JPG or PNG only." />
        </SectionCard>

        {/* ── SECTION 3 — Vehicle Details ── */}
        <SectionCard title="Vehicle Details" subtitle="The vehicle you'll use for deliveries" stepIndex="3">
          <Field label="Vehicle Type" required errorKey="vehicle.type" errors={errors}>
            <ChipSelect
              options={VEHICLE_TYPES}
              selected={form.vehicle.type}
              onSelect={(v) => setField('vehicle', 'type', v)}
            />
          </Field>

          <Field label="Registration Number" required errorKey="vehicle.registration" errors={errors}>
            <Input
              value={form.vehicle.registration}
              onChangeText={(v) => setField('vehicle', 'registration', v.toUpperCase())}
              placeholder="e.g. TS 09 EF 1234"
              maxLength={15}
            />
          </Field>

          <Field label="Year of Manufacture" errorKey="vehicle.year" errors={errors}>
            <Input
              value={form.vehicle.year}
              onChangeText={(v) => setField('vehicle', 'year', v)}
              placeholder="e.g. 2019"
              keyboardType="numeric"
              maxLength={4}
            />
          </Field>
        </SectionCard>

        {/* ── SECTION 4 — Bank Details ── */}
        <SectionCard title="Bank Details" subtitle="Your earnings will be credited here weekly" stepIndex="4">
          <View style={s.securityRow}>
            <Text style={{ fontSize: 15 }}></Text>
            <Text style={s.securityText}>Your bank details are encrypted with 256-bit SSL</Text>
          </View>

          <Field label="Account Holder Name" required errorKey="bank.accountHolderName" errors={errors}>
            <Input
              value={form.bank.accountHolderName}
              onChangeText={(v) => setField('bank', 'accountHolderName', v)}
              placeholder="As per bank records"
            />
          </Field>

          <Field label="Bank Name" errorKey="bank.bankName" errors={errors}>
            <Input
              value={form.bank.bankName}
              onChangeText={(v) => setField('bank', 'bankName', v)}
              placeholder="e.g. State Bank of India"
            />
          </Field>

          <Field label="Account Number" required errorKey="bank.accountNumber" errors={errors}>
            <Input
              value={form.bank.accountNumber}
              onChangeText={(v) => setField('bank', 'accountNumber', v)}
              placeholder="Enter account number"
              keyboardType="numeric"
              secureTextEntry
              maxLength={18}
            />
          </Field>

          <Field label="Confirm Account Number" required errorKey="bank.confirmAccount" errors={errors}>
            <Input
              value={form.bank.confirmAccount}
              onChangeText={(v) => setField('bank', 'confirmAccount', v)}
              placeholder="Re-enter account number"
              keyboardType="numeric"
              maxLength={18}
            />
          </Field>

          <Field label="IFSC Code" required errorKey="bank.ifsc" errors={errors}>
            <Input
              value={form.bank.ifsc}
              onChangeText={(v) => setField('bank', 'ifsc', v.toUpperCase())}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
            />
          </Field>

          <TipBox  text="Find your IFSC on the first page of your cheque book or bank passbook." />
        </SectionCard>

        {/* ── SECTION 5 — Education & Training ── */}
        <SectionCard title="Education & Training" subtitle="Help us understand your background" stepIndex="5">
          <Field label="Highest Education Level" required errorKey="education.level" errors={errors}>
            <ChipSelect
              options={EDU_LEVELS}
              selected={form.education.level}
              onSelect={(v) => setField('education', 'level', v)}
            />
          </Field>

          <Field label="Institution / School Name" errorKey="education.institution" errors={errors}>
            <Input
              value={form.education.institution}
              onChangeText={(v) => setField('education', 'institution', v)}
              placeholder="e.g. St. Mary's High School"
            />
          </Field>

          <Field label="Year of Passing" errorKey="education.passingYear" errors={errors}>
            <Input
              value={form.education.passingYear}
              onChangeText={(v) => setField('education', 'passingYear', v)}
              placeholder="e.g. 2018"
              keyboardType="numeric"
              maxLength={4}
            />
          </Field>

          <Field label="Relevant Training (select all that apply)" errorKey="education.trainings" errors={errors}>
            <ChipSelect
              options={TRAINING_OPTS}
              selected={form.education.trainings}
              onSelect={(v) => setField('education', 'trainings', v)}
              multi
            />
          </Field>
        </SectionCard>

        {/* Summary */}
        <View style={s.summaryStrip}>
          <Text style={s.summaryTitle}>Almost done! </Text>
          <Text style={s.summaryText}>
            After submission, our team verifies your documents within{' '}
            <Text style={{ fontWeight: '800', color: '#86EFAC' }}>24 hours</Text>.
            You'll receive an SMS once approved.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (submitting || uploading) && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting || uploading !== null}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Text style={s.submitBtnTxt}>Submit Application</Text><Text style={s.submitBtnArrow}>→</Text></>
          }
        </TouchableOpacity>

        <Text style={s.bottomNote}>
          By submitting, you agree to our{' '}
          <Text style={{ color: C.green, fontWeight: '700' }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: C.green, fontWeight: '700' }}>Privacy Policy</Text>
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Hero ──
  hero:              { paddingTop:Platform.OS==='ios'?54:40, paddingBottom:0, paddingHorizontal:24, marginHorizontal:-16, marginTop:-16 },
  heroNav:           { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:28 },
  backBtn:           { width:40, height:40, borderRadius:12, backgroundColor:'rgba(255,255,255,0.15)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.2)' },
  backArrow:         { fontSize:20, color:'#fff', fontWeight:'300', letterSpacing:-1 },
  heroBadge:         { paddingHorizontal:12, paddingVertical:5, borderRadius:6, backgroundColor:'rgba(255,255,255,0.12)', borderWidth:1, borderColor:'rgba(255,255,255,0.2)' },
  heroBadgeTxt:      { fontSize:9, color:'rgba(255,255,255,0.9)', fontWeight:'800', letterSpacing:2 },
  heroMain:          { marginBottom:28 },
  heroEyebrow:       { fontSize:12, color:'rgba(255,255,255,0.6)', fontWeight:'600', letterSpacing:1, textTransform:'uppercase', marginBottom:10 },
  heroTitle:         { fontSize:40, fontWeight:'900', color:'#fff', letterSpacing:-1.5, lineHeight:44, marginBottom:14 },
  heroSub:           { fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:22, fontWeight:'400' },
  heroStats:         { flexDirection:'row', gap:10, marginBottom:0, paddingBottom:28 },
  heroStatPill:      { flex:1, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:12, paddingVertical:12, paddingHorizontal:10, alignItems:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.15)' },
  heroStatValue:     { fontSize:16, fontWeight:'900', color:'#fff', marginBottom:2 },
  heroStatLabel:     { fontSize:10, color:'rgba(255,255,255,0.6)', fontWeight:'600', letterSpacing:0.3 },
  heroWave:          { height:28, backgroundColor:C.bg, borderTopLeftRadius:28, borderTopRightRadius:28, marginHorizontal:-24, marginBottom:-1 },

  scrollContent:     { padding:16, paddingTop:16 },

  progressWrap:      { marginBottom:14 },
  progressTrack:     { flexDirection:'row', marginBottom:5 },
  progressSeg:       { flex:1, height:3, borderRadius:10, backgroundColor:C.border },
  progressSegFilled: { backgroundColor:C.green },
  progressTxt:       { fontSize:11, color:C.textLight, fontWeight:'600', textAlign:'right' },

  welcomeBanner:     { backgroundColor:C.greenLight, borderRadius:16, padding:18, marginBottom:16, borderWidth:1, borderColor:C.greenMid },
  welcomeTitle:      { fontSize:16, fontWeight:'800', color:C.greenDark, marginBottom:6 },
  welcomeText:       { fontSize:13, color:C.textMed, lineHeight:20 },

  card:              { backgroundColor:'#fff', borderRadius:20, marginBottom:14, borderWidth:1, borderColor:'#EAECF0', shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  cardHeader:        { flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:16, gap:14 },
  stepNumWrap:       { width:32, height:32, borderRadius:8, backgroundColor:C.green, alignItems:'center', justifyContent:'center' },
  stepNum:           { fontSize:14, fontWeight:'900', color:'#fff' },
  cardTitle:         { fontSize:15, fontWeight:'800', color:C.text, marginBottom:2, letterSpacing:-0.2 },
  cardSubtitle:      { fontSize:12, color:C.textXLight, fontWeight:'400' },
  cardDivider:       { height:1, backgroundColor:'#F3F4F6' },
  cardBody:          { padding:20, gap:16 },

  field:             { gap:6 },
  fieldLabel:        { fontSize:12, fontWeight:'700', color:C.textMed, textTransform:'uppercase', letterSpacing:0.4 },
  fieldError:        { fontSize:11, color:C.red, fontWeight:'600' },

  input:             { borderWidth:1.5, borderColor:'#E5E7EB', borderRadius:10, paddingHorizontal:14, paddingVertical:Platform.OS==='ios'?13:11, fontSize:14, color:C.text, backgroundColor:'#FAFAFA', fontWeight:'400' },
  inputFocused:      { borderColor:C.green, backgroundColor:'#fff', shadowColor:C.green, shadowOffset:{width:0,height:0}, shadowOpacity:0.12, shadowRadius:4, elevation:2 },

  chipRow:           { flexDirection:'row', flexWrap:'wrap', gap:8 },
  chip:              { paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1.5, borderColor:C.border, backgroundColor:'#fff' },
  chipActive:        { borderColor:C.green, backgroundColor:C.greenLight },
  chipTxt:           { fontSize:13, fontWeight:'600', color:C.textLight },
  chipTxtActive:     { color:C.greenDark, fontWeight:'700' },

  profilePhotoWrap:       { width:100, height:100, borderRadius:50, backgroundColor:'#F3F4F6', borderWidth:2.5, borderColor:C.border, alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' },
  profilePhoto:           { width:100, height:100, borderRadius:50 },
  profilePhotoPlaceholder:{ width:'100%', height:'100%', alignItems:'center', justifyContent:'flex-end', paddingBottom:8, backgroundColor:'#EEF0F3' },
  profilePhotoHead:       { width:34, height:34, borderRadius:17, backgroundColor:'#C5CAD3', marginBottom:2 },
  profilePhotoSilhouette: { position:'absolute', bottom:0, width:66, height:44, borderTopLeftRadius:33, borderTopRightRadius:33, backgroundColor:'#C5CAD3' },
  profilePhotoCam:        { position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:14, backgroundColor:C.green, alignItems:'center', justifyContent:'center', borderWidth:2, borderColor:'#fff' },
  profilePhotoHint:       { fontSize:11, color:C.textXLight, fontWeight:'500', marginTop:6 },

  photoBox:          { borderWidth:2, borderColor:C.border, borderStyle:'dashed', borderRadius:14, height:110, alignItems:'center', justifyContent:'center', backgroundColor:'#FAFAFA', overflow:'hidden' },
  photoBoxFilled:    { borderStyle:'solid', borderColor:C.greenMid },
  photoBoxError:     { borderColor:C.red },
  photoThumb:        { width:'100%', height:'100%', borderRadius:12 },
  photoOverlay:      { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'rgba(0,0,0,0.45)', paddingVertical:6, alignItems:'center' },
  photoOverlayTxt:   { fontSize:12, color:'#fff', fontWeight:'700' },
  photoEmpty:        { alignItems:'center', gap:4 },
  photoEmptyIcon:    { fontSize:28 },
  photoEmptyLabel:   { fontSize:13, fontWeight:'700', color:C.textMed },
  photoEmptyHint:    { fontSize:11, color:C.textXLight },

  tipBox:            { flexDirection:'row', alignItems:'flex-start', backgroundColor:'#FFFBEB', borderRadius:10, padding:12, gap:8, borderWidth:1, borderColor:'#FDE68A' },
  tipIcon:           { fontSize:15 },
  tipText:           { flex:1, fontSize:12, color:'#92400E', lineHeight:18, fontWeight:'500' },

  securityRow:       { flexDirection:'row', alignItems:'center', backgroundColor:C.greenLight, borderRadius:10, padding:10, gap:8, borderWidth:1, borderColor:C.greenMid },
  securityText:      { flex:1, fontSize:12, color:C.greenDark, fontWeight:'600' },

  summaryStrip:      { backgroundColor:C.greenDark, borderRadius:16, padding:20, marginBottom:16 },
  summaryTitle:      { fontSize:15, fontWeight:'900', color:'#fff', marginBottom:6 },
  summaryText:       { fontSize:13, color:'rgba(255,255,255,0.8)', lineHeight:20 },

  submitBtn:         { backgroundColor:C.green, borderRadius:16, paddingVertical:16, paddingHorizontal:24, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, shadowColor:C.green, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:10, elevation:6, marginBottom:16 },
  submitBtnTxt:      { fontSize:16, fontWeight:'900', color:'#fff', letterSpacing:0.3 },
  submitBtnArrow:    { fontSize:18, color:'#fff', fontWeight:'900' },
  bottomNote:        { textAlign:'center', fontSize:12, color:C.textXLight, lineHeight:18 },
});

