import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
    AdminPageHeader, 
    Card, 
    Button, 
    Badge, 
    PlatformDataTable, 
    ConfirmDialog,
    ErrorState
} from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import type { ColumnConfig } from '../../components/platformAdmin/PlatformDataTable'
import { useUserContext } from '../../hooks/useUserContext'
import { 
    getFamilyDetails, 
    deleteFamily, 
    deleteAthlete 
} from '../../data/services/familyService'
import { useT } from '../../i18n/useI18n'
import type { FamilyWithDetails, Child, FamilyMember } from '../../types/family'
import { getLink } from '../../utils/routes'

export default function FamilyDetail() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const { context, isReady } = useUserContext()
    const t = useT()
    
    const [family, setFamily] = useState<FamilyWithDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    
    // Delete Dialog States
    const [deleteFamilyOpen, setDeleteFamilyOpen] = useState(false)
    const [childToDelete, setChildToDelete] = useState<string | null>(null)
    const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string } | null>(null)

    const fetchDetail = async () => {
        if (!id || !isReady) return
        setLoading(true)
        const { data, error } = await getFamilyDetails(context, id)
        if (error) setError(error)
        else setFamily(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchDetail()
    }, [id, context, isReady])

    const handleDeleteFamily = async () => {
        if (!family || !isReady) return
        const { error } = await deleteFamily(context, family.id)
        if (error) {
            setAlertDialog({
                open: true,
                title: 'Failed to delete family',
                message: error.message
            })
            return
        }
        navigate(getLink('admin.guardians.list'))
    }

    const handleDeleteChild = async () => {
        if (!childToDelete || !isReady) return
        const { error } = await deleteAthlete(context, childToDelete)
        if (error) {
            setAlertDialog({
                open: true,
                title: t('admin.families.errorDeleteChild'),
                message: error.message
            })
        } else {
            await fetchDetail() 
        }
        setChildToDelete(null)
    }

    // Children Columns
    const childColumns: ColumnConfig<Child>[] = [
        {
            id: 'first_name',
            label: 'Name',
            render: (c) => (
                <div className="pa-flex pa-flex-col">
                    <span className="pa-text-primary" style={{ fontWeight: 600 }}>{c?.first_name} {c?.last_name}</span>
                    {c?.date_of_birth && (
                        <span className="pa-text-xs pa-text-muted">DOB: {new Date(c.date_of_birth).toLocaleDateString()}</span>
                    )}
                </div>
            )
        },
        {
            id: 'gender',
            label: 'Gender',
            render: (c) => <span className="pa-capitalize">{c?.gender || '-'}</span>
        },
        {
            id: 'id',
            label: 'Actions',
            align: 'right',
            render: (c) => c?.id ? (
                <div className="pa-flex pa-gap-2 pa-justify-end" onClick={(e) => e.stopPropagation()}>
                     <button 
                        className="pa-btn-icon pa-text-danger"
                        onClick={() => setChildToDelete(c.id)}
                        title={t('admin.families.deleteChild')}
                     >
                        <span className="material-symbols-outlined">delete</span>
                     </button>
                </div>
            ) : null
        }
    ]

    // Members Columns
    const memberColumns: ColumnConfig<FamilyMember>[] = [
        {
            id: 'user_id',
            label: 'User ID', 
            render: (m) => <span className="pa-font-mono pa-text-xs">{m?.user_id ? `${m.user_id.substring(0,8)}...` : '-'}</span>
        },
        {
            id: 'role',
            label: 'Role',
            render: (m) => <Badge variant={m?.role === 'owner' ? 'info' : 'neutral'}>{m?.role || 'Unknown'}</Badge>
        },
         {
            id: 'created_at',
            label: 'Joined',
            render: (m) => m?.created_at ? new Date(m.created_at).toLocaleDateString() : '-'
        }
    ]

    if (!isReady) return <AdminLoadingSpinner />
    if (loading) return <div className="pa-loader" />
    if (error) return <ErrorState title="Error Loading Family" message={error.message} onRetry={fetchDetail} />
    if (!family) return <ErrorState title="Not Found" message="Family not found." />

    return (
        <div className="pa-root">
            <AdminPageHeader 
                title={family.name?.toUpperCase() || 'FAMILY'} 
                breadcrumbs={[
                    { label: 'Families', path: '/admin/families' },
                    { label: family.name || 'Detail' }
                ]}
                actions={
                    <Button variant="danger" onClick={() => setDeleteFamilyOpen(true)} className="w-full sm:w-auto min-h-[44px]">
                        Delete Family
                    </Button>
                }
            />

            <div className="pa-form-container">
                <div className="pa-grid pa-grid-cols-1 lg:pa-grid-cols-12 pa-gap-6">
                    
                    {/* Children Section */}
                    <div className="lg:pa-col-span-8">
                        <Card>
                            <div className="pa-flex pa-flex-col sm:pa-flex-row pa-justify-between pa-items-stretch sm:pa-items-center pa-gap-3 pa-mb-4">
                                <h3 className="pa-h3">{t('admin.families.children')}</h3>
                                <Button size="compact" variant="primary" onClick={() => navigate(getLink('admin.guardians.createAthlete', { familyId: family.id }))} className="w-full sm:w-auto min-h-[44px]">
                                    <span className="material-symbols-outlined">add</span>
                                    {t('admin.families.addChild')}
                                </Button>
                            </div>
                            <PlatformDataTable
                                data={family.children || []}
                                columns={childColumns}
                                page={0}
                                rowsPerPage={family.children?.length || 0}
                                totalCount={family.children?.length || 0}
                                onPageChange={() => {}}
                                onRowsPerPageChange={() => {}}
                                emptyMessage={t('admin.families.noChildren')}
                            />
                        </Card>
                    </div>

                    {/* Members Section */}
                    <div className="lg:pa-col-span-4">
                        <Card>
                            <div className="pa-flex pa-justify-between pa-items-center pa-mb-4">
                                <h3 className="pa-h3">Guardians</h3>
                            </div>
                             <PlatformDataTable
                                data={family.members || []}
                                columns={memberColumns}
                                page={0}
                                rowsPerPage={family.members?.length || 0}
                                totalCount={family.members?.length || 0}
                                onPageChange={() => {}}
                                onRowsPerPageChange={() => {}}
                                emptyMessage="No guardians found."
                            />
                        </Card>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <ConfirmDialog
                open={deleteFamilyOpen}
                title="Delete Family?"
                description="This will remove the family and all associated data. This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={() => handleDeleteFamily()}
                onCancel={() => setDeleteFamilyOpen(false)}
            />

            <ConfirmDialog
                open={!!childToDelete}
                title={t('admin.families.removeChildTitle')}
                description={t('admin.families.removeChildMessage')}
                confirmLabel="Remove"
                variant="danger"
                onConfirm={() => handleDeleteChild()}
                onCancel={() => setChildToDelete(null)}
            />

            {alertDialog && (
                <ConfirmDialog
                    open={alertDialog.open}
                    title={alertDialog.title}
                    description={alertDialog.message}
                    confirmLabel="OK"
                    cancelLabel={null}
                    variant="danger"
                    onConfirm={() => setAlertDialog(null)}
                    onCancel={() => setAlertDialog(null)}
                />
            )}
        </div>
    )
}

