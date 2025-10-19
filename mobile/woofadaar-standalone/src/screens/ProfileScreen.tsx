import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Colors, Spacing } from '../theme/colors';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  iconFamily: 'ionicons' | 'material' | 'fontawesome5';
  action?: () => void;
  hasArrow?: boolean;
  hasSwitch?: boolean;
  switchValue?: boolean;
}

export default function ProfileScreen({ navigation, route }: any) {
  const { user, logout, checkAuthStatus } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [stats, setStats] = useState({
    dogCount: 0,
    points: 0,
    memberSince: '',
  });

  const pickImage = async () => {
    console.log('=== PICK IMAGE BUTTON PRESSED ===');
    Alert.alert(
      'Select Photo',
      'Choose how you want to select a photo',
      [
        { text: 'Camera', onPress: () => launchCamera() },
        { text: 'Gallery', onPress: () => launchGallery() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera permissions to take photos!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const launchGallery = async () => {
    console.log('=== LAUNCH GALLERY CALLED ===');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('Gallery permission status:', status);
    if (status !== 'granted') {
      Alert.alert('Sorry, we need photo library permissions!');
      return;
    }

    console.log('Opening gallery...');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    console.log('Gallery result:', result);
    if (!result.canceled && result.assets[0]) {
      console.log('Image selected, calling uploadImage with URI:', result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    } else {
      console.log('Gallery selection canceled or no assets');
    }
  };

  const uploadImage = async (imageUri: string) => {
    setImageLoading(true);
    try {
      console.log('Uploading image:', imageUri);
      const imageUrl = await apiService.uploadProfileImage(imageUri);
      console.log('Upload successful, URL:', imageUrl);

      // The upload API already updates the profile, so just refresh the user data
      await checkAuthStatus(); // Refresh user data to show new image

      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error: any) {
      console.error('Image upload error:', error);

      // Show user-friendly error message
      const errorMessage = error?.message || 'Failed to upload image. Please try again.';
      Alert.alert('Upload Failed', errorMessage, [
        {
          text: 'Try Again',
          onPress: () => pickImage(),
          style: 'default'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]);
    } finally {
      setImageLoading(false);
    }
  };

  useEffect(() => {
    loadUserStats();
    console.log('ProfileScreen: Current user object:', JSON.stringify(user, null, 2));
    console.log('ProfileScreen: Profile image URL:', user?.profile_image_url);
    console.log('ProfileScreen: Alternative profile image:', user?.profileImage);
  }, [user]);

  // Handle scroll to top when route params change
  useEffect(() => {
    if (route?.params?.scrollToTop) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [route?.params?.scrollToTop]);

  const loadUserStats = async () => {
    try {
      // Get dog count
      const dogs = await apiService.getDogs();
      const dogCount = dogs.length;

      // Get user points
      let points = 0;
      try {
        const pointsData = await apiService.getUserPoints();
        points = pointsData.points || 0;
      } catch (error) {
        // Points API not available - this is expected behavior
        points = 0;
      }

      // Calculate member since
      const memberSince = user?.createdAt
        ? calculateMemberSince(user.createdAt)
        : '0Y';

      setStats({ dogCount, points, memberSince });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserStats();
    await checkAuthStatus();
    setRefreshing(false);
  };

  const calculateMemberSince = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
    const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));

    if (diffYears > 0) {
      return `${diffYears}Y`;
    } else if (diffMonths > 0) {
      return `${diffMonths}M`;
    } else {
      return 'New';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout()
        },
      ]
    );
  };

  const handleDeleteProfile = () => {
    console.log('handleDeleteProfile function called');
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This action cannot be undone and will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed profile deletion, calling API...');
            try {
              // Call API to delete profile
              await apiService.deleteUserProfile();
              console.log('Profile deletion API call successful');
              Alert.alert(
                'Profile Deleted',
                'Your profile has been successfully deleted.',
                [{ text: 'OK', onPress: () => logout() }]
              );
            } catch (error) {
              console.error('Profile deletion failed:', error);
              Alert.alert(
                'Error',
                'Failed to delete profile. Please try again or contact support.'
              );
            }
          }
        },
      ]
    );
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'edit-profile',
          title: 'Edit Profile',
          subtitle: 'Update your information',
          icon: 'person-outline',
          iconFamily: 'ionicons' as const,
          hasArrow: true,
        },
        {
          id: 'subscription',
          title: 'Subscription',
          subtitle: 'Premium features',
          icon: 'card-outline',
          iconFamily: 'ionicons' as const,
          hasArrow: true,
        },
        {
          id: 'delete-profile',
          title: 'Delete Profile',
          subtitle: 'Permanently delete your account',
          icon: 'trash-outline',
          iconFamily: 'ionicons' as const,
          hasArrow: true,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          icon: 'notifications-outline',
          iconFamily: 'ionicons' as const,
          hasSwitch: true,
          switchValue: notifications,
        },
        {
          id: 'dark-mode',
          title: 'Dark Mode',
          icon: 'moon-outline',
          iconFamily: 'ionicons' as const,
          hasSwitch: true,
          switchValue: darkMode,
        },
        {
          id: 'language',
          title: 'Language',
          subtitle: 'English',
          icon: 'language',
          iconFamily: 'material' as const,
          hasArrow: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & Support',
          icon: 'help-circle-outline',
          iconFamily: 'ionicons' as const,
          hasArrow: true,
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          icon: 'shield-checkmark-outline',
          iconFamily: 'ionicons' as const,
          hasArrow: true,
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          icon: 'document-text-outline',
          iconFamily: 'ionicons' as const,
          hasArrow: true,
        },
        {
          id: 'about',
          title: 'About Woofadaar',
          icon: 'information-circle-outline',
          iconFamily: 'ionicons' as const,
          hasArrow: true,
        },
      ],
    },
  ];

  const renderIcon = (item: MenuItem) => {
    const iconProps = { size: 22, color: '#64748B' };

    switch (item.iconFamily) {
      case 'material':
        return <MaterialIcons name={item.icon as any} {...iconProps} />;
      case 'fontawesome5':
        return <FontAwesome5 name={item.icon as any} {...iconProps} />;
      default:
        return <Ionicons name={item.icon as any} {...iconProps} />;
    }
  };

  const handleMenuPress = (item: MenuItem) => {
    console.log('Menu item pressed:', item.id, item.title);
    if (item.action) {
      item.action();
    } else if (item.id === 'edit-profile') {
      navigation.navigate('EditProfile');
    } else if (item.id === 'delete-profile') {
      console.log('Delete profile menu item pressed, calling handleDeleteProfile');
      handleDeleteProfile();
    } else if (item.id === 'language') {
      Alert.alert('Language Settings', 'Language selection: English/Hindi');
      // TODO: Implement language selector
    } else {
      Alert.alert('Coming Soon', `${item.title} feature will be available soon!`);
    }
  };

  const handleSwitchChange = (itemId: string, value: boolean) => {
    if (itemId === 'notifications') {
      setNotifications(value);
      // TODO: Implement actual notification toggle
      Alert.alert('Notifications', `Push notifications ${value ? 'enabled' : 'disabled'}`);
    } else if (itemId === 'dark-mode') {
      setDarkMode(value);
      // TODO: Implement actual dark mode
      Alert.alert('Dark Mode', `Dark mode ${value ? 'enabled' : 'disabled'}. This feature will be fully implemented soon!`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary.mintTeal]}
            tintColor={Colors.primary.mintTeal}
          />
        }
      >
        {/* Page Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>
        {/* Profile Section */}
        <View style={[styles.profileCard, { marginHorizontal: Spacing.mobile.margin }]}>
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {(user?.profile_image_url || user?.profileImage) ? (
                <Image
                  source={{ uri: user?.profile_image_url || user?.profileImage }}
                  style={styles.avatar}
                  defaultSource={require('../../assets/woofadaar-icon.jpg')}
                  onError={(error) => console.log('Profile image load error:', error)}
                  onLoad={() => console.log('Profile image loaded successfully')}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0)?.toUpperCase() || '🐕'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.name || 'Pet Parent'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.dogCount}</Text>
                <Text style={styles.statLabel}>Dogs</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.points}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.memberSince}</Text>
                <Text style={styles.statLabel}>Member</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        <View style={[styles.menuContainer, { marginHorizontal: Spacing.mobile.margin }]}>
          {menuSections.map((section, sectionIndex) => (
            <View key={section.title} style={styles.menuSection}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionItems}>
                {section.items.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      index === section.items.length - 1 && styles.lastMenuItem,
                    ]}
                    onPress={() => {
                      console.log('TouchableOpacity pressed for item:', item.id, item.title);
                      handleMenuPress(item);
                    }}
                    disabled={item.hasSwitch}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={styles.iconContainer}>
                        {renderIcon(item)}
                      </View>
                      <View style={styles.menuItemText}>
                        <Text style={styles.menuItemTitle}>{item.title}</Text>
                        {item.subtitle && (
                          <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                        )}
                      </View>
                    </View>
                    {item.hasArrow && (
                      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    )}
                    {item.hasSwitch && (
                      <View style={styles.switchContainer}>
                        <Switch
                          value={item.switchValue}
                          onValueChange={(value) => handleSwitchChange(item.id, value)}
                          trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                          thumbColor={item.switchValue ? '#4FD1C7' : '#F3F4F6'}
                          style={styles.switch}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Woofadaar v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for dog parents</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  titleSection: {
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.primary.mutedPurple,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 0,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#4FD1C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4FD1C7',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  menuContainer: {
    marginTop: 20,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 20,
    marginBottom: 8,
  },
  sectionItems: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'visible',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    minHeight: 56,
    width: '100%',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  versionContainer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  versionText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  switchContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },
  switch: {
    transform: [{ scaleX: 1.0 }, { scaleY: 1.0 }],
  },
});