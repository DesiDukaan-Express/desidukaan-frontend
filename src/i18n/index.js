import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import hi from './locales/hi';
import bn from './locales/bn';
import te from './locales/te';
import mr from './locales/mr';
import ta from './locales/ta';
import gu from './locales/gu';
import ur from './locales/ur';
import kn from './locales/kn';
import or from './locales/or';
import pa from './locales/pa';

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English',  flag: '🇬🇧' },
  { code: 'hi', name: 'हिन्दी', nativeName: 'Hindi',   flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা',  nativeName: 'Bengali',  flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', nativeName: 'Telugu',   flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी',  nativeName: 'Marathi',  flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', nativeName: 'Tamil',    flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી',nativeName: 'Gujarati', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو',   nativeName: 'Urdu',     flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ',  nativeName: 'Kannada',  flag: '🇮🇳' },
  { code: 'or', name: 'ଓଡ଼ିଆ',  nativeName: 'Odia',     flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', nativeName: 'Punjabi',  flag: '🇮🇳' },
];

export const LANGUAGE_STORAGE_KEY = '@kwikpik_language';

const resources = { en, hi, bn, te, mr, ta, gu, ur, kn, or, pa };

// Build i18next resources format
const i18nResources = Object.fromEntries(
  Object.entries(resources).map(([code, translations]) => [
    code,
    { translation: translations },
  ])
);

const initI18n = async () => {
  let savedLang = 'en'; // Default to English
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && resources[stored]) savedLang = stored;
  } catch (_) {}

  await i18n
    .use(initReactI18next)
    .init({
      resources: i18nResources,
      lng: savedLang,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already escapes
      },
      compatibilityJSON: 'v4',
    });
};

initI18n();

export const changeLanguage = async (langCode) => {
  await i18n.changeLanguage(langCode);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
  } catch (_) {}
};

export default i18n;
