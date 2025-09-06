import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

export async function saveJsonFile(suggestedName: string, data: any) {
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

