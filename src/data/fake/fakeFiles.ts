/**
 * Fake Files Data Module
 *
 * Provides fake data for file uploads, waivers, and documents.
 * All files are linked to Organization A.
 */

import { DEMO_ORG_A_ID, DEMO_USER_IDS } from '../config'
import {
    CHILD_EMMA_JOHNSON_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_SOPHIA_CHEN_ID,
    FAMILY_JOHNSON_ID,
    FAMILY_CHEN_ID,
} from './fakeUsers'

// ============================================================================
// Types
// ============================================================================

export type FileType = 'waiver' | 'medical_form' | 'photo' | 'document' | 'itinerary' | 'other'
export type FileStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface FakeFile {
    id: string
    org_id: string
    uploaded_by_user_id: string
    family_id: string | null
    child_id: string | null
    file_type: FileType
    file_name: string
    file_path: string
    file_size_bytes: number
    mime_type: string
    status: FileStatus
    expiration_date: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface FakeWaiverTemplate {
    id: string
    org_id: string
    title: string
    description: string | null
    content: string
    is_required: boolean
    requires_annual_renewal: boolean
    created_at: string
    updated_at: string
}

export interface FakeWaiverSignature {
    id: string
    template_id: string
    family_id: string
    child_id: string | null
    signed_by_user_id: string
    signed_at: string
    valid_until: string | null
    ip_address: string | null
    created_at: string
}

// ============================================================================
// File IDs
// ============================================================================

export const FILE_MEDICAL_EMMA_ID = 'file-medical-emma-001'
export const FILE_MEDICAL_LIAM_ID = 'file-medical-liam-002'
export const FILE_PHOTO_EMMA_ID = 'file-photo-emma-003'
export const WAIVER_LIABILITY_ID = 'waiver-liability-001'
export const WAIVER_PHOTO_RELEASE_ID = 'waiver-photo-release-002'

// ============================================================================
// User References
// ============================================================================

const PARENT_ONLY_ID = DEMO_USER_IDS['parent-only@example.com']
const PARENT_ADMIN_ID = DEMO_USER_IDS['parent-admin@example.com']

// ============================================================================
// Fake Files Data
// ============================================================================

export const fakeFiles: FakeFile[] = [
    {
        id: FILE_MEDICAL_EMMA_ID,
        org_id: DEMO_ORG_A_ID,
        uploaded_by_user_id: PARENT_ONLY_ID,
        family_id: FAMILY_JOHNSON_ID,
        child_id: CHILD_EMMA_JOHNSON_ID,
        file_type: 'medical_form',
        file_name: 'emma_johnson_medical_form_2024.pdf',
        file_path: 'families/johnson/medical/emma_medical_2024.pdf',
        file_size_bytes: 245760, // 240 KB
        mime_type: 'application/pdf',
        status: 'approved',
        expiration_date: '2025-01-01',
        notes: 'Annual physical completed by Dr. Smith',
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-12T00:00:00Z',
    },
    {
        id: FILE_MEDICAL_LIAM_ID,
        org_id: DEMO_ORG_A_ID,
        uploaded_by_user_id: PARENT_ONLY_ID,
        family_id: FAMILY_JOHNSON_ID,
        child_id: CHILD_LIAM_JOHNSON_ID,
        file_type: 'medical_form',
        file_name: 'liam_johnson_medical_form_2024.pdf',
        file_path: 'families/johnson/medical/liam_medical_2024.pdf',
        file_size_bytes: 198656, // 194 KB
        mime_type: 'application/pdf',
        status: 'approved',
        expiration_date: '2025-01-01',
        notes: 'Includes asthma action plan and inhaler authorization',
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-12T00:00:00Z',
    },
    {
        id: FILE_PHOTO_EMMA_ID,
        org_id: DEMO_ORG_A_ID,
        uploaded_by_user_id: PARENT_ONLY_ID,
        family_id: FAMILY_JOHNSON_ID,
        child_id: CHILD_EMMA_JOHNSON_ID,
        file_type: 'photo',
        file_name: 'emma_johnson_headshot.jpg',
        file_path: 'families/johnson/photos/emma_headshot.jpg',
        file_size_bytes: 524288, // 512 KB
        mime_type: 'image/jpeg',
        status: 'approved',
        expiration_date: null,
        notes: 'Player photo for roster',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: 'file-medical-sophia-001',
        org_id: DEMO_ORG_A_ID,
        uploaded_by_user_id: PARENT_ADMIN_ID,
        family_id: FAMILY_CHEN_ID,
        child_id: CHILD_SOPHIA_CHEN_ID,
        file_type: 'medical_form',
        file_name: 'sophia_chen_medical_2024.pdf',
        file_path: 'families/chen/medical/sophia_medical_2024.pdf',
        file_size_bytes: 286720, // 280 KB
        mime_type: 'application/pdf',
        status: 'pending',
        expiration_date: '2025-01-01',
        notes: null,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Waiver Templates
// ============================================================================

export const fakeWaiverTemplates: FakeWaiverTemplate[] = [
    {
        id: WAIVER_LIABILITY_ID,
        org_id: DEMO_ORG_A_ID,
        title: 'Liability Waiver and Release',
        description: 'Required waiver for all participants. Must be signed annually.',
        content: `LIABILITY WAIVER AND RELEASE OF CLAIMS

I, the undersigned parent or legal guardian of the minor child named in this registration, hereby acknowledge and agree to the following:

1. ASSUMPTION OF RISK: I understand that participation in youth sports activities involves inherent risks, including but not limited to physical injury, illness, and death.

2. RELEASE OF LIABILITY: I hereby release and discharge the organization, its officers, directors, employees, coaches, and volunteers from any and all liability for injuries or damages.

3. MEDICAL AUTHORIZATION: In the event of an emergency, I authorize the organization to obtain emergency medical treatment for my child.

4. PHOTO/VIDEO CONSENT: I consent to the use of photographs and videos of my child for promotional purposes.

By signing below, I acknowledge that I have read, understand, and agree to the terms of this waiver.`,
        is_required: true,
        requires_annual_renewal: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
    },
    {
        id: WAIVER_PHOTO_RELEASE_ID,
        org_id: DEMO_ORG_A_ID,
        title: 'Photo and Video Release',
        description: 'Optional consent for social media and promotional use of photos.',
        content: `PHOTO AND VIDEO RELEASE

I hereby grant permission to Riverside Youth Athletics to use photographs and/or video of my child for:
- Website and social media
- Promotional materials
- Team photos and yearbooks
- Local press coverage

I understand that I may revoke this consent at any time by contacting the organization in writing.`,
        is_required: false,
        requires_annual_renewal: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Waiver Signatures
// ============================================================================

export const fakeWaiverSignatures: FakeWaiverSignature[] = [
    // Johnson Family - Both waivers signed
    {
        id: 'sig-001',
        template_id: WAIVER_LIABILITY_ID,
        family_id: FAMILY_JOHNSON_ID,
        child_id: CHILD_EMMA_JOHNSON_ID,
        signed_by_user_id: PARENT_ONLY_ID,
        signed_at: '2024-01-15T14:30:00Z',
        valid_until: '2025-01-15',
        ip_address: '192.168.1.100',
        created_at: '2024-01-15T14:30:00Z',
    },
    {
        id: 'sig-002',
        template_id: WAIVER_LIABILITY_ID,
        family_id: FAMILY_JOHNSON_ID,
        child_id: CHILD_LIAM_JOHNSON_ID,
        signed_by_user_id: PARENT_ONLY_ID,
        signed_at: '2024-01-15T14:31:00Z',
        valid_until: '2025-01-15',
        ip_address: '192.168.1.100',
        created_at: '2024-01-15T14:31:00Z',
    },
    {
        id: 'sig-003',
        template_id: WAIVER_PHOTO_RELEASE_ID,
        family_id: FAMILY_JOHNSON_ID,
        child_id: null, // Family-wide consent
        signed_by_user_id: PARENT_ONLY_ID,
        signed_at: '2024-01-15T14:32:00Z',
        valid_until: null,
        ip_address: '192.168.1.100',
        created_at: '2024-01-15T14:32:00Z',
    },
    // Chen Family - Liability only
    {
        id: 'sig-004',
        template_id: WAIVER_LIABILITY_ID,
        family_id: FAMILY_CHEN_ID,
        child_id: CHILD_SOPHIA_CHEN_ID,
        signed_by_user_id: PARENT_ADMIN_ID,
        signed_at: '2024-02-01T10:00:00Z',
        valid_until: '2025-02-01',
        ip_address: '192.168.1.101',
        created_at: '2024-02-01T10:00:00Z',
    },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getFileById(fileId: string): FakeFile | undefined {
    return fakeFiles.find((f) => f.id === fileId)
}

export function getFilesForOrg(orgId: string): FakeFile[] {
    return fakeFiles.filter((f) => f.org_id === orgId)
}

export function getFilesForFamily(familyId: string): FakeFile[] {
    return fakeFiles.filter((f) => f.family_id === familyId)
}

export function getFilesForChild(childId: string): FakeFile[] {
    return fakeFiles.filter((f) => f.child_id === childId)
}

export function getMedicalFormsForChild(childId: string): FakeFile[] {
    return fakeFiles.filter((f) => f.child_id === childId && f.file_type === 'medical_form')
}

export function getPendingFiles(orgId: string): FakeFile[] {
    return fakeFiles.filter((f) => f.org_id === orgId && f.status === 'pending')
}

export function getWaiverTemplates(orgId: string): FakeWaiverTemplate[] {
    return fakeWaiverTemplates.filter((w) => w.org_id === orgId)
}

export function getRequiredWaiverTemplates(orgId: string): FakeWaiverTemplate[] {
    return fakeWaiverTemplates.filter((w) => w.org_id === orgId && w.is_required)
}

export function getWaiverSignaturesForFamily(familyId: string): FakeWaiverSignature[] {
    return fakeWaiverSignatures.filter((s) => s.family_id === familyId)
}

export function getWaiverSignaturesForChild(childId: string): FakeWaiverSignature[] {
    return fakeWaiverSignatures.filter((s) => s.child_id === childId || s.child_id === null)
}

export function hasSignedWaiver(familyId: string, templateId: string, childId?: string): boolean {
    return fakeWaiverSignatures.some(
        (s) =>
            s.family_id === familyId &&
            s.template_id === templateId &&
            (childId ? s.child_id === childId : true)
    )
}

export function isWaiverExpired(signature: FakeWaiverSignature): boolean {
    if (!signature.valid_until) return false
    return new Date(signature.valid_until) < new Date()
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
