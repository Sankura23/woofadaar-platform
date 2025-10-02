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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

type LoginType = 'parent' | 'partner';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('e@c.com');
  const [password, setPassword] = useState('Password');
  const [loginType, setLoginType] = useState<LoginType>('parent');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      // Navigation handled by App.tsx based on auth state
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid email or password');
      console.error('Login error:', error);
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
          bounces={false}
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../../assets/woofadaar-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, loginType === 'parent' && styles.activeTab]}
                onPress={() => setLoginType('parent')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, loginType === 'parent' && styles.activeTabText]}>
                  Pet Parents
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, loginType === 'partner' && styles.activeTab]}
                onPress={() => setLoginType('partner')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, loginType === 'partner' && styles.activeTabText]}>
                  Partners
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.welcomeText}>
              {loginType === 'parent'
                ? 'Welcome back to your pet community'
                : 'Welcome back, Partner!'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.ui.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.ui.textTertiary}
                secureTextEntry
                autoComplete="password"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.link}>Sign up</Text>
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
    backgroundColor: Colors.ui.surface, // White background as per UI guideline
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.mobile.margin,
    paddingTop: 20, // Reduced top padding
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 8, // Reduced spacing between logo and form
  },
  logo: {
    width: width * 0.7,
    height: 160,
  },
  formContainer: {
    backgroundColor: Colors.ui.surface,
    borderRadius: BorderRadius.card,
    padding: 24,
    ...Shadows.card,
    marginBottom: 40,
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
  welcomeText: {
    fontSize: Typography.fontSizes.body1,
    color: Colors.ui.textSecondary,
    fontWeight: Typography.fontWeights.medium,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
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
  loginButton: {
    backgroundColor: Colors.primary.mintTeal,
    paddingVertical: 16,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    marginTop: 8,
    ...Shadows.small,
  },
  disabledButton: {
    backgroundColor: Colors.ui.textDisabled,
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: Colors.ui.surface,
    fontSize: Typography.fontSizes.body1,
    fontWeight: Typography.fontWeights.bold,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: Colors.primary.mintTeal,
    fontSize: Typography.fontSizes.body2,
    fontWeight: Typography.fontWeights.medium,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
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