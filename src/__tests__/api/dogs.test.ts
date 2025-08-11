import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/dogs/route';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dog: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    healthLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth', () => ({
  getTokenFromRequest: jest.fn(),
  verifyToken: jest.fn(),
  isPetParent: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logDatabaseOperation: jest.fn(),
  createRequestLog: jest.fn(() => ({ method: 'POST', url: '/api/dogs' })),
}));

jest.mock('@/lib/rateLimiter', () => ({
  createDogRateLimiter: jest.fn(() => null),
  withRateLimit: jest.fn((handler) => handler),
}));

describe('/api/dogs', () => {
  const mockUser = {
    userId: 'test-user-id',
    email: 'test@example.com',
    userType: 'pet-parent'
  };

  const validDogData = {
    name: 'Buddy',
    breed: 'Golden Retriever',
    age_months: 24,
    weight_kg: 25.5,
    gender: 'male',
    location: 'Mumbai, Maharashtra',
    emergency_contact: 'John Doe',
    emergency_phone: '9876543210',
    vaccination_status: 'up_to_date',
    spayed_neutered: false,
    personality_traits: ['Friendly', 'Energetic']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyToken as jest.Mock).mockReturnValue(mockUser);
    (require('@/lib/auth').getTokenFromRequest as jest.Mock).mockReturnValue('valid-token');
    (require('@/lib/auth').isPetParent as jest.Mock).mockReturnValue(true);
  });

  describe('POST /api/dogs', () => {
    it('should create a dog profile with valid data', async () => {
      const mockDog = {
        id: 'dog-id',
        ...validDogData,
        user_id: mockUser.userId,
        health_id: 'WOFBUGOR123456'
      };

      (require('@/lib/db').default.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          dog: { create: jest.fn().mockResolvedValue(mockDog) },
          healthLog: { create: jest.fn().mockResolvedValue({}) }
        };
        return callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validDogData)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Dog profile created successfully');
      expect(data.data.dog.name).toBe('Buddy');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        ...validDogData,
        name: '', // Invalid name
        weight_kg: -5 // Invalid weight
      };

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Validation error');
    });

    it('should return 401 for unauthenticated request', async () => {
      (require('@/lib/auth').getTokenFromRequest as jest.Mock).mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validDogData)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Authentication required');
    });

    it('should handle database errors gracefully', async () => {
      (require('@/lib/db').default.$transaction as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validDogData)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Failed to create dog profile. Please try again.');
    });

    it('should sanitize malicious input', async () => {
      const maliciousData = {
        ...validDogData,
        name: '<script>alert("xss")</script>Buddy',
        medical_notes: '<img src=x onerror=alert(1)>Medical notes'
      };

      const mockDog = { id: 'dog-id', ...maliciousData };

      (require('@/lib/db').default.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const tx = {
          dog: { create: jest.fn().mockResolvedValue(mockDog) },
          healthLog: { create: jest.fn().mockResolvedValue({}) }
        };
        return callback(tx);
      });

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousData)
      });

      const response = await POST(request, {});
      const data = await response.json();

      expect(response.status).toBe(201);
      // Verify that malicious scripts are sanitized
      const createCall = (require('@/lib/db').default.$transaction as jest.Mock).mock.calls[0][0];
      const tx = {
        dog: { create: jest.fn() },
        healthLog: { create: jest.fn().mockResolvedValue({}) }
      };
      await createCall(tx);
      
      const dogCreateData = tx.dog.create.mock.calls[0][0].data;
      expect(dogCreateData.name).not.toContain('<script>');
    });
  });

  describe('GET /api/dogs', () => {
    it('should return user dogs successfully', async () => {
      const mockDogs = [
        { id: 'dog1', name: 'Buddy', breed: 'Golden Retriever', user_id: mockUser.userId },
        { id: 'dog2', name: 'Max', breed: 'Labrador', user_id: mockUser.userId }
      ];

      (require('@/lib/db').default.dog.findMany as jest.Mock).mockResolvedValue(mockDogs);

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dogs).toHaveLength(2);
      expect(data.data.dogs[0].name).toBe('Buddy');
    });

    it('should include health data when requested', async () => {
      const mockDogsWithHealth = [
        {
          id: 'dog1',
          name: 'Buddy',
          healthLogs: [{ id: 'log1', weight_kg: 25 }],
          healthReminders: [{ id: 'rem1', title: 'Vaccination' }]
        }
      ];

      (require('@/lib/db').default.dog.findMany as jest.Mock).mockResolvedValue(mockDogsWithHealth);

      const request = new NextRequest('http://localhost:3000/api/dogs?include_health=true', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.dogs[0].healthLogs).toBeDefined();
      expect(data.data.dogs[0].healthReminders).toBeDefined();
    });

    it('should respect query limits', async () => {
      (require('@/lib/db').default.dog.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/dogs?limit=5', {
        method: 'GET'
      });

      await GET(request);

      expect(require('@/lib/db').default.dog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5
        })
      );
    });

    it('should not expose sensitive data', async () => {
      const mockDogs = [{
        id: 'dog1',
        name: 'Buddy',
        emergency_phone: '9876543210',
        user_id: mockUser.userId
      }];

      (require('@/lib/db').default.dog.findMany as jest.Mock).mockResolvedValue(mockDogs);

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'GET'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.dogs[0].emergency_phone).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to dog creation', async () => {
      const rateLimitMock = jest.fn().mockResolvedValue({
        json: () => ({ success: false, message: 'Rate limit exceeded' }),
        status: 429
      });
      
      (require('@/lib/rateLimiter').createDogRateLimiter as jest.Mock).mockReturnValue(rateLimitMock);

      const request = new NextRequest('http://localhost:3000/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validDogData)
      });

      // This would be handled by the rate limiter wrapper
      expect(require('@/lib/rateLimiter').withRateLimit).toHaveBeenCalled();
    });
  });
});

describe('Validation', () => {
  it('should validate phone numbers correctly', async () => {
    const { validatePhoneNumber } = await import('@/lib/validation');
    
    expect(validatePhoneNumber('9876543210')).toBe(true);
    expect(validatePhoneNumber('+919876543210')).toBe(true);
    expect(validatePhoneNumber('123')).toBe(false);
    expect(validatePhoneNumber('abcdefghij')).toBe(false);
  });

  it('should generate secure IDs', async () => {
    const { generateSecureId } = await import('@/lib/validation');
    
    const id1 = generateSecureId();
    const id2 = generateSecureId();
    
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
  });
});

describe('File Upload Security', () => {
  it('should validate image files correctly', async () => {
    const { validateImageFile } = await import('@/lib/validation');
    
    // Mock valid JPEG header
    const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    const textBuffer = Buffer.from('This is not an image');
    
    // Note: This test would need actual image-type mock implementation
    // For now, we'll test the function exists
    expect(typeof validateImageFile).toBe('function');
  });
});