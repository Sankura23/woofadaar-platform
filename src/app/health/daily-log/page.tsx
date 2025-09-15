'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Heart, Camera, Mic, Save, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Dog {
  id: string;
  name: string;
  breed: string;
  photo_url?: string;
}

const MOOD_OPTIONS = [
  { value: 5, label: 'Excellent', emoji: '😊', color: 'bg-green-500' },
  { value: 4, label: 'Good', emoji: '🙂', color: 'bg-green-400' },
  { value: 3, label: 'Okay', emoji: '😐', color: 'bg-yellow-500' },
  { value: 2, label: 'Poor', emoji: '🙁', color: 'bg-orange-500' },
  { value: 1, label: 'Bad', emoji: '😢', color: 'bg-red-500' }
];

const EXERCISE_TYPES = [
  'Walk', 'Run', 'Play', 'Swimming', 'Training', 'Fetch', 'Agility', 'Hiking'
];

const FOOD_TYPES = [
  'Dry Kibble', 'Wet Food', 'Raw Diet', 'Homemade', 'Treats', 'Mixed'
];

const COMMON_SYMPTOMS = [
  'Lethargy', 'Loss of Appetite', 'Vomiting', 'Diarrhea', 'Coughing', 
  'Limping', 'Excessive Drinking', 'Excessive Urination', 'Scratching', 
  'Panting', 'Restlessness', 'Fever'
];

export default function DailyLogPage() {
  const router = useRouter();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [foodAmount, setFoodAmount] = useState('');
  const [foodType, setFoodType] = useState('');
  const [waterIntake, setWaterIntake] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchUserDogs();
  }, []);

  const fetchUserDogs = async () => {
    try {
      const response = await fetch('/api/dogs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDogs(data.data?.dogs || []);
        if (data.data?.dogs?.length > 0) {
          setSelectedDog(data.data.dogs[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSymptom = (symptom: string) => {
    if (!symptoms.includes(symptom)) {
      setSymptoms([...symptoms, symptom]);
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  const handleAddCustomSymptom = () => {
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
      setCustomSymptom('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDog) return;

    setSaving(true);
    try {
      const logData = {
        dog_id: selectedDog.id,
        log_date: logDate,
        weight_kg: weight ? parseFloat(weight) : null,
        exercise_duration: exerciseDuration ? parseInt(exerciseDuration) : null,
        exercise_type: exerciseType || null,
        mood_score: moodScore,
        food_amount: foodAmount ? parseFloat(foodAmount) : null,
        food_type: foodType || null,
        water_intake: waterIntake ? parseInt(waterIntake) : null,
        symptoms: symptoms.length > 0 ? symptoms : null,
        notes: notes || null,
        photos: photos.length > 0 ? photos : null
      };

      const response = await fetch('/api/health/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('woofadaar_token')}`
        },
        body: JSON.stringify(logData)
      });

      if (response.ok) {
        router.push('/health');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save health log');
      }
    } catch (error) {
      console.error('Error saving health log:', error);
      alert('Failed to save health log');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Dogs Found</h3>
              <p className="text-gray-500 mb-6">
                Add your first dog to start tracking their health.
              </p>
              <Button
                onClick={() => router.push('/profile')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Add Your Dog
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fef8e8] via-gray-50 to-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Health Log</h1>
            <p className="text-gray-600">Record your dog's daily health observations</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dog Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Dog</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dogs.map((dog) => (
                  <button
                    key={dog.id}
                    type="button"
                    onClick={() => setSelectedDog(dog)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedDog?.id === dog.id
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {dog.photo_url && (
                      <img
                        src={dog.photo_url}
                        alt={dog.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="text-left">
                      <p className="font-medium">{dog.name}</p>
                      <p className="text-sm opacity-80">{dog.breed}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Log Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </CardContent>
          </Card>

          {/* Physical Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Physical Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 25.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exercise-duration">Exercise Duration (minutes)</Label>
                  <Input
                    id="exercise-duration"
                    type="number"
                    placeholder="e.g., 30"
                    value={exerciseDuration}
                    onChange={(e) => setExerciseDuration(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="exercise-type">Exercise Type</Label>
                  <select
                    id="exercise-type"
                    value={exerciseType}
                    onChange={(e) => setExerciseType(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select type</option>
                    {EXERCISE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mood & Energy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setMoodScore(mood.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      moodScore === mood.value
                        ? `${mood.color} text-white border-transparent`
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{mood.emoji}</div>
                    <div className="text-xs font-medium">{mood.label}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Food & Water */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Food & Water</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="food-amount">Food Amount (cups)</Label>
                  <Input
                    id="food-amount"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 2.5"
                    value={foodAmount}
                    onChange={(e) => setFoodAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="food-type">Food Type</Label>
                  <select
                    id="food-type"
                    value={foodType}
                    onChange={(e) => setFoodType(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select type</option>
                    {FOOD_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="water-intake">Water Intake (ml)</Label>
                <Input
                  id="water-intake"
                  type="number"
                  placeholder="e.g., 500"
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Symptoms (if any)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMON_SYMPTOMS.map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() =>
                      symptoms.includes(symptom)
                        ? handleRemoveSymptom(symptom)
                        : handleAddSymptom(symptom)
                    }
                    className={`p-2 text-sm rounded-md border transition-colors ${
                      symptoms.includes(symptom)
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom symptom"
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSymptom())}
                />
                <Button
                  type="button"
                  onClick={handleAddCustomSymptom}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {symptoms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((symptom) => (
                    <Badge
                      key={symptom}
                      variant="destructive"
                      className="cursor-pointer"
                      onClick={() => handleRemoveSymptom(symptom)}
                    >
                      {symptom}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any additional observations or notes about your dog's health today..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedDog || saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Log
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}