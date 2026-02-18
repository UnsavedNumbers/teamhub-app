
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'react-hot-toast';
import { Save, Eye, AlertTriangle, XCircle } from 'lucide-react';

import { PageHeader, Card, Button, Input, Select, Badge, Switch } from '../../components/platformAdmin';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { emailTemplatesService } from '../../data/services/emailTemplatesService';
import { EmailTemplate, EmailTemplateFormData, NotificationJobType } from '../../types/emailTemplates.types';
import { EmailTemplateVariables } from '../../components/platformAdmin/EmailTemplateVariables';
import EmailEditorErrorBoundary from '../../components/platformAdmin/EmailEditorErrorBoundary';
import { wrapEmailContent } from '../../utils/emailTemplateWrapper';

// Memoize ReactQuill to prevent unnecessary re-renders
const MemoizedReactQuill = React.memo(ReactQuill);

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
      }
    } catch (error) {
      console.error('Failed to load template', error);
      toast.error('Failed to load template');
      navigate('/platform-admin/emails');
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
              body_content: emailTemplatesService.sanitizeHandlebarsContent(bodyContent), // Sanitize before saving
              subject_template: subjectTemplate,
              preview_text: previewText,
              description,
              variables: allVars
          });
          toast.success('Template created successfully');
          navigate('/platform-admin/emails');
      } else {
          const formData: EmailTemplateFormData = {
            body_content: emailTemplatesService.sanitizeHandlebarsContent(bodyContent), // Sanitize before saving
            subject_template: subjectTemplate,
            preview_text: previewText,
            description,
            variables: allVars
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
                        options={[
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
                            { value: 'rsvp_notification', label: 'RSVP Notification' }
                        ]}
                        className="pa-w-40 pa-text-sm"
                    />
                ) : (
                    <Badge variant="neutral">{template.type}</Badge>
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
                    disabled={isCreateMode}
                    onCheckedChange={(checked) => {
                        if (isCreateMode) return;
                        
                        const action = checked ? 'activate' : 'deactivate';
                        const message = checked 
                            ? 'Are you sure you want to activate this template? ensuring it is ready for production use?'
                            : 'Deactivate this template? Emails will fallback to hardcoded defaults.';

                        setActiveToggleDialog({ open: true, checked, action, message });
                    }}
                 />
              </div>
              {isCreateMode && (
                  <p className="pa-text-xs pa-text-gray-400 pa-mt-1">
                      Save the template first to activate it.
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
        <div className="pa-fixed pa-inset-0 pa-bg-black/50 pa-z-50 pa-flex pa-items-center pa-justify-center pa-p-4">
          <div className="pa-bg-white pa-rounded-lg pa-shadow-xl pa-w-full pa-max-w-4xl pa-h-[90vh] pa-flex pa-flex-col">
            <div className="pa-p-4 pa-border-b pa-flex pa-justify-between pa-items-center">
              <h3 className="pa-text-lg pa-font-bold">Email Preview</h3>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>Close</Button>
            </div>
            <div className="pa-flex-1 pa-bg-gray-100 pa-p-8 pa-overflow-auto">
              <div className="pa-bg-white pa-rounded pa-shadow pa-mx-auto pa-max-w-[600px] pa-min-h-[500px]">
                 {/* Render HTML content inside an iframe to isolate styles */}
                 <iframe 
                   srcDoc={previewHtml}
                   title="preview"
                   className="pa-w-full pa-h-full pa-min-h-[600px] pa-border-0"
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
