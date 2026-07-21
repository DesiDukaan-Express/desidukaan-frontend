import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../../i18n';

export default function LanguageSwitcher({ triggerStyle, triggerTextStyle, inline = false, onClose }) {
  const { i18n, t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleSelect = async (code) => {
    await changeLanguage(code);
    setVisible(false);
    if (onClose) onClose();
  };

  // ── Inline mode: just render the language grid directly ────────────────────
  if (inline) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[s.header, { marginBottom: 16 }]}>
          <Text style={s.headerTitle}>{t('common.selectLanguage')}</Text>
          {onClose && (
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={s.grid}>
          {LANGUAGES.map((lang) => {
            const isActive = i18n.language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[s.langCard, isActive && s.langCardActive]}
                onPress={() => handleSelect(lang.code)}
                activeOpacity={0.8}
              >
                <Text style={s.langFlag}>{lang.flag}</Text>
                <Text style={[s.langName, isActive && s.langNameActive]}>
                  {lang.name}
                </Text>
                <Text style={[s.langNative, isActive && s.langNativeActive]}>
                  {lang.nativeName}
                </Text>
                {isActive && (
                  <View style={s.checkBadge}>
                    <Text style={s.checkIcon}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  // ── Default mode: trigger button + modal ───────────────────────────────────
  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={[s.trigger, triggerStyle]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={s.triggerFlag}>{currentLang.flag}</Text>
        <Text style={[s.triggerText, triggerTextStyle]}>{currentLang.name}</Text>
        <Text style={s.chevron}>▾</Text>
      </TouchableOpacity>

      {/* Language Picker Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            {/* Handle bar */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.header}>
              <Text style={s.headerTitle}>{t('common.selectLanguage')}</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setVisible(false)}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Language grid */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={s.grid}>
                {LANGUAGES.map((lang) => {
                  const isActive = i18n.language === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[s.langCard, isActive && s.langCardActive]}
                      onPress={() => handleSelect(lang.code)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.langFlag}>{lang.flag}</Text>
                      <Text style={[s.langName, isActive && s.langNameActive]}>
                        {lang.name}
                      </Text>
                      <Text style={[s.langNative, isActive && s.langNativeActive]}>
                        {lang.nativeName}
                      </Text>
                      {isActive && (
                        <View style={s.checkBadge}>
                          <Text style={s.checkIcon}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const C = {
  green: '#16A34A',
  greenLight: '#F0FDF4',
  greenBorder: '#BBF7D0',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  orange: '#F97316',
};

const s = StyleSheet.create({
  // ── Trigger ──
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0b5133' + '30',
  },
  triggerFlag: { fontSize: 15 },
  triggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0b5133',
    letterSpacing: 0.2,
  },
  chevron: { fontSize: 9, color: '#0b5133', opacity: 0.8 },

  // ── Modal backdrop ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  // ── Bottom sheet ──
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: C.gray200,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.gray900,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: C.gray600 },

  // ── Language grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
  },
  langCard: {
    width: '47%',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.gray200,
    backgroundColor: C.white,
    alignItems: 'center',
    position: 'relative',
  },
  langCardActive: {
    borderColor: C.green,
    backgroundColor: C.greenLight,
    borderWidth: 2,
  },
  langFlag: { fontSize: 28, marginBottom: 6 },
  langName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.gray900,
    textAlign: 'center',
    marginBottom: 2,
  },
  langNameActive: { color: C.green },
  langNative: {
    fontSize: 11,
    color: C.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },
  langNativeActive: { color: C.green, opacity: 0.8 },

  // ── Active check badge ──
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: { fontSize: 11, color: C.white, fontWeight: '900' },
});
