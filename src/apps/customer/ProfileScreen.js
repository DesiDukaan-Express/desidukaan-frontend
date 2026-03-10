import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/authStore';

// In colors ko image ke according set kiya hai
const UI_COLORS = {
  primary: '#001f0d', // Green color from image
  bg: '#F8F9FA',
  text: '#1F2937',
  lightText: '#6B7280',
  white: '#FFFFFF',
  cardBg: '#F3F4F6',
  orderBg: '#E8F5E9'
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { logout } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();
  }, []);

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  const MenuItem = ({ icon, title, screen, isGreen }) => (
    <TouchableOpacity
      style={[styles.menuItem, isGreen && styles.greenMenuItem]}
      activeOpacity={0.7}
      onPress={() => navigation.navigate(screen)}
    >
      <View style={styles.menuLeft}>
        <Text style={[styles.menuIcon, isGreen && { color: UI_COLORS.primary }]}>{icon}</Text>
        <Text style={[styles.menuText, isGreen && { color: UI_COLORS.primary, fontWeight: '700' }]}>{title}</Text>
      </View>
      <Text style={[styles.arrow, isGreen && { color: UI_COLORS.primary }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.headerMainTitle}>Profile</Text>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Text style={{ fontSize: 40 }}>👦</Text>
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>Durgesh Laxkar</Text>
              <Text style={styles.creditText}>Credit: <Text style={{ color: UI_COLORS.primary }}>₹300</Text></Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {/* Order History - Standout Style */}
          <MenuItem icon="🧺" title="Order history" screen="MyOrders" isGreen={true} />

          {/* Invite Section */}
          <View style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>Invite friends</Text>
            <Text style={styles.inviteSub}>You get ₹150 credit for every friend you invite.</Text>
            <TouchableOpacity style={styles.inviteBtn}>
              <Text style={styles.inviteBtnText}>Invite friend</Text>
            </TouchableOpacity>
          </View>

          {/* Account Settings */}
          <SectionHeader title="Account settings" />
          <MenuItem icon="👤" title="Personal information" screen="ProfileEdit" />
          <MenuItem icon="🌐" title="Language and Country" screen="Language" />
          <MenuItem icon="🔔" title="Push Notifications" screen="Notifications" />
          <MenuItem icon="💳" title="Payment Methods" screen="Payments" />

          {/* Appearance */}
          <SectionHeader title="Apparence" />
          <MenuItem icon="👕" title="App Icon" screen="AppIcon" />
          <MenuItem icon="🎨" title="Theme" screen="Theme" />

          {/* Support */}
          <SectionHeader title="Support" />
          <MenuItem icon="🎧" title="FAQ" screen="Support" />

          {/* Legal */}
          <SectionHeader title="Legal" />
          <MenuItem icon="💼" title="Privacy Policy" screen="Privacy" />
          <MenuItem icon="📄" title="Terms and Conditions" screen="Terms" />

          {/* Logout */}
          <TouchableOpacity style={styles.logoutSection} onPress={logout}>
            <Text style={styles.logoutText}>Log Out</Text>
            <Text style={styles.versionText}>v. 1.0.4</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: UI_COLORS.white },
  header: { padding: 20, paddingTop: 10 },
  headerMainTitle: { fontSize: 28, fontWeight: '800', color: UI_COLORS.text, marginBottom: 20 },
  profileInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { 
    width: 80, height: 80, borderRadius: 20, 
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E7EB'
  },
  nameContainer: { marginLeft: 15 },
  userName: { fontSize: 20, fontWeight: '700', color: UI_COLORS.text },
  creditText: { fontSize: 16, fontWeight: '600', color: UI_COLORS.lightText, marginTop: 4 },
  
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: UI_COLORS.text, marginTop: 25, marginBottom: 10 },
  
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 10
  },
  greenMenuItem: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuText: { fontSize: 15, color: UI_COLORS.text, fontWeight: '500' },
  arrow: { fontSize: 22, color: UI_COLORS.lightText },

  inviteCard: { 
    backgroundColor: UI_COLORS.white, padding: 20, borderRadius: 15, 
    marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' 
  },
  inviteTitle: { fontSize: 18, fontWeight: '800', color: UI_COLORS.text },
  inviteSub: { fontSize: 13, color: UI_COLORS.lightText, textAlign: 'center', marginVertical: 10 },
  inviteBtn: { 
    backgroundColor: UI_COLORS.primary, width: '100%', 
    padding: 12, borderRadius: 10, alignItems: 'center' 
  },
  inviteBtnText: { color: UI_COLORS.white, fontWeight: '700', fontSize: 15 },

  logoutSection: { marginTop: 30, marginBottom: 40 },
  logoutText: { fontSize: 18, fontWeight: '800', color: UI_COLORS.text },
  versionText: { fontSize: 12, color: UI_COLORS.lightText, marginTop: 5 }
});