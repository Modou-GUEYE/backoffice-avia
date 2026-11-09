import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initializeFeatureFlags } from "./core/partner-config/config";
import "./index.css";

/**
 * Initialise les feature flags au démarrage
 * Charge la config du partenaire avant de rendre l'app
 */
async function main() {
  await initializeFeatureFlags();

  createRoot(document.getElementById("root")!).render(<App />);
}

main().catch((error) => {
  console.error("Failed to initialize app:", error);
  // Render quand même avec fallback
  createRoot(document.getElementById("root")!).render(<App />);
});
