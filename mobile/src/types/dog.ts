export interface DogFormData {
  name: string;
  breed: string;
  age_months: number;
  weight_kg: number;
  gender: 'male' | 'female';
  health_id: string;
  kennel_club_registration: string;
  vaccination_status: 'up_to_date' | 'pending' | 'not_started';
  spayed_neutered: boolean;
  microchip_id: string;
  emergency_contact: string;
  emergency_phone: string;
  medical_notes: string;
  personality_traits: string[];
  location: string;
  photo_url: string;
}

export const INDIAN_DOG_BREEDS = [
  'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 
  'Indian Pariah Dog', 'Indie/Mixed Breed', 'Pomeranian',
  'Beagle', 'Rottweiler', 'Siberian Husky', 'Cocker Spaniel',
  'Rajapalayam', 'Chippiparai', 'Kombai', 'Mudhol Hound',
  'Indian Spitz', 'Caravan Hound', 'Rampur Greyhound',
  'Bakharwal Dog', 'Gaddi Kutta', 'Bully Kutta',
  'Pug', 'Shih Tzu', 'Dachshund', 'Boxer', 'Doberman',
  'Great Dane', 'Saint Bernard', 'Bernese Mountain Dog',
  'Border Collie', 'Australian Shepherd', 'Shiba Inu',
  'Akita', 'Chow Chow', 'Shar Pei', 'Poodle', 'Bichon Frise',
  'Maltese', 'Yorkshire Terrier', 'Jack Russell Terrier',
  'Bull Terrier', 'Staffordshire Bull Terrier', 'Pit Bull',
  'American Bulldog', 'English Bulldog', 'French Bulldog',
  'Boston Terrier', 'Cavalier King Charles Spaniel',
  'Brittany Spaniel', 'English Springer Spaniel',
  'Welsh Corgi', 'Australian Cattle Dog', 'Blue Heeler',
  'Kelpie', 'Border Terrier', 'West Highland White Terrier',
  'Scottish Terrier', 'Cairn Terrier', 'Norwich Terrier',
  'Norfolk Terrier', 'Airedale Terrier', 'Irish Terrier',
  'Welsh Terrier', 'Lakeland Terrier', 'Bedlington Terrier',
  'Dandie Dinmont Terrier', 'Skye Terrier', 'Other'
];

export const PERSONALITY_TRAITS = [
  'Friendly', 'Playful', 'Energetic', 'Calm', 'Protective',
  'Intelligent', 'Independent', 'Social', 'Shy', 'Aggressive',
  'Gentle', 'Loyal', 'Curious', 'Stubborn', 'Affectionate'
];

export const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
  'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar',
  'Varanasi', 'Srinagar', 'Dhanbad', 'Jodhpur', 'Amritsar',
  'Raipur', 'Allahabad', 'Coimbatore', 'Jabalpur', 'Gwalior',
  'Vijayawada', 'Madurai', 'Gujranwala', 'Kota', 'Chandigarh',
  'Other'
];