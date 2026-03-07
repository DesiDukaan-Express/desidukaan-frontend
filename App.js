import React, { useEffect } from 'react';
import Navigation from './src/navigation';
import useAuthStore from './src/store/authStore';

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return <Navigation />;
}