// Email service for Supabase Edge Functions
// Note: This is a Deno environment, so we use Deno APIs instead of Node.js

export interface NotificationJob {
  id: string;
  org_id: string;
  user_id?: string;
  email: string;
  type: 'new_event' | 'new_message' | 'payment_receipt' | 'event_reminder' | 'registration_confirmation' | 'team_invite' | 'password_reset' | 'welcome_email' | 'guardian_invite' | 'ticket_receipt';
  payload: Record<string, any>;
  status: 'queued' | 'sent' | 'failed';
  error?: string;
  created_at: string;
  sent_at?: string;
}

export interface EmailResult {
  success: boolean;
  error?: string;
  emailId?: string;
}

// Email subjects and preview text
const EMAIL_CONFIG = {
  new_event: {
    subject: 'New Event: {{event_title}}',
    preview: 'A new event has been scheduled for your team'
  },
  new_message: {
    subject: 'New Message from {{sender_name}}',
    preview: 'You have a new message in Team Hub'
  },
  payment_receipt: {
    subject: 'Payment Receipt - ${{amount}}',
    preview: 'Your payment has been processed successfully'
  },
  event_reminder: {
    subject: 'Reminder: {{event_title}}',
    preview: 'Upcoming event reminder'
  },
  registration_confirmation: {
    subject: 'Registration Confirmed',
    preview: 'Your registration has been confirmed'
  },
  team_invite: {
    subject: 'You\'re invited to join {{team_name}}',
    preview: 'Join your team on YouthSports Team Hub'
  },
  password_reset: {
    subject: 'Reset Your Password',
    preview: 'Password reset instructions'
  },
  welcome_email: {
    subject: 'Welcome to YouthSports Team Hub',
    preview: 'Get started with your new account'
  },
  guardian_invite: {
    subject: 'You\'re invited to connect with {{athlete_name}}',
    preview: 'Accept your guardian invite on YouthSports Team Hub'
  },
  ticket_receipt: {
    subject: 'Your Tickets: {{event_title}}',
    preview: 'Your tickets are ready'
  }
};

/**
 * Send a notification email using the compiled MJML template
 */
