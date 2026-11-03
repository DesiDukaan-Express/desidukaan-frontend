
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, changeLanguage } from '../i18n';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const currentCode = (i18n.resolvedLanguage || i18n.language || 'en')
    .split('-')[0];

  const selectedLanguage =
    LANGUAGES.find((lang) => lang.code === currentCode) || LANGUAGES[0];

  const handleLanguageChange = async (code) => {
    try {
      await changeLanguage(code);
      setVisible(false);
    } catch (error) {
      console.error('Language change failed:', error);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Feather name="globe" size={16} color="#FFFFFF" />
        <Text style={styles.triggerText}>
          {selectedLanguage.code.toUpperCase()}
        </Text>
        <Feather name="chevron-down" size={14} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalCard}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Choose Language</Text>
                <Text style={styles.modalSubtitle}>
                  Select your preferred language
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
              >
                <Feather name="x" size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.languageList}
              showsVerticalScrollIndicator={false}
            >
              {LANGUAGES.map((language) => {
                const isSelected = language.code === currentCode;

                return (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.languageItem,
                      isSelected && styles.selectedLanguageItem,
                    ]}
                    onPress={() => handleLanguageChange(language.code)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.languageName}>
                        {language.name}
                      </Text>
                      <Text style={styles.languageNativeName}>
                        {language.nativeName}
                      </Text>
                    </View>

                    {isSelected && (
                      <Feather
                        name="check-circle"
                        size={20}
                        color="#1E8449"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
trigger: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingHorizontal: 11,
  paddingVertical: 9,
  borderRadius: 10,
  backgroundColor: '#1E8449',
  minWidth: 76,
},

triggerText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '800',
},
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 6,
  },
  languageList: {
    flexGrow: 0,
  },
  languageItem: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedLanguageItem: {
    backgroundColor: '#E9F7EF',
    borderRadius: 10,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  languageNativeName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },
});
