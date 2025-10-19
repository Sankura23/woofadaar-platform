import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows } from '../theme/colors';

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 40;
const BANNER_HEIGHT = 160;

interface BannerData {
  id: string;
  title: string;
  subtitle: string;
  type: 'community' | 'event' | 'health' | 'promo';
  icon: string;
  iconFamily: 'ionicons' | 'material-community';
  color: string;
  bgColor: string;
  action?: () => void;
}

interface BannerCarouselProps {
  banners: BannerData[];
  onBannerPress?: (banner: BannerData) => void;
}

export default function BannerCarousel({ banners, onBannerPress }: BannerCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [currentIndex]);

  const startAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    autoScrollTimer.current = setInterval(() => {
      scrollToNext();
    }, 4000);
  };

  const scrollToNext = () => {
    const nextIndex = currentIndex >= banners.length - 1 ? 0 : currentIndex + 1;
    scrollViewRef.current?.scrollTo({
      x: nextIndex * (BANNER_WIDTH + 20),
      animated: true,
    });
    setCurrentIndex(nextIndex);
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageIndex = Math.round(contentOffset.x / (BANNER_WIDTH + 20));
    if (pageIndex !== currentIndex) {
      setCurrentIndex(pageIndex);
    }
  };

  const renderIcon = (banner: BannerData) => {
    const iconProps = { size: 40, color: banner.color };

    if (banner.iconFamily === 'material-community') {
      return <MaterialCommunityIcons name={banner.icon as any} {...iconProps} />;
    }
    return <Ionicons name={banner.icon as any} {...iconProps} />;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          if (autoScrollTimer.current) {
            clearInterval(autoScrollTimer.current);
          }
        }}
        onScrollEndDrag={startAutoScroll}
        scrollEventThrottle={16}
        snapToInterval={BANNER_WIDTH + 20}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={() => onBannerPress && onBannerPress(banner)}
            style={styles.bannerCard}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerLeft}>
                <Text style={[styles.bannerTitle, { color: banner.color }]}>
                  {banner.title}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {banner.subtitle}
                </Text>
                <View style={[styles.bannerButton, { backgroundColor: banner.color }]}>
                  <Text style={styles.bannerButtonText}>Learn More</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </View>
              <View style={styles.bannerRight}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.secondary.mintTeal[10] }]}>
                  {renderIcon(banner)}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginRight: 20,
    borderRadius: BorderRadius.card,
    padding: 20,
    backgroundColor: Colors.ui.surface,
    ...Shadows.medium,
  },
  bannerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeft: {
    flex: 1,
    marginRight: 20,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
    color: Colors.ui.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.medium,
    gap: 6,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ui.border,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: Colors.primary.mintTeal,
  },
});