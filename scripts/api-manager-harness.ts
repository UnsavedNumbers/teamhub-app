/*
  Local harness for API Manager gateway.

  Usage (example):
    npx tsx scripts/api-manager-harness.ts

  Required env:
    SUPABASE_PROJECT_URL
    API_PUBLIC_ANON_KEY
    API_ORG_ADMIN_BEARER
    API_PLATFORM_ADMIN_BEARER
    API_STAFF_BEARER (for staff-flag test)
    API_TEST_ORG_ID
*/

interface HarnessResult {
  name: string
  passed: boolean
  status: number
  body: unknown
}

interface ApiErrorBody {
  ok: false
  traceId: string
  error: {
    code: string
    message: string
    details?: unknown
  }
}

interface ApiSuccessBody {
  ok: true
  traceId: string
  data: unknown
}

const projectUrl = process.env.SUPABASE_PROJECT_URL
const anonKey = process.env.API_PUBLIC_ANON_KEY
const orgAdminToken = process.env.API_ORG_ADMIN_BEARER
const platformAdminToken = process.env.API_PLATFORM_ADMIN_BEARER
const staffToken = process.env.API_STAFF_BEARER
const testOrgId = process.env.API_TEST_ORG_ID

if (!projectUrl || !anonKey || !orgAdminToken || !platformAdminToken || !staffToken || !testOrgId) {
  throw new Error('Missing required env vars for API manager harness.')
}

const endpoint = `${projectUrl.replace(/\/$/, '')}/functions/v1/api`

async function invokeGateway(token: string | null, payload: Record<string, unknown>) {
  const headers: Record<string, string> = {
    apikey: anonKey,
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => ({}))) as unknown
  return { status: response.status, body }
}

function assertErrorCode(body: unknown, expectedCode: string): boolean {
  const payload = body as Partial<ApiErrorBody>
  return Boolean(payload && payload.ok === false && payload.error?.code === expectedCode)
}

function assertSuccessContract(body: unknown): boolean {
  const payload = body as Partial<ApiSuccessBody>
  return Boolean(payload && payload.ok === true && typeof payload.traceId === 'string' && 'data' in payload)
}

async function run(): Promise<void> {
  const checks: HarnessResult[] = []

  {
    const response = await invokeGateway(platformAdminToken, {
      operation: 'automation.notRegistered',
      input: {},
    })
    checks.push({
      name: 'operation not registered -> denied',
      passed: response.status === 404 && assertErrorCode(response.body, 'OP_NOT_FOUND'),
      status: response.status,
      body: response.body,
    })
  }

  {
    const response = await invokeGateway(orgAdminToken, {
      operation: 'automation.sendDemoResult',
      input: {
        type: 'demo_approved',
        demo_org_id: 'demo-org-1',
        email: 'user@example.com',
        reviewed_at: new Date().toISOString(),
      },
    })
    checks.push({
      name: 'role not allowed -> denied',
      passed: response.status === 403 && assertErrorCode(response.body, 'FORBIDDEN'),
      status: response.status,
      body: response.body,
    })
  }

  {
    const response = await invokeGateway(staffToken, {
      operation: 'ai.summarizeAnnouncement',
      orgId: testOrgId,
      input: {
        announcement: 'The team bus now departs at 7:00 AM from the south lot. Please arrive 15 minutes early.',
        maxLength: 120,
      },
    })
    checks.push({
      name: 'staff flags required but missing -> denied',
      passed: response.status === 403 && assertErrorCode(response.body, 'FORBIDDEN'),
      status: response.status,
      body: response.body,
    })
  }

  {
    const response = await invokeGateway(platformAdminToken, {
      operation: 'automation.sendDemoResult',
      input: {
        type: 'demo_approved',
        demo_org_id: 'demo-org-1',
        name: 'Demo Org',
        firstName: 'Pat',
        last_name: 'Coach',
        email: 'user@example.com',
        country: 'US',
        timezone: 'America/New_York',
        sports_sponsored: ['soccer'],
        reviewed_at: new Date().toISOString(),
      },
      idempotencyKey: `harness-demo-result-${Date.now()}`,
    })
    checks.push({
      name: 'success path for Make operation',
      passed: response.status === 200 && assertSuccessContract(response.body),
      status: response.status,
      body: response.body,
    })
  }

  {
    const response = await invokeGateway(orgAdminToken, {
      operation: 'ai.summarizeAnnouncement',
      orgId: testOrgId,
      input: {
        announcement:
          'Practice is moved indoors tomorrow due to weather. Bring futsal shoes and arrive 20 minutes early for check-in.',
        maxLength: 120,
      },
    })
    checks.push({
      name: 'success path for HF operation',
      passed: response.status === 200 && assertSuccessContract(response.body),
      status: response.status,
      body: response.body,
    })
  }

  {
    const response = await invokeGateway(orgAdminToken, {
      operation: 'ai.summarizeAnnouncement',
      orgId: testOrgId,
      input: {
        announcement: 'Too short',
      },
    })
    checks.push({
      name: 'consistent response contract on errors',
      passed: response.status === 400 && assertErrorCode(response.body, 'VALIDATION_ERROR'),
      status: response.status,
      body: response.body,
    })
  }

  let failures = 0
  for (const check of checks) {
    const status = check.passed ? 'PASS' : 'FAIL'
    console.log(`${status} - ${check.name} [status=${check.status}]`)
    if (!check.passed) {
      failures += 1
      console.log('  body:', JSON.stringify(check.body))
    }
  }

  if (failures > 0) {
    throw new Error(`Harness failed ${failures} check(s).`)
  }

  console.log('All API manager harness checks passed.')
}

void run()
