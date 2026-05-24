import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const uiRoot = fileURLToPath(new URL('../ui/', import.meta.url))
const offenders = []

await scan(uiRoot)

if (offenders.length) {
  console.error(`Remote runtime imports found:\n${offenders.join('\n')}`)
  process.exit(1)
}

console.log('No remote runtime imports found.')

async function scan(dir) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      await scan(fullPath)
      continue
    }

    if (!/\.(html|js|css)$/.test(entry.name)) {
      continue
    }

    const contents = (await readFile(fullPath, 'utf8')).replace(
      /<a\b([^>]*)\s+href=(["'])https?:\/\/[^"']+\2/gi,
      '<a$1',
    )
    if (/https?:\/\/|\/\/cdn\.|unpkg\.com|esm\.sh|jsdelivr\.net/.test(contents)) {
      offenders.push(path.relative(uiRoot, fullPath))
    }
  }
}
