import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()

// Mock supabase
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: (table: string) => {
            mockFrom(table)
            return {
                select: (cols: string) => {
                    mockSelect(cols)
                    return {
                        eq: mockEq
                    }
                },
                upsert: vi.fn().mockReturnThis()
            }
        }
    }
}))

// Mock config
vi.mock('../config', () => ({
    USE_FAKE_DATA: false
}))

// Mock fake service to prevent loading it
vi.mock('../fake/organizationContactsFakeService', () => ({}))

// Import the service AFTER mocks
import { getContactForCategory } from './organizationContactsService'

describe('getContactForCategory', () => {
    const orgId = 'org-123'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return null if no contacts found (db error or empty)', async () => {
        // Mock eq to return error
        mockEq.mockResolvedValue({ data: null, error: new Error('DB Error') })

        const result = await getContactForCategory(orgId, 'billing')
        expect(result.data).toBeNull()
        expect(result.error).toBeDefined()
    })

    it('should return specific category contact if valid and custom', async () => {
        const mockContacts = [
            { category: 'default', is_custom: true, first_name: 'Def', last_name: 'Ault', email: 'def@test.com' },
            { category: 'billing', is_custom: true, first_name: 'Bill', last_name: 'Ing', email: 'bill@test.com' }
        ]

        mockEq.mockResolvedValue({ data: mockContacts, error: null })

        const result = await getContactForCategory(orgId, 'billing')
        expect(result.data).toEqual(mockContacts[1])
    })

    it('should fallback to default if category contact is not custom', async () => {
        const mockContacts = [
            { category: 'default', is_custom: true, first_name: 'Def', last_name: 'Ault', email: 'def@test.com' },
            { category: 'billing', is_custom: false, first_name: '', last_name: '', email: '' }
        ]

        mockEq.mockResolvedValue({ data: mockContacts, error: null })

        const result = await getContactForCategory(orgId, 'billing')
        expect(result.data).toEqual(mockContacts[0])
    })

    it('should fallback to default if category contact is missing required fields', async () => {
        const mockContacts = [
            { category: 'default', is_custom: true, first_name: 'Def', last_name: 'Ault', email: 'def@test.com' },
            { category: 'billing', is_custom: true, first_name: '', last_name: 'Ing', email: 'bill@test.com' } // Missing first name
        ]

        mockEq.mockResolvedValue({ data: mockContacts, error: null })

        const result = await getContactForCategory(orgId, 'billing')
        expect(result.data).toEqual(mockContacts[0])
    })

    it('should return null/error if no default contact exists and category fallback needed', async () => {
        const mockContacts = [
            { category: 'billing', is_custom: false, first_name: '', last_name: '', email: '' }
        ]

        mockEq.mockResolvedValue({ data: mockContacts, error: null })

        const result = await getContactForCategory(orgId, 'billing')
        expect(result.data).toBeNull()
        expect(result.error).toBeDefined()
    })
})
