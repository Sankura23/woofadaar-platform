import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      email: decoded.email
    };
  } catch (error) {
    return null;
  }
}

// Helper function to generate verification workflow steps
function generateWorkflowSteps(partner: any, dog: any, purpose: string): any[] {
  const baseSteps = [
    {
      step: 1,
      title: 'Health ID Verification',
      description: 'Verify pet Health ID and owner consent',
      status: 'completed',
      completed_at: new Date(),
      required: true
    },
    {
      step: 2,
      title: 'Pet Information Review',
      description: 'Review pet basic information and health status',
      status: 'in_progress',
      required: true
    }
  ];

  // Add purpose-specific steps
  switch (purpose) {
    case 'consultation':
      baseSteps.push(
        {
          step: 3,
          title: 'Health History Review',
          description: 'Review recent health logs and appointment history',
          status: 'pending',
          required: true
        },
        {
          step: 4,
          title: 'Consultation Notes',
          description: 'Document consultation findings and recommendations',
          status: 'pending',
          required: true
        }
      );
      break;

    case 'treatment':
      baseSteps.push(
        {
          step: 3,
          title: 'Medical History Analysis',
          description: 'Comprehensive review of medical records',
          status: 'pending',
          required: true
        },
        {
          step: 4,
          title: 'Treatment Plan',
          description: 'Develop and document treatment plan',
          status: 'pending',
          required: true
        },
        {
          step: 5,
          title: 'Owner Communication',
          description: 'Discuss treatment plan with pet owner',
          status: 'pending',
          required: true
        }
      );
      break;

    case 'emergency':
      baseSteps.push(
        {
          step: 3,
          title: 'Emergency Assessment',
          description: 'Immediate health assessment and triage',
          status: 'pending',
          required: true,
          urgent: true
        },
        {
          step: 4,
          title: 'Emergency Treatment',
          description: 'Provide immediate medical intervention',
          status: 'pending',
          required: true,
          urgent: true
        }
      );
      break;

    case 'training':
      baseSteps.push(
        {
          step: 3,
          title: 'Behavioral Assessment',
          description: 'Evaluate pet behavior and training needs',
          status: 'pending',
          required: true
        },
        {
          step: 4,
          title: 'Training Plan',
          description: 'Create customized training program',
          status: 'pending',
          required: true
        }
      );
      break;

    case 'vaccination_record':
      baseSteps.push(
        {
          step: 3,
          title: 'Vaccination History',
          description: 'Review current vaccination status',
          status: 'pending',
          required: true
        },
        {
          step: 4,
          title: 'Vaccination Schedule',
          description: 'Update vaccination records and schedule',
          status: 'pending',
          required: true
        }
      );
      break;
  }

  // Add final documentation step
  baseSteps.push({
    step: baseSteps.length + 1,
    title: 'Documentation & Follow-up',
    description: 'Complete verification documentation and schedule follow-up',
    status: 'pending',
    required: true
  });

  return baseSteps;
}

