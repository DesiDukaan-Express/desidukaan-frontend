import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useCartStore from '../store/cartStore';

const REMINDER_MS = 60 * 1000;

const MESSAGES = [
  { title: '🛒 Oops! You forgot to place your order', body: 'Your cart is waiting… come back and check out!' },
  { title: '🛍️ Still thinking?', body: 'Want to add more items? Visit your cart now!' },
  { title: '⏳ Your cart misses you', body: 'Complete your order before items run out!' },
];

async function showWebNotification(title, body) {
  console.log('[CartReminder] showWebNotification called');
  if (typeof Notification === 'undefined') {
    console.log('[CartReminder] Notification API not available');
    return;
  }
  console.log('[CartReminder] Notification.permission =', Notification.permission);
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    console.log('[CartReminder] Permission requested, result:', result);
  }
  if (Notification.permission === 'granted') {
    console.log('[CartReminder] Showing notification:', title);
    new Notification(title, { body });
  } else {
    console.log('[CartReminder] Permission not granted, cannot show');
  }
}

export default function useCartReminder() {
  const cartCount = useCartStore((s) => s.items.length);
  const prevCount = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    console.log('[CartReminder] Mounted. Platform:', Platform.OS);
    if (Platform.OS === 'web' && typeof Notification !== 'undefined') {
      console.log('[CartReminder] Web notification permission:', Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(p => console.log('[CartReminder] Permission after request:', p));
      }
    }
  }, []);

  useEffect(() => {
    console.log('[CartReminder] cartCount changed:', cartCount, 'prevCount:', prevCount.current);
    const wasEmpty = prevCount.current === 0;
    const isNowEmpty = cartCount === 0;

    if (wasEmpty && cartCount > 0) {
      console.log('[CartReminder] Cart went from empty to items — starting 60s timer');
      startTimer();
    }

    if (isNowEmpty && !wasEmpty) {
      console.log('[CartReminder] Cart emptied — cancelling timer');
      cancelTimer();
    }

    prevCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    return () => cancelTimer();
  }, []);

  const startTimer = async () => {
    const notifPref = await AsyncStorage.getItem('notif_enabled');
    console.log('[CartReminder] notif_enabled from AsyncStorage:', notifPref);
    if (notifPref === 'false') {
      console.log('[CartReminder] Notifications disabled by user, skipping');
      return;
    }

    cancelTimer();

    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    console.log('[CartReminder] Scheduling notification in 60s:', msg.title);

    timerRef.current = setTimeout(async () => {
      console.log('[CartReminder] Timer fired! Showing notification...');
      await showWebNotification(msg.title, msg.body);
      timerRef.current = null;
    }, REMINDER_MS);
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      console.log('[CartReminder] Cancelling timer');
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return { scheduleReminder: startTimer, cancelReminder: cancelTimer };
}
