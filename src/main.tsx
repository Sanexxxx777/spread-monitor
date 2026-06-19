import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "./index.css";
import App from "./App.tsx";
import { engine } from "./lib/engine";

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__engine = engine;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
