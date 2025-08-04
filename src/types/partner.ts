export interface Partner {
  id: string;
  email: string;
  name: string;
  partner_type: 'veterinarian' | 'trainer' | 'corporate';
  business_name?: string;
  license_number?: string;
  specialization?: string;
  experience_years?: number;
  location: string;
  address?: string;
  phone: string;
  website?: string;
  bio?: string;
  services_offered?: string;
  consultation_fee?: string;
  availability_hours?: string;
  languages_spoken?: string;
  certifications?: string;
  verified: boolean;
  verification_date?: Date;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  admin_notes?: string;
  health_id_access: boolean;
  profile_image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PartnerFormData {
  email: string;
  name: string;
  partner_type: 'veterinarian' | 'trainer' | 'corporate';
  business_name?: string;
  license_number?: string;
  specialization?: string;
  experience_years?: string;
  location: string;
  address?: string;
  phone: string;
  website?: string;
  bio?: string;
  services_offered?: string;
  consultation_fee?: string;
  availability_hours?: string;
  languages_spoken?: string;
  certifications?: string;
}

export interface HealthIdVerification {
  id: string;
  partner_id: string;
  health_id: string;
  dog_id?: string;
  verification_date: Date;
  purpose?: string;
  notes?: string;
  verified_by: string;
}

export interface HealthIdVerificationResponse {
  success: boolean;
  health_id: string;
  dog: {
    id: string;
    name: string;
    breed: string;
    age_months: number;
    weight_kg: number;
    gender: string;
    medical_history?: string;
    vaccination_status: string;
    spayed_neutered: boolean;
    microchip_id?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    medical_notes?: string;
    personality_traits?: string;
    created_at: Date;
    owner: {
      name: string;
      location?: string;
    };
  };
  partner: {
    name: string;
    type: string;
    business_name?: string;
    verified: boolean;
  };
  verification_timestamp: string;
}

export interface PartnerStats {
  total: number;
  pending: number;
  approved: number;
  veterinarians: number;
  trainers: number;
  corporate: number;
}

export interface PartnerSearchFilters {
  type?: 'veterinarian' | 'trainer' | 'corporate';
  location?: string;
  verified?: boolean;
  search?: string;
}

export const PARTNER_TYPES = {
  veterinarian: 'Veterinarian',
  trainer: 'Dog Trainer',
  corporate: 'Corporate Partner'
} as const;

export const PARTNER_STATUSES = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended'
} as const;

export const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 
  'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore',
  'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot',
  'Kalyan-Dombivli', 'Vasai-Virar', 'Varanasi', 'Srinagar', 'Aurangabad',
  'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Ranchi', 'Howrah',
  'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai',
  'Raipur', 'Kota', 'Other'
];

export const SPECIALIZATIONS = {
  veterinarian: [
    'General Practice',
    'Surgery',
    'Internal Medicine',
    'Dermatology',
    'Orthopedics',
    'Cardiology',
    'Oncology',
    'Emergency Medicine',
    'Behavior',
    'Nutrition',
    'Other'
  ],
  trainer: [
    'Basic Obedience',
    'Advanced Training',
    'Puppy Training',
    'Behavioral Issues',
    'Agility Training',
    'Protection Training',
    'Therapy Dog Training',
    'Service Dog Training',
    'Competition Training',
    'Other'
  ],
  corporate: [
    'Pet Food & Nutrition',
    'Pet Accessories',
    'Pet Healthcare',
    'Pet Insurance',
    'Pet Technology',
    'Pet Services',
    'Pet Grooming',
    'Pet Boarding',
    'Other'
  ]
};