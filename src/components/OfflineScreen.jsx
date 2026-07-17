import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import LottieView from "lottie-react-native";

const C = {
  white: "#FFFFFF",
  gray900: "#111827",
  gray500: "#6B7280",
  green: "#16A34A",
};

const OfflineScreen = ({ onRetry }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <View style={styles.animationContainer}>
        <LottieView
          source={require("../../assets/animations/offline_animation.json")}
          autoPlay
          loop
          style={styles.animation}
        />
      </View>

      <Text style={styles.title}>No Internet Connection</Text>
      <Text style={styles.subtitle}>
        Please check your internet connection and try again.
      </Text>

      <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OfflineScreen;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 9999,
    elevation: 9999, // needed for Android stacking, zIndex alone isn't enough
  },
  animationContainer: {
    width: 250,
    height: 250,
  },
  animation: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: C.gray900,
    textAlign: "center",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: C.gray500,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: 30,
    backgroundColor: C.green,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 30,
  },
  retryButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "700",
  },
});