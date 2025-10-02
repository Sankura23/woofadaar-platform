import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Colors, BorderRadius, Shadows, Spacing } from '../theme/colors';

export default function EditProfileScreen({ navigation }: any) {
  const { user, checkAuthStatus } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    experience_level: 'beginner',
    preferred_language: 'English',
    profile_image_url: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('User data in EditProfile:', user);
      const profileImageUrl = user.profile_image_url || user.profileImage || '';
      console.log('Profile image URL:', profileImageUrl);

      setFormData({
        name: user.name || '',
        email: user.email || '',
        location: user.location || '',
        experience_level: user.experience_level || 'beginner',
        preferred_language: user.preferred_language || 'English',
        profile_image_url: profileImageUrl,
      });
      setSelectedImage(profileImageUrl);
    }
  }, [user]);

  const pickImage = async () => {
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
      setSelectedImage(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const launchGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need photo library permissions!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (imageUri: string) => {
    setImageLoading(true);
    try {
      console.log('Uploading image:', imageUri);
      const imageUrl = await apiService.uploadProfileImage(imageUri);
      console.log('Upload successful, URL:', imageUrl);
      setFormData(prev => ({ ...prev, profile_image_url: imageUrl }));
      Alert.alert('Success', 'Photo uploaded successfully!');
    } catch (error: any) {
      console.error('Image upload error:', error);
      Alert.alert('Error', error?.message || 'Failed to upload image. Please try again.');
      setSelectedImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (formData.name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await apiService.updateUserProfile(formData);
      await checkAuthStatus(); // Refresh user data
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error?.message || 'Failed to update profile. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color={Colors.ui.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary.mintTeal} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <View style={styles.photoContainer}>
            <TouchableOpacity style={styles.photoWrapper} onPress={pickImage}>
              {selectedImage || formData.profile_image_url ? (
                <Image
                  source={{ uri: selectedImage || formData.profile_image_url }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>
                    {formData.name?.charAt(0)?.toUpperCase() || '👤'}
                  </Text>
                </View>
              )}
              <View style={styles.photoOverlay}>
                {imageLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to change photo</Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Enter your email"
              placeholderTextColor={Colors.ui.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              placeholder="Enter your location"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Experience Level</Text>
            <View style={styles.pickerWrapper}>
              {['beginner', 'intermediate', 'experienced', 'expert'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.pickerOption,
                    formData.experience_level === level && styles.pickerOptionSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, experience_level: level }))}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    formData.experience_level === level && styles.pickerOptionTextSelected
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Language</Text>
            <View style={styles.pickerWrapper}>
              {['English', 'Hindi'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.pickerOption,
                    formData.preferred_language === lang && styles.pickerOptionSelected
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, preferred_language: lang }))}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    formData.preferred_language === lang && styles.pickerOptionTextSelected
                  ]}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            * Required fields
          </Text>
          <Text style={styles.infoSubtext}>
            Your personal information is kept secure and is only used to enhance your experience with Woofadaar.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.fafafa,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral.fafafa,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary.mintTeal,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ui.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.mobile.margin,
  },
  formSection: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 20,
    marginTop: 20,
    ...Shadows.small,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.neutral.fafafa,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.ui.textPrimary,
    borderWidth: 1,
    borderColor: Colors.ui.divider,
  },
  infoSection: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.ui.textSecondary,
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
    lineHeight: 16,
  },
  photoSection: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 20,
    marginTop: 20,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 16,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary.mintTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.mintTeal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.ui.surface,
  },
  photoHint: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
    textAlign: 'center',
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.ui.divider,
    backgroundColor: Colors.neutral.fafafa,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primary.mintTeal,
    borderColor: Colors.primary.mintTeal,
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.ui.textSecondary,
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#FFFFFF',
  },
});