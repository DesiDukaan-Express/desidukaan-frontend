import React, { useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import useWishlistStore from '../store/wishlistStore';
import useAuthStore from '../store/authStore';

const RED = '#DC2626';
const GRAY = '#9CA3AF';
const DEBOUNCE_MS = 300;

export default function WishlistHeart({ productId, size = 22, style }) {
  const isWishlisted = useWishlistStore((s) => s.ids.includes(productId));
  const toggle = useWishlistStore((s) => s.toggle);
  const token = useAuthStore((s) => s.token);
  const scale = useRef(new Animated.Value(1)).current;
  const lastTap = useRef(0);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DEBOUNCE_MS) return;
    lastTap.current = now;

    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    toggle(productId, token);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[{ zIndex: 3 }, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <MaterialIcons
          name={isWishlisted ? 'favorite' : 'favorite-border'}
          size={size}
          color={isWishlisted ? RED : GRAY}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
