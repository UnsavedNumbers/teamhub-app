import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

type RoleTuple = { userId: string; orgId: string; role: 'org_admin' | 'coach' | 'parent' }

type SeedUser = {
    email: string
    password: string
    roles: RoleTuple[]
    profile?: { display_name?: string; phone?: string; family_id?: string }
}

const PASSWORD = 'TestPassword123!'

const users: SeedUser[] = [
    {
        email: 'platform-admin@test.com',
        password: PASSWORD,
        roles: [],
    },
    {
        email: 'admin-org1@test.com',
        password: PASSWORD,
        roles: [{ userId: '', orgId: 'org-springfield', role: 'org_admin' }],
    },
    {
        email: 'admin-org2@test.com',
        password: PASSWORD,
        roles: [{ userId: '', orgId: 'org-riverside', role: 'org_admin' }],
    },
    {
        email: 'coach-org1@test.com',
        password: PASSWORD,
        roles: [{ userId: '', orgId: 'org-springfield', role: 'coach' }],
    },
    {
        email: 'coach-multi@test.com',
        password: PASSWORD,
        roles: [
            { userId: '', orgId: 'org-springfield', role: 'coach' },
            { userId: '', orgId: 'org-riverside', role: 'coach' },
        ],
    },
    {
        email: 'guardian-org1@test.com',
        password: PASSWORD,
        roles: [{ userId: '', orgId: 'org-springfield', role: 'parent' }],
    },
    {
        email: 'guardian-org2@test.com',
        password: PASSWORD,
        roles: [{ userId: '', orgId: 'org-riverside', role: 'parent' }],
    },
    {
        email: 'multi-role@test.com',
        password: PASSWORD,
        roles: [
            { userId: '', orgId: 'org-springfield', role: 'org_admin' },
            { userId: '', orgId: 'org-riverside', role: 'coach' },
            { userId: '', orgId: 'org-mountain', role: 'parent' },
        ],
    },
]

async function ensureAuthUser(email: string, password: string) {
    const { data: existing, error: getErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (getErr) throw getErr
    const found = existing.users.find((u) => u.email === email)
    if (found) return found.id

    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) throw error
    return data.user?.id as string
}

async function upsertUserProfile(userId: string, email: string, profile?: SeedUser['profile']) {
    const { error } = await supabase.from('users').upsert({
        id: userId,
        email,
        display_name: profile?.display_name ?? email.split('@')[0],
        phone: profile?.phone ?? null,
        family_id: profile?.family_id ?? null,
    })
    if (error) throw error
}

async function upsertMemberships(userId: string, roles: RoleTuple[]) {
    for (const role of roles) {
        const { error } = await supabase
            .from('organization_members')
            .upsert({ user_id: userId, org_id: role.orgId, role: role.role })
        if (error) throw error
    }
}

async function seedFamiliesForParents() {
    const parentEmails = ['guardian-org1@test.com', 'guardian-org2@test.com', 'multi-role@test.com']
    for (const email of parentEmails) {
        const { data: userRow, error: userErr } = await supabase.from('users').select('id, family_id').eq('email', email).single()
        if (userErr || !userRow) continue

        const familyId = userRow.family_id ?? `fam-${userRow.id}`
        await supabase.from('families').upsert({ id: familyId, org_id: 'org-springfield', name: `${email}-family` })
        await supabase.from('users').update({ family_id: familyId }).eq('id', userRow.id)
    }
}

async function main() {
    for (const user of users) {
        const userId = await ensureAuthUser(user.email, user.password)
        user.roles.forEach((r) => (r.userId = userId))
        await upsertUserProfile(userId, user.email, user.profile)
        await upsertMemberships(userId, user.roles)
    }

    await seedFamiliesForParents()
    console.log('Seed complete.')
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
