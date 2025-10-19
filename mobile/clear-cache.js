import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearCache() {
  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();

    // Filter for woofadaar-related keys
    const woofadaarKeys = keys.filter(key => key.includes('woofadaar'));

    console.log('Found cache keys:', woofadaarKeys);

    // Remove all woofadaar keys
    if (woofadaarKeys.length > 0) {
      await AsyncStorage.multiRemove(woofadaarKeys);
      console.log('Cache cleared successfully!');
    } else {
      console.log('No cache to clear');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

clearCache();