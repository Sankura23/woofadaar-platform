import { NextRequest, NextResponse } from 'next/server';
import { RazorpayUtils } from '@/lib/razorpay';
import { paymentRetryService } from '@/lib/payment-retry-service';
import prisma from '@/lib/db';

// POST /api/payments/webhook - Handle Razorpay webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Missing webhook signature');
      return NextResponse.json(
        { success: false, message: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValidSignature = RazorpayUtils.verifyWebhookSignature(body, signature);

    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, message: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const payload = event.payload;

    console.log(`Received Razorpay webhook: ${eventType}`);

    // Handle different webhook events
    switch (eventType) {
      case 'payment.authorized':
        await handlePaymentAuthorized(payload);
        break;

      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;

      case 'order.paid':
        await handleOrderPaid(payload);
        break;

      case 'subscription.activated':
        await handleSubscriptionActivated(payload);
        break;

      case 'subscription.charged':
        await handleSubscriptionCharged(payload);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(payload);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(payload);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(payload);
        break;

      case 'refund.created':
        await handleRefundCreated(payload);
        break;

      case 'refund.processed':
        await handleRefundProcessed(payload);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    // Log webhook for audit
    await prisma.webhookLog.create({
      data: {
        provider: 'razorpay',
        event_type: eventType,
        payload: event,
        processed: true,
        processed_at: new Date()
      }
    });

    return NextResponse.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook processing error:', error);

    // Log failed webhook
    try {
      const body = await request.text();
      const event = JSON.parse(body);
      await prisma.webhookLog.create({
        data: {
          provider: 'razorpay',
          event_type: event.event || 'unknown',
          payload: event,
          processed: false,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date()
        }
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return NextResponse.json(
      { success: false, message: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Webhook event handlers

async function handlePaymentAuthorized(payload: any) {
  const payment = payload.payment.entity;
  console.log(`Payment authorized: ${payment.id} for order ${payment.order_id}`);

  // Update payment order status
  await prisma.paymentOrder.updateMany({
    where: { order_id: payment.order_id },
    data: {
      status: 'authorized',
      razorpay_payment_id: payment.id,
      metadata: {
        payment_authorized_at: new Date().toISOString(),
        payment_method: payment.method,
        bank: payment.bank,
        wallet: payment.wallet
      }
    }
  });
}

async function handlePaymentCaptured(payload: any) {
  const payment = payload.payment.entity;
  console.log(`Payment captured: ${payment.id} for order ${payment.order_id}`);

  // Update payment order
  const paymentOrder = await prisma.paymentOrder.findFirst({
    where: { order_id: payment.order_id }
  });

  if (paymentOrder) {
    await prisma.paymentOrder.update({
      where: { id: paymentOrder.id },
      data: {
        status: 'completed',
        razorpay_payment_id: payment.id,
        completed_at: new Date(),
        metadata: {
          ...paymentOrder.metadata,
          payment_captured_at: new Date().toISOString(),
          amount_captured: payment.amount,
          fee: payment.fee,
          tax: payment.tax
        }
      }
    });

    // Create revenue transaction
    const revenueStreamId = await getRevenueStreamForPaymentType(paymentOrder.payment_type);
    if (revenueStreamId) {
      await prisma.transaction.create({
        data: {
          revenue_stream_id: revenueStreamId,
          user_id: paymentOrder.user_id,
          partner_id: paymentOrder.partner_id,
          dog_id: paymentOrder.dog_id,
          transaction_type: paymentOrder.payment_type,
          amount: paymentOrder.amount,
          currency: paymentOrder.currency,
          status: 'completed',
          payment_method: 'razorpay',
          external_id: payment.id,
          processed_at: new Date(),
          metadata: {
            webhook_processed: true,
            razorpay_payment_data: payment
          }
        }
      });
    }
  }
}

async function handlePaymentFailed(payload: any) {
  const payment = payload.payment.entity;
  console.log(`Payment failed: ${payment.id} for order ${payment.order_id}`);

  // Update payment order
  await prisma.paymentOrder.updateMany({
    where: { order_id: payment.order_id },
    data: {
      status: 'failed',
      razorpay_payment_id: payment.id,
      metadata: {
        payment_failed_at: new Date().toISOString(),
        failure_reason: payment.error_code,
        error_description: payment.error_description
      }
    }
  });

  // Enhanced: Handle payment failure with retry logic
  try {
    // Find the payment record in our system
    const paymentRecord = await prisma.payment.findFirst({
      where: { 
        razorpay_order_id: payment.order_id,
        status: { in: ['created', 'pending'] }
      }
    });

    if (paymentRecord && paymentRecord.subscription_id) {
      // Trigger payment retry system
      const retryResult = await paymentRetryService.handlePaymentFailure(
        paymentRecord.id,
        paymentRecord.subscription_id,
        payment.error_description || payment.error_code || 'Payment failed',
        payment.error_code
      );

      console.log(`Payment retry initiated: ${retryResult.success ? 'Success' : 'Failed'} - ${retryResult.message}`);
    }
  } catch (retryError) {
    console.error('Failed to initiate payment retry:', retryError);
    // Continue processing webhook even if retry fails
  }
}

async function handleOrderPaid(payload: any) {
  const order = payload.order.entity;
  console.log(`Order paid: ${order.id}`);

  // This is a backup handler in case individual payment events are missed
  await prisma.paymentOrder.updateMany({
    where: { 
      order_id: order.id,
      status: { in: ['created', 'authorized'] }
    },
    data: {
      status: 'completed',
      completed_at: new Date(),
      metadata: {
        order_paid_webhook_at: new Date().toISOString(),
        amount_paid: order.amount_paid
      }
    }
  });
}

async function handleSubscriptionActivated(payload: any) {
  const subscription = payload.subscription.entity;
  console.log(`Subscription activated: ${subscription.id}`);

  // Update partner subscription if this is a partner subscription
  if (subscription.notes?.subscription_type === 'partner') {
    await prisma.partnerSubscription.updateMany({
      where: { external_subscription_id: subscription.id },
      data: {
        status: 'active',
        current_period_start: new Date(subscription.current_start * 1000),
        current_period_end: new Date(subscription.current_end * 1000),
        updated_at: new Date()
      }
    });
  }
}

async function handleSubscriptionCharged(payload: any) {
  const subscription = payload.subscription.entity;
  const payment = payload.payment.entity;
  
  console.log(`Subscription charged: ${subscription.id}, Payment: ${payment.id}`);

  // Create subscription payment record
  await prisma.subscriptionPayment.create({
    data: {
      subscription_id: subscription.id,
      payment_id: payment.id,
      amount: payment.amount / 100, // Convert paise to rupees
      currency: payment.currency,
      status: 'completed',
      period_start: new Date(subscription.current_start * 1000),
      period_end: new Date(subscription.current_end * 1000),
      metadata: {
        razorpay_payment_data: payment,
        razorpay_subscription_data: subscription
      }
    }
  });

  // Enhanced: Clear any pending retry attempts for successful payment
  try {
    // Find internal subscription record
    const internalSubscription = await prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['razorpay_subscription_id'],
          equals: subscription.id
        }
      }
    });

    if (internalSubscription) {
      // Cancel any active retry attempts
      await prisma.paymentRetry.updateMany({
        where: {
          subscription_id: internalSubscription.id,
          status: { in: ['scheduled', 'attempting'] }
        },
        data: {
          status: 'cancelled',
          metadata: {
            cancelled_reason: 'subscription_payment_succeeded',
            cancelled_at: new Date().toISOString()
          }
        }
      });

      // Cancel any active dunning campaigns
      await prisma.dunningCampaign.updateMany({
        where: {
          subscription_id: internalSubscription.id,
          status: 'active'
        },
        data: {
          status: 'completed',
          completed_at: new Date(),
          updated_at: new Date()
        }
      });

      // Update subscription status to active
      await prisma.subscription.update({
        where: { id: internalSubscription.id },
        data: {
          status: 'active',
          metadata: {
            ...JSON.parse(internalSubscription.metadata || '{}'),
            payment_retry_active: false,
            last_successful_payment: new Date().toISOString()
          },
          updated_at: new Date()
        }
      });

      console.log(`Cleared retry attempts and dunning for subscription: ${internalSubscription.id}`);
    }
  } catch (clearError) {
    console.error('Failed to clear retry attempts:', clearError);
    // Continue processing webhook even if clearing fails
  }
}

async function handleSubscriptionCancelled(payload: any) {
  const subscription = payload.subscription.entity;
  console.log(`Subscription cancelled: ${subscription.id}`);

  // Update partner subscription
  await prisma.partnerSubscription.updateMany({
    where: { external_subscription_id: subscription.id },
    data: {
      status: 'cancelled',
      cancelled_at: new Date(),
      updated_at: new Date()
    }
  });
}

async function handleSubscriptionPaused(payload: any) {
  const subscription = payload.subscription.entity;
  console.log(`Subscription paused: ${subscription.id}`);

  await prisma.partnerSubscription.updateMany({
    where: { external_subscription_id: subscription.id },
    data: {
      status: 'paused',
      updated_at: new Date()
    }
  });
}

async function handleSubscriptionResumed(payload: any) {
  const subscription = payload.subscription.entity;
  console.log(`Subscription resumed: ${subscription.id}`);

  await prisma.partnerSubscription.updateMany({
    where: { external_subscription_id: subscription.id },
    data: {
      status: 'active',
      updated_at: new Date()
    }
  });
}

async function handleRefundCreated(payload: any) {
  const refund = payload.refund.entity;
  console.log(`Refund created: ${refund.id} for payment ${refund.payment_id}`);

  // Find the original transaction and create a refund transaction
  const originalTransaction = await prisma.transaction.findFirst({
    where: { external_id: refund.payment_id }
  });

  if (originalTransaction) {
    await prisma.transaction.create({
      data: {
        revenue_stream_id: originalTransaction.revenue_stream_id,
        user_id: originalTransaction.user_id,
        partner_id: originalTransaction.partner_id,
        dog_id: originalTransaction.dog_id,
        transaction_type: 'refund',
        amount: -(refund.amount / 100), // Negative amount for refund
        currency: refund.currency,
        status: 'pending',
        payment_method: 'razorpay',
        external_id: refund.id,
        metadata: {
          original_transaction_id: originalTransaction.id,
          original_payment_id: refund.payment_id,
          refund_data: refund
        }
      }
    });
  }
}

async function handleRefundProcessed(payload: any) {
  const refund = payload.refund.entity;
  console.log(`Refund processed: ${refund.id}`);

  // Update refund transaction status
  await prisma.transaction.updateMany({
    where: { external_id: refund.id },
    data: {
      status: 'completed',
      processed_at: new Date()
    }
  });
}

// Helper function to get revenue stream ID for payment type
async function getRevenueStreamForPaymentType(paymentType: string): Promise<string | null> {
  const streamMap: { [key: string]: string } = {
    'subscription': 'Premium Subscriptions',
    'premium_service': 'Premium Services',
    'dog_id': 'Digital Dog ID',
    'appointment': 'Appointment Fees',
    'partner_subscription': 'Partner Subscriptions'
  };

  const streamName = streamMap[paymentType];
  if (!streamName) return null;

  const stream = await prisma.revenueStream.findFirst({
    where: { name: streamName, is_active: true }
  });

  return stream?.id || null;
}