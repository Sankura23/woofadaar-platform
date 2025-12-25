// Weekly Email Template for Woofadaar

export interface WeeklyEmailContent {
  subject: string;
  preheader?: string;
  editionNumber?: number;
  date?: string;

  // Main story/article section
  story?: {
    title: string;
    content: string;
    image?: string;
  };

  // Product update section
  productUpdate?: {
    title: string;
    content: string;
    image?: string;
  };

  // Tips section (optional)
  tips?: {
    title: string;
    items: string[];
  };

  // Quote (optional)
  quote?: {
    text: string;
    author?: string;
  };

  // Closing message
  closing?: string;

  // Custom greeting (optional - overrides default "Hey {name}!")
  greeting?: string;
  subGreeting?: string;
}

export function generateWeeklyEmail(
  recipientName: string,
  waitlistId: string,
  content: WeeklyEmailContent
): string {
  const firstName = recipientName.split(' ')[0];
  const editionText = content.editionNumber ? `Edition #${content.editionNumber}` : '';
  const dateText = content.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Build story section if provided
  const storySection = content.story ? `
    <!-- Story Section -->
    <tr>
      <td style="padding: 16px 32px 0 32px;">
        ${content.story.image ? `
        <img src="${content.story.image}" alt="" style="width: 100%; height: 180px; object-fit: cover; border-radius: 12px; margin-bottom: 24px;" />
        ` : ''}
${content.story.title ? `<h2 style="margin: 0 0 16px 0; color: #2d2d2d; font-size: 22px; font-weight: 700; line-height: 1.3;">
          ${content.story.title}
        </h2>` : ''}
        <div style="color: #444; font-size: 15px; line-height: 1.8;">
          ${content.story.content}
        </div>
      </td>
    </tr>
  ` : '';

  // Build quote section if provided
  const quoteSection = content.quote ? `
    <!-- Quote Section -->
    <tr>
      <td style="padding: 28px 32px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #e8f5f2 0%, #f0faf8 100%); border-radius: 12px;">
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 12px 0; color: #3bbca8; font-size: 28px; line-height: 1;">
                "
              </p>
              <p style="margin: 0; color: #2d2d2d; font-size: 16px; font-style: italic; line-height: 1.7;">
                ${content.quote.text}
              </p>
              ${content.quote.author ? `
              <p style="margin: 16px 0 0 0; color: #6B5B73; font-size: 13px; font-weight: 600;">
                — ${content.quote.author}
              </p>
              ` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Build product update section if provided
  const productUpdateSection = content.productUpdate ? `
    <!-- Product Update Section -->
    <tr>
      <td style="padding: 16px 32px 32px 32px;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; border: 2px solid #3bbca8; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #3bbca8; padding: 16px 24px;">
              <p style="margin: 0; color: #fff; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                Under the Hood - Here's What's Coming!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <h3 style="margin: 0 0 14px 0; color: #2d2d2d; font-size: 20px; font-weight: 700;">
                ${content.productUpdate.title}
              </h3>
              <div style="color: #444; font-size: 15px; line-height: 1.8;">
                ${content.productUpdate.content}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Build tips section if provided
  const tipsSection = content.tips ? `
    <!-- Tips Section -->
    <tr>
      <td style="padding: 0 32px 32px 32px;">
        <h3 style="margin: 0 0 20px 0; color: #2d2d2d; font-size: 20px; font-weight: 700;">
          ${content.tips.title}
        </h3>
        ${content.tips.items.map((tip, index) => `
        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; background-color: #fafafa; border-radius: 8px;">
          <tr>
            <td style="width: 44px; vertical-align: top; padding: 16px;">
              <div style="width: 28px; height: 28px; background-color: #3bbca8; border-radius: 50%; color: #fff; font-size: 14px; font-weight: 700; text-align: center; line-height: 28px;">
                ${index + 1}
              </div>
            </td>
            <td style="padding: 16px 16px 16px 0; color: #444; font-size: 15px; line-height: 1.6;">
              ${tip}
            </td>
          </tr>
        </table>
        `).join('')}
      </td>
    </tr>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${content.subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FEFCF8; -webkit-font-smoothing: antialiased;">

  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${content.preheader || content.subject}&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;
  </div>

  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #FEFCF8;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.08);">

          <!-- Header Image with Christmas Elements -->
          <tr>
            <td style="padding: 0; background: linear-gradient(135deg, #1a5c4c 0%, #3bbca8 50%, #1a5c4c 100%); position: relative;">
              <!-- Snowflake decorations -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: left; vertical-align: top; padding: 8px 12px; font-size: 20px;">
                    ❄️
                  </td>
                  <td style="text-align: center;">
                    <a href="https://woofadaar.com" style="display: block;">
                      <img src="https://woofadaar.com/woofadaar-logo-animated.gif" alt="Woofadaar" style="width: 100%; max-width: 400px; height: 120px; object-fit: cover; object-position: center; display: block; margin: 0 auto;" />
                    </a>
                  </td>
                  <td style="text-align: right; vertical-align: top; padding: 8px 12px; font-size: 20px;">
                    ❄️
                  </td>
                </tr>
              </table>
              <!-- Christmas trim at bottom -->
              <div style="height: 4px; background: linear-gradient(90deg, #c41e3a 0%, #ffd700 25%, #c41e3a 50%, #ffd700 75%, #c41e3a 100%);"></div>
            </td>
          </tr>

          <!-- Edition Badge -->
          <tr>
            <td align="center" style="padding: 24px 32px 0 32px;">
              <table role="presentation" style="border-collapse: collapse;">
                <tr>
                  <td style="background-color: #FFF7E7; padding: 8px 16px; border-radius: 20px;">
                    <p style="margin: 0; color: #6B5B73; font-size: 12px; font-weight: 600;">
                      ${editionText}${editionText && dateText ? ' · ' : ''}${dateText}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 16px 0; color: #2d2d2d; font-size: 28px; font-weight: 700;">
                ${content.greeting ? content.greeting.replace('{name}', firstName) : `Hi ${firstName},`}
              </h1>
              ${content.subGreeting ? `<p style="margin: 0; color: #444; font-size: 16px; line-height: 1.8;">${content.subGreeting}</p>` : ''}
            </td>
          </tr>

          ${storySection}
          ${quoteSection}
          ${productUpdateSection}
          ${tipsSection}

          <!-- Closing -->
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <div style="height: 1px; background: linear-gradient(to right, transparent, #e0e0e0, transparent); margin-bottom: 28px;"></div>
              <p style="margin: 0 0 20px 0; color: #000; font-size: 15px; line-height: 1.7;">
                ${content.closing || "That's all for this week. Thanks for being part of our journey."}
              </p>
              <p style="margin: 0; color: #444; font-size: 15px;">
                Woofs & Regards,<br>
                <strong style="color: #6B5B73;">Team Woofadaar</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 28px 32px; border-top: 1px solid #eee;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <!-- Social Button -->
                    <a href="https://www.instagram.com/woofadaarofficial/" style="display: inline-block; background-color: #e05a37; color: #fff; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 20px; margin-bottom: 16px;">
                      Follow us on Instagram
                    </a>
                    <p style="margin: 16px 0 0 0; color: #999; font-size: 12px; line-height: 1.6;">
                      You're receiving this because you joined the Woofadaar waitlist.
                      <br>
                      <a href="https://woofadaar.com/unsubscribe?id=${waitlistId}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
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
