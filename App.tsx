import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';

// Main Woofadaar Mobile App Component
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');

  const screens = {
    home: () => (
      <View style={styles.screen}>
        <Text style={styles.title}>🐕 Woofadaar</Text>
        <Text style={styles.subtitle}>India's Premier Dog Parent Community</Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setCurrentScreen('register')}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setCurrentScreen('login')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setCurrentScreen('features')}
          >
            <Text style={styles.buttonText}>Features</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),

    register: () => (
      <View style={styles.screen}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.text}>🐕 Join India's largest dog parent community</Text>
        <Text style={styles.text}>📱 Complete registration coming soon</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    ),

    login: () => (
      <View style={styles.screen}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.text}>🔐 Login to your Woofadaar account</Text>
        <Text style={styles.text}>📱 Full authentication coming soon</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    ),

    features: () => (
      <View style={styles.screen}>
        <Text style={styles.title}>✨ Features</Text>
        <ScrollView style={styles.scrollView}>
          <Text style={styles.featureTitle}>🏥 Health Tracking</Text>
          <Text style={styles.featureText}>• Track your dog's health logs and appointments</Text>
          <Text style={styles.featureText}>• Medication reminders and vaccination tracking</Text>
          
          <Text style={styles.featureTitle}>👥 Community</Text>
          <Text style={styles.featureText}>• Ask questions and get expert answers</Text>
          <Text style={styles.featureText}>• Join forums and connect with other dog parents</Text>
          
          <Text style={styles.featureTitle}>🎯 Gamification</Text>
          <Text style={styles.featureText}>• Earn points and unlock achievements</Text>
          <Text style={styles.featureText}>• Compete on leaderboards</Text>
          
          <Text style={styles.featureTitle}>💳 Payments & Services</Text>
          <Text style={styles.featureText}>• Book vet appointments with integrated payments</Text>
          <Text style={styles.featureText}>• Partner services and exclusive offers</Text>
          
          <Text style={styles.featureTitle}>🆔 Dog ID System</Text>
          <Text style={styles.featureText}>• QR-based digital dog identification</Text>
          <Text style={styles.featureText}>• Emergency medical access for partners</Text>
        </ScrollView>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={styles.buttonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    ),
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {screens[currentScreen]()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    width: '100%',
    maxHeight: 400,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 16,
    color: '#4b5563',
    marginLeft: 10,
    marginBottom: 5,
  },
});

registerRootComponent(App);