import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

function CartographRoot() {
  useEffect(() => {
    document.body.classList.add("cartograph-ui-ready");
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(<CartographRoot />);
