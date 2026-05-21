import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const uiRoot = new URL('./', import.meta.url)
const uiRootPath = fileURLToPath(uiRoot)
const files = [
  'app.js',
  ...(await jsFiles('components')),
  ...(await jsFiles('lib')),
]

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(uiRootPath, file)], {
    encoding: 'utf8',
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

async function jsFiles(dir) {
  const entries = await readdir(new URL(`${dir}/`, uiRoot))
  return entries.filter((entry) => entry.endsWith('.js')).map((entry) => `${dir}/${entry}`)
}
