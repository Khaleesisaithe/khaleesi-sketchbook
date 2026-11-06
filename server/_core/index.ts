import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { publicPlatformScript, publicSiteScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerUploadRoutes } from "../uploads";
import { ARTIST_ROUTE } from "../../client/src/lib/privateRoute";

function contentSecurityPolicy() {
  let supabaseOrigin = "";
  let supabaseWebSocket = "";
  try {
    const url = new URL(process.env.SUPABASE_URL ?? "");
    if (url.protocol === "https:" && !url.username && !url.password) {
      supabaseOrigin = url.origin;
      supabaseWebSocket = `wss://${url.host}`;
    }
  } catch { /* unconfigured until the project URL is supplied */ }
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "script-src 'self' https://www.instagram.com https://assets.pinterest.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: ${supabaseOrigin} https://*.cdninstagram.com https://i.pinimg.com`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWebSocket} https://www.instagram.com https://assets.pinterest.com https://www.pinterest.com https://www.pinterest.ca`,
    "frame-src 'self' https://www.instagram.com https://assets.pinterest.com https://www.pinterest.com https://www.pinterest.ca",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    if (req.path.replace(/\/+$/, "") === ARTIST_ROUTE) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (process.env.NODE_ENV === "production") res.setHeader("Content-Security-Policy", contentSecurityPolicy());
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "64kb", extended: false }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  app.get("/api/site-config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicSiteScript());
  });
  registerUploadRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
