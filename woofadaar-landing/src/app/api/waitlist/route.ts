import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateWelcomeEmail(name: string, waitlistId: string, dogName?: string) {
  const firstName = name.split(' ')[0];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Woofadaar!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #FEFCF8;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">

                <!-- Header -->
                <tr>
                  <td style="padding: 0; position: relative; height: 150px; overflow: hidden; background-color: #3bbca8;">
                    <img src="https://woofadaar.com/woofadaar-logo-animated.gif" alt="Woofadaar" style="width: 100%; height: 150px; object-fit: cover; object-position: center; display: block;" />
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #6B5B73; font-size: 24px; font-weight: 600;">
                      Welcome to Woofadaar family, ${firstName}! 🎉
                    </h2>

                    <p style="margin: 0 0 16px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      ${dogName ? `We're so excited to have you and ${dogName} join our community!` : "We're so excited to have you join our community!"}
                    </p>

                    <p style="margin: 0 0 24px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      You're now on the waitlist for early access to Woofadaar, the all-in-one platform for dog parents who want the best for their furry friends.
                    </p>

                    <!-- What's Next Section -->
                    <div style="background-color: #FFF7E7; border-radius: 12px; padding: 24px; margin: 24px 0;">
                      <h3 style="margin: 0 0 16px 0; color: #6B5B73; font-size: 18px; font-weight: 600;">
                        What happens next? You've unlocked early access to:
                      </h3>
                      <div style="margin: 0; color: #4a4a4a; font-size: 15px; line-height: 2;">
                        <div style="margin-bottom: 8px;">✨ App launch</div>
                        <div style="margin-bottom: 8px;">✨ Exclusive early-bird member perks</div>
                        <div style="margin-bottom: 8px;">✨ Exclusive invites to meetups & events</div>
                        <div style="margin-bottom: 8px;">✨ Expert dog care tips</div>
                        <div style="margin-bottom: 0;">✨ And sneak peeks into all the exciting things we're building behind the scenes</div>
                      </div>
                    </div>

                    <p style="margin: 24px 0 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      In the meantime, follow us on Instagram <a href="https://www.instagram.com/woofadaarofficial/" style="color: #3bbca8; text-decoration: none; font-weight: 600;">@woofadaarofficial</a> to stay connected and see what we're building!
                    </p>

                    <p style="margin: 24px 0 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      Woofs & Regards,<br>
                      <strong style="color: #6B5B73;">Team Woofadaar</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #888888; font-size: 13px; line-height: 1.6;">
                      You're receiving this because you signed up for the Woofadaar waitlist.<br>
                      <a href="https://woofadaar.com/unsubscribe?id=${waitlistId}" style="color: #888888; text-decoration: underline;">Unsubscribe</a><br>
                      © 2025 Woofadaar. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      phone,
      location,
      dogName,
      dogBreed,
      dogAge,
      excitement,
      weeklyTips
    } = body;

    // Validate required fields
    if (!name || !email || !phone || !location || !excitement) {
      return NextResponse.json(
        { error: 'Please fill in all required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone number (10 digits, with optional country code)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit mobile number' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist' },
        { status: 409 }
      );
    }

    // Get current waitlist count for position
    const count = await prisma.waitlist.count();

    // Prepare interests field (combine dog info and excitement into a JSON string)
    const interests = JSON.stringify({
      dogName: dogName || null,
      dogBreed: dogBreed || null,
      dogAge: dogAge || null,
      excitement: excitement || null,
      weeklyTips: weeklyTips || false
    });

    // Create waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        id: randomBytes(16).toString('hex'),
        email,
        name,
        phone,
        location,
        dog_owner: !!(dogName || dogBreed || dogAge),
        interests,
        position: count + 1,
        updated_at: new Date(),
      }
    });

    // Send welcome email (don't fail the request if email fails)
    try {
      const emailResult = await resend.emails.send({
        from: 'Woofadaar <hello@woofadaar.com>',
        to: [email],
        subject: 'Welcome to Woofadaar! 🐕',
        html: generateWelcomeEmail(name, waitlistEntry.id, dogName),
      });
      console.log('Email sent successfully:', emailResult);

      // Send notification to admin
      await resend.emails.send({
        from: 'Woofadaar <hello@woofadaar.com>',
        to: ['hello@woofadaar.com'],
        subject: `New Waitlist Signup: ${name}`,
        html: `
          <h2>New Waitlist Signup!</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Dog Name:</strong> ${dogName || 'Not provided'}</p>
          <p><strong>Excitement:</strong> ${excitement}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      console.error('Email error details:', JSON.stringify(emailError, null, 2));
      // Continue anyway - user is still on waitlist
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully added to waitlist',
      position: waitlistEntry.position
    }, { status: 201 });

  } catch (error) {
    console.error('Waitlist API Error:', error);
    return NextResponse.json(
      { error: 'Failed to add to waitlist. Please try again.' },
      { status: 500 }
    );
  }
}
