// @ts-nocheck
import { BUCKET_REQUIREMENTS, SENSITIVE_NON_PUBLIC_BUCKETS } from './contracts'
import { fail, getPolicies } from './helpers'
import type { Validator } from './types'

interface BucketRow {
  id: string
  name: string
  public: boolean
}

export const validateStorage: Validator = async (context) => {
  const failures = []

  const { rows: buckets } = await context.client.query<BucketRow>(`
    SELECT id, name, public
    FROM storage.buckets
  `)

  const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]))

  for (const requirement of BUCKET_REQUIREMENTS) {
    const matched = requirement.candidates.find((candidate) => bucketById.has(candidate))
    if (!matched && requirement.required) {
      failures.push(
        fail(
          'validateStorage',
          `Missing storage bucket: ${requirement.logicalName} ({${requirement.candidates.join('|')}})`,
        ),
      )
    }
  }

  for (const sensitiveBucket of SENSITIVE_NON_PUBLIC_BUCKETS) {
    const bucket = bucketById.get(sensitiveBucket)
    if (bucket && bucket.public) {
      failures.push(fail('validateStorage', `Sensitive bucket is public: storage.buckets.${sensitiveBucket}`))
    }
  }

  const policies = await getPolicies(context)
  const storagePolicies = policies.filter((policy) => policy.schemaname === 'storage' && policy.tablename === 'objects')

  for (const requirement of BUCKET_REQUIREMENTS) {
    const matchedBucket = requirement.candidates.find((candidate) => bucketById.has(candidate))
    if (!matchedBucket) continue

    const hasPolicy = storagePolicies.some((policy) => {
      const text = [policy.policyname, policy.qual ?? '', policy.with_check ?? ''].join(' ').toLowerCase()
      return text.includes(matchedBucket.toLowerCase())
    })

    if (!hasPolicy) {
      failures.push(
        fail(
          'validateStorage',
          `Missing storage policy for bucket: storage.objects bucket_id='${matchedBucket}'`,
        ),
      )
    }
  }

  return failures
}


