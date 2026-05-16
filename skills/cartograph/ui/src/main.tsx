import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { mountVisualizer } from "./legacy-visualizer";
import "./styles.css";

function CartographRoot() {
  useEffect(() => mountVisualizer(), []);
  return <App />;
}

createRoot(document.getElementById("root")!).render(<CartographRoot />);
