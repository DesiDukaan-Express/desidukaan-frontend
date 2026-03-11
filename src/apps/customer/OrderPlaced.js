import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

const OrderPlaced = () => {

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation();

  const navigateToHome = () => {
    navigation.navigate('CustomerApp')
  }

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true
      })
    ]).start();

    setTimeout(navigateToHome , 3000)
  }, []);


  return (
    <View style={styles.container}>
      
      <Animated.View
        style={[
          styles.circle,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Text style={styles.check}>✓</Text>
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim }}>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.subtitle}>
          Your order has been successfully placed.
        </Text>
      </Animated.View>

    </View>
  );
};

export default OrderPlaced;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#0ff022",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#0ff022",
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10
  },

  check: {
    fontSize: 60,
    color: "#ffffff",
    fontWeight: "bold"
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0ff022",
    textAlign: "center"
  },

  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 10
  }
});