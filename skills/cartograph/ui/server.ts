import index from "./index.html";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { watch } from "node:fs";

type Client = {
  controller: ReadableStreamDefaultController<Uint8Array>;
};

const DEFAULT_PORT = 6270;
const LAST_FALLBACK_PORT = 6280;
const encoder = new TextEncoder();
const clients = new Set<Client>();

const uiRoot = import.meta.dir;
if (!existsSync(resolve(uiRoot, "node_modules"))) {
  console.error("Dependencies not installed. Run:");
  console.error("  bun install --cwd skills/cartograph/ui");
  process.exit(1);
}

const projectRoot = await findProjectRoot();
const cartographPath = resolveInProjectRoot("cartograph.json");

const requestedPort = process.env.CARTOGRAPH_PORT
  ? Number(process.env.CARTOGRAPH_PORT)
  : null;

if (requestedPort !== null && !Number.isInteger(requestedPort)) {
  console.error("CARTOGRAPH_PORT must be an integer.");
  process.exit(1);
}

if (!existsSync(cartographPath)) {
  console.warn(`Warning: cartograph.json was not found in ${projectRoot}.`);
}

let debounceTimer: Timer | null = null;
let fileWatcher: ReturnType<typeof watch> | null = null;

watchCartographFile();
watch(projectRoot, { persistent: true }, (_event, filename) => {
  if (!filename || filename === "cartograph.json") {
    watchCartographFile();
    scheduleCartographChanged();
  }
});

const server = await startServer();

console.log(`Cartograph UI running at http://127.0.0.1:${server.port}`);
console.log(`Project root: ${projectRoot}`);
console.log("Watching: cartograph.json");

async function startServer() {
  if (requestedPort !== null) {
    return serveOnPort(requestedPort);
  }

  for (let port = DEFAULT_PORT; port <= LAST_FALLBACK_PORT; port += 1) {
    try {
      return await serveOnPort(port);
    } catch (error) {
      if (!isAddressInUse(error)) throw error;
    }
  }

  console.error(
    `All candidate ports busy (${DEFAULT_PORT}-${LAST_FALLBACK_PORT}). Set CARTOGRAPH_PORT to override.`,
  );
  process.exit(1);
}

async function serveOnPort(port: number) {
  return Bun.serve({
    port,
    hostname: "127.0.0.1",
    development: true,
    idleTimeout: 0,
    routes: {
      "/": index,
      "/cartograph-logo.svg": withOrigin(port, serveLogo),
      "/api/cartograph": {
        GET: withOrigin(port, handleGetCartograph),
      },
      "/api/cartograph/stream": {
        GET: withOrigin(port, handleCartographStream),
      },
      "/api/cartograph/save": {
        POST: withOrigin(port, handleSaveCartograph),
      },
      "/api/invariants/save": {
        POST: withOrigin(port, handleSaveInvariants),
      },
    },
    fetch: withOrigin(port, () => new Response("not found", { status: 404 })),
  });
}

function withOrigin(
  port: number,
  handler: (req: Request, server: Bun.Server) => Response | Promise<Response>,
) {
  return (req: Request, server: Bun.Server) => {
    const origin = req.headers.get("origin");
    const allowed = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
    if (origin && !allowed.includes(origin)) {
      return new Response("forbidden origin", { status: 403 });
    }
    return handler(req, server);
  };
}

async function handleGetCartograph() {
  if (!existsSync(cartographPath)) {
    return Response.json(
      { error: `No cartograph.json found in ${projectRoot}. Run /cartograph from your agent.` },
      { status: 404 },
    );
  }

  try {
    const text = await readFile(cartographPath, "utf8");
    return Response.json({ data: JSON.parse(text), projectRoot });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: "invalid JSON", ...getJsonErrorPosition(error) },
        { status: 500 },
      );
    }
    return Response.json({ error: "unable to read cartograph.json" }, { status: 500 });
  }
}

