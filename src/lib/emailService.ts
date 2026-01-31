import { Resend } from 'resend';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Resend client
const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || '');

export interface NotificationJob {
  id: string;
  org_id: string;
  user_id?: string;
  email: string;
  type: 'new_event' | 'new_message' | 'payment_receipt' | 'payment_reminder' | 'event_reminder' | 'registration_confirmation' | 'team_invite' | 'password_reset' | 'welcome_email' | 'photo_approved' | 'photo_rejected';
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
  payment_reminder: {
    subject: 'Payment Reminder - ${{amount}} due {{due_date}}',
    preview: 'You have an upcoming payment due'
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
  photo_approved: {
    subject: 'Your photo was approved - {{gallery_name}}',
    preview: 'Your photo has been approved and added to the gallery'
  },
  photo_rejected: {
    subject: 'Your photo was not approved - {{gallery_name}}',
    preview: 'Your photo was not approved for the gallery'
  }
};

/**
 * Send a notification email using the compiled MJML template
 */
export async function sendNotificationEmail(job: NotificationJob): Promise<EmailResult> {
  try {
    // Load compiled HTML template
    const templatePath = join(process.cwd(), 'emails', 'compiled', `${job.type}.html`);
    let htmlContent = readFileSync(templatePath, 'utf-8');

    // Inject variables from payload
    htmlContent = injectVariables(htmlContent, job.payload);

    // Get subject and preview
    const config = EMAIL_CONFIG[job.type];
    if (!config) {
      throw new Error(`Unknown email type: ${job.type}`);
    }

    let subject = injectVariables(config.subject, job.payload);

    // Generate plain text fallback
    const textContent = generatePlainText(htmlContent);

    // Send email via Resend
    const result = await resend.emails.send({
      from: 'notifications@youthsports.team', // This should be configured in Resend
      to: job.email,
      subject,
      html: htmlContent,
      text: textContent,
    });

    return {
      success: true,
      emailId: result.data?.id
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
  result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (_, condition, content) => {
    return variables[condition] ? content : '';
  });

  // Handle each loops (basic)
  result = result.replace(/{{#each\s+(\w+)}}(.*?){{\/each}}/gs, (_, arrayName, content) => {
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
