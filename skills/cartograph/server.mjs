#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { promises as fs, watch } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const { access, mkdtemp, readFile, rename, rm, stat, writeFile } = fs
const DEFAULT_PORT = 6270
const MAX_PORT = 6280
const HOST = '127.0.0.1'
const CARTOGRAPH_JSON = 'cartograph.json'
const INVARIANTS_MD = 'cartograph-invariants.md'

const skillRoot = fileURLToPath(new URL('./', import.meta.url))
const uiRoot = path.join(skillRoot, 'ui')
const projectRoot = await findProjectRoot()
const port = await choosePort()
const app = new Hono()
const clients = new Set()
const encoder = new TextEncoder()

const vendorFiles = new Map([
  ['/vendor/htm.module.js', path.join(skillRoot, 'node_modules/htm/dist/htm.module.js')],
  ['/vendor/preact.module.js', path.join(skillRoot, 'node_modules/preact/dist/preact.module.js')],
  [
    '/vendor/preact-hooks.module.js',
    path.join(skillRoot, 'node_modules/preact/hooks/dist/hooks.module.js'),
  ],
])

app.use('*', async (c, next) => {
  const origin = c.req.header('origin')
  const allowedOrigins = new Set([
    `http://${HOST}:${port}`,
    `http://localhost:${port}`,
  ])

  if (origin && !allowedOrigins.has(origin)) {
    return c.text('forbidden origin', 403)
  }

  await next()
})

app.get('/api/cartograph', async (c) => {
  const filePath = resolveInProjectRoot(CARTOGRAPH_JSON)

  try {
    const contents = await readFile(filePath, 'utf8')
    return c.json(JSON.parse(contents))
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return c.json(
        { error: `No ${CARTOGRAPH_JSON} found in ${projectRoot}` },
        404,
      )
    }

    if (error instanceof SyntaxError) {
      return c.json({ error: 'invalid JSON', detail: error.message }, 500)
    }

    throw error
  }
})

app.get('/api/cartograph/stream', () => {
  let activeController
  const stream = new ReadableStream({
    start(controller) {
      activeController = controller
      clients.add(controller)
      controller.enqueue(encoder.encode(': connected\n\n'))
    },
    cancel() {
      if (activeController) {
        clients.delete(activeController)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    },
  })
})

app.post('/api/cartograph/save', async (c) => {
  const text = await c.req.text()
  let json

  try {
    json = JSON.parse(text)
  } catch (error) {
    return c.json(
      {
        error: 'invalid JSON',
        detail: error instanceof Error ? error.message : String(error),
      },
      400,
    )
  }

  await atomicWrite(
    resolveInProjectRoot(CARTOGRAPH_JSON),
    `${JSON.stringify(json, null, 2)}\n`,
  )
  notifyCartographChanged()
  return c.json({ ok: true })
})

app.post('/api/invariants/save', async (c) => {
  let body

  try {
    body = await c.req.json()
  } catch (error) {
    return c.json(
      {
        error: 'invalid JSON',
        detail: error instanceof Error ? error.message : String(error),
      },
      400,
    )
  }

  if (!isInvariantSaveBody(body)) {
    return c.json({ error: 'expected body shape: { contents: string }' }, 400)
  }

  await atomicWrite(resolveInProjectRoot(INVARIANTS_MD), body.contents)
  return c.json({ ok: true })
})

app.get('/vendor/*', (c) => serveVendorFile(c))
app.get('/src/*', (c) => serveUiFile(c))
app.get('/styles/*', (c) => serveUiFile(c))
app.get('/favicon.svg', (c) => serveUiFile(c))
app.get('/cartograph-logo.svg', (c) => serveUiFile(c))
app.get('/', (c) => serveUiFile(c, 'index.html'))
app.get('/index.html', (c) => serveUiFile(c, 'index.html'))
app.get('*', (c) => serveUiFile(c, 'index.html'))

watchProjectRoot()

serve(
  {
    fetch: app.fetch,
    hostname: HOST,
    port,
  },
  () => {
    const url = `http://${HOST}:${port}`
    console.log(`Cartograph UI running at ${url}`)
    console.log(`Project root: ${projectRoot}`)
    console.log(`Watching: ${resolveInProjectRoot(CARTOGRAPH_JSON)}`)
    openBrowser(url)
  },
)

async function serveVendorFile(c) {
  const filePath = vendorFiles.get(new URL(c.req.url).pathname)

  if (!filePath) {
    return c.text('not found', 404)
  }

  return serveFile(c, filePath)
}

async function serveUiFile(c, forcedPath) {
  const urlPath = forcedPath || decodeURIComponent(new URL(c.req.url).pathname.slice(1))
  const filePath = resolveUnderRoot(uiRoot, urlPath)

  if (!filePath) {
    return c.text('not found', 404)
  }

  return serveFile(c, filePath)
}

async function serveFile(c, filePath) {
  try {
    const info = await stat(filePath)

    if (!info.isFile()) {
      return c.text('not found', 404)
    }

    const contents = await readFile(filePath)
    return new Response(contents, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': contentType(filePath),
      },
    })
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return c.text('not found', 404)
    }

    throw error
  }
}

