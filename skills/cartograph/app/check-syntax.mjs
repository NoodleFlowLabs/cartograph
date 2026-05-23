import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const uiRoot = fileURLToPath(new URL('./ui/', import.meta.url))
const checked = []

await checkDir(uiRoot)

for (const file of checked) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout)
    process.exit(result.status || 1)
  }
}

console.log(`Checked ${checked.length} browser modules.`)

async function checkDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      await checkDir(fullPath)
    } else if (entry.isFile() && /\.(js|mjs)$/.test(entry.name)) {
      checked.push(fullPath)
    }
  }
}
