import { NextRequest, NextResponse } from 'next/server';
import { INDIAN_CONTEXT } from '@/lib/points-system';

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDate = today.getDate();

    // Check if today falls within any festival period
    const activeFestivals = INDIAN_CONTEXT.festivals.filter(festival => {
      // Simplified festival date checking - would be enhanced with proper calendar
      const festivalData = getFestivalDates(festival.name, new Date().getFullYear());
      if (!festivalData) return false;

      const festivalStart = new Date(festivalData.startDate);
      const festivalEnd = new Date(festivalData.endDate);
      
      return today >= festivalStart && today <= festivalEnd;
    });

    const currentFestival = activeFestivals.length > 0 ? activeFestivals[0] : null;

    return NextResponse.json({
      success: true,
      data: {
        currentFestival: currentFestival ? {
          name: currentFestival.name,
          multiplier: currentFestival.multiplier,
          duration: currentFestival.duration,
          isActive: true
        } : null,
        upcomingFestivals: getUpcomingFestivals(),
        allFestivals: INDIAN_CONTEXT.festivals
      }
    });

  } catch (error) {
    console.error('Error fetching festival data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch festival data' },
      { status: 500 }
    );
  }
}

// Helper function to get festival dates (simplified - would use proper calendar)
function getFestivalDates(festivalName: string, year: number): { startDate: string; endDate: string } | null {
  const festivalDates: { [key: string]: { month: number; startDate: number; duration: number } } = {
    'Diwali': { month: 10, startDate: 12, duration: 5 }, // October/November
    'Holi': { month: 3, startDate: 13, duration: 2 }, // March
    'Dussehra': { month: 10, startDate: 2, duration: 3 }, // October
    'Ganesh Chaturthi': { month: 8, startDate: 22, duration: 11 }, // August/September
    'Navratri': { month: 9, startDate: 15, duration: 9 }, // September/October
    'Karva Chauth': { month: 10, startDate: 20, duration: 1 }, // October/November
    'Raksha Bandhan': { month: 8, startDate: 15, duration: 1 } // August
  };

  const festival = festivalDates[festivalName];
  if (!festival) return null;

  const startDate = new Date(year, festival.month - 1, festival.startDate);
  const endDate = new Date(startDate.getTime() + (festival.duration - 1) * 24 * 60 * 60 * 1000);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Get upcoming festivals in the next 30 days
function getUpcomingFestivals(): any[] {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const currentYear = today.getFullYear();

  return INDIAN_CONTEXT.festivals
    .map(festival => {
      const dates = getFestivalDates(festival.name, currentYear);
      if (!dates) return null;

      const startDate = new Date(dates.startDate);
      if (startDate > today && startDate <= thirtyDaysFromNow) {
        return {
          ...festival,
          startDate: dates.startDate,
          endDate: dates.endDate,
          daysUntil: Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}