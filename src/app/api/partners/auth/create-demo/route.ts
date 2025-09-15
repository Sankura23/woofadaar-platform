import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create demo partner accounts for testing
export async function POST(request: NextRequest) {
  try {
    const { createAll = false } = await request.json().catch(() => ({}));

    // Demo partner data
    const demoPartners = [
      {
        email: 'demo@vet.com',
        password: 'demo123',
        name: 'Dr. Demo Veterinarian',
        partner_type: 'vet',
        business_name: 'Demo Vet Clinic',
        location: 'Mumbai, Maharashtra',
        phone: '+91-98765-43210',
        verified: true,
        status: 'approved',
        dog_id_access_level: 'medical',
        emergency_access_enabled: true,
        compliance_status: 'compliant',
        mfa_enabled: false, // Disable MFA for demo
      },
      {
        email: 'emergency@vet.com',
        password: 'emergency123',
        name: 'Dr. Emergency Vet',
        partner_type: 'vet',
        business_name: 'Emergency Animal Hospital',
        location: 'Delhi, India',
        phone: '+91-98765-43211',
        verified: true,
        status: 'approved',
        dog_id_access_level: 'full',
        emergency_access_enabled: true,
        compliance_status: 'compliant',
        mfa_enabled: false,
      },
      {
        email: 'trainer@demo.com',
        password: 'trainer123',
        name: 'Professional Dog Trainer',
        partner_type: 'trainer',
        business_name: 'Elite Dog Training',
        location: 'Bangalore, Karnataka',
        phone: '+91-98765-43212',
        verified: true,
        status: 'approved',
        dog_id_access_level: 'basic',
        emergency_access_enabled: false,
        compliance_status: 'compliant',
        mfa_enabled: false,
      }
    ];

    const createdPartners = [];

    for (const partnerData of demoPartners) {
      // Check if partner already exists
      const existingPartner = await prisma.partner.findUnique({
        where: { email: partnerData.email }
      });

      if (existingPartner) {
        console.log(`Partner ${partnerData.email} already exists`);
        createdPartners.push(existingPartner);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(partnerData.password, 12);

      // Create partner
      const partner = await prisma.partner.create({
        data: {
          ...partnerData,
          password: hashedPassword,
        }
      });

      createdPartners.push({
        ...partner,
        password: partnerData.password, // Return original password for demo
      });

      console.log(`Created partner: ${partnerData.email}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Demo partner accounts created successfully',
      partners: createdPartners.map(p => ({
        id: p.id,
        email: p.email,
        name: p.name,
        partner_type: p.partner_type,
        business_name: p.business_name,
        password: demoPartners.find(dp => dp.email === p.email)?.password,
        status: p.status,
        verified: p.verified,
      })),
      login_instructions: {
        url: '/partner/auth',
        credentials: [
          { email: 'demo@vet.com', password: 'demo123', type: 'Veterinarian (Medical Access)' },
          { email: 'emergency@vet.com', password: 'emergency123', type: 'Emergency Vet (Full Access)' },
          { email: 'trainer@demo.com', password: 'trainer123', type: 'Dog Trainer (Basic Access)' },
        ]
      }
    });

  } catch (error) {
    console.error('Error creating demo partners:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create demo partners',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}