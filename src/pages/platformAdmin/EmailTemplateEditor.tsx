
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'react-hot-toast';
import { Save, Eye, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

import { PageHeader, Card, Button, Input, Select, Badge, Switch } from '../../components/platformAdmin';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { emailTemplatesService } from '../../data/services/emailTemplatesService';
import { EmailTemplate, EmailTemplateFormData, NotificationJobType } from '../../types/emailTemplates.types';
import { EmailTemplateVariables } from '../../components/platformAdmin/EmailTemplateVariables';
import EmailEditorErrorBoundary from '../../components/platformAdmin/EmailEditorErrorBoundary';
import { wrapEmailContent } from '../../utils/emailTemplateWrapper';
import { getNotificationTypes } from '../../data/services/notificationTypesService';
import type { NotificationType } from '../../data/services/notificationTypesService';
import { getLink } from '../../utils/routes';

// Memoize ReactQuill to prevent unnecessary re-renders
const MemoizedReactQuill = React.memo(ReactQuill);

/** Email template categories */
const EMAIL_TEMPLATE_CATEGORIES = [
  'Authentication & Account',
  'Invites & Role Assignments',
  'Team Management',
  'Events',
  'Ticketing & Payments',
  'Announcements & Communication',
  'Athlete & Guardian Management',
  'Media',
  'Subscriptions & Billing',
  'System & Security',
  'Admin Alerts',
  'Marketing & Engagement',
];

/** All email template types for the Type dropdown (Master Email Event Matrix + existing). */
const EMAIL_TEMPLATE_TYPE_OPTIONS: { value: NotificationJobType; label: string }[] = [
  { value: 'new_event', label: 'New Event' },
  { value: 'new_message', label: 'New Message' },
  { value: 'payment_receipt', label: 'Payment Receipt' },
  { value: 'event_reminder', label: 'Event Reminder' },
  { value: 'registration_confirmation', label: 'Registration Confirmation' },
  { value: 'team_invite', label: 'Team Invite' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'welcome_email', label: 'Welcome Email' },
  { value: 'guardian_invite', label: 'Guardian Invite' },
  { value: 'ticket_receipt', label: 'Ticket Receipt' },
  { value: 'uniform_notification', label: 'Uniform Notification' },
  { value: 'travel_notification', label: 'Travel Notification' },
  { value: 'photo_moderation', label: 'Photo Moderation' },
  { value: 'rsvp_notification', label: 'RSVP Notification' },
  { value: 'guardian_attachment_request_submitted', label: 'Guardian Attachment Request Submitted' },
  { value: 'guardian_attachment_request_reviewed', label: 'Guardian Attachment Request Reviewed' },
  { value: 'org_contact_request', label: 'Org Contact Request' },
  { value: 'platform_feature_request_signal', label: 'Platform Feature Request Signal' },
  { value: 'welcome_org_admin', label: 'Welcome - Org Admin' },
  { value: 'welcome_coach', label: 'Welcome - Coach' },
  { value: 'welcome_parent', label: 'Welcome - Parent' },
  { value: 'welcome_staff', label: 'Welcome - Staff' },
  { value: 'welcome_fan', label: 'Welcome - Fan' },
  { value: 'email_verification', label: 'Email Verification' },
  { value: 'password_changed_confirmation', label: 'Password Changed Confirmation' },
  { value: 'email_changed_confirmation', label: 'Email Address Changed Confirmation' },
  { value: 'account_deactivated', label: 'Account Deactivated' },
  { value: 'account_reactivated', label: 'Account Reactivated' },
  { value: 'org_admin_invite', label: 'Org Admin Invite' },
  { value: 'coach_invite', label: 'Coach Invite' },
  { value: 'staff_invite', label: 'Staff Invite' },
  { value: 'parent_invite', label: 'Parent Invite (Guardian Invite)' },
  { value: 'role_updated_notification', label: 'Role Updated Notification' },
  { value: 'removed_from_org', label: 'Removed From Organization' },
  { value: 'added_to_team', label: 'Added to Team' },
  { value: 'removed_from_team', label: 'Removed from Team' },
  { value: 'team_assignment_athlete', label: 'Team Assignment - Athlete' },
  { value: 'team_assignment_updated', label: 'Team Assignment Updated' },
  { value: 'event_created', label: 'Event Created (Internal Notice)' },
  { value: 'event_published', label: 'Event Published' },
  { value: 'event_reminder_7d', label: 'Event Reminder - 7 Days' },
  { value: 'event_reminder_24h', label: 'Event Reminder - 24 Hours' },
  { value: 'event_reminder_2h', label: 'Event Reminder - 2 Hours' },
  { value: 'event_updated', label: 'Event Updated' },
  { value: 'event_cancelled', label: 'Event Cancelled' },
  { value: 'rsvp_confirmation', label: 'RSVP Confirmation' },
  { value: 'rsvp_change_confirmation', label: 'RSVP Change Confirmation' },
  { value: 'ticket_purchase_confirmation_non_payment', label: 'Ticket Purchase Confirmation (Non-payment)' },
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'refund_issued', label: 'Refund Issued' },
  { value: 'partial_refund_issued', label: 'Partial Refund Issued' },
  { value: 'chargeback_alert', label: 'Chargeback Alert (Internal)' },
  { value: 'payout_summary', label: 'Payout Summary' },
  { value: 'season_pass_confirmation', label: 'Season Pass Purchase Confirmation' },
  { value: 'invoice_available', label: 'Invoice Available' },
  { value: 'payment_reminder', label: 'Payment Reminder' },
  { value: 'org_announcement', label: 'New Organization Announcement' },
  { value: 'team_announcement', label: 'New Team Announcement' },
  { value: 'announcement_edited', label: 'Announcement Edited' },
  { value: 'direct_message_notification', label: 'Direct Message Notification' },
  { value: 'comment_reply_notification', label: 'Comment Reply Notification' },
  { value: 'guardian_linked_confirmation', label: 'Guardian Linked Confirmation' },
  { value: 'guardian_removed', label: 'Guardian Removed Notification' },
  { value: 'athlete_profile_updated', label: 'Athlete Profile Updated' },
  { value: 'medical_form_submitted', label: 'Medical Form Submitted (Internal)' },
  { value: 'medical_form_expiring_soon', label: 'Medical Form Expiring Soon' },
  { value: 'document_uploaded_confirmation', label: 'Document Uploaded Confirmation' },
  { value: 'new_gallery_published', label: 'New Gallery Published' },
  { value: 'photo_tag_notification', label: 'Photo Tag Notification' },
  { value: 'video_uploaded_internal', label: 'Video Uploaded (Internal)' },
  { value: 'org_subscription_started', label: 'Organization Subscription Started' },
  { value: 'org_subscription_renewed', label: 'Organization Subscription Renewed' },
  { value: 'org_subscription_failed', label: 'Organization Subscription Failed' },
  { value: 'org_subscription_canceled', label: 'Organization Subscription Canceled' },
  { value: 'trial_ending_soon', label: 'Trial Ending Soon' },
  { value: 'license_tier_changed', label: 'License Tier Changed' },
  { value: 'billing_info_updated', label: 'Billing Info Updated Confirmation' },
  { value: 'suspicious_login_alert', label: 'Suspicious Login Alert' },
  { value: 'new_device_login_alert', label: 'New Device Login Alert' },
  { value: 'data_export_ready', label: 'Data Export Ready' },
  { value: 'privacy_policy_update', label: 'Privacy Policy Update' },
  { value: 'terms_update', label: 'Terms of Service Update' },
  { value: 'maintenance_notification', label: 'Maintenance Notification' },
  { value: 'incident_notification', label: 'Incident Notification' },
  { value: 'new_org_signup_internal', label: 'New Org Signup (Internal)' },
  { value: 'large_purchase_alert', label: 'Large Purchase Alert' },
  { value: 'multiple_failed_payments_alert', label: 'Multiple Failed Payments Alert' },
  { value: 'guardian_invite_expiring_soon', label: 'Guardian Invite Expiring Soon' },
  { value: 'event_overcapacity_warning', label: 'Event Overcapacity Warning' },
  { value: 'season_kickoff_welcome', label: 'Season Kickoff Welcome' },
  { value: 'mid_season_check_in', label: 'Mid-Season Check-In' },
  { value: 'end_of_season_summary', label: 'End of Season Summary' },
  { value: 'fan_engagement_highlight', label: 'Fan Engagement Highlight' },
  { value: 'donation_campaign_launch', label: 'Donation Campaign Launch' },
  { value: 'athlete_invite', label: 'Athlete Invite' },
  { value: 'athlete_account_created', label: 'Athlete Account Created' },
  { value: 'athlete_linked', label: 'Athlete Linked' },
];

