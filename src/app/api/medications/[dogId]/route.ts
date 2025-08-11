import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// GET /api/medications/[dogId] - Get active medications for a dog
export async function GET(
  request: NextRequest,
  { params }: { params: { dogId: string } }
) {
  try {
    const userId = await verifyToken(request);
    const { dogId } = params;
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json(
        { error: 'Dog not found or access denied' },
        { status: 404 }
      );
    }

    const whereClause: any = { dog_id: dogId };
    
    if (!includeInactive) {
      whereClause.is_active = true;
      whereClause.OR = [
        { end_date: null },
        { end_date: { gte: new Date() } }
      ];
    }

    const medications = await prisma.medication.findMany({
      where: whereClause,
      include: {
        prescribed_partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true
          }
        }
      },
      orderBy: [
        { is_active: 'desc' },
        { created_at: 'desc' }
      ]
    });

    // Calculate upcoming reminders
    const upcomingReminders = medications
      .filter(med => med.is_active && Array.isArray(med.reminder_times))
      .flatMap(medication => {
        return (medication.reminder_times as string[]).map(time => {
          const today = new Date();
          const [hours, minutes] = time.split(':').map(Number);
          const reminderTime = new Date(today);
          reminderTime.setHours(hours, minutes, 0, 0);
          
          // If time has passed today, show next occurrence
          if (reminderTime < new Date()) {
            reminderTime.setDate(reminderTime.getDate() + 1);
          }

          return {
            medicationId: medication.id,
            medicationName: medication.name,
            dosage: medication.dosage,
            time: reminderTime,
            timeString: time
          };
        });
      })
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        medications,
        upcomingReminders,
        summary: {
          activeMedications: medications.filter(m => m.is_active).length,
          totalMedications: medications.length,
          nextReminderIn: upcomingReminders.length > 0 ? 
            Math.round((upcomingReminders[0].time.getTime() - new Date().getTime()) / (1000 * 60)) : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}