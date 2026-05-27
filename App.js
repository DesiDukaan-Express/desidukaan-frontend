import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, PlusJakartaSans_600SemiBold, PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans';
import Navigation from './src/navigation';

import useAuthStore from './src/store/authStore';
import useAddressStore from './src/store/addressStore';

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const fetchLocation = useAddressStore((state) => state.fetchLocation);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    hydrate();
    fetchLocation();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return <Navigation />;
}
