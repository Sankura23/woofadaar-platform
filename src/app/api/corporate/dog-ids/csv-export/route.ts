import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

const verifyCorporateAdmin = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId || decoded.userType !== 'corporate-admin') {
      return { error: 'Invalid corporate admin token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

// Helper function to convert array to CSV
const arrayToCSV = (data: any[], headers: string[]) => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
};

// GET /api/corporate/dog-ids/csv-export - Export Dog IDs as CSV
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyCorporateAdmin(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const companyId = searchParams.get('company_id') || decoded.companyId;
    const include_inactive = searchParams.get('include_inactive') === 'true';
    const format = searchParams.get('format') || 'detailed'; // detailed, basic, analytics

    // Check access
    if (decoded.role !== 'admin' && decoded.companyId !== companyId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied to this company'
      }, { status: 403 });
    }

    const where: any = {
      company_id: companyId,
      is_corporate_pet: true
    };

    if (!include_inactive) {
      where.corporate_benefits_active = true;
    }

    const [dogs, company] = await Promise.all([
      prisma.dog.findMany({
        where,
        include: {
          User: {
            select: {
              name: true,
              email: true
            }
          },
          company: {
            select: {
              name: true,
              subscription_tier: true
            }
          },
          HealthLogs: {
            orderBy: { created_at: 'desc' },
            take: 1,
            select: {
              weight_kg: true,
              mood_score: true,
              log_date: true
            }
          },
          PetBenefitClaims: {
            select: {
              claim_amount: true,
              approved_amount: true,
              approval_status: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, subscription_tier: true }
      })
    ]);

    if (!company) {
      return NextResponse.json({
        success: false,
        message: 'Company not found'
      }, { status: 404 });
    }

    let csvData = '';
    let filename = '';

    if (format === 'basic') {
      const headers = [
        'health_id', 'name', 'breed', 'age_months', 'owner_name', 
        'owner_email', 'benefits_active', 'created_date'
      ];
      
      const csvRows = dogs.map(dog => ({
        health_id: dog.health_id,
        name: dog.name,
        breed: dog.breed,
        age_months: dog.age_months,
        owner_name: dog.User?.name || 'N/A',
        owner_email: dog.User?.email || 'N/A',
        benefits_active: dog.corporate_benefits_active ? 'Yes' : 'No',
        created_date: new Date(dog.created_at).toLocaleDateString()
      }));

      csvData = arrayToCSV(csvRows, headers);
      filename = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_dog_ids_basic_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (format === 'analytics') {
      // Analytics summary format
      const breedStats = dogs.reduce((acc: any, dog) => {
        acc[dog.breed] = (acc[dog.breed] || 0) + 1;
        return acc;
      }, {});

      const headers = ['metric', 'value'];
      const csvRows = [
        { metric: 'Company Name', value: company.name },
        { metric: 'Subscription Tier', value: company.subscription_tier },
        { metric: 'Total Corporate Pets', value: dogs.length },
        { metric: 'Active Benefits', value: dogs.filter(d => d.corporate_benefits_active).length },
        { metric: 'Average Age (months)', value: dogs.length > 0 ? Math.round(dogs.reduce((sum, d) => sum + d.age_months, 0) / dogs.length) : 0 },
        { metric: 'Total Claims', value: dogs.reduce((sum, d) => sum + d.PetBenefitClaims.length, 0) },
        { metric: 'Most Common Breed', value: Object.entries(breedStats).sort(([,a]: any, [,b]: any) => b - a)[0]?.[0] || 'N/A' }
      ];

      csvData = arrayToCSV(csvRows, headers);
      filename = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_analytics_${new Date().toISOString().split('T')[0]}.csv`;

    } else {
      // Detailed format (default)
      const headers = [
        'health_id', 'name', 'breed', 'age_months', 'weight_kg', 'gender',
        'vaccination_status', 'spayed_neutered', 'owner_name', 'owner_email',
        'benefits_active', 'latest_weight', 'latest_mood', 'total_claims',
        'approved_claims_amount', 'emergency_contact', 'created_date'
      ];

      const csvRows = dogs.map(dog => {
        const approvedClaims = dog.PetBenefitClaims.filter(c => c.approval_status === 'approved');
        const approvedAmount = approvedClaims.reduce((sum, c) => sum + (c.approved_amount || 0), 0);

        return {
          health_id: dog.health_id,
          name: dog.name,
          breed: dog.breed,
          age_months: dog.age_months,
          weight_kg: dog.weight_kg,
          gender: dog.gender,
          vaccination_status: dog.vaccination_status,
          spayed_neutered: dog.spayed_neutered ? 'Yes' : 'No',
          owner_name: dog.User?.name || 'N/A',
          owner_email: dog.User?.email || 'N/A',
          benefits_active: dog.corporate_benefits_active ? 'Yes' : 'No',
          latest_weight: dog.HealthLogs[0]?.weight_kg || 'N/A',
          latest_mood: dog.HealthLogs[0]?.mood_score || 'N/A',
          total_claims: dog.PetBenefitClaims.length,
          approved_claims_amount: approvedAmount,
          emergency_contact: dog.emergency_contact || 'N/A',
          created_date: new Date(dog.created_at).toLocaleDateString()
        };
      });

      csvData = arrayToCSV(csvRows, headers);
      filename = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}_dog_ids_detailed_${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Return CSV as downloadable file
    return new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}