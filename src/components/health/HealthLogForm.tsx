'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Save, 
  Camera, 
  X, 
  Plus,
  Clock,
  Scale,
  Activity,
  Heart,
  Utensils,
  Droplets,
  Thermometer,
  AlertCircle
} from 'lucide-react';

interface HealthLogFormProps {
  dogId: string;
  initialDate?: string;
  existingLog?: any;
  onSave?: () => void;
  onCancel?: () => void;
}

interface HealthLogData {
  log_date: string;
  food_amount?: number;
  food_type?: string;
  water_intake?: number;
  exercise_duration?: number;
  exercise_type?: string;
  mood_rating?: number;
  bathroom_frequency?: number;
  weight_kg?: number;
  temperature_celsius?: number;
  notes?: string;
  photos?: string[];
  symptoms?: string[];
  energy_level?: number;
  appetite_level?: number;
}

const EXERCISE_TYPES = [
  'Walk', 'Run', 'Fetch', 'Swimming', 'Hiking', 'Training', 'Free Play', 'Other'
];

const FOOD_TYPES = [
  'Dry Food', 'Wet Food', 'Raw Diet', 'Treats', 'Mixed', 'Special Diet', 'Other'
];

const COMMON_SYMPTOMS = [
  'Vomiting', 'Diarrhea', 'Lethargy', 'Loss of Appetite', 'Excessive Drinking',
  'Difficulty Breathing', 'Limping', 'Scratching', 'Shaking', 'Coughing',
  'Sneezing', 'Eye Discharge', 'Ear Issues', 'Other'
];

