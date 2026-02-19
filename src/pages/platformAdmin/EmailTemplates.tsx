import { useState, useCallback, useEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getLink } from '../../utils/routes';
import { PageHeader, PlatformDataTable, Badge, Button, ColumnConfig } from '../../components/platformAdmin';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { emailTemplatesService } from '../../data/services/emailTemplatesService';
import { EmailTemplate } from '../../types/emailTemplates.types';
import { toast } from 'react-hot-toast';

export default function EmailTemplates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmailTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'duplicate' | 'delete' | null;
    templateId: string | null;
  }>({ open: false, action: null, templateId: null });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const result = await emailTemplatesService.getEmailTemplates(page + 1, rowsPerPage);
      setData(result.data);
      setTotalCount(result.count);
    } catch (error) {
      console.error('Failed to load templates', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = (slug: string) => {
    navigate(`/platform-admin/emails/${slug}/edit`);
  };


  const handleDuplicate = (id: string) => {
    setConfirmDialog({ open: true, action: 'duplicate', templateId: id });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog.templateId || !confirmDialog.action) return;
    const templateId = confirmDialog.templateId;
    const action = confirmDialog.action;
    setConfirmDialog({ open: false, action: null, templateId: null });

    try {
      if (action === 'duplicate') {
        await emailTemplatesService.duplicateTemplate(templateId);
        toast.success('Template duplicated');
      } else {
        await emailTemplatesService.deleteEmailTemplate(templateId);
        toast.success('Deleted');
      }
      await fetchTemplates();
    } catch (error) {
      if (action === 'duplicate') {
        console.error('Failed to duplicate template', error);
        toast.error('Failed to duplicate template');
      } else {
        toast.error('Failed to delete');
      }
    }
  };

  const columns: ColumnConfig<EmailTemplate>[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="pa-font-medium">{row.name}</div>
          <div className="pa-text-xs pa-text-gray-500">{row.description}</div>
        </div>
      )
    },
    {
      id: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => <Badge variant="neutral">{row.type}</Badge>
    },
    {
      id: 'updated_at',
      label: 'Last Modified',
      sortable: true,
      render: (row) => new Date(row.updated_at).toLocaleString()
    },
    {
      id: 'is_active',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'neutral'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="pa-flex pa-gap-2 pa-justify-end">
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
                setConfirmDialog({ open: true, action: 'delete', templateId: row.id });
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

      <PlatformDataTable
        columns={columns}
        data={data}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={(row) => handleEdit(row.slug)}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={
          confirmDialog.action === 'duplicate'
            ? 'Are you sure you want to duplicate this template?'
            : 'Are you sure you want to delete this template?'
        }
        description={
          confirmDialog.action === 'duplicate'
            ? 'Are you sure you want to duplicate this template?'
            : 'Are you sure you want to delete this template?'
        }
        confirmLabel={confirmDialog.action === 'duplicate' ? 'Duplicate' : 'Delete'}
        cancelLabel="Cancel"
        variant={confirmDialog.action === 'delete' ? 'danger' : 'primary'}
        onConfirm={() => { void handleConfirmAction() }}
        onCancel={() => setConfirmDialog({ open: false, action: null, templateId: null })}
      />
    </div>
  );
}
