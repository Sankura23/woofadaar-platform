import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

type DashboardScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const features = [
    { title: '🐕 My Dogs', screen: 'Dogs' as const, description: 'Manage your dog profiles' },
    { title: '🏥 Health Tracking', screen: 'Health' as const, description: 'Track health and appointments' },
    { title: '👥 Community', screen: 'Community' as const, description: 'Connect with dog parents' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome to Woofadaar!</Text>
        </View>

        <Card>
          <CardContent>
            <Text style={styles.welcomeText}>
              🎉 Your mobile app is working perfectly! This is the native React Native version of Woofadaar.
            </Text>
          </CardContent>
        </Card>

        <Text style={styles.featuresTitle}>Quick Actions</Text>
        
        {features.map((feature, index) => (
          <Card key={index}>
            <CardContent>
              <TouchableOpacity
                onPress={() => navigation.navigate(feature.screen)}
                style={styles.featureButton}
              >
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </TouchableOpacity>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>✅ Phase 1 Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.phaseText}>
              • Clean React Native setup ✅{'\n'}
              • Navigation configured ✅{'\n'}
              • API service integrated ✅{'\n'}
              • Reusable components ✅{'\n'}
              • TypeScript support ✅
            </Text>
            <Text style={styles.nextText}>
              Next: Implement full features and test on device!
            </Text>
          </CardContent>
        </Card>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#059669',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    marginTop: 20,
  },
  featureButton: {
    paddingVertical: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  phaseText: {
    fontSize: 14,
    color: '#059669',
    lineHeight: 20,
    marginBottom: 12,
  },
  nextText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
});