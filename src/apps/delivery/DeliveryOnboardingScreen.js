/**
 * DeliveryOnboardingScreen.js
 *
 * Fully wired to the real backend:
 *  • expo-image-picker  → profile photo, license photo
 *  • expo-document-picker → RC (PDF or image)
 *  • POST /api/upload   → returns CDN / disk URL
 *  • POST /api/delivery/onboard → persists everything
 *
 * Sections:
 *  1. Profile Photo
 *  2. Driving License
 *  3. Vehicle Details
 *  4. RC (Registration Certificate)   ← new
 *  5. Bank Details
 *  6. Education & Training
 */

import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import useAuthStore from '../../store/authStore';
import { uploadAPI, deliveryAPI } from '../../services/api';
import AccountManagerModal from '../../components/common/AccountManagerModal';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Image, Alert, Platform, StatusBar,
    KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORM STATE
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
    profile: {
        photoUrl:      '',   // CDN url (sent to backend)
        photoLocalUri: '',   // UI preview only
    },
    license: {
        number:        '',
        expiry:        '',
        photoUrl:      '',
        photoLocalUri: '',
    },
    vehicle: {
        type:          '',
        registration:  '',
        year:          '',
    },
    rc: {
        number:        '',
        photoUrl:      '',
        photoLocalUri: '',
        photoName:     '',   // original filename (for PDF display)
        photoMime:     '',   // 'application/pdf' | 'image/...'
    },
    bank: {
        accountHolderName: '',
        bankName:          '',
        accountNumber:     '',
        confirmAccount:    '', // UI only — NOT sent
        ifsc:              '',
    },
    education: {
        level:       '',
        institution: '',
        passingYear: '',
        trainings:   [],
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

function validate(form) {
    const e = {};

    if (!form.license.number.trim())
        e['license.number'] = 'License number is required';

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
// 3. PAYLOAD BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildPayload(form) {
    return {
        profile_photo_url:    form.profile.photoUrl    || null,

        license_number:       form.license.number.trim().toUpperCase() || null,
        license_expiry:       form.license.expiry.trim()               || null,
        license_photo_url:    form.license.photoUrl                    || null,

        vehicle_type:         form.vehicle.type.toLowerCase(),
        vehicle_number:       form.vehicle.registration.trim().toUpperCase(),
        vehicle_year:         form.vehicle.year.trim()                 || null,

        rc_number:            form.rc.number.trim().toUpperCase()      || null,
        rc_photo_url:         form.rc.photoUrl                         || null,

        bank_account_name:    form.bank.accountHolderName.trim(),
        bank_name:            form.bank.bankName.trim()                || null,
        bank_account_number:  form.bank.accountNumber.trim(),
        bank_ifsc:            form.bank.ifsc.trim().toUpperCase(),

        education_level:      form.education.level,
        institution:          form.education.institution.trim()        || null,
        passing_year:         form.education.passingYear.trim()        || null,
        trainings:            form.education.trainings,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES  = ['Motorcycle', 'Scooter'];
const EDU_LEVELS     = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post Graduate'];
const TRAINING_OPTS  = [
    'Food Delivery Training', 'Road Safety Course',
    'Customer Service', 'First Aid', 'Navigation & Maps',
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. COLORS
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
// 6. ATOMS
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

function Input({ value, onChangeText, placeholder, keyboardType, maxLength, secureTextEntry, autoCapitalize = 'none' }) {
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
            autoCapitalize={autoCapitalize}
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

/** Shows image thumbnail or PDF icon depending on mime type */
function FileUpload({ localUri, mime, fileName, label, icon, onPick, uploading, errorKey, errors }) {
    const err = errors?.[errorKey];
    const isPdf = mime === 'application/pdf';

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
                    isPdf ? (
                        <View style={s.pdfPreview}>
                            <Text style={s.pdfIcon}>📄</Text>
                            <Text style={s.pdfName} numberOfLines={2}>{fileName || 'Document uploaded'}</Text>
                            <Text style={s.pdfChange}>Tap to change</Text>
                        </View>
                    ) : (
                        <>
                            <Image source={{ uri: localUri }} style={s.photoThumb} />
                            <View style={s.photoOverlay}>
                                <Text style={s.photoOverlayTxt}>✎ Change photo</Text>
                            </View>
                        </>
                    )
                ) : (
                    <View style={s.photoEmpty}>
                        <Text style={s.photoEmptyIcon}>{icon || '📷'}</Text>
                        <Text style={s.photoEmptyLabel}>{label}</Text>
                        <Text style={s.photoEmptyHint}>Tap to upload (image or PDF)</Text>
                    </View>
                )}
            </TouchableOpacity>
            {err ? <Text style={s.fieldError}>{err}</Text> : null}
        </View>
    );
}

function TipBox({ icon = 'ℹ️', text }) {
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
        !!(form.rc.number || form.rc.photoUrl),
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
// 7. MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function DeliveryOnboarding({ navigation, onComplete }) {
    const token = useAuthStore((state) => state.token);
    const user  = useAuthStore((state) => state.user);
    const login = useAuthStore((state) => state.login);

    const [form, setForm]             = useState(INITIAL_FORM);
    const [errors, setErrors]         = useState({});
    const [errorMsg, setErrorMsg]     = useState(null);  // top-level error banner
    const [successMsg, setSuccessMsg] = useState(null);  // success banner
    const [submitting, setSubmitting] = useState(false);
    // const [uploading, setUploading] = useState(null);
    const [accountModalVisible, setAccountModalVisible] = useState(false);
    const [hasOtherProfiles, setHasOtherProfiles] = useState(false);

    const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

    // Check if user has other profiles to switch to (show back/switch only if yes)
    useEffect(() => {
        const checkProfiles = async () => {
            try {
                const res = await fetch(`${API_BASE}/auth/profiles`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok) {
                    const others = (data.profiles || []).filter(
                        (p) => p.role !== (user?.role || 'delivery')
                    );
                    setHasOtherProfiles(others.length > 0);
                }
            } catch (_) { /* silently fail */ }
        };
        checkProfiles();
    }, [token]);

    // uploading: null | 'profile' | 'license' | 'rc'
    const [uploading, setUploading]   = useState(null);


    // Generic nested field setter — also clears that field's error
    const setField = (section, key, value) => {
        setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
        setErrors((prev) => ({ ...prev, [`${section}.${key}`]: null }));
    };

    // ── Request camera-roll permission ────────────────────────────────────────
    const requestMediaPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
            return false;
        }
        return true;
    };

    // ── Pick image from library → upload → store url ──────────────────────────
    const pickImage = async (fieldSection) => {
        const ok = await requestMediaPermission();
        if (!ok) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            allowsEditing: fieldSection === 'profile',
            aspect: fieldSection === 'profile' ? [1, 1] : undefined,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset     = result.assets[0];
        const localUri  = asset.uri;
        const mimeType  = asset.mimeType || 'image/jpeg';

        try {
            setUploading(fieldSection);
            const { url } = await uploadAPI.upload(localUri, mimeType, token);
            setField(fieldSection, 'photoLocalUri', localUri);
            setField(fieldSection, 'photoUrl',      url);
            if (fieldSection === 'rc') {
                setField('rc', 'photoMime', mimeType);
                setField('rc', 'photoName', asset.fileName || 'photo');
            }
        } catch (err) {
            console.error('Upload failed:', err);
            setErrorMsg(err.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(null);
        }
    };

    // ── Pick document (PDF or image) → upload → store url ────────────────────
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const asset    = result.assets[0];
            const localUri = asset.uri;
            const mimeType = asset.mimeType || 'application/pdf';
            const name     = asset.name     || 'document';

            setUploading('rc');
            const { url } = await uploadAPI.upload(localUri, mimeType, token);

            setField('rc', 'photoLocalUri', localUri);
            setField('rc', 'photoUrl',      url);
            setField('rc', 'photoMime',     mimeType);
            setField('rc', 'photoName',     name);
        } catch (err) {
            console.error('Document upload failed:', err);
            setErrorMsg(err.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(null);
        }
    };

    // ── Form submit ───────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        console.log('submit pressed');
        setErrorMsg(null);
        const validationErrors = validate(form);
        console.log('validation errors:', validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setErrorMsg('Please fill all required fields marked with *');
            return;
        }

        try {
            setSubmitting(true);
            const payload = buildPayload(form);
            console.log('Submitting payload:', JSON.stringify(payload, null, 2));
            const res     = await deliveryAPI.onboard(payload, token);
            console.log('Onboard response:', res);

            // Update the auth store with fresh user data returned from onboard
            const partner = res.data?.partner;
            if (partner?.user) {
                await login(partner.user, token, undefined);
            }

            // Check if auto-approved
            const autoApproved = res.data?.auto_approved === true;

            // Show success inline (works on web AND native)
            setSuccessMsg(
                autoApproved
                    ? "✅ Instantly Approved! You can start accepting delivery orders right away."
                    : "🎉 Application Submitted! We'll verify your documents within 24 hours. You'll receive an SMS once approved."
            );

            // Navigate after a short delay so user sees the message
            setTimeout(() => {
                if (onComplete) {
                    onComplete();
                } else {
                    navigation?.navigate('DeliveryApp');
                }
            }, 2500);
        } catch (err) {
            console.error('Onboarding submission failed:', err);
            setErrorMsg(err.message || 'Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar barStyle="light-content" backgroundColor={C.greenDark} />

            {/* Account Switcher Modal — only if has other profiles */}
            {hasOtherProfiles && (
                <AccountManagerModal
                    visible={accountModalVisible}
                    onClose={() => setAccountModalVisible(false)}
                />
            )}

            <ScrollView
                style={{ flex: 1, backgroundColor: C.bg }}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Hero Header ── */}
<LinearGradient
    colors={['#0a4d22', '#147832', '#1A9E3F']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={s.hero}
>
    {/* Nav row */}
    <View style={s.heroNav}>
        {/* Back/switch button — only show when user has other profiles */}
        {hasOtherProfiles ? (
            <TouchableOpacity onPress={() => setAccountModalVisible(true)} style={s.backBtn} activeOpacity={0.7}>
                <Text style={s.backArrow}>←</Text>
            </TouchableOpacity>
        ) : (
            <View style={{ width: 40 }} />
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[s.heroEyebrow, { color: 'rgba(255,255,255,0.7)', fontSize: 10 }]}>DELIVERY PARTNER • SETUP</Text>
            <Text style={s.heroTitle}>Partner Onboarding</Text>
        </View>
        <View style={s.heroBadge}>
            <Text style={s.heroBadgeTxt}>6 STEPS</Text>
        </View>
    </View>

    {/* Stat pills — compact row */}
    <View style={s.heroStats}>
        {[
            { value: '⚡ 5 min', label: 'Quick setup' },
            { value: '🕐 24 hrs', label: 'Verification' },
            { value: '🔒 100%', label: 'Secure' },
        ].map((stat, i) => (
            <View key={i} style={s.heroStatPill}>
                <Text style={s.heroStatValue}>{stat.value}</Text>
                <Text style={s.heroStatLabel}>{stat.label}</Text>
            </View>
        ))}
    </View>

    <View style={s.heroWave} />
</LinearGradient>

                <ProgressBar form={form} />

                {/* ── SECTION 1 — Profile Photo ── */}
                <SectionCard title="Your Photo" subtitle="A clear face photo helps customers identify you" stepIndex="1">
                    <View style={{ alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => pickImage('profile')}
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
                                <Text style={{ fontSize: 14, color: '#fff', lineHeight: 17 }}>📷</Text>
                            </View>
                        </TouchableOpacity>
                        <Text style={s.profilePhotoHint}>
                            {form.profile.photoLocalUri ? 'Tap to change photo' : 'Tap to upload your photo'}
                        </Text>
                        {errors['profile.photoUrl'] && (
                            <Text style={s.fieldError}>{errors['profile.photoUrl']}</Text>
                        )}
                    </View>
                    <TipBox text="Use a clear, well-lit photo. Face must be fully visible — no sunglasses or filters." />
                </SectionCard>

                {/* ── SECTION 2 — Driving License ── */}
                <SectionCard title="Driving License" subtitle="Must be valid and not expired" stepIndex="2">
                    <Field label="License Number" required errorKey="license.number" errors={errors}>
                        <Input
                            value={form.license.number}
                            onChangeText={(v) => setField('license', 'number', v.toUpperCase())}
                            placeholder="e.g. TS0720190012345"
                            maxLength={20}
                            autoCapitalize="characters"
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

                    <Field label="License Photo" errorKey="license.photoUrl" errors={errors}>
                        <FileUpload
                            localUri={form.license.photoLocalUri}
                            mime={form.license.photoMime}
                            label="Upload front of license"
                            icon="🪪"
                            onPick={() => pickImage('license')}
                            uploading={uploading === 'license'}
                            errorKey="license.photoUrl"
                            errors={errors}
                        />
                    </Field>

                    <TipBox text="All 4 corners must be visible. File size under 10 MB. JPG, PNG, or PDF." />
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
                            autoCapitalize="characters"
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

                {/* ── SECTION 4 — RC (Registration Certificate) ── */}
                <SectionCard
                    title="Registration Certificate (RC)"
                    subtitle="Proof of vehicle ownership — image or PDF"
                    stepIndex="4"
                >
                    <Field label="RC Number" errorKey="rc.number" errors={errors}>
                        <Input
                            value={form.rc.number}
                            onChangeText={(v) => setField('rc', 'number', v.toUpperCase())}
                            placeholder="e.g. TS09EF1234"
                            maxLength={20}
                            autoCapitalize="characters"
                        />
                    </Field>

                    <Field label="RC Document" errorKey="rc.photoUrl" errors={errors}>
                        <View style={s.rcButtonRow}>
                            {/* Image picker */}
                            <TouchableOpacity
                                style={s.rcPickerBtn}
                                onPress={() => pickImage('rc')}
                                disabled={uploading === 'rc'}
                                activeOpacity={0.8}
                            >
                                <Text style={s.rcPickerBtnIcon}>📷</Text>
                                <Text style={s.rcPickerBtnTxt}>Photo</Text>
                            </TouchableOpacity>

                            {/* Document picker */}
                            <TouchableOpacity
                                style={s.rcPickerBtn}
                                onPress={pickDocument}
                                disabled={uploading === 'rc'}
                                activeOpacity={0.8}
                            >
                                <Text style={s.rcPickerBtnIcon}>📄</Text>
                                <Text style={s.rcPickerBtnTxt}>PDF</Text>
                            </TouchableOpacity>
                        </View>

                        {uploading === 'rc' && (
                            <View style={s.rcUploadingRow}>
                                <ActivityIndicator color={C.green} size="small" />
                                <Text style={s.rcUploadingTxt}>Uploading RC document…</Text>
                            </View>
                        )}

                        {form.rc.photoUrl ? (
                            form.rc.photoMime === 'application/pdf' ? (
                                <View style={s.rcFilledBox}>
                                    <Text style={{ fontSize: 28 }}>📄</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.rcFileName} numberOfLines={2}>{form.rc.photoName}</Text>
                                        <Text style={s.rcUploaded}>✓ Uploaded successfully</Text>
                                    </View>
                                    <TouchableOpacity onPress={pickDocument}>
                                        <Text style={s.rcChange}>Change</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={() => pickImage('rc')} style={s.rcFilledBox}>
                                    <Image source={{ uri: form.rc.photoLocalUri }} style={s.rcThumb} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.rcUploaded}>✓ Image uploaded</Text>
                                    </View>
                                    <Text style={s.rcChange}>Change</Text>
                                </TouchableOpacity>
                            )
                        ) : null}
                    </Field>

                    <TipBox icon="📋" text="Upload the front page of your RC. PDF, JPG, or PNG accepted. Max 10 MB." />
                </SectionCard>

                {/* ── SECTION 5 — Bank Details ── */}
                <SectionCard title="Bank Details" subtitle="Your earnings will be credited here weekly" stepIndex="5">
                    <View style={s.securityRow}>
                        <Text style={{ fontSize: 15 }}>🔒</Text>
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
                            autoCapitalize="characters"
                        />
                    </Field>

                    <TipBox text="Find your IFSC on the first page of your cheque book or bank passbook." />
                </SectionCard>

                {/* ── SECTION 6 — Education & Training ── */}
                <SectionCard title="Education & Training" subtitle="Help us understand your background" stepIndex="6">
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

                {/* Summary Strip */}
<View style={s.summaryStrip}>
    <Text style={{ fontSize: 28 }}>🎉</Text>
    <View style={{ flex: 1 }}>
        <Text style={s.summaryTitle}>Almost done!</Text>
        <Text style={s.summaryText}>
            Documents verified within{' '}
            <Text style={{ fontWeight: '800', color: '#86EFAC' }}>24 hours</Text>.
            SMS on approval.
        </Text>
    </View>
</View>

                {/* ── Error Banner ── */}
                {errorMsg && (
                    <View style={s.errorBanner}>
                        <Text style={s.errorBannerIcon}>⚠️</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={s.errorBannerText}>{errorMsg}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setErrorMsg(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={{ fontSize: 16, color: C.red }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Success Banner ── */}
                {successMsg && (
                    <View style={s.successBanner}>
                        <Text style={s.successBannerText}>{successMsg}</Text>
                        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                            Redirecting you shortly…
                        </Text>
                    </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={[s.submitBtn, (submitting || uploading !== null) && { opacity: 0.7 }]}
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
// 8. STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    // ── Hero ──
hero: { paddingTop: Platform.OS === 'ios' ? 52 : StatusBar.currentHeight + 12 || 36, paddingBottom: 0, paddingHorizontal: 20, marginHorizontal: -20, marginTop: -16 },
heroNav:       { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
backBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
backArrow:     { fontSize: 18, color: '#fff', fontWeight: '400' },
heroBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
heroBadgeTxt:  { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 1.5 },
heroEyebrow:   { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
heroTitle:     { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3, lineHeight: 26 },
heroStats:     { flexDirection: 'row', gap: 8, paddingBottom: 22 },
heroStatPill:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
heroStatValue: { fontSize: 12, fontWeight: '800', color: '#fff', marginBottom: 1 },
heroStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.2 },
heroWave:      { height: 22, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginHorizontal: -20, marginBottom: -1 },

    scrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingTop: 16 },

    progressWrap:       { marginBottom: 12, marginHorizontal: 2 },
progressTrack:      { flexDirection: 'row', marginBottom: 4 },
progressSeg:        { flex: 1, height: 4, borderRadius: 10, backgroundColor: C.border },
progressSegFilled:  { backgroundColor: C.green },
progressTxt:        { fontSize: 10, color: C.textLight, fontWeight: '700', textAlign: 'right', letterSpacing: 0.3 },

    card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: '#E8F0E8', shadowColor: '#147832', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 5 },
cardHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
stepNumWrap:   { width: 30, height: 30, borderRadius: 9, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
stepNum:       { fontSize: 13, fontWeight: '900', color: '#fff' },
cardTitle:     { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 1, letterSpacing: -0.3 },
cardSubtitle:  { fontSize: 11, color: C.textXLight, fontWeight: '500' },
cardDivider:   { height: 1, backgroundColor: '#F5F6F5' },
cardBody:      { padding: 16, gap: 14 },

    field:      { gap: 5 },
fieldLabel: { fontSize: 11, fontWeight: '700', color: C.textLight, textTransform: 'uppercase', letterSpacing: 0.6 },
fieldError: { fontSize: 11, color: C.red, fontWeight: '600', marginTop: 1 },

input:        { borderWidth: 1.5, borderColor: '#E8EAE8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 12, fontSize: 14, color: C.text, backgroundColor: '#FAFCFA', fontWeight: '500' },
inputFocused: { borderColor: C.green, backgroundColor: '#fff', shadowColor: C.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },

    chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
chip:         { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24, borderWidth: 1.5, borderColor: '#E2E8E2', backgroundColor: '#F8FAF8' },
chipActive:   { borderColor: C.green, backgroundColor: C.greenLight },
chipTxt:      { fontSize: 13, fontWeight: '600', color: C.textLight },
chipTxtActive:{ color: C.greenDark, fontWeight: '800' },

    profilePhotoWrap:        { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', borderWidth: 2.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
    profilePhoto:            { width: 100, height: 100, borderRadius: 50 },
    profilePhotoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, backgroundColor: '#EEF0F3' },
    profilePhotoHead:        { width: 34, height: 34, borderRadius: 17, backgroundColor: '#C5CAD3', marginBottom: 2 },
    profilePhotoSilhouette:  { position: 'absolute', bottom: 0, width: 66, height: 44, borderTopLeftRadius: 33, borderTopRightRadius: 33, backgroundColor: '#C5CAD3' },
    profilePhotoCam:         { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    profilePhotoHint:        { fontSize: 11, color: C.textXLight, fontWeight: '500', marginTop: 6 },

    photoBox:         { borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: 14, height: 110, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', overflow: 'hidden' },
    photoBoxFilled:   { borderStyle: 'solid', borderColor: C.greenMid },
    photoBoxError:    { borderColor: C.red },
    photoThumb:       { width: '100%', height: '100%', borderRadius: 12 },
    photoOverlay:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 6, alignItems: 'center' },
    photoOverlayTxt:  { fontSize: 12, color: '#fff', fontWeight: '700' },
    photoEmpty:       { alignItems: 'center', gap: 4 },
    photoEmptyIcon:   { fontSize: 28 },
    photoEmptyLabel:  { fontSize: 13, fontWeight: '700', color: C.textMed },
    photoEmptyHint:   { fontSize: 11, color: C.textXLight },

    pdfPreview: { alignItems: 'center', gap: 4, paddingHorizontal: 10 },
    pdfIcon:    { fontSize: 30 },
    pdfName:    { fontSize: 12, fontWeight: '600', color: C.textMed, textAlign: 'center' },
    pdfChange:  { fontSize: 11, color: C.green, fontWeight: '600' },

    // ── RC specific ──
    rcButtonRow:     { flexDirection: 'row', gap: 10 },
    rcPickerBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: C.green, borderRadius: 10, paddingVertical: 10, backgroundColor: C.greenLight },
    rcPickerBtnIcon: { fontSize: 18 },
    rcPickerBtnTxt:  { fontSize: 13, fontWeight: '700', color: C.greenDark },
    rcUploadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    rcUploadingTxt:  { fontSize: 13, color: C.textLight },
    rcFilledBox:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.greenLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.greenMid },
    rcThumb:         { width: 50, height: 50, borderRadius: 8 },
    rcFileName:      { fontSize: 13, fontWeight: '600', color: C.text, flexShrink: 1 },
    rcUploaded:      { fontSize: 11, color: C.green, fontWeight: '600', marginTop: 2 },
    rcChange:        { fontSize: 12, color: C.green, fontWeight: '700' },

    tipBox:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: '#FDE68A' },
    tipIcon: { fontSize: 15 },
    tipText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18, fontWeight: '500' },

    securityRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.greenLight, borderRadius: 10, padding: 10, gap: 8, borderWidth: 1, borderColor: C.greenMid },
    securityText: { flex: 1, fontSize: 12, color: C.greenDark, fontWeight: '600' },

    summaryStrip: { backgroundColor: C.greenDark, borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
summaryTitle: { fontSize: 14, fontWeight: '900', color: '#fff', marginBottom: 3 },
summaryText:  { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18, flex: 1 },

submitBtn:      { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6, marginBottom: 14 },
submitBtnTxt:   { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
submitBtnArrow: { fontSize: 16, color: '#fff', fontWeight: '900' },
bottomNote:     { textAlign: 'center', fontSize: 11, color: C.textXLight, lineHeight: 17, marginBottom: 4 },

    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14,
        borderWidth: 1.5, borderColor: '#FCA5A5', marginBottom: 12,
    },
    errorBannerIcon: { fontSize: 18 },
    errorBannerText: { fontSize: 13, fontWeight: '700', color: C.red, lineHeight: 19 },

    successBanner: {
        backgroundColor: C.green, borderRadius: 14, padding: 16,
        marginBottom: 12, alignItems: 'center',
        shadowColor: C.green, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    successBannerText: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 22 },
});