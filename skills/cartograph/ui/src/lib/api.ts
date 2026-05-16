import type { CartographResponse } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.error === "string" ? body.error : response.statusText;
    throw new Error(message);
  }
  return body as T;
}

export async function fetchCartograph(): Promise<CartographResponse> {
  const response = await fetch("/api/cartograph", {
    headers: { accept: "application/json" },
  });
  return readJson<CartographResponse>(response);
}

export async function saveCartograph(data: unknown): Promise<void> {
  const response = await fetch("/api/cartograph/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data, null, 2),
  });
  await readJson<{ ok: true }>(response);
}

export async function saveInvariants(contents: string): Promise<void> {
  const response = await fetch("/api/invariants/save", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents }),
  });
  await readJson<{ ok: true }>(response);
}

export function subscribeToCartographChanges(onChange: () => void): () => void {
  const events = new EventSource("/api/cartograph/stream");
  events.addEventListener("cartograph-changed", onChange);
  events.onerror = () => {
    // EventSource reconnects automatically. The UI keeps the last good data.
  };
  return () => events.close();
}
