import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'

export function macApplicationDirs(home: string = homedir()): string[] {
  return ['/Applications', '/System/Applications', join(home, 'Applications')]
}

// shortcut: top-level bundles only, so apps in subfolders (Utilities) are missed; recurse one level if they matter.
export async function listInstalledMacApps(
  dirs: readonly string[]
): Promise<{ name: string; path: string }[]> {
  const apps = new Map<string, { name: string; path: string }>()
  for (const dir of dirs) {
    const names = await readdir(dir).catch(() => [])
    for (const name of names) {
      if (name.endsWith('.app') && !name.startsWith('.')) {
        const path = join(dir, name)
        apps.set(path, { name: basename(name, '.app'), path })
      }
    }
  }
  return [...apps.values()].sort((a, b) => a.name.localeCompare(b.name))
}
