import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest, isPetParent } from '@/lib/auth'
import prisma from '@/lib/db'
import QRCode from 'qrcode'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const dogId = id;

    // Get dog details
    const dog = await prisma.dog.findFirst({
      where: { 
        id: dogId,
        user_id: userId
      },
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!dog) {
      return NextResponse.json(
        { message: 'Dog not found' },
        { status: 404 }
      );
    }

    if (!dog.health_id) {
      return NextResponse.json(
        { message: 'Dog ID not generated yet' },
        { status: 400 }
      );
    }

    // Create QR code data
    const qrData = {
      dogId: dog.health_id,
      dogName: dog.name,
      breed: dog.breed,
      ownerName: dog.User.name,
      ownerEmail: dog.User.email,
      timestamp: new Date().toISOString(),
      verificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/partners/verify-dog-id/${dog.health_id}`
    };

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      dogData: {
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        health_id: dog.health_id,
        photo_url: dog.photo_url,
        age_months: dog.age_months,
        weight_kg: dog.weight_kg,
        gender: dog.gender,
        vaccination_status: dog.vaccination_status,
        spayed_neutered: dog.spayed_neutered,
        microchip_id: dog.microchip_id,
        emergency_contact: dog.emergency_contact,
        emergency_phone: dog.emergency_phone,
        medical_notes: dog.medical_notes,
        personality_traits: dog.personality_traits,
        location: dog.location,
        owner: {
          name: dog.User.name,
          email: dog.User.email
        }
      },
      verificationUrl: qrData.verificationUrl
    });

  } catch (error) {
    console.error('QR code generation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 