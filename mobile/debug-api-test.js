// Test script to verify apiService import
try {
  const { apiService } = require('./src/services/api.ts');
  console.log('apiService imported successfully:', !!apiService);
  console.log('apiService.createDog available:', !!apiService?.createDog);
  console.log('apiService methods:', Object.keys(apiService || {}));
} catch (error) {
  console.error('Error importing apiService:', error.message);
}

try {
  const defaultApiService = require('./src/services/api.ts').default;
  console.log('defaultApiService imported successfully:', !!defaultApiService);
  console.log('defaultApiService.createDog available:', !!defaultApiService?.createDog);
} catch (error) {
  console.error('Error importing default apiService:', error.message);
}