export async function sendNotificationEmail(job: NotificationJob): Promise<EmailResult> {
  try {
    // Load compiled HTML template from Supabase storage or external URL
    // For now, we'll use a simple approach - templates should be hosted or embedded
    const htmlContent = await loadTemplate(job.type, job.payload);

    // Get subject and preview
    const config = EMAIL_CONFIG[job.type];
    if (!config) {
      throw new Error(`Unknown email type: ${job.type}`);
    }

    let subject = injectVariables(config.subject, job.payload);
    const preview = injectVariables(config.preview, job.payload);

    // Generate plain text fallback
    const textContent = generatePlainText(htmlContent);

    // Send email via Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable not set');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'notifications@youthsports.team',
        to: job.email,
        subject,
        html: htmlContent,
        text: textContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${response.status} ${errorData}`);
    }

    const result = await response.json();

    return {
      success: true,
      emailId: result.id
    };

  } catch (error) {
    console.error('Failed to send notification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Load email template - in production this would load from storage or be embedded
 */
async function loadTemplate(type: string, payload: Record<string, any>): Promise<string> {
  // For now, return a basic HTML template
  // In production, you'd load the compiled MJML from Supabase storage or embed it
  const templates: Record<string, string> = {
    new_event: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Event: {{event_title}}</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
            <h1 style="color: #1e293b; margin-bottom: 20px;">YouthSports Team Hub</h1>
            <h2 style="color: #1e293b;">New Event: {{event_title}}</h2>
            <p>Hi {{recipient_name}},</p>
            <p>A new event has been scheduled for your team:</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>{{event_title}}</h3>
              <p>📅 {{event_date}}<br>🕐 {{event_time}}<br>📍 {{event_location}}</p>
              {{#if event_description}}<p>{{event_description}}</p>{{/if}}
            </div>
            <p>{{#if is_required}}This is a required event. Please make sure to attend.{{else}}This is an optional event.{{/if}}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Event</a>
            </div>
            <p>Questions? Contact your coach or team administrator.</p>
          </div>
        </body>
      </html>
    `,
    new_message: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Message from {{sender_name}}</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
            <h1 style="color: #1e293b; margin-bottom: 20px;">YouthSports Team Hub</h1>
            <h2 style="color: #1e293b;">New Message from {{sender_name}}</h2>
            <p>Hi {{recipient_name}},</p>
            <p>You have a new message{{#if team_name}} for {{team_name}}{{/if}}:</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>From: {{sender_name}}{{#if sender_role}} ({{sender_role}}){{/if}}</strong></p>
              <p style="font-style: italic;">"{{message_content}}"</p>
              {{#if message_subject}}<p><strong>Subject: {{message_subject}}</strong></p>{{/if}}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Message</a>
            </div>
            <p>You can reply to this message through the Team Hub app.</p>
          </div>
        </body>
      </html>
    `,
    payment_receipt: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Receipt</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
            <h1 style="color: #1e293b; margin-bottom: 20px;">YouthSports Team Hub</h1>
            <h2 style="color: #1e293b;">Payment Receipt</h2>
            <p>Hi {{recipient_name}},</p>
            <p>Thank you for your payment. Here are the details:</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Payment Details</h3>
              <p>Amount: \${{amount}}<br>Date: {{payment_date}}<br>Transaction ID: {{transaction_id}}</p>
              {{#if description}}<p>Description: {{description}}</p>{{/if}}
            </div>
            {{#if items}}
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Items Purchased</h3>
              {{#each items}}
              <p>{{name}} - \${{price}}</p>
              {{/each}}
            </div>
            {{/if}}
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{url}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Receipt</a>
            </div>
            <p>If you have any questions about this payment, please contact your organization administrator.</p>
          </div>
        </body>
      </html>
    `,
    ticket_receipt: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Tickets</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Your Tickets</h1>
          
          <p>Thank you for your purchase!</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">{{event_title}}</h2>
            <p><strong>Date:</strong> {{event_date}}</p>
            <p><strong>Location:</strong> {{event_location}}</p>
          </div>
          
          <h3>Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #e5e7eb;">
                <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Ticket Type</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #d1d5db;">Qty</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Price</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Total</th>
              </tr>
            </thead>
            <tbody>
              {{items_html}}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #d1d5db;"><strong>Total:</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;"><strong>{{total}}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          {{#if qr_image_data_url}}
          <div style="text-align: center; margin: 30px 0;">
            <p style="font-weight: bold; margin-bottom: 10px;">Your Entry QR Code</p>
            <img src="{{qr_image_data_url}}" alt="Ticket QR Code" style="max-width: 250px; height: auto; border: 2px solid #2563eb; border-radius: 8px; padding: 10px; background: white;" />
            <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">Show this QR code at the entry gate</p>
          </div>
          {{/if}}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{ticket_url}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Your Tickets</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Your tickets are ready! Click the button above to view and download them.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </body>
      </html>
    `,
    guardian_invite: `<!doctype html>
<html lang="und" dir="auto" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <title>Guardian Invitation</title>
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
    #outlook a { padding: 0; }
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    p { display: block; margin: 13px 0; }
  </style>
  <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
  <![endif]-->
  <!--[if lte mso 11]>
    <style type="text/css">
      .mj-outlook-group-fix { width:100% !important; }
    </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (min-width:480px) {
      .mj-column-per-100 { width: 100% !important; max-width: 100%; }
      .mj-column-per-30 { width: 30% !important; max-width: 30%; }
      .mj-column-per-70 { width: 70% !important; max-width: 70%; }
    }
  </style>
  <style media="screen and (min-width:480px)">
    .moz-text-html .mj-column-per-100 { width: 100% !important; max-width: 100%; }
    .moz-text-html .mj-column-per-30 { width: 30% !important; max-width: 30%; }
    .moz-text-html .mj-column-per-70 { width: 70% !important; max-width: 70%; }
  </style>
  <style type="text/css">
    @media only screen and (max-width:479px) {
      table.mj-full-width-mobile { width: 100% !important; }
      td.mj-full-width-mobile { width: auto !important; }
    }
  </style>
</head>
<body style="word-spacing:normal;background-color:#f8fafc;">
  <div aria-label="Guardian Invitation" aria-roledescription="email" style="background-color:#f8fafc;" role="article" lang="und" dir="auto">
    <!-- Header Image -->
    <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#ffffff" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
        <tbody>
          <tr>
            <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
              <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                          <tbody>
                            <tr>
                              <td style="width:510px;">
                                <img alt="Guardian Invite" src="{{header_image_url}}" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="510" height="auto" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!--[if mso | IE]></td></tr></table><![endif]-->
    <!-- Split Content -->
    <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#ffffff" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
        <tbody>
          <tr>
            <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
              <div class="mj-column-per-30 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                          <tbody>
                            <tr>
                              <td style="width:118px;">
                                <img alt="Sender" src="{{sender_image_url}}" style="border:0;border-radius:50%;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="118" height="auto" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="mj-column-per-70 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;padding-bottom:15px;word-break:break-word;">
                        <div style="font-family:Arial, sans-serif;font-size:16px;font-weight:bold;line-height:1.5;text-align:left;color:#333333;">Hello {{recipient_firstname}},</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;padding-bottom:15px;word-break:break-word;">
                        <div style="font-family:Arial, sans-serif;font-size:14px;line-height:1.5;text-align:left;color:#333333;">You've been invited to connect as a guardian for <strong>{{athlete_name}}</strong> at <strong>{{organization_name}}</strong>.</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;padding-bottom:15px;word-break:break-word;">
                        <div style="font-family:Arial, sans-serif;font-size:14px;line-height:1.5;text-align:left;color:#333333;">As a guardian, you'll be able to view {{athlete_first_name}}'s schedule and events, receive important team communications, RSVP to events, and manage payments.</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;padding-bottom:15px;word-break:break-word;">
                        <div style="font-family:Arial, sans-serif;font-size:14px;line-height:1.5;text-align:left;color:#333333;"><a href="{{invite_url}}" style="color: #2563eb; font-weight: bold;">Click here to accept the invitation</a>.</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Arial, sans-serif;font-size:14px;line-height:1.5;text-align:left;color:#333333;">Best,<br> The {{organization_name}} Team</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!--[if mso | IE]></td></tr></table><![endif]-->
    <!-- Video/Info -->
    <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#ffffff" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
        <tbody>
          <tr>
            <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
              <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                          <tbody>
                            <tr>
                              <td style="width:500px;">
                                <img alt="Parent Portal Preview" src="{{info_image_url}}" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="500" height="auto" />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!--[if mso | IE]></td></tr></table><![endif]-->
    <!-- Footer -->
    <!--[if mso | IE]><table align="center" border="0" cellpadding="0" cellspacing="0" class="" role="presentation" style="width:600px;" width="600" bgcolor="#1e293b" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
    <div style="background:#1e293b;background-color:#1e293b;margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#1e293b;background-color:#1e293b;width:100%;">
        <tbody>
          <tr>
            <td style="direction:ltr;font-size:0px;padding:20px;text-align:center;">
              <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tbody>
                    <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:Arial, sans-serif;font-size:14px;line-height:1.5;text-align:center;color:#ffffff;">YouthSports Team Hub</div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-size:0px;padding:5px 25px;word-break:break-word;">
                        <div style="font-family:Arial, sans-serif;font-size:12px;line-height:1.5;text-align:center;color:#94a3b8;">This invitation will expire in 7 days.</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!--[if mso | IE]></td></tr></table><![endif]-->
  </div>
</body>
</html>`
  };

  const template = templates[type];
  if (!template) {
    throw new Error(`Template not found for type: ${type}`);
  }

  return injectVariables(template, payload, type);
}

/**
 * HTML escape function (T6)
 */
function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Inject variables into template content
 */
function injectVariables(template: string, variables: Record<string, any>, type?: string): string {
  let result = template;
  
  // For ticket_receipt, HTML-escape string values (T6)
  const shouldEscape = type === 'ticket_receipt';

  // Handle simple variable replacement
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    // Don't escape items_html (pre-rendered HTML) or qr_image_data_url (data URL)
    if (shouldEscape && typeof value === 'string' && key !== 'items_html' && key !== 'qr_image_data_url' && key !== 'ticket_url') {
      result = result.replace(regex, escapeHtml(value));
    } else {
      result = result.replace(regex, String(value));
    }
  }

  // Handle conditional blocks (basic handlebars-style)
  result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
    return variables[condition] ? content : '';
  });

  // Handle each loops (basic)
  result = result.replace(/{{#each\s+(\w+)}}(.*?){{\/each}}/gs, (match, arrayName, content) => {
    const array = variables[arrayName];
    if (!Array.isArray(array)) return '';

    return array.map(item => {
      let itemContent = content;
      for (const [key, value] of Object.entries(item)) {
        itemContent = itemContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
      return itemContent;
    }).join('');
  });

  return result;
}

/**
 * Generate plain text fallback from HTML
 */
function generatePlainText(html: string): string {
  // Basic HTML to text conversion
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}