import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateWeeklyEmail, WeeklyEmailContent } from '@/lib/weekly-email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

// This week's email content - UPDATE THIS EACH WEEK
// Note: greeting will use recipient name dynamically (e.g., "Hi Sanket,")
const THIS_WEEKS_CONTENT: WeeklyEmailContent = {
  subject: "Santa pawsed by to drop this Woof Byte",
  preheader: "If your dog has been extra alert today, it's probably because Santa is approaching...",
  editionNumber: 3,
  date: "December 25, 2025",

  greeting: "Hi {name},",
  subGreeting: "If your dog has been extra alert today, it's probably because Santa is approaching... 🎄🎅🍬 or the snack drawer opened.<br><br>Hope you're reading this with fur on your clothes while someone with four paws supervises.<br><br>We're back again with your next Woof Byte. We came across a heartwarming story of a dog named Barry and wanted to share it with you. Read on!",

  story: {
    title: "",
    content: `
      <p style="margin: 0 0 16px 0; color: #444; font-style: italic;">
        Over two centuries ago, in the snowy Swiss Alps, there lived a remarkable dog named Barry, a St. Bernard who became one of history's earliest rescue dogs. According to historical records, Barry served with monks at the Great St. Bernard Hospice, helping travellers cross dangerous mountain passes. Over his lifetime, he is credited with saving more than 40 lives of people lost or stranded in the cold and snow. After he passed away in 1814, Barry's body was preserved and put on display at the Natural History Museum in Bern, Switzerland as a tribute to his service and loyalty.
      </p>

      <!-- Barry's Image -->
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td align="center">
            <img src="https://woofadaar.com/email/barry-dog.jpg" alt="Barry the St. Bernard" style="width: 100%; max-width: 400px; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 16px 0; color: #444;">
        And honestly, stories like Barry's keep reminding us why dog parenting feels so different from everything else.
      </p>
      <p style="margin: 0 0 16px 0; color: #444;">
        It's not about doing everything perfectly.
      </p>
      <p style="margin: 0 0 4px 0; color: #444;">
        It's about showing up.
      </p>
      <p style="margin: 0 0 4px 0; color: #444;">
        For the walks.
      </p>
      <p style="margin: 0 0 4px 0; color: #444;">
        The vet visits.
      </p>
      <p style="margin: 0 0 4px 0; color: #444;">
        The bad days.
      </p>
      <p style="margin: 0 0 4px 0; color: #444;">
        The silly days.
      </p>
      <p style="margin: 0 0 16px 0; color: #444;">
        And all the in-between moments that quietly add up to a life.
      </p>
      <p style="margin: 0; color: #444;">
        That thought has been sitting with us a lot lately at Woofadaar.
      </p>
    `,
  },

  productUpdate: {
    title: "Woofadaar Meet-ups & Events",
    content: `
      <p style="margin: 0 0 16px 0; color: #444;">
        Behind the scenes, we've been working on something we're really excited about: real-world Woofadaar meet-ups and events.
      </p>
      <p style="margin: 0 0 16px 0; color: #444;">
        Imagine how lovely it would feel to be in a space full of fur friends and parents who just get it.
      </p>
      <p style="margin: 0 0 16px 0; color: #444;">
        Spaces where dog parents can show up with their dogs, meet others who are on the dog parenting boat and build connections that don't stay stuck online.
      </p>
      <p style="margin: 0 0 8px 0; color: #444;">
        Playdates.
      </p>
      <p style="margin: 0 0 8px 0; color: #444;">
        Workshops.
      </p>
      <p style="margin: 0 0 8px 0; color: #444;">
        Casual hangs.
      </p>
      <p style="margin: 0 0 16px 0; color: #444;">
        Moments where you do fun things with yours and other dogs.
      </p>
      <p style="margin: 0; color: #444;">
        As we shape these experiences, we'd love for you to stay close to the journey.
      </p>
    `,
  },

  closing: `<p style="margin: 0 0 16px 0; color: #444;">If you're not already there, follow us on Instagram for early updates, behind-the-scenes peeks and first invites as things come together.</p>
    <p style="margin: 0 0 4px 0; color: #444;">And if you ever feel like sharing your dog's story...</p>
    <p style="margin: 0 0 4px 0; color: #444;">The ordinary, funny, healing, chaotic kind...</p>
    <p style="margin: 0 0 16px 0; color: #444;">Our Instagram DMs are always open!</p>
    <p style="margin: 0 0 16px 0; color: #444;">Send us your dog's Woof Story. We'd love to tell it to the world.</p>
    <span style="color: #000;">Your next Woof Byte lands next Thursday.</span><br><br>
    <span style="color: #000;">From our little dog-loving corner to yours, Merry Christmas and extra belly rubs all around.</span><br>
    <span style="color: #000;">Team Woofadaar</span><br><br>
    <span style="color: #000;">(We'll see you very soon)</span>`,
};

export async function POST(request: NextRequest) {
  try {
    // Verify the request has proper authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.WEEKLY_EMAIL_SECRET || process.env.CRON_SECRET;

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testEmail, sendToAll } = body;

    // If testEmail is provided, only send to that email
    if (testEmail) {
      const html = generateWeeklyEmail(
        'Test User',
        'test-id-12345',
        THIS_WEEKS_CONTENT
      );

      const result = await resend.emails.send({
        from: 'Woofadaar <hello@woofadaar.com>',
        to: [testEmail],
        subject: THIS_WEEKS_CONTENT.subject,
        html,
      });

      return NextResponse.json({
        success: true,
        message: `Test email sent to ${testEmail}`,
        result,
      });
    }

    // If sendToAll is true, fetch all subscribers and send
    if (sendToAll) {
      // TODO: Implement fetching from Google Sheet or Prisma
      // For now, return an error
      return NextResponse.json(
        { error: 'Bulk sending not yet implemented. Use testEmail for now.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Please provide testEmail or set sendToAll to true' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Weekly email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to preview the email HTML
export async function GET(request: NextRequest) {
  const html = generateWeeklyEmail(
    'Preview User',
    'preview-id',
    THIS_WEEKS_CONTENT
  );

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
