import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🐕 Woofadaar</Text>
          <Text style={styles.subtitle}>India's Premier Dog Parent Community</Text>
        </View>

        <Card style={styles.welcomeCard}>
          <CardHeader>
            <CardTitle>Welcome to Woofadaar!</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.welcomeText}>
              Join thousands of dog parents across India. Track your dog's health, 
              connect with the community, and access expert veterinary services.
            </Text>
          </CardContent>
        </Card>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <Text style={styles.outlineButtonText}>Explore Features</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>✨ Key Features</Text>
          
          <Card>
            <CardContent>
              <Text style={styles.featureTitle}>🏥 Health Tracking</Text>
              <Text style={styles.featureText}>
                Track symptoms, mood, appetite, and schedule vet appointments
              </Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Text style={styles.featureTitle}>👥 Community Support</Text>
              <Text style={styles.featureText}>
                Ask questions, get expert answers, and connect with dog parents
              </Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Text style={styles.featureTitle}>🎯 Gamification</Text>
              <Text style={styles.featureText}>
                Earn points, unlock achievements, and compete on leaderboards
              </Text>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Text style={styles.featureTitle}>🆔 Digital Dog ID</Text>
              <Text style={styles.featureText}>
                QR-based identification with emergency medical access
              </Text>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  welcomeCard: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 30,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#10b981',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  outlineButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresContainer: {
    gap: 16,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});