import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { regionalContentManager } from '@/lib/regional-content-manager';

// GET /api/regional/content - Get regional content and recommendations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const contentType = searchParams.get('type'); // festivals, health, breeds, phrases
    const language = searchParams.get('language') as 'en' | 'hi' || 'en';
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location parameter is required' },
        { status: 400 }
      );
    }

    // Get basic regional profile
    const regionalProfile = regionalContentManager.getRegionalProfile(location);

    if (!regionalProfile) {
      return NextResponse.json(
        { 
          success: true, 
          data: {
            message: 'No specific regional data available for this location',
            hasRegionalContent: false,
            location,
            generalRecommendations: [
              'Follow standard pet care guidelines',
              'Consult with local veterinarians',
              'Join regional pet parent communities'
            ]
          }
        }
      );
    }

    let responseData: any = {
      hasRegionalContent: true,
      location,
      state: regionalProfile.state,
      region: regionalProfile.region,
      primaryLanguages: regionalProfile.primaryLanguages,
      climateType: regionalProfile.climateType
    };

    // Festivals
    if (!contentType || contentType === 'festivals') {
      const upcomingFestivals = regionalContentManager.getUpcomingFestivals(location, daysAhead);
      responseData.festivals = {
        upcoming: upcomingFestivals,
        totalUpcoming: upcomingFestivals.length,
        nextImportant: upcomingFestivals.find(f => f.petRelevance === 'high')
      };
    }

    // Health recommendations
    if (!contentType || contentType === 'health') {
      const healthRecs = regionalContentManager.getRegionalHealthRecommendations(location);
      responseData.health = {
        commonDiseases: healthRecs.commonDiseases,
        seasonalTips: healthRecs.seasonalTips,
        vaccinationSchedule: healthRecs.vaccinationReminders,
        seasonalRelevant: healthRecs.seasonalTips.length > 0
      };
    }

    // Breed insights
    if (!contentType || contentType === 'breeds') {
      const breedInsights = regionalContentManager.getRegionalBreedInsights(location);
      responseData.breeds = {
        popular: breedInsights.popularBreeds,
        climateConsiderations: breedInsights.climateConsiderations,
        breedTips: breedInsights.breedSpecificTips
      };
    }

    // Cultural phrases
    if (!contentType || contentType === 'phrases') {
      const vetPhrases = regionalContentManager.getCulturalPhrases(location, 'vet');
      const generalPhrases = regionalContentManager.getCulturalPhrases(location, 'general');
      responseData.phrases = {
        veterinary: vetPhrases,
        general: generalPhrases,
        culturalContext: regionalProfile.culturalContext
      };
    }

    // Comprehensive recommendations (if user is authenticated)
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const user = await verifyToken(token);
        if (user) {
          const personalizedRecs = await regionalContentManager.getLocalizedContentRecommendations(
            user.id,
            location,
            language
          );
          responseData.personalized = personalizedRecs;
        }
      } catch (authError) {
        // Continue without personalized content
        console.log('Auth failed for personalized content');
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching regional content:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch regional content' },
      { status: 500 }
    );
  }
}

// POST /api/regional/content - Submit regional content or feedback
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, location, content } = body;

    if (action === 'contribute_regional_info') {
      // Allow users to contribute regional pet care knowledge
      const { category, title, description, language, isTraditionalPractice } = content;

      if (!category || !title || !description || !location) {
        return NextResponse.json(
          { success: false, error: 'Category, title, description, and location are required' },
          { status: 400 }
        );
      }

      // Store community contribution (mock implementation)
      const contributionId = `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In real implementation, this would save to database with moderation queue
      console.log('Regional content contribution:', {
        contributionId,
        userId: user.id,
        location,
        category,
        title,
        description,
        language: language || 'en',
        isTraditionalPractice: isTraditionalPractice || false,
        needsModeration: true
      });

      return NextResponse.json({
        success: true,
        data: {
          contributionId,
          message: 'Thank you for contributing regional knowledge! Your submission will be reviewed before publication.',
          messageHindi: 'क्षेत्रीय ज्ञान का योगदान देने के लिए धन्यवाद! आपका सबमिशन प्रकाशन से पहले समीक्षा किया जाएगा।'
        }
      });

    } else if (action === 'report_inaccurate_info') {
      // Allow users to report inaccurate regional information
      const { contentId, issue, description } = content;

      if (!contentId || !issue) {
        return NextResponse.json(
          { success: false, error: 'Content ID and issue description are required' },
          { status: 400 }
        );
      }

      // Store accuracy report (mock implementation)
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Regional content accuracy report:', {
        reportId,
        userId: user.id,
        contentId,
        issue,
        description,
        location
      });

      return NextResponse.json({
        success: true,
        data: {
          reportId,
          message: 'Thank you for the report. We will review the content accuracy.',
          messageHindi: 'रिपोर्ट के लिए धन्यवाद। हम सामग्री की सटीकता की समीक्षा करेंगे।'
        }
      });

    } else if (action === 'request_regional_expansion') {
      // Allow users to request content for their region
      const { requestedLocation, specificNeeds, priority } = content;

      if (!requestedLocation) {
        return NextResponse.json(
          { success: false, error: 'Requested location is required' },
          { status: 400 }
        );
      }

      // Store expansion request (mock implementation)
      const requestId = `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Regional expansion request:', {
        requestId,
        userId: user.id,
        requestedLocation,
        specificNeeds: specificNeeds || [],
        priority: priority || 'medium'
      });

      return NextResponse.json({
        success: true,
        data: {
          requestId,
          message: 'Your request for regional content expansion has been noted.',
          messageHindi: 'क्षेत्रीय सामग्री विस्तार के लिए आपका अनुरोध नोट किया गया है।',
          estimatedTimeline: '2-4 weeks for popular regions'
        }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error handling regional content POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process regional content request' },
      { status: 500 }
    );
  }
}

// PUT /api/regional/content - Update regional content preferences
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { location, preferences } = body;

    if (!location || !preferences) {
      return NextResponse.json(
        { success: false, error: 'Location and preferences are required' },
        { status: 400 }
      );
    }

    // Update user's regional content preferences
    // This would integrate with the user profile system
    const updatedPreferences = {
      userId: user.id,
      location,
      showFestivalAlerts: preferences.showFestivalAlerts !== false,
      showSeasonalTips: preferences.showSeasonalTips !== false,
      showRegionalBreeds: preferences.showRegionalBreeds !== false,
      showTraditionalPractices: preferences.showTraditionalPractices !== false,
      preferredLanguageForRegionalContent: preferences.preferredLanguageForRegionalContent || 'en',
      festivalAlertDays: preferences.festivalAlertDays || 7
    };

    // In real implementation, save to database
    console.log('Updated regional preferences:', updatedPreferences);

    return NextResponse.json({
      success: true,
      data: {
        preferences: updatedPreferences,
        message: 'Regional content preferences updated successfully',
        messageHindi: 'क्षेत्रीय सामग्री प्राथमिकताएं सफलतापूर्वक अपडेट हो गईं'
      }
    });

  } catch (error) {
    console.error('Error updating regional content preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}