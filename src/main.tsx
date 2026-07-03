import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "./index.css";
import App from "./App.tsx";
import { engine } from "./lib/engine";
import { CONFIG_KEY, restoreFromBackup, saveConfig } from "./lib/store";

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__engine = engine;
}

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

async function bootstrap() {
  try {
    if ("__TAURI_INTERNALS__" in window && !localStorage.getItem(CONFIG_KEY)) {
      const backup = await restoreFromBackup();
      if (backup) saveConfig(backup);
    }
  } catch {
    /* ignore */
  }
  renderApp();
}

void bootstrap();
