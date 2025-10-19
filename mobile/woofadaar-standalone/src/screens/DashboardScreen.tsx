import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Colors, BorderRadius, Shadows, Spacing } from '../theme/colors';
import BannerCarousel from '../components/BannerCarousel';

const { width, height } = Dimensions.get('window');

export default function DashboardScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    dogCount: 0,
    records: 0,
    points: 0,
  });
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle scroll to top when route params change
  useEffect(() => {
    if (route?.params?.scrollToTop) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [route?.params?.scrollToTop]);

  const loadDashboardData = async () => {
    try {
      // Load dog count
      const dogs = await apiService.getDogs();
      const dogCount = dogs.length;

      // Load points (with fallback)
      let points = 0;
      try {
        const pointsData = await apiService.getUserPoints();
        points = pointsData.points || 0;
      } catch (error) {
        points = 0;
      }

      // Load recent community questions
      try {
        const questionsData = await apiService.getQuestions();
        setRecentQuestions(questionsData.slice(0, 3)); // Show top 3
      } catch (error) {
        setRecentQuestions([]);
      }

      setStats({
        dogCount,
        records: dogCount * 8, // Estimated records based on dogs
        points,
      });
    } catch (error) {
      console.log('Dashboard data loading error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Banner data for carousel
  const banners = [
    {
      id: '1',
      title: 'Is Your Pet Not Eating?',
      subtitle: 'Get expert advice from our community',
      type: 'community' as const,
      icon: 'help-circle',
      iconFamily: 'ionicons' as const,
      color: Colors.primary.mintTeal,
      bgColor: Colors.secondary.mintTeal[10],
    },
    {
      id: '2',
      title: 'Common Health Issues',
      subtitle: 'Learn about symptoms and prevention',
      type: 'health' as const,
      icon: 'medical',
      iconFamily: 'ionicons' as const,
      color: Colors.primary.burntOrange,
      bgColor: Colors.secondary.burntOrange[10],
    },
    {
      id: '3',
      title: 'Ask the Experts',
      subtitle: 'Connect with certified vets',
      type: 'community' as const,
      icon: 'doctor',
      iconFamily: 'material-community' as const,
      color: Colors.primary.mutedPurple,
      bgColor: Colors.secondary.mutedPurple[10],
    },
    {
      id: '4',
      title: 'Pet Care Tips',
      subtitle: 'Daily tips for a happy pet',
      type: 'health' as const,
      icon: 'heart',
      iconFamily: 'ionicons' as const,
      color: Colors.primary.warmYellow,
      bgColor: Colors.secondary.warmYellow[10],
    },
  ];

  const handleBannerPress = (banner: any) => {
    if (banner.type === 'community') {
      navigation.navigate('Community');
    } else if (banner.type === 'health') {
      navigation.navigate('Health');
    }
  };

  // Feature cards - Appointments moved before Dog ID
  const features = [
    {
      icon: 'dog' as const,
      iconFamily: 'material-community',
      title: 'My Dogs',
      subtitle: 'Manage profiles',
      screen: 'DogsList',
      color: Colors.primary.mintTeal,
      bgColor: Colors.secondary.mintTeal[20],
    },
    {
      icon: 'heartbeat' as const,
      iconFamily: 'font-awesome-5',
      title: 'Health',
      subtitle: 'Track wellness',
      screen: 'HealthHome',
      color: Colors.primary.burntOrange,
      bgColor: Colors.secondary.burntOrange[20],
    },
    {
      icon: 'calendar' as const,
      iconFamily: 'ionicons',
      title: 'Appointments',
      subtitle: 'Schedule visits',
      screen: 'Appointments',
      color: Colors.primary.warmYellow,
      bgColor: Colors.secondary.warmYellow[20],
    },
    {
      icon: 'qr-code' as const,
      iconFamily: 'ionicons',
      title: 'Dog ID',
      subtitle: 'Quick access',
      screen: 'DogId',
      color: Colors.primary.mutedPurple,
      bgColor: Colors.secondary.mutedPurple[20],
    },
  ];

  // Quick actions
  const quickActions = [
    { icon: 'medical', title: 'Add Health Log', color: Colors.primary.burntOrange },
    { icon: 'camera', title: 'Upload Photo', color: Colors.primary.mintTeal },
    { icon: 'nutrition', title: 'Food Tracker', color: Colors.primary.warmYellow },
  ];

  const renderFeatureIcon = (feature: any) => {
    const iconProps = { size: 24, color: feature.color };

    switch(feature.iconFamily) {
      case 'material-community':
        return <MaterialCommunityIcons name={feature.icon} {...iconProps} />;
      case 'font-awesome-5':
        return <FontAwesome5 name={feature.icon} {...iconProps} />;
      default:
        return <Ionicons name={feature.icon as any} {...iconProps} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.mintTeal]}
            tintColor={Colors.primary.mintTeal}
          />
        }
      >
        {/* Custom Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.profileAndGreeting}>
              <View style={styles.profileImageContainer}>
                {(user?.profile_image_url || user?.profileImage) ? (
                  <Image
                    source={{ uri: user?.profile_image_url || user?.profileImage }}
                    style={styles.headerProfileImage}
                  />
                ) : (
                  <View style={[styles.headerProfileImage, styles.headerProfilePlaceholder]}>
                    <Text style={styles.headerProfileText}>
                      {user?.name?.charAt(0)?.toUpperCase() || '👤'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingTime}>{getGreeting()}</Text>
                <Text style={styles.userName}>{user?.name || 'Pet Parent'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color={Colors.ui.textPrimary} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Banner Carousel - Replaced Hero Section */}
        <BannerCarousel
          banners={banners}
          onBannerPress={handleBannerPress}
        />

        {/* Feature Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.featureCard, { backgroundColor: feature.bgColor }]}
                onPress={() => {
                  if (feature.screen === 'DogsList') {
                    navigation.navigate('MyDogs');
                  } else if (feature.screen === 'HealthHome') {
                    navigation.navigate('Health');
                  } else if (feature.screen === 'DogId') {
                    // Get first dog for demo or show message
                    if (stats.dogCount > 0) {
                      navigation.navigate('MyDogs');
                    } else {
                      navigation.navigate('MyDogs');
                    }
                  } else if (feature.title === 'Appointments') {
                    navigation.navigate('Appointments');
                  } else {
                    navigation.navigate(feature.screen);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.featureIconContainer, { backgroundColor: Colors.ui.surface }]}>
                  {renderFeatureIcon(feature)}
                </View>
                <Text style={[styles.featureTitle, { color: feature.color }]}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>


        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickActionCardNew, { backgroundColor: `${action.color}15` }]}
                activeOpacity={0.7}
                onPress={() => {
                  if (action.title === 'Add Health Log') {
                    navigation.navigate('Health');
                  } else if (action.title === 'Upload Photo') {
                    navigation.navigate('MyDogs');
                  } else if (action.title === 'Food Tracker') {
                    navigation.navigate('Health');
                  }
                }}
              >
                <View style={[styles.quickActionIconNew, { backgroundColor: `${action.color}25` }]}>
                  <Ionicons name={action.icon as any} size={20} color={action.color} />
                </View>
                <Text style={[styles.quickActionTextNew, { color: action.color }]}>{action.title}</Text>
                <Ionicons name="chevron-forward" size={16} color={action.color} style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Community Overview */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.sectionTitle}>Community</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Community')} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary.mintTeal} />
            </TouchableOpacity>
          </View>
          {recentQuestions.length > 0 ? (
            <View style={styles.communityCard}>
              {recentQuestions.map((question: any, index) => (
                <View key={question.id}>
                  <TouchableOpacity
                    style={styles.communityItem}
                    onPress={() => navigation.navigate('Community')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.communityIconContainer, { backgroundColor: Colors.secondary.mutedPurple[20] }]}>
                      <Ionicons name="chatbubble-ellipses" size={18} color={Colors.primary.mutedPurple} />
                    </View>
                    <View style={styles.communityContent}>
                      <Text style={styles.communityTitle} numberOfLines={1}>
                        {question.title}
                      </Text>
                      <View style={styles.communityMeta}>
                        <Text style={styles.communityAuthor}>
                          by {question.user?.name || 'Anonymous'}
                        </Text>
                        <View style={styles.communityDot} />
                        <Text style={styles.communityAnswers}>
                          {question.answer_count || 0} answers
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.ui.textTertiary} />
                  </TouchableOpacity>
                  {index < recentQuestions.length - 1 && (
                    <View style={styles.communityDivider} />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.communityEmptyCard}
              onPress={() => navigation.navigate('Community')}
              activeOpacity={0.7}
            >
              <View style={styles.communityEmptyContent}>
                <View style={[styles.communityEmptyIcon, { backgroundColor: Colors.secondary.mutedPurple[20] }]}>
                  <MaterialCommunityIcons name="account-group" size={32} color={Colors.primary.mutedPurple} />
                </View>
                <View style={styles.communityEmptyText}>
                  <Text style={styles.communityEmptyTitle}>Join the Community</Text>
                  <Text style={styles.communityEmptySubtitle}>Ask questions, share experiences with fellow dog parents</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={Colors.primary.mutedPurple} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.fafafa,
  },
  scrollContainer: {
    paddingBottom: 20,
  },

  // Header
  header: {
    backgroundColor: Colors.neutral.fafafa,
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 20,
    paddingHorizontal: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.mobile.margin,
  },
  profileAndGreeting: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  headerProfileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerProfilePlaceholder: {
    backgroundColor: Colors.primary.mintTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfileText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  greetingContainer: {
    flex: 1,
  },
  greetingTime: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.ui.textTertiary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
  },
  greetingTime: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary.mutedPurple,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    lineHeight: 22,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral.fafafa,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.functional.error,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: Spacing.mobile.margin,
    marginTop: 16,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: Colors.primary.mintTeal,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 24,
  },
  heroLeft: {
    flex: 1,
  },
  heroWelcome: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  heroMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    lineHeight: 26,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  heroRight: {
    marginLeft: 16,
    position: 'relative',
    width: 80,
    height: 80,
  },
  heroDogImage: {
    width: 170,
    height: 170,
    opacity: 1.0,
    position: 'absolute',
    bottom: -50,
    right: -35,
  },
  heroTextContainer: {
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 16,
    color: Colors.neutral.milkWhite,
    opacity: 0.9,
    marginBottom: 4,
  },
  heroBrand: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.neutral.milkWhite,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.neutral.milkWhite,
    opacity: 0.8,
  },
  pawDecoration: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.3,
    transform: [{ rotate: '-15deg' }],
  },

  // Features Section
  featuresSection: {
    paddingHorizontal: Spacing.mobile.margin,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.mobile.gutter,
  },
  featureCard: {
    width: (width - (Spacing.mobile.margin * 2) - Spacing.mobile.gutter) / 2,
    borderRadius: BorderRadius.card,
    padding: 16,
    alignItems: 'center',
    ...Shadows.small,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Shadows.small,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
  },

  // Stats Section
  statsSection: {
    paddingHorizontal: Spacing.mobile.margin,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statItemNew: {
    alignItems: 'center',
    flex: 1,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    ...Shadows.small,
  },
  statIconBig: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValueBig: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabelBig: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 12,
    paddingVertical: 8,
    ...Shadows.small,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral.fafafa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.ui.divider,
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: Spacing.mobile.margin,
    marginBottom: 20,
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: BorderRadius.card,
    ...Shadows.small,
  },
  quickActionIconNew: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickActionTextNew: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsScroll: {
    paddingLeft: 0,
  },
  quickActionCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },

  // Activity Section
  activitySection: {
    paddingHorizontal: Spacing.mobile.margin,
    marginBottom: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary.mintTeal,
    fontWeight: '600',
  },
  communityCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 20,
    ...Shadows.small,
  },
  communityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  communityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  communityContent: {
    flex: 1,
    marginRight: 8,
  },
  communityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 4,
  },
  communityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityAuthor: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
  },
  communityDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.ui.textTertiary,
    marginHorizontal: 6,
  },
  communityAnswers: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
  },
  communityDivider: {
    height: 1,
    backgroundColor: Colors.ui.divider,
    marginVertical: 16,
  },
  communityEmptyCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    ...Shadows.small,
  },
  communityEmptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  communityEmptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  communityEmptyText: {
    flex: 1,
    marginRight: 12,
  },
  communityEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 4,
  },
  communityEmptySubtitle: {
    fontSize: 13,
    color: Colors.ui.textTertiary,
    lineHeight: 18,
  },
  activityCard: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 20,
    ...Shadows.small,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 2,
  },
  activitySubtext: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
  },
  activityTime: {
    fontSize: 11,
    color: Colors.ui.textTertiary,
  },
  activityDivider: {
    height: 1,
    backgroundColor: Colors.ui.divider,
    marginVertical: 16,
  },
});