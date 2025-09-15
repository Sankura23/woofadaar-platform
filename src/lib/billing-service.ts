// Week 25 Phase 2: Advanced Billing and Invoice Management
// GST compliance, automated billing, and invoice generation for India

import prisma from './db';
import { razorpayClient } from './razorpay';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  hsn_code?: string; // HSN/SAC code for GST
  gst_rate: number; // 18% for digital services in India
  gst_amount: number;
}

export interface GSTDetails {
  gstin?: string; // Customer's GSTIN if available
  billing_address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  place_of_supply: string; // State name for GST calculation
}

export interface Invoice {
  id: string;
  invoice_number: string;
  user_id: string;
  subscription_id?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  currency: string;
  issue_date: Date;
  due_date: Date;
  paid_date?: Date;
  line_items: InvoiceLineItem[];
  gst_details: GSTDetails;
  payment_terms: string;
  notes?: string;
  metadata?: any;
}

export interface BillingCycle {
  id: string;
  name: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  next_billing_date: Date;
  active_subscriptions: number;
  estimated_revenue: number;
}

export class AdvancedBillingService {
  // GST rates for different services in India
  private readonly GST_RATES = {
    digital_services: 18, // Premium subscriptions, digital services
    consulting: 18,       // Expert consultations
    physical_goods: 18,   // Dog ID cards, merchandise
    platform_fee: 18     // Platform/marketplace fees
  };

  private readonly HSN_CODES = {
    software_services: '998314',     // Software development services
    information_services: '998313',  // Information technology services
    digital_content: '998399',       // Other digital services
    consultation: '998311'           // Professional services
  };

