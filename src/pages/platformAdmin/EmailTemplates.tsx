import { useState, useCallback, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { getLink } from '../../utils/routes';
import { PageHeader, PlatformDataTable, Badge, Button, ColumnConfig, Input, Select, ProgressBar } from '../../components/platformAdmin';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { emailTemplatesService } from '../../data/services/emailTemplatesService';
import { EmailTemplate, NotificationJobType } from '../../types/emailTemplates.types';
import { toast } from 'react-hot-toast';
import { formatRelativeTime } from '../../utils/formatters';

type SelectAllMode = 'none' | 'page' | 'all';

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

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  ...EMAIL_TEMPLATE_CATEGORIES.map(cat => ({ value: cat, label: cat })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function EmailTemplates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmailTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState<SelectAllMode>('none');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{
    isActive: boolean;
    action: 'activate' | 'deactivate' | 'delete' | null;
    current: number;
    total: number;
    errors: string[];
  }>({
    isActive: false,
    action: null,
    current: 0,
    total: 0,
    errors: [],
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'duplicate' | 'delete' | 'bulk_delete' | null;
    templateId: string | null;
    bulkIds: string[] | null;
  }>({ open: false, action: null, templateId: null, bulkIds: null });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const isActive = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : null;
      const result = await emailTemplatesService.getEmailTemplates(page + 1, rowsPerPage, {
        search: debouncedSearch,
        category: categoryFilter || undefined,
        isActive,
      });
      setData(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error('Failed to load templates', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(0);
  };

  const hasActiveFilters = search !== '' || categoryFilter !== '' || statusFilter !== '';

  const handleEdit = (slug: string) => {
    navigate(`/platform-admin/emails/${slug}/edit`);
  };


  const handleDuplicate = (id: string) => {
    setConfirmDialog({ open: true, action: 'duplicate', templateId: id, bulkIds: null });
  };

  const handleConfirmAction = async () => {
    const { action, templateId, bulkIds } = confirmDialog;
    if (!action) return;
    setConfirmDialog({ open: false, action: null, templateId: null, bulkIds: null });

    try {
      if (action === 'duplicate' && templateId) {
        await emailTemplatesService.duplicateTemplate(templateId);
        toast.success('Template duplicated');
        await fetchTemplates();
      } else if (action === 'delete' && templateId) {
        await emailTemplatesService.deleteEmailTemplate(templateId);
        toast.success('Deleted');
        await fetchTemplates();
      } else if (action === 'bulk_delete' && bulkIds && bulkIds.length > 0) {
        setBulkProgress({
          isActive: true,
          action: 'delete',
          current: 0,
          total: bulkIds.length,
          errors: [],
        });

        const errors: string[] = [];
        try {
          for (let i = 0; i < bulkIds.length; i++) {
            const id = bulkIds[i];
            try {
              await emailTemplatesService.deleteEmailTemplate(id);
              setBulkProgress(prev => ({
                ...prev,
                current: i + 1,
              }));
            } catch (error: any) {
              const template = data.find(t => t.id === id);
              errors.push(template?.name || id);
              setBulkProgress(prev => ({
                ...prev,
                current: i + 1,
                errors: [...prev.errors, template?.name || id],
              }));
            }
          }

          if (errors.length === 0) {
            toast.success(`${bulkIds.length} template${bulkIds.length === 1 ? '' : 's'} deleted`);
          } else {
            toast.error(`${errors.length} template${errors.length === 1 ? '' : 's'} failed to delete`);
          }

          setSelectedIds(new Set());
          setSelectAllMode('none');
          await fetchTemplates();
        } catch (error) {
          console.error('Failed to delete templates', error);
          toast.error('Failed to delete templates');
        } finally {
          setBulkProgress({
            isActive: false,
            action: null,
            current: 0,
            total: 0,
            errors: [],
          });
        }
      }
    } catch (error) {
      if (action === 'duplicate') {
        console.error('Failed to duplicate template', error);
        toast.error('Failed to duplicate template');
      } else if (action === 'delete') {
        toast.error('Failed to delete');
      } else if (action === 'bulk_delete') {
        console.error('Failed to delete templates', error);
        toast.error('Failed to delete templates');
      }
    }
  };

  const selectedTemplates = data.filter((row) => selectedIds.has(row.id));
  const hasActiveSelected = selectedTemplates.some((t) => t.is_active);
  const canBulkDelete = selectedIds.size > 0 && !hasActiveSelected;

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkProgress({
      isActive: true,
      action: 'activate',
      current: 0,
      total: ids.length,
      errors: [],
    });

    const errors: string[] = [];
    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        try {
          await emailTemplatesService.toggleTemplateActive(id, true);
          setBulkProgress(prev => ({
            ...prev,
            current: i + 1,
          }));
        } catch (error: any) {
          const template = data.find(t => t.id === id);
          errors.push(template?.name || id);
          setBulkProgress(prev => ({
            ...prev,
            current: i + 1,
            errors: [...prev.errors, template?.name || id],
          }));
        }
      }

      if (errors.length === 0) {
        toast.success(`${ids.length} template${ids.length === 1 ? '' : 's'} activated`);
      } else {
        toast.error(`${errors.length} template${errors.length === 1 ? '' : 's'} failed to activate`);
      }

      setSelectedIds(new Set());
      setSelectAllMode('none');
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to activate templates', error);
      toast.error('Failed to activate templates');
    } finally {
      setBulkProgress({
        isActive: false,
        action: null,
        current: 0,
        total: 0,
        errors: [],
      });
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await emailTemplatesService.toggleTemplateActive(id, false);
      }
      toast.success(`${selectedIds.size} template${selectedIds.size === 1 ? '' : 's'} deactivated`);
      setSelectedIds(new Set());
      setSelectAllMode('none');
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to deactivate templates', error);
      toast.error('Failed to deactivate templates');
    }
  };

  const handleBulkDeleteClick = () => {
    const ids = Array.from(selectedIds);
    const inactive = data.filter((r) => ids.includes(r.id) && !r.is_active);
    if (inactive.length === 0) return;
    setConfirmDialog({ open: true, action: 'bulk_delete', templateId: null, bulkIds: inactive.map((t) => t.id) });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectAllMode('none');
  };

  // Map template type slugs to readable labels
  const getTypeLabel = (type: NotificationJobType): string => {
    const typeMap: Record<NotificationJobType, string> = {
      'new_event': 'New Event',
      'new_message': 'New Message',
      'payment_receipt': 'Payment Receipt',
      'event_reminder': 'Event Reminder',
      'registration_confirmation': 'Registration Confirmation',
      'team_invite': 'Team Invite',
      'password_reset': 'Password Reset',
      'welcome_email': 'Welcome Email',
      'guardian_invite': 'Guardian Invite',
      'athlete_invite': 'Athlete Invite',
      'athlete_account_created': 'Athlete Account Created',
      'athlete_linked': 'Athlete Linked',
      'ticket_receipt': 'Ticket Receipt',
      'uniform_notification': 'Uniform Notification',
      'travel_notification': 'Travel Notification',
      'photo_moderation': 'Photo Moderation',
      'rsvp_notification': 'RSVP Notification',
      'guardian_attachment_request_submitted': 'Guardian Attachment Request Submitted',
      'guardian_attachment_request_reviewed': 'Guardian Attachment Request Reviewed',
      'org_contact_request': 'Org Contact Request',
      'platform_feature_request_signal': 'Platform Feature Request Signal',
      'welcome_org_admin': 'Welcome - Org Admin',
      'welcome_coach': 'Welcome - Coach',
      'welcome_parent': 'Welcome - Parent',
      'welcome_staff': 'Welcome - Staff',
      'welcome_fan': 'Welcome - Fan',
      'email_verification': 'Email Verification',
      'password_changed_confirmation': 'Password Changed Confirmation',
      'email_changed_confirmation': 'Email Address Changed Confirmation',
      'account_deactivated': 'Account Deactivated',
      'account_reactivated': 'Account Reactivated',
      'org_admin_invite': 'Org Admin Invite',
      'coach_invite': 'Coach Invite',
      'staff_invite': 'Staff Invite',
      'parent_invite': 'Parent Invite (Guardian Invite)',
      'role_updated_notification': 'Role Updated Notification',
      'removed_from_org': 'Removed From Organization',
      'added_to_team': 'Added to Team',
      'removed_from_team': 'Removed from Team',
      'team_assignment_athlete': 'Team Assignment - Athlete',
      'team_assignment_updated': 'Team Assignment Updated',
      'event_created': 'Event Created (Internal Notice)',
      'event_published': 'Event Published',
      'event_reminder_7d': 'Event Reminder - 7 Days',
      'event_reminder_24h': 'Event Reminder - 24 Hours',
      'event_reminder_2h': 'Event Reminder - 2 Hours',
      'event_updated': 'Event Updated',
      'event_cancelled': 'Event Cancelled',
      'rsvp_confirmation': 'RSVP Confirmation',
      'rsvp_change_confirmation': 'RSVP Change Confirmation',
      'ticket_purchase_confirmation_non_payment': 'Ticket Purchase Confirmation (Non-payment)',
      'payment_failed': 'Payment Failed',
      'refund_issued': 'Refund Issued',
      'partial_refund_issued': 'Partial Refund Issued',
      'chargeback_alert': 'Chargeback Alert (Internal)',
      'payout_summary': 'Payout Summary',
      'season_pass_confirmation': 'Season Pass Purchase Confirmation',
      'invoice_available': 'Invoice Available',
      'payment_reminder': 'Payment Reminder',
      'org_announcement': 'New Organization Announcement',
      'team_announcement': 'New Team Announcement',
      'announcement_edited': 'Announcement Edited',
      'direct_message_notification': 'Direct Message Notification',
      'comment_reply_notification': 'Comment Reply Notification',
      'guardian_linked_confirmation': 'Guardian Linked Confirmation',
      'guardian_removed': 'Guardian Removed Notification',
      'athlete_profile_updated': 'Athlete Profile Updated',
      'medical_form_submitted': 'Medical Form Submitted (Internal)',
      'medical_form_expiring_soon': 'Medical Form Expiring Soon',
      'document_uploaded_confirmation': 'Document Uploaded Confirmation',
      'new_gallery_published': 'New Gallery Published',
      'photo_tag_notification': 'Photo Tag Notification',
      'video_uploaded_internal': 'Video Uploaded (Internal)',
      'org_subscription_started': 'Organization Subscription Started',
      'org_subscription_renewed': 'Organization Subscription Renewed',
      'org_subscription_failed': 'Organization Subscription Failed',
      'org_subscription_canceled': 'Organization Subscription Canceled',
      'trial_ending_soon': 'Trial Ending Soon',
      'license_tier_changed': 'License Tier Changed',
      'billing_info_updated': 'Billing Info Updated Confirmation',
      'suspicious_login_alert': 'Suspicious Login Alert',
      'new_device_login_alert': 'New Device Login Alert',
      'data_export_ready': 'Data Export Ready',
      'privacy_policy_update': 'Privacy Policy Update',
      'terms_update': 'Terms of Service Update',
      'maintenance_notification': 'Maintenance Notification',
      'incident_notification': 'Incident Notification',
      'new_org_signup_internal': 'New Org Signup (Internal)',
      'large_purchase_alert': 'Large Purchase Alert',
      'multiple_failed_payments_alert': 'Multiple Failed Payments Alert',
      'guardian_invite_expiring_soon': 'Guardian Invite Expiring Soon',
      'event_overcapacity_warning': 'Event Overcapacity Warning',
      'season_kickoff_welcome': 'Season Kickoff Welcome',
      'mid_season_check_in': 'Mid-Season Check-In',
      'end_of_season_summary': 'End of Season Summary',
      'fan_engagement_highlight': 'Fan Engagement Highlight',
      'donation_campaign_launch': 'Donation Campaign Launch',
    };
    return typeMap[type] || type;
  };

  const columns: ColumnConfig<EmailTemplate>[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <div 
            style={{ 
              fontWeight: 600,
              color: row.is_active 
                ? '#6ee7b7' // Soft green
                : '#fca5a5' // Soft red
            }}
          >
            {row.name}
          </div>
          {row.description && (
            <div className="pa-text-xs pa-text-gray-500" style={{ fontSize: '11px', marginTop: '2px' }}>
              {row.description}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'category',
      label: 'Category',
      sortable: true,
      render: (row) => row.category ? <Badge variant="neutral">{row.category}</Badge> : <span className="pa-text-gray-400">—</span>
    },
    {
      id: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => <Badge variant="neutral">{getTypeLabel(row.type)}</Badge>
    },
    {
      id: 'updated_at',
      label: 'Last Modified',
      sortable: true,
      render: (row) => formatRelativeTime(row.updated_at)
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'center',
      render: (row) => (
        <div className="pa-flex pa-gap-2 pa-justify-center">
          <Button 
            variant="ghost" 
            size="small" 
            onClick={(e: MouseEvent) => { e.stopPropagation(); handleEdit(row.slug); }}
          >
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="small"
            onClick={(e: MouseEvent) => { e.stopPropagation(); handleDuplicate(row.id); }}
          >
            Duplicate
          </Button>
          <Button 
            variant="ghost"
            className="pa-text-red-600 hover:pa-text-red-700 hover:pa-bg-red-50 disabled:pa-opacity-50 disabled:pa-cursor-not-allowed"
            size="small"
            disabled={row.is_active}
            title={row.is_active ? "Deactivate template to delete it" : "Delete template"}
            onClick={(e: MouseEvent) => { 
                e.stopPropagation();
                setConfirmDialog({ open: true, action: 'delete', templateId: row.id, bulkIds: null });
            }}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader
        title="Email Templates"
        subtitle="Manage automated email notifications"
        actions={
          <div className="pa-flex pa-gap-2">
             <Button variant="primary" onClick={() => navigate(getLink('platformAdmin.emails.create'))}>
                <Plus size={18} className="pa-mr-2" />
                Create Template
             </Button>
          </div>
        }
      />

      {/* Search and Filter Bar */}
      <div className="pa-card pa-mb-4" style={{ padding: 'var(--pa-space-4)' }}>
        <div className="pa-flex pa-flex-wrap pa-gap-3 pa-items-end">
          {/* Search */}
          <div style={{ flex: '1 1 300px', minWidth: '250px' }}>
            <label className="pa-block pa-text-sm pa-font-medium pa-mb-1">Search</label>
            <div className="pa-relative">
              <Search size={18} className="pa-absolute pa-left-3 pa-top-1/2 pa-transform -pa-translate-y-1/2 pa-text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, description, slug, or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ flex: '0 1 200px', minWidth: '180px' }}>
            <label className="pa-block pa-text-sm pa-font-medium pa-mb-1">Category</label>
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              options={CATEGORY_OPTIONS}
            />
          </div>

          {/* Status Filter */}
          <div style={{ flex: '0 1 150px', minWidth: '130px' }}>
            <label className="pa-block pa-text-sm pa-font-medium pa-mb-1">Status</label>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              options={STATUS_OPTIONS}
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div>
              <Button variant="ghost" size="small" onClick={handleClearFilters}>
                <X size={16} className="pa-mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div
          className="pa-card"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            marginBottom: 'var(--pa-space-4)',
            padding: 'var(--pa-space-3) var(--pa-space-4)',
            borderLeft: '3px solid var(--pa-primary)',
            background: 'var(--pa-primary-bg, rgba(59, 130, 246, 0.1))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--pa-space-3)', marginBottom: bulkProgress.isActive ? 'var(--pa-space-3)' : 0 }}>
            <span className="pa-body-m" style={{ fontWeight: 600 }}>
              {selectedIds.size} template{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', flexWrap: 'wrap' }}>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={handleBulkActivate}
                disabled={bulkProgress.isActive}
              >
                Activate
              </Button>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={handleBulkDeactivate}
                disabled={bulkProgress.isActive}
              >
                Deactivate
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={!canBulkDelete || bulkProgress.isActive}
                title={hasActiveSelected ? 'Deactivate templates before deleting' : 'Delete selected templates'}
                onClick={handleBulkDeleteClick}
                className="pa-text-red-600 hover:pa-text-red-700 hover:pa-bg-red-50"
              >
                Delete
              </Button>
              <Button 
                variant="ghost" 
                size="small" 
                onClick={handleClearSelection}
                disabled={bulkProgress.isActive}
              >
                Clear selection
              </Button>
            </div>
          </div>
          
          {bulkProgress.isActive && (
            <div style={{ marginTop: 'var(--pa-space-3)' }}>
              <ProgressBar
                value={(bulkProgress.current / bulkProgress.total) * 100}
                label={
                  bulkProgress.action === 'activate'
                    ? `Activating templates...`
                    : bulkProgress.action === 'deactivate'
                    ? `Deactivating templates...`
                    : `Deleting templates...`
                }
                status={`${bulkProgress.current} of ${bulkProgress.total} completed${bulkProgress.errors.length > 0 ? ` (${bulkProgress.errors.length} failed)` : ''}`}
                error={bulkProgress.errors.length > 0 ? undefined : undefined}
              />
              {bulkProgress.errors.length > 0 && (
                <div style={{ marginTop: 'var(--pa-space-2)', fontSize: '12px', color: 'var(--pa-danger)' }}>
                  Failed: {bulkProgress.errors.slice(0, 3).join(', ')}
                  {bulkProgress.errors.length > 3 && ` and ${bulkProgress.errors.length - 3} more`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <PlatformDataTable
        columns={columns}
        data={data}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={(newRowsPerPage) => {
          setRowsPerPage(newRowsPerPage);
          setPage(0); // Reset to first page when rows per page changes
        }}
        onRowClick={(row) => handleEdit(row.slug)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(updater) => {
          setSelectedIds(typeof updater === 'function' ? updater(selectedIds) : updater);
        }}
        selectAllMode={selectAllMode}
        onSelectAllChange={setSelectAllMode}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={
          confirmDialog.action === 'duplicate'
            ? 'Are you sure you want to duplicate this template?'
            : confirmDialog.action === 'bulk_delete'
            ? `Delete ${confirmDialog.bulkIds?.length ?? 0} template${confirmDialog.bulkIds?.length === 1 ? '' : 's'}?`
            : 'Are you sure you want to delete this template?'
        }
        description={
          confirmDialog.action === 'duplicate'
            ? 'Are you sure you want to duplicate this template?'
            : confirmDialog.action === 'bulk_delete'
            ? 'This action cannot be undone.'
            : 'Are you sure you want to delete this template?'
        }
        confirmLabel={confirmDialog.action === 'duplicate' ? 'Duplicate' : 'Delete'}
        cancelLabel="Cancel"
        variant={confirmDialog.action === 'delete' || confirmDialog.action === 'bulk_delete' ? 'danger' : 'primary'}
        onConfirm={() => { void handleConfirmAction() }}
        onCancel={() => setConfirmDialog({ open: false, action: null, templateId: null, bulkIds: null })}
      />
    </div>
  );
}
