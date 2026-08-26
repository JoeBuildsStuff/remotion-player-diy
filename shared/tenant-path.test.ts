import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  parseMediaRelPath,
  parseUserScopedPathname,
  pathnameOwnedBy,
  renderPathname,
  rewriteLegacyMediaUrl,
  sourcePathname,
} from './tenant-path.js'

describe('tenant pathnames', () => {
  it('builds and parses source pathnames', () => {
    const pathname = sourcePathname('user-1', 'abc-clip.mp4')
    assert.equal(pathname, 'sources/users/user-1/abc-clip.mp4')
    assert.deepEqual(parseUserScopedPathname(pathname, 'sources'), {
      userId: 'user-1',
      filename: 'abc-clip.mp4',
    })
    assert.equal(pathnameOwnedBy(pathname, 'user-1'), true)
    assert.equal(pathnameOwnedBy(pathname, 'user-2'), false)
  })

  it('rejects traversal in filenames and user ids', () => {
    assert.equal(parseUserScopedPathname('sources/users/../secret', 'sources'), null)
    assert.equal(
      parseUserScopedPathname('sources/users/u/../../etc/passwd', 'sources'),
      null,
    )
    assert.equal(parseUserScopedPathname('sources/flat.mp4', 'sources'), null)
    assert.throws(() => sourcePathname('user-1', '../x'))
    assert.throws(() => renderPathname('a/b', 'x.mp4'))
  })

  it('parses media rel paths used by /media/*', () => {
    assert.deepEqual(parseMediaRelPath('users/u1/file.mov'), {
      userId: 'u1',
      filename: 'file.mov',
    })
    assert.equal(parseMediaRelPath('file.mov'), null)
    assert.equal(parseMediaRelPath('users/u1/nested/file.mov'), null)
  })
})

describe('rewriteLegacyMediaUrl', () => {
  it('rewrites flat media URLs onto the owner prefix and drops signatures', () => {
    const next = rewriteLegacyMediaUrl(
      'https://video-editor.joe-taylor.me/media/sources/uuid-clip.mov?exp=1&sig=abc',
      'owner-1',
    )
    assert.equal(
      next,
      'https://video-editor.joe-taylor.me/media/sources/users/owner-1/uuid-clip.mov',
    )
  })

  it('leaves already-scoped URLs alone', () => {
    const url =
      'http://localhost:5173/media/sources/users/owner-1/uuid-clip.mov'
    assert.equal(rewriteLegacyMediaUrl(url, 'owner-1'), url)
  })
})