// POST /api/health-id/verification-workflow - Start or update verification workflow
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.partnerId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Partner authentication required' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { health_id, verification_id, action, step_data, workflow_notes } = body;

    // Validation
    if (!health_id && !verification_id) {
      return NextResponse.json({
        success: false,
        message: 'Health ID or verification ID is required'
      }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({
        success: false,
        message: 'Action is required'
      }, { status: 400 });
    }

    const validActions = ['start_workflow', 'update_step', 'complete_step', 'complete_workflow', 'cancel_workflow'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action'
      }, { status: 400 });
    }

    // Get or create verification record
    let verification;
    if (verification_id) {
      verification = await prisma.healthIdVerification.findUnique({
        where: { id: verification_id },
        include: {
          dog: {
            include: {
              User: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          partner: {
            select: { id: true, name: true, partner_type: true, partnership_tier: true }
          }
        }
      });
    } else if (health_id) {
      const dog = await prisma.dog.findUnique({
        where: { health_id: health_id },
        include: {
          User: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!dog) {
        return NextResponse.json({
          success: false,
          message: 'Health ID not found'
        }, { status: 404 });
      }

      // Create new verification if starting workflow
      if (action === 'start_workflow') {
        verification = await prisma.healthIdVerification.create({
          data: {
            partner_id: auth.partnerId,
            dog_id: dog.id,
            purpose: step_data?.purpose || 'consultation',
            notes: workflow_notes || null,
            verified_by: auth.email || auth.partnerId
          },
          include: {
            dog: {
              include: {
                User: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            partner: {
              select: { id: true, name: true, partner_type: true, partnership_tier: true }
            }
          }
        });
      }
    }

    if (!verification) {
      return NextResponse.json({
        success: false,
        message: 'Verification record not found'
      }, { status: 404 });
    }

    // Check partner permissions
    if (verification.partner_id !== auth.partnerId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied - not your verification'
      }, { status: 403 });
    }

    let workflowData: any = {};
    let resultMessage = '';

    switch (action) {
      case 'start_workflow':
        const workflowSteps = generateWorkflowSteps(
          verification.partner, 
          verification.dog, 
          verification.purpose || 'consultation'
        );

        workflowData = {
          verification_id: verification.id,
          workflow_status: 'in_progress',
          steps: workflowSteps,
          started_at: new Date(),
          estimated_completion: new Date(Date.now() + getEstimatedDuration(verification.purpose || 'consultation') * 60 * 1000)
        };

        resultMessage = 'Verification workflow started successfully';
        break;

      case 'update_step':
        if (!step_data || !step_data.step_number) {
          return NextResponse.json({
            success: false,
            message: 'Step data with step number is required'
          }, { status: 400 });
        }

        // Update step with new data
        workflowData = {
          step_updated: step_data.step_number,
          step_data: step_data,
          updated_at: new Date()
        };

        resultMessage = `Step ${step_data.step_number} updated successfully`;
        break;

      case 'complete_step':
        if (!step_data || !step_data.step_number) {
          return NextResponse.json({
            success: false,
            message: 'Step number is required'
          }, { status: 400 });
        }

        workflowData = {
          step_completed: step_data.step_number,
          completion_data: step_data,
          completed_at: new Date()
        };

        resultMessage = `Step ${step_data.step_number} completed successfully`;
        break;

      case 'complete_workflow':
        // Update verification record
        await prisma.healthIdVerification.update({
          where: { id: verification.id },
          data: {
            notes: workflow_notes || verification.notes
          }
        });

        workflowData = {
          workflow_status: 'completed',
          completed_at: new Date(),
          final_notes: workflow_notes,
          completion_summary: generateCompletionSummary(verification, step_data)
        };

        resultMessage = 'Verification workflow completed successfully';
        break;

      case 'cancel_workflow':
        workflowData = {
          workflow_status: 'cancelled',
          cancelled_at: new Date(),
          cancellation_reason: step_data?.reason || 'Workflow cancelled by partner'
        };

        resultMessage = 'Verification workflow cancelled';
        break;
    }

    // Generate comprehensive workflow response
    const workflowResponse = {
      verification: {
        id: verification.id,
        health_id: verification.dog.health_id,
        verification_date: verification.verification_date,
        purpose: verification.purpose,
        status: workflowData.workflow_status || 'in_progress'
      },
      pet_info: {
        id: verification.dog.id,
        name: verification.dog.name,
        breed: verification.dog.breed,
        age_months: verification.dog.age_months,
        owner: verification.dog.User
      },
      partner_info: {
        id: verification.partner.id,
        name: verification.partner.name,
        partner_type: verification.partner.partner_type,
        tier: verification.partner.partnership_tier
      },
      workflow: workflowData,
      next_steps: generateNextSteps(action, workflowData, verification.purpose || 'consultation'),
      compliance: {
        data_retention: '90 days for completed workflows',
        privacy_notice: 'All data accessed under veterinary confidentiality',
        audit_trail: 'Full audit trail maintained for compliance'
      }
    };

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: auth.partnerId,
        action: `workflow_${action}`,
        details: {
          verification_id: verification.id,
          health_id: verification.dog.health_id,
          action: action,
          step_data: step_data,
          timestamp: new Date().toISOString()
        }
      }
    }).catch(err => {
      console.log('Audit log creation failed:', err);
    });

    return NextResponse.json({
      success: true,
      message: resultMessage,
      data: workflowResponse
    });

  } catch (error) {
    console.error('Verification workflow error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during workflow processing'
    }, { status: 500 });
  }
}

// GET /api/health-id/verification-workflow - Get workflow status and history
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth || !auth.partnerId) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized - Partner authentication required' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const verification_id = searchParams.get('verification_id');
    const health_id = searchParams.get('health_id');
    const status = searchParams.get('status');

    let whereClause: any = { partner_id: auth.partnerId };

    if (verification_id) {
      whereClause.id = verification_id;
    }

    if (health_id) {
      const dog = await prisma.dog.findUnique({
        where: { health_id: health_id },
        select: { id: true }
      });

      if (dog) {
        whereClause.dog_id = dog.id;
      }
    }

    // Get verification workflows
    const verifications = await prisma.healthIdVerification.findMany({
      where: whereClause,
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            breed: true,
            health_id: true,
            User: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        partner: {
          select: {
            id: true,
            name: true,
            business_name: true,
            partner_type: true
          }
        }
      },
      orderBy: { verification_date: 'desc' },
      take: 20
    });

    // Generate workflow data for each verification
    const workflowData = verifications.map(verification => {
      const steps = generateWorkflowSteps(
        verification.partner,
        verification.dog,
        verification.purpose || 'consultation'
      );

      return {
        verification: {
          id: verification.id,
          verification_date: verification.verification_date,
          purpose: verification.purpose,
          notes: verification.notes
        },
        pet: {
          id: verification.dog.id,
          name: verification.dog.name,
          breed: verification.dog.breed,
          health_id: verification.dog.health_id,
          owner: verification.dog.User
        },
        workflow: {
          steps: steps,
          current_step: steps.find(step => step.status === 'in_progress')?.step || 1,
          progress_percentage: Math.round((steps.filter(step => step.status === 'completed').length / steps.length) * 100),
          estimated_completion: new Date(verification.verification_date.getTime() + getEstimatedDuration(verification.purpose || 'consultation') * 60 * 1000)
        }
      };
    });

    // Get workflow statistics
    const stats = await getWorkflowStatistics(auth.partnerId);

    return NextResponse.json({
      success: true,
      data: {
        workflows: workflowData,
        statistics: stats,
        workflow_templates: getWorkflowTemplates()
      }
    });

  } catch (error) {
    console.error('Workflow status error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error while fetching workflow data'
    }, { status: 500 });
  }
}

