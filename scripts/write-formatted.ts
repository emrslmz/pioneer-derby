import { writeFileSync } from 'node:fs'
import { format, resolveConfig } from 'prettier'

/** Writes a generated file already formatted with the project's Prettier config, so CI can diff it. */
export async function writeFormatted(path: string, content: string): Promise<void> {
  const options = (await resolveConfig(path)) ?? {}
  writeFileSync(path, await format(content, { ...options, filepath: path }))
}
