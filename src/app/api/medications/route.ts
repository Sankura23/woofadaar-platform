import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

// POST /api/medications - Add new medication
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);
    const body = await request.json();

    const {
      dog_id,
      name,
      dosage,
      frequency,
      start_date,
      end_date,
      prescribed_by,
      instructions,
      reminder_times,
      medication_type,
      side_effects
    } = body;

    if (!dog_id || !name || !frequency || !start_date) {
      return NextResponse.json(
        { error: 'Dog ID, medication name, frequency, and start date are required' },
        { status: 400 }
      );
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dog_id,
        user_id: userId
      }
    });

    if (!dog) {
      return NextResponse.json(
        { error: 'Dog not found or access denied' },
        { status: 404 }
      );
    }

    // Create medication
    const medication = await prisma.medication.create({
      data: {
        dog_id,
        name,
        dosage,
        frequency,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        prescribed_by,
        instructions,
        reminder_times: reminder_times || [],
        medication_type: medication_type || 'oral',
        side_effects,
        is_active: true
      },
      include: {
        prescribed_partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Medication added successfully',
      data: { medication }
    });

  } catch (error) {
    console.error('Error adding medication:', error);
    return NextResponse.json(
      { error: 'Failed to add medication' },
      { status: 500 }
    );
  }
}

// PUT /api/medications - Update medication
export async function PUT(request: NextRequest) {
  try {
    const userId = await verifyToken(request);
    const body = await request.json();

    const {
      id,
      name,
      dosage,
      frequency,
      start_date,
      end_date,
      prescribed_by,
      instructions,
      reminder_times,
      medication_type,
      side_effects,
      is_active
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Medication ID is required' },
        { status: 400 }
      );
    }

    // Verify medication ownership through dog
    const medication = await prisma.medication.findFirst({
      where: {
        id,
        dog: {
          user_id: userId
        }
      }
    });

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found or access denied' },
        { status: 404 }
      );
    }

    // Update medication
    const updatedMedication = await prisma.medication.update({
      where: { id },
      data: {
        name: name || medication.name,
        dosage: dosage || medication.dosage,
        frequency: frequency || medication.frequency,
        start_date: start_date ? new Date(start_date) : medication.start_date,
        end_date: end_date ? new Date(end_date) : medication.end_date,
        prescribed_by: prescribed_by || medication.prescribed_by,
        instructions: instructions || medication.instructions,
        reminder_times: reminder_times || medication.reminder_times,
        medication_type: medication_type || medication.medication_type,
        side_effects: side_effects || medication.side_effects,
        is_active: is_active !== undefined ? is_active : medication.is_active,
        updated_at: new Date()
      },
      include: {
        prescribed_partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Medication updated successfully',
      data: { medication: updatedMedication }
    });

  } catch (error) {
    console.error('Error updating medication:', error);
    return NextResponse.json(
      { error: 'Failed to update medication' },
      { status: 500 }
    );
  }
}

// DELETE /api/medications - Remove medication
export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyToken(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Medication ID is required' },
        { status: 400 }
      );
    }

    // Verify medication ownership through dog
    const medication = await prisma.medication.findFirst({
      where: {
        id,
        dog: {
          user_id: userId
        }
      }
    });

    if (!medication) {
      return NextResponse.json(
        { error: 'Medication not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete by marking as inactive
    await prisma.medication.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Medication removed successfully'
    });

  } catch (error) {
    console.error('Error removing medication:', error);
    return NextResponse.json(
      { error: 'Failed to remove medication' },
      { status: 500 }
    );
  }
}