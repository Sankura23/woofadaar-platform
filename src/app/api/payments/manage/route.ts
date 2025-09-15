import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/db';
import { PaymentProcessor, PaymentType } from '@/lib/payment-processor';
import { PaymentValidator, PaymentFormatter, PaymentErrorHandler, PaymentAnalytics } from '@/lib/payment-utils';

const verifyToken = (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Authentication required', status: 401 };
  }
  const token = authHeader.substring(7);
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development';
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    if (!decoded.userId) {
      return { error: 'Invalid authentication token', status: 401 };
    }
    return { decoded };
  } catch (error) {
    return { error: 'Invalid authentication token', status: 401 };
  }
};

const isAdmin = (userType: string) => userType === 'admin';

// GET /api/payments/manage - Get comprehensive payment management data
export async function GET(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentType = searchParams.get('payment_type');
    const userId = searchParams.get('user_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const includeAnalytics = searchParams.get('include_analytics') !== 'false';

    const offset = (page - 1) * limit;

    // Build where clause based on user permissions
    const where: any = {};

    // Apply user-specific filters
    if (!isAdmin(decoded.userType)) {
      where.user_id = decoded.userId;
    } else if (userId) {
      where.user_id = userId;
    }

    // Apply other filters
    if (status) where.status = status;
    if (paymentType) where.payment_type = paymentType;
    
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at.gte = new Date(dateFrom);
      if (dateTo) where.created_at.lte = new Date(dateTo);
    }

    const [payments, totalCount] = await Promise.all([
      prisma.paymentOrder.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          partner: {
            select: {
              id: true,
              name: true,
              business_name: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.paymentOrder.count({ where })
    ]);

    // Process payments with formatted data
    const processedPayments = payments.map(payment => ({
      ...payment,
      formatted_amount: PaymentFormatter.formatAmount(payment.amount, payment.currency),
      formatted_status: PaymentFormatter.formatPaymentStatus(payment.status),
      formatted_type: PaymentFormatter.formatPaymentType(payment.payment_type as PaymentType),
      receipt_data: PaymentFormatter.generateReceiptData(payment)
    }));

    let analytics = {};
    if (includeAnalytics) {
      analytics = {
        summary: {
          total_payments: totalCount,
          total_revenue: payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0),
          success_rate: PaymentAnalytics.calculateConversionRate(
            totalCount,
            payments.filter(p => p.status === 'completed').length
          ),
          average_order_value: PaymentAnalytics.calculateAverageOrderValue(
            payments.filter(p => p.status === 'completed')
          )
        },
        status_breakdown: PaymentAnalytics.groupPaymentsByStatus(payments),
        revenue_trend: PaymentAnalytics.calculateRevenueTrend(payments, 7),
        insights: PaymentAnalytics.generatePaymentInsights(payments)
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        payments: processedPayments,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalCount / limit),
          total_count: totalCount,
          per_page: limit
        },
        ...(includeAnalytics && { analytics })
      }
    });

  } catch (error) {
    console.error('Error fetching payment management data:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

// POST /api/payments/manage - Create a new payment order
export async function POST(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      amount,
      currency = 'INR',
      payment_type,
      service_id,
      dog_id,
      partner_id,
      billing_period = 'monthly',
      auto_renew = true,
      metadata = {}
    } = body;

    // Validate input
    const amountValidation = PaymentValidator.validateAmount(amount, payment_type, service_id);
    if (!amountValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: amountValidation.error,
        suggested_amount: amountValidation.suggestedAmount
      }, { status: 400 });
    }

    const currencyValidation = PaymentValidator.validateCurrency(currency);
    if (!currencyValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: currencyValidation.error
      }, { status: 400 });
    }

    // Only allow users to create payments for themselves (unless admin)
    const targetUserId = !isAdmin(decoded.userType) ? decoded.userId : (body.user_id || decoded.userId);

    // Create payment order using PaymentProcessor
    const paymentRequest = {
      userId: targetUserId,
      amount: amount,
      currency: currency,
      paymentType: payment_type,
      serviceId: service_id,
      dogId: dog_id,
      partnerId: partner_id,
      billingPeriod: billing_period,
      autoRenew: auto_renew,
      metadata: {
        created_by: decoded.userId,
        created_via: 'payment_management_api',
        ...metadata
      }
    };

    const result = await PaymentProcessor.createPaymentOrder(paymentRequest);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        payment_order_id: result.paymentOrderId,
        razorpay_order_id: result.razorpayOrderId,
        amount: PaymentFormatter.formatAmount(result.amount, result.currency),
        currency: result.currency,
        payment_config: result.paymentConfig,
        next_steps: {
          action: 'complete_payment',
          instructions: 'Use the payment_config to initialize Razorpay checkout',
          webhook_url: '/api/payments/webhook',
          verification_url: '/api/payments/verify'
        }
      }
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      PaymentErrorHandler.createErrorResponse(error, 'payment_creation'),
      { status: 500 }
    );
  }
}

