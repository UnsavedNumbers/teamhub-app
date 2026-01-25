import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { showSuccess, showError } from '../../utils/toast';
import { Card, CardHeader, CardTitle, CardContent, Button, Select } from '../../components/platformAdmin';
import { Loader2, Eye, Send } from 'lucide-react';

interface EmailTemplate {
  type: string;
  name: string;
  samplePayload: Record<string, any>;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    type: 'new_event',
    name: 'New Event',
    samplePayload: {
      recipient_name: 'John Doe',
      event_title: 'Team Practice',
      event_date: 'Saturday, January 25, 2026',
      event_time: '10:00 AM - 12:00 PM',
      event_location: 'Main Field',
      event_description: 'Regular team practice. Please bring your water bottle and wear appropriate athletic clothing.',
      is_required: true,
      url: 'https://app.youthsports.team/events/123',
      organization_name: 'Springfield Soccer Club',
      unsubscribe_url: 'https://app.youthsports.team/settings/notifications',
      preferences_url: 'https://app.youthsports.team/settings/notifications'
    }
  },
  {
    type: 'new_message',
    name: 'New Message',
    samplePayload: {
      recipient_name: 'Jane Smith',
      sender_name: 'Coach Johnson',
      sender_role: 'Head Coach',
      team_name: 'U12 Blue',
      message_content: 'Practice has been moved to the indoor facility due to weather.',
      message_subject: 'Practice Location Change',
      url: 'https://app.youthsports.team/messages/456',
      organization_name: 'Springfield Soccer Club',
      unsubscribe_url: 'https://app.youthsports.team/settings/notifications',
      preferences_url: 'https://app.youthsports.team/settings/notifications'
    }
  },
  {
    type: 'payment_receipt',
    name: 'Payment Receipt',
    samplePayload: {
      recipient_name: 'Bob Wilson',
      amount: '75.00',
      payment_date: 'January 25, 2026',
      transaction_id: 'txn_123456789',
      description: 'Season Registration Fee',
      items: [
        { name: 'Season Registration', price: '50.00' },
        { name: 'Uniform Deposit', price: '25.00' }
      ],
      url: 'https://app.youthsports.team/payments/receipt/789',
      organization_name: 'Springfield Soccer Club',
      unsubscribe_url: 'https://app.youthsports.team/settings/notifications',
      preferences_url: 'https://app.youthsports.team/settings/notifications'
    }
  }
];

export default function EmailPreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [payload, setPayload] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  // Helper function to get template HTML (simplified for dev preview)
  const getTemplateHtml = (type: string): string => {
    // In a real implementation, this would load from compiled templates
    // For now, return basic HTML structure
    const templates: Record<string, string> = {
      new_event: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>New Event: {{event_title}}</title>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
              .header { text-align: center; font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 20px; }
              .event-box { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
              .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">YouthSports Team Hub</div>
              <h2>New Event: {{event_title}}</h2>
              <p>Hi {{recipient_name}},</p>
              <p>A new event has been scheduled for your team:</p>
              <div class="event-box">
                <h3>{{event_title}}</h3>
                <p>📅 {{event_date}}<br>🕐 {{event_time}}<br>📍 {{event_location}}</p>
                {{#if event_description}}<p>{{event_description}}</p>{{/if}}
              </div>
              <p>{{#if is_required}}This is a required event. Please make sure to attend.{{else}}This is an optional event.{{/if}}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" class="button">View Event</a>
              </div>
              <p>Questions? Contact your coach or team administrator.</p>
              <div class="footer">
                You're receiving this email because you're part of {{organization_name}} on YouthSports Team Hub.<br>
                <a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a><br>
                © 2026 YouthSports Team Hub. All rights reserved.
              </div>
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
            <style>
              body { font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
              .header { text-align: center; font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 20px; }
              .message-box { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
              .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">YouthSports Team Hub</div>
              <h2>New Message from {{sender_name}}</h2>
              <p>Hi {{recipient_name}},</p>
              <p>You have a new message{{#if team_name}} for {{team_name}}{{/if}}:</p>
              <div class="message-box">
                <p><strong>From: {{sender_name}}{{#if sender_role}} ({{sender_role}}){{/if}}</strong></p>
                <p style="font-style: italic;">"{{message_content}}"</p>
                {{#if message_subject}}<p><strong>Subject: {{message_subject}}</strong></p>{{/if}}
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" class="button">View Message</a>
              </div>
              <p>You can reply to this message through the Team Hub app.</p>
              <div class="footer">
                You're receiving this email because you're part of {{organization_name}} on YouthSports Team Hub.<br>
                <a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a><br>
                © 2026 YouthSports Team Hub. All rights reserved.
              </div>
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
            <style>
              body { font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; }
              .header { text-align: center; font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 20px; }
              .receipt-box { background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
              .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; }
              .footer { background-color: #f1f5f9; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">YouthSports Team Hub</div>
              <h2>Payment Receipt</h2>
              <p>Hi {{recipient_name}},</p>
              <p>Thank you for your payment. Here are the details:</p>
              <div class="receipt-box">
                <h3>Payment Details</h3>
                <p>Amount: $&#123;amount&#125;<br>Date: &#123;&#123;payment_date&#125;&#125;<br>Transaction ID: &#123;&#123;transaction_id&#125;&#125;</p>
                {{#if description}}<p>Description: {{description}}</p>{{/if}}
              </div>
              {{#if items}}
              <div class="receipt-box">
                <h3>Items Purchased</h3>
                {{#each items}}
                <p>&#123;&#123;name&#125;&#125; - $&#123;price&#125;</p>
                {{/each}}
              </div>
              {{/if}}
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{url}}" class="button">View Receipt</a>
              </div>
              <p>If you have any questions about this payment, please contact your organization administrator.</p>
              <div class="footer">
                You're receiving this email because you're part of {{organization_name}} on YouthSports Team Hub.<br>
                <a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{preferences_url}}">Email Preferences</a><br>
                © 2026 YouthSports Team Hub. All rights reserved.
              </div>
            </div>
          </body>
        </html>
      `
    };

    return templates[type] || '';
  };

  // Helper function to inject variables
  const injectVariables = (template: string, variables: Record<string, any>): string => {
    let result = template;

    // Handle simple variable replacement
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    // Handle conditional blocks (basic handlebars-style)
    result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (_match, condition, content) => {
      return variables[condition] ? content : '';
    });

    // Handle each loops (basic)
    result = result.replace(/{{#each\s+(\w+)}}(.*?){{\/each}}/gs, (_match, arrayName, content) => {
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
  };

  const handleTemplateChange = (templateType: string) => {
    const template = EMAIL_TEMPLATES.find(t => t.type === templateType);
    if (template) {
      setSelectedTemplate(template);
      setPayload(JSON.stringify(template.samplePayload, null, 2));
    }
  };

  const generatePreview = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (e) {
        showError('Invalid JSON payload');
        return;
      }

      // For dev preview, we'll use a simple template injection
      // In production, this would be handled server-side
      const templateHtml = getTemplateHtml(selectedTemplate.type);
      const injectedHtml = injectVariables(templateHtml, parsedPayload);

      setPreviewHtml(injectedHtml);
    } catch (error) {
      console.error('Preview generation failed:', error);
      showError('Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!selectedTemplate) return;

    setIsSending(true);
    try {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
      } catch (e) {
        showError('Invalid JSON payload');
        return;
      }

      // Get current user's email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        showError('No user email found');
        return;
      }

      // Insert notification job
      const { error } = await supabase
        .from('notification_jobs' as any)
        .insert({
          org_id: '00000000-0000-0000-0000-000000000000', // Placeholder org ID
          user_id: user.id,
          email: user.email,
          type: selectedTemplate.type,
          payload: parsedPayload
        });

      if (error) {
        console.error('Failed to create notification job:', error);
        showError('Failed to queue email');
        return;
      }

      showSuccess('Test email queued successfully!');

      // In development, we could trigger the worker manually
      // For now, just show success message

    } catch (error) {
      console.error('Failed to send test email:', error);
        showError('Failed to send test email');
    } finally {
      setIsSending(false);
    }
  };

  if (import.meta.env.PROD) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">Email preview is only available in development mode.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Template Preview</CardTitle>
          <p className="text-sm text-gray-600">
            Preview and test email templates. Only available in development mode.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email Template</label>
            <Select
              value={selectedTemplate?.type || ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              options={EMAIL_TEMPLATES.map(t => ({ value: t.type, label: t.name }))}
            />
          </div>

          {selectedTemplate && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Payload JSON</label>
                <textarea
                  value={payload}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPayload(e.target.value)}
                  rows={15}
                  className="pa-input pa-textarea font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={generatePreview} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Generate Preview
                    </>
                  )}
                </Button>

                <Button onClick={sendTestEmail} disabled={isSending} variant="secondary">
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {previewHtml && (
        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}