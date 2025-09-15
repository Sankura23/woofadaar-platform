import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { Card, CardContent } from '../../components/ui/Card';

type DogsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dogs'>;
};

export default function DogsScreen({ navigation }: DogsScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card>
          <CardContent>
            <Text style={styles.text}>🐕 Dogs Screen - Coming soon!</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('AddDog')}
            >
              <Text style={styles.buttonText}>Add Dog</Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});