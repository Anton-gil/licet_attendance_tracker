/**
 * Side-effect import for standalone scripts (drizzle-kit, seed scripts)
 * that run outside Next.js's own env loading. `import "@/lib/load-env"`
 * as the first import in the file so it runs before anything that reads
 * `process.env` at module-eval time.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
