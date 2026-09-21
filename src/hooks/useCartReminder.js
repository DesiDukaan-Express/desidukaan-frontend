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
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export default function useCartReminder() {
  const cartCount = useCartStore((s) => s.items.length);
  const prevCount = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const wasEmpty = prevCount.current === 0;
    const isNowEmpty = cartCount === 0;

    if (wasEmpty && cartCount > 0) {
      startTimer();
    }

    if (isNowEmpty && !wasEmpty) {
      cancelTimer();
    }

    prevCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    return () => cancelTimer();
  }, []);

  const startTimer = async () => {
    const notifPref = await AsyncStorage.getItem('notif_enabled');
    if (notifPref === 'false') return;

    cancelTimer();

    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

    timerRef.current = setTimeout(async () => {
      await showWebNotification(msg.title, msg.body);
      timerRef.current = null;
    }, REMINDER_MS);
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return { scheduleReminder: startTimer, cancelReminder: cancelTimer };
}
