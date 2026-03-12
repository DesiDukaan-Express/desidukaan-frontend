import React, { useEffect } from 'react';
import Navigation from './src/navigation';
// import Signup from './src/apps/customer/signup';

import useAuthStore from './src/store/authStore';

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return <Navigation />;
  
}