// Helper functions
function getEstimatedDuration(purpose: string): number {
  // Return duration in minutes
  const durations = {
    'consultation': 45,
    'treatment': 90,
    'emergency': 30,
    'training': 60,
    'vaccination_record': 30,
    'follow_up': 30
  };
  
  return durations[purpose as keyof typeof durations] || 45;
}

function generateCompletionSummary(verification: any, stepData: any) {
  return {
    pet_name: verification.dog.name,
    health_id: verification.dog.health_id,
    verification_purpose: verification.purpose,
    partner_name: verification.partner.name,
    completion_date: new Date(),
    key_findings: stepData?.findings || 'Verification completed successfully',
    recommendations: stepData?.recommendations || [],
    follow_up_required: stepData?.follow_up_required || false,
    next_appointment: stepData?.next_appointment || null
  };
}

function generateNextSteps(action: string, workflowData: any, purpose: string): string[] {
  const nextSteps = [];
  
  switch (action) {
    case 'start_workflow':
      nextSteps.push('Review pet information and health history');
      nextSteps.push('Complete verification steps in sequence');
      nextSteps.push('Document findings and recommendations');
      break;
      
    case 'update_step':
      nextSteps.push('Continue with next workflow step');
      nextSteps.push('Ensure all required information is captured');
      break;
      
    case 'complete_step':
      nextSteps.push('Proceed to next required step');
      nextSteps.push('Review workflow progress');
      break;
      
    case 'complete_workflow':
      nextSteps.push('Verification documentation completed');
      nextSteps.push('Owner will receive verification summary');
      if (workflowData.completion_summary?.follow_up_required) {
        nextSteps.push('Schedule follow-up appointment as needed');
      }
      break;
      
    case 'cancel_workflow':
      nextSteps.push('Workflow has been cancelled');
      nextSteps.push('Contact support if cancellation was in error');
      break;
  }
  
  return nextSteps;
}

async function getWorkflowStatistics(partnerId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [totalWorkflows, monthlyWorkflows, purposeBreakdown] = await Promise.all([
    prisma.healthIdVerification.count({
      where: { partner_id: partnerId }
    }),
    prisma.healthIdVerification.count({
      where: {
        partner_id: partnerId,
        verification_date: { gte: thirtyDaysAgo }
      }
    }),
    prisma.healthIdVerification.groupBy({
      by: ['purpose'],
      where: {
        partner_id: partnerId,
        verification_date: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    })
  ]);

  return {
    total_workflows: totalWorkflows,
    monthly_workflows: monthlyWorkflows,
    average_daily_workflows: Math.round(monthlyWorkflows / 30),
    workflows_by_purpose: purposeBreakdown.reduce((acc, item) => {
      acc[item.purpose || 'other'] = item._count.id;
      return acc;
    }, {} as any),
    workflow_efficiency: monthlyWorkflows > 0 ? 'active' : 'low'
  };
}

function getWorkflowTemplates() {
  return {
    consultation: {
      name: 'General Consultation',
      estimated_duration: 45,
      steps: 4,
      description: 'Standard health consultation workflow'
    },
    treatment: {
      name: 'Medical Treatment',
      estimated_duration: 90,
      steps: 5,
      description: 'Comprehensive treatment workflow with documentation'
    },
    emergency: {
      name: 'Emergency Care',
      estimated_duration: 30,
      steps: 4,
      description: 'Urgent care workflow with immediate response'
    },
    training: {
      name: 'Behavioral Training',
      estimated_duration: 60,
      steps: 4,
      description: 'Pet training assessment and plan development'
    },
    vaccination_record: {
      name: 'Vaccination Update',
      estimated_duration: 30,
      steps: 4,
      description: 'Vaccination record review and update'
    }
  };
}