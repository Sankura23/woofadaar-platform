import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Simple fade in immediately
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Scale in immediately
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Call completion after 2.5 seconds
    const timer = setTimeout(() => {
      onAnimationComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onAnimationComplete]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View style={[
        styles.logoContainer,
        {
          transform: [{ scale: scaleAnim }],
        }
      ]}>
        <Image
          source={require('../../assets/woofadaar-fullscreen.png')}
          style={styles.wordmark}
          resizeMode="cover"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    width: width,
    height: height,
  },
});