import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Dog } from '../../types/auth';
import { apiService } from '../../services/api';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';

type EditDogScreenProps = {
  route: RouteProp<any, 'EditDog'>;
  navigation: NativeStackNavigationProp<any, 'EditDog'>;
};

export default function EditDogScreen({ route, navigation }: EditDogScreenProps) {
  const { dog } = route.params;

  const [formData, setFormData] = useState({
    name: dog.name || '',
    breed: dog.breed || '',
    age_months: dog.age_months || 0,
    weight_kg: dog.weight_kg || 0,
    gender: dog.gender || '',
    color: dog.color || '',
    microchip_id: dog.microchip_id || '',
    photo_url: dog.photo_url || '',
  });

  const [loading, setLoading] = useState(false);

  const handleImagePicker = async () => {
    const showActionSheet = () => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Take Photo', 'Choose from Library'],
            cancelButtonIndex: 0,
          },
          async (buttonIndex) => {
            if (buttonIndex === 1) {
              await pickImageFromCamera();
            } else if (buttonIndex === 2) {
              await pickImageFromLibrary();
            }
          }
        );
      } else {
        Alert.alert(
          'Select Photo',
          'Choose an option',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Take Photo', onPress: pickImageFromCamera },
            { text: 'Choose from Library', onPress: pickImageFromLibrary },
          ]
        );
      }
    };

    const pickImageFromCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, photo_url: result.assets[0].uri });
      }
    };

    const pickImageFromLibrary = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, photo_url: result.assets[0].uri });
      }
    };

    showActionSheet();
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name for your dog');
      return;
    }

    if (!formData.breed.trim()) {
      Alert.alert('Error', 'Please enter your dog\'s breed');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateDog(dog.id, formData);
      Alert.alert('Success', 'Dog information updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to update dog:', error);
      Alert.alert('Error', 'Failed to update dog information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Dog',
      `Are you sure you want to delete ${dog.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiService.deleteDog(dog.id);
              Alert.alert('Success', 'Dog deleted successfully', [
                { text: 'OK', onPress: () => navigation.navigate('Dogs') }
              ]);
            } catch (error) {
              console.error('Failed to delete dog:', error);
              Alert.alert('Error', 'Failed to delete dog. Please try again.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.ui.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit {dog.name}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color={Colors.functional.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoContainer} onPress={handleImagePicker}>
            {formData.photo_url ? (
              <Image source={{ uri: formData.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={40} color={Colors.ui.textTertiary} />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={20} color={Colors.ui.surface} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter dog's name"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Breed *</Text>
            <TextInput
              style={styles.input}
              value={formData.breed}
              onChangeText={(text) => setFormData({ ...formData, breed: text })}
              placeholder="Enter dog's breed"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Age (months)</Text>
              <TextInput
                style={styles.input}
                value={formData.age_months.toString()}
                onChangeText={(text) => setFormData({ ...formData, age_months: parseInt(text) || 0 })}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={Colors.ui.textTertiary}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={formData.weight_kg.toString()}
                onChangeText={(text) => setFormData({ ...formData, weight_kg: parseFloat(text) || 0 })}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor={Colors.ui.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderSelector}>
              {['Male', 'Female'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderOption,
                    formData.gender === gender && styles.genderOptionSelected
                  ]}
                  onPress={() => setFormData({ ...formData, gender })}
                >
                  <Text style={[
                    styles.genderText,
                    formData.gender === gender && styles.genderTextSelected
                  ]}>
                    {gender}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color</Text>
            <TextInput
              style={styles.input}
              value={formData.color}
              onChangeText={(text) => setFormData({ ...formData, color: text })}
              placeholder="Enter dog's color"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Microchip ID</Text>
            <TextInput
              style={styles.input}
              value={formData.microchip_id}
              onChangeText={(text) => setFormData({ ...formData, microchip_id: text })}
              placeholder="Enter microchip ID (optional)"
              placeholderTextColor={Colors.ui.textTertiary}
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    paddingVertical: 16,
    backgroundColor: Colors.ui.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ui.textPrimary,
  },
  content: {
    flex: 1,
    padding: Spacing.mobile.margin,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.neutral.f5f5f5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.ui.border,
    borderStyle: 'dashed',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: Colors.ui.textTertiary,
    marginTop: 4,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    backgroundColor: Colors.primary.mintTeal,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.ui.surface,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.ui.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.ui.surface,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.ui.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.ui.border,
    borderRadius: BorderRadius.input,
    alignItems: 'center',
    backgroundColor: Colors.ui.surface,
  },
  genderOptionSelected: {
    backgroundColor: Colors.primary.mintTeal,
    borderColor: Colors.primary.mintTeal,
  },
  genderText: {
    fontSize: 16,
    color: Colors.ui.textPrimary,
  },
  genderTextSelected: {
    color: Colors.ui.surface,
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.mobile.margin,
    backgroundColor: Colors.ui.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.ui.border,
  },
  saveButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    ...Shadows.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.ui.surface,
    fontSize: 18,
    fontWeight: '600',
  },
});