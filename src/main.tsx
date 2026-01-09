import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ensureEmbedSafeStorage } from "./lib/embedSafeStorage";

// Some embed providers sandbox iframes in a way that makes `localStorage` throw.
// Our auth client expects a working `localStorage`, so we patch in a safe in-memory fallback.
ensureEmbedSafeStorage();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");

const root = createRoot(rootEl);

import("./App").then(({ default: App }) => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});

