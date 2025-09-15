import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
    const { 
      contentType,
      contentId,
      reportCategory,
      reportReason,
      description,
      evidenceUrls
    } = body;

    // Validate required fields
    if (!contentType || !contentId || !reportCategory || !reportReason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate content type
    const validContentTypes = ['question', 'answer', 'forum_post', 'forum_reply', 'story', 'comment'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid content type' },
        { status: 400 }
      );
    }

    // Validate report category
    const validCategories = ['spam', 'inappropriate', 'harassment', 'fake', 'misinformation', 'other'];
    if (!validCategories.includes(reportCategory)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report category' },
        { status: 400 }
      );
    }

    // Check if user has already reported this content
    const existingReport = await prisma.contentReport.findFirst({
      where: {
        reported_by: user.id,
        content_type: contentType,
        content_id: contentId,
        status: { in: ['pending', 'reviewing'] }
      }
    });

    if (existingReport) {
      return NextResponse.json(
        { success: false, error: 'You have already reported this content' },
        { status: 400 }
      );
    }

    // Determine priority based on category and user's reputation
    let priority = 'medium';
    if (reportCategory === 'harassment' || reportCategory === 'fake') {
      priority = 'high';
    }
    if (reportCategory === 'misinformation') {
      priority = 'urgent';
    }

    // Create the report
    const report = await prisma.contentReport.create({
      data: {
        content_type: contentType,
        content_id: contentId,
        reported_by: user.id,
        report_category: reportCategory,
        report_reason: reportReason,
        description: description || null,
        evidence_urls: evidenceUrls || [],
        priority,
        status: 'pending'
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        }
      }
    });

    // Update user's reporting statistics
    await prisma.userReputationScore.upsert({
      where: { user_id: user.id },
      update: {
        valid_reports_made: { increment: 1 },
        last_calculated: new Date()
      },
      create: {
        user_id: user.id,
        overall_reputation: 105, // Slight bonus for reporting
        valid_reports_made: 1,
        last_calculated: new Date()
      }
    });

    // Award points for valid reporting
    await prisma.userEngagement.create({
      data: {
        user_id: user.id,
        action_type: 'content_reported',
        points_earned: 5,
        description: `Reported ${contentType} for ${reportCategory}`,
        related_id: report.id,
        related_type: 'content_report'
      }
    });

    return NextResponse.json({
      success: true,
      data: { report },
      message: 'Content reported successfully. Our moderation team will review it.'
    });

  } catch (error) {
    console.error('Error creating content report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Check if user is admin/moderator
    const isAdmin = user.role === 'admin' || user.role === 'moderator';
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const contentType = searchParams.get('contentType');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const myReports = searchParams.get('myReports') === 'true';

    // Build where clause
    const where: any = {};
    
    if (myReports || !isAdmin) {
      // Non-admins can only see their own reports
      where.reported_by = user.id;
    }
    
    if (status && status !== 'all') where.status = status;
    if (category) where.report_category = category;
    if (priority) where.priority = priority;
    if (contentType) where.content_type = contentType;

    const reports = await prisma.contentReport.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        assigned_moderator: {
          select: {
            id: true,
            name: true,
            profile_image_url: true
          }
        },
        resolver: {
          select: {
            id: true,
            name: true
          }
        },
        actions: {
          select: {
            id: true,
            action_type: true,
            reason: true,
            created_at: true,
            moderator: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 3
        }
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    const total = await prisma.contentReport.count({ where });

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching content reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}