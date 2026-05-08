/** @jsxImportSource hono/jsx */
import { createOpenAPIMockApp, startServer, registerStaticAssets } from "mock-lib";
import type { MockAppV2 } from "mock-lib";
import { registerHealthRoutes } from "./routes/health";
import { registerAllergenRoutes } from "./routes/allergens";
import { registerMedicationRoutes } from "./routes/medications";
import { registerAdminRoutes } from "./routes/admin";
import { registerFrontendRoutes } from "./routes/frontend.tsx";
import { initDb } from "./db";
import { seedDatabase } from "./seed";

export function createHealthApp(): MockAppV2 {
  const mockApp = createOpenAPIMockApp(
    { name: "health", port: 5003 },
    { title: "Health Mock API", version: "1.0.0" },
  );

  const { app } = mockApp;

  app.get("/__mock_sentinel__/health", (c) => c.json({ ok: true }));

  registerStaticAssets(app, { dir: import.meta.dir + "/../public", prefix: "/static" });
  registerHealthRoutes(app);
  registerAllergenRoutes(app);
  registerMedicationRoutes(app);
  registerAdminRoutes(app);
  registerFrontendRoutes(app);

  const seed = async () => {
    const db = initDb();
    seedDatabase(db);
  };

  return { ...mockApp, seed };
}

if (import.meta.main) {
  const mockApp = createHealthApp();
  startServer(mockApp, { seed: mockApp.seed });
}
