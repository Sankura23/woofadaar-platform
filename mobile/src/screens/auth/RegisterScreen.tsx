import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ModalPicker from '../../components/ModalPicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

const { width } = Dimensions.get('window');

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

type RegisterType = 'parent' | 'partner';

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, isLoading } = useAuth();
  const [registerType, setRegisterType] = useState<RegisterType>('parent');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: 'Mumbai',
    customLocation: '',
    experienceLevel: 'beginner',
    // Partner specific fields
    businessName: '',
    serviceType: 'grooming',
  });

  const locations = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
    'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Other'
  ];

  const serviceTypes = [
    'grooming', 'veterinary', 'training', 'boarding', 'walking', 'other'
  ];

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { name, email, password, confirmPassword, location, customLocation, experienceLevel, businessName } = formData;

    if (registerType === 'parent' && (!name || !email || !password || !confirmPassword)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (registerType === 'partner' && (!businessName || !email || !password || !confirmPassword)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const finalLocation = location === 'Other' ? customLocation : location;
    const finalName = registerType === 'partner' ? businessName : name;

    try {
      await register(email, password, finalName, finalLocation, experienceLevel);
      Alert.alert(
        'Success!',
        `Welcome to Woofadaar, ${finalName}!`,
        [{ text: 'OK', onPress: () => navigation.navigate('Dashboard') }]
      );
    } catch (error) {
      Alert.alert('Registration Failed', 'Email might already be registered');
      console.error('Registration error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Registration Form */}
          <View style={styles.formContainer}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Join </Text>
              <Image
                source={require('../../../assets/woofadaar-logo.png')}
                style={styles.inlineLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.subtitle}>
              Create your account and connect with the dog community
            </Text>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, registerType === 'parent' && styles.activeTab]}
                onPress={() => setRegisterType('parent')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, registerType === 'parent' && styles.activeTabText]}>
                  Pet Parent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, registerType === 'partner' && styles.activeTab]}
                onPress={() => setRegisterType('partner')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, registerType === 'partner' && styles.activeTabText]}>
                  Partner
                </Text>
              </TouchableOpacity>
            </View>

            {/* Conditional Fields based on registration type */}
            {registerType === 'parent' ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(value) => updateFormData('name', value)}
                    placeholder="Your full name"
                    placeholderTextColor={Colors.ui.textTertiary}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Experience Level</Text>
                  <ModalPicker
                    selectedValue={formData.experienceLevel}
                    onValueChange={(value) => updateFormData('experienceLevel', value)}
                    items={[
                      { label: 'Beginner', value: 'beginner' },
                      { label: 'Intermediate', value: 'intermediate' },
                      { label: 'Experienced', value: 'experienced' },
                    ]}
                    placeholder="Select experience level"
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Business Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.businessName}
                    onChangeText={(value) => updateFormData('businessName', value)}
                    placeholder="Your business name"
                    placeholderTextColor={Colors.ui.textTertiary}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Service Type</Text>
                  <ModalPicker
                    selectedValue={formData.serviceType}
                    onValueChange={(value) => updateFormData('serviceType', value)}
                    items={[
                      { label: 'Grooming', value: 'grooming' },
                      { label: 'Veterinary', value: 'veterinary' },
                      { label: 'Training', value: 'training' },
                      { label: 'Boarding', value: 'boarding' },
                      { label: 'Dog Walking', value: 'walking' },
                      { label: 'Other', value: 'other' },
                    ]}
                    placeholder="Select service type"
                  />
                </View>
              </>
            )}

            {/* Common Fields */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="your@email.com"
                placeholderTextColor={Colors.ui.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <ModalPicker
                selectedValue={formData.location}
                onValueChange={(value) => updateFormData('location', value)}
                items={locations.map(location => ({ label: location, value: location }))}
                placeholder="Select location"
              />
            </View>

            {formData.location === 'Other' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Custom Location</Text>
                <TextInput
                  style={styles.input}
                  value={formData.customLocation}
                  onChangeText={(value) => updateFormData('customLocation', value)}
                  placeholder="Enter your city"
                  placeholderTextColor={Colors.ui.textTertiary}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(value) => updateFormData('password', value)}
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.ui.textTertiary}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(value) => updateFormData('confirmPassword', value)}
                placeholder="Confirm your password"
                placeholderTextColor={Colors.ui.textTertiary}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.surface, // White background
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 60,
    paddingBottom: 40,
  },
  formContainer: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 24,
    ...Shadows.card,
    marginTop: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    flexWrap: 'nowrap',
  },
  title: {
    fontSize: Typography.fontSizes.h5,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary.mintTeal,
    flexShrink: 0,
  },
  inlineLogo: {
    width: 160,
    height: 35,
    marginLeft: 8,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: Typography.fontSizes.body2,
    color: Colors.ui.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.ui.background,
    borderRadius: BorderRadius.button,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.buttonSmall,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.ui.surface,
    ...Shadows.small,
  },
  tabText: {
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.ui.textTertiary,
  },
  activeTabText: {
    color: Colors.primary.mintTeal,
    fontWeight: Typography.fontWeights.semiBold,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: Typography.fontSizes.body2,
    fontWeight: Typography.fontWeights.semiBold,
    color: Colors.ui.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: Typography.fontSizes.body1,
    backgroundColor: Colors.ui.surface,
    color: Colors.ui.textPrimary,
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: Colors.ui.border,
    borderRadius: BorderRadius.input,
    backgroundColor: Colors.ui.surface,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  registerButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    marginTop: 16,
    ...Shadows.small,
  },
  disabledButton: {
    backgroundColor: Colors.ui.textDisabled,
    shadowOpacity: 0.1,
  },
  registerButtonText: {
    color: Colors.ui.surface,
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.ui.divider,
  },
  dividerText: {
    color: Colors.ui.textTertiary,
    fontSize: Typography.fontSizes.caption,
    fontWeight: Typography.fontWeights.medium,
    marginHorizontal: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkText: {
    color: Colors.ui.textSecondary,
    fontSize: Typography.fontSizes.body1,
  },
  link: {
    color: Colors.primary.mintTeal,
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.semiBold,
  },
});