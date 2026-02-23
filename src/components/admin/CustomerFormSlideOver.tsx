/**
 * Customer Form Slide-Over Component
 *
 * Create/edit customer form in a slide-over panel
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { Input, Button } from './'
import { createCustomer, updateCustomer } from '../../data/services/customerService'
import type { Customer, CustomerFormData } from '../../types/customers'

interface CustomerFormSlideOverProps {
    isOpen: boolean
    onClose: () => void
    customer: Customer | null
    onSaved: () => void
}

export default function CustomerFormSlideOver({
    isOpen,
    onClose,
    customer,
    onSaved,
}: CustomerFormSlideOverProps) {
    const { context, isReady } = useUserContext()
    const t = useT()

    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        contact_email: '',
        contact_phone: '',
        billing_address: null,
        notes: '',
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    // Initialize form data when customer changes
    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name,
                contact_email: customer.contact_email || '',
                contact_phone: customer.contact_phone || '',
                billing_address: customer.billing_address,
                notes: customer.notes || '',
            })
        } else {
            setFormData({
                name: '',
                contact_email: '',
                contact_phone: '',
                billing_address: null,
                notes: '',
            })
        }
        setErrors({})
    }, [customer, isOpen])

    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) {
                onClose()
            }
        }
        
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, saving, onClose])

    const handleFieldChange = (field: keyof CustomerFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors[field]
                return newErrors
            })
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = t('admin.customers.form.nameRequired')
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!isReady || !context.orgId) return

        if (!validateForm()) {
            return
        }

        setSaving(true)
        try {
            const result = customer
                ? await updateCustomer(customer.id, formData)
                : await createCustomer(context.orgId, formData)

            if (result.error) {
                showError(result.error.message || t('admin.customers.errors.createFailed'))
            } else {
                showSuccess(
                    customer
                        ? t('admin.customers.success.updated')
                        : t('admin.customers.success.created')
                )
                onSaved()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.customers.errors.createFailed'))
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                justifyContent: 'flex-end',
                pointerEvents: isOpen ? 'auto' : 'none',
            }}
        >
            {/* Backdrop */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    transition: 'opacity 0.3s',
                    opacity: isOpen ? 1 : 0,
                }}
                onClick={onClose}
            />

            {/* Slide-Over Panel */}
            <div
                style={{
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '600px',
                    maxWidth: '90vw',
                    height: '100%',
                    background: 'var(--org-surface-card)',
                    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '24px',
                        borderBottom: '1px solid var(--org-border-default)',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: 'var(--org-text-primary)',
                            margin: 0,
                        }}
                    >
                        {customer ? t('admin.customers.edit') : t('admin.customers.create')}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--org-text-secondary)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            close
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px',
                    }}
                >
                    {/* Name */}
                    <Input
                        label={t('admin.customers.form.name')}
                        value={formData.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        error={errors.name}
                        required
                    />

                    {/* Contact Email */}
                    <Input
                        label={t('admin.customers.form.contactEmail')}
                        value={formData.contact_email}
                        onChange={(e) => handleFieldChange('contact_email', e.target.value)}
                        type="email"
                    />

                    {/* Contact Phone */}
                    <Input
                        label={t('admin.customers.form.contactPhone')}
                        value={formData.contact_phone}
                        onChange={(e) => handleFieldChange('contact_phone', e.target.value)}
                        type="tel"
                    />

                    {/* Billing Address */}
                    <div style={{ borderTop: '1px solid var(--org-border-default)', paddingTop: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                            {t('admin.customers.form.billingAddress')}
                        </h3>
                        <Input
                            label={t('admin.customers.form.billingStreet')}
                            value={formData.billing_address?.street || ''}
                            onChange={(e) =>
                                handleFieldChange('billing_address', {
                                    ...formData.billing_address,
                                    street: e.target.value || undefined,
                                })
                            }
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                            <Input
                                label={t('admin.customers.form.billingCity')}
                                value={formData.billing_address?.city || ''}
                                onChange={(e) =>
                                    handleFieldChange('billing_address', {
                                        ...formData.billing_address,
                                        city: e.target.value || undefined,
                                    })
                                }
                            />
                            <Input
                                label={t('admin.customers.form.billingState')}
                                value={formData.billing_address?.state || ''}
                                onChange={(e) =>
                                    handleFieldChange('billing_address', {
                                        ...formData.billing_address,
                                        state: e.target.value || undefined,
                                    })
                                }
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <Input
                                label={t('admin.customers.form.billingPostalCode')}
                                value={formData.billing_address?.postal_code || ''}
                                onChange={(e) =>
                                    handleFieldChange('billing_address', {
                                        ...formData.billing_address,
                                        postal_code: e.target.value || undefined,
                                    })
                                }
                            />
                            <Input
                                label={t('admin.customers.form.billingCountry')}
                                value={formData.billing_address?.country || ''}
                                onChange={(e) =>
                                    handleFieldChange('billing_address', {
                                        ...formData.billing_address,
                                        country: e.target.value || undefined,
                                    })
                                }
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="oa-form-group">
                        <label className="oa-label">{t('admin.customers.form.notes')}</label>
                        <textarea
                            className="oa-input"
                            value={formData.notes}
                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                            rows={3}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: '24px',
                        borderTop: '1px solid var(--org-border-default)',
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end',
                    }}
                >
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