// PUT /api/payments/manage - Process payment verification or update
export async function PUT(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    const body = await request.json();
    
    const {
      action, // 'verify_payment', 'cancel_payment', 'refund_payment'
      payment_order_id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      refund_amount,
      refund_reason,
      admin_notes
    } = body;

    if (!action || !payment_order_id) {
      return NextResponse.json({
        success: false,
        message: 'Action and payment_order_id are required'
      }, { status: 400 });
    }

    // Verify user has permission to perform action on this payment
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: payment_order_id }
    });

    if (!paymentOrder) {
      return NextResponse.json({
        success: false,
        message: 'Payment order not found'
      }, { status: 404 });
    }

    if (!isAdmin(decoded.userType) && paymentOrder.user_id !== decoded.userId) {
      return NextResponse.json({
        success: false,
        message: 'Access denied: You can only manage your own payments'
      }, { status: 403 });
    }

    let result;

    switch (action) {
      case 'verify_payment':
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
          return NextResponse.json({
            success: false,
            message: 'Payment verification requires razorpay_payment_id, razorpay_order_id, and razorpay_signature'
          }, { status: 400 });
        }

        result = await PaymentProcessor.verifyAndProcessPayment(
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature
        );
        break;

      case 'cancel_payment':
        // Only allow cancellation of pending payments
        if (paymentOrder.status !== 'created' && paymentOrder.status !== 'pending') {
          return NextResponse.json({
            success: false,
            message: 'Only pending payments can be cancelled'
          }, { status: 400 });
        }

        await prisma.paymentOrder.update({
          where: { id: payment_order_id },
          data: {
            status: 'cancelled',
            metadata: {
              ...paymentOrder.metadata,
              cancelled_at: new Date().toISOString(),
              cancelled_by: decoded.userId,
              cancellation_reason: admin_notes || 'User requested cancellation'
            }
          }
        });

        result = { success: true, message: 'Payment cancelled successfully' };
        break;

      case 'refund_payment':
        if (!isAdmin(decoded.userType)) {
          return NextResponse.json({
            success: false,
            message: 'Admin access required for refunds'
          }, { status: 403 });
        }

        result = await PaymentProcessor.processRefund(
          payment_order_id,
          refund_amount,
          refund_reason || admin_notes
        );
        break;

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Supported actions: verify_payment, cancel_payment, refund_payment'
        }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error processing payment action:', error);
    return NextResponse.json(
      PaymentErrorHandler.createErrorResponse(error, 'payment_processing'),
      { status: 500 }
    );
  }
}

// DELETE /api/payments/manage - Delete payment order (admin only, for pending payments)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = verifyToken(request.headers.get('authorization'));
    if (authResult.error) {
      return NextResponse.json({ success: false, message: authResult.error }, { status: authResult.status });
    }

    const { decoded } = authResult;
    
    if (!isAdmin(decoded.userType)) {
      return NextResponse.json({
        success: false,
        message: 'Admin access required for payment deletion'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paymentOrderId = searchParams.get('payment_order_id');

    if (!paymentOrderId) {
      return NextResponse.json({
        success: false,
        message: 'Payment order ID is required'
      }, { status: 400 });
    }

    // Find payment order
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId }
    });

    if (!paymentOrder) {
      return NextResponse.json({
        success: false,
        message: 'Payment order not found'
      }, { status: 404 });
    }

    // Only allow deletion of pending/failed payments
    if (!['created', 'pending', 'failed', 'cancelled'].includes(paymentOrder.status)) {
      return NextResponse.json({
        success: false,
        message: 'Cannot delete completed or processing payments'
      }, { status: 400 });
    }

    // Delete payment order
    await prisma.paymentOrder.delete({
      where: { id: paymentOrderId }
    });

    console.log(`Payment order deleted: ${paymentOrderId} by admin ${decoded.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Payment order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment order:', error);
    return NextResponse.json(
      PaymentErrorHandler.createErrorResponse(error, 'payment_deletion'),
      { status: 500 }
    );
  }
}