  /**
   * Generate invoice for subscription billing
   */
  public async generateSubscriptionInvoice(
    userId: string,
    subscriptionId: string,
    billingPeriodStart: Date,
    billingPeriodEnd: Date
  ): Promise<{ success: boolean; invoice?: Invoice; message: string }> {
    try {
      // Get subscription details
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              metadata: true
            }
          }
        }
      });

      if (!subscription) {
        return { success: false, message: 'Subscription not found' };
      }

      // Get user's billing address
      const billingAddress = await this.getUserBillingAddress(userId);
      
      // Calculate subscription amount and GST
      const subscriptionAmount = subscription.amount_paid;
      const gstRate = this.GST_RATES.digital_services;
      const gstAmount = Math.round((subscriptionAmount * gstRate / 100) * 100) / 100;
      const totalAmount = subscriptionAmount + gstAmount;

      // Create invoice line items
      const lineItems: InvoiceLineItem[] = [
        {
          id: `sub-${subscriptionId}`,
          description: `${subscription.plan_type} Subscription (${this.formatDateRange(billingPeriodStart, billingPeriodEnd)})`,
          quantity: 1,
          unit_price: subscriptionAmount,
          total_price: subscriptionAmount,
          hsn_code: this.HSN_CODES.software_services,
          gst_rate: gstRate,
          gst_amount: gstAmount
        }
      ];

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create invoice record
      const invoice = await prisma.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          user_id: userId,
          subscription_id: subscriptionId,
          status: 'sent',
          subtotal: subscriptionAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          currency: 'INR',
          issue_date: new Date(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          line_items: JSON.stringify(lineItems),
          gst_details: JSON.stringify({
            billing_address: billingAddress,
            place_of_supply: billingAddress.state
          }),
          payment_terms: '7 days from invoice date',
          metadata: JSON.stringify({
            billing_period_start: billingPeriodStart,
            billing_period_end: billingPeriodEnd,
            subscription_billing_cycle: subscription.billing_cycle,
            generated_at: new Date().toISOString()
          })
        }
      });

      const invoiceData: Invoice = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        user_id: invoice.user_id,
        subscription_id: invoice.subscription_id || undefined,
        status: invoice.status as Invoice['status'],
        subtotal: invoice.subtotal,
        gst_amount: invoice.gst_amount,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        paid_date: invoice.paid_date || undefined,
        line_items: JSON.parse(invoice.line_items),
        gst_details: JSON.parse(invoice.gst_details),
        payment_terms: invoice.payment_terms,
        notes: invoice.notes || undefined,
        metadata: JSON.parse(invoice.metadata || '{}')
      };

      // Send invoice notification
      await this.sendInvoiceNotification(subscription.user, invoiceData);

      return {
        success: true,
        invoice: invoiceData,
        message: 'Invoice generated successfully'
      };

    } catch (error) {
      console.error('Error generating subscription invoice:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate invoice'
      };
    }
  }

  /**
   * Generate invoice for one-time services
   */
  public async generateServiceInvoice(
    userId: string,
    serviceType: string,
    serviceDetails: {
      description: string;
      amount: number;
      quantity?: number;
      metadata?: any;
    }[]
  ): Promise<{ success: boolean; invoice?: Invoice; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, metadata: true }
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const billingAddress = await this.getUserBillingAddress(userId);
      
      let subtotal = 0;
      let totalGst = 0;
      const lineItems: InvoiceLineItem[] = [];

      // Process each service
      serviceDetails.forEach((service, index) => {
        const quantity = service.quantity || 1;
        const unitPrice = service.amount;
        const totalPrice = unitPrice * quantity;
        const gstRate = this.getGstRateForService(serviceType);
        const gstAmount = Math.round((totalPrice * gstRate / 100) * 100) / 100;

        lineItems.push({
          id: `service-${index}`,
          description: service.description,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          hsn_code: this.getHsnCodeForService(serviceType),
          gst_rate: gstRate,
          gst_amount: gstAmount
        });

        subtotal += totalPrice;
        totalGst += gstAmount;
      });

      const totalAmount = subtotal + totalGst;
      const invoiceNumber = await this.generateInvoiceNumber();

      // Create invoice record
      const invoice = await prisma.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          user_id: userId,
          status: 'sent',
          subtotal,
          gst_amount: totalGst,
          total_amount: totalAmount,
          currency: 'INR',
          issue_date: new Date(),
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          line_items: JSON.stringify(lineItems),
          gst_details: JSON.stringify({
            billing_address: billingAddress,
            place_of_supply: billingAddress.state
          }),
          payment_terms: '7 days from invoice date',
          metadata: JSON.stringify({
            service_type: serviceType,
            generated_at: new Date().toISOString()
          })
        }
      });

      const invoiceData: Invoice = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        user_id: invoice.user_id,
        subscription_id: undefined,
        status: invoice.status as Invoice['status'],
        subtotal: invoice.subtotal,
        gst_amount: invoice.gst_amount,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        line_items: JSON.parse(invoice.line_items),
        gst_details: JSON.parse(invoice.gst_details),
        payment_terms: invoice.payment_terms,
        metadata: JSON.parse(invoice.metadata || '{}')
      };

      await this.sendInvoiceNotification(user, invoiceData);

      return {
        success: true,
        invoice: invoiceData,
        message: 'Service invoice generated successfully'
      };

    } catch (error) {
      console.error('Error generating service invoice:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate service invoice'
      };
    }
  }

  /**
   * Mark invoice as paid
   */
  public async markInvoicePaid(
    invoiceId: string,
    paymentId: string,
    paidAmount?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) {
        return { success: false, message: 'Invoice not found' };
      }

      if (invoice.status === 'paid') {
        return { success: false, message: 'Invoice already paid' };
      }

      const finalPaidAmount = paidAmount || invoice.total_amount;
      const isFullyPaid = finalPaidAmount >= invoice.total_amount;

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: isFullyPaid ? 'paid' : 'partially_paid',
          paid_date: isFullyPaid ? new Date() : null,
          metadata: JSON.stringify({
            ...JSON.parse(invoice.metadata || '{}'),
            payment_id: paymentId,
            paid_amount: finalPaidAmount,
            payment_date: new Date().toISOString()
          }),
          updated_at: new Date()
        }
      });

      return {
        success: true,
        message: isFullyPaid ? 'Invoice marked as paid' : 'Partial payment recorded'
      };

    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update invoice'
      };
    }
  }

  /**
   * Get invoices for user with filtering
   */
  public async getUserInvoices(
    userId: string,
    filters: {
      status?: Invoice['status'];
      from_date?: Date;
      to_date?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    invoices: Invoice[];
    total_count: number;
    total_amount_due: number;
  }> {
    try {
      const whereClause: any = { user_id: userId };

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.from_date || filters.to_date) {
        whereClause.issue_date = {};
        if (filters.from_date) {
          whereClause.issue_date.gte = filters.from_date;
        }
        if (filters.to_date) {
          whereClause.issue_date.lte = filters.to_date;
        }
      }

      const [invoices, totalCount] = await Promise.all([
        prisma.invoice.findMany({
          where: whereClause,
          orderBy: { issue_date: 'desc' },
          take: filters.limit || 50,
          skip: filters.offset || 0
        }),
        prisma.invoice.count({ where: whereClause })
      ]);

      // Calculate total amount due
      const totalAmountDue = await prisma.invoice.aggregate({
        where: {
          user_id: userId,
          status: { in: ['sent', 'overdue'] }
        },
        _sum: { total_amount: true }
      });

      const invoiceData: Invoice[] = invoices.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        user_id: invoice.user_id,
        subscription_id: invoice.subscription_id || undefined,
        status: invoice.status as Invoice['status'],
        subtotal: invoice.subtotal,
        gst_amount: invoice.gst_amount,
        total_amount: invoice.total_amount,
        currency: invoice.currency,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        paid_date: invoice.paid_date || undefined,
        line_items: JSON.parse(invoice.line_items),
        gst_details: JSON.parse(invoice.gst_details),
        payment_terms: invoice.payment_terms,
        notes: invoice.notes || undefined,
        metadata: JSON.parse(invoice.metadata || '{}')
      }));

      return {
        invoices: invoiceData,
        total_count: totalCount,
        total_amount_due: totalAmountDue._sum.total_amount || 0
      };

    } catch (error) {
      console.error('Error getting user invoices:', error);
      return {
        invoices: [],
        total_count: 0,
        total_amount_due: 0
      };
    }
  }

  // Private helper methods

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get count of invoices this month
    const startOfMonth = new Date(year, new Date().getMonth(), 1);
    const endOfMonth = new Date(year, new Date().getMonth() + 1, 0);
    
    const count = await prisma.invoice.count({
      where: {
        issue_date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `WD-${year}${month}-${sequence}`;
  }

  private async getUserBillingAddress(userId: string): Promise<GSTDetails['billing_address']> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, metadata: true }
    });

    // Try to get address from user metadata first
    if (user?.metadata) {
      const metadata = JSON.parse(user.metadata || '{}');
      if (metadata.billing_address) {
        return metadata.billing_address;
      }
    }

    // Return default address if not found
    return {
      name: user?.name || 'N/A',
      line1: 'Address not provided',
      city: 'Unknown',
      state: 'Unknown',
      postal_code: '000000',
      country: 'India'
    };
  }

  private getGstRateForService(serviceType: string): number {
    const serviceGstMap: { [key: string]: number } = {
      'subscription': this.GST_RATES.digital_services,
      'consultation': this.GST_RATES.consulting,
      'dog_id': this.GST_RATES.physical_goods,
      'platform_fee': this.GST_RATES.platform_fee
    };

    return serviceGstMap[serviceType] || this.GST_RATES.digital_services;
  }

  private getHsnCodeForService(serviceType: string): string {
    const serviceHsnMap: { [key: string]: string } = {
      'subscription': this.HSN_CODES.software_services,
      'consultation': this.HSN_CODES.consultation,
      'dog_id': this.HSN_CODES.digital_content,
      'platform_fee': this.HSN_CODES.information_services
    };

    return serviceHsnMap[serviceType] || this.HSN_CODES.software_services;
  }

  private formatDateRange(start: Date, end: Date): string {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    };
    
    return `${start.toLocaleDateString('en-IN', options)} - ${end.toLocaleDateString('en-IN', options)}`;
  }

  private async sendInvoiceNotification(user: any, invoice: Invoice): Promise<void> {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Sending invoice ${invoice.invoice_number} to ${user.email}`);
    console.log(`Amount: ₹${invoice.total_amount} | Due: ${invoice.due_date.toLocaleDateString()}`);
    
    // Implementation would send email with PDF invoice attachment
  }
}

// Export singleton instance
export const billingService = new AdvancedBillingService();