function handleCartographStream(req: Request, server: Bun.Server) {
  server.timeout(req, 0);
  let client: Client;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      client = { controller };
      clients.add(client);
      controller.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      clients.delete(client);
    },
  });

  req.signal.addEventListener("abort", () => clients.delete(client));

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache",
      connection: "keep-alive",
      "content-type": "text/event-stream",
    },
  });
}

async function handleSaveCartograph(req: Request) {
  const text = await req.text();
  try {
    JSON.parse(text);
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  await writeAtomic(cartographPath, `${text.trimEnd()}\n`);
  broadcastCartographChanged();
  return Response.json({ ok: true });
}

async function handleSaveInvariants(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const contents = body && typeof body === "object" ? (body as { contents?: unknown }).contents : null;
  if (typeof contents !== "string") {
    return Response.json({ error: "expected { contents: string }" }, { status: 400 });
  }

  const invariantsPath = resolveInProjectRoot("cartograph-invariants.md");
  await writeAtomic(invariantsPath, contents);
  return Response.json({ ok: true });
}

async function serveLogo() {
  const logoPath = resolve(uiRoot, "../assets/cartograph-logo.svg");
  return new Response(await readFile(logoPath), {
    headers: { "content-type": "image/svg+xml" },
  });
}

async function writeAtomic(target: string, contents: string) {
  await mkdir(dirname(target), { recursive: true });
  const tmp = resolve(dirname(target), `.${target.split(sep).pop()}.tmp`);
  await writeFile(tmp, contents);
  await rename(tmp, target);
}

function broadcastCartographChanged() {
  const payload = encoder.encode("event: cartograph-changed\ndata: {}\n\n");
  for (const client of clients) {
    try {
      client.controller.enqueue(payload);
    } catch {
      clients.delete(client);
    }
  }
}

function watchCartographFile() {
  fileWatcher?.close();
  fileWatcher = null;
  if (!existsSync(cartographPath)) return;

  fileWatcher = watch(cartographPath, { persistent: true }, () => {
    scheduleCartographChanged();
  });
}

function scheduleCartographChanged() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => broadcastCartographChanged(), 200);
}

async function findProjectRoot() {
  if (process.env.CARTOGRAPH_PROJECT_ROOT) {
    return resolve(process.env.CARTOGRAPH_PROJECT_ROOT);
  }

  if (process.cwd() === uiRoot) {
    const projectRootFromSkillLayout = inferProjectRootFromSkillLayout();
    if (projectRootFromSkillLayout) return projectRootFromSkillLayout;

    console.error("Project root could not be inferred from the UI package directory.");
    console.error("Run from your project root:");
    console.error("  bun skills/cartograph/ui/server.ts");
    console.error("Or set CARTOGRAPH_PROJECT_ROOT to the project root before starting the UI.");
    process.exit(1);
  }

  let dir = process.cwd();
  while (true) {
    if (existsSync(resolve(dir, "cartograph.json"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

function inferProjectRootFromSkillLayout() {
  const agentSkillSuffixes = [
    `${sep}.agents${sep}skills${sep}cartograph${sep}ui`,
    `${sep}.claude${sep}skills${sep}cartograph${sep}ui`,
  ];
  if (agentSkillSuffixes.some((suffix) => uiRoot.endsWith(suffix))) {
    return resolve(uiRoot, "..", "..", "..", "..");
  }

  if (!uiRoot.endsWith(`${sep}skills${sep}cartograph${sep}ui`)) return null;

  const repoLocalRoot = resolve(uiRoot, "..", "..", "..");
  if (existsSync(resolve(repoLocalRoot, ".git"))) return repoLocalRoot;

  return null;
}

function resolveInProjectRoot(rel: string) {
  const abs = resolve(projectRoot, rel);
  if (abs !== projectRoot && !abs.startsWith(projectRoot + sep)) {
    throw new Error("path escapes project root");
  }
  return abs;
}

function isAddressInUse(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "EADDRINUSE"
  );
}

function getJsonErrorPosition(error: SyntaxError) {
  const match = /position (\d+)/i.exec(error.message);
  if (!match) return {};

  const position = Number(match[1]);
  if (!Number.isInteger(position)) return {};

  return { position };
}
