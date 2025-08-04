export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export const emailTemplates = {
  welcome: (name: string, position: number): EmailTemplate => ({
    subject: '🐕 Welcome to the Woofadaar Pack!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Woofadaar</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3bbca8 0%, #339990 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
            .position-badge { background: #3bbca8; color: white; padding: 15px 25px; border-radius: 50px; display: inline-block; font-weight: bold; margin: 20px 0; }
            .benefits { background: #fef8e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
            .button { background: #e05a37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🐕 Welcome to Woofadaar!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">India's First Comprehensive Dog Parent Community</p>
            </div>
            
            <div class="content">
              <h2>Hi ${name}!</h2>
              
              <p>Thank you for joining the Woofadaar waitlist! We're thrilled to have you as part of our growing community of dog parents across India.</p>
              
              <div style="text-align: center;">
                <div class="position-badge">
                  You're #${position} on the waitlist! 🎉
                </div>
              </div>
              
              <div class="benefits">
                <h3 style="color: #3bbca8; margin-top: 0;">🌟 What's Coming Your Way:</h3>
                <ul style="padding-left: 20px;">
                  <li><strong>Expert Q&A Community</strong> - Get answers from veterinarians and experienced dog parents</li>
                  <li><strong>Dog Health Tracking</strong> - Monitor your dog's health, vaccinations, and milestones</li>
                  <li><strong>Local Communities</strong> - Connect with dog parents in your city</li>
                  <li><strong>Training Resources</strong> - Access to training guides and expert tips</li>
                  <li><strong>Multilingual Support</strong> - Available in Hindi and English</li>
                </ul>
              </div>
              
              <div style="background: linear-gradient(135deg, #e05a37 0%, #d14d2a 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">🎁 Early Bird Benefits</h3>
                <ul style="padding-left: 20px; margin: 0;">
                  <li>Free premium features for first 6 months</li>
                  <li>Exclusive access to expert sessions</li>
                  <li>Priority support and feature requests</li>
                  <li>Special founder member badge</li>
                </ul>
              </div>
              
              <p>We're working hard to launch Woofadaar and can't wait to share it with you. In the meantime, follow us on social media for updates and dog parenting tips!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p>Questions? Suggestions? We'd love to hear from you!</p>
                <a href="mailto:hello@woofadaar.com" class="button">Contact Us</a>
              </div>
            </div>
            
            <div class="footer">
              <p>🐾 Happy Tail Wagging! 🐾</p>
              <p style="margin: 5px 0;">The Woofadaar Team</p>
              <p style="font-size: 12px; margin: 15px 0 0 0;">
                You're receiving this because you joined our waitlist at woofadaar.com
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Woofadaar, ${name}!

Thank you for joining the waitlist for India's first comprehensive dog parent community.

You're #${position} on the waitlist! 🎉

What's Coming Your Way:
• Expert Q&A Community - Get answers from veterinarians and experienced dog parents
• Dog Health Tracking - Monitor your dog's health, vaccinations, and milestones  
• Local Communities - Connect with dog parents in your city
• Training Resources - Access to training guides and expert tips
• Multilingual Support - Available in Hindi and English

Early Bird Benefits:
• Free premium features for first 6 months
• Exclusive access to expert sessions
• Priority support and feature requests
• Special founder member badge

We can't wait to share Woofadaar with you!

Happy Tail Wagging!
The Woofadaar Team

Contact us: hello@woofadaar.com
    `
  }),

  weeklyEngagement: (name: string): EmailTemplate => ({
    subject: '🐕 Weekly Woofadaar Update: Tips & Community News',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Woofadaar Weekly Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3bbca8 0%, #339990 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 25px; border: 1px solid #e0e0e0; }
            .tip-box { background: #fef8e8; border-left: 4px solid #e05a37; padding: 15px; margin: 15px 0; }
            .community-stat { background: #f0fffe; border: 1px solid #3bbca8; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🐕 Weekly Woofadaar Update</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${name}!</h2>
              
              <p>Hope you and your furry friend are having a fantastic week! Here's your weekly dose of dog parenting wisdom and community updates.</p>
              
              <div class="community-stat">
                <h3 style="color: #3bbca8; margin: 0 0 10px 0;">🎉 Community Growing Strong!</h3>
                <p style="margin: 0;">We now have <strong>500+ dog parents</strong> on our waitlist from across India!</p>
              </div>
              
              <div class="tip-box">
                <h3 style="color: #e05a37; margin-top: 0;">💡 This Week's Dog Parenting Tip</h3>
                <p><strong>Monsoon Health Care:</strong> During the rainy season, keep your dog's paws dry and clean after walks. Moisture between toes can lead to infections. Consider using pet-safe paw balm for extra protection!</p>
              </div>
              
              <h3>🏙️ Community Spotlight: Mumbai Dog Parents</h3>
              <p>This week we're highlighting our amazing Mumbai dog parent community! Did you know that Mumbai has the highest number of signups on our waitlist? From Marine Drive morning walks to Sanjay Gandhi National Park adventures, Mumbai's dog parents are truly passionate!</p>
              
              <h3>🔜 Coming Soon in Woofadaar</h3>
              <ul>
                <li>City-wise dog parent groups</li>
                <li>Monsoon care guides by local vets</li>
                <li>Dog-friendly places directory</li>
                <li>Training session bookings</li>
              </ul>
              
              <p style="background: #e8f5e8; padding: 15px; border-radius: 6px; text-align: center;">
                <strong>🚀 Launch Update:</strong> We're 70% done with development! Can't wait to share Woofadaar with you soon.
              </p>
            </div>
            
            <div class="footer">
              <p>🐾 Keep those tails wagging! 🐾</p>
              <p style="font-size: 12px;">The Woofadaar Team</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Weekly Woofadaar Update

Hi ${name}!

Hope you and your furry friend are having a fantastic week!

🎉 Community Growing Strong!
We now have 500+ dog parents on our waitlist from across India!

💡 This Week's Dog Parenting Tip
Monsoon Health Care: During the rainy season, keep your dog's paws dry and clean after walks. Moisture between toes can lead to infections. Consider using pet-safe paw balm for extra protection!

🏙️ Community Spotlight: Mumbai Dog Parents
Mumbai has the highest number of signups on our waitlist! From Marine Drive morning walks to Sanjay Gandhi National Park adventures, Mumbai's dog parents are truly passionate!

🔜 Coming Soon in Woofadaar
• City-wise dog parent groups
• Monsoon care guides by local vets  
• Dog-friendly places directory
• Training session bookings

🚀 Launch Update: We're 70% done with development!

Keep those tails wagging!
The Woofadaar Team
    `
  }),

  partnerRegistration: (name: string, partnerType: string): EmailTemplate => ({
    subject: '🤝 Thank you for your partnership application - Woofadaar',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Partnership Application Received</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3bbca8 0%, #339990 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
            .steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .step { display: flex; align-items: flex-start; margin-bottom: 15px; }
            .step-number { background: #3bbca8; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🤝 Partnership Application Received</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your interest in partnering with Woofadaar</p>
            </div>
            
            <div class="content">
              <h2>Hi ${name}!</h2>
              
              <p>Thank you for your interest in partnering with Woofadaar! We've received your application as a <strong>${partnerType}</strong> and are excited about the possibility of working together.</p>
              
              <div class="steps">
                <h3 style="color: #3bbca8; margin-top: 0;">📋 What happens next?</h3>
                
                <div class="step">
                  <div class="step-number">1</div>
                  <div>
                    <strong>Application Review</strong><br>
                    Our team will carefully review your credentials and experience within 3-5 business days.
                  </div>
                </div>
                
                <div class="step">
                  <div class="step-number">2</div>
                  <div>
                    <strong>Email Updates</strong><br>
                    We'll keep you informed about your application status via email.
                  </div>
                </div>
                
                <div class="step">
                  <div class="step-number">3</div>
                  <div>
                    <strong>Partner Portal Access</strong><br>
                    Upon approval, you'll receive access to our exclusive partner portal.
                  </div>
                </div>
                
                <div class="step">
                  <div class="step-number">4</div>
                  <div>
                    <strong>Verified Partner Listing</strong><br>
                    You'll be listed in our verified partner directory for dog parents to discover.
                  </div>
                </div>
              </div>
              
              <div style="background: linear-gradient(135deg, #e05a37 0%, #d14d2a 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">🌟 Why Partner with Woofadaar?</h3>
                <ul style="padding-left: 20px; margin: 0;">
                  <li>Reach thousands of engaged dog parents across India</li>
                  <li>Access to our comprehensive Health ID verification system</li>
                  <li>Professional profile and booking management tools</li>
                  <li>Community-driven growth and networking opportunities</li>
                </ul>
              </div>
              
              <p>We appreciate your patience during the review process. If you have any questions, feel free to reply to this email.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p>Questions? We're here to help!</p>
                <a href="mailto:partners@woofadaar.com" style="background: #3bbca8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Contact Our Team</a>
              </div>
            </div>
            
            <div class="footer">
              <p>🤝 Looking forward to partnering with you!</p>
              <p style="margin: 5px 0;">The Woofadaar Partnership Team</p>
              <p style="font-size: 12px; margin: 15px 0 0 0;">
                You're receiving this because you applied for partnership at woofadaar.com
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Partnership Application Received

Hi ${name}!

Thank you for your interest in partnering with Woofadaar! We've received your application as a ${partnerType} and are excited about the possibility of working together.

📋 What happens next?

1. Application Review
   Our team will carefully review your credentials and experience within 3-5 business days.

2. Email Updates
   We'll keep you informed about your application status via email.

3. Partner Portal Access
   Upon approval, you'll receive access to our exclusive partner portal.

4. Verified Partner Listing
   You'll be listed in our verified partner directory for dog parents to discover.

🌟 Why Partner with Woofadaar?
• Reach thousands of engaged dog parents across India
• Access to our comprehensive Health ID verification system
• Professional profile and booking management tools
• Community-driven growth and networking opportunities

We appreciate your patience during the review process. If you have any questions, feel free to reply to this email.

Contact us: partners@woofadaar.com

Looking forward to partnering with you!
The Woofadaar Partnership Team
    `
  }),

  launchNotification: (name: string): EmailTemplate => ({
    subject: '🚀 Woofadaar is LIVE! Your dog parenting community awaits',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Woofadaar is Live!</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3bbca8 0%, #339990 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
            .cta-button { background: #e05a37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 18px; }
            .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .feature-box { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🚀 WOOFADAAR IS LIVE!</h1>
              <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.9;">Your dog parenting community is ready!</p>
            </div>
            
            <div class="content">
              <h2>Hi ${name}!</h2>
              
              <p style="font-size: 18px;">The wait is over! 🎉</p>
              
              <p>Woofadaar is officially live and ready to welcome you into India's most comprehensive dog parent community. Thank you for being part of our journey from day one!</p>
              
              <div style="text-align: center;">
                <a href="https://woofadaar.com/login" class="cta-button">Join Woofadaar Now! 🐕</a>
              </div>
              
              <div style="background: linear-gradient(135deg, #fef8e8 0%, #f0f8ff 100%); padding: 25px; border-radius: 8px; margin: 25px 0;">
                <h3 style="text-align: center; color: #3bbca8; margin-top: 0;">🎁 Your Exclusive Early Bird Benefits Are Active!</h3>
                <ul style="padding-left: 20px;">
                  <li>✅ <strong>Free Premium Access</strong> for 6 months (worth ₹2,999)</li>
                  <li>✅ <strong>Founder Member Badge</strong> on your profile</li>
                  <li>✅ <strong>Priority Expert Sessions</strong> access</li>
                  <li>✅ <strong>Direct line to our team</strong> for feature requests</li>
                </ul>
              </div>
              
              <h3>🌟 What's Available Right Now:</h3>
              
              <div class="feature-grid">
                <div class="feature-box">
                  <h4 style="color: #3bbca8; margin: 0 0 10px 0;">💬 Expert Q&A</h4>
                  <p style="margin: 0; font-size: 14px;">Get answers from verified vets and trainers</p>
                </div>
                <div class="feature-box">
                  <h4 style="color: #e05a37; margin: 0 0 10px 0;">📊 Health Tracking</h4>
                  <p style="margin: 0; font-size: 14px;">Monitor your dog's health journey</p>
                </div>
                <div class="feature-box">
                  <h4 style="color: #3bbca8; margin: 0 0 10px 0;">🏙️ Local Groups</h4>
                  <p style="margin: 0; font-size: 14px;">Connect with parents in your city</p>
                </div>
                <div class="feature-box">
                  <h4 style="color: #e05a37; margin: 0 0 10px 0;">📚 Resources</h4>
                  <p style="margin: 0; font-size: 14px;">Training guides and expert tips</p>
                </div>
              </div>
              
              <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; color: #2d5a3d;">🎯 Complete Your Profile Today</h3>
                <p style="margin: 0;">Add your dog's details and get personalized recommendations from day one!</p>
              </div>
              
              <p>Ready to join thousands of dog parents who are already sharing, learning, and growing together?</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://woofadaar.com/register" class="cta-button">Create Your Account →</a>
              </div>
            </div>
            
            <div class="footer">
              <p style="font-size: 18px;">🐾 Welcome to the Pack! 🐾</p>
              <p>The Woofadaar Team</p>
              <p style="font-size: 12px; margin: 15px 0 0 0;">
                Need help getting started? Reply to this email or visit our help center.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
🚀 WOOFADAAR IS LIVE!

Hi ${name}!

The wait is over! 🎉

Woofadaar is officially live and ready to welcome you into India's most comprehensive dog parent community.

🎁 Your Exclusive Early Bird Benefits Are Active!
✅ Free Premium Access for 6 months (worth ₹2,999)
✅ Founder Member Badge on your profile  
✅ Priority Expert Sessions access
✅ Direct line to our team for feature requests

🌟 What's Available Right Now:
• Expert Q&A - Get answers from verified vets and trainers
• Health Tracking - Monitor your dog's health journey
• Local Groups - Connect with parents in your city  
• Resources - Training guides and expert tips

🎯 Complete Your Profile Today
Add your dog's details and get personalized recommendations from day one!

Join Woofadaar Now: https://woofadaar.com/register

Welcome to the Pack!
The Woofadaar Team

Need help? Reply to this email or visit our help center.
    `
  })
};

export async function sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
  try {
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log(`Sending email to ${to}:`);
    console.log(`Subject: ${template.subject}`);
    console.log(`Text: ${template.text.substring(0, 100)}...`);
    
    // For now, just log the email content
    // In production, implement your email service integration here
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string, position: number): Promise<boolean> {
  const template = emailTemplates.welcome(name, position);
  return sendEmail(email, template);
}

export async function sendWeeklyEngagement(email: string, name: string): Promise<boolean> {
  const template = emailTemplates.weeklyEngagement(name);
  return sendEmail(email, template);
}

export async function sendLaunchNotification(email: string, name: string): Promise<boolean> {
  const template = emailTemplates.launchNotification(name);
  return sendEmail(email, template);
}

export async function sendPartnerRegistrationEmail(email: string, name: string, partnerType: string): Promise<boolean> {
  const template = emailTemplates.partnerRegistration(name, partnerType);
  return sendEmail(email, template);
}