export interface PetParentJWTPayload {
  userId: string;
  email: string;
  userType: 'pet-parent';
}

export interface PartnerJWTPayload {
  partnerId: string;
  email: string;
  userType: 'partner';
}

export type JWTPayload = PetParentJWTPayload | PartnerJWTPayload;

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'pet-parent' | 'partner';
  createdAt: string;
}

export interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  imageUrl?: string;
  userId: string;
  createdAt: string;
}

export interface HealthLog {
  id: string;
  dogId: string;
  date: string;
  symptoms: string;
  mood: string;
  appetite: string;
  activityLevel: string;
  notes?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  title: string;
  content: string;
  category: string;
  userId: string;
  user: User;
  answers: Answer[];
  createdAt: string;
}

export interface Answer {
  id: string;
  content: string;
  questionId: string;
  userId: string;
  user: User;
  createdAt: string;
}