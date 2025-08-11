import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromRequest, verifyToken, isPetParent } from '@/lib/auth';

// POST /api/health/export/[dogId] - Create health data export
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dogId } = await params;
    
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        user_id: payload.userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or access denied'
      }, { status: 404 });
    }

    const body = await request.json();
    const {
      export_type,
      date_range_start,
      date_range_end,
      data_types
    } = body;

    // Validation
    if (!export_type || !date_range_start || !date_range_end || !data_types) {
      return NextResponse.json({
        success: false,
        message: 'Export type, date range, and data types are required'
      }, { status: 400 });
    }

    const validExportTypes = ['pdf_report', 'csv_data', 'vet_summary', 'insurance_claim'];
    if (!validExportTypes.includes(export_type)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid export type'
      }, { status: 400 });
    }

    const validDataTypes = ['health_logs', 'medical_records', 'medications', 'vaccinations', 'reminders'];
    const invalidDataTypes = data_types.filter((type: string) => !validDataTypes.includes(type));
    if (invalidDataTypes.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Invalid data types: ${invalidDataTypes.join(', ')}`
      }, { status: 400 });
    }

    try {
      // Create export record
      const healthExport = await prisma.healthExport.create({
        data: {
          dog_id: dogId,
          user_id: payload.userId,
          export_type,
          date_range_start: new Date(date_range_start),
          date_range_end: new Date(date_range_end),
          data_types,
          status: 'processing',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      });

      // Generate export data
      const exportData = await generateExportData(dogId, payload.userId, date_range_start, date_range_end, data_types);
      
      // Create file based on export type
      const fileInfo = await createExportFile(export_type, exportData, dog, healthExport.id);

      // Update export record with file info
      const updatedExport = await prisma.healthExport.update({
        where: { id: healthExport.id },
        data: {
          file_url: fileInfo.url,
          file_size: fileInfo.size,
          status: 'completed'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Health data export created successfully',
        data: {
          export_id: updatedExport.id,
          export_type,
          file_url: fileInfo.url,
          file_size: fileInfo.size,
          expires_at: updatedExport.expires_at,
          data_summary: {
            dog_name: dog.name,
            date_range: {
              start: date_range_start,
              end: date_range_end
            },
            data_types,
            record_counts: exportData.summary
          }
        }
      });

    } catch (dbError) {
      console.error('Database error in health export:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to create health export'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Health export error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// GET /api/health/export/[dogId] - Get export history for dog
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dogId } = await params;
    
    // Verify authentication
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({
        success: false,
        message: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !isPetParent(payload)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid authentication'
      }, { status: 401 });
    }

    // Verify dog ownership
    const dog = await prisma.dog.findFirst({
      where: {
        id: dogId,
        user_id: payload.userId
      }
    });

    if (!dog) {
      return NextResponse.json({
        success: false,
        message: 'Dog not found or access denied'
      }, { status: 404 });
    }

    try {
      // Get export history
      const exports = await prisma.healthExport.findMany({
        where: {
          dog_id: dogId,
          user_id: payload.userId
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 20
      });

      // Clean up expired exports
      const now = new Date();
      await prisma.healthExport.updateMany({
        where: {
          dog_id: dogId,
          expires_at: {
            lt: now
          },
          status: 'completed'
        },
        data: {
          status: 'expired'
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          exports: exports.map(exp => ({
            ...exp,
            is_expired: exp.expires_at < now
          })),
          dog_info: {
            id: dog.id,
            name: dog.name,
            breed: dog.breed
          }
        }
      });

    } catch (dbError) {
      console.error('Database error in export history:', dbError);
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve export history'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Export history error:', error);
    return NextResponse.json({
      success: false,
      message: 'Invalid request format'
    }, { status: 400 });
  }
}

// Helper function to generate export data
async function generateExportData(dogId: string, userId: string, startDate: string, endDate: string, dataTypes: string[]) {
  const data: any = {
    health_logs: [],
    medical_records: [],
    medications: [],
    vaccinations: [],
    reminders: [],
    summary: {}
  };

  const dateFilter = {
    gte: new Date(startDate),
    lte: new Date(endDate)
  };

  // Get health logs
  if (dataTypes.includes('health_logs')) {
    data.health_logs = await prisma.healthLog.findMany({
      where: {
        dog_id: dogId,
        user_id: userId,
        log_date: dateFilter
      },
      orderBy: {
        log_date: 'desc'
      }
    });
    data.summary.health_logs = data.health_logs.length;
  }

  // Get medical records
  if (dataTypes.includes('medical_records')) {
    data.medical_records = await prisma.medicalRecord.findMany({
      where: {
        dog_id: dogId,
        user_id: userId,
        record_date: dateFilter
      },
      orderBy: {
        record_date: 'desc'
      }
    });
    data.summary.medical_records = data.medical_records.length;
  }

  // Get medications (from medical records)
  if (dataTypes.includes('medications')) {
    data.medications = await prisma.medicalRecord.findMany({
      where: {
        dog_id: dogId,
        user_id: userId,
        record_type: 'medication',
        record_date: dateFilter
      },
      orderBy: {
        record_date: 'desc'
      }
    });
    data.summary.medications = data.medications.length;
  }

  // Get vaccinations (from medical records)
  if (dataTypes.includes('vaccinations')) {
    data.vaccinations = await prisma.medicalRecord.findMany({
      where: {
        dog_id: dogId,
        user_id: userId,
        record_type: 'vaccination',
        record_date: dateFilter
      },
      orderBy: {
        record_date: 'desc'
      }
    });
    data.summary.vaccinations = data.vaccinations.length;
  }

  // Get reminders
  if (dataTypes.includes('reminders')) {
    data.reminders = await prisma.healthReminder.findMany({
      where: {
        dog_id: dogId,
        user_id: userId,
        created_at: dateFilter
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    data.summary.reminders = data.reminders.length;
  }

  return data;
}

// Helper function to create export file
async function createExportFile(exportType: string, data: any, dog: any, exportId: string) {
  // In a real implementation, this would:
  // 1. Generate PDF for pdf_report
  // 2. Generate CSV for csv_data
  // 3. Upload to cloud storage (Cloudinary, S3, etc.)
  // 4. Return the public URL and file size

  // For now, we'll create a mock implementation
  const mockFileUrl = `/api/health/export/download/${exportId}`;
  const mockFileSize = JSON.stringify(data).length; // Rough estimate

  switch (exportType) {
    case 'pdf_report':
      return {
        url: `${mockFileUrl}.pdf`,
        size: mockFileSize * 1.5, // PDFs are typically larger
        format: 'pdf'
      };

    case 'csv_data':
      return {
        url: `${mockFileUrl}.csv`,
        size: mockFileSize * 0.8, // CSVs are typically smaller
        format: 'csv'
      };

    case 'vet_summary':
      return {
        url: `${mockFileUrl}_vet.pdf`,
        size: mockFileSize * 1.2,
        format: 'pdf'
      };

    case 'insurance_claim':
      return {
        url: `${mockFileUrl}_insurance.pdf`,
        size: mockFileSize * 1.3,
        format: 'pdf'
      };

    default:
      throw new Error('Invalid export type');
  }
}