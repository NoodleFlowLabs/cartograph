import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { promises as fsPromises, watch } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const { access, mkdtemp, readFile, rename, rm, writeFile } = fsPromises
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
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>()
const encoder = new TextEncoder()

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

app.get('/api/cartograph/stream', (c) => {
  let activeController: ReadableStreamDefaultController<Uint8Array> | undefined
  const stream = new ReadableStream<Uint8Array>({
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
  let json: unknown

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
  let body: unknown

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

app.use('/favicon.svg', serveStatic({ root: uiRoot }))
app.use('/icons.svg', serveStatic({ root: uiRoot }))
app.use('/cartograph-logo.svg', serveStatic({ root: uiRoot }))
app.use('/assets/*', async (c) => c.text('stale Cartograph UI asset', 404))
app.use('/styles.css', serveStatic({ root: uiRoot }))
app.use('/app.js', serveStatic({ root: uiRoot }))
app.use('/components/*', serveStatic({ root: uiRoot }))
app.use('/lib/*', serveStatic({ root: uiRoot }))
app.use('/vendor/*', serveStatic({ root: uiRoot }))
app.get('*', async (c) =>
  c.html(await readFile(path.join(uiRoot, 'index.html'), 'utf8')),
)

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

async function findProjectRoot(): Promise<string> {
  const envRoot = process.env.CARTOGRAPH_PROJECT_ROOT

  if (envRoot) {
    return path.resolve(envRoot)
  }

  let current = process.cwd()

  while (true) {
    try {
      await access(path.join(current, CARTOGRAPH_JSON))
      return current
    } catch {
      const parent = path.dirname(current)

      if (parent === current) {
        console.warn(
          `Warning: ${CARTOGRAPH_JSON} not found above ${process.cwd()}; using current directory.`,
        )
        return process.cwd()
      }

      current = parent
    }
  }
}

async function choosePort(): Promise<number> {
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

function isPortAvailable(candidate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()

    tester.once('error', () => resolve(false))
    tester.once('listening', () => {
      tester.close(() => resolve(true))
    })
    tester.listen(candidate, HOST)
  })
}

function resolveInProjectRoot(rel: string): string {
  const abs = path.resolve(projectRoot, rel)
  const relative = path.relative(projectRoot, abs)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path escapes project root')
  }

  return abs
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
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

function watchProjectRoot(): void {
  let timeout: NodeJS.Timeout | undefined

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

function notifyCartographChanged(): void {
  const event = encoder.encode('event: cartograph-changed\ndata: {}\n\n')

  for (const client of clients) {
    try {
      client.enqueue(event)
    } catch {
      clients.delete(client)
    }
  }
}

function openBrowser(url: string): void {
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

function isInvariantSaveBody(value: unknown): value is { contents: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'contents' in value &&
    typeof value.contents === 'string'
  )
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}
