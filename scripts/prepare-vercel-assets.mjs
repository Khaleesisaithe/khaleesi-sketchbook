import { cp, copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteOutput = path.join(projectRoot, "dist", "public");
const vercelPublic = path.join(projectRoot, "public");
const routeManifest = JSON.parse(await readFile(path.join(viteOutput, "manus-routes.json"), "utf8"));
const vercelConfig = JSON.parse(await readFile(path.join(projectRoot, "vercel.json"), "utf8"));
const expectedRoutes = routeManifest.routes.map(route => route.path).filter(route => route !== "/").sort();
const configuredRoutes = vercelConfig.rewrites
  .filter(rewrite => rewrite.destination === "/index.html")
  .map(rewrite => rewrite.source)
  .sort();
if (JSON.stringify(expectedRoutes) !== JSON.stringify(configuredRoutes)) {
  throw new Error("Vercel SPA rewrites must match every non-root path in client/public/manus-routes.json.");
}

await rm(vercelPublic, { recursive: true, force: true });
await mkdir(vercelPublic, { recursive: true });
await cp(viteOutput, vercelPublic, { recursive: true });

// These Vite-generated files are build-time artifacts; Vercel must serve the
// runtime Express endpoints with Cache-Control: no-store instead.
for (const file of ["api/site-config.js", "api/platform/config.js"]) {
  await rm(path.join(vercelPublic, file), { force: true });
}
await copyFile(path.join(vercelPublic, "index.html"), path.join(vercelPublic, "404.html"));

console.log(`Vercel assets prepared; ${expectedRoutes.length} SPA routes match manus-routes.json; runtime config remains dynamic.`);
