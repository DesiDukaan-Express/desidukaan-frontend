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
    KeyboardAvoidingView, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
// Google's Material Symbols (fonts.google.com/icons), packaged for React Native.
// Ionicons covers the rounded/outline glyphs; MaterialCommunityIcons covers the
// vehicle glyphs. Both ship with Expo by default — no extra install needed.
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import useAuthStore from '../../store/authStore';
import { uploadAPI, deliveryAPI } from '../../services/api';
import OnboardingField from '../../components/onboarding/OnboardingField';
import UploadBox from '../../components/onboarding/UploadBox';
import ImageCropModal from '../../components/onboarding/ImageCropModal';
import PdfViewerModal from '../../components/onboarding/PdfViewerModal';
import RemovalConfirmDialog from '../../components/onboarding/RemovalConfirmDialog';
import ToastBanner from '../../components/common/ToastBanner';
import { C } from '../../components/onboarding/onboardingTheme';
import BANK_BRANCH_DATA from '../../data/bankBranches.json';
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
        number: '', expiry: '', issuingAuthority: '',
        photoUrl: '', photoLocalUri: '', photoPublicId: '',
        photoMime: '', photoName: '', photoSize: null,
    },
    vehicle: { type: '', registration: '', makeModel: '', year: '' },
    vehicleRc: {
        photoUrl: '', photoLocalUri: '', photoPublicId: '',
        photoName: '', photoMime: '', photoSize: null,
    },
    insurance: {
        photoUrl: '', photoLocalUri: '', photoPublicId: '',
        photoName: '', photoMime: '', photoSize: null,
    },
    rc: {
        number: '',
        photoUrl: '', photoLocalUri: '', photoPublicId: '',
        photoName: '', photoMime: '', photoSize: null,
    },
    rcBack: {
        photoUrl: '', photoLocalUri: '', photoPublicId: '',
        photoName: '', photoMime: '', photoSize: null,
    },
    bank: {
        accountHolderName: '', bankName: '', accountNumber: '',
        ifsc: '', branch: '',
    },
    education: { level: '', institution: '', passingYear: '', trainings: [] },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. VALIDATION  (per-field, used for on-blur + submit + section completion)
// ─────────────────────────────────────────────────────────────────────────────

const getVal = (form, key) =>
    key.split('.').reduce((o, p) => (o ? o[p] : undefined), form);

const validators = {
    'profile.photoUrl': (_v, form) => (form.profile.photoUrl ? null : 'Profile photo is required'),

    'license.number': (v) => {
        if (!v.trim()) return 'License number is required';
        if (!/^[A-Z]{2}[A-Z0-9]{6,18}$/.test(v.trim())) return 'Invalid license number format (e.g. TS0720190012345)';
        return null;
    },
    'license.expiry': (v) => {
        if (!v.trim()) return 'Expiry date is required';
        const m = v.trim().match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
        if (!m) return 'Use MM/YYYY format (e.g. 05/2030)';
        const end = new Date(+m[2], +m[1], 0, 23, 59, 59);
        if (end < new Date()) return 'License has expired';
        return null;
    },
    'license.photoUrl': (_v, form) => (form.license.photoUrl ? null : 'License photo is required'),

    'vehicle.type': (v) => (v ? null : 'Select your vehicle type'),
    'vehicle.registration': (v) => {
        if (!v.trim()) return 'Registration number is required';
        const compact = v.replace(/\s+/g, '').toUpperCase();
        if (!/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(compact)) return 'Invalid registration number (e.g. TS09EF1234)';
        return null;
    },
    'vehicle.year': (v) => {
        if (!v.trim()) return null;
        if (!/^(19|20)\d{2}$/.test(v.trim())) return 'Enter a valid 4-digit year';
        const y = +v.trim();
        if (y < 1990 || y > new Date().getFullYear() + 1) return `Year must be between 1990 and ${new Date().getFullYear() + 1}`;
        return null;
    },

    'rc.number': (v) => {
        if (!v.trim()) return null;
        if (!/^[A-Z0-9]{5,20}$/.test(v.trim())) return 'Invalid RC number';
        return null;
    },
    'rc.photoUrl': (_v, form) => (form.rc.photoUrl ? null : 'RC document is required (image or PDF)'),

    'bank.accountHolderName': (v) => (v.trim() ? null : 'Account holder name is required'),
    'bank.accountNumber': (v) => (v.trim() ? null : 'Account number is required'),
    'bank.ifsc': (v) => {
        if (!v.trim()) return 'IFSC code is required';
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.trim())) return 'Invalid IFSC (e.g. SBIN0001234)';
        return null;
    },

    'education.level': (v) => (v ? null : 'Select your education level'),
    'education.passingYear': (v) => {
        if (!v.trim()) return null;
        if (!/^(19|20)\d{2}$/.test(v.trim())) return 'Enter a valid 4-digit year';
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
    ['bank.accountHolderName', 'bank.accountNumber', 'bank.ifsc'],
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
        license_issuing_authority: form.license.issuingAuthority || null,
        license_photo_url: form.license.photoUrl || null,
        license_photo_public_id: form.license.photoPublicId || null,
        vehicle_type: form.vehicle.type.toLowerCase(),
        vehicle_number: form.vehicle.registration.trim().toUpperCase(),
        vehicle_make_model: form.vehicle.makeModel.trim() || null,
        vehicle_year: form.vehicle.year.trim() || null,
        vehicle_rc_photo_url: form.vehicleRc.photoUrl || null,
        insurance_photo_url: form.insurance.photoUrl || null,
        rc_number: form.rc.number.trim().toUpperCase() || null,
        rc_photo_url: form.rc.photoUrl || null,
        rc_photo_public_id: form.rc.photoPublicId || null,
        rc_back_photo_url: form.rcBack.photoUrl || null,
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

const VEHICLE_TYPES = [
    { value: 'Motorcycle', icon: 'motorbike' },
    { value: 'Scooter', icon: 'scooter' },
    { value: 'Car', icon: 'car-outline' },
    { value: 'Other', icon: 'dots-grid' },
];
const RTO_OPTIONS = [
    'TS - Telangana', 'AP - Andhra Pradesh', 'KA - Karnataka', 'MH - Maharashtra',
    'DL - Delhi', 'TN - Tamil Nadu', 'UP - Uttar Pradesh', 'GJ - Gujarat',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 26 }, (_, i) => String(CURRENT_YEAR - i));
