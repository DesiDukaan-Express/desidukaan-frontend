import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * FadeInView
 * ──────────
 * Wraps elements in a clean enter animation (fade-in + slide-up).
 * Perfect for list items, screens, cards, modals, and status badges.
 */
export default function FadeInView({
  children,
  delay = 0,
  duration = 320,
  translateY = 16,
  style,
  ...props
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 14,
          bounciness: 5,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration, translateY, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
}
