import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { T } from "./tokens";

/**
 * Spinner - A simple circular loading indicator using React Native ActivityIndicator.
 */
export default function Spinner({ size = 20, color = T.green }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size < 24 ? "small" : "large"} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
