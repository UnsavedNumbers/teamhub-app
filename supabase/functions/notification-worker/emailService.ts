// Email service for Supabase Edge Functions
// Note: This is a Deno environment, so we use Deno APIs instead of Node.js

export interface NotificationJob {
  id: string;
  org_id: string;
  user_id?: string;
  email: string;
  type: 'new_event' | 'new_message' | 'payment_receipt' | 'event_reminder' | 'registration_confirmation' | 'team_invite' | 'password_reset' | 'welcome_email';
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
              <p>Amount: ${{amount}}<br>Date: {{payment_date}}<br>Transaction ID: {{transaction_id}}</p>
              {{#if description}}<p>Description: {{description}}</p>{{/if}}
            </div>
            {{#if items}}
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Items Purchased</h3>
              {{#each items}}
              <p>{{name}} - ${{price}}</p>
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
    `
  };

  const template = templates[type];
  if (!template) {
    throw new Error(`Template not found for type: ${type}`);
  }

  return injectVariables(template, payload);
}

/**
 * Inject variables into template content
 */
function injectVariables(template: string, variables: Record<string, any>): string {
  let result = template;

  // Handle simple variable replacement
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value));
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