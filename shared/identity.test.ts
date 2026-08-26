import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  defaultOwnerUserId,
  migrationOwnerUserId,
  resolveRequestUserId,
  sanitizeUserId,
  singleTenantUserId,
} from './identity.js'

describe('sanitizeUserId', () => {
  it('accepts supabase-style uuids', () => {
    assert.equal(
      sanitizeUserId('401cc145-0c7b-4825-a14b-090c8ba30f7e'),
      '401cc145-0c7b-4825-a14b-090c8ba30f7e',
    )
  })

  it('rejects path traversal and empty values', () => {
    assert.equal(sanitizeUserId('../etc'), null)
    assert.equal(sanitizeUserId('a/b'), null)
    assert.equal(sanitizeUserId(''), null)
    assert.equal(sanitizeUserId('  '), null)
    assert.equal(sanitizeUserId(null), null)
  })
})

describe('resolveRequestUserId', () => {
  it('uses X-User-Id only when the proxy is trusted', () => {
    const headers = new Headers({
      'x-user-id': '401cc145-0c7b-4825-a14b-090c8ba30f7e',
    })
    const denied = resolveRequestUserId(headers, {})
    assert.equal(denied.ok, false)

    const allowed = resolveRequestUserId(headers, { TRUST_PROXY_USER_ID: 'true' })
    assert.deepEqual(allowed, {
      ok: true,
      userId: '401cc145-0c7b-4825-a14b-090c8ba30f7e',
      source: 'header',
    })
  })

  it('does not trust a client user id in single-tenant mode without proxy trust', () => {
    const headers = new Headers({ 'x-user-id': 'attacker' })
    const resolved = resolveRequestUserId(headers, {
      SINGLE_TENANT: 'true',
      SINGLE_TENANT_USER_ID: 'local',
    })
    assert.deepEqual(resolved, {
      ok: true,
      userId: 'local',
      source: 'single-tenant',
    })
  })

  it('returns 401 when neither proxy identity nor single-tenant is configured', () => {
    const resolved = resolveRequestUserId(new Headers(), {})
    assert.equal(resolved.ok, false)
    if (resolved.ok) throw new Error('expected failure')
    assert.equal(resolved.status, 401)
  })

  it('prefers the proxy user over single-tenant when both are set', () => {
    const headers = new Headers({ 'x-user-id': 'real-user' })
    const resolved = resolveRequestUserId(headers, {
      TRUST_PROXY_USER_ID: 'true',
      SINGLE_TENANT: 'true',
      SINGLE_TENANT_USER_ID: 'local',
    })
    assert.deepEqual(resolved, {
      ok: true,
      userId: 'real-user',
      source: 'header',
    })
  })
})

describe('migrationOwnerUserId', () => {
  it('prefers DEFAULT_OWNER_USER_ID', () => {
    assert.equal(
      defaultOwnerUserId({ DEFAULT_OWNER_USER_ID: 'abc' }),
      'abc',
    )
    assert.equal(
      migrationOwnerUserId({
        DEFAULT_OWNER_USER_ID: 'abc',
        SINGLE_TENANT: 'true',
      }),
      'abc',
    )
  })

  it('falls back to the single-tenant id', () => {
    assert.equal(
      migrationOwnerUserId({ SINGLE_TENANT: 'true' }),
      'local',
    )
    assert.equal(singleTenantUserId({}), 'local')
    assert.equal(migrationOwnerUserId({}), null)
  })
})
