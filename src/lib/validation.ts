import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Dog profile validation schema
export const dogProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-.0-9]+$/, 'Name can only contain letters, spaces, numbers, hyphens, apostrophes, and dots'),
  
  breed: z.string()
    .min(2, 'Breed must be at least 2 characters')
    .max(50, 'Breed must be less than 50 characters'),
  
  age_months: z.number()
    .min(0, 'Age cannot be negative')
    .max(300, 'Age must be less than 300 months'),
  
  weight_kg: z.number()
    .min(0.1, 'Weight must be at least 0.1 kg')
    .max(200, 'Weight must be less than 200 kg'),
  
  gender: z.enum(['male', 'female']),
  
  location: z.string()
    .min(3, 'Location must be at least 3 characters')
    .max(100, 'Location must be less than 100 characters'),
  
  emergency_contact: z.string()
    .min(2, 'Emergency contact name must be at least 2 characters')
    .max(100, 'Emergency contact name must be less than 100 characters'),
  
  emergency_phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be less than 15 digits')
    .regex(/^[\d\+\-\s\(\)]+$/, 'Phone number contains invalid characters')
    .transform(val => val.replace(/[\s\-\(\)]/g, ''))
    .refine(val => /^\+?\d{10,14}$/.test(val), 'Please enter a valid phone number'),
  
  photo_url: z.string().url().optional().or(z.literal('')),
  medical_notes: z.string().max(1000, 'Medical notes must be less than 1000 characters').optional(),
  health_id: z.string().optional(),
  vaccination_status: z.enum(['up_to_date', 'pending', 'not_started']).optional().default('up_to_date'),
  spayed_neutered: z.boolean().optional().default(false),
  microchip_id: z.string().max(50).optional(),
  personality_traits: z.array(z.string()).optional().default([]),
  kennel_club_registration: z.string().max(50).optional(),
  birthday: z.string().optional()
});

// Health log validation schema
export const healthLogSchema = z.object({
  dog_id: z.string().uuid('Invalid dog ID format'),
  log_date: z.string().datetime('Invalid date format'),
  weight_kg: z.number().min(0.1).max(200).optional(),
  exercise_duration: z.number().min(0).max(480).int().optional(), // Max 8 hours
  exercise_type: z.string().max(50).optional(),
  mood_score: z.number().min(1).max(5).int().optional(),
  food_amount: z.number().min(0).max(10).optional(), // Max 10 cups
  food_type: z.string().max(50).optional(),
  water_intake: z.number().min(0).max(5000).int().optional(), // Max 5L
  symptoms: z.array(z.string().max(100)).optional(),
  notes: z.string().max(1000).optional(),
  photos: z.array(z.string().url()).optional()
});

// Health reminder validation schema
export const reminderSchema = z.object({
  dog_id: z.string().uuid('Invalid dog ID format'),
  reminder_type: z.enum(['medication', 'vaccination', 'vet_visit', 'grooming', 'exercise', 'feeding', 'training']),
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  medication_name: z.string().max(100).optional(),
  dosage: z.string().max(100).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'one_time', 'custom']),
  reminder_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM format
  days_of_week: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])).optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  auto_complete: z.boolean().default(false),
  max_reminders: z.number().int().min(1).optional()
});

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

// Validate file types using magic numbers
export const validateImageFile = async (buffer: Buffer): Promise<boolean> => {
  try {
    const { default: imageType } = await import('image-type');
    const type = await imageType(buffer);
    return type !== undefined && ['jpg', 'png', 'gif', 'webp'].includes(type.ext);
  } catch (error) {
    console.error('Error validating image file:', error);
    return false;
  }
};

// Phone number validation with international support
export const validatePhoneNumber = (phone: string): boolean => {
  // Support Indian and international formats
  const patterns = [
    /^\+91[6-9]\d{9}$/, // Indian mobile with +91
    /^[6-9]\d{9}$/, // Indian mobile without +91
    /^\+?[1-9]\d{9,14}$/ // International format
  ];
  
  return patterns.some(pattern => pattern.test(phone.replace(/[\s\-\(\)]/g, '')));
};

// Generate secure unique ID
export const generateSecureId = (): string => {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
};

// Custom error classes
export class ValidationError extends Error {
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(operation: string, cause: Error) {
    super(`Database ${operation} failed: ${cause.message}`);
    this.name = 'DatabaseError';
    this.cause = cause;
  }
}

export class FileUploadError extends Error {
  constructor(message: string) {
    super(`File upload failed: ${message}`);
    this.name = 'FileUploadError';
  }
}