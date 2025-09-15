export interface HealthLog {
  id?: string;
  dogId: string;
  date: string;
  mood_score: number;
  appetite_score: number;
  energy_level: number;
  exercise_minutes: number;
  exercise_type: string;
  food_amount: string;
  food_type: string;
  water_intake: string;
  weight_kg?: number;
  symptoms: string[];
  notes: string;
  weather: string;
  temperature?: number;
  created_at?: string;
}

export const MOOD_OPTIONS = [
  { value: 5, label: 'Excellent', emoji: '😊', color: '#10b981' },
  { value: 4, label: 'Good', emoji: '🙂', color: '#84cc16' },
  { value: 3, label: 'Okay', emoji: '😐', color: '#eab308' },
  { value: 2, label: 'Poor', emoji: '🙁', color: '#f97316' },
  { value: 1, label: 'Bad', emoji: '😢', color: '#ef4444' }
];

export const EXERCISE_TYPES = [
  'Walk', 'Run', 'Play', 'Swimming', 'Training', 'Fetch', 'Agility', 'Hiking'
];

export const FOOD_TYPES = [
  'Dry Kibble', 'Wet Food', 'Raw Diet', 'Homemade', 'Treats', 'Mixed'
];

export const COMMON_SYMPTOMS = [
  'Lethargy', 'Loss of Appetite', 'Vomiting', 'Diarrhea', 'Coughing', 
  'Limping', 'Excessive Drinking', 'Excessive Urination', 'Scratching', 
  'Panting', 'Restlessness', 'Fever', 'Shivering', 'Whining',
  'Difficulty Breathing', 'Drooling', 'Bad Breath', 'Red Eyes'
];

export const WEATHER_OPTIONS = [
  'Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Foggy', 'Hot', 'Cold', 'Humid'
];

export const WATER_INTAKE_OPTIONS = [
  'Very Low', 'Low', 'Normal', 'High', 'Very High'
];

export const FOOD_AMOUNT_OPTIONS = [
  'None', 'Very Little', 'Half Portion', 'Normal', 'More than Usual'
];