export default function EmailTemplateEditor() {
  const { slug } = useParams<{ slug: string }>();
  const isCreateMode = !slug; // If no slug, we are creating
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [type, setType] = useState<NotificationJobType>('new_event');
  const [bodyContent, setBodyContent] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [notificationTypeId, setNotificationTypeId] = useState<string>('');
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeToggleDialog, setActiveToggleDialog] = useState<{
    open: boolean;
    checked: boolean;
    action: 'activate' | 'deactivate' | null;
    message: string;
  }>({ open: false, checked: false, action: null, message: '' });

  // Validation State
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([]);
  const [variableCollisions, setVariableCollisions] = useState<string[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load notification types
  useEffect(() => {
    const loadNotificationTypes = async () => {
      const { data, error } = await getNotificationTypes({ supportsEmail: true });
      if (!error && data) {
        setNotificationTypes(data);
      }
    };
    loadNotificationTypes();
  }, []);

  const loadTemplate = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const data = await emailTemplatesService.getEmailTemplate(slug);
      if (isMountedRef.current) {
        setTemplate(data);
        setBodyContent(data.body_content || '');
        setSubjectTemplate(data.subject_template || '');
        setPreviewText(data.preview_text || '');
        setDescription(data.description || '');
        setCategory(data.category || '');
        // Load notification_type_id if available
        const { data: templateWithType } = await supabase
          .from('email_templates')
          .select('notification_type_id, notification_types(id, display_name, eligible_roles)')
          .eq('slug', slug)
          .single();
        const row = templateWithType as { notification_type_id?: string } | null;
        if (row?.notification_type_id) {
          setNotificationTypeId(row.notification_type_id);
        }
      }
    } catch (error) {
      console.error('Failed to load template', error);
      toast.error('Failed to load template');
      navigate(getLink('platformAdmin.emails.list'));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [slug, navigate]);

  useEffect(() => {
    if (isCreateMode) {
        setLoading(false);
        setTemplate({
            id: '', 
            slug: '', 
            name: '', 
            type: 'new_event', 
            html_content: '', 
            body_content: '', 
            subject_template: '', 
            variables: [], 
            required_variables: [], 
            is_active: false, 
            category: null,
            created_at: '', 
            updated_at: '' 
        });
    } else {
        loadTemplate();
    }
  }, [loadTemplate, isCreateMode]);

  // Handle body change
  const handleBodyChange = useCallback((value: string) => {
    if (isMountedRef.current) {
      setBodyContent(value);
      
      // Real-time validation (debounced could be better but this is simple)
      const syntaxCheck = emailTemplatesService.validateHandlebarsSyntax(value);
      setSyntaxErrors(syntaxCheck.errors);

      const vars = emailTemplatesService.extractVariablesFromHtml(value);
      const collisions = emailTemplatesService.checkVariableCollisions(vars);
      setVariableCollisions(collisions);
    }
  }, []);

  // Manage body overflow when preview is open
  useEffect(() => {
    if (showPreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showPreview]);

  // Updates preview HTML
  useEffect(() => {
    try {
      const wrapped = wrapEmailContent(bodyContent);
      // Inject dummy variables for preview if needed, or just show raw
      // For now, just show the wrapped HTML.
      // We could try to inject dummy values for {{variables}} to make it look real.
      setPreviewHtml(wrapped);
    } catch (e) {
      // Ignore wrap errors during typing
    }
  }, [bodyContent]);

  // Handle Escape key to close preview modal
  useEffect(() => {
    if (!showPreview) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPreview(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showPreview]);

  // Cleanup preview modal on unmount
  useEffect(() => {
    return () => {
      if (showPreview) {
        setShowPreview(false);
      }
      document.body.style.overflow = '';
    };
  }, []);

  const handleSave = async () => {
    if (!template || saving) return;

    // Client-side validation
    const syntaxCheck = emailTemplatesService.validateHandlebarsSyntax(bodyContent);
    if (!syntaxCheck.valid) {
      toast.error(`Syntax Error: ${syntaxCheck.errors.join(', ')}`);
      return;
    }
    
    // Check required variables
    const extractedVars = emailTemplatesService.extractVariablesFromHtml(bodyContent);
    const subjectVars = emailTemplatesService.extractVariablesFromHtml(subjectTemplate);
    const allVars = [...new Set([...extractedVars, ...subjectVars])];
    const missingRequired = (template.required_variables || []).filter(v => !allVars.includes(v));
    
    if (missingRequired.length > 0) {
      toast.error(`Missing required variables: ${missingRequired.join(', ')}`);
      return;
    }

    if (isCreateMode && (!name.trim() || !newSlug.trim())) {
        toast.error('Please provide a name and unique slug');
        return;
    }

    // Validate notification_type_id is required for activation
    if (isCreateMode && !notificationTypeId) {
        toast.error('Please select a notification type');
        return;
    }

    try {
      setSaving(true);
      const extractedVars = emailTemplatesService.extractVariablesFromHtml(bodyContent);
      const subjectVars = emailTemplatesService.extractVariablesFromHtml(subjectTemplate);
      const allVars = [...new Set([...extractedVars, ...subjectVars])];

      if (isCreateMode) {
          await emailTemplatesService.createEmailTemplate({
              name,
              slug: newSlug,
              type,
              notification_type_id: notificationTypeId,
              body_content: emailTemplatesService.sanitizeHandlebarsContent(bodyContent), // Sanitize before saving
              subject_template: subjectTemplate,
              preview_text: previewText,
              description,
              category: category || undefined,
              variables: allVars
          });
          toast.success('Template created successfully');
          navigate(getLink('platformAdmin.emails.list'));
      } else {
          const formData: EmailTemplateFormData & { notification_type_id?: string } = {
            body_content: emailTemplatesService.sanitizeHandlebarsContent(bodyContent), // Sanitize before saving
            subject_template: subjectTemplate,
            preview_text: previewText,
            description,
            category: category || undefined,
            variables: allVars,
            notification_type_id: notificationTypeId || undefined,
          };

          await emailTemplatesService.updateEmailTemplate(template.id, formData, template.updated_at);
          toast.success('Template saved successfully');
          loadTemplate();
      }
    } catch (error: any) {
      console.error('Failed to save', error);
      if (error.message.includes('Conflict') || error.message.includes('unique constraint')) {
        toast.error('Error: Duplicate slug or name conflict.');
      } else {
        toast.error('Failed to save template: ' + error.message);
      }
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  };

  const handleVariableSelect = (variableCode: string) => {
    // Insert variable at cursor position would be ideal, but for now copying to clipboard is safer/easier
    // or just appending if we can't control cursor easily with ReactQuill ref.
    // The component EmailTemplateVariables copies to clipboard.
    // We can show a toast.
    toast.success(`Copied ${variableCode} to clipboard`);
  };

  const handleConfirmToggleActive = async () => {
    if (isCreateMode || !template || !activeToggleDialog.action) return;

    const action = activeToggleDialog.action;
    const checked = activeToggleDialog.checked;
    setActiveToggleDialog({ open: false, checked: false, action: null, message: '' });

    try {
      await emailTemplatesService.toggleTemplateActive(template.id, checked);
      toast.success(`Template ${action}d`);
      loadTemplate();
    } catch (e) {
      toast.error(`Failed to ${action} template`);
    }
  };

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean'],
      ['code-block'] // Useful for checking HTML
    ],
  }), []);

  if (loading) return <div className="pa-p-8 pa-text-center">Loading template...</div>;
  if (!template) return <div className="pa-p-8 pa-text-center">Template not found</div>;

  return (
    <div className="pa-max-w-7xl pa-mx-auto">
       <PageHeader
        title={isCreateMode ? 'Create New Template' : template.name}
        subtitle={isCreateMode ? 'Define a new email template' : `Editing ${template.slug}`}
        actions={
          <div className="pa-flex pa-gap-2">
            <Button variant="ghost" onClick={() => navigate(getLink('platformAdmin.emails.list'))}>
              <ArrowLeft className="pa-mr-2" size={18} />
              Back to Templates
            </Button>
            <Button variant="ghost" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <><Eye className="pa-mr-2" size={18} /> Hide Preview</> : <><Eye className="pa-mr-2" size={18} /> Show Preview</>}
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || syntaxErrors.length > 0}>
              {saving ? 'Saving...' : <><Save className="pa-mr-2" size={18} /> Save Changes</>}
            </Button>
          </div>
        }
      />

      <div className="pa-grid pa-grid-cols-1 lg:pa-grid-cols-3 pa-gap-6">
        {/* Main Editor Column */}
        <div className="lg:pa-col-span-2 pa-space-y-6">
          <Card className="pa-p-6">
            <div className="pa-space-y-4">
              <div>
                <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-1">Subject Line</label>
                <Input 
                  value={subjectTemplate} 
                  onChange={(e) => setSubjectTemplate(e.target.value)} 
                  placeholder="Subject line (supports {{variables}})"
                />
              </div>

              {isCreateMode && (
                  <>
                    <div>
                        <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-1">Template Name</label>
                        <Input 
                            value={name} 
                            onChange={(e) => {
                                setName(e.target.value);
                                if (!newSlug && isCreateMode) {
                                    setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
                                }
                            }} 
                            placeholder="e.g. Monthly Newsletter v2"
                        />
                    </div>
                    <div>
                        <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-1">Slug (Unique ID)</label>
                        <Input 
                            value={newSlug} 
                            onChange={(e) => setNewSlug(e.target.value)} 
                            placeholder="e.g. monthly-newsletter-v2"
                        />
                    </div>
                  </>
              )}
              
              <div>
                <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-1">Preview Text (Optional)</label>
                <Input 
                  value={previewText} 
                  onChange={(e) => setPreviewText(e.target.value)} 
                  placeholder="Text shown in email client preview"
                />
              </div>

               <div>
                <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-1">Description</label>
                <Input 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Internal description"
                />
              </div>

              <div>
                <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-1">Category</label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: '', label: 'Select a category...' },
                    ...EMAIL_TEMPLATE_CATEGORIES.map(cat => ({ value: cat, label: cat })),
                  ]}
                />
              </div>

              <div>
                <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-1">
                  Notification Type <span className="pa-text-red-500">*</span>
                </label>
                <Select
                  value={notificationTypeId}
                  onChange={(e) => setNotificationTypeId(e.target.value)}
                  options={[
                    { value: '', label: 'Select a notification type...' },
                    ...notificationTypes.map(nt => ({ 
                      value: nt.id, 
                      label: `${nt.display_name} (${nt.eligible_roles.join(', ')})` 
                    })),
                  ]}
                  required
                />
                {!notificationTypeId && (
                  <p className="pa-text-xs pa-text-yellow-600 pa-mt-1">
                    ⚠️ Notification type is required. This links the template to a notification type.
                  </p>
                )}
                {notificationTypeId && (
                  <p className="pa-text-xs pa-text-gray-500 pa-mt-1">
                    This template will be used for: {notificationTypes.find(nt => nt.id === notificationTypeId)?.display_name}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="pa-p-6 pa-min-h-[500px] pa-flex pa-flex-col">
            <label className="pa-block pa-text-sm pa-font-medium pa-text-gray-700 pa-mb-2">Email Body Content</label>
            
            {syntaxErrors.length > 0 && (
              <div className="pa-mb-4 pa-p-3 pa-bg-red-50 pa-text-red-700 pa-rounded pa-text-sm pa-flex pa-items-start pa-gap-2">
                <XCircle size={16} className="pa-mt-0.5" />
                <div>
                  <strong>Syntax Error:</strong>
                  <ul className="pa-list-disc pa-pl-4 pa-mt-1">
                    {syntaxErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {variableCollisions.length > 0 && (
              <div className="pa-mb-4 pa-p-3 pa-bg-yellow-50 pa-text-yellow-800 pa-rounded pa-text-sm pa-flex pa-items-start pa-gap-2">
                <AlertTriangle size={16} className="pa-mt-0.5" />
                <div>
                  <strong>Warning: Variable Collision</strong>
                  <p>The following variables conflict with universal template variables: {variableCollisions.join(', ')}</p>
                </div>
              </div>
            )}

            <div className="email-template-editor pa-flex-1">
              <EmailEditorErrorBoundary>
                <MemoizedReactQuill
                  theme="snow"
                  value={bodyContent}
                  onChange={handleBodyChange}
                  modules={quillModules}
                  placeholder="Edit email content here..."
                  className="pa-h-[400px]"
                />
              </EmailEditorErrorBoundary>
            </div>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="pa-space-y-6">
          <Card className="pa-p-6">
            <h3 className="pa-text-lg pa-font-medium pa-mb-4">Details</h3>
            <div className="pa-space-y-3 pa-text-sm">
              <div className="pa-flex pa-justify-between pa-items-center">
                <span className="pa-text-gray-500">Type</span>
                {isCreateMode ? (
                    <Select
                        value={type}
                        onChange={(e) => setType(e.target.value as NotificationJobType)}
                        options={EMAIL_TEMPLATE_TYPE_OPTIONS}
                        className="pa-w-40 pa-text-sm"
                    />
                ) : (
                    <span>{template.type}</span>
                )}
              </div>
              <div className="pa-flex pa-justify-between pa-items-center">
                <span className="pa-text-gray-500">Category</span>
                {isCreateMode ? (
                    <Select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        options={[
                            { value: '', label: 'Select...' },
                            ...EMAIL_TEMPLATE_CATEGORIES.map(cat => ({ value: cat, label: cat })),
                        ]}
                        className="pa-w-40 pa-text-sm"
                    />
                ) : (
                    <Badge variant="neutral">{template.category || '—'}</Badge>
                )}
              </div>
              <div className="pa-flex pa-justify-between">
                <span className="pa-text-gray-500">Slug</span>
                <code className="pa-bg-gray-100 pa-px-1 pa-rounded">{template.slug}</code>
              </div>
              <div className="pa-flex pa-justify-between">
                <span className="pa-text-gray-500">Last Updated</span>
                <span>{new Date(template.updated_at).toLocaleDateString()}</span>
              </div>
              <div className="pa-flex pa-justify-between pa-items-center pa-pt-2 pa-border-t pa-mt-2">
                 <span className="pa-text-gray-700 pa-font-medium">Active Status</span>
                 <Switch 
                    checked={template.is_active}
                    disabled={isCreateMode || !notificationTypeId}
                    onCheckedChange={(checked) => {
                        if (isCreateMode || !notificationTypeId) return;
                        
                        const action = checked ? 'activate' : 'deactivate';
                        const selectedType = notificationTypes.find(nt => nt.id === notificationTypeId);
                        const eligibleRoles = selectedType?.eligible_roles.join(', ') || '';
                        const message = checked 
                            ? `Activate this template? This will make email notifications available for "${selectedType?.display_name}" to users with roles: ${eligibleRoles}. Only one active template per notification type is allowed.`
                            : 'Deactivate this template? Users will no longer be able to enable email notifications for this type.';

                        setActiveToggleDialog({ open: true, checked, action, message });
                    }}
                 />
              </div>
              {isCreateMode && (
                  <p className="pa-text-xs pa-text-gray-400 pa-mt-1">
                      Save the template first to activate it.
                  </p>
              )}
              {!isCreateMode && !notificationTypeId && (
                  <p className="pa-text-xs pa-text-yellow-600 pa-mt-1">
                      ⚠️ Cannot activate template without a notification type. Please select a notification type and save first.
                  </p>
              )}
            </div>
          </Card>

          <Card className="pa-p-6">
             <h3 className="pa-text-lg pa-font-medium pa-mb-4">Variables</h3>
             <EmailTemplateVariables 
               type={isCreateMode ? type : template.type} 
               onSelectVariable={handleVariableSelect} 
             />
          </Card>
        </div>
      </div>

      {/* Preview Modal / Drawer (Overlay) */}
      {showPreview && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 15, 20, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--pa-space-4)',
          }}
          onClick={() => setShowPreview(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowPreview(false);
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: '56rem',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: 'var(--pa-space-4)', 
              borderBottom: '1px solid var(--pa-n100)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Email Preview</h3>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>Close</Button>
            </div>
            <div style={{ 
              flex: 1, 
              backgroundColor: '#f3f4f6', 
              padding: 'var(--pa-space-8)', 
              overflow: 'auto' 
            }}>
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '4px', 
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', 
                margin: '0 auto', 
                maxWidth: '600px', 
                minHeight: '500px' 
              }}>
                 {/* Render HTML content inside an iframe to isolate styles */}
                 <iframe 
                   srcDoc={previewHtml}
                   title="preview"
                   style={{
                     width: '100%',
                     height: '100%',
                     minHeight: '600px',
                     border: 0,
                   }}
                 />
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={activeToggleDialog.open}
        title={activeToggleDialog.message}
        description={activeToggleDialog.message}
        confirmLabel={activeToggleDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
        cancelLabel="Cancel"
        variant={activeToggleDialog.action === 'deactivate' ? 'danger' : 'primary'}
        onConfirm={() => { void handleConfirmToggleActive() }}
        onCancel={() => setActiveToggleDialog({ open: false, checked: false, action: null, message: '' })}
      />
    </div>
  );
}
