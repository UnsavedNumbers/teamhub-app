import { NotificationJobType } from '../../types/emailTemplates.types';
import { Copy, HelpCircle } from 'lucide-react';

interface VariableDef {
  name: string;
  description: string;
  example?: string;
}

const COMMON_VARIABLES: VariableDef[] = [
  { name: 'organization_name', description: 'Name of the organization', example: 'Falcons FC' },
  { name: 'organization_logo_url', description: 'URL to organization logo', example: 'https://...' },
  { name: 'recipient_name', description: 'Name of the email recipient', example: 'John Doe' },
  { name: 'email_footer_text', description: 'Custom footer text from branding', example: '© 2024 Falcons FC' },
  { name: 'unsubscribe_url', description: 'Unsubscribe link URL', example: 'https://...' },
  { name: 'url', description: 'Primary call-to-action URL', example: 'https://...' },
];

const TEMPLATE_VARIABLES: Record<string, VariableDef[]> = {
  new_event: [
    { name: 'event_title', description: 'Event title' },
    { name: 'event_date', description: 'Formatted date' },
    { name: 'event_time', description: 'Formatted time' },
    { name: 'event_location', description: 'Location name/address' },
    { name: 'event_description', description: 'Description (optional)' },
    { name: 'is_required', description: 'Boolean if event is mandatory' },
  ],
  new_message: [
    { name: 'sender_name', description: 'Name of sender' },
    { name: 'sender_role', description: 'Role of sender (optional)' },
    { name: 'team_name', description: 'Team name (optional)' },
    { name: 'message_subject', description: 'Subject of the message' },
    { name: 'message_content', description: 'Content snippet' },
  ],
  payment_receipt: [
    { name: 'amount', description: 'Payment amount' },
    { name: 'payment_date', description: 'Date of payment' },
    { name: 'transaction_id', description: 'Transaction reference' },
    { name: 'description', description: 'Payment description' },
    { name: 'items', description: 'Array of items purchased (loop with #each)' },
  ],
  guardian_invite: [
    { name: 'athlete_name', description: 'Full name of athlete' },
    { name: 'athlete_first_name', description: 'First name of athlete' },
    { name: 'recipient_firstname', description: 'First name of guardian' },
    { name: 'invite_url', description: 'Invitation acceptance link' },
    { name: 'header_image_url', description: 'Header image URL' },
    { name: 'sender_image_url', description: 'Sender image URL' },
    { name: 'info_image_url', description: 'Info image URL' },
  ],
  ticket_receipt: [
    { name: 'event_title', description: 'Event title' },
    { name: 'event_date', description: 'Event date' },
    { name: 'event_location', description: 'Event location' },
    { name: 'items_html', description: 'Pre-formatted HTML table of items' },
    { name: 'total', description: 'Total amount formatted' },
    { name: 'qr_image_data_url', description: 'Data URL for QR code image' },
    { name: 'ticket_url', description: 'Link to ticket page' },
  ],
};

interface EmailTemplateVariablesProps {
  type: NotificationJobType;
  onSelectVariable: (variable: string) => void;
}

export function EmailTemplateVariables({ type, onSelectVariable }: EmailTemplateVariablesProps) {
  const specificVars = TEMPLATE_VARIABLES[type as string] || [];
  
  const handleCopy = (variable: string) => {
    onSelectVariable(`{{${variable}}}`);
  };

  return (
    <div className="pa-space-y-6">
      <div>
        <h3 className="pa-text-sm pa-font-medium pa-text-gray-900 pa-mb-3 pa-flex pa-items-center pa-gap-2">
          Common Variables
          <HelpCircle className="pa-w-4 pa-h-4 pa-text-gray-400" />
        </h3>
        <div className="pa-grid pa-grid-cols-1 pa-gap-2">
          {COMMON_VARIABLES.map((v) => (
            <VariableItem key={v.name} variable={v} onCopy={(name) => handleCopy(name)} />
          ))}
        </div>
      </div>

      {(specificVars || []).length > 0 && (
        <div className="pa-mt-6">
          <h3 className="pa-text-sm pa-font-medium pa-text-gray-900 pa-mb-3 pa-flex pa-items-center pa-gap-2">
            Template Specific
            <HelpCircle size={14} className="pa-text-gray-400" />
          </h3>
          <div className="pa-grid pa-grid-cols-1 pa-gap-2">
            {(specificVars || []).map((v) => (
              <VariableItem key={v.name} variable={v} onCopy={(name) => handleCopy(name)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VariableItem({ variable, onCopy }: { variable: VariableDef; onCopy: (v: string) => void }) {
  return (
    <div className="pa-flex pa-items-center pa-justify-between pa-p-2 pa-bg-gray-50 pa-rounded pa-border pa-border-gray-100 group hover:pa-border-gray-300 pa-transition-colors">
      <div className="pa-min-w-0 pa-flex-1 pa-mr-2">
        <div className="pa-font-mono pa-text-xs pa-text-blue-600 pa-font-medium pa-truncate" title={variable.name}>
          {`{{${variable.name}}}`}
        </div>
        <div className="pa-text-xs pa-text-gray-500 pa-truncate" title={variable.description}>
          {variable.description}
        </div>
      </div>
      <button
        type="button"
        className="pa-p-1 pa-text-gray-500 hover:pa-text-gray-700 hover:pa-bg-gray-200 pa-rounded pa-opacity-0 group-hover:pa-opacity-100 pa-transition-opacity"
        onClick={() => onCopy(variable.name)}
        title="Insert variable"
      >
        <Copy size={14} />
      </button>
    </div>
  );
}
