-- Week 25 Phase 2: Coupon and Billing Management System
-- Advanced promotional codes, loyalty discounts, billing invoices, and payment retry logic

-- Create Coupon table for discount management
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minimum_order_amount" DOUBLE PRECISION,
    "maximum_discount_amount" DOUBLE PRECISION,
    "usage_limit" INTEGER,
    "usage_limit_per_user" INTEGER,
    "current_usage_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "applicable_plans" TEXT[],
    "first_time_users_only" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- Create CouponUsage table to track coupon usage
CREATE TABLE "CouponUsage" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "order_amount" DOUBLE PRECISION NOT NULL,
    "discount_amount" DOUBLE PRECISION NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- Create Invoice table for GST compliance and billing
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "payment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "gst_amount" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "payment_method" TEXT,
    "paid_at" TIMESTAMP(3),
    "gst_details" JSONB NOT NULL,
    "line_items" JSONB NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- Create PaymentRetry table for advanced retry logic
CREATE TABLE "PaymentRetry" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "user_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "next_retry_date" TIMESTAMP(3),
    "grace_period_end" TIMESTAMP(3),
    "grace_period_active" BOOLEAN NOT NULL DEFAULT false,
    "communication_sent" BOOLEAN NOT NULL DEFAULT false,
    "retry_reason" TEXT,
    "error_message" TEXT,
    "razorpay_order_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRetry_pkey" PRIMARY KEY ("id")
);

-- Create DunningCampaign table for customer communication
CREATE TABLE "DunningCampaign" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "payment_retry_id" TEXT,
    "campaign_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "communication_channel" TEXT NOT NULL DEFAULT 'email',
    "message_template" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "response_received" BOOLEAN NOT NULL DEFAULT false,
    "response_action" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DunningCampaign_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints and indexes
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_type_idx" ON "Coupon"("type");
CREATE INDEX "Coupon_valid_from_idx" ON "Coupon"("valid_from");
CREATE INDEX "Coupon_valid_until_idx" ON "Coupon"("valid_until");
CREATE INDEX "Coupon_is_active_idx" ON "Coupon"("is_active");
CREATE INDEX "Coupon_created_by_idx" ON "Coupon"("created_by");

CREATE INDEX "CouponUsage_coupon_id_idx" ON "CouponUsage"("coupon_id");
CREATE INDEX "CouponUsage_user_id_idx" ON "CouponUsage"("user_id");
CREATE INDEX "CouponUsage_subscription_id_idx" ON "CouponUsage"("subscription_id");
CREATE INDEX "CouponUsage_used_at_idx" ON "CouponUsage"("used_at");

CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON "Invoice"("invoice_number");
CREATE INDEX "Invoice_user_id_idx" ON "Invoice"("user_id");
CREATE INDEX "Invoice_subscription_id_idx" ON "Invoice"("subscription_id");
CREATE INDEX "Invoice_payment_id_idx" ON "Invoice"("payment_id");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_invoice_date_idx" ON "Invoice"("invoice_date");
CREATE INDEX "Invoice_due_date_idx" ON "Invoice"("due_date");

CREATE INDEX "PaymentRetry_subscription_id_idx" ON "PaymentRetry"("subscription_id");
CREATE INDEX "PaymentRetry_user_id_idx" ON "PaymentRetry"("user_id");
CREATE INDEX "PaymentRetry_status_idx" ON "PaymentRetry"("status");
CREATE INDEX "PaymentRetry_next_retry_date_idx" ON "PaymentRetry"("next_retry_date");
CREATE INDEX "PaymentRetry_grace_period_end_idx" ON "PaymentRetry"("grace_period_end");
CREATE INDEX "PaymentRetry_razorpay_order_id_idx" ON "PaymentRetry"("razorpay_order_id");

CREATE INDEX "DunningCampaign_user_id_idx" ON "DunningCampaign"("user_id");
CREATE INDEX "DunningCampaign_subscription_id_idx" ON "DunningCampaign"("subscription_id");
CREATE INDEX "DunningCampaign_payment_retry_id_idx" ON "DunningCampaign"("payment_retry_id");
CREATE INDEX "DunningCampaign_campaign_type_idx" ON "DunningCampaign"("campaign_type");
CREATE INDEX "DunningCampaign_status_idx" ON "DunningCampaign"("status");
CREATE INDEX "DunningCampaign_scheduled_at_idx" ON "DunningCampaign"("scheduled_at");

-- Add foreign key constraints
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRetry" ADD CONSTRAINT "PaymentRetry_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRetry" ADD CONSTRAINT "PaymentRetry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRetry" ADD CONSTRAINT "PaymentRetry_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DunningCampaign" ADD CONSTRAINT "DunningCampaign_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DunningCampaign" ADD CONSTRAINT "DunningCampaign_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DunningCampaign" ADD CONSTRAINT "DunningCampaign_payment_retry_id_fkey" FOREIGN KEY ("payment_retry_id") REFERENCES "PaymentRetry"("id") ON DELETE SET NULL ON UPDATE CASCADE;