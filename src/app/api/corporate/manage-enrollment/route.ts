import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';

interface DecodedToken {
  userId?: string;
  partnerId?: string;
  email: string;
  userType?: string;
}

async function verifyToken(request: NextRequest): Promise<{ userId?: string; partnerId?: string; isAdmin?: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    // Check if user is admin (you can modify this logic based on your admin system)
    const isAdmin = decoded.email === 'admin@woofadaar.com' || decoded.userType === 'admin';
    
    return {
      userId: decoded.userId,
      partnerId: decoded.partnerId,
      isAdmin
    };
  } catch (error) {
    return null;
  }
}

// Helper function to calculate pro-rated refund
function calculateProRatedRefund(monthlyFee: number, billingCycle: string, cancelDate: Date, nextBillingDate: Date): number {
  if (cancelDate >= nextBillingDate) {
    return 0; // No refund if cancelling after billing date
  }

  const totalDays = Math.ceil((nextBillingDate.getTime() - cancelDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let cycleDays;
  if (billingCycle === 'monthly') {
    cycleDays = 30;
  } else if (billingCycle === 'quarterly') {
    cycleDays = 90;
  } else if (billingCycle === 'annual') {
    cycleDays = 365;
  } else {
    cycleDays = 30;
  }

  const dailyRate = monthlyFee / cycleDays;
  return Math.round(dailyRate * totalDays);
}

// PUT /api/corporate/manage-enrollment - Update corporate enrollment (suspend, reactivate, upgrade, etc.)
export async function PUT(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      enrollment_id, 
      action, 
      new_package_type,
      new_employee_count,
      reason,
      effective_date 
    } = body;

    // Validation
    if (!enrollment_id) {
      return NextResponse.json({
        success: false,
        message: 'Enrollment ID is required'
      }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({
        success: false,
        message: 'Action is required'
      }, { status: 400 });
    }

    const validActions = ['suspend', 'reactivate', 'cancel', 'upgrade_package', 'downgrade_package', 'update_employee_count'];
    if (!validActions.includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action'
      }, { status: 400 });
    }

    // Get current enrollment
    const enrollment = await prisma.corporateEnrollment.findUnique({
      where: { id: enrollment_id },
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                Dog: { select: { id: true, health_id: true } }
              }
            }
          }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({
        success: false,
        message: 'Corporate enrollment not found'
      }, { status: 404 });
    }

    let updateData: any = {
      updated_at: new Date()
    };
    let resultMessage = '';
    let refundAmount = 0;

    switch (action) {
      case 'suspend':
        if (enrollment.status === 'suspended') {
          return NextResponse.json({
            success: false,
            message: 'Enrollment is already suspended'
          }, { status: 400 });
        }
        
        updateData.status = 'suspended';
        resultMessage = `Corporate enrollment for ${enrollment.company_name} has been suspended`;
        
        // Suspend all employees
        await prisma.corporateEmployee.updateMany({
          where: { corporate_enrollment_id: enrollment_id },
          data: { status: 'inactive' }
        });
        break;

      case 'reactivate':
        if (enrollment.status === 'active') {
          return NextResponse.json({
            success: false,
            message: 'Enrollment is already active'
          }, { status: 400 });
        }
        
        updateData.status = 'active';
        resultMessage = `Corporate enrollment for ${enrollment.company_name} has been reactivated`;
        
        // Reactivate all employees
        await prisma.corporateEmployee.updateMany({
          where: { corporate_enrollment_id: enrollment_id },
          data: { status: 'active' }
        });
        break;

      case 'cancel':
        if (enrollment.status === 'cancelled') {
          return NextResponse.json({
            success: false,
            message: 'Enrollment is already cancelled'
          }, { status: 400 });
        }
        
        updateData.status = 'cancelled';
        
        // Calculate pro-rated refund
        const cancelDate = effective_date ? new Date(effective_date) : new Date();
        refundAmount = calculateProRatedRefund(
          enrollment.monthly_fee, 
          enrollment.billing_cycle, 
          cancelDate, 
          enrollment.next_billing_date
        );
        
        resultMessage = `Corporate enrollment for ${enrollment.company_name} has been cancelled`;
        
        // Deactivate all employees
        await prisma.corporateEmployee.updateMany({
          where: { corporate_enrollment_id: enrollment_id },
          data: { status: 'inactive' }
        });
        break;

      case 'upgrade_package':
      case 'downgrade_package':
        if (!new_package_type) {
          return NextResponse.json({
            success: false,
            message: 'New package type is required for package changes'
          }, { status: 400 });
        }

        const validPackageTypes = ['basic', 'premium', 'enterprise'];
        if (!validPackageTypes.includes(new_package_type)) {
          return NextResponse.json({
            success: false,
            message: 'Invalid package type'
          }, { status: 400 });
        }

        // Calculate new pricing
        const basePrices = {
          basic: 299,
          premium: 599,
          enterprise: 999
        };
        
        const newBasePrice = basePrices[new_package_type as keyof typeof basePrices];
        let newMonthlyFee = newBasePrice * enrollment.employee_count;
        
        // Apply volume discounts
        if (enrollment.employee_count >= 100) {
          newMonthlyFee *= 0.85;
        } else if (enrollment.employee_count >= 50) {
          newMonthlyFee *= 0.90;
        } else if (enrollment.employee_count >= 20) {
          newMonthlyFee *= 0.95;
        }

        updateData.package_type = new_package_type;
        updateData.monthly_fee = Math.round(newMonthlyFee);
        
        resultMessage = `Package ${action === 'upgrade_package' ? 'upgraded' : 'downgraded'} to ${new_package_type} for ${enrollment.company_name}`;

        // Update user premium status based on new package
        if (new_package_type !== 'basic') {
          await prisma.user.updateMany({
            where: {
              id: {
                in: enrollment.employees
                  .filter(emp => emp.user_id)
                  .map(emp => emp.user_id!)
              }
            },
            data: { is_premium: true }
          });
        } else {
          await prisma.user.updateMany({
            where: {
              id: {
                in: enrollment.employees
                  .filter(emp => emp.user_id)
                  .map(emp => emp.user_id!)
              }
            },
            data: { is_premium: false }
          });
        }
        break;

      case 'update_employee_count':
        if (!new_employee_count || new_employee_count < 1) {
          return NextResponse.json({
            success: false,
            message: 'Valid new employee count is required'
          }, { status: 400 });
        }

        const currentCount = enrollment.employee_count;
        const countDifference = new_employee_count - currentCount;

        // Recalculate pricing with new employee count
        const currentBasePrice = basePrices[enrollment.package_type as keyof typeof basePrices] || 299;
        let updatedMonthlyFee = currentBasePrice * new_employee_count;
        
        // Apply volume discounts
        if (new_employee_count >= 100) {
          updatedMonthlyFee *= 0.85;
        } else if (new_employee_count >= 50) {
          updatedMonthlyFee *= 0.90;
        } else if (new_employee_count >= 20) {
          updatedMonthlyFee *= 0.95;
        }

        updateData.employee_count = new_employee_count;
        updateData.monthly_fee = Math.round(updatedMonthlyFee);
        
        resultMessage = `Employee count ${countDifference > 0 ? 'increased' : 'decreased'} by ${Math.abs(countDifference)} for ${enrollment.company_name}`;
        break;

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action'
        }, { status: 400 });
    }

    // Update the enrollment
    const updatedEnrollment = await prisma.corporateEnrollment.update({
      where: { id: enrollment_id },
      data: updateData,
      include: {
        employees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                Dog: {
                  select: {
                    id: true,
                    name: true,
                    health_id: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user_id: auth.userId || 'admin',
        action: `corporate_${action}`,
        details: {
          enrollment_id,
          company_name: enrollment.company_name,
          old_status: enrollment.status,
          new_status: updateData.status,
          old_package: enrollment.package_type,
          new_package: updateData.package_type,
          old_employee_count: enrollment.employee_count,
          new_employee_count: updateData.employee_count,
          refund_amount: refundAmount,
          reason: reason,
          timestamp: new Date().toISOString()
        }
      }
    }).catch(err => {
      console.log('Audit log creation failed:', err);
    });

    // Send notification emails
    const notifications = [
      {
        type: 'email',
        to: enrollment.company_email,
        subject: `Woofadaar Corporate Enrollment Update - ${enrollment.company_name}`,
        template: 'corporate_enrollment_update',
        data: {
          company_name: enrollment.company_name,
          action,
          new_status: updateData.status,
          new_package_type: updateData.package_type,
          new_monthly_fee: updateData.monthly_fee,
          refund_amount: refundAmount,
          reason: reason
        }
      }
    ];

    console.log('Corporate enrollment update notifications queued:', notifications);

    return NextResponse.json({
      success: true,
      message: resultMessage,
      data: {
        enrollment: {
          id: updatedEnrollment.id,
          company_name: updatedEnrollment.company_name,
          status: updatedEnrollment.status,
          package_type: updatedEnrollment.package_type,
          employee_count: updatedEnrollment.employee_count,
          monthly_fee: updatedEnrollment.monthly_fee,
          enrolled_employees: updatedEnrollment.employees.length,
          total_pets: updatedEnrollment.employees.reduce((sum, emp) => 
            sum + (emp.user?.Dog?.length || 0), 0)
        },
        refund_amount: refundAmount
      },
      changes_summary: {
        action_performed: action,
        previous_status: enrollment.status,
        new_status: updateData.status || enrollment.status,
        previous_package: enrollment.package_type,
        new_package: updateData.package_type || enrollment.package_type,
        previous_fee: enrollment.monthly_fee,
        new_fee: updateData.monthly_fee || enrollment.monthly_fee,
        refund_issued: refundAmount > 0 ? `₹${refundAmount}` : null
      }
    });

  } catch (error) {
    console.error('Corporate enrollment management error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during enrollment management'
    }, { status: 500 });
  }
}

// DELETE /api/corporate/manage-enrollment - Remove employee from corporate enrollment
export async function DELETE(request: NextRequest) {
  const auth = await verifyToken(request);
  
  if (!auth) {
    return NextResponse.json({ 
      success: false,
      message: 'Unauthorized' 
    }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const enrollment_id = searchParams.get('enrollment_id');
    const employee_email = searchParams.get('employee_email');

    if (!enrollment_id || !employee_email) {
      return NextResponse.json({
        success: false,
        message: 'Enrollment ID and employee email are required'
      }, { status: 400 });
    }

    // Find the employee
    const employee = await prisma.corporateEmployee.findUnique({
      where: {
        corporate_enrollment_id_employee_email: {
          corporate_enrollment_id: enrollment_id,
          employee_email: employee_email
        }
      },
      include: {
        user: {
          select: {
            id: true,
            Dog: { select: { id: true, health_id: true } }
          }
        },
        corporate_enrollment: {
          select: {
            company_name: true,
            company_email: true
          }
        }
      }
    });

    if (!employee) {
      return NextResponse.json({
        success: false,
        message: 'Employee not found in this corporate enrollment'
      }, { status: 404 });
    }

    const petsCount = employee.user?.Dog?.length || 0;

    // Remove employee
    await prisma.corporateEmployee.delete({
      where: {
        corporate_enrollment_id_employee_email: {
          corporate_enrollment_id: enrollment_id,
          employee_email: employee_email
        }
      }
    });

    // Update enrollment pets count
    await prisma.corporateEnrollment.update({
      where: { id: enrollment_id },
      data: {
        enrolled_pets: {
          decrement: petsCount
        }
      }
    });

    // Optionally deactivate user's premium status if they're no longer in any corporate program
    if (employee.user_id) {
      const otherCorporateEnrollments = await prisma.corporateEmployee.count({
        where: {
          user_id: employee.user_id,
          status: 'active'
        }
      });

      if (otherCorporateEnrollments === 0) {
        await prisma.user.update({
          where: { id: employee.user_id },
          data: { is_premium: false }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Employee ${employee.employee_name} removed from corporate enrollment`,
      data: {
        removed_employee: {
          email: employee.employee_email,
          name: employee.employee_name,
          pets_count: petsCount
        },
        company: employee.corporate_enrollment.company_name
      }
    });

  } catch (error) {
    console.error('Employee removal error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error during employee removal'
    }, { status: 500 });
  }
}