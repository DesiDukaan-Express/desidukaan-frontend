import React, { useRef } from "react";
import { Animated, Pressable } from "react-native";

/**
 * AnimatedPressable
 * ─────────────────
 * Reusable animated touchable button component with subtle scale & opacity active feedback.
 * Wrap any button, card, or icon to give immediate fluid tactile feel.
 */
export default function AnimatedPressable({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  activeOpacity = 0.9,
  disabled = false,
  hitSlop,
  ...props
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: scaleTo,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      Animated.timing(opacity, {
        toValue: activeOpacity,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