export default function HealthLogForm({ 
  dogId, 
  initialDate, 
  existingLog, 
  onSave, 
  onCancel 
}: HealthLogFormProps) {
  const [formData, setFormData] = useState<HealthLogData>({
    log_date: initialDate || new Date().toISOString().split('T')[0],
    symptoms: [],
    photos: []
  });
  
  const [loading, setSaving] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [newSymptom, setNewSymptom] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (existingLog) {
      setFormData({
        log_date: new Date(existingLog.log_date).toISOString().split('T')[0],
        food_amount: existingLog.food_amount || undefined,
        food_type: existingLog.food_type || '',
        water_intake: existingLog.water_intake || undefined,
        exercise_duration: existingLog.exercise_duration || undefined,
        exercise_type: existingLog.exercise_type || '',
        mood_rating: existingLog.mood_rating || undefined,
        bathroom_frequency: existingLog.bathroom_frequency || undefined,
        weight_kg: existingLog.weight_kg || undefined,
        temperature_celsius: existingLog.temperature_celsius || undefined,
        notes: existingLog.notes || '',
        photos: existingLog.photos || [],
        symptoms: existingLog.symptoms || [],
        energy_level: existingLog.energy_level || undefined,
        appetite_level: existingLog.appetite_level || undefined
      });
    }
  }, [existingLog]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addSymptom = (symptom: string) => {
    if (symptom && !formData.symptoms?.includes(symptom)) {
      handleChange('symptoms', [...(formData.symptoms || []), symptom]);
    }
    setNewSymptom('');
  };

  const removeSymptom = (symptom: string) => {
    handleChange('symptoms', formData.symptoms?.filter(s => s !== symptom) || []);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.log_date) {
      newErrors.log_date = 'Date is required';
    }

    if (formData.mood_rating && (formData.mood_rating < 1 || formData.mood_rating > 5)) {
      newErrors.mood_rating = 'Mood rating must be between 1 and 5';
    }

    if (formData.energy_level && (formData.energy_level < 1 || formData.energy_level > 5)) {
      newErrors.energy_level = 'Energy level must be between 1 and 5';
    }

    if (formData.appetite_level && (formData.appetite_level < 1 || formData.appetite_level > 5)) {
      newErrors.appetite_level = 'Appetite level must be between 1 and 5';
    }

    if (formData.weight_kg && formData.weight_kg <= 0) {
      newErrors.weight_kg = 'Weight must be positive';
    }

    if (formData.temperature_celsius && (formData.temperature_celsius < 35 || formData.temperature_celsius > 45)) {
      newErrors.temperature_celsius = 'Temperature seems unusual';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('woofadaar_token');

      const response = await fetch('/api/health/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dog_id: dogId,
          ...formData
        })
      });

      if (response.ok) {
        onSave?.();
        if (!onCancel) {
          router.push(`/health/${dogId}`);
        }
      } else {
        const error = await response.json();
        setErrors({ general: error.error || 'Failed to save health log' });
      }
    } catch (error) {
      console.error('Error saving health log:', error);
      setErrors({ general: 'Failed to save health log' });
    } finally {
      setSaving(false);
    }
  };

  const RatingInput = ({ 
    label, 
    value, 
    onChange, 
    icon: Icon, 
    color = 'text-[#3bbca8]',
    error 
  }: {
    label: string;
    value?: number;
    onChange: (value: number) => void;
    icon: any;
    color?: string;
    error?: string;
  }) => (
    <div className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
        <Icon className={`w-4 h-4 ${color}`} />
        <span>{label}</span>
      </label>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
              value === rating
                ? 'bg-[#3bbca8] border-[#3bbca8] text-white'
                : 'border-gray-300 text-gray-400 hover:border-[#3bbca8]'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {existingLog ? 'Edit Health Log' : 'Daily Health Log'}
          </h2>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 text-[#3bbca8]" />
            <span>Date</span>
          </label>
          <input
            type="date"
            value={formData.log_date}
            onChange={(e) => handleChange('log_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.log_date && <p className="text-red-500 text-xs mt-1">{errors.log_date}</p>}
        </div>

        {/* Basic Measurements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Scale className="w-4 h-4 text-purple-500" />
              <span>Weight (kg)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.weight_kg || ''}
              onChange={(e) => handleChange('weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              placeholder="Enter weight"
            />
            {errors.weight_kg && <p className="text-red-500 text-xs mt-1">{errors.weight_kg}</p>}
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              <span>Temperature (°C)</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.temperature_celsius || ''}
              onChange={(e) => handleChange('temperature_celsius', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              placeholder="38.5"
            />
            {errors.temperature_celsius && <p className="text-red-500 text-xs mt-1">{errors.temperature_celsius}</p>}
          </div>
        </div>

        {/* Ratings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RatingInput
            label="Mood"
            value={formData.mood_rating}
            onChange={(value) => handleChange('mood_rating', value)}
            icon={Heart}
            color="text-pink-500"
            error={errors.mood_rating}
          />

          <RatingInput
            label="Energy Level"
            value={formData.energy_level}
            onChange={(value) => handleChange('energy_level', value)}
            icon={Activity}
            color="text-orange-500"
            error={errors.energy_level}
          />

          <RatingInput
            label="Appetite"
            value={formData.appetite_level}
            onChange={(value) => handleChange('appetite_level', value)}
            icon={Utensils}
            color="text-green-500"
            error={errors.appetite_level}
          />
        </div>

        {/* Food */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900 flex items-center space-x-2">
            <Utensils className="w-5 h-5 text-green-500" />
            <span>Food & Water</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Food Amount (cups)</label>
              <input
                type="number"
                step="0.1"
                value={formData.food_amount || ''}
                onChange={(e) => handleChange('food_amount', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
                placeholder="2.5"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Food Type</label>
              <select
                value={formData.food_type || ''}
                onChange={(e) => handleChange('food_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              >
                <option value="">Select type</option>
                {FOOD_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-1">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span>Water (ml)</span>
              </label>
              <input
                type="number"
                value={formData.water_intake || ''}
                onChange={(e) => handleChange('water_intake', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
                placeholder="500"
              />
            </div>
          </div>
        </div>

        {/* Exercise */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#3bbca8]" />
            <span>Exercise & Activity</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Duration (minutes)</label>
              <input
                type="number"
                value={formData.exercise_duration || ''}
                onChange={(e) => handleChange('exercise_duration', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
                placeholder="30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Exercise Type</label>
              <select
                value={formData.exercise_type || ''}
                onChange={(e) => handleChange('exercise_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              >
                <option value="">Select type</option>
                {EXERCISE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Bathroom Visits</label>
              <input
                type="number"
                value={formData.bathroom_frequency || ''}
                onChange={(e) => handleChange('bathroom_frequency', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
                placeholder="3"
              />
            </div>
          </div>
        </div>

        {/* Symptoms */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <span>Symptoms</span>
          </h3>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_SYMPTOMS.map(symptom => (
              <button
                key={symptom}
                type="button"
                onClick={() => addSymptom(symptom)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  formData.symptoms?.includes(symptom)
                    ? 'bg-yellow-100 border-yellow-500 text-yellow-800'
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:border-yellow-400'
                }`}
              >
                {symptom}
              </button>
            ))}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              placeholder="Add custom symptom"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom(newSymptom))}
            />
            <button
              type="button"
              onClick={() => addSymptom(newSymptom)}
              className="px-4 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {formData.symptoms && formData.symptoms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.symptoms.map(symptom => (
                <span
                  key={symptom}
                  className="inline-flex items-center px-3 py-1 text-sm bg-red-100 border border-red-500 text-red-800 rounded-full"
                >
                  {symptom}
                  <button
                    type="button"
                    onClick={() => removeSymptom(symptom)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3bbca8] focus:border-transparent"
            placeholder="Any additional observations or notes about your dog's health today..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-[#3bbca8] text-white rounded-md hover:bg-[#2daa96] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Health Log
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}