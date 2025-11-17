import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function generateWelcomeEmail(name: string, dogName?: string) {
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
                  <td style="padding: 0; position: relative; height: 120px; overflow: hidden;">
                    <img src="https://woofadaar.com/woofadaar-logo-animated.gif" alt="Woofadaar" style="width: 100%; height: 120px; object-fit: cover; object-position: center; display: block;" />
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; color: #6B5B73; font-size: 24px; font-weight: 600;">
                      Welcome to the Pack, ${firstName}! 🎉
                    </h2>

                    <p style="margin: 0 0 16px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      ${dogName ? `We're so excited to have you and ${dogName} join our community!` : "We're so excited to have you join our community!"}
                    </p>

                    <p style="margin: 0 0 24px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      You're now on the waitlist for early access to Woofadaar — the all-in-one platform for dog parents who want the best for their furry friends.
                    </p>

                    <!-- What's Next Section -->
                    <div style="background-color: #FFF7E7; border-radius: 12px; padding: 24px; margin: 24px 0;">
                      <h3 style="margin: 0 0 16px 0; color: #6B5B73; font-size: 18px; font-weight: 600;">
                        What happens next? ✨
                      </h3>
                      <ul style="margin: 0; padding: 0 0 0 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                        <li style="margin-bottom: 8px;">We'll send you early access when we launch</li>
                        <li style="margin-bottom: 8px;">Get exclusive updates on new features & events</li>
                        <li style="margin-bottom: 8px;">Connect with a community of dog parents who truly understand</li>
                      </ul>
                    </div>

                    <p style="margin: 24px 0 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      In the meantime, follow us on Instagram <a href="https://www.instagram.com/woofadaarofficial/" style="color: #3bbca8; text-decoration: none; font-weight: 600;">@woofadaarofficial</a> to stay connected and see what we're building!
                    </p>

                    <p style="margin: 24px 0 0 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                      Tail wags and wet nose kisses,<br>
                      <strong style="color: #6B5B73;">The Woofadaar Team 🐾</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #888888; font-size: 13px; line-height: 1.6;">
                      You're receiving this because you signed up for the Woofadaar waitlist.<br>
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
    if (!name || !email || !phone || !location) {
      return NextResponse.json(
        { error: 'Name, email, mobile number, and location are required' },
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
      await resend.emails.send({
        from: 'Woofadaar <hello@woofadaar.com>',
        to: [email],
        subject: 'Welcome to Woofadaar! 🐕',
        html: generateWelcomeEmail(name, dogName),
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
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