const BANK_OPTIONS = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
    'Punjab National Bank', 'Bank of Baroda', 'Kotak Mahindra Bank', 'Canara Bank', 'Other',
];
// Offline branch dataset for the banks above (~49,800 real branches, sourced
// from public IFSC records — see src/data/bankBranches.json). Keyed by the
// same bank names used in BANK_OPTIONS; each entry is a
// [branchName, city, state, ifsc] tuple. Bundled with the app so branch
// search works with no network call and no backend dependency.
const EDU_LEVELS = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Post Graduate', 'Other'];
const TRAINING_OPTS = [
    'Food Delivery Training', 'Road Safety Course',
    'Customer Service', 'First Aid', 'Navigation & Maps',
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. ATOMS
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, stepIndex, completed, children, infoBadge }) {
    return (
        <View style={[s.card, completed && s.cardCompleted]}>
            <View style={s.cardHeader}>
                <View style={[s.stepNumWrap, completed ? s.stepNumWrapDone : s.stepNumWrapPending]}>
                    {completed ? <Ionicons name="checkmark" size={16} color="#fff" style={s.stepCheck} /> : <Text style={s.stepNum}>{stepIndex}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{title}</Text>
                    {subtitle ? <Text style={s.cardSubtitle}>{subtitle}</Text> : null}
                </View>
                {infoBadge ? (
                    <TouchableOpacity style={s.infoPill} activeOpacity={0.7} accessibilityRole="button">
                        <Text style={s.infoPillTxt}>{infoBadge}</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <View style={s.cardDivider} />
            <View style={s.cardBody}>{children}</View>
        </View>
    );
}

function Input({ value, onChangeText, placeholder, keyboardType, maxLength, secureTextEntry, autoCapitalize = 'none', onBlur, editable = true, style }) {
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
            editable={editable}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); onBlur?.(); }}
            style={[s.input, focused && s.inputFocused, style]}
            accessibilityLabel={placeholder}
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
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                    >
                        <Text style={[s.chipTxt, active && s.chipTxtActive]}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function TipBox({ text }) {
    return (
        <View style={s.tipBox}>
            <Ionicons name="bulb-outline" size={16} color="#B8860B" style={s.tipIcon} />
            <Text style={s.tipText}>{text}</Text>
        </View>
    );
}

// Blue informational note (used for RC / vehicle document reminders)
function InfoNote({ text }) {
    return (
        <View style={s.infoNote}>
            <Ionicons name="information-circle" size={17} color="#2563EB" style={s.infoNoteIcon} />
            <Text style={s.infoNoteText}>{text}</Text>
        </View>
    );
}

// Two-column responsive row — stacks on narrow screens automatically
function FieldRow({ children }) {
    return <View style={s.fieldRow}>{children}</View>;
}

// Lightweight inline dropdown (no external picker dependency).
// The option list expands INLINE below the input (pushing the rest of the
// form down) rather than floating on top of it — this avoids z-index /
// stacking-order clipping issues across platforms, especially on web where
// absolutely-positioned overlays can get painted underneath later siblings.
function SelectInput({ value, onSelect, options, placeholder = 'Select', onBlur }) {
    const [open, setOpen] = useState(false);
    return (
        <View>
            <TouchableOpacity
                style={[s.input, s.selectInput, open && s.inputFocused]}
                activeOpacity={0.8}
                onPress={() => setOpen((o) => {
                    const next = !o;
                    if (!next) onBlur?.();
                    return next;
                })}
                accessibilityRole="button"
            >
                <Text style={value ? s.selectValueTxt : s.selectPlaceholderTxt} numberOfLines={1}>
                    {value || placeholder}
                </Text>
                <Text style={s.selectChevron}>{open ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {open ? (
                <View style={s.selectDropdown}>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator>
                        {options.map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                style={s.selectOption}
                                onPress={() => { onSelect(opt); setOpen(false); onBlur?.(); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.selectOptionTxt, opt === value && s.selectOptionTxtActive]}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}

// Branch picker — same "Select ___" dropdown look as SelectInput above. The
// branch list comes from a dataset bundled with the app (src/data/bankBranches.json,
// ~49,800 real branches across the 8 banks below, sourced from public IFSC
// records), so this works fully offline with no dependency on any external
// API. Pick a bank, then type your city or branch name to filter; selecting a
// branch auto-fills the IFSC code.
function BranchPicker({ bankName, value, onSelectBranch, onBlur }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const allBranches = BANK_BRANCH_DATA[bankName]; // [branch, city, state, ifsc][]

    const results = useMemo(() => {
        if (!allBranches) return [];
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        const matches = [];
        for (const row of allBranches) {
            const [branch, city] = row;
            if (branch.toLowerCase().includes(q) || city.toLowerCase().includes(q)) {
                matches.push(row);
                if (matches.length >= 40) break; // cap render count for a snappy list
            }
        }
        return matches;
    }, [allBranches, query]);

    if (!allBranches) {
        return (
            <View style={[s.input, s.selectInput, s.selectDisabled]}>
                <Text style={s.selectPlaceholderTxt} numberOfLines={1}>Select your bank above first</Text>
            </View>
        );
    }

    return (
        <View>
            <TouchableOpacity
                style={[s.input, s.selectInput, open && s.inputFocused]}
                activeOpacity={0.8}
                onPress={() => setOpen((o) => {
                    const next = !o;
                    if (!next) onBlur?.();
                    return next;
                })}
                accessibilityRole="button"
            >
                <Text style={value ? s.selectValueTxt : s.selectPlaceholderTxt} numberOfLines={1}>
                    {value || 'Select your branch'}
                </Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textLight} style={s.selectChevron} />
            </TouchableOpacity>
            {open ? (
                <View style={s.selectDropdown}>
                    <View style={s.branchSearchRow}>
                        <Ionicons name="search" size={14} color={C.textLight} />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Type city or branch name"
                            placeholderTextColor={C.textXLight}
                            style={s.branchSearchInput}
                            autoCapitalize="words"
                            autoFocus
                        />
                    </View>
                    <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                        {query.trim().length < 2 ? (
                            <View style={s.branchStatusBox}>
                                <Ionicons name="information-circle" size={15} color={C.textLight} />
                                <Text style={s.ifscStatusTextMuted}>Type at least 2 letters — e.g. your city or branch name</Text>
                            </View>
                        ) : results.length === 0 ? (
                            <View style={s.branchStatusBox}>
                                <Ionicons name="alert-circle" size={15} color="#B8860B" />
                                <Text style={s.ifscStatusTextMuted}>No matches — try a different spelling, or enter your IFSC code below.</Text>
                            </View>
                        ) : (
                            results.map(([branch, city, state, ifsc]) => (
                                <TouchableOpacity
                                    key={ifsc}
                                    style={s.selectOption}
                                    onPress={() => {
                                        onSelectBranch({ BANK: bankName, BRANCH: branch, CITY: city, STATE: state, IFSC: ifsc });
                                        setOpen(false);
                                        onBlur?.();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.selectOptionTxt, branch === value && s.selectOptionTxtActive]} numberOfLines={1}>
                                        {branch}
                                    </Text>
                                    <Text style={s.branchOptionSub} numberOfLines={1}>
                                        {city}{state ? `, ${state}` : ''} · {ifsc}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : null}
        </View>
    );
}


function VehicleTypeGrid({ options, selected, onSelect }) {
    return (
        <View style={s.vehicleGrid}>
            {options.map((opt) => {
                const active = selected === opt.value;
                return (
                    <TouchableOpacity
                        key={opt.value}
                        style={[s.vehicleGridItem, active && s.vehicleGridItemActive]}
                        onPress={() => onSelect(opt.value)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                    >
                        <MaterialCommunityIcons
                            name={opt.icon}
                            size={26}
                            color={active ? C.green : '#8A9088'}
                            style={s.vehicleGridIcon}
                        />
                        <Text style={[s.vehicleGridLabel, active && s.vehicleGridLabelActive]}>{opt.value}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// Green checklist box shown next to the profile photo uploader
function PhotoGuidelinesBox() {
    const points = [
        'Clear, well-lit photo',
        'Face must be fully visible',
        'No sunglasses or filters',
        'Use a recent photo',
        'Accepted formats: JPG, PNG (Max 5MB)',
    ];
    return (
        <View style={s.guidelinesBox}>
            <Text style={s.guidelinesTitle}>Photo Guidelines</Text>
            {points.map((p) => (
                <View key={p} style={s.guidelinesRow}>
                    <Text style={s.guidelinesCheck}>✓</Text>
                    <Text style={s.guidelinesText}>{p}</Text>
                </View>
            ))}
        </View>
    );
}

function ProgressBar({ form }) {
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
                {filled} of {completions.length} sections completed
            </Text>
        </View>
    );
}

const STEP_LABELS = ['Personal Info', 'Documents', 'Vehicle Info', 'Bank Details', 'Business Info', 'Review & Submit'];

function StepperBar({ form }) {
    const completions = SECTION_FIELDS.map((_, i) => sectionComplete(form, i));
    const filled = completions.filter(Boolean).length;
    const firstIncomplete = completions.findIndex((d) => !d);
    const activeIdx = firstIncomplete === -1 ? completions.length - 1 : firstIncomplete;

    return (
        <View style={s.stepperCard}>
            <Text style={s.stepperOfTxt}>Step {activeIdx + 1} of {completions.length}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stepperRow}>
                {STEP_LABELS.map((label, i) => {
                    const done = completions[i];
                    const isActive = i === activeIdx && !done;
                    return (
                        <React.Fragment key={label}>
                            <View style={s.stepperItem}>
                                <View style={[
                                    s.stepperCircle,
                                    done && s.stepperCircleDone,
                                    isActive && s.stepperCircleActive,
                                ]}>
                                    {done
                                        ? <Text style={s.stepperCheck}>✓</Text>
                                        : <Text style={[s.stepperNum, isActive && s.stepperNumActive]}>{i + 1}</Text>}
                                </View>
                                <Text style={[s.stepperLabel, isActive && s.stepperLabelActive]} numberOfLines={1}>
                                    {label}
                                </Text>
                            </View>
                            {i < STEP_LABELS.length - 1 ? (
                                <View style={[s.stepperLine, done && s.stepperLineDone]} />
                            ) : null}
                        </React.Fragment>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const SUMMARY_ITEMS = [
    'Personal Info', 'Documents', 'Vehicle Info',
    'Bank Details', 'Business Info', 'Review & Submit',
];

function OnboardingSummaryCard({ form }) {
    const completions = SECTION_FIELDS.map((_, i) => sectionComplete(form, i));
    const done = completions.filter(Boolean).length;
    const total = completions.length;
    const firstIncomplete = completions.findIndex((d) => !d);
    const activeIdx = firstIncomplete === -1 ? -1 : firstIncomplete;
    const pct = Math.round((done / total) * 100);

    return (
        <View style={s.sideCard}>
            <View style={s.summaryHeaderRow}>
                <Text style={s.sideCardTitle}>Onboarding Summary</Text>
                <View style={s.progressRing}>
                    <Text style={s.progressRingTxt}>{pct}%</Text>
                </View>
            </View>
            <Text style={s.summarySubTxt}>{done} of {total} steps completed</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
                {SUMMARY_ITEMS.map((label, i) => {
                    const isDone = completions[i];
                    const isActive = i === activeIdx && !isDone;
                    const statusTxt = isDone ? 'Completed' : isActive ? 'In Progress' : 'Not Started';
                    return (
                        <View key={label} style={s.summaryItemRow}>
                            <Text style={s.summaryItemLabel} numberOfLines={1}>{label}</Text>
                            <View style={[
                                s.summaryStatusPill,
                                isDone && s.summaryStatusPillDone,
                                isActive && s.summaryStatusPillActive,
                            ]}>
                                <Text style={[
                                    s.summaryStatusTxt,
                                    isDone && s.summaryStatusTxtDone,
                                    isActive && s.summaryStatusTxtActive,
                                ]}>
                                    {statusTxt}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const WHY_ONBOARD_ITEMS = [
    { icon: '📈', title: 'Grow Your Business', text: 'Access more customers and increase your earnings.' },
    { icon: '💸', title: 'Fast Payouts', text: 'Get paid directly to your bank account.' },
    { icon: '🎧', title: '24/7 Support', text: "We're here to help you every step of the way." },
];

function WhyOnboardCard() {
    return (
        <View style={[s.sideCard, s.whyOnboardCard]}>
            <Text style={s.sideCardTitle}>Why onboard with us?</Text>
            <View style={{ gap: 14, marginTop: 12 }}>
                {WHY_ONBOARD_ITEMS.map((item) => (
                    <View key={item.title} style={s.whyOnboardRow}>
                        <View style={s.whyOnboardIconWrap}>
                            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.whyOnboardItemTitle}>{item.title}</Text>
                            <Text style={s.whyOnboardItemText}>{item.text}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const SMOOTH_TIPS = [
    'Keep all documents handy',
    'Use clear and original documents',
    'Ensure details match on all documents',
    'Complete all steps to start receiving orders',
];

function SmoothOnboardingTipsCard() {
    return (
        <View style={s.sideCard}>
            <Text style={s.sideCardTitle}>Tips for Smooth Onboarding</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
                {SMOOTH_TIPS.map((t) => (
                    <View key={t} style={s.smoothTipRow}>
                        <Text style={s.smoothTipCheck}>✓</Text>
                        <Text style={s.smoothTipText}>{t}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function NeedHelpCard() {
    return (
        <View style={s.sideCard}>
            <Text style={s.sideCardTitle}>Need Help?</Text>
            <Text style={s.needHelpText}>
                Our support team is ready to assist you 24/7.
            </Text>
            <TouchableOpacity style={s.contactBtn} activeOpacity={0.85} accessibilityRole="button">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="call-outline" size={14} color="#fff" />
                    <Text style={s.contactBtnTxt}>Contact Support</Text>
                </View>
            </TouchableOpacity>
            <Text style={s.callText}>Call: 1800-123-4567</Text>
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────


export default function DeliveryOnboarding({ navigation, onComplete }) {
    const token = useAuthStore((state) => state.token);
    const login = useAuthStore((state) => state.login);
    const { width } = useWindowDimensions();
    const isWide = width >= 860;

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
    const [ifscLookup, setIfscLookup] = useState(null);        // { status: 'loading'|'found'|'notfound'|'error', bank, branch, city }

    const markTouched = (key) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));

    // ── Toast ──────────────────────────────────────────────────────────────
    const showToast = (message, type = 'success') =>
        setToast({ message, type, id: Date.now() });

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4200);
        return () => clearTimeout(t);
    }, [toast]);

    // ── Live IFSC verification (in-screen only — no external site) ──────────
    // Once an 11-char, correctly-formatted IFSC is typed, we verify it against
    // Razorpay's free, public, CORS-enabled IFSC directory
    // (https://ifsc.razorpay.com/{code}) directly from the app — no backend
    // changes needed, and nothing ever opens outside this screen. On success,
    // both Bank Name and Bank Branch are auto-filled from the record.
    useEffect(() => {
        const code = form.bank.ifsc.trim().toUpperCase();
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
            setIfscLookup(null);
            setForm((prev) => (prev.bank.branch ? { ...prev, bank: { ...prev.bank, branch: '' } } : prev));
            return;
        }
        let cancelled = false;
        setIfscLookup({ status: 'loading' });
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`https://ifsc.razorpay.com/${code}`);
                if (cancelled) return;
                if (!res.ok) {
                    setIfscLookup({ status: 'notfound' });
                    setForm((prev) => ({ ...prev, bank: { ...prev.bank, branch: '' } }));
                    return;
                }
                const data = await res.json();
                if (cancelled) return;
                setIfscLookup({ status: 'found', bank: data.BANK, branch: data.BRANCH, city: data.CITY });
                setForm((prev) => ({
                    ...prev,
                    bank: { ...prev.bank, bankName: data.BANK || prev.bank.bankName, branch: data.BRANCH || '' },
                }));
            } catch (e) {
                if (!cancelled) setIfscLookup({ status: 'error' });
            }
        }, 400); // small debounce so it doesn't fire on every keystroke
        return () => { cancelled = true; clearTimeout(t); };
    }, [form.bank.ifsc]);

    // ── Derived validation ─────────────────────────────────────────────────
    const allErrors = useMemo(() => validateAll(form), [form]);
    const visibleErrors = useMemo(() => {
        const v = {};
        for (const k of Object.keys(allErrors)) {
            if (submitted || touched[k]) v[k] = allErrors[k];
        }
        return v;
    }, [allErrors, touched, submitted]);
    const isFormValid = Object.keys(allErrors).length === 0;

    // Generic nested field setter
    const setField = (section, key, value) => {
        setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    };

    // ── Permissions ────────────────────────────────────────────────────────
    const requestMediaPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library in Settings.');
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
            showToast(mime === 'application/pdf' ? 'PDF uploaded successfully' : 'Image uploaded successfully', 'success');
        } catch (err) {
            setUploadError({ target, message: err.message || 'Upload failed. Please try again.' });
            setPendingRetry({ target, uri, mime, name, size });
            showToast(err.message || 'Upload failed. Please try again.', 'danger');
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
            (target === 'profile' ? 'your profile photo'
            : target === 'license' ? 'your license photo'
            : 'this RC document');
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
        const title =
            target === 'profile' ? 'Crop Profile Photo'
            : target === 'license' ? 'Crop License Photo'
            : 'Crop RC Photo';
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
            showToast(err.message || 'Could not process the image. Please try again.', 'danger');
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
                showToast('Only JPG or PNG images are allowed', 'danger');
                return;
            }
            if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
                showToast('Image is too large. Maximum size is 10 MB.', 'danger');
                return;
            }
            // Per-field crop type: profile/face → circle, documents → rectangular
            const mode = target === 'profile' ? 'circle' : 'free';
            const title =
                target === 'profile' ? 'Crop Profile Photo'
                : target === 'license' ? 'Crop License Photo'
                : 'Crop RC Photo';
            openCrop(asset.uri, title, mode, target, asset.fileName || `${target}.jpg`);
        } catch (err) {
            showToast(err.message || 'Could not pick the image', 'danger');
        }
    };

    // ── File handler (drag & drop + document picker) for license/rc ────────
    const handleDocFile = (fileData, target) => {
        const mime = fileData.mime || 'application/pdf';
        const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(fileData.name || '');
        const isImg = /^image\/(jpe?g|png)$/i.test(mime);
        if (!isPdf && !isImg) {
            showToast('Only JPG, PNG or PDF files are allowed', 'danger');
            return;
        }
        if (fileData.size && fileData.size > MAX_UPLOAD_BYTES) {
            showToast('File is too large. Maximum size is 10 MB.', 'danger');
            return;
        }
        if (isPdf) {
            runUpload(target, fileData.uri, 'application/pdf', fileData.name || `${target}.pdf`, fileData.size);
        } else {
            const title = target === 'license' ? 'Crop License Photo' : 'Crop RC Photo';
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
            showToast(err.message || 'Could not pick the file', 'danger');
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
            showToast('Please fill all required fields marked with *', 'danger');
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
                    ? "✅ Instantly Approved! You can start accepting delivery orders right away."
                    : "🎉 Application Submitted! We'll verify your documents within 24 hours. You'll receive an SMS once approved."
            );
            setTimeout(() => {
                if (onComplete) onComplete();
                else navigation?.navigate('DeliveryApp');
            }, 2500);
        } catch (err) {
            setErrorMsg(err.message || 'Submission failed. Please try again.');
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
                        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn} activeOpacity={0.7} accessibilityRole="button">
                            <Ionicons name="arrow-back" size={19} color="#fff" />
                        </TouchableOpacity>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.heroTitle}>Partner Onboarding</Text>
                        </View>
                        <View style={s.heroBadge}>
                            <Text style={s.heroBadgeTxt}>6 STEPS</Text>
                        </View>
                    </View>

                    <Text style={s.heroSubtitle}>Complete all 6 steps to activate your partner account</Text>

                    <View style={s.heroStats}>
                        {[
                            { icon: 'flash', value: '5 min', label: 'Quick Setup' },
                            { icon: 'checkmark-circle', value: '24 hrs', label: 'Verification' },
                            { icon: 'shield-checkmark', value: '100%', label: 'Secure & Safe' },
                            { icon: 'headset', value: '24/7', label: 'Support' },
                            { icon: 'gift', value: 'Benefits', label: 'Grow your business' },
                        ].map((stat, i) => (
                            <View key={i} style={s.heroStatPill}>
                                <View style={s.heroStatValueRow}>
                                    <Ionicons name={stat.icon} size={13} color="#fff" style={{ marginRight: 4 }} />
                                    <Text style={s.heroStatValue}>{stat.value}</Text>
                                </View>
                                <Text style={s.heroStatLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={s.heroWave} />
                </LinearGradient>

                <StepperBar form={form} />

                <View style={isWide ? s.layoutRow : s.layoutStacked}>
                <View style={isWide ? s.mainCol : s.mainColStacked}>

                {/* ── SECTION 1 — Profile Photo ── */}
                <SectionCard
                    title="Your Photo"
                    subtitle="A clear face photo helps customers identify you"
                    stepIndex="1"
                    completed={sectionComplete(form, 0)}
                >
                    <View style={s.photoSectionRow}>
                    <View style={{ alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => pickImage('profile')}
                            activeOpacity={0.85}
                            style={s.profilePhotoWrap}
                            disabled={uploading === 'profile'}
                            accessibilityRole="button"
                            accessibilityLabel="Upload profile photo"
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

                        {uploading === 'profile' && progressPct('profile') != null ? (
                            <View style={s.inlineProgress}>
                                <ActivityIndicator color={C.green} size="small" />
                                <Text style={s.inlineProgressTxt}>Uploading… {progressPct('profile')}%</Text>
                            </View>
                        ) : null}

                        {form.profile.photoUrl ? (
                            <View style={s.uploadedRow}>
                                <Text style={s.uploadedCheck}>✓</Text>
                                <Text style={s.uploadedOkTxt}>Image uploaded successfully</Text>
                                <TouchableOpacity onPress={() => handleReCrop('profile')} accessibilityRole="button" accessibilityLabel="Crop profile photo again">
                                    <Text style={s.recropLink}>🔄 Crop Again</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleRemoveClick('profile')} accessibilityRole="button">
                                    <Text style={s.removeLink}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        {visibleErrors['profile.photoUrl'] ? (
                            <Text style={s.fieldError}>{visibleErrors['profile.photoUrl']}</Text>
                        ) : null}
                    </View>
                    <PhotoGuidelinesBox />
                    </View>
                </SectionCard>

                {/* ── SECTION 2 — Driving License ── */}
                <SectionCard
                    title="Driving License"
                    subtitle="Must be valid and not expired"
                    stepIndex="2"
                    completed={sectionComplete(form, 1)}
                    infoBadge="Why is this needed?"
                >
                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="License Number" required errorKey="license.number" errors={visibleErrors}>
                                <Input
                                    value={form.license.number}
                                    onChangeText={(v) => setField('license', 'number', v.toUpperCase())}
                                    placeholder="e.g. TS0720190012345"
                                    maxLength={20}
                                    autoCapitalize="characters"
                                    onBlur={() => markTouched('license.number')}
                                />
                            </OnboardingField>
                        </View>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Issuing Authority" errorKey="license.issuingAuthority" errors={visibleErrors}>
                                <SelectInput
                                    value={form.license.issuingAuthority}
                                    onSelect={(v) => setField('license', 'issuingAuthority', v)}
                                    options={RTO_OPTIONS}
                                    placeholder="Select RTO"
                                    onBlur={() => markTouched('license.issuingAuthority')}
                                />
                            </OnboardingField>
                        </View>
                    </FieldRow>

                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Expiry Date" required errorKey="license.expiry" errors={visibleErrors}>
                                <Input
                                    value={form.license.expiry}
                                    onChangeText={(v) => setField('license', 'expiry', v)}
                                    placeholder="MM/YYYY"
                                    keyboardType="numeric"
                                    maxLength={7}
                                    onBlur={() => markTouched('license.expiry')}
                                />
                            </OnboardingField>
                        </View>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="License Photo" required errorKey="license.photoUrl" errors={visibleErrors}>
                                <UploadBox
                                    accept="image-pdf"
                                    label="Upload front side of license"
                                    hint="Tap to upload — JPG, PNG, or PDF (max 10 MB)"
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
                        </View>
                    </FieldRow>

                    <TipBox text="Ensure your license is valid and clearly visible." />
                </SectionCard>

                {/* ── SECTION 3 — Vehicle Details ── */}
                <SectionCard
                    title="Vehicle Details"
                    subtitle="Information about your vehicle"
                    stepIndex="3"
                    completed={sectionComplete(form, 2)}
                    infoBadge="Why is this needed?"
                >
                    <OnboardingField label="Vehicle Type" required errorKey="vehicle.type" errors={visibleErrors}>
                        <VehicleTypeGrid
                            options={VEHICLE_TYPES}
                            selected={form.vehicle.type}
                            onSelect={(v) => { setField('vehicle', 'type', v); markTouched('vehicle.type'); }}
                        />
                    </OnboardingField>

                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Vehicle Number" required errorKey="vehicle.registration" errors={visibleErrors}>
                                <Input
                                    value={form.vehicle.registration}
                                    onChangeText={(v) => setField('vehicle', 'registration', v.toUpperCase())}
                                    placeholder="e.g. TS 07 AB 1234"
                                    maxLength={15}
                                    autoCapitalize="characters"
                                    onBlur={() => markTouched('vehicle.registration')}
                                />
                            </OnboardingField>
                        </View>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Make & Model" errorKey="vehicle.makeModel" errors={visibleErrors}>
                                <Input
                                    value={form.vehicle.makeModel}
                                    onChangeText={(v) => setField('vehicle', 'makeModel', v)}
                                    placeholder="e.g. Honda Activa 6G"
                                    onBlur={() => markTouched('vehicle.makeModel')}
                                />
                            </OnboardingField>
                        </View>
                    </FieldRow>

                    <OnboardingField label="Year of Manufacture" errorKey="vehicle.year" errors={visibleErrors}>
                        <SelectInput
                            value={form.vehicle.year}
                            onSelect={(v) => { setField('vehicle', 'year', v); markTouched('vehicle.year'); }}
                            options={YEAR_OPTIONS}
                            placeholder="Select Year"
                        />
                    </OnboardingField>

                    <Text style={s.subGroupLabel}>Registration Certificate (Optional)</Text>
                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <UploadBox
                                accept="image-pdf"
                                label="Upload RC (Front Side)"
                                hint="JPG, PNG, or PDF"
                                icon="📄"
                                file={form.vehicleRc.photoUrl
                                    ? { uri: form.vehicleRc.photoLocalUri, name: form.vehicleRc.photoName, mime: form.vehicleRc.photoMime, size: form.vehicleRc.photoSize }
                                    : null}
                                onPick={() => pickImage('vehicleRc')}
                                onFile={(fd) => handleDocFile(fd, 'vehicleRc')}
                                onView={form.vehicleRc.photoMime === 'application/pdf' ? () => openPdfViewer('vehicleRc') : null}
                                onCrop={form.vehicleRc.photoLocalUri && form.vehicleRc.photoMime !== 'application/pdf' ? () => handleReCrop('vehicleRc') : undefined}
                                {...uploadBoxProps('vehicleRc')}
                            />
                        </View>
                        <View style={s.fieldRowItem}>
                            <UploadBox
                                accept="image-pdf"
                                label="Upload Insurance Document"
                                hint="JPG, PNG, or PDF"
                                icon="🛡️"
                                file={form.insurance.photoUrl
                                    ? { uri: form.insurance.photoLocalUri, name: form.insurance.photoName, mime: form.insurance.photoMime, size: form.insurance.photoSize }
                                    : null}
                                onPick={() => pickImage('insurance')}
                                onFile={(fd) => handleDocFile(fd, 'insurance')}
                                onView={form.insurance.photoMime === 'application/pdf' ? () => openPdfViewer('insurance') : null}
                                onCrop={form.insurance.photoLocalUri && form.insurance.photoMime !== 'application/pdf' ? () => handleReCrop('insurance') : undefined}
                                {...uploadBoxProps('insurance')}
                            />
                        </View>
                    </FieldRow>

                    <InfoNote text="Ensure your vehicle documents are valid and up to date." />
                </SectionCard>

                {/* ── SECTION 4 — RC (Registration Certificate) ── */}
                <SectionCard
                    title="Registration Certificate (RC)"
                    subtitle="Upload your vehicle RC"
                    stepIndex="4"
                    completed={sectionComplete(form, 3)}
                    infoBadge="Why is this needed?"
                >
                    <OnboardingField label="RC Number" errorKey="rc.number" errors={visibleErrors}>
                        <Input
                            value={form.rc.number}
                            onChangeText={(v) => setField('rc', 'number', v.toUpperCase())}
                            placeholder="e.g. TS0720194"
                            maxLength={20}
                            autoCapitalize="characters"
                            onBlur={() => markTouched('rc.number')}
                        />
                    </OnboardingField>

                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Front Side" required errorKey="rc.photoUrl" errors={visibleErrors}>
                                <UploadBox
                                    accept="image-pdf"
                                    label="Upload RC document"
                                    hint="JPG, PNG, or PDF (max 10 MB)"
                                    icon="📄"
                                    file={form.rc.photoUrl
                                        ? { uri: form.rc.photoLocalUri, name: form.rc.photoName, mime: form.rc.photoMime, size: form.rc.photoSize }
                                        : null}
                                    onPick={() => pickImage('rc')}
                                    onFile={(fd) => handleDocFile(fd, 'rc')}
                                    onView={form.rc.photoMime === 'application/pdf' ? () => openPdfViewer('rc') : null}
                                    onCrop={form.rc.photoLocalUri && form.rc.photoMime !== 'application/pdf' ? () => handleReCrop('rc') : undefined}
                                    {...uploadBoxProps('rc')}
                                />
                            </OnboardingField>
                        </View>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Back Side (Optional)" errorKey="rcBack.photoUrl" errors={visibleErrors}>
                                <UploadBox
                                    accept="image-pdf"
                                    label="Upload back side"
                                    hint="JPG, PNG, or PDF (max 10 MB)"
                                    icon="📄"
                                    file={form.rcBack.photoUrl
                                        ? { uri: form.rcBack.photoLocalUri, name: form.rcBack.photoName, mime: form.rcBack.photoMime, size: form.rcBack.photoSize }
                                        : null}
                                    onPick={() => pickImage('rcBack')}
                                    onFile={(fd) => handleDocFile(fd, 'rcBack')}
                                    onView={form.rcBack.photoMime === 'application/pdf' ? () => openPdfViewer('rcBack') : null}
                                    onCrop={form.rcBack.photoLocalUri && form.rcBack.photoMime !== 'application/pdf' ? () => handleReCrop('rcBack') : undefined}
                                    {...uploadBoxProps('rcBack')}
                                />
                            </OnboardingField>
                        </View>
                    </FieldRow>

                    <InfoNote text="Ensure your vehicle documents are valid and up to date." />
                </SectionCard>

                {/* ── SECTION 5 — Bank Details ── */}
                <SectionCard
                    title="Bank Details"
                    subtitle="Add your bank account for payments"
                    stepIndex="5"
                    completed={sectionComplete(form, 4)}
                >
                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Account Holder Name" required errorKey="bank.accountHolderName" errors={visibleErrors}>
                                <Input
                                    value={form.bank.accountHolderName}
                                    onChangeText={(v) => setField('bank', 'accountHolderName', v)}
                                    placeholder="As per bank records"
                                    onBlur={() => markTouched('bank.accountHolderName')}
                                />
                            </OnboardingField>
                        </View>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Bank Name" errorKey="bank.bankName" errors={visibleErrors}>
                                <SelectInput
                                    value={form.bank.bankName}
                                    onSelect={(v) => setField('bank', 'bankName', v)}
                                    options={BANK_OPTIONS}
                                    placeholder="Select bank"
                                    onBlur={() => markTouched('bank.bankName')}
                                />
                            </OnboardingField>
                        </View>
                    </FieldRow>

                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Bank Branch" errorKey="bank.branch" errors={visibleErrors}>
                                <BranchPicker
                                    bankName={form.bank.bankName}
                                    value={form.bank.branch}
                                    onBlur={() => markTouched('bank.branch')}
                                    onSelectBranch={(r) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            bank: {
                                                ...prev.bank,
                                                branch: r.BRANCH || '',
                                                ifsc: (r.IFSC || '').toUpperCase(),
                                                bankName: prev.bank.bankName || r.BANK || prev.bank.bankName,
                                            },
                                        }));
                                        setIfscLookup({ status: 'found', bank: r.BANK, branch: r.BRANCH, city: r.CITY });
                                    }}
                                />
                            </OnboardingField>
                        </View>
                        <View style={s.fieldRowItem} />
                    </FieldRow>

                    <FieldRow>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="Account Number" required errorKey="bank.accountNumber" errors={visibleErrors}>
                                <Input
                                    value={form.bank.accountNumber}
                                    onChangeText={(v) => setField('bank', 'accountNumber', v)}
                                    placeholder="Enter account number"
                                    keyboardType="numeric"
                                    secureTextEntry
                                    maxLength={18}
                                    onBlur={() => markTouched('bank.accountNumber')}
                                />
                            </OnboardingField>
                        </View>
                        <View style={s.fieldRowItem}>
                            <OnboardingField label="IFSC Code" required errorKey="bank.ifsc" errors={visibleErrors}>
                                <Input
                                    value={form.bank.ifsc}
                                    onChangeText={(v) => setField('bank', 'ifsc', v.toUpperCase())}
                                    placeholder="e.g. SBIN0001234"
                                    maxLength={11}
                                    autoCapitalize="characters"
                                    onBlur={() => markTouched('bank.ifsc')}
                                />
                            </OnboardingField>
                            {ifscLookup?.status === 'loading' ? (
                                <View style={s.ifscStatusRow}>
                                    <ActivityIndicator size="small" color={C.textLight} />
                                    <Text style={s.ifscStatusTextMuted}>Finding your bank branch…</Text>
                                </View>
                            ) : ifscLookup?.status === 'found' ? (
                                <View style={s.ifscStatusRow}>
                                    <Ionicons name="checkmark-circle" size={15} color={C.green} />
                                    <Text style={s.ifscStatusTextOk} numberOfLines={2}>
                                        {ifscLookup.bank}{ifscLookup.city ? `, ${ifscLookup.city}` : ''}
                                    </Text>
                                </View>
                            ) : ifscLookup?.status === 'notfound' ? (
                                <View style={s.ifscStatusRow}>
                                    <Ionicons name="close-circle" size={15} color="#DC2626" />
                                    <Text style={s.ifscStatusTextErr}>IFSC not found — double-check the code</Text>
                                </View>
                            ) : ifscLookup?.status === 'error' ? (
                                <View style={s.ifscStatusRow}>
                                    <Ionicons name="alert-circle" size={15} color="#B8860B" />
                                    <Text style={s.ifscStatusTextMuted}>Couldn't verify right now — you can still continue</Text>
                                </View>
                            ) : null}
                        </View>
                    </FieldRow>

                    <View style={s.securityRow}>
                        <Text style={{ fontSize: 15 }}>🔒</Text>
                        <Text style={s.securityText}>Your bank details are encrypted and 100% secure</Text>
                    </View>
                </SectionCard>

                {/* ── SECTION 6 — Education & Training ── */}
                <SectionCard
                    title="Education & Training"
                    subtitle="Tell us about yourself"
                    stepIndex="6"
                    completed={sectionComplete(form, 5)}
                >
                    <OnboardingField label="Highest Education Level" required errorKey="education.level" errors={visibleErrors}>
                        <ChipSelect
                            options={EDU_LEVELS}
                            selected={form.education.level}
                            onSelect={(v) => { setField('education', 'level', v); markTouched('education.level'); }}
                        />
                    </OnboardingField>

                    <OnboardingField label="Institution/College Name" errorKey="education.institution" errors={visibleErrors}>
                        <Input
                            value={form.education.institution}
                            onChangeText={(v) => setField('education', 'institution', v)}
                            placeholder="e.g. St. Mary's High School"
                            onBlur={() => markTouched('education.institution')}
                        />
                    </OnboardingField>

                    <OnboardingField label="Year of Passing" errorKey="education.passingYear" errors={visibleErrors}>
                        <Input
                            value={form.education.passingYear}
                            onChangeText={(v) => setField('education', 'passingYear', v)}
                            placeholder="e.g. 2018"
                            keyboardType="numeric"
                            maxLength={4}
                            onBlur={() => markTouched('education.passingYear')}
                        />
                    </OnboardingField>

                    <OnboardingField label="Relevant Training (select all that apply)" errorKey="education.trainings" errors={visibleErrors}>
                        <ChipSelect
                            options={TRAINING_OPTS}
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
                        <Text style={s.summaryTitle}>Almost done!</Text>
                        <View style={s.summaryTextRow}>
                            <Text style={s.summaryText}>Documents verified within </Text>
                            <Text style={s.summaryAccent}>24 hours</Text>
                            <Text style={s.summaryText}>. SMS on approval.</Text>
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
                            Redirecting you shortly…
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
                    accessibilityLabel="Submit application"
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Text style={s.submitBtnTxt}>Submit Application</Text>
                            <Text style={s.submitBtnArrow}>→</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={s.bottomNoteWrap}>
                    <Text style={s.bottomNote}>
                        By submitting, you agree to our{' '}
                    </Text>
                    <Text style={s.bottomNoteLink}>Terms of Service</Text>
                    <Text style={s.bottomNote}>{' '}and{' '}</Text>
                    <Text style={s.bottomNoteLink}>Privacy Policy</Text>
                </View>

                </View>

                <View style={isWide ? s.sidebarCol : s.sidebarColStacked}>
                    <OnboardingSummaryCard form={form} />
                    <WhyOnboardCard />
                    <NeedHelpCard />
                    <SmoothOnboardingTipsCard />
                </View>

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
    heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    heroBadgeTxt: { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 1.5 },
    heroEyebrow: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
    heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3, lineHeight: 26 },
    heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 16 },
    heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 22 },
    heroStatPill: { flexBasis: '23%', flexGrow: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    heroStatValueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 1 },
    heroStatValue: { fontSize: 12, fontWeight: '800', color: '#fff' },
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
    tipIcon: { marginTop: 1 },
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

    // ── Numbered Stepper ──
    stepperCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E8F0E8', paddingVertical: 18, paddingHorizontal: 12, marginBottom: 16, shadowColor: '#147832', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    stepperRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 },
    stepperItem: { alignItems: 'center', width: 78 },
    stepperCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EDEFEE', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#EDEFEE' },
    stepperCircleDone: { backgroundColor: C.green, borderColor: C.green },
    stepperCircleActive: { backgroundColor: '#fff', borderColor: C.green },
    stepperNum: { fontSize: 12, fontWeight: '800', color: '#9CA3AF' },
    stepperNumActive: { color: C.green },
    stepperCheck: { fontSize: 13, fontWeight: '900', color: '#fff' },
    stepperLabel: { fontSize: 10, color: C.textXLight, fontWeight: '600', marginTop: 6, textAlign: 'center' },
    stepperLabelActive: { color: C.greenDeep, fontWeight: '800' },
    stepperLine: { height: 2, backgroundColor: '#E5E7EB', flex: 1, minWidth: 20, marginTop: 14 },
    stepperLineDone: { backgroundColor: C.green },
    stepperProgressTxt: { fontSize: 10, color: C.textLight, fontWeight: '700', textAlign: 'right', marginTop: 12, letterSpacing: 0.3 },

    // ── Two-column layout (wide / web view) ──
    layoutRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    layoutStacked: { flexDirection: 'column' },
    mainCol: { flex: 2.4, minWidth: 0 },
    mainColStacked: { width: '100%' },
    sidebarCol: { flex: 1, minWidth: 260, gap: 14 },
    sidebarColStacked: { width: '100%', gap: 14, marginTop: 4 },

    // ── Sidebar cards ──
    sideCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E8F0E8', shadowColor: '#147832', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    sideCardTitle: { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: -0.2 },

    summaryItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    summaryItemLabel: { fontSize: 12, color: C.textLight, fontWeight: '600', flexShrink: 1 },
    summaryStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#F1F2F1' },
    summaryStatusPillDone: { backgroundColor: C.greenLight },
    summaryStatusTxt: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
    summaryStatusTxtDone: { color: C.greenDeep },

    dataSafeCard: { backgroundColor: C.greenLight, borderColor: C.greenMid, alignItems: 'center', paddingVertical: 22 },
    dataSafeText: { fontSize: 12, color: C.greenDeep, fontWeight: '500', textAlign: 'center', marginTop: 8, lineHeight: 18 },
    dataSafeIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 16, position: 'relative', borderWidth: 1, borderColor: C.greenMid },
    dataSafeCheckBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

    needHelpText: { fontSize: 12, color: C.textLight, fontWeight: '500', marginTop: 6, marginBottom: 14, lineHeight: 18 },
    contactBtn: { backgroundColor: C.greenDeep, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    contactBtnTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },
    callText: { fontSize: 11, color: C.textXLight, fontWeight: '600', textAlign: 'center', marginTop: 10 },

    // ── Info pill ("Why is this needed?") ──
    infoPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: C.greenLight, borderWidth: 1, borderColor: C.greenMid, alignSelf: 'flex-start' },
    infoPillTxt: { fontSize: 10, fontWeight: '700', color: C.greenDeep },

    // ── Stepper "Step X of N" label ──
    stepperOfTxt: { alignSelf: 'flex-end', fontSize: 11, color: C.textLight, fontWeight: '700', marginBottom: 8, marginRight: 4 },

    // ── Two-column responsive field row ──
    fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    fieldRowItem: { flexGrow: 1, flexBasis: 200, minWidth: 160 },
    subGroupLabel: { fontSize: 12, fontWeight: '800', color: C.text, marginTop: 2 },

    // ── Photo section layout (photo + guidelines) ──
    photoSectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'center' },

    // ── Photo Guidelines box ──
    guidelinesBox: { flexGrow: 1, flexBasis: 220, minWidth: 200, backgroundColor: C.greenLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.greenMid, gap: 8 },
    guidelinesTitle: { fontSize: 13, fontWeight: '800', color: C.greenDeep, marginBottom: 4 },
    guidelinesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    guidelinesCheck: { fontSize: 12, fontWeight: '900', color: C.green, marginTop: 1 },
    guidelinesText: { flex: 1, fontSize: 12, color: C.greenDeep, fontWeight: '500', lineHeight: 17 },

    // ── Blue info note (RC / vehicle docs) ──
    infoNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: '#BFDBFE' },
    infoNoteIcon: { marginTop: 1 },
    infoNoteText: { flex: 1, fontSize: 12, color: '#1E40AF', fontWeight: '500', lineHeight: 17 },

    // ── Select dropdown (RTO / Year / Bank) ──
    selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    selectDisabled: { backgroundColor: '#F3F4F1' },
    branchSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F1EF' },
    branchSearchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 2 },
    branchStatusBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 14 },
    branchOptionSub: { fontSize: 11, color: C.textLight, marginTop: 2 },
    selectValueTxt: { fontSize: 14, color: C.text, fontWeight: '500', flex: 1 },
    selectPlaceholderTxt: { fontSize: 14, color: C.textXLight, fontWeight: '500', flex: 1 },
    selectChevron: { fontSize: 10, color: C.textLight, marginLeft: 8 },
    selectDropdown: { marginTop: 4, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8EAE8', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 8, overflow: 'hidden' },
    selectOption: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F5F6F5' },
    selectOptionTxt: { fontSize: 13, color: C.text, fontWeight: '500' },
    selectOptionTxtActive: { color: C.greenDeep, fontWeight: '800' },

    // ── Vehicle type grid (4-across icon cards) ──
    vehicleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    vehicleGridItem: { flexGrow: 1, flexBasis: 70, minWidth: 70, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8E2', backgroundColor: '#F8FAF8', gap: 4 },
    vehicleGridItemActive: { borderColor: C.green, backgroundColor: C.greenLight },
    vehicleGridIcon: { marginBottom: 2 },
    vehicleGridLabel: { fontSize: 11, fontWeight: '600', color: C.textLight },
    vehicleGridLabelActive: { color: C.greenDeep, fontWeight: '800' },

    // ── Find IFSC link ──
    ifscStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    ifscStatusTextOk: { fontSize: 12, fontWeight: '700', color: C.greenDeep, flex: 1 },
    ifscStatusTextErr: { fontSize: 12, fontWeight: '600', color: '#DC2626', flex: 1 },
    ifscStatusTextMuted: { fontSize: 12, fontWeight: '600', color: C.textLight, flex: 1 },

    // ── Onboarding Summary: circular progress + In Progress status ──
    summaryHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    progressRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 4, borderColor: C.green, alignItems: 'center', justifyContent: 'center', backgroundColor: C.greenLight },
    progressRingTxt: { fontSize: 11, fontWeight: '900', color: C.greenDeep },
    summarySubTxt: { fontSize: 11, color: C.textXLight, fontWeight: '600', marginTop: 6 },
    summaryStatusPillActive: { backgroundColor: '#FEF3C7' },
    summaryStatusTxtActive: { color: '#B45309' },

    // ── Why onboard with us? ──
    whyOnboardCard: { backgroundColor: C.greenLight, borderColor: C.greenMid },
    whyOnboardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    whyOnboardIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.greenMid },
    whyOnboardItemTitle: { fontSize: 12, fontWeight: '800', color: C.greenDeep, marginBottom: 2 },
    whyOnboardItemText: { fontSize: 11, color: C.greenDeep, fontWeight: '500', lineHeight: 16 },

    // ── Tips for Smooth Onboarding ──
    smoothTipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    smoothTipCheck: { fontSize: 12, fontWeight: '900', color: C.green, marginTop: 1 },
    smoothTipText: { flex: 1, fontSize: 12, color: C.textLight, fontWeight: '500', lineHeight: 17 },
});