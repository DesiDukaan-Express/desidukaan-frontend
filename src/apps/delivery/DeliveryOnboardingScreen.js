/**
 * DeliveryOnboardingScreen.js
 *
 * Fully wired to the real backend:
 *  • expo-image-picker  → profile photo, license photo, RC photo
 *  • expo-document-picker → RC / license PDF
 *  • Custom crop & edit modal (Canvas on web / expo-image-manipulator on native)
 *  • pdf.js PDF viewer modal (lazy CDN load on web)
 *  • POST /api/upload   → returns CDN / disk URL (with upload progress)
 *  • POST /api/delivery/onboard → persists everything
 *
 * Sections:
 *  1. Profile Photo          4. RC (Registration Certificate)
 *  2. Driving License        5. Bank Details
 *  3. Vehicle Details        6. Education & Training
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Image, Alert, Platform, StatusBar,
    KeyboardAvoidingView, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import useAuthStore from '../../store/authStore';
import { uploadAPI, deliveryAPI } from '../../services/api';
import OnboardingField from '../../components/onboarding/OnboardingField';
import UploadBox from '../../components/onboarding/UploadBox';
import ImageCropModal from '../../components/onboarding/ImageCropModal';
import PdfViewerModal from '../../components/onboarding/PdfViewerModal';
import RemovalConfirmDialog from '../../components/onboarding/RemovalConfirmDialog';
import ToastBanner from '../../components/common/ToastBanner';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { C } from '../../components/onboarding/onboardingTheme';
import { compressImage, revokeObjectUrl } from '../../utils/imageEditor';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORM STATE
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
    profile: {
        photoUrl: '',   // CDN url (sent to backend)
        photoLocalUri: '', // UI preview only
        photoPublicId: '', // Cloudinary public_id (for signed delete)
        photoMime: '', photoName: '', photoSize: null,
    },
    license: {
        number: '', expiry: '',
        photoUrl: '', photoLocalUri: '', photoPublicId: '',
        photoMime: '', photoName: '', photoSize: null,
    },
    vehicle: { type: '', registration: '', year: '' },
    rc: {
        number: '',
        photoUrl: '', photoLocalUri: '', photoPublicId: '',
        photoName: '', photoMime: '', photoSize: null,
    },
    bank: {
        accountHolderName: '', bankName: '', accountNumber: '',
        confirmAccount: '', ifsc: '',
    },
    education: { level: '', institution: '', passingYear: '', trainings: [] },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. VALIDATION  (per-field, used for on-blur + submit + section completion)
// ─────────────────────────────────────────────────────────────────────────────

const getVal = (form, key) =>
    key.split('.').reduce((o, p) => (o ? o[p] : undefined), form);

// Validators return null (valid) or [translationKey, params] so the message can be
// translated at render time and updates when the user changes language.
const validators = {
    'profile.photoUrl': (_v, form) => (form.profile.photoUrl ? null : ['dobErrPhoto']),

    'license.number': (v) => {
        if (!v.trim()) return ['dobErrLicReq'];
        if (!/^[A-Z]{2}[A-Z0-9]{6,18}$/.test(v.trim())) return ['dobErrLicFmt'];
        return null;
    },
    'license.expiry': (v) => {
        if (!v.trim()) return ['dobErrExpReq'];
        const m = v.trim().match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
        if (!m) return ['dobErrExpFmt'];
        const end = new Date(+m[2], +m[1], 0, 23, 59, 59);
        if (end < new Date()) return ['dobErrExpired'];
        return null;
    },
    'license.photoUrl': (_v, form) => (form.license.photoUrl ? null : ['dobErrLicPhoto']),

    'vehicle.type': (v) => (v ? null : ['dobErrVehType']),
    'vehicle.registration': (v) => {
        if (!v.trim()) return ['dobErrRegReq'];
        const compact = v.replace(/\s+/g, '').toUpperCase();
        if (!/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(compact)) return ['dobErrRegFmt'];
        return null;
    },
    'vehicle.year': (v) => {
        if (!v.trim()) return null;
        if (!/^(19|20)\d{2}$/.test(v.trim())) return ['dobErrYearFmt'];
        const y = +v.trim();
        if (y < 1990 || y > new Date().getFullYear() + 1) return ['dobErrYearRange', { max: new Date().getFullYear() + 1 }];
        return null;
    },

    'rc.number': (v) => {
        if (!v.trim()) return null;
        if (!/^[A-Z0-9]{5,20}$/.test(v.trim())) return ['dobErrRcFmt'];
        return null;
    },
    'rc.photoUrl': (_v, form) => (form.rc.photoUrl ? null : ['dobErrRcDoc']),

    'bank.accountHolderName': (v) => (v.trim() ? null : ['dobErrHolder']),
    'bank.accountNumber': (v) => (v.trim() ? null : ['dobErrAccNum']),
    'bank.confirmAccount': (v, form) => {
        if (!v.trim()) return ['dobErrConfirmReq'];
        if (v !== form.bank.accountNumber) return ['dobErrConfirmMismatch'];
        return null;
    },
    'bank.ifsc': (v) => {
        if (!v.trim()) return ['dobErrIfscReq'];
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim())) return ['dobErrIfscFmt'];
        return null;
    },

    'education.level': (v) => (v ? null : ['dobErrEduLevel']),
    'education.passingYear': (v) => {
        if (!v.trim()) return null;
        if (!/^(19|20)\d{2}$/.test(v.trim())) return ['dobErrYearFmt'];
        return null;
    },
};

function validateAll(form) {
    const e = {};
    for (const key of Object.keys(validators)) {
        const err = validators[key](getVal(form, key), form);
        if (err) e[key] = err;
    }
    return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SECTIONS  (used by progress bar + completion checks)
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_FIELDS = [
    ['profile.photoUrl'],
    ['license.number', 'license.expiry', 'license.photoUrl'],
    ['vehicle.type', 'vehicle.registration'],
    ['rc.photoUrl'],
    ['bank.accountHolderName', 'bank.accountNumber', 'bank.confirmAccount', 'bank.ifsc'],
    ['education.level'],
];

function sectionComplete(form, idx) {
    return SECTION_FIELDS[idx].every((k) => !validators[k](getVal(form, k), form));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYLOAD BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildPayload(form) {
    return {
        profile_photo_url: form.profile.photoUrl || null,
        profile_photo_public_id: form.profile.photoPublicId || null,
        license_number: form.license.number.trim().toUpperCase() || null,
        license_expiry: form.license.expiry.trim() || null,
        license_photo_url: form.license.photoUrl || null,
        license_photo_public_id: form.license.photoPublicId || null,
        vehicle_type: form.vehicle.type.toLowerCase(),
        vehicle_number: form.vehicle.registration.trim().toUpperCase(),
        vehicle_year: form.vehicle.year.trim() || null,
        rc_number: form.rc.number.trim().toUpperCase() || null,
        rc_photo_url: form.rc.photoUrl || null,
        rc_photo_public_id: form.rc.photoPublicId || null,
        bank_account_name: form.bank.accountHolderName.trim(),
        bank_name: form.bank.bankName.trim() || null,
        bank_account_number: form.bank.accountNumber.trim(),
        bank_ifsc: form.bank.ifsc.trim().toUpperCase(),
        education_level: form.education.level,
        institution: form.education.institution.trim() || null,
        passing_year: form.education.passingYear.trim() || null,
        trainings: form.education.trainings,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TYPES = ['Motorcycle', 'Scooter'];
const EDU_LEVELS = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post Graduate'];
const TRAINING_OPTS = [
    'Food Delivery Training', 'Road Safety Course',
    'Customer Service', 'First Aid', 'Navigation & Maps',
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. ATOMS
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, stepIndex, completed, children }) {
    return (
        <View style={[s.card, completed && s.cardCompleted]}>
            <View style={s.cardHeader}>
                <View style={[s.stepNumWrap, completed ? s.stepNumWrapDone : s.stepNumWrapPending]}>
                    {completed ? <Text style={s.stepCheck}>✓</Text> : <Text style={s.stepNum}>{stepIndex}</Text>}
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

function Input({ value, onChangeText, placeholder, keyboardType, maxLength, secureTextEntry, autoCapitalize = 'none', onBlur }) {
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
            onBlur={() => { setFocused(false); onBlur?.(); }}
            style={[s.input, focused && s.inputFocused]}
            accessibilityLabel={placeholder}
        />
    );
}

function ChipSelect({ options, selected, onSelect, multi = false, renderLabel }) {
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
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[s.chipTxt, active && s.chipTxtActive]}>{renderLabel ? renderLabel(opt) : opt}</Text>
                    </TouchableOpacity>
                );
            })}
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
    const { t } = useTranslation();
    const completions = SECTION_FIELDS.map((_, i) => sectionComplete(form, i));
    const filled = completions.filter(Boolean).length;
    return (
        <View style={s.progressWrap}>
            <View style={s.progressTrack}>
                {completions.map((done, i) => (
                    <View
                        key={i}
                        style={[
                            s.progressSeg,
                            done && s.progressSegFilled,
                            i > 0 && { marginLeft: 4 },
                        ]}
                    />
                ))}
            </View>
            <Text style={s.progressTxt}>
                {t('dobProgress', { done: filled, total: completions.length })}
            </Text>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────


export default function DeliveryOnboarding({ navigation, onComplete }) {
    const { t, i18n } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const setActiveRole = useAuthStore((state) => state.setActiveRole);
    const login = useAuthStore((state) => state.login);

    const [form, setForm] = useState(INITIAL_FORM);
    const [touched, setTouched] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(null);       // null | 'profile' | 'license' | 'rc'
    const [uploadProgress, setUploadProgress] = useState(null); // { target, pct }
    const [uploadError, setUploadError] = useState(null);      // { target, message }
    const [pendingRetry, setPendingRetry] = useState(null);    // { target, uri, mime, name, size }
    const [toast, setToast] = useState(null);                  // { message, type, id }
    const [cropState, setCropState] = useState(null);          // { visible, sourceUri, title, mode, target, name }
    const [removeConfirm, setRemoveConfirm] = useState(null);  // { target, fileName } | null
    const [pdfViewer, setPdfViewer] = useState(null);          // { visible, uri, localUri, fileName }
    const [showLanguage, setShowLanguage] = useState(false);

    const markTouched = (key) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

    const cropTitle = (target) =>
        target === 'profile' ? t('dobCropProfile') : target === 'license' ? t('dobCropLicense') : t('dobCropRc');

    // Back: go to the previous screen, or fall back to the role picker when this is the first screen
    const handleBack = () => {
        if (navigation?.canGoBack?.()) navigation.goBack();
        else setActiveRole?.(null);
    };

    // ── Toast ──────────────────────────────────────────────────────────────
    const showToast = (message, type = 'success') =>
        setToast({ message, type, id: Date.now() });

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4200);
        return () => clearTimeout(timer);
    }, [toast]);

    // ── Derived validation ─────────────────────────────────────────────────
    const allErrors = useMemo(() => validateAll(form), [form]);
    const visibleErrors = useMemo(() => {
        const v = {};
        for (const k of Object.keys(allErrors)) {
            if (submitted || touched[k]) {
                const [msgKey, params] = allErrors[k];
                v[k] = t(msgKey, params);
            }
        }
        return v;
    }, [allErrors, touched, submitted, t, i18n.language]);
    const isFormValid = Object.keys(allErrors).length === 0;

    // Generic nested field setter
    const setField = (section, key, value) => {
        setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    };

    // ── Permissions ────────────────────────────────────────────────────────
    const requestMediaPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('cpPermRequired'), t('dobPermMsg'));
            return false;
        }
        return true;
    };

    // ── Upload core (shared by every target) ───────────────────────────────
    // Delivery onboarding documents (profile / license / RC) are sensitive, so
    // they are uploaded as authenticated Cloudinary assets and only ever
    // fetched via short-lived signed URLs.
    const runUpload = async (target, uri, mime, name, size) => {
        setUploading(target);
        setUploadError(null);
        setUploadProgress({ target, pct: 0 });
        try {
            const { url, public_id } = await uploadAPI.upload(uri, mime, token, (p) =>
                setUploadProgress((cur) => (cur?.target === target ? { target, pct: p } : cur)),
                { authenticated: true }
            );
            setField(target, 'photoLocalUri', uri);
            setField(target, 'photoUrl', url);
            setField(target, 'photoPublicId', public_id || '');
            setField(target, 'photoMime', mime);
            setField(target, 'photoName', name);
            setField(target, 'photoSize', size);
            markTouched(`${target}.photoUrl`);
            showToast(mime === 'application/pdf' ? t('dobPdfUploaded') : t('dobImageUploaded'), 'success');
        } catch (err) {
            setUploadError({ target, message: err.message || t('dobUploadFailed') });
            setPendingRetry({ target, uri, mime, name, size });
            showToast(err.message || t('dobUploadFailed'), 'danger');
        } finally {
            setUploading(null);
            setUploadProgress(null);
        }
    };

    const retryLastUpload = () => {
        if (!pendingRetry) return;
        const r = pendingRetry;
        setPendingRetry(null);
        runUpload(r.target, r.uri, r.mime, r.name, r.size);
    };

    // ── Remove confirmation (custom modal — no browser alert) ──────────────
    const handleRemoveClick = (target) => {
        const f = form[target];
        const fileName =
            f?.photoName ||
            (target === 'profile' ? t('dobYourProfilePhoto')
            : target === 'license' ? t('dobYourLicensePhoto')
            : t('dobThisRc'));
        setRemoveConfirm({ target, fileName });
    };

    const handleConfirmRemove = () => {
        if (!removeConfirm) return;
        const target = removeConfirm.target;
        const prev = form[target];
        const publicId = prev?.photoPublicId;
        if (prev?.photoLocalUri) revokeObjectUrl(prev.photoLocalUri);
        setField(target, 'photoUrl', '');
        setField(target, 'photoLocalUri', '');
        setField(target, 'photoPublicId', '');
        setField(target, 'photoMime', '');
        setField(target, 'photoName', '');
        setField(target, 'photoSize', null);
        setUploadError(null);
        setPendingRetry(null);
        markTouched(`${target}.photoUrl`);
        setRemoveConfirm(null);
        // Best-effort signed delete from Cloudinary (secret stays on the server).
        if (publicId && token) {
            uploadAPI.remove(publicId, token).catch(() => {});
        }
    };

    // ── Crop modal helpers ─────────────────────────────────────────────────
    const openCrop = (sourceUri, title, mode, target, name) =>
        setCropState({ visible: true, sourceUri, title, mode, target, name });

    // Re-crop an already-uploaded image (no need to pick a new file)
    const handleReCrop = (target) => {
        const f = form[target];
        if (!f?.photoLocalUri || f.photoMime === 'application/pdf') return;
        const mode = target === 'profile' ? 'circle' : 'free';
        const title = cropTitle(target);
        openCrop(f.photoLocalUri, title, mode, target, f.photoName || `${target}.jpg`);
    };

    const handleImageConfirmed = async (res) => {
        const cs = cropState;
        setCropState(null);
        if (!cs) return;
        try {
            const compressed = await compressImage({ uri: res.uri, maxDim: 1600, quality: 0.8 });
            await runUpload(cs.target, compressed.uri, 'image/jpeg', cs.name || `${cs.target}.jpg`, res.sizeBytes);
        } catch (err) {
            showToast(err.message || t('dobImgProcessFail'), 'danger');
        }
    };

    // ── Image picker (profile / license / rc photo) ────────────────────────
    const pickImage = async (target) => {
        try {
            const ok = await requestMediaPermission();
            if (!ok) return;
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.9,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            const mime = asset.mimeType || 'image/jpeg';
            if (!/^image\/(jpe?g|png)$/i.test(mime)) {
                showToast(t('dobOnlyJpgPng'), 'danger');
                return;
            }
            if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
                showToast(t('dobImgTooLarge'), 'danger');
                return;
            }
            // Per-field crop type: profile/face → circle, documents → rectangular
            const mode = target === 'profile' ? 'circle' : 'free';
            const title = cropTitle(target);
            openCrop(asset.uri, title, mode, target, asset.fileName || `${target}.jpg`);
        } catch (err) {
            showToast(err.message || t('dobPickImgFail'), 'danger');
        }
    };

    // ── File handler (drag & drop + document picker) for license/rc ────────
    const handleDocFile = (fileData, target) => {
        const mime = fileData.mime || 'application/pdf';
        const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(fileData.name || '');
        const isImg = /^image\/(jpe?g|png)$/i.test(mime);
        if (!isPdf && !isImg) {
            showToast(t('dobOnlyJpgPngPdf'), 'danger');
            return;
        }
        if (fileData.size && fileData.size > MAX_UPLOAD_BYTES) {
            showToast(t('dobFileTooLarge'), 'danger');
            return;
        }
        if (isPdf) {
            runUpload(target, fileData.uri, 'application/pdf', fileData.name || `${target}.pdf`, fileData.size);
        } else {
            const title = cropTitle(target);
            // Documents use rectangular (free aspect) crop
            openCrop(fileData.uri, title, 'free', target, fileData.name || `${target}.jpg`);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: false,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            handleDocFile(
                {
                    uri: asset.uri,
                    name: asset.name || 'rc_document.pdf',
                    mime: asset.mimeType || 'application/pdf',
                    size: asset.size,
                },
                'rc'
            );
        } catch (err) {
            showToast(err.message || t('dobPickFileFail'), 'danger');
        }
    };

    // ── PDF viewer ─────────────────────────────────────────────────────────
    // The stored URL is a signed (expiring) URL, so re-request a fresh one
    // from public_id right before opening to guarantee it still works.
    const openPdfViewer = async (target) => {
        const f = form[target];
        if (!f?.photoUrl) return;
        let uri = f.photoUrl;
        if (f?.photoPublicId && token) {
            try {
                const resourceType = f?.photoMime === 'application/pdf' ? 'raw' : 'image';
                const signed = await uploadAPI.getSignedUrl(f.photoPublicId, resourceType, token);
                if (signed?.url) uri = signed.url;
            } catch (err) {
                console.warn('Could not refresh signed URL, using stored one:', err?.message);
            }
        }
        setPdfViewer({
            visible: true,
            uri,
            localUri: f.photoLocalUri,
            fileName: f.photoName || 'document.pdf',
        });
    };

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!isFormValid) {
            setSubmitted(true);
            showToast(t('dobFillRequired'), 'danger');
            return;
        }
        setErrorMsg(null);
        try {
            setSubmitting(true);
            const payload = buildPayload(form);
            const res = await deliveryAPI.onboard(payload, token);

            const partner = res.data?.partner;
            if (partner?.user) {
                await login(partner.user, token, undefined);
            }
            const autoApproved = res.data?.auto_approved === true;
            setSuccessMsg(
                autoApproved
                    ? t('dobApproved')
                    : t('dobSubmitted')
            );
            setTimeout(() => {
                if (onComplete) onComplete();
                else navigation?.navigate('DeliveryApp');
            }, 2500);
        } catch (err) {
            setErrorMsg(err.message || t('dobSubmitFail'));
        } finally {
            setSubmitting(false);
        }
    };

    // ── Upload props helper ────────────────────────────────────────────────
    const uploadBoxProps = (target) => ({
        uploading: uploading === target,
        progress: uploadProgress?.target === target ? uploadProgress.pct : null,
        error: visibleErrors[`${target}.photoUrl`] || (uploadError?.target === target ? uploadError.message : null),
        onRetry: uploadError?.target === target ? retryLastUpload : null,
        onRemove: () => handleRemoveClick(target),
    });

    const progressPct = (target) => (uploadProgress?.target === target ? uploadProgress.pct : null);

    // ───────────────────────────────────────────────────────────────────────
    // RENDER
    // ───────────────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <StatusBar barStyle="light-content" backgroundColor={C.greenDeep} />

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
                    <View style={s.heroNav}>
                        <TouchableOpacity
                            onPress={handleBack}
                            style={s.backBtn}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={t('dobBackRoles')}
                        >
                            <Text style={s.backArrow}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.heroEyebrow}>{t('dobEyebrow')}</Text>
                            <Text style={s.heroTitle}>{t('dobTitle')}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setShowLanguage(true)}
                            style={s.langBtn}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={t('dobLanguage')}
                        >
                            <Text style={s.langBtnIcon}>🌐</Text>
                        </TouchableOpacity>
                        <View style={s.heroBadge}>
                            <Text style={s.heroBadgeTxt}>{t('dobSteps')}</Text>
                        </View>
                    </View>

                    <View style={s.heroStats}>
                        {[
                            { value: t('dobStat1V'), label: t('dobStat1L') },
                            { value: t('dobStat2V'), label: t('dobStat2L') },
                            { value: t('dobStat3V'), label: t('dobStat3L') },
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
                <SectionCard
                    title={t('dobS1Title')}
                    subtitle={t('dobS1Sub')}
                    stepIndex="1"
                    completed={sectionComplete(form, 0)}
                >
                    <View style={{ alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => pickImage('profile')}
                            activeOpacity={0.85}
                            style={s.profilePhotoWrap}
                            disabled={uploading === 'profile'}
                            accessibilityRole="button"
                            accessibilityLabel={t('dobUploadPhotoA11y')}
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
                            {form.profile.photoLocalUri ? t('dobTapChange') : t('dobTapUpload')}
                        </Text>

                        {uploading === 'profile' && progressPct('profile') != null ? (
                            <View style={s.inlineProgress}>
                                <ActivityIndicator color={C.green} size="small" />
                                <Text style={s.inlineProgressTxt}>{t('dobUploadingPct', { pct: progressPct('profile') })}</Text>
                            </View>
                        ) : null}

                        {form.profile.photoUrl ? (
                            <View style={s.uploadedRow}>
                                <Text style={s.uploadedCheck}>✓</Text>
                                <Text style={s.uploadedOkTxt}>{t('dobImageUploaded')}</Text>
                                <TouchableOpacity onPress={() => handleReCrop('profile')} accessibilityRole="button" accessibilityLabel={t('dobCropAgainA11y')}>
                                    <Text style={s.recropLink}>{t('dobCropAgain')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleRemoveClick('profile')} accessibilityRole="button">
                                    <Text style={s.removeLink}>{t('dobRemove')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        {visibleErrors['profile.photoUrl'] ? (
                            <Text style={s.fieldError}>{visibleErrors['profile.photoUrl']}</Text>
                        ) : null}
                    </View>
                    <TipBox text={t('dobTipPhoto')} />
                </SectionCard>

                {/* ── SECTION 2 — Driving License ── */}
                <SectionCard
                    title={t('dobS2Title')}
                    subtitle={t('dobS2Sub')}
                    stepIndex="2"
                    completed={sectionComplete(form, 1)}
                >
                    <OnboardingField label={t('dobLicNumber')} required errorKey="license.number" errors={visibleErrors}>
                        <Input
                            value={form.license.number}
                            onChangeText={(v) => setField('license', 'number', v.toUpperCase())}
                            placeholder={t('dobLicNumberPh')}
                            maxLength={20}
                            autoCapitalize="characters"
                            onBlur={() => markTouched('license.number')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobExpiry')} required errorKey="license.expiry" errors={visibleErrors}>
                        <Input
                            value={form.license.expiry}
                            onChangeText={(v) => setField('license', 'expiry', v)}
                            placeholder={t('dobExpiryPh')}
                            keyboardType="numeric"
                            maxLength={7}
                            onBlur={() => markTouched('license.expiry')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobLicPhoto')} required errorKey="license.photoUrl" errors={visibleErrors}>
                        <UploadBox
                            accept="image-pdf"
                            label={t('dobLicUploadLabel')}
                            hint={t('dobLicUploadHint')}
                            icon="🪪"
                            file={form.license.photoUrl
                                ? { uri: form.license.photoLocalUri, name: form.license.photoName, mime: form.license.photoMime, size: form.license.photoSize }
                                : null}
                            onPick={() => pickImage('license')}
                            onFile={(fd) => handleDocFile(fd, 'license')}
                            onView={form.license.photoMime === 'application/pdf' ? () => openPdfViewer('license') : null}
                            onCrop={form.license.photoLocalUri && form.license.photoMime !== 'application/pdf' ? () => handleReCrop('license') : undefined}
                            {...uploadBoxProps('license')}
                        />
                    </OnboardingField>

                    <TipBox text={t('dobTipLicense')} />
                </SectionCard>

                {/* ── SECTION 3 — Vehicle Details ── */}
                <SectionCard
                    title={t('dobS3Title')}
                    subtitle={t('dobS3Sub')}
                    stepIndex="3"
                    completed={sectionComplete(form, 2)}
                >
                    <OnboardingField label={t('dobVehType')} required errorKey="vehicle.type" errors={visibleErrors}>
                        <ChipSelect
                            options={VEHICLE_TYPES}
                            renderLabel={(o) => t(`delivery.vt_${o.toLowerCase()}`, { defaultValue: o })}
                            selected={form.vehicle.type}
                            onSelect={(v) => { setField('vehicle', 'type', v); markTouched('vehicle.type'); }}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobRegNumber')} required errorKey="vehicle.registration" errors={visibleErrors}>
                        <Input
                            value={form.vehicle.registration}
                            onChangeText={(v) => setField('vehicle', 'registration', v.toUpperCase())}
                            placeholder={t('dobRegNumberPh')}
                            maxLength={15}
                            autoCapitalize="characters"
                            onBlur={() => markTouched('vehicle.registration')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobMfgYear')} errorKey="vehicle.year" errors={visibleErrors}>
                        <Input
                            value={form.vehicle.year}
                            onChangeText={(v) => setField('vehicle', 'year', v)}
                            placeholder={t('dobMfgYearPh')}
                            keyboardType="numeric"
                            maxLength={4}
                            onBlur={() => markTouched('vehicle.year')}
                        />
                    </OnboardingField>
                </SectionCard>

                {/* ── SECTION 4 — RC (Registration Certificate) ── */}
                <SectionCard
                    title={t('dobS4Title')}
                    subtitle={t('dobS4Sub')}
                    stepIndex="4"
                    completed={sectionComplete(form, 3)}
                >
                    <OnboardingField label={t('dobRcNumber')} errorKey="rc.number" errors={visibleErrors}>
                        <Input
                            value={form.rc.number}
                            onChangeText={(v) => setField('rc', 'number', v.toUpperCase())}
                            placeholder={t('dobRcNumberPh')}
                            maxLength={20}
                            autoCapitalize="characters"
                            onBlur={() => markTouched('rc.number')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobRcDocument')} required errorKey="rc.photoUrl" errors={visibleErrors}>
                        <View style={s.rcButtonRow}>
                            <TouchableOpacity
                                style={s.rcPickerBtn}
                                onPress={() => pickImage('rc')}
                                disabled={uploading === 'rc'}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                            >
                                <Text style={s.rcPickerBtnIcon}>📷</Text>
                                <Text style={s.rcPickerBtnTxt}>{t('dobBtnPhoto')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.rcPickerBtn}
                                onPress={pickDocument}
                                disabled={uploading === 'rc'}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                            >
                                <Text style={s.rcPickerBtnIcon}>📄</Text>
                                <Text style={s.rcPickerBtnTxt}>{t('dobBtnPdf')}</Text>
                            </TouchableOpacity>
                        </View>

                        <UploadBox
                            accept="image-pdf"
                            label={t('dobRcUploadLabel')}
                            hint={t('dobRcUploadHint')}
                            icon="📄"
                            file={form.rc.photoUrl
                                ? { uri: form.rc.photoLocalUri, name: form.rc.photoName, mime: form.rc.photoMime, size: form.rc.photoSize }
                                : null}
                            onPick={pickDocument}
                            onFile={(fd) => handleDocFile(fd, 'rc')}
                            onView={form.rc.photoMime === 'application/pdf' ? () => openPdfViewer('rc') : null}
                            onCrop={form.rc.photoLocalUri && form.rc.photoMime !== 'application/pdf' ? () => handleReCrop('rc') : undefined}
                            {...uploadBoxProps('rc')}
                        />
                    </OnboardingField>

                    <TipBox icon="📋" text={t('dobTipRc')} />
                </SectionCard>

                {/* ── SECTION 5 — Bank Details ── */}
                <SectionCard
                    title={t('dobS5Title')}
                    subtitle={t('dobS5Sub')}
                    stepIndex="5"
                    completed={sectionComplete(form, 4)}
                >
                    <View style={s.securityRow}>
                        <Text style={{ fontSize: 15 }}>🔒</Text>
                        <Text style={s.securityText}>{t('dobSecurity')}</Text>
                    </View>

                    <OnboardingField label={t('dobHolder')} required errorKey="bank.accountHolderName" errors={visibleErrors}>
                        <Input
                            value={form.bank.accountHolderName}
                            onChangeText={(v) => setField('bank', 'accountHolderName', v)}
                            placeholder={t('dobHolderPh')}
                            onBlur={() => markTouched('bank.accountHolderName')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobBankName')} errorKey="bank.bankName" errors={visibleErrors}>
                        <Input
                            value={form.bank.bankName}
                            onChangeText={(v) => setField('bank', 'bankName', v)}
                            placeholder={t('dobBankNamePh')}
                            onBlur={() => markTouched('bank.bankName')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobAccNumber')} required errorKey="bank.accountNumber" errors={visibleErrors}>
                        <Input
                            value={form.bank.accountNumber}
                            onChangeText={(v) => setField('bank', 'accountNumber', v)}
                            placeholder={t('dobAccNumberPh')}
                            keyboardType="numeric"
                            secureTextEntry
                            maxLength={18}
                            onBlur={() => markTouched('bank.accountNumber')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobConfirmAcc')} required errorKey="bank.confirmAccount" errors={visibleErrors}>
                        <Input
                            value={form.bank.confirmAccount}
                            onChangeText={(v) => setField('bank', 'confirmAccount', v)}
                            placeholder={t('dobConfirmAccPh')}
                            keyboardType="numeric"
                            maxLength={18}
                            onBlur={() => markTouched('bank.confirmAccount')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobIfsc')} required errorKey="bank.ifsc" errors={visibleErrors}>
                        <Input
                            value={form.bank.ifsc}
                            onChangeText={(v) => setField('bank', 'ifsc', v.toUpperCase())}
                            placeholder={t('dobIfscPh')}
                            maxLength={11}
                            autoCapitalize="characters"
                            onBlur={() => markTouched('bank.ifsc')}
                        />
                    </OnboardingField>

                    <TipBox text={t('dobTipIfsc')} />
                </SectionCard>

                {/* ── SECTION 6 — Education & Training ── */}
                <SectionCard
                    title={t('dobS6Title')}
                    subtitle={t('dobS6Sub')}
                    stepIndex="6"
                    completed={sectionComplete(form, 5)}
                >
                    <OnboardingField label={t('dobEduLevel')} required errorKey="education.level" errors={visibleErrors}>
                        <ChipSelect
                            options={EDU_LEVELS}
                            renderLabel={(o) => t(`dobEdu_${o}`, { defaultValue: o })}
                            selected={form.education.level}
                            onSelect={(v) => { setField('education', 'level', v); markTouched('education.level'); }}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobInstitution')} errorKey="education.institution" errors={visibleErrors}>
                        <Input
                            value={form.education.institution}
                            onChangeText={(v) => setField('education', 'institution', v)}
                            placeholder={t('dobInstitutionPh')}
                            onBlur={() => markTouched('education.institution')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobPassYear')} errorKey="education.passingYear" errors={visibleErrors}>
                        <Input
                            value={form.education.passingYear}
                            onChangeText={(v) => setField('education', 'passingYear', v)}
                            placeholder={t('dobPassYearPh')}
                            keyboardType="numeric"
                            maxLength={4}
                            onBlur={() => markTouched('education.passingYear')}
                        />
                    </OnboardingField>

                    <OnboardingField label={t('dobTraining')} errorKey="education.trainings" errors={visibleErrors}>
                        <ChipSelect
                            options={TRAINING_OPTS}
                            renderLabel={(o) => t(`dobTr_${o}`, { defaultValue: o })}
                            selected={form.education.trainings}
                            onSelect={(v) => setField('education', 'trainings', v)}
                            multi
                        />
                    </OnboardingField>
                </SectionCard>

                {/* Summary Strip */}
                <View style={s.summaryStrip}>
                    <Text style={{ fontSize: 28 }}>🎉</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={s.summaryTitle}>{t('dobAlmostDone')}</Text>
                        <View style={s.summaryTextRow}>
                            <Text style={s.summaryText}>{t('dobAlmostA')}</Text>
                            <Text style={s.summaryAccent}>{t('dobAlmostHours')}</Text>
                            <Text style={s.summaryText}>{t('dobAlmostB')}</Text>
                        </View>
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
                            {t('dobRedirecting')}
                        </Text>
                    </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={[s.submitBtn, !isFormValid && s.submitBtnDisabled, (submitting || uploading !== null) && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={submitting || uploading !== null}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t('dobSubmitA11y')}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Text style={s.submitBtnTxt}>{t('dobSubmit')}</Text>
                            <Text style={s.submitBtnArrow}>→</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={s.bottomNoteWrap}>
                    <Text style={s.bottomNote}>{t('dobAgreeA')}</Text>
                    <Text style={s.bottomNoteLink}>{t('dobTerms')}</Text>
                    <Text style={s.bottomNote}>{t('dobAnd')}</Text>
                    <Text style={s.bottomNoteLink}>{t('dobPrivacy')}</Text>
                    <Text style={s.bottomNote}>{t('dobAgreeB')}</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Crop Modal (works for every image field) ── */}
            <ImageCropModal
                visible={!!cropState?.visible}
                sourceUri={cropState?.sourceUri}
                title={cropState?.title}
                defaultMode={cropState?.mode || 'free'}
                onCancel={() => setCropState(null)}
                onConfirm={handleImageConfirmed}
            />

            {/* ── PDF Viewer Modal ── */}
            <PdfViewerModal
                visible={!!pdfViewer?.visible}
                uri={pdfViewer?.uri}
                fileName={pdfViewer?.fileName}
                onClose={() => setPdfViewer(null)}
            />

            {/* ── Remove Confirmation (custom modal — all upload fields) ── */}
            <RemovalConfirmDialog
                visible={!!removeConfirm}
                fileName={removeConfirm?.fileName}
                onConfirm={handleConfirmRemove}
                onCancel={() => setRemoveConfirm(null)}
            />

            {/* ── Language Picker Modal ── */}
            <Modal visible={showLanguage} transparent animationType="slide" onRequestClose={() => setShowLanguage(false)}>
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
                    onPress={() => setShowLanguage(false)}
                >
                    <Pressable
                        style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '80%' }}
                        onPress={(e) => e.stopPropagation?.()}
                    >
                        <View style={{ width: 44, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginBottom: 16 }} />
                        <LanguageSwitcher inline onClose={() => setShowLanguage(false)} />
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Toast ── */}
            <ToastBanner key={toast?.id} message={toast?.message} visible={!!toast} type={toast?.type} />
        </KeyboardAvoidingView>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    // ── Hero ──
    hero: { paddingTop: Platform.OS === 'ios' ? 52 : StatusBar.currentHeight + 12 || 36, paddingBottom: 0, paddingHorizontal: 20, marginHorizontal: -20, marginTop: -16 },
    heroNav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    backArrow: { fontSize: 18, color: '#fff', fontWeight: '400' },
    langBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', marginRight: 8 },
    langBtnIcon: { fontSize: 17 },
    heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    heroBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 1.5 },
    heroEyebrow: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
    heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3, lineHeight: 26 },
    heroStats: { flexDirection: 'row', gap: 8, paddingBottom: 22 },
    heroStatPill: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    heroStatValue: { fontSize: 12, fontWeight: '800', color: '#fff', marginBottom: 1 },
    heroStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.2 },
    heroWave: { height: 22, backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginHorizontal: -20, marginBottom: -1 },

    scrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingTop: 16 },

    progressWrap: { marginBottom: 12, marginHorizontal: 2 },
    progressTrack: { flexDirection: 'row', marginBottom: 4 },
    progressSeg: { flex: 1, height: 4, borderRadius: 10, backgroundColor: C.border },
    progressSegFilled: { backgroundColor: C.green },
    progressTxt: { fontSize: 10, color: C.textLight, fontWeight: '700', textAlign: 'right', letterSpacing: 0.3 },

    card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: '#E8F0E8', shadowColor: '#147832', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 14, elevation: 5 },
    cardCompleted: { borderColor: C.greenMid },
    cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    stepNumWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    stepNumWrapPending: { backgroundColor: '#E5E7EB' },
    stepNumWrapDone: { backgroundColor: C.green },
    stepNum: { fontSize: 13, fontWeight: '900', color: '#6B7280' },
    stepCheck: { fontSize: 13, fontWeight: '900', color: '#fff' },
    cardTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 1, letterSpacing: -0.3 },
    cardSubtitle: { fontSize: 11, color: C.textXLight, fontWeight: '500' },
    cardDivider: { height: 1, backgroundColor: '#F5F6F5' },
    cardBody: { padding: 16, gap: 14 },

    fieldError: { fontSize: 11, color: C.red, fontWeight: '600', marginTop: 1 },

    input: { borderWidth: 1.5, borderColor: '#E8EAE8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 12, fontSize: 14, color: C.text, backgroundColor: '#FAFCFA', fontWeight: '500', minHeight: 44 },
    inputFocused: { borderColor: C.green, backgroundColor: '#fff', shadowColor: C.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1.5, borderColor: '#E2E8E2', backgroundColor: '#F8FAF8', minHeight: 38 },
    chipActive: { borderColor: C.green, backgroundColor: C.greenLight },
    chipTxt: { fontSize: 13, fontWeight: '600', color: C.textLight },
    chipTxtActive: { color: C.greenDeep, fontWeight: '800' },

    profilePhotoWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', borderWidth: 2.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
    profilePhoto: { width: 100, height: 100, borderRadius: 50 },
    profilePhotoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, backgroundColor: '#EEF0F3' },
    profilePhotoHead: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#C5CAD3', marginBottom: 2 },
    profilePhotoSilhouette: { position: 'absolute', bottom: 0, width: 66, height: 44, borderTopLeftRadius: 33, borderTopRightRadius: 33, backgroundColor: '#C5CAD3' },
    profilePhotoCam: { position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    profilePhotoHint: { fontSize: 11, color: C.textXLight, fontWeight: '500', marginTop: 6 },

    inlineProgress: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    inlineProgressTxt: { fontSize: 11, color: C.textLight, fontWeight: '700' },
    uploadedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    uploadedCheck: { fontSize: 13, fontWeight: '900', color: '#fff', backgroundColor: C.green, width: 18, height: 18, borderRadius: 9, textAlign: 'center', lineHeight: 18 },
    uploadedOkTxt: { fontSize: 11, fontWeight: '700', color: C.greenDeep },
    recropLink: { fontSize: 12, fontWeight: '800', color: C.blue, marginLeft: 4 },
    removeLink: { fontSize: 12, fontWeight: '800', color: C.red, marginLeft: 4 },

    // ── RC specific ──
    rcButtonRow: { flexDirection: 'row', gap: 10 },
    rcPickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: C.green, borderRadius: 10, paddingVertical: 12, backgroundColor: C.greenLight, minHeight: 44 },
    rcPickerBtnIcon: { fontSize: 18 },
    rcPickerBtnTxt: { fontSize: 13, fontWeight: '700', color: C.greenDeep },

    tipBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.yellowLight, borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: C.yellowBorder },
    tipIcon: { fontSize: 15 },
    tipText: { flex: 1, fontSize: 12, color: C.yellowText, lineHeight: 18, fontWeight: '500' },

    securityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.greenLight, borderRadius: 10, padding: 10, gap: 8, borderWidth: 1, borderColor: C.greenMid },
    securityText: { flex: 1, fontSize: 12, color: C.greenDeep, fontWeight: '600' },

    summaryStrip: { backgroundColor: C.greenDeep, borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    summaryTitle: { fontSize: 14, fontWeight: '900', color: '#fff', marginBottom: 3 },
    summaryTextRow: { flexDirection: 'row', flexWrap: 'wrap' },
    summaryText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 18, flexShrink: 1 },
    summaryAccent: { fontSize: 12, fontWeight: '800', color: '#86EFAC', lineHeight: 18 },

    submitBtn: { backgroundColor: C.green, borderRadius: 16, paddingVertical: 17, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6, marginBottom: 14, minHeight: 52 },
    submitBtnDisabled: { backgroundColor: '#9CA3AF', opacity: 0.5, elevation: 0, shadowOpacity: 0 },
    submitBtnTxt: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.2 },
    submitBtnArrow: { fontSize: 16, color: '#fff', fontWeight: '900' },
    bottomNoteWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 4, paddingHorizontal: 8 },
    bottomNote: { textAlign: 'center', fontSize: 11, color: C.textXLight, lineHeight: 17 },
    bottomNoteLink: { fontSize: 11, color: C.green, fontWeight: '700', lineHeight: 17 },

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