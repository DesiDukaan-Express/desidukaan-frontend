import React, { useEffect } from 'react';
import Navigation from './src/navigation';
// import Signup from './src/apps/customer/signup';

import useAuthStore from './src/store/authStore';
import useAddressStore from './src/store/addressStore';

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const fetchLocation = useAddressStore((state) => state.fetchLocation);

  useEffect(() => {
    hydrate();
    fetchLocation();
  }, []);

  return <Navigation />;
  
}
