import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { listInstalledMacApps } from './installed-mac-apps'

let root: string | undefined

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true })
  }
})

it('lists only .app bundles, sorted by name, and skips missing folders', async () => {
  root = await mkdtemp(join(tmpdir(), 'orca-my-apps-'))
  const system = join(root, 'system')
  const user = join(root, 'user')
  await mkdir(join(system, 'Notes.app'), { recursive: true })
  await mkdir(join(system, 'Utilities'), { recursive: true })
  await mkdir(join(user, 'Figma.app'), { recursive: true })
  await mkdir(join(user, '.Hidden.app'), { recursive: true })
  await writeFile(join(user, 'readme.txt'), '')

  expect(await listInstalledMacApps([system, join(root, 'missing'), user])).toEqual([
    { name: 'Figma', path: join(user, 'Figma.app') },
    { name: 'Notes', path: join(system, 'Notes.app') }
  ])
})
