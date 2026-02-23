/**
 * Customer Selector Component
 *
 * Reusable searchable customer dropdown for forms
 */

import { useState, useEffect, useMemo } from 'react'
import { useT } from '../../i18n/useI18n'
import { getCustomers } from '../../data/services/customerService'
import type { Customer } from '../../types/customers'
import { Select } from './'

interface CustomerSelectorProps {
    orgId: string
    value: string | null
    onChange: (customerId: string | null) => void
    placeholder?: string
    allowCreate?: boolean
    disabled?: boolean
    error?: string
}

export default function CustomerSelector({
    orgId,
    value,
    onChange,
    placeholder,
    allowCreate: _allowCreate = false,
    disabled = false,
    error,
}: CustomerSelectorProps) {
    const t = useT()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(false)

    // Load customers on mount
    useEffect(() => {
        if (!orgId) return

        const loadCustomers = async () => {
            setLoading(true)
            try {
                const result = await getCustomers(orgId)
                if (result.data) {
                    setCustomers(result.data)
                }
            } catch (err) {
                console.error('Failed to load customers:', err)
            } finally {
                setLoading(false)
            }
        }

        loadCustomers()
    }, [orgId])

    // Build options for select
    const options = useMemo(() => {
        const customerOptions = customers.map((c) => ({
            value: c.id,
            label: c.name,
        }))

        return [
            { value: '', label: placeholder || t('admin.customers.form.selectCustomer') },
            ...customerOptions,
        ]
    }, [customers, placeholder, t])

    return (
        <Select
            label={t('admin.customers.form.customer')}
            value={value || ''}
            onChange={(e) => onChange(e.target.value || null)}
            options={options}
            disabled={disabled || loading}
            error={error}
        />
    )
}
