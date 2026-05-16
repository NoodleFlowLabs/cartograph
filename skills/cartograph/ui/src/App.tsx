import { useCallback, useEffect, useState } from "react";
import { fetchCartograph, subscribeToCartographChanges } from "./lib/api";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; name: string; projectRoot: string; data: unknown }
  | { status: "error"; message: string };

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadCartograph = useCallback(async () => {
    try {
      const response = await fetchCartograph();
      const meta =
        response.data && typeof response.data === "object"
          ? (response.data as { meta?: { name?: unknown } }).meta
          : null;
      setState({
        status: "loaded",
        name: typeof meta?.name === "string" ? meta.name : "Cartograph",
        projectRoot: response.projectRoot,
        data: response.data,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to load cartograph.json",
      });
    }
  }, []);

  useEffect(() => {
    loadCartograph();
    return subscribeToCartographChanges(loadCartograph);
  }, [loadCartograph]);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>Cartograph UI</h1>
      {state.status === "loading" ? <p>Loading cartograph.json...</p> : null}
      {state.status === "error" ? <p role="alert">{state.message}</p> : null}
      {state.status === "loaded" ? (
        <>
          <p>
            Loaded <strong>{state.name}</strong> from <code>{state.projectRoot}</code>.
          </p>
          <pre style={{ maxHeight: "70vh", overflow: "auto" }}>
            {JSON.stringify(state.data, null, 2)}
          </pre>
        </>
      ) : null}
    </main>
  );
}
