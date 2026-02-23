/**
 * Customers List Page
 *
 * Lists all customers in the organization with filtering and CRUD operations.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { AdminPageHeader, ConfirmDialog, Button, Card } from '../../components/admin'
import { useFeatureGate } from '../../lib/featureGate'
import { getCustomers, deleteCustomer } from '../../data/services/customerService'
import type { Customer, CustomerFilters } from '../../types/customers'
import CustomerFormSlideOver from '../../components/admin/CustomerFormSlideOver'
import '../../styles/orgAdmin.css'

const DEFAULT_FILTERS: CustomerFilters = {
    search: '',
}

export default function Customers() {
    // Feature gate check
    const { allowed, loading: gateLoading } = useFeatureGate('facilities_schedule')

    // Data state
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filters
    const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS)
    const [searchInput, setSearchInput] = useState('')

    // Forms
    const [customerFormOpen, setCustomerFormOpen] = useState(false)
    const [customerFormEditing, setCustomerFormEditing] = useState<Customer | null>(null)

    // Delete dialog
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; customer: Customer | null }>({
        open: false,
        customer: null,
    })
    const [, setActionLoading] = useState(false)

    const { context, isReady } = useUserContext()
    const t = useT()

    const fetchCustomers = useCallback(async () => {
        if (!isReady || !context.orgId) return

        setLoading(true)
        setError(null)

        try {
            const result = await getCustomers(context.orgId, filters)

            if (result.error) {
                setError(result.error.message)
                setCustomers([])
            } else {
                setCustomers(result.data || [])
            }
        } catch (err) {
            const errorMessage = getErrorMessage(err) || t('admin.customers.errors.loadFailed')
            setError(errorMessage)
            setCustomers([])
        } finally {
            setLoading(false)
        }
    }, [isReady, context.orgId, filters, t])

    useEffect(() => {
        fetchCustomers()
    }, [fetchCustomers])

    // Handle search
    const handleSearch = () => {
        setFilters({ search: searchInput.trim() || undefined })
    }

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch()
        }
    }

    // Action handlers
    const handleCreateCustomer = () => {
        setCustomerFormEditing(null)
        setCustomerFormOpen(true)
    }

    const handleEditCustomer = (customer: Customer) => {
        setCustomerFormEditing(customer)
        setCustomerFormOpen(true)
    }

    const handleDeleteCustomer = (customer: Customer) => {
        setDeleteDialog({ open: true, customer })
    }

    const handleConfirmDelete = async () => {
        if (!deleteDialog.customer) return

        setActionLoading(true)
        try {
            const result = await deleteCustomer(deleteDialog.customer.id)

            if (result.error) {
                showError(result.error.message || t('admin.customers.errors.deleteFailed'))
            } else {
                showSuccess(t('admin.customers.success.deleted'))
                setDeleteDialog({ open: false, customer: null })
                fetchCustomers()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.customers.errors.deleteFailed'))
        } finally {
            setActionLoading(false)
        }
    }

    const handleCustomerSaved = () => {
        setCustomerFormOpen(false)
        setCustomerFormEditing(null)
        fetchCustomers()
    }

    // Show feature gate overlay if not allowed
    if (!gateLoading && !allowed) {
        return (
            <div style={{ padding: '64px', textAlign: 'center' }}>
                <h2>{t('admin.customers.title')}</h2>
                <p>{t('common.featureNotAvailable')}</p>
            </div>
        )
    }

    return (
        <div>
            <AdminPageHeader
                title={t('admin.customers.title')}
                subtitle={t('admin.customers.subtitle')}
                actions={
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                className="oa-input"
                                placeholder={t('admin.customers.filters.search')}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                style={{ width: '300px' }}
                            />
                            <Button variant="secondary" onClick={handleSearch} icon="search">
                                {t('common.search')}
                            </Button>
                        </div>
                        <Button variant="primary" onClick={handleCreateCustomer} icon="add">
                            {t('admin.customers.create')}
                        </Button>
                    </div>
                }
            />

            {error && (
                <div
                    style={{
                        padding: '16px',
                        marginBottom: '24px',
                        background: 'var(--pa-danger-light)',
                        color: 'var(--pa-danger)',
                        borderRadius: '8px',
                    }}
                >
                    {error}
                    <Button
                        variant="ghost"
                        onClick={fetchCustomers}
                        style={{ marginLeft: '12px' }}
                    >
                        {t('common.retry')}
                    </Button>
                </div>
            )}

            {loading ? (
                <div style={{ padding: '64px', textAlign: 'center' }}>
                    <span className="material-symbols-outlined oa-spin" style={{ fontSize: '32px' }}>
                        refresh
                    </span>
                    <div style={{ marginTop: '16px', color: 'var(--org-text-secondary)' }}>
                        {t('common.loading')}
                    </div>
                </div>
            ) : customers.length === 0 ? (
                <Card className="oa-border-2 oa-border-dashed">
                    <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                        <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>people</span>
                        <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                            <h3 className="oa-h3 oa-mb-0">{t('admin.customers.empty.title')}</h3>
                            <p className="oa-body-m oa-text-muted oa-mb-4">{t('admin.customers.empty.message')}</p>
                            <Button variant="primary" onClick={handleCreateCustomer} icon="add">
                                {t('admin.customers.empty.createButton')}
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {customers.map((customer) => (
                        <Card
                            key={customer.id}
                            title={customer.name}
                        >
                            <div style={{ marginBottom: '16px' }}>
                                {customer.contact_email && (
                                    <p
                                        style={{
                                            fontSize: '14px',
                                            color: 'var(--org-text-secondary)',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {customer.contact_email}
                                    </p>
                                )}
                                {customer.contact_phone && (
                                    <p
                                        style={{
                                            fontSize: '14px',
                                            color: 'var(--org-text-secondary)',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {customer.contact_phone}
                                    </p>
                                )}
                                {customer.billing_address && (
                                    <p
                                        style={{
                                            fontSize: '14px',
                                            color: 'var(--org-text-secondary)',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        {[
                                            customer.billing_address.street,
                                            customer.billing_address.city,
                                            customer.billing_address.state,
                                            customer.billing_address.postal_code,
                                        ]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                )}
                                {customer.notes && (
                                    <p
                                        style={{
                                            fontSize: '14px',
                                            color: 'var(--org-text-secondary)',
                                            marginTop: '8px',
                                        }}
                                    >
                                        {customer.notes}
                                    </p>
                                )}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: '8px',
                                    marginTop: '16px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid var(--org-border-default)',
                                }}
                            >
                                <Button
                                    variant="ghost"
                                    size="compact"
                                    onClick={() => handleEditCustomer(customer)}
                                    icon="edit"
                                >
                                    {t('common.edit')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="compact"
                                    onClick={() => handleDeleteCustomer(customer)}
                                    icon="delete"
                                >
                                    {t('common.delete')}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Customer Form Slide-Over */}
            <CustomerFormSlideOver
                isOpen={customerFormOpen}
                onClose={() => {
                    setCustomerFormOpen(false)
                    setCustomerFormEditing(null)
                }}
                customer={customerFormEditing}
                onSaved={handleCustomerSaved}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialog.open}
                title={t('admin.customers.delete')}
                description={
                    deleteDialog.customer
                        ? t('admin.customers.detail.confirmDelete', {
                              name: deleteDialog.customer.name,
                          })
                        : ''
                }
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteDialog({ open: false, customer: null })}
            />
        </div>
    )
}
