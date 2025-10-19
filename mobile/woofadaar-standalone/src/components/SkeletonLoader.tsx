import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../theme/colors';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.small,
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]).start(() => animate());
    };
    animate();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.ui.background, Colors.ui.border],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

export const QuestionSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <SkeletonLoader width="60%" height={16} />
          <SkeletonLoader width="40%" height={12} style={styles.subtitle} />
        </View>
      </View>
      <SkeletonLoader width="90%" height={14} style={styles.content} />
      <SkeletonLoader width="70%" height={14} style={styles.content} />
      <View style={styles.footer}>
        <SkeletonLoader width={60} height={12} />
        <SkeletonLoader width={80} height={12} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.mobile.padding,
    marginBottom: Spacing.mobile.margin,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  content: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});