function resolveUnderRoot(root, rel) {
  const abs = path.resolve(root, rel)
  const relative = path.relative(root, abs)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  return abs
}

function contentType(filePath) {
  const ext = path.extname(filePath)
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.svg') return 'image/svg+xml'
  return 'application/octet-stream'
}

async function findProjectRoot() {
  const envRoot = process.env.CARTOGRAPH_PROJECT_ROOT

  if (envRoot) {
    return path.resolve(envRoot)
  }

  const startRoot = process.env.INIT_CWD
    ? path.resolve(process.env.INIT_CWD)
    : process.cwd()
  let current = startRoot

  while (true) {
    try {
      await access(path.join(current, CARTOGRAPH_JSON))
      return current
    } catch {
      const parent = path.dirname(current)

      if (parent === current) {
        console.warn(
          `Warning: ${CARTOGRAPH_JSON} not found above ${startRoot}; using that directory.`,
        )
        return startRoot
      }

      current = parent
    }
  }
}

async function choosePort() {
  const override = process.env.CARTOGRAPH_PORT

  if (override) {
    const parsed = Number.parseInt(override, 10)

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      console.error('CARTOGRAPH_PORT must be an integer between 1 and 65535.')
      process.exit(1)
    }

    if (!(await isPortAvailable(parsed))) {
      console.error(`Port ${parsed} is busy.`)
      process.exit(1)
    }

    return parsed
  }

  for (let candidate = DEFAULT_PORT; candidate <= MAX_PORT; candidate += 1) {
    if (await isPortAvailable(candidate)) {
      return candidate
    }
  }

  console.error(
    `All candidate ports busy (${DEFAULT_PORT}-${MAX_PORT}). Set CARTOGRAPH_PORT to override.`,
  )
  process.exit(1)
}

function isPortAvailable(candidate) {
  return new Promise((resolve) => {
    const tester = createServer()

    tester.once('error', () => resolve(false))
    tester.once('listening', () => {
      tester.close(() => resolve(true))
    })
    tester.listen(candidate, HOST)
  })
}

function resolveInProjectRoot(rel) {
  const abs = path.resolve(projectRoot, rel)
  const relative = path.relative(projectRoot, abs)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path escapes project root')
  }

  return abs
}

async function atomicWrite(filePath, contents) {
  const dir = path.dirname(filePath)
  const tempDir = await mkdtemp(path.join(dir, '.cartograph-write-'))
  const tempFile = path.join(tempDir, path.basename(filePath))

  try {
    await writeFile(tempFile, contents, 'utf8')
    await rename(tempFile, filePath)
  } finally {
    await rm(tempDir, { force: true, recursive: true })
  }
}

function watchProjectRoot() {
  let timeout

  try {
    watch(projectRoot, (eventType, filename) => {
      if (
        (eventType === 'change' || eventType === 'rename') &&
        filename === CARTOGRAPH_JSON
      ) {
        clearTimeout(timeout)
        timeout = setTimeout(notifyCartographChanged, 200)
      }
    })
  } catch (error) {
    console.warn(
      `Warning: unable to watch ${resolveInProjectRoot(CARTOGRAPH_JSON)}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

function notifyCartographChanged() {
  const event = encoder.encode('event: cartograph-changed\ndata: {}\n\n')

  for (const client of clients) {
    try {
      client.enqueue(event)
    } catch {
      clients.delete(client)
    }
  }
}

function openBrowser(url) {
  if (process.env.CARTOGRAPH_NO_OPEN === '1') {
    return
  }

  const platform = process.platform
  const command =
    platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  })

  child.on('error', () => undefined)
  child.unref()
}

function isInvariantSaveBody(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'contents' in value &&
    typeof value.contents === 'string'
  )
}

function isNodeError(error, code) {
  return error instanceof Error && 'code' in error && error.code === code
}
