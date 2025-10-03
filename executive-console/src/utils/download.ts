import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import { createZipArchive } from './zip'
import type { ZipEntry } from './zip'

export async function saveJsonFile(suggestedName: string, data: unknown) {
  const filePath = await save({
    defaultPath: suggestedName,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!filePath) return false
  const content = JSON.stringify(data, null, 2)
  await writeFile(filePath, new TextEncoder().encode(content))
  return true
}

export async function saveTextFile(suggestedName: string, text: string) {
  const filePath = await save({
    defaultPath: suggestedName,
    filters: [{ name: 'Text', extensions: ['txt'] }],
  })
  if (!filePath) return false
  await writeFile(filePath, new TextEncoder().encode(text))
  return true
}

export async function saveBinaryFile(
  suggestedName: string,
  data: Uint8Array,
  options?: {
    description?: string
    extension?: string
  }
) {
  const derivedExtension = options?.extension ?? suggestedName.split('.').pop()
  const filters = derivedExtension
    ? [{ name: options?.description ?? 'File', extensions: [derivedExtension] }]
    : undefined

  const filePath = await save({
    defaultPath: suggestedName,
    filters,
  })

  if (!filePath) return false
  await writeFile(filePath, data)
  return true
}

export async function saveZipFile(
  suggestedName: string,
  entries: ZipEntry[],
) {
  if (entries.length === 0) return false
  const zipData = createZipArchive(entries)
  return saveBinaryFile(suggestedName, zipData, {
    description: 'ZIP Archive',
    extension: 'zip',
  })
}
