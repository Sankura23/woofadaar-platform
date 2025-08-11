import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const payload = token ? verifyToken(token) : null;
  const userId = payload && isPetParent(payload) ? payload.userId : null;
  
  if (!userId) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Dog: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate profile completion
    const profileFields = [
      { field: 'name', value: user.name, weight: 10 },
      { field: 'email', value: user.email, weight: 10 },
      { field: 'location', value: user.location, weight: 15 },
      { field: 'experience_level', value: user.experience_level, weight: 10 },
      { field: 'profile_image_url', value: user.profile_image_url, weight: 15 }
    ];

    const dogFields = [
      { field: 'dog_count', value: user.Dog.length, weight: 20 },
      { field: 'dog_photos', value: user.Dog.filter(d => d.photo_url).length, weight: 10 },
      { field: 'dog_health_ids', value: user.Dog.filter(d => d.health_id).length, weight: 10 }
    ];

    let totalScore = 0;
    let maxScore = 0;
    const completedFields: string[] = [];
    const missingFields: string[] = [];

    // Calculate user profile completion
    profileFields.forEach(({ field, value, weight }) => {
      maxScore += weight;
      if (value && value.toString().trim()) {
        totalScore += weight;
        completedFields.push(field);
      } else {
        missingFields.push(field);
      }
    });

    // Calculate dog profile completion
    dogFields.forEach(({ field, value, weight }) => {
      maxScore += weight;
      if (field === 'dog_count' && value > 0) {
        totalScore += weight;
        completedFields.push(field);
      } else if (field === 'dog_photos' && value > 0) {
        totalScore += weight;
        completedFields.push(field);
      } else if (field === 'dog_health_ids' && value > 0) {
        totalScore += weight;
        completedFields.push(field);
      } else {
        missingFields.push(field);
      }
    });

    const completionPercentage = Math.round((totalScore / maxScore) * 100);

    // Determine completion level
    let completionLevel = 'beginner';
    if (completionPercentage >= 90) completionLevel = 'expert';
    else if (completionPercentage >= 70) completionLevel = 'advanced';
    else if (completionPercentage >= 50) completionLevel = 'intermediate';

    // Get next steps for improvement
    const nextSteps = [];
    if (!user.profile_image_url) nextSteps.push('Add a profile photo');
    if (!user.location) nextSteps.push('Add your location');
    if (user.Dog.length === 0) nextSteps.push('Add your first dog');
    if (user.Dog.length > 0 && !user.Dog.some(d => d.photo_url)) nextSteps.push('Add photos to your dogs');
    if (user.Dog.length > 0 && !user.Dog.some(d => d.health_id)) nextSteps.push('Generate Dog IDs for your dogs');

    return NextResponse.json({
      completion: {
        percentage: completionPercentage,
        level: completionLevel,
        score: totalScore,
        maxScore: maxScore,
        completedFields,
        missingFields,
        nextSteps
      },
      profile: {
        hasPhoto: !!user.profile_image_url,
        hasLocation: !!user.location,
        hasExperience: !!user.experience_level,
        dogCount: user.Dog.length,
        dogsWithPhotos: user.Dog.filter(d => d.photo_url).length,
        dogsWithHealthIds: user.Dog.filter(d => d.health_id).length
      }
    });

  } catch (error) {
    console.error('Profile completion